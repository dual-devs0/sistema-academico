"""
jobs/reintento_facturacion.py — Reintento periódico de comprobantes
que quedaron en 'pendiente'/'error' tras el intento inicial en el pago.

Corre cada 10 minutos (ver lifespan en app/main.py), hasta 5 intentos
por comprobante. Nunca debe tumbar el loop del proceso — cualquier
excepción se loguea y el ciclo sigue.
"""

import asyncio
import logging

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.financiero import Comprobante
from app.services.facturacion_electronica import procesar_facturacion, MAX_INTENTOS

logger = logging.getLogger(__name__)


def _fetch_pendientes(db: Session) -> list[tuple[int, int]]:
    pendientes = (
        db.query(Comprobante)
        .filter(
            Comprobante.estado_emision.in_(["pendiente", "error"]),
            Comprobante.intentos < MAX_INTENTOS,
        )
        .all()
    )
    return [(c.pago_id, c.id) for c in pendientes]


async def ciclo_reintentos() -> int:
    db = SessionLocal()
    try:
        ids = await asyncio.to_thread(_fetch_pendientes, db)
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
