"""
services/pasantia.py — Fase 5C: Pasantías.
"""
from __future__ import annotations

from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from app.models.pasantia import EmpresaReceptora, Pasantia, InformePasantia
from app.models.users import User


def crear_empresa(nombre: str, rubro: Optional[str], contacto: Optional[str],
                   telefono: Optional[str], email: Optional[str],
                   convenio_activo: bool, db: Session) -> EmpresaReceptora:
    existente = db.query(EmpresaReceptora).filter(EmpresaReceptora.nombre == nombre).first()
    if existente:
        raise ValueError(f"La empresa '{nombre}' ya está registrada")
    empresa = EmpresaReceptora(
        nombre=nombre, rubro=rubro, contacto=contacto,
        telefono=telefono, email=email, convenio_activo=convenio_activo,
    )
    db.add(empresa)
    db.flush()
    return empresa


def crear_solicitud_pasantia(alumno_id: int, empresa_id: int,
                              fecha_inicio: date, horas_requeridas: int,
                              db: Session) -> Pasantia:
    empresa = db.query(EmpresaReceptora).filter(EmpresaReceptora.id == empresa_id).first()
    if not empresa:
        raise ValueError("Empresa no encontrada")
    pasantia = Pasantia(
        alumno_id=alumno_id, empresa_id=empresa_id,
        fecha_inicio=fecha_inicio, horas_requeridas=horas_requeridas,
        estado="pendiente",
    )
    db.add(pasantia)
    db.flush()
    return pasantia


def aprobar_pasantia(pasantia_id: int, tutor_id: int, db: Session) -> Pasantia:
    pasantia = db.query(Pasantia).filter(Pasantia.id == pasantia_id).first()
    if not pasantia:
        raise ValueError("Pasantía no encontrada")
    tutor = db.query(User).filter(User.id == tutor_id, User.role == "profesor").first()
    if not tutor:
        raise ValueError("Tutor académico no encontrado o no es profesor")
    pasantia.estado = "en_curso"
    pasantia.tutor_academico_id = tutor_id
    db.flush()
    return pasantia


def actualizar_horas(pasantia_id: int, horas_completadas: int, db: Session) -> Pasantia:
    pasantia = db.query(Pasantia).filter(Pasantia.id == pasantia_id).first()
    if not pasantia:
        raise ValueError("Pasantía no encontrada")
    pasantia.horas_completadas = horas_completadas
    db.flush()
    return pasantia


def subir_informe(pasantia_id: int, tipo: str, storage_key: Optional[str],
                  db: Session) -> InformePasantia:
    pasantia = db.query(Pasantia).filter(Pasantia.id == pasantia_id).first()
    if not pasantia:
        raise ValueError("Pasantía no encontrada")
    informe = InformePasantia(
        pasantia_id=pasantia_id, tipo=tipo, storage_key=storage_key,
    )
    db.add(informe)
    db.flush()
    return informe


def finalizar_pasantia(pasantia_id: int, db: Session) -> Pasantia:
    pasantia = db.query(Pasantia).filter(Pasantia.id == pasantia_id).first()
    if not pasantia:
        raise ValueError("Pasantía no encontrada")
    if pasantia.horas_completadas < pasantia.horas_requeridas:
        raise ValueError(f"Horas incompletas: {pasantia.horas_completadas}/{pasantia.horas_requeridas}")
    pasantia.estado = "completada"
    db.flush()
    return pasantia


def pasantia_completada_por_alumno(alumno_id: int, db: Session) -> bool:
    return db.query(Pasantia).filter(
        Pasantia.alumno_id == alumno_id,
        Pasantia.estado == "completada",
    ).first() is not None