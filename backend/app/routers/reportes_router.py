import csv
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.dependencias import get_current_user
from app.routers.puntajes_router import PESOS, _calcular_promedio_final

router = APIRouter(prefix="/reportes", tags=["reportes"])


def get_admin_user(current_user=Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    return current_user


@router.get("/resumen")
def resumen(
    db: Session = Depends(database.get_db),
    _=Depends(get_admin_user),
):
    return {
        "total_alumnos": db.query(models.user.User)
        .filter(models.user.User.role == "alumno")
        .count(),
        "total_becados": db.query(models.user.User)
        .filter(models.user.User.es_becado)
        .count(),
        "total_materias": db.query(models.materia.Materia).count(),
        "total_profesores": db.query(models.user.User)
        .filter(models.user.User.role == "profesor")
        .count(),
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
            .filter(
                models.user.User.role == "alumno", models.user.User.carrera_id == c.id
            )
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
                    models.asistencia.Asistencia.presente,
                )
                .count()
            )
            asistencia_pct = round(
                (pres_asist / total_asist * 100) if total_asist > 0 else 0.0, 1
            )

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

        result.append(
            {
                "carrera": c.nombre,
                "total_alumnos": total_alumnos,
                "asistencia_pct": asistencia_pct,
                "aprobados_pct": aprobados_pct,
                "en_riesgo": en_riesgo,
            }
        )

    return result


@router.get("/becados", response_model=list[schemas.user.UserOut])
def becados(
    db: Session = Depends(database.get_db),
    _=Depends(get_admin_user),
):
    return db.query(models.user.User).filter(models.user.User.es_becado).all()


# ─── Exportación RUE-ES (MEC) ────────────────────────────────────────────────
#
# Formato de exportación construido con los campos estándar que suele
# solicitar el Registro Único del Estudiante de Educación Superior
# (RUE-ES, Ministerio de Educación y Ciencias — Paraguay) para matrícula y
# trayecto académico. El MEC/CONES no publica una plantilla técnica pública
# descargable; este export debe validarse y ajustarse contra la plantilla
# oficial una vez que la universidad la reciba del VESC/CONES. El campo
# `codigo_mec_carrera` queda vacío como placeholder hasta que la carrera
# tenga asignado su código oficial del MEC.


def _csv_response(filename: str, header: list[str], rows: list[list]) -> StreamingResponse:
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";")
    writer.writerow(header)
    writer.writerows(rows)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/rue-es/matricula")
def exportar_matricula_rue_es(
    db: Session = Depends(database.get_db),
    _=Depends(get_admin_user),
):
    """Exporta la matrícula vigente de alumnos en formato CSV (delimitado por
    `;`) con los campos base que exige el RUE-ES: cédula, nombre completo,
    carrera, código MEC de carrera (placeholder), año de ingreso, condición
    de beca y estado."""
    alumnos = (
        db.query(models.user.User)
        .filter(models.user.User.role == "alumno")
        .order_by(models.user.User.id)
        .all()
    )

    header = [
        "cedula",
        "apellidos_nombres",
        "carrera",
        "codigo_mec_carrera",
        "anio_ingreso",
        "condicion_beca",
        "estado",
    ]
    rows = []
    for a in alumnos:
        carrera = (
            db.query(models.carrera.Carrera)
            .filter(models.carrera.Carrera.id == a.carrera_id)
            .first()
            if a.carrera_id
            else None
        )
        rows.append(
            [
                a.cedula or "",
                a.nombre or a.username,
                carrera.nombre if carrera else "",
                "",  # codigo_mec_carrera: placeholder, pendiente asignación oficial
                a.created_at.year if a.created_at else "",
                "BECADO" if a.es_becado else "NO_BECADO",
                "ACTIVO",
            ]
        )

    return _csv_response("rue_es_matricula.csv", header, rows)


@router.get("/rue-es/trayecto-academico")
def exportar_trayecto_academico_rue_es(
    db: Session = Depends(database.get_db),
    _=Depends(get_admin_user),
):
    """Exporta el trayecto académico (materias cursadas por alumno, con nota
    final y % de asistencia) en formato CSV para reporte RUE-ES."""
    inscripciones = db.query(models.inscripcion.Inscripcion).all()

    header = [
        "cedula",
        "apellidos_nombres",
        "carrera",
        "materia",
        "periodo",
        "nota_final",
        "estado_materia",
        "porcentaje_asistencia",
    ]
    rows = []
    for ins in inscripciones:
        alumno = (
            db.query(models.user.User)
            .filter(models.user.User.id == ins.alumno_id)
            .first()
        )
        if not alumno:
            continue
        oferta = (
            db.query(models.oferta_materia.OfertaMateria)
            .filter(models.oferta_materia.OfertaMateria.id == ins.oferta_materia_id)
            .first()
        )
        if not oferta:
            continue
        materia = (
            db.query(models.materia.Materia)
            .filter(models.materia.Materia.id == oferta.materia_id)
            .first()
        )
        carrera = (
            db.query(models.carrera.Carrera)
            .filter(models.carrera.Carrera.id == alumno.carrera_id)
            .first()
            if alumno.carrera_id
            else None
        )

        puntajes = (
            db.query(models.puntaje.Puntaje)
            .filter(
                models.puntaje.Puntaje.user_id == alumno.id,
                models.puntaje.Puntaje.oferta_materia_id == oferta.id,
            )
            .all()
        )
        notas = {p.tipo: float(p.valor) for p in puntajes if p.tipo in PESOS}
        promedio = _calcular_promedio_final(
            {k: notas.get(k) for k in PESOS}
        )
        if promedio is None:
            estado_materia = "CURSANDO"
        elif promedio >= 6:
            estado_materia = "APROBADO"
        else:
            estado_materia = "REPROBADO"

        total_asist = (
            db.query(models.asistencia.Asistencia)
            .filter(
                models.asistencia.Asistencia.user_id == alumno.id,
                models.asistencia.Asistencia.oferta_materia_id == oferta.id,
            )
            .count()
        )
        pres_asist = (
            db.query(models.asistencia.Asistencia)
            .filter(
                models.asistencia.Asistencia.user_id == alumno.id,
                models.asistencia.Asistencia.oferta_materia_id == oferta.id,
                models.asistencia.Asistencia.presente,
            )
            .count()
        )
        pct_asistencia = (
            round((pres_asist / total_asist) * 100, 1) if total_asist > 0 else ""
        )

        rows.append(
            [
                alumno.cedula or "",
                alumno.nombre or alumno.username,
                carrera.nombre if carrera else "",
                materia.nombre if materia else "",
                oferta.periodo,
                promedio if promedio is not None else "",
                estado_materia,
                pct_asistencia,
            ]
        )

    return _csv_response("rue_es_trayecto_academico.csv", header, rows)
