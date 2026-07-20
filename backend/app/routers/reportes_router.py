import csv, io
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, case
from sqlalchemy.orm import Session, joinedload
from app import models, schemas, database
from app.dependencias import get_current_user
from app.services.puntajes_utils import PESOS, calcular_promedio_final

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
    U = models.user.User
    counts = dict(
        db.query(U.role, func.count(U.id))
        .filter(U.role.in_(["alumno", "profesor"]))
        .group_by(U.role)
        .all()
    )
    return {
        "total_alumnos": counts.get("alumno", 0),
        "total_becados": db.query(U).filter(U.es_becado).count(),
        "total_materias": db.query(models.materia.Materia).count(),
        "total_profesores": counts.get("profesor", 0),
    }


@router.get("/por-carrera")
def por_carrera(
    db: Session = Depends(database.get_db),
    _=Depends(get_admin_user),
):
    C = models.carrera.Carrera
    U = models.user.User
    carreras = db.query(C).all()
    carrera_ids = [c.id for c in carreras]
    id_a_nombre = {c.id: c.nombre for c in carreras}

    # 1) Count alumnos per carrera (single query)
    alumno_counts = dict(
        db.query(U.carrera_id, func.count(U.id))
        .filter(U.role == "alumno", U.carrera_id.in_(carrera_ids))
        .group_by(U.carrera_id)
        .all()
    )

    # 2) Attendance stats per carrera via subquery
    alumno_ids_por_carrera = {
        cid: [r[0] for r in db.query(U.id).filter(U.carrera_id == cid, U.role == "alumno").all()]
        for cid in carrera_ids
    }

    # 3) Puntaje stats per carrera using SQL aggregates
    A = models.asistencia.Asistencia
    P = models.puntaje.Puntaje
    result = []
    for cid in carrera_ids:
        a_ids = alumno_ids_por_carrera.get(cid, [])
        total = len(a_ids)
        if not a_ids:
            result.append({"carrera": id_a_nombre[cid], "total_alumnos": 0,
                           "asistencia_pct": 0.0, "aprobados_pct": 0.0, "en_riesgo": 0})
            continue

        # Attendance: single aggregate query
        asist_stats = db.query(
            func.count(A.id).label("total"),
            func.sum(case((A.presente, 1), else_=0)).label("presentes"),
        ).filter(A.user_id.in_(a_ids)).first()
        total_a = asist_stats.total or 0
        pres_a = asist_stats.presentes or 0
        asist_pct = round((pres_a / total_a * 100) if total_a > 0 else 0.0, 1)

        # Puntajes: aggregate per user to find "en_riesgo" (avg < 6)
        punt_rows = db.query(
            P.user_id, func.avg(P.valor).label("prom")
        ).filter(P.user_id.in_(a_ids)).group_by(P.user_id).all()
        total_punt = len(punt_rows)
        aprobados = sum(1 for r in punt_rows if (r.prom or 0) >= 6)
        en_riesgo = sum(1 for r in punt_rows if (r.prom or 0) < 6)
        aprob_pct = round((aprobados / total_punt * 100) if total_punt > 0 else 0.0, 1)

        result.append({
            "carrera": id_a_nombre[cid],
            "total_alumnos": total,
            "asistencia_pct": asist_pct,
            "aprobados_pct": aprob_pct,
            "en_riesgo": en_riesgo,
        })
    return result


@router.get("/dashboard")
def dashboard(
    db: Session = Depends(database.get_db),
    _=Depends(get_admin_user),
):
    U = models.user.User
    M = models.materia.Materia
    P = models.puntaje.Puntaje
    A = models.asistencia.Asistencia
    O = models.oferta_materia.OfertaMateria
    I = models.inscripcion.Inscripcion

    # ─── 1) All materias ───
    materias = db.query(M).all()
    materia_ids = [m.id for m in materias]
    mat_id_nombre = {m.id: m.nombre for m in materias}
    mat_id_oferta = {}
    for row in db.query(O.materia_id, O.id).filter(O.materia_id.in_(materia_ids), O.activa).all():
        mat_id_oferta[row[0]] = row[1]

    # ─── 2) Per-materia stats (batch: one query for all materias) ───
    oferta_ids = list(mat_id_oferta.values())
    # (user_id, oferta_id) → avg, count
    punt_agg = {}
    if oferta_ids:
        for r in db.query(P.user_id, P.oferta_materia_id, func.avg(P.valor).label("prom"), func.count(P.id).label("cnt"))\
            .filter(P.oferta_materia_id.in_(oferta_ids))\
            .group_by(P.user_id, P.oferta_materia_id).all():
            punt_agg.setdefault(r.oferta_materia_id, []).append(r)

    oferta_id_materia = {v: k for k, v in mat_id_oferta.items()}

    # Build materia stats (same logic as estadisticas_materia but in batch)
    materia_stats = []
    for m in materias:
        oid = mat_id_oferta.get(m.id)
        if not oid:
            materia_stats.append({
                "materia_id": m.id, "materia_nombre": m.nombre,
                "total_alumnos": 0, "total_notas": 0, "promedio_grupo": 0,
                "distribucion": {}, "aprobados": 0, "en_riesgo": 0,
            })
            continue
        rows = punt_agg.get(oid, [])
        if not rows:
            materia_stats.append({
                "materia_id": m.id, "materia_nombre": m.nombre,
                "total_alumnos": 0, "total_notas": 0, "promedio_grupo": 0,
                "distribucion": {}, "aprobados": 0, "en_riesgo": 0,
            })
            continue
        promedios = [float(r.prom) for r in rows]
        d = {
            "0-3": sum(1 for v in promedios if v < 3),
            "3-5": sum(1 for v in promedios if 3 <= v < 5),
            "5-6": sum(1 for v in promedios if 5 <= v < 6),
            "6-7": sum(1 for v in promedios if 6 <= v < 7),
            "7-9": sum(1 for v in promedios if 7 <= v < 9),
            "9-10": sum(1 for v in promedios if 9 <= v <= 10),
        }
        aprobados = sum(1 for v in promedios if v >= 6)
        materia_stats.append({
            "materia_id": m.id,
            "materia_nombre": m.nombre,
            "total_alumnos": len(rows),
            "total_notas": sum(r.cnt for r in rows),
            "promedio_grupo": round(sum(promedios) / len(rows), 2),
            "distribucion": d,
            "aprobados": aprobados,
            "en_riesgo": len(rows) - aprobados,
        })

    # ─── 3) Attendance % per materia (single aggregate query) ───
    asis_por_materia = {}
    if oferta_ids:
        for r in db.query(
            A.oferta_materia_id,
            func.count(A.id).label("total"),
            func.sum(case((A.presente, 1), else_=0)).label("pres"),
        ).filter(A.oferta_materia_id.in_(oferta_ids))\
         .group_by(A.oferta_materia_id).all():
            oid = r.oferta_materia_id
            mid = oferta_id_materia.get(oid)
            if mid:
                total = r.total or 0
                pres = r.pres or 0
                asis_por_materia[mid] = round((pres / total * 100) if total > 0 else 0, 1)

    asistencia_materias = []
    for m in materias:
        asistencia_materias.append({
            "materia_id": m.id,
            "materia_nombre": m.nombre,
            "asistencia_pct": asis_por_materia.get(m.id, 0),
        })

    # ─── 4) Global KPIs ───
    total_alumnos_en_materias = sum(s["total_alumnos"] for s in materia_stats)
    total_notas_global = sum(s["total_notas"] for s in materia_stats)
    suma_ponderada = sum(s["promedio_grupo"] * s["total_notas"] for s in materia_stats)
    total_aprobados = sum(s["aprobados"] for s in materia_stats)
    total_en_riesgo = sum(s["en_riesgo"] for s in materia_stats)

    # Attendance % global
    asis_global = {"total": 0, "pres": 0}
    if oferta_ids:
        row = db.query(
            func.count(A.id).label("total"),
            func.sum(case((A.presente, 1), else_=0)).label("pres"),
        ).filter(A.oferta_materia_id.in_(oferta_ids)).first()
        asis_global = {"total": row.total or 0, "pres": row.pres or 0}

    global_asistencia_pct = round(
        (asis_global["pres"] / asis_global["total"] * 100) if asis_global["total"] > 0 else 0, 1
    )

    kpis = {
        "promedio_general": round(suma_ponderada / total_notas_global, 1) if total_notas_global > 0 else 0,
        "aprobacion_pct": round(total_aprobados / (total_aprobados + total_en_riesgo) * 100) if (total_aprobados + total_en_riesgo) > 0 else 0,
        "asistencia_pct": global_asistencia_pct,
        "alumnos_activos": total_alumnos_en_materias,
    }

    # ─── 5) Critical risk alerts (top 5 students with highest absence % and low avg) ───
    # Get students enrolled in active materias
    alumno_ids = set()
    if oferta_ids:
        for r in db.query(I.alumno_id).filter(I.oferta_materia_id.in_(oferta_ids)).distinct().all():
            alumno_ids.add(r[0])

    alertas = []
    if alumno_ids:
        # Attendance per student
        asis_por_alumno = {}
        for r in db.query(
            A.user_id,
            func.count(A.id).label("total"),
            func.sum(case((A.presente, 1), else_=0)).label("pres"),
        ).filter(A.user_id.in_(list(alumno_ids)), A.oferta_materia_id.in_(oferta_ids))\
         .group_by(A.user_id).all():
            total = r.total or 0
            pres = r.pres or 0
            asis_por_alumno[r.user_id] = {"total": total, "pres": pres}

        # Average per student across all active materias
        prom_por_alumno = {}
        if oferta_ids:
            for r in db.query(P.user_id, func.avg(P.valor).label("prom"))\
                .filter(P.user_id.in_(list(alumno_ids)), P.oferta_materia_id.in_(oferta_ids))\
                .group_by(P.user_id).all():
                prom_por_alumno[r.user_id] = round(float(r.prom), 1) if r.prom else None

        # Build alerts
        raw = []
        for uid in alumno_ids:
            c = asis_por_alumno.get(uid)
            if not c or c["total"] == 0:
                continue
            inas_pct = round((1 - c["pres"] / c["total"]) * 100)
            if inas_pct < 10:
                continue
            raw.append({
                "user_id": uid,
                "inasistencia_pct": inas_pct,
                "promedio": prom_por_alumno.get(uid),
            })

        raw.sort(key=lambda x: -x["inasistencia_pct"])
        # Get names for top 5
        top5 = raw[:5]
        if top5:
            names = dict(db.query(U.id, U.nombre).filter(U.id.in_([r["user_id"] for r in top5])).all())
            for r in top5:
                alertas.append({
                    "user_id": r["user_id"],
                    "nombre": names.get(r["user_id"], f"Alumno #{r['user_id']}"),
                    "inasistencia_pct": r["inasistencia_pct"],
                    "promedio": r["promedio"],
                })

    return {
        "kpis": kpis,
        "materias": materia_stats,
        "asistencia_por_materia": asistencia_materias,
        "alertas": alertas,
    }


@router.get("/becados", response_model=list[schemas.user.UserOut])
def becados(
    db: Session = Depends(database.get_db),
    _=Depends(get_admin_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return (
        db.query(models.user.User)
        .filter(models.user.User.es_becado)
        .offset(skip).limit(limit)
        .all()
    )


# ─── Exportación RUE-ES (MEC) ────────────────────────────────────────────────

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


@router.get("/asistencia-por-materia")
def asistencia_por_materia(
    db: Session = Depends(database.get_db),
    _=Depends(get_admin_user),
):
    M = models.materia.Materia
    A = models.asistencia.Asistencia
    O = models.oferta_materia.OfertaMateria

    materias = db.query(M).all()
    mat_ids = [m.id for m in materias]
    ofertas = dict(
        db.query(O.materia_id, O.id)
        .filter(O.materia_id.in_(mat_ids), O.activa)
        .all()
    )
    oferta_ids = list(ofertas.values())
    id_a_nombre = {m.id: m.nombre for m in materias}
    oferta_a_materia = {v: k for k, v in ofertas.items()}

    aggr = {}
    if oferta_ids:
        for r in db.query(
            A.oferta_materia_id,
            func.count(A.id).label("total"),
            func.sum(case((A.presente, 1), else_=0)).label("pres"),
        ).filter(A.oferta_materia_id.in_(oferta_ids))\
         .group_by(A.oferta_materia_id).all():
            aggr[r.oferta_materia_id] = {"total": r.total or 0, "pres": r.pres or 0}

    result = []
    for m in materias:
        oid = ofertas.get(m.id)
        c = aggr.get(oid, {"total": 0, "pres": 0}) if oid else {"total": 0, "pres": 0}
        pct = round((c["pres"] / c["total"] * 100) if c["total"] > 0 else 0)
        result.append({
            "materia_id": m.id,
            "materia": m.nombre,
            "total": c["total"],
            "presentes": c["pres"],
            "ausentes": c["total"] - c["pres"],
            "pct": pct,
        })
    return result


@router.get("/rue-es/matricula")
def exportar_matricula_rue_es(
    db: Session = Depends(database.get_db),
    _=Depends(get_admin_user),
):
    alumnos = (
        db.query(models.user.User)
        .options(joinedload(models.user.User.carrera))
        .filter(models.user.User.role == "alumno")
        .order_by(models.user.User.id)
        .all()
    )
    header = ["cedula", "apellidos_nombres", "carrera", "codigo_mec_carrera",
              "anio_ingreso", "condicion_beca", "estado"]
    rows = []
    for a in alumnos:
        rows.append([
            a.cedula or "",
            a.nombre or a.username,
            a.carrera.nombre if a.carrera else "",
            "",
            a.created_at.year if a.created_at else "",
            "BECADO" if a.es_becado else "NO_BECADO",
            "ACTIVO",
        ])
    return _csv_response("rue_es_matricula.csv", header, rows)


@router.get("/rue-es/trayecto-academico")
def exportar_trayecto_academico_rue_es(
    db: Session = Depends(database.get_db),
    _=Depends(get_admin_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(5000, ge=1, le=50000),
):
    inscripciones = (
        db.query(models.inscripcion.Inscripcion)
        .options(
            joinedload(models.inscripcion.Inscripcion.alumno),
            joinedload(models.inscripcion.Inscripcion.oferta)
            .joinedload(models.oferta_materia.OfertaMateria.materia),
        )
        .offset(skip).limit(limit)
        .all()
    )
    if not inscripciones:
        header = ["cedula", "apellidos_nombres", "carrera", "materia", "periodo",
                  "nota_final", "estado_materia", "porcentaje_asistencia"]
        return _csv_response("rue_es_trayecto_academico.csv", header, [])

    # Pre-cache carreras
    alumno_ids = list({i.alumno_id for i in inscripciones})
    carreras_cache = {}
    if alumno_ids:
        for uid, cid, cnombre in (
            db.query(models.user.User.id, models.user.User.carrera_id, models.carrera.Carrera.nombre)
            .join(models.carrera.Carrera, models.user.User.carrera_id == models.carrera.Carrera.id, isouter=True)
            .filter(models.user.User.id.in_(alumno_ids))
            .all()
        ):
            carreras_cache[uid] = cnombre

    # Pre-cache puntajes per (user_id, oferta_materia_id)
    oferta_ids = list({i.oferta_materia_id for i in inscripciones})
    punt_map = {}
    if alumno_ids and oferta_ids:
        for p in (
            db.query(models.puntaje.Puntaje)
            .filter(
                models.puntaje.Puntaje.user_id.in_(alumno_ids),
                models.puntaje.Puntaje.oferta_materia_id.in_(oferta_ids),
            )
            .all()
        ):
            punt_map.setdefault((p.user_id, p.oferta_materia_id), []).append(p)

    # Pre-cache attendance counts per (user_id, oferta_materia_id)
    asis_total = {}
    asis_pres = {}
    if alumno_ids and oferta_ids:
        for r in (
            db.query(
                models.asistencia.Asistencia.user_id,
                models.asistencia.Asistencia.oferta_materia_id,
                func.count(models.asistencia.Asistencia.id).label("total"),
                func.sum(case((models.asistencia.Asistencia.presente, 1), else_=0)).label("pres"),
            )
            .filter(
                models.asistencia.Asistencia.user_id.in_(alumno_ids),
                models.asistencia.Asistencia.oferta_materia_id.in_(oferta_ids),
            )
            .group_by(
                models.asistencia.Asistencia.user_id,
                models.asistencia.Asistencia.oferta_materia_id,
            )
            .all()
        ):
            asis_total[(r.user_id, r.oferta_materia_id)] = r.total
            asis_pres[(r.user_id, r.oferta_materia_id)] = r.pres

    header = ["cedula", "apellidos_nombres", "carrera", "materia", "periodo",
              "nota_final", "estado_materia", "porcentaje_asistencia"]
    rows = []
    for ins in inscripciones:
        alumno = ins.alumno
        oferta = ins.oferta
        if not alumno or not oferta or not oferta.materia:
            continue

        notas = {p.tipo: float(p.valor) for p in punt_map.get((alumno.id, oferta.id), []) if p.tipo in PESOS}
        promedio = calcular_promedio_final({k: notas.get(k) for k in PESOS})
        if promedio is None:
            estado = "CURSANDO"
        elif promedio >= 6:
            estado = "APROBADO"
        else:
            estado = "REPROBADO"

        key = (alumno.id, oferta.id)
        tot = asis_total.get(key, 0)
        pres = asis_pres.get(key, 0)
        pct = round((pres / tot) * 100, 1) if tot > 0 else ""

        rows.append([
            alumno.cedula or "",
            alumno.nombre or alumno.username,
            carreras_cache.get(alumno.id, ""),
            oferta.materia.nombre,
            oferta.periodo,
            promedio if promedio is not None else "",
            estado,
            pct,
        ])
    return _csv_response("rue_es_trayecto_academico.csv", header, rows)
