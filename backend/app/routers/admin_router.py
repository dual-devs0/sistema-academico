from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import func, case
from sqlalchemy.orm import Session
from app import models, database
from app.dependencias import require_role

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard")
def admin_dashboard(
    db: Session = Depends(database.get_db),
    _=Depends(require_role("admin")),
):
    now = datetime.now(timezone.utc)

    U = models.user.User
    M = models.materia.Materia
    O = models.oferta_materia.OfertaMateria
    P = models.puntaje.Puntaje
    A = models.asistencia.Asistencia
    I = models.inscripcion.Inscripcion
    S = models.tramites.Solicitud

    # ── Resumen counts ──
    role_counts = {
        row.role: row.cnt
        for row in db.query(U.role, func.count(U.id).label("cnt"))
        .filter(U.role.in_(["alumno", "profesor"]))
        .group_by(U.role)
        .all()
    }
    total_alumnos = role_counts.get("alumno", 0)
    total_profesores = role_counts.get("profesor", 0)
    total_materias = db.query(M).count()
    total_becados = db.query(U).filter(U.es_becado.is_(True)).count()
    tramites_pendientes = (
        db.query(func.count(S.id))
        .filter(S.estado == "pendiente")
        .scalar()
        or 0
    )

    materias_con_oferta = (
        db.query(O.materia_id).filter(O.activa.is_(True)).distinct().count()
    )
    materias_sin_oferta = total_materias - materias_con_oferta

    oferta_ids = [
        row[0]
        for row in db.query(O.id).filter(O.activa.is_(True)).all()
    ]

    # ── KPIs académicos ──
    kpis = {
        "promedio_general": 0.0,
        "aprobacion_pct": 0,
        "asistencia_pct": 0,
        "alumnos_activos": 0,
    }
    alumnos_por_oferta: set = set()
    punt_por_alumno: dict = {}
    if oferta_ids:
        punt_agg = (
            db.query(
                P.oferta_materia_id,
                func.avg(P.valor).label("prom"),
                func.count(P.id).label("cnt"),
            )
            .filter(P.oferta_materia_id.in_(oferta_ids))
            .group_by(P.oferta_materia_id)
            .all()
        )
        total_notas = sum(r.cnt for r in punt_agg)
        suma_ponderada = sum(
            (float(r.prom) * r.cnt) for r in punt_agg if r.prom is not None
        )
        kpis["promedio_general"] = (
            round(suma_ponderada / total_notas, 1) if total_notas > 0 else 0.0
        )

        alumnos_por_oferta = set()
        for row in db.query(I.alumno_id).filter(
            I.oferta_materia_id.in_(oferta_ids)
        ).all():
            alumnos_por_oferta.add(row[0])
        kpis["alumnos_activos"] = len(alumnos_por_oferta)

        # Aprobación
        punt_por_alumno = {}
        for r in db.query(
            P.user_id,
            func.avg(P.valor).label("prom"),
        ).filter(P.oferta_materia_id.in_(oferta_ids)).group_by(P.user_id).all():
            punt_por_alumno[r.user_id] = float(r.prom) if r.prom else 0.0

        total_con_notas = len(punt_por_alumno)
        aprobados = sum(1 for v in punt_por_alumno.values() if v >= 6)
        kpis["aprobacion_pct"] = (
            round(aprobados / total_con_notas * 100) if total_con_notas > 0 else 0
        )

        # Asistencia global
        asis_row = (
            db.query(
                func.count(A.id).label("total"),
                func.sum(case((A.presente, 1), else_=0)).label("pres"),
            )
            .filter(A.oferta_materia_id.in_(oferta_ids))
            .first()
        )
        total_a = asis_row.total if asis_row else 0
        pres_a = asis_row.pres if asis_row else 0
        kpis["asistencia_pct"] = (
            round(pres_a / total_a * 100, 1) if total_a > 0 else 0.0
        )

    # ── Últimos usuarios registrados ──
    ultimos_usuarios = []
    for u in (
        db.query(U)
        .order_by(U.created_at.desc())
        .limit(5)
        .all()
    ):
        ultimos_usuarios.append({
            "id": u.id,
            "nombre": u.nombre or u.username,
            "email": u.email or "",
            "role": u.role,
            "created_at": (
                u.created_at.isoformat() if u.created_at else ""
            ),
        })

    # ── Alertas de estudiantes en riesgo ──
    alertas = []
    if oferta_ids:
        alumno_ids = list(alumnos_por_oferta)

        asis_por_alumno = {}
        for r in db.query(
            A.user_id,
            func.count(A.id).label("total"),
            func.sum(case((A.presente, 1), else_=0)).label("pres"),
        ).filter(
            A.user_id.in_(alumno_ids),
            A.oferta_materia_id.in_(oferta_ids),
        ).group_by(A.user_id).all():
            asis_por_alumno[r.user_id] = {
                "total": r.total or 0,
                "pres": r.pres or 0,
            }

        rows_raw = []
        for uid in alumno_ids:
            c = asis_por_alumno.get(uid)
            if not c or c["total"] == 0:
                continue
            inas_pct = round((1 - c["pres"] / c["total"]) * 100)
            if inas_pct < 10:
                continue
            rows_raw.append({
                "user_id": uid,
                "inasistencia_pct": inas_pct,
                "promedio": punt_por_alumno.get(uid),
            })

        rows_raw.sort(key=lambda x: -x["inasistencia_pct"])
        top5 = rows_raw[:5]
        if top5:
            names = {
                uid: name
                for uid, name in db.query(U.id, U.nombre)
                .filter(U.id.in_([r["user_id"] for r in top5]))
                .all()
            }
            for r in top5:
                alertas.append({
                    "user_id": r["user_id"],
                    "nombre": names.get(
                        r["user_id"], f"Alumno #{r['user_id']}"
                    ),
                    "inasistencia_pct": r["inasistencia_pct"],
                    "promedio": r["promedio"],
                })

    return {
        "resumen": {
            "total_alumnos": total_alumnos,
            "total_profesores": total_profesores,
            "total_materias": total_materias,
            "total_becados": total_becados,
            "tramites_pendientes": tramites_pendientes,
            "materias_sin_oferta": materias_sin_oferta,
        },
        "kpis": kpis,
        "ultimos_usuarios": ultimos_usuarios,
        "alertas": alertas,
        "timestamp": now.isoformat(),
    }
