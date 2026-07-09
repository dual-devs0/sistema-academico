"""
services/graduacion.py — Fase 5B: Graduación y tesis.

Regla: verificar_condicion_egreso es función pura (solo lectura, sin escritura).
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.models.graduacion import ProcesoGraduacion, EtapaTesis, VerificacionSolvencia
from app.models.users import User
from app.models.carrera import Carrera
from app.models.pensum_materia import PensumMateria
from app.models.avance_alumno_pensum import AvanceAlumnoPensum
from app.services.expediente import calcular_ppa
from app.services.pasantia import pasantia_completada_por_alumno

PPA_MINIMO_INSTITUCIONAL = 6.0


def verificar_condicion_egreso(alumno_id: int, db: Session) -> dict:
    alumno = db.query(User).filter(User.id == alumno_id).first()
    if not alumno:
        return {
            "cumple_creditos": False, "creditos_aprobados": 0, "creditos_totales": 0,
            "cumple_ppa": False, "ppa_actual": None, "ppa_minimo": PPA_MINIMO_INSTITUCIONAL,
            "cumple_pasantia": False, "pasantia_exigida": False, "pasantia_completada": False,
            "puede_graduarse": False, "motivo": "Alumno no encontrado",
        }

    carrera = db.query(Carrera).filter(Carrera.id == alumno.carrera_id).first() if alumno.carrera_id else None
    creditos_totales = carrera.creditos_totales or 0 if carrera else 0

    creditos_aprobados = sum(
        a.creditos for a in db.query(PensumMateria).join(
            AvanceAlumnoPensum, AvanceAlumnoPensum.pensum_materia_id == PensumMateria.id
        ).filter(
            AvanceAlumnoPensum.alumno_id == alumno_id,
            AvanceAlumnoPensum.estado == "aprobada",
        ).all()
    )

    cumple_creditos = creditos_aprobados >= creditos_totales if creditos_totales > 0 else False

    ppa_info = calcular_ppa(alumno_id, db)
    ppa_actual = ppa_info["ppa"]
    cumple_ppa = ppa_actual is not None and ppa_actual >= PPA_MINIMO_INSTITUCIONAL

    pasantia_completada = pasantia_completada_por_alumno(alumno_id, db)
    pasantia_exigida = False  # se puede extender si carrera define exigencia

    puede = cumple_creditos and cumple_ppa and (not pasantia_exigida or pasantia_completada)
    motivos = []
    if not cumple_creditos:
        motivos.append(f"Créditos insuficientes: {creditos_aprobados}/{creditos_totales}")
    if not cumple_ppa:
        motivos.append(f"PPA mínimo no alcanzado: {ppa_actual or 0:.2f}/{PPA_MINIMO_INSTITUCIONAL}")
    if pasantia_exigida and not pasantia_completada:
        motivos.append("Pasantía no completada")

    return {
        "cumple_creditos": cumple_creditos,
        "creditos_aprobados": creditos_aprobados,
        "creditos_totales": creditos_totales,
        "cumple_ppa": cumple_ppa,
        "ppa_actual": ppa_actual,
        "ppa_minimo": PPA_MINIMO_INSTITUCIONAL,
        "cumple_pasantia": not pasantia_exigida or pasantia_completada,
        "pasantia_exigida": pasantia_exigida,
        "pasantia_completada": pasantia_completada,
        "puede_graduarse": puede,
        "motivo": "; ".join(motivos) if motivos else None,
    }


def iniciar_proceso(alumno_id: int, db: Session) -> ProcesoGraduacion:
    existente = db.query(ProcesoGraduacion).filter(
        ProcesoGraduacion.alumno_id == alumno_id,
        ProcesoGraduacion.estado.in_(["en_proceso", "tesis_en_curso"]),
    ).first()
    if existente:
        raise ValueError("El alumno ya tiene un proceso de graduación activo")
    condicion = verificar_condicion_egreso(alumno_id, db)
    if not condicion["puede_graduarse"]:
        raise ValueError(f"No cumple condiciones de egreso: {condicion['motivo']}")
    proceso = ProcesoGraduacion(alumno_id=alumno_id)
    db.add(proceso)
    db.flush()
    return proceso


def asignar_tutor(proceso_id: int, tutor_id: int, db: Session) -> ProcesoGraduacion:
    proceso = db.query(ProcesoGraduacion).filter(ProcesoGraduacion.id == proceso_id).first()
    if not proceso:
        raise ValueError("Proceso de graduación no encontrado")
    tutor = db.query(User).filter(User.id == tutor_id, User.role == "profesor").first()
    if not tutor:
        raise ValueError("Tutor no encontrado o no es profesor")
    proceso.tutor_id = tutor_id
    db.flush()
    return proceso


def actualizar_etapa(etapa_id: int, estado: str, observaciones: Optional[str],
                     db: Session) -> EtapaTesis:
    etapa = db.query(EtapaTesis).filter(EtapaTesis.id == etapa_id).first()
    if not etapa:
        raise ValueError("Etapa no encontrada")
    etapa.estado = estado
    if observaciones is not None:
        etapa.observaciones = observaciones
    db.flush()
    return etapa