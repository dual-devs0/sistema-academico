"""
services/graduacion.py — Fase 5B: Graduación y tesis.

Regla: verificar_condicion_egreso es función pura (solo lectura, sin escritura).
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.models.graduacion import ProcesoGraduacion, EtapaTesis
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
            "cumple_creditos": False,
            "creditos_aprobados": 0,
            "creditos_totales": 0,
            "cumple_ppa": False,
            "ppa_actual": None,
            "ppa_minimo": PPA_MINIMO_INSTITUCIONAL,
            "cumple_pasantia": False,
            "pasantia_exigida": False,
            "pasantia_completada": False,
            "puede_graduarse": False,
            "motivo": "Alumno no encontrado",
        }

    carrera = (
        db.query(Carrera).filter(Carrera.id == alumno.carrera_id).first()
        if alumno.carrera_id
        else None
    )
    creditos_totales = carrera.creditos_totales or 0 if carrera else 0

    creditos_aprobados = sum(
        a.creditos
        for a in db.query(PensumMateria)
        .join(
            AvanceAlumnoPensum, AvanceAlumnoPensum.pensum_materia_id == PensumMateria.id
        )
        .filter(
            AvanceAlumnoPensum.alumno_id == alumno_id,
            AvanceAlumnoPensum.estado == "aprobada",
        )
        .all()
    )

    cumple_creditos = (
        creditos_aprobados >= creditos_totales if creditos_totales > 0 else False
    )

    ppa_info = calcular_ppa(alumno_id, db)
    ppa_actual = ppa_info["ppa"]
    cumple_ppa = ppa_actual is not None and ppa_actual >= PPA_MINIMO_INSTITUCIONAL

    pasantia_completada = pasantia_completada_por_alumno(alumno_id, db)
    pasantia_exigida = False  # se puede extender si carrera define exigencia

    puede = (
        cumple_creditos and cumple_ppa and (not pasantia_exigida or pasantia_completada)
    )
    motivos = []
    if not cumple_creditos:
        motivos.append(
            f"Créditos insuficientes: {creditos_aprobados}/{creditos_totales}"
        )
    if not cumple_ppa:
        motivos.append(
            f"PPA mínimo no alcanzado: {ppa_actual or 0:.2f}/{PPA_MINIMO_INSTITUCIONAL}"
        )
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


def listar_candidatos(
    db: Session,
    carrera_id: Optional[int] = None,
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[dict], int]:
    """Lista paginada de alumnos con su condición de egreso resuelta por fila.

    Nota: recalcula verificar_condicion_egreso por alumno (no hay una query
    agregada); aceptable a escala de desarrollo, no pensado para cohortes
    grandes sin reescribir a SQL agregado.
    """
    query = db.query(User).filter(User.role == "alumno")
    if carrera_id is not None:
        query = query.filter(User.carrera_id == carrera_id)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (User.nombre.ilike(like))
            | (User.username.ilike(like))
            | (User.email.ilike(like))
        )
    total = query.count()
    alumnos = query.order_by(User.nombre).offset(skip).limit(limit).all()

    alumno_ids = [a.id for a in alumnos]
    carrera_ids = list({a.carrera_id for a in alumnos if a.carrera_id})

    # batch Carrera
    carreras_map = {
        c.id: c for c in db.query(Carrera).filter(Carrera.id.in_(carrera_ids)).all()
    }

    # batch ProcesoGraduacion — último por alumno
    from sqlalchemy import func as _func
    proceso_max_ids = (
        db.query(
            ProcesoGraduacion.alumno_id,
            _func.max(ProcesoGraduacion.id).label("max_id"),
        )
        .filter(ProcesoGraduacion.alumno_id.in_(alumno_ids))
        .group_by(ProcesoGraduacion.alumno_id)
        .all()
    )
    proceso_map = {}
    if proceso_max_ids:
        max_ids = [row.max_id for row in proceso_max_ids]
        for p in db.query(ProcesoGraduacion).filter(ProcesoGraduacion.id.in_(max_ids)).all():
            proceso_map[p.alumno_id] = p

    # batch EtapaTesis — última por proceso
    proceso_ids = [p.id for p in proceso_map.values()]
    etapa_max_ids = (
        db.query(
            EtapaTesis.proceso_id,
            _func.max(EtapaTesis.id).label("max_id"),
        )
        .filter(EtapaTesis.proceso_id.in_(proceso_ids))
        .group_by(EtapaTesis.proceso_id)
        .all()
    ) if proceso_ids else []
    etapa_map = {}
    if etapa_max_ids:
        etapa_ids = [row.max_id for row in etapa_max_ids]
        for e in db.query(EtapaTesis).filter(EtapaTesis.id.in_(etapa_ids)).all():
            etapa_map[e.proceso_id] = e

    items = []
    for alumno in alumnos:
        condicion = verificar_condicion_egreso(alumno.id, db)
        carrera = carreras_map.get(alumno.carrera_id) if alumno.carrera_id else None
        proceso = proceso_map.get(alumno.id)
        tesina_estado = None
        if proceso:
            ultima_etapa = etapa_map.get(proceso.id)
            tesina_estado = ultima_etapa.estado if ultima_etapa else None

        if proceso and proceso.estado == "graduado":
            estado_candidato = "verificado"
        elif proceso:
            estado_candidato = "pendiente"
        elif condicion["puede_graduarse"]:
            estado_candidato = "elegible"
        else:
            estado_candidato = "pendiente"

        items.append(
            {
                "alumno_id": alumno.id,
                "nombre": alumno.nombre,
                "username": alumno.username,
                "carrera_id": alumno.carrera_id,
                "carrera_nombre": carrera.nombre if carrera else None,
                "creditos_aprobados": condicion["creditos_aprobados"],
                "creditos_totales": condicion["creditos_totales"],
                "ppa_actual": condicion["ppa_actual"],
                "ppa_minimo": condicion["ppa_minimo"],
                "pasantia_completada": condicion["pasantia_completada"],
                "tesina_estado": tesina_estado,
                "proceso_id": proceso.id if proceso else None,
                "proceso_estado": proceso.estado if proceso else None,
                "estado_candidato": estado_candidato,
            }
        )
    return items, total


def iniciar_proceso(alumno_id: int, db: Session) -> ProcesoGraduacion:
    existente = (
        db.query(ProcesoGraduacion)
        .filter(
            ProcesoGraduacion.alumno_id == alumno_id,
            ProcesoGraduacion.estado.in_(["en_proceso", "tesis_en_curso"]),
        )
        .first()
    )
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
    proceso = (
        db.query(ProcesoGraduacion).filter(ProcesoGraduacion.id == proceso_id).first()
    )
    if not proceso:
        raise ValueError("Proceso de graduación no encontrado")
    tutor = db.query(User).filter(User.id == tutor_id, User.role == "profesor").first()
    if not tutor:
        raise ValueError("Tutor no encontrado o no es profesor")
    proceso.tutor_id = tutor_id
    db.flush()
    return proceso


def actualizar_etapa(
    etapa_id: int, estado: str, observaciones: Optional[str], db: Session
) -> EtapaTesis:
    etapa = db.query(EtapaTesis).filter(EtapaTesis.id == etapa_id).first()
    if not etapa:
        raise ValueError("Etapa no encontrada")
    etapa.estado = estado
    if observaciones is not None:
        etapa.observaciones = observaciones
    db.flush()
    return etapa
