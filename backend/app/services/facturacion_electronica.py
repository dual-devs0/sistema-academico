"""
services/facturacion_electronica.py — Integración con guarani.app (Fase 4B).

Regla no negociable: un fallo del proveedor externo NUNCA bloquea el pago
académico. El pago ya quedó registrado por app.services.financiero antes
de que se llame a este módulo; acá solo se intenta emitir el comprobante
fiscal y, si falla, queda en estado 'error' para reintento posterior.

UCA V2 no genera ni firma XML fiscal — solo consume la respuesta de la
API de guarani.app y persiste la referencia (cdc, numero_comprobante,
timbrado, url_pdf).
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

import httpx
from fastapi_mail import MessageSchema, MessageType

from app.database import SessionLocal
from app.email_utils import _send_with_retry, _credentials_configured
from app.models.financiero import Comprobante, Pago
from app.models.users import User

logger = logging.getLogger(__name__)

GUARANI_APP_BASE_URL = os.getenv("GUARANI_APP_BASE_URL", "https://api.guarani.app/v1")
MAX_INTENTOS = 5


def _api_key() -> str:
    return os.getenv("GUARANI_APP_API_KEY", "")


def _punto_emision() -> str:
    return os.getenv("GUARANI_APP_PUNTO_EMISION", "")


async def emitir_factura(pago: Pago, alumno: User, concepto_nombre: str) -> dict:
    """Llama a la API de guarani.app y retorna numero_comprobante/cdc/timbrado/url_pdf.

    Lanza RuntimeError si no hay credenciales configuradas, o la excepción
    propia de httpx (TimeoutException, HTTPStatusError, etc.) si la
    llamada falla — el llamador decide cómo degradar con gracia.
    """
    api_key = _api_key()
    if not api_key:
        raise RuntimeError("GUARANI_APP_API_KEY no configurada en .env")

    payload = {
        "tipo_documento": "factura_electronica",
        "punto_emision": _punto_emision(),
        "cliente": {
            "nombre": alumno.nombre,
            "documento": alumno.cedula or "",
            "email": alumno.email or "",
        },
        "items": [
            {
                "descripcion": concepto_nombre,
                "cantidad": 1,
                "precio_unitario": float(pago.monto_pagado),
            }
        ],
        "referencia_externa": f"uca-pago-{pago.id}",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{GUARANI_APP_BASE_URL}/facturas",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        resp.raise_for_status()
        return resp.json()


async def _notificar_comprobante_emitido(alumno: User, url_pdf: str) -> None:
    if not alumno.email or not _credentials_configured():
        return
    message = MessageSchema(
        subject="UCA - Comprobante de pago disponible",
        recipients=[alumno.email],
        body=(
            f"<h3>Hola {alumno.nombre},</h3>"
            f"<p>Tu comprobante de pago ya está disponible.</p>"
            f'<p><a href="{url_pdf}">Descargar comprobante</a></p>'
        ),
        subtype=MessageType.html,
    )
    await _send_with_retry(message)


async def procesar_facturacion(pago_id: int, comprobante_id: int) -> None:
    """Emite (o reintenta) la factura de un pago. Nunca re-lanza excepciones.

    Abre su propia sesión de DB — se llama tanto desde un background task
    de request (sesión de la request ya cerrada) como desde el job de
    reintentos, ninguno de los cuales tiene una sesión viva propia.
    """
    db = SessionLocal()
    try:
        comprobante = (
            db.query(Comprobante).filter(Comprobante.id == comprobante_id).first()
        )
        pago = db.query(Pago).filter(Pago.id == pago_id).first()
        if not comprobante or not pago:
            return

        comprobante.intentos += 1

        try:
            if not pago.cuota:
                raise ValueError(f"Pago {pago.id} no tiene cuota asociada")
            alumno = pago.cuota.alumno
            concepto_nombre = pago.cuota.concepto.nombre
            resultado = await emitir_factura(pago, alumno, concepto_nombre)
            comprobante.numero_comprobante = resultado.get("numero_comprobante")
            comprobante.cdc = resultado.get("cdc")
            comprobante.timbrado = resultado.get("timbrado")
            comprobante.url_pdf = resultado.get("url_pdf")
            comprobante.estado_emision = "emitido"
            comprobante.ultimo_error = None
            comprobante.fecha_emision = datetime.now(timezone.utc)
            db.commit()

            if comprobante.url_pdf:
                await _notificar_comprobante_emitido(alumno, comprobante.url_pdf)
        except Exception as exc:
            comprobante.estado_emision = "error"
            comprobante.ultimo_error = str(exc)
            db.commit()
            logger.warning(
                "Facturación electrónica falló (pago_id=%s, intento %d/%d): %s",
                pago_id,
                comprobante.intentos,
                MAX_INTENTOS,
                exc,
            )
    finally:
        db.close()
