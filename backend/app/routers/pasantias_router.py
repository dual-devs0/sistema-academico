"""
Router Pasantías — Fase 5C.

POST   /pasantias/empresas
POST   /pasantias/solicitudes
PUT    /pasantias/{id}/aprobar
PUT    /pasantias/{id}/horas
POST   /pasantias/{id}/informes
PUT    /pasantias/{id}/finalizar
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional

from app import database
from app.dependencias import get_current_user, require_role
from app.schemas.pasantia import (
    EmpresaReceptoraCreate,
    EmpresaReceptoraOut,
    PasantiaCreate,
    PasantiaOut,
    PasantiaHorasUpdate,
    InformePasantiaOut,
)
from app.services.pasantia import (
    crear_empresa,
    crear_solicitud_pasantia,
    aprobar_pasantia,
    actualizar_horas,
    subir_informe,
    finalizar_pasantia,
)
from app.services.storage import subir_archivo

router = APIRouter(prefix="/pasantias", tags=["pasantias"])


@router.post(
    "/empresas",
    response_model=EmpresaReceptoraOut,
    summary="Admin registra empresa receptora",
)
def crear_empresa_endpoint(
    data: EmpresaReceptoraCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    try:
        empresa = crear_empresa(
            nombre=data.nombre,
            rubro=data.rubro,
            contacto=data.contacto,
            telefono=data.telefono,
            email=data.email,
            convenio_activo=data.convenio_activo,
            db=db,
        )
        db.commit()
        db.refresh(empresa)
        return empresa
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))


@router.post(
    "/solicitudes", response_model=PasantiaOut, summary="Alumno solicita pasantía"
)
def crear_solicitud_endpoint(
    data: PasantiaCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("alumno")),
):
    try:
        pasantia = crear_solicitud_pasantia(
            alumno_id=current_user["user_id"],
            empresa_id=data.empresa_id,
            fecha_inicio=data.fecha_inicio,
            horas_requeridas=data.horas_requeridas,
            db=db,
        )
        db.commit()
        db.refresh(pasantia)
        return pasantia
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))


@router.put(
    "/{id}/aprobar",
    response_model=PasantiaOut,
    summary="Admin/profesor aprueba pasantía",
)
def aprobar_pasantia_endpoint(
    id: int,
    tutor_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    try:
        pasantia = aprobar_pasantia(id, tutor_id=tutor_id, db=db)
        db.commit()
        db.refresh(pasantia)
        return pasantia
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))


@router.put(
    "/{id}/horas", response_model=PasantiaOut, summary="Actualiza horas completadas"
)
def actualizar_horas_endpoint(
    id: int,
    data: PasantiaHorasUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    try:
        pasantia = actualizar_horas(id, horas_completadas=data.horas_completadas, db=db)
        db.commit()
        db.refresh(pasantia)
        return pasantia
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))


@router.post(
    "/{id}/informes",
    response_model=InformePasantiaOut,
    summary="Subir informe de pasantía",
)
def subir_informe_endpoint(
    id: int,
    tipo: str = Form(...),
    archivo: Optional[UploadFile] = File(None),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    try:
        storage_key = None
        if archivo:
            storage_key = subir_archivo(archivo, carpeta="informes_pasantia")
        informe = subir_informe(id, tipo=tipo, storage_key=storage_key, db=db)
        db.commit()
        db.refresh(informe)
        return informe
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))


@router.put("/{id}/finalizar", response_model=PasantiaOut, summary="Finalizar pasantía")
def finalizar_pasantia_endpoint(
    id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    try:
        pasantia = finalizar_pasantia(id, db=db)
        db.commit()
        db.refresh(pasantia)
        return pasantia
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))
