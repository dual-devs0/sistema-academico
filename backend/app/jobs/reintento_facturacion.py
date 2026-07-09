"""
jobs/reintento_facturacion.py — Reintento periódico de comprobantes
que quedaron en 'pendiente'/'error' tras el intento inicial en el pago.

Corre cada 10 minutos (ver lifespan en app/main.py), hasta 5 intentos
por comprobante. Nunca debe tumbar el loop del proceso — cualquier
excepción se loguea y el ciclo sigue.
"""

from __future__ import annotations

import logging

from app.database import SessionLocal
from app.models.financiero import Comprobante
from app.services.facturacion_electronica import procesar_facturacion, MAX_INTENTOS

logger = logging.getLogger(__name__)


async def ciclo_reintentos() -> int:
    """Procesa comprobantes pendientes/error con intentos < MAX_INTENTOS.

    Retorna la cantidad de comprobantes procesados en este ciclo.
    """
    db = SessionLocal()
    try:
        pendientes = (
            db.query(Comprobante)
            .filter(
                Comprobante.estado_emision.in_(["pendiente", "error"]),
                Comprobante.intentos < MAX_INTENTOS,
            )
            .all()
        )
        ids = [(c.pago_id, c.id) for c in pendientes]
    finally:
        db.close()

    for pago_id, comprobante_id in ids:
        try:
            await procesar_facturacion(pago_id, comprobante_id)
        except Exception as exc:
            logger.error(
                "Ciclo de reintentos: fallo inesperado en comprobante_id=%s: %s",
                comprobante_id,
                exc,
            )

    return len(ids)
