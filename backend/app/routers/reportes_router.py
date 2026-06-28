from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.dependencias import get_current_user

router = APIRouter(prefix="/reportes", tags=["reportes"])


def get_admin_user(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    return current_user


@router.get("/resumen")
def resumen(
    db: Session = Depends(database.get_db),
    _=Depends(get_admin_user),
):
    return {
        "total_alumnos":    db.query(models.user.User).filter(models.user.User.role == "alumno").count(),
        "total_becados":    db.query(models.user.User).filter(models.user.User.es_becado == True).count(),
        "total_materias":   db.query(models.materia.Materia).count(),
        "total_profesores": db.query(models.user.User).filter(models.user.User.role == "profesor").count(),
    }


@router.get("/por-carrera")
def por_carrera(
    db: Session = Depends(database.get_db),
    _=Depends(get_admin_user),
):
    carreras = db.query(models.carrera.Carrera).all()
    result = []

    for c in carreras:
        alumnos = (
            db.query(models.user.User)
            .filter(models.user.User.role == "alumno", models.user.User.carrera_id == c.id)
            .all()
        )
        alumno_ids = [a.id for a in alumnos]
        total_alumnos = len(alumno_ids)

        if alumno_ids:
            total_asist = (
                db.query(models.asistencia.Asistencia)
                .filter(models.asistencia.Asistencia.user_id.in_(alumno_ids))
                .count()
            )
            pres_asist = (
                db.query(models.asistencia.Asistencia)
                .filter(
                    models.asistencia.Asistencia.user_id.in_(alumno_ids),
                    models.asistencia.Asistencia.presente == True,
                )
                .count()
            )
            asistencia_pct = round((pres_asist / total_asist * 100) if total_asist > 0 else 0.0, 1)

            puntajes = (
                db.query(models.puntaje.Puntaje)
                .filter(models.puntaje.Puntaje.user_id.in_(alumno_ids))
                .all()
            )
            if puntajes:
                aprobados = sum(1 for p in puntajes if float(p.valor) >= 6)
                aprobados_pct = round(aprobados / len(puntajes) * 100, 1)
            else:
                aprobados_pct = 0.0

            en_riesgo = 0
            for uid in alumno_ids:
                pts = [p for p in puntajes if p.user_id == uid]
                if pts:
                    avg = sum(float(p.valor) for p in pts) / len(pts)
                    if avg < 6:
                        en_riesgo += 1
        else:
            asistencia_pct = 0.0
            aprobados_pct = 0.0
            en_riesgo = 0

        result.append({
            "carrera":        c.nombre,
            "total_alumnos":  total_alumnos,
            "asistencia_pct": asistencia_pct,
            "aprobados_pct":  aprobados_pct,
            "en_riesgo":      en_riesgo,
        })

    return result


@router.get("/becados", response_model=list[schemas.user.UserOut])
def becados(
    db: Session = Depends(database.get_db),
    _=Depends(get_admin_user),
):
    return db.query(models.user.User).filter(models.user.User.es_becado == True).all()
