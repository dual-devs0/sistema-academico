"""
Boleta de calificaciones del alumno. Dos piezas:
1) Sello digital verificable — código HMAC + QR (sello_boleta/verificar_boleta),
   sin relación con el reporte de notas.
2) Reporte unificado (resumen + PDF por scope), sobre services/boleta_data.py
   y services/reporte_notas.py — un solo endpoint de datos y uno de PDF,
   sin duplicar lógica ni botones como en la versión anterior.
"""
import base64
import hashlib
import hmac
import io
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import models, schemas, database
from app.auth import SECRET_KEY
from app.dependencias import get_current_user
from app.services.autorizacion import es_profesor_de_alumno
from app.services.boleta_data import construir_boleta_data
from app.services.reporte_notas import construir_reporte_notas
from app.routers.reporte_notas_router import _build_pdf, _periodo_label

router = APIRouter(prefix="/boleta", tags=["boleta"])


def _resolver_alumno_id(alumno_id: int | None, current_user, db: Session) -> int:
    """Sin alumno_id: el propio usuario. Con alumno_id de otro alumno: solo
    admin, o profesor que efectivamente le da clase (es_profesor_de_alumno)."""
    if alumno_id is None or alumno_id == current_user.user_id:
        return current_user.user_id
    if current_user.role == "admin":
        return alumno_id
    if current_user.role == "profesor" and es_profesor_de_alumno(db, current_user.user_id, alumno_id):
        return alumno_id
    raise HTTPException(status_code=403, detail="No autorizado")


def _codigo_verificacion(user_id: int) -> str:
    """Código corto y determinístico, firmado con SECRET_KEY: cualquiera que lo
    reciba en un documento (PDF o vista web) puede validarlo contra
    /boleta/verificar/{codigo} sin necesitar acceso a la cuenta del alumno."""
    firma = hmac.new(SECRET_KEY.encode(), f"boleta:{user_id}".encode(), hashlib.sha256).hexdigest()[:10].upper()
    return f"UCA-X{user_id:04d}-{firma}"


def _verificar_codigo(codigo: str) -> int | None:
    """Devuelve el user_id si el código es válido, None si fue alterado/inventado."""
    try:
        prefijo, user_id_str, firma = codigo.split("-")
        if prefijo != "UCA" or not user_id_str.startswith("X"):
            return None
        user_id = int(user_id_str[1:])
    except (ValueError, IndexError):
        return None
    if hmac.compare_digest(_codigo_verificacion(user_id), codigo):
        return user_id
    return None


@router.get("/verificar/{codigo}")
def verificar_boleta(
    codigo: str,
    db: Session = Depends(database.get_db),
):
    """Verificación pública de autenticidad: recibe el código impreso/mostrado
    en la boleta y confirma si corresponde a un alumno real del sistema."""
    user_id = _verificar_codigo(codigo)
    if user_id is None:
        return {"valido": False}

    user = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not user:
        return {"valido": False}

    return {
        "valido": True,
        "alumno_nombre": user.nombre,
        "validado_en": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/{user_id}/sello")
def sello_boleta(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if (
        current_user.role not in ("admin", "profesor")
        and current_user.user_id != user_id
    ):
        raise HTTPException(status_code=403, detail="No autorizado")
    if current_user.role == "profesor" and not es_profesor_de_alumno(
        db, current_user.user_id, user_id
    ):
        raise HTTPException(status_code=403, detail="No autorizado")

    user = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    import qrcode

    codigo = _codigo_verificacion(user_id)
    qr = qrcode.make(codigo)
    buf = io.BytesIO()
    qr.save(buf)
    qr_base64 = base64.b64encode(buf.getvalue()).decode()

    return {
        "codigo": codigo,
        "qr_base64": qr_base64,
        "validado_en": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/resumen", response_model=schemas.boleta.BoletaDataOut)
def boleta_resumen(
    alumno_id: int | None = Query(None),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    target_id = _resolver_alumno_id(alumno_id, current_user, db)
    data = construir_boleta_data(db, target_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
    return data


@router.get("/pdf")
def boleta_pdf(
    alumno_id: int | None = Query(None),
    scope: Literal["global", "anio", "semestre_actual"] = Query("global"),
    anio: int | None = Query(None),
    semestre: int | None = Query(None),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    target_id = _resolver_alumno_id(alumno_id, current_user, db)
    reporte = construir_reporte_notas(db, target_id)
    if reporte is None:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    if scope == "semestre_actual":
        periodo_actual = reporte["periodos_disponibles"][0] if reporte["periodos_disponibles"] else None
        reporte["semestres"] = [s for s in reporte["semestres"] if s["periodo"] == periodo_actual]
        titulo = _periodo_label(periodo_actual) if periodo_actual else "Semestre actual"
        mostrar_recursadas = False
    elif scope == "anio":
        if anio is None:
            raise HTTPException(status_code=422, detail="El parámetro 'anio' es requerido para scope=anio")
        if semestre is not None:
            reporte["semestres"] = [s for s in reporte["semestres"] if s["periodo"] == f"{anio}-{semestre}"]
            titulo = _periodo_label(f"{anio}-{semestre}")
        else:
            reporte["semestres"] = [s for s in reporte["semestres"] if s["periodo"].startswith(f"{anio}-")]
            titulo = f"Año {anio}"
        mostrar_recursadas = False
    else:
        titulo = "Todos los semestres"
        mostrar_recursadas = True

    pdf_bytes = _build_pdf(reporte, titulo, mostrar_recursadas)
    sufijo = f"{scope}_{anio}" if scope == "anio" else scope
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="boleta_{sufijo}.pdf"'},
    )
