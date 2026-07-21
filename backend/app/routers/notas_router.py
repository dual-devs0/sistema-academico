"""
Router Notas — endpoints compuestos para la app mobile.

Endpoints:
  GET /notas/materia/{materia_id}/detalle   → MateriaDetalle con desglose
  GET /notas/materia/{materia_id}/asistencia → AsistenciaDetalleResponse

La app mobile consume estos endpoints desde `notasService.ts`.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import database, models
from app.dependencias import get_current_user

router = APIRouter(prefix="/notas", tags=["notas"])


PESOS = {"parcial1": 0.25, "parcial2": 0.25, "practico": 0.20, "final": 0.30}
LABEL = {"parcial1": "Parcial 1", "parcial2": "Parcial 2", "practico": "Trabajo Práctico", "final": "Final"}
PUNTAJE_POR_TIPO = {"parcial1": 100, "parcial2": 100, "practico": 60, "final": 100, "final1": 50, "final2": 50, "final3": 50}


def _oferta_activa_por_materia(db: Session, materia_id: int):
    return (
        db.query(models.oferta_materia.OfertaMateria)
        .filter(
            models.oferta_materia.OfertaMateria.materia_id == materia_id,
            models.oferta_materia.OfertaMateria.activa == True,
        )
        .first()
    )


@router.get("/materia/{materia_id}/detalle")
def materia_detalle(
    materia_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    """
    Detalle de materia para la app mobile: info general + desglose de notas + asistencia.

    Compone datos de:
      - Materia (nombre, semestre)
      - OfertaMateria (profesor)
      - Puntaje (notas por tipo: parcial1, parcial2, practico, final)
      - Asistencia (porcentaje, total clases, presentes)
    """
    materia = (
        db.query(models.materia.Materia)
        .filter(models.materia.Materia.id == materia_id)
        .first()
    )
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")

    oferta = _oferta_activa_por_materia(db, materia_id)
    profesor_nombre = None
    if oferta and oferta.profesor_id:
        prof = (
            db.query(models.user.User)
            .filter(models.user.User.id == oferta.profesor_id)
            .first()
        )
        if prof:
            profesor_nombre = prof.nombre or prof.username

    oferta_id = oferta.id if oferta else None

    # Puntajes del alumno en esta materia
    puntajes = []
    if oferta_id:
        puntajes = (
            db.query(models.puntaje.Puntaje)
            .filter(
                models.puntaje.Puntaje.oferta_materia_id == oferta_id,
                models.puntaje.Puntaje.user_id == current_user.user_id,
            )
            .all()
        )

    # Asistencia
    total_clases = 0
    presentes = 0
    if oferta_id:
        total_clases = (
            db.query(models.asistencia.Asistencia)
            .filter(
                models.asistencia.Asistencia.oferta_materia_id == oferta_id,
                models.asistencia.Asistencia.user_id == current_user.user_id,
            )
            .count()
        )
        presentes = (
            db.query(models.asistencia.Asistencia)
            .filter(
                models.asistencia.Asistencia.oferta_materia_id == oferta_id,
                models.asistencia.Asistencia.user_id == current_user.user_id,
                models.asistencia.Asistencia.presente == True,
            )
            .count()
        )

    asistencia_pct = round((presentes / total_clases) * 100, 1) if total_clases > 0 else None

    # Construir desglose
    tipos_existentes = {p.tipo: p for p in puntajes}
    # Orden: parcial1, parcial2, practico, final (y variantes final1..final3)
    orden_tipos = ["parcial1", "parcial2", "practico", "final", "final1", "final2", "final3"]
    desglose = []

    for tipo in orden_tipos:
        label = LABEL.get(tipo, tipo.replace("_", " ").title())
        peso = PESOS.get(tipo, 0)

        if tipo in tipos_existentes:
            p = tipos_existentes[tipo]
            nota_val = float(p.valor) if p.valor is not None else None
            max_pts = PUNTAJE_POR_TIPO.get(tipo, 100)
            logrado = round(nota_val * (max_pts / 10)) if nota_val is not None else None

            desglose.append({
                "tipo": tipo,
                "label": label,
                "peso": peso,
                "nota": nota_val,
                "puntajeActividad": max_pts,
                "puntajeLogrado": logrado,
                "fecha": None,
                "hora": None,
                "profesor": profesor_nombre,
            })
        else:
            desglose.append({
                "tipo": tipo,
                "label": label,
                "peso": peso,
                "nota": None,
                "puntajeActividad": PUNTAJE_POR_TIPO.get(tipo, None),
                "puntajeLogrado": None,
                "fecha": None,
                "hora": None,
                "profesor": None,
            })

    # Calcular promedio
    notas_con_valor = {p.tipo: float(p.valor) for p in puntajes if p.valor is not None}
    promedio = None
    if notas_con_valor:
        existentes = {k: v for k, v in notas_con_valor.items() if k in PESOS}
        if existentes:
            peso_total = sum(PESOS[k] for k in existentes)
            if peso_total > 0:
                promedio = round(
                    sum(PESOS[k] * v for k, v in existentes.items()) / peso_total,
                    2,
                )

    return {
        "materiaId": materia.id,
        "nombre": materia.nombre,
        "profesor": profesor_nombre,
        "semestre": materia.semestre,
        "promedio": promedio,
        "asistenciaPct": asistencia_pct,
        "totalClases": total_clases,
        "presentes": presentes,
        "desglose": desglose,
    }


@router.get("/materia/{materia_id}/asistencia")
def materia_asistencia(
    materia_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    """
    Asistencia detallada de una materia para la app mobile.

    Retorna todos los registros de asistencia del alumno en la materia,
    ordenados por fecha descendente, con el formato que espera el frontend:
      - fecha: YYYY-MM-DD
      - tipoClase: "P" (práctica) o "T" (teórica) — hoy siempre "P"
      - horasCatedra: 4 (default)
      - asistenciaCargada: "Presente" | "Ausente" | "Justificado" | "Feriado"
    """
    materia = (
        db.query(models.materia.Materia)
        .filter(models.materia.Materia.id == materia_id)
        .first()
    )
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")

    oferta = _oferta_activa_por_materia(db, materia_id)
    if not oferta:
        return {"nombre": materia.nombre, "registros": []}

    asistencias = (
        db.query(models.asistencia.Asistencia)
        .filter(
            models.asistencia.Asistencia.oferta_materia_id == oferta.id,
            models.asistencia.Asistencia.user_id == current_user.user_id,
        )
        .order_by(models.asistencia.Asistencia.fecha.asc())
        .all()
    )

    registros = []
    for a in asistencias:
        if a.presente:
            estado = "Presente"
        elif a.motivo:
            estado = "Justificado"
        else:
            estado = "Ausente"

        registros.append({
            "fecha": a.fecha.isoformat(),
            "tipoClase": "P",
            "horasCatedra": 4,
            "asistenciaCargada": estado,
        })

    return {
        "nombre": materia.nombre,
        "registros": registros,
    }
