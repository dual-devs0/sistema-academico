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
