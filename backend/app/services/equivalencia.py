"""
services/equivalencia.py — Fase 5D: Equivalencias y suficiencia.

Al aprobar equivalencia: inserta en expediente_materias y actualiza
avance_alumno_pensum (Fase 2 y 3).
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from app.models.equivalencia import (
    SolicitudEquivalencia,
    EquivalenciaMateria,
    ExamenSuficiencia,
)
from app.models.materia import Materia
from app.models.pensum_materia import PensumMateria
from app.models.avance_alumno_pensum import AvanceAlumnoPensum
from app.models.expediente_materia import ExpedienteMateria
from app.models.oferta_materia import OfertaMateria


def crear_solicitud(
    alumno_id: int, tipo: str, universidad_origen: Optional[str], db: Session
) -> SolicitudEquivalencia:
    pendiente = (
        db.query(SolicitudEquivalencia)
        .filter(
            SolicitudEquivalencia.alumno_id == alumno_id,
            SolicitudEquivalencia.estado.in_(["pendiente", "en_proceso"]),
        )
        .first()
    )
    if pendiente:
        raise ValueError("Ya tienes una solicitud de equivalencia pendiente")
    solicitud = SolicitudEquivalencia(
        alumno_id=alumno_id,
        tipo=tipo,
        universidad_origen=universidad_origen,
    )
    db.add(solicitud)
    db.flush()
    return solicitud


def resolver_materia(
    solicitud_id: int,
    materia_eq_id: int,
    resolucion: str,
    materia_destino_id: Optional[int],
    db: Session,
) -> EquivalenciaMateria:
    eq = (
        db.query(EquivalenciaMateria)
        .filter(
            EquivalenciaMateria.id == materia_eq_id,
            EquivalenciaMateria.solicitud_id == solicitud_id,
        )
        .first()
    )
    if not eq:
        raise ValueError("Equivalencia de materia no encontrada")
    eq.resolucion = resolucion
    if materia_destino_id is not None:
        eq.materia_destino_id = materia_destino_id

    # Si se aprueba, integrar con expediente y avance
    if resolucion == "aprobada" and materia_destino_id is not None:
        solicitud = (
            db.query(SolicitudEquivalencia)
            .filter(SolicitudEquivalencia.id == solicitud_id)
            .first()
        )
        if solicitud:
            alumno_id = solicitud.alumno_id

            pensum = (
                db.query(PensumMateria)
                .filter(
                    PensumMateria.materia_id == materia_destino_id,
                    PensumMateria.carrera_id
                    == (
                        db.query(Materia)
                        .filter(Materia.id == materia_destino_id)
                        .first()
                        .carrera_id
                    ),
                )
                .first()
            )
            creditos = pensum.creditos if pensum else 4

            # Crear oferta sintética para expediente si no existe
            oferta = (
                db.query(OfertaMateria)
                .filter(
                    OfertaMateria.materia_id == materia_destino_id,
                    OfertaMateria.periodo == "EQUIVALENCIA",
                )
                .first()
            )
            if not oferta:
                oferta = OfertaMateria(
                    materia_id=materia_destino_id,
                    profesor_id=1,  # usuario sistema
                    periodo="EQUIVALENCIA",
                    activa=False,
                )
                db.add(oferta)
                db.flush()

            existente = (
                db.query(ExpedienteMateria)
                .filter(
                    ExpedienteMateria.alumno_id == alumno_id,
                    ExpedienteMateria.oferta_materia_id == oferta.id,
                )
                .first()
            )
            if not existente:
                exp = ExpedienteMateria(
                    alumno_id=alumno_id,
                    oferta_materia_id=oferta.id,
                    nota_final=6.0,
                    creditos=creditos,
                    condicion="aprobada",
                    cerrado_por=alumno_id,
                )
                db.add(exp)

            avance = (
                db.query(AvanceAlumnoPensum)
                .filter(
                    AvanceAlumnoPensum.alumno_id == alumno_id,
                    AvanceAlumnoPensum.pensum_materia_id == pensum.id,
                )
                .first()
                if pensum
                else None
            )
            if avance:
                avance.estado = "aprobada"
            elif pensum:
                avance_nuevo = AvanceAlumnoPensum(
                    alumno_id=alumno_id,
                    pensum_materia_id=pensum.id,
                    estado="aprobada",
                )
                db.add(avance_nuevo)

    db.flush()
    return eq


def crear_examen_suficiencia(
    alumno_id: int, materia_id: int, fecha: date, db: Session
) -> ExamenSuficiencia:
    examen = ExamenSuficiencia(alumno_id=alumno_id, materia_id=materia_id, fecha=fecha)
    db.add(examen)
    db.flush()
    return examen


def obtener_equivalencias_alumno(
    alumno_id: int, db: Session
) -> list[SolicitudEquivalencia]:
    return (
        db.query(SolicitudEquivalencia)
        .filter(
            SolicitudEquivalencia.alumno_id == alumno_id,
        )
        .all()
    )
