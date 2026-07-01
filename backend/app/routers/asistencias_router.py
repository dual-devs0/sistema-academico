import os
import io
import base64
import qrcode
from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app import models, schemas, database
from app.dependencias import get_current_user
from jose import jwt, JWTError
from pydantic import BaseModel

QR_SECRET     = os.getenv("QR_SECRET", "QR_SECRET_DISTINTO_AL_JWT_PRINCIPAL")
QR_ALGORITHM  = "HS256"
QR_EXPIRE_MIN = 15
FRONTEND_URL  = os.getenv("FRONTEND_URL", "http://localhost:5173")

class ScanRequest(BaseModel):
    token: str

router = APIRouter(prefix="/asistencias", tags=["asistencias"])

@router.post("/", response_model=schemas.asistencia.AsistenciaOut)
def create_asistencia(asistencia: schemas.asistencia.AsistenciaCreate, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    new_asistencia = models.asistencia.Asistencia(
        user_id=asistencia.user_id,
        materia_id=asistencia.materia_id,
        fecha=asistencia.fecha,
        presente=asistencia.presente,
        es_becado=asistencia.es_becado
    )
    db.add(new_asistencia)
    db.commit()
    db.refresh(new_asistencia)
    return new_asistencia

@router.get("/")
def list_asistencias(
    materia_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    fecha: Optional[date] = Query(None),
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(models.asistencia.Asistencia)
    if materia_id is not None:
        query = query.filter(models.asistencia.Asistencia.materia_id == materia_id)
    if user_id is not None:
        query = query.filter(models.asistencia.Asistencia.user_id == user_id)
    if fecha is not None:
        query = query.filter(models.asistencia.Asistencia.fecha == fecha)
    rows = query.all()
    result = []
    for a in rows:
        materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == a.materia_id).first()
        result.append({
            "id": a.id,
            "user_id": a.user_id,
            "materia_id": a.materia_id,
            "materia_nombre": materia.nombre if materia else None,
            "fecha": a.fecha,
            "presente": a.presente,
            "es_becado": a.es_becado,
        })
    return result

@router.put("/{asistencia_id}", response_model=schemas.asistencia.AsistenciaOut)
def update_asistencia(asistencia_id: int, asistencia: schemas.asistencia.AsistenciaCreate, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    existing = db.query(models.asistencia.Asistencia).filter(models.asistencia.Asistencia.id == asistencia_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Asistencia no encontrada")
    for key, value in asistencia.model_dump().items():
        setattr(existing, key, value)
    db.commit()
    db.refresh(existing)
    return existing

@router.delete("/{asistencia_id}")
def delete_asistencia(asistencia_id: int, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    existing = db.query(models.asistencia.Asistencia).filter(models.asistencia.Asistencia.id == asistencia_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Asistencia no encontrada")
    db.delete(existing)
    db.commit()
    return {"detail": "Asistencia eliminada"}

@router.get("/{materia_id}/resumen")
def resumen_asistencia(materia_id: int, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    total = db.query(models.asistencia.Asistencia).filter(
        models.asistencia.Asistencia.materia_id == materia_id
    ).count()
    presentes = db.query(models.asistencia.Asistencia).filter(
        models.asistencia.Asistencia.materia_id == materia_id,
        models.asistencia.Asistencia.presente == True
    ).count()
    if total == 0:
        return {"porcentaje": 0}
    return {"porcentaje": round((presentes / total) * 100, 2)}

@router.get("/qr/{materia_id}")
def generate_qr(materia_id: int, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="Sin permisos para generar QR")

    materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")

    now = datetime.utcnow()
    expire = now + timedelta(minutes=QR_EXPIRE_MIN)
    token_payload = {
        "materia_id": materia_id,
        "fecha": str(date.today()),
        "type": "asistencia_qr",
        "exp": expire,
        "iat": now,
    }
    token = jwt.encode(token_payload, QR_SECRET, algorithm=QR_ALGORITHM)

    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=4)
    scan_url = f"{FRONTEND_URL}/asistencia/scan?token={token}"
    qr.add_data(scan_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0b0f14", back_color="#ffffff")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    return {
        "qr_base64": b64,
        "token": token,
        "scan_url": scan_url,
        "expira_en": QR_EXPIRE_MIN * 60,
        "materia": {
            "id": materia.id,
            "nombre": materia.nombre,
        },
        "fecha": str(date.today()),
    }

@router.post("/scan")
def scan_qr(req: ScanRequest, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    if current_user["role"] != "alumno":
        raise HTTPException(status_code=403, detail="Solo alumnos pueden registrar asistencia por QR")

    try:
        payload = jwt.decode(req.token, QR_SECRET, algorithms=[QR_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token QR inválido o expirado")

    if payload.get("type") != "asistencia_qr":
        raise HTTPException(status_code=400, detail="Token QR inválido")

    materia_id = payload["materia_id"]
    fecha_str  = payload.get("fecha", str(date.today()))
    hoy        = date.fromisoformat(fecha_str)
    alumno_id  = current_user["user_id"]

    existing = db.query(models.asistencia.Asistencia).filter(
        models.asistencia.Asistencia.user_id    == alumno_id,
        models.asistencia.Asistencia.materia_id == materia_id,
        models.asistencia.Asistencia.fecha      == hoy,
    ).first()

    if existing:
        if existing.presente:
            raise HTTPException(status_code=409, detail="Ya registraste tu asistencia hoy")
        existing.presente = True
        db.commit()
        return {"detail": "Asistencia actualizada a presente"}

    materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == materia_id).first()
    alumno  = db.query(models.user.User).filter(models.user.User.id == alumno_id).first()

    nueva = models.asistencia.Asistencia(
        user_id=alumno_id, materia_id=materia_id, fecha=hoy, presente=True,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)

    return {
        "mensaje": "Asistencia registrada",
        "materia": materia.nombre if materia else "—",
        "fecha": fecha_str,
        "alumno": f"{alumno.nombre}" if alumno else "—",
    }

@router.get("/profesor/carreras")
def profesor_carreras(db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    if current_user["role"] != "profesor":
        raise HTTPException(status_code=403)
    materias = db.query(models.materia.Materia).filter(
        models.materia.Materia.profesor_id == current_user["user_id"]
    ).all()
    carrera_ids = set(m.carrera_id for m in materias if m.carrera_id)
    carreras = db.query(models.carrera.Carrera).filter(models.carrera.Carrera.id.in_(carrera_ids)).all()
    return [{"id": c.id, "nombre": c.nombre} for c in carreras]

@router.get("/profesor/materias")
def profesor_materias(carrera_id: int = Query(...), db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    if current_user["role"] != "profesor":
        raise HTTPException(status_code=403)
    materias = db.query(models.materia.Materia).filter(
        models.materia.Materia.profesor_id == current_user["user_id"],
        models.materia.Materia.carrera_id == carrera_id,
    ).all()
    return [{"id": m.id, "nombre": m.nombre, "codigo": f"MAT{m.id:03d}"} for m in materias]

@router.get("/profesor/alumnos")
def profesor_alumnos(
    materia_id: int = Query(...),
    fecha: Optional[date] = Query(None),
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] != "profesor":
        raise HTTPException(status_code=403)
    materia = db.query(models.materia.Materia).filter(
        models.materia.Materia.id == materia_id,
        models.materia.Materia.profesor_id == current_user["user_id"],
    ).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")

    hoy = fecha or date.today()
    inscripciones = db.query(models.inscripcion.Inscripcion).filter(
        models.inscripcion.Inscripcion.materia_id == materia_id,
    ).all()

    alumnos = []
    for ins in inscripciones:
        alumno = ins.alumno
        asist = db.query(models.asistencia.Asistencia).filter(
            models.asistencia.Asistencia.user_id == alumno.id,
            models.asistencia.Asistencia.materia_id == materia_id,
            models.asistencia.Asistencia.fecha == hoy,
        ).first()
        alumnos.append({
            "id": alumno.id,
            "nombre": alumno.nombre or alumno.username,
            "documento": alumno.username,
            "asistencia_id": asist.id if asist else None,
            "presente": asist.presente if asist else None,
            "es_becado": alumno.es_becado,
            "motivo": asist.motivo if asist else None,
        })

    return {"fecha": str(hoy), "materia": materia.nombre, "alumnos": alumnos}

@router.put("/profesor/toggle/{asistencia_id}")
def toggle_asistencia(
    asistencia_id: int,
    presente: bool = Query(...),
    motivo: str = Query(None),
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] != "profesor":
        raise HTTPException(status_code=403)
    asist = db.query(models.asistencia.Asistencia).filter(models.asistencia.Asistencia.id == asistencia_id).first()
    if not asist:
        raise HTTPException(status_code=404, detail="Asistencia no encontrada")
    asist.presente = presente
    if not presente and motivo:
        asist.motivo = motivo
    elif presente:
        asist.motivo = None
    db.commit()
    return {"detail": "Actualizado", "presente": presente}

@router.post("/profesor/marcar")
def marcar_asistencia(
    materia_id: int = Query(...),
    alumno_id: int = Query(...),
    fecha: date = Query(...),
    presente: bool = Query(...),
    motivo: str = Query(None),
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] != "profesor":
        raise HTTPException(status_code=403)
    existing = db.query(models.asistencia.Asistencia).filter(
        models.asistencia.Asistencia.user_id == alumno_id,
        models.asistencia.Asistencia.materia_id == materia_id,
        models.asistencia.Asistencia.fecha == fecha,
    ).first()
    if existing:
        existing.presente = presente
        if not presente and motivo:
            existing.motivo = motivo
        elif presente:
            existing.motivo = None
        db.commit()
        return {"detail": "Actualizado", "asistencia_id": existing.id, "presente": presente}
    nueva = models.asistencia.Asistencia(
        user_id=alumno_id,
        materia_id=materia_id,
        fecha=fecha,
        presente=presente,
        motivo=motivo if not presente else None,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return {"detail": "Creado", "asistencia_id": nueva.id, "presente": presente}

# ─── Módulo 4.2 — Endpoints nuevos ────────────────────────────────────────────

def _verificar_titular_o_admin(materia_id: int, current_user: dict, db: Session) -> None:
    if current_user["role"] == "admin":
        return
    if current_user["role"] != "profesor":
        raise HTTPException(status_code=403, detail="Solo profesores y administradores pueden registrar asistencia")
    materia = db.query(models.materia.Materia).filter(
        models.materia.Materia.id == materia_id
    ).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    if materia.profesor_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="No eres el profesor titular de esta materia")

@router.post("/lote", response_model=schemas.asistencia.AsistenciaLoteResponse, summary="Registrar asistencia de toda una clase en un único request")
def registrar_lote(payload: schemas.asistencia.AsistenciaLote, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    _verificar_titular_o_admin(payload.materia_id, current_user, db)
    materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == payload.materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    ids_solicitados = [r.user_id for r in payload.registros]
    alumnos_map: dict[int, models.user.User] = {
        u.id: u for u in db.query(models.user.User).filter(models.user.User.id.in_(ids_solicitados)).all()
    }
    inscripciones = db.query(models.inscripcion.Inscripcion.alumno_id).filter(
        models.inscripcion.Inscripcion.materia_id == payload.materia_id,
        models.inscripcion.Inscripcion.alumno_id.in_(ids_solicitados),
    ).all()
    ids_inscriptos = {row.alumno_id for row in inscripciones}
    ids_no_inscriptos = set(ids_solicitados) - ids_inscriptos
    if ids_no_inscriptos:
        raise HTTPException(status_code=400, detail=f"Los siguientes alumnos no están matriculados en esta materia: {sorted(ids_no_inscriptos)}")
    existentes_map: dict[int, models.asistencia.Asistencia] = {
        a.user_id: a for a in db.query(models.asistencia.Asistencia).filter(
            models.asistencia.Asistencia.materia_id == payload.materia_id,
            models.asistencia.Asistencia.fecha == payload.fecha,
            models.asistencia.Asistencia.user_id.in_(ids_solicitados),
        ).all()
    }
    creados = 0
    actualizados = 0
    for registro in payload.registros:
        alumno = alumnos_map.get(registro.user_id)
        if not alumno:
            raise HTTPException(status_code=404, detail=f"Alumno con id {registro.user_id} no encontrado")
        es_becado_snapshot = bool(alumno.es_becado)
        if registro.user_id in existentes_map:
            existente = existentes_map[registro.user_id]
            existente.presente = registro.presente
            existente.es_becado = es_becado_snapshot
            actualizados += 1
        else:
            nueva = models.asistencia.Asistencia(
                user_id=registro.user_id, materia_id=payload.materia_id,
                fecha=payload.fecha, presente=registro.presente, es_becado=es_becado_snapshot,
            )
            db.add(nueva)
            creados += 1
    db.commit()
    return schemas.asistencia.AsistenciaLoteResponse(creados=creados, actualizados=actualizados, total=creados + actualizados)

@router.get("/materia/{materia_id}/alumnos", response_model=list[schemas.asistencia.AlumnoAsistenciaOut], summary="Obtener alumnos matriculados con su porcentaje de asistencia")
def alumnos_con_asistencia(materia_id: int, becado: Optional[bool] = Query(None, description="Filtrar por condición de beca"), db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    if current_user["role"] not in ("admin", "profesor"):
        inscripto = db.query(models.inscripcion.Inscripcion).filter(
            models.inscripcion.Inscripcion.materia_id == materia_id,
            models.inscripcion.Inscripcion.alumno_id == current_user["user_id"],
        ).first()
        if not inscripto:
            raise HTTPException(status_code=403, detail="No estás inscripto en esta materia")
    elif current_user["role"] == "profesor" and materia.profesor_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="No eres el profesor titular de esta materia")
    inscripciones = db.query(models.inscripcion.Inscripcion).filter(models.inscripcion.Inscripcion.materia_id == materia_id).all()
    alumno_ids = [i.alumno_id for i in inscripciones]
    query_alumnos = db.query(models.user.User).filter(models.user.User.id.in_(alumno_ids))
    if becado is not None:
        query_alumnos = query_alumnos.filter(models.user.User.es_becado == becado)
    alumnos = query_alumnos.all()
    total_clases = db.query(func.count(func.distinct(models.asistencia.Asistencia.fecha))).filter(models.asistencia.Asistencia.materia_id == materia_id).scalar() or 0
    presencias_rows = db.query(
        models.asistencia.Asistencia.user_id, func.count(models.asistencia.Asistencia.id).label("presentes"),
    ).filter(
        models.asistencia.Asistencia.materia_id == materia_id,
        models.asistencia.Asistencia.presente == True,
        models.asistencia.Asistencia.user_id.in_(alumno_ids),
    ).group_by(models.asistencia.Asistencia.user_id).all()
    presencias_map: dict[int, int] = {row.user_id: row.presentes for row in presencias_rows}
    resultado = []
    for alumno in alumnos:
        presentes = presencias_map.get(alumno.id, 0)
        porcentaje = round((presentes / total_clases) * 100, 2) if total_clases > 0 else 0.0
        resultado.append(schemas.asistencia.AlumnoAsistenciaOut(
            user_id=alumno.id, nombre=alumno.nombre, username=alumno.username,
            es_becado=bool(alumno.es_becado), materia_id=materia_id,
            nombre_materia=materia.nombre, total_clases=total_clases,
            presentes=presentes, porcentaje=porcentaje,
        ))
    return resultado

@router.get("/alumno/{user_id}/porcentaje", response_model=list[schemas.asistencia.PorcentajeGlobalOut], summary="Porcentaje de asistencia de un alumno en todas sus materias")
def porcentaje_asistencia_alumno(user_id: int, materia_id: Optional[int] = Query(None, description="Filtrar por materia específica"), db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    if current_user["role"] == "alumno" and current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Solo podés consultar tu propia asistencia")
    alumno = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
    if alumno.role != "alumno":
        raise HTTPException(status_code=400, detail="El usuario indicado no es un alumno")
    inscripciones_q = db.query(models.inscripcion.Inscripcion).filter(models.inscripcion.Inscripcion.alumno_id == user_id)
    if materia_id is not None:
        inscripciones_q = inscripciones_q.filter(models.inscripcion.Inscripcion.materia_id == materia_id)
    inscripciones = inscripciones_q.all()
    if not inscripciones:
        return []
    materia_ids = [i.materia_id for i in inscripciones]
    if current_user["role"] == "profesor":
        sus_materias = {m.id for m in db.query(models.materia.Materia).filter(
            models.materia.Materia.profesor_id == current_user["user_id"],
            models.materia.Materia.id.in_(materia_ids),
        ).all()}
        materia_ids = [mid for mid in materia_ids if mid in sus_materias]
        if not materia_ids:
            raise HTTPException(status_code=403, detail="Este alumno no está matriculado en ninguna de tus materias")
    materias_map: dict[int, models.materia.Materia] = {m.id: m for m in db.query(models.materia.Materia).filter(models.materia.Materia.id.in_(materia_ids)).all()}
    resultado = []
    for mid in materia_ids:
        materia = materias_map.get(mid)
        if not materia: continue
        total_clases = db.query(func.count(func.distinct(models.asistencia.Asistencia.fecha))).filter(models.asistencia.Asistencia.materia_id == mid).scalar() or 0
        presentes = db.query(func.count(models.asistencia.Asistencia.id)).filter(
            models.asistencia.Asistencia.materia_id == mid,
            models.asistencia.Asistencia.user_id == user_id,
            models.asistencia.Asistencia.presente == True,
        ).scalar() or 0
        porcentaje = round((presentes / total_clases) * 100, 2) if total_clases > 0 else 0.0
        resultado.append(schemas.asistencia.PorcentajeGlobalOut(
            materia_id=mid, nombre_materia=materia.nombre, total_clases=total_clases,
            presentes=presentes, porcentaje=porcentaje,
        ))
    return resultado
