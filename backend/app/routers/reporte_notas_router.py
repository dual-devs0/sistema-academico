"""Reporte de calificaciones del alumno (JSON), por semestre o global.
Usado por Cursos > Calificaciones (desglose inline por semestre). El PDF
unificado (con selección de scope) vive en boleta_router::/boleta/pdf, sobre
services/boleta_pdf.py (WeasyPrint). Agrupamiento y métricas viven en
services/reporte_notas.py; este router solo valida acceso (siempre
self-service, igual que alumno_router.py).
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import database
from app.dependencias import get_current_user
from app.services.reporte_notas import construir_reporte_notas

router = APIRouter(prefix="/alumno", tags=["alumno"])


@router.get("/reporte-notas", response_model=None)
def reporte_notas(
    semestre: str | None = Query(None, description="Formato 'YYYY-N', ej. 2026-1. Sin valor: reporte global."),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    reporte = construir_reporte_notas(db, current_user.user_id, semestre)
    if reporte is None:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
    return reporte
