from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from app import models, schemas, database
from app.dependencias import get_current_user

router = APIRouter(prefix="/puntajes", tags=["puntajes"])


def _puntaje_dict(p, materia_nombre) -> dict:
    return {
        "id": p.id,
        "user_id": p.user_id,
        "materia_id": p.materia_id,
        "tipo": p.tipo,
        "valor": float(p.valor),
        "editado_por": p.editado_por,
        "editado_en": p.editado_en,
        "materia_nombre": materia_nombre,
    }


@router.post("/", response_model=schemas.puntaje.PuntajeOut)
def create_puntaje(puntaje: schemas.puntaje.PuntajeCreate, background_tasks: BackgroundTasks, db: Session = Depends(database.get_db), current_user=Depends(get_current_user)):
    from app.email_utils import send_new_grade_email_bg

    user = db.query(models.user.User).filter(models.user.User.username == current_user["username"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    new_puntaje = models.puntaje.Puntaje(
        user_id=puntaje.user_id,
        materia_id=puntaje.materia_id,
        tipo=puntaje.tipo,
        valor=puntaje.valor,
        editado_por=user.id
    )
    db.add(new_puntaje)
    db.commit()
    db.refresh(new_puntaje)

    target_user = db.query(models.user.User).filter(models.user.User.id == puntaje.user_id).first()
    materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == puntaje.materia_id).first()

    if target_user and target_user.email and materia:
        try:
            send_new_grade_email_bg(background_tasks, target_user.email, target_user.nombre or target_user.username, materia.nombre, puntaje.tipo, puntaje.valor)
        except Exception as e:
            print("Error sending new grade email:", e)

    return _puntaje_dict(new_puntaje, materia.nombre if materia else None)


@router.get("/")
def list_puntajes(
    user_id: Optional[int] = Query(None),
    materia_id: Optional[int] = Query(None),
    tipo: Optional[str] = Query(None),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    from sqlalchemy.orm import aliased
    MateriaAlias = aliased(models.materia.Materia)
    query = (
        db.query(models.puntaje.Puntaje, MateriaAlias.nombre.label("mat_nombre"))
        .outerjoin(MateriaAlias, models.puntaje.Puntaje.materia_id == MateriaAlias.id)
    )
    if current_user["role"] == "alumno":
        query = query.filter(models.puntaje.Puntaje.user_id == current_user["user_id"])
    else:
        if user_id is not None:
            query = query.filter(models.puntaje.Puntaje.user_id == user_id)
    if materia_id is not None:
        query = query.filter(models.puntaje.Puntaje.materia_id == materia_id)
    if tipo is not None:
        query = query.filter(models.puntaje.Puntaje.tipo == tipo)
    return [_puntaje_dict(p, mat_nombre) for p, mat_nombre in query.all()]


@router.put("/{puntaje_id}", response_model=schemas.puntaje.PuntajeOut)
def update_puntaje(puntaje_id: int, puntaje: schemas.puntaje.PuntajeCreate, db: Session = Depends(database.get_db), current_user=Depends(get_current_user)):
    user = db.query(models.user.User).filter(models.user.User.username == current_user["username"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    existing = db.query(models.puntaje.Puntaje).filter(models.puntaje.Puntaje.id == puntaje_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Puntaje no encontrado")
    for key, value in puntaje.model_dump().items():
        setattr(existing, key, value)
    existing.editado_por = user.id
    db.commit()
    db.refresh(existing)
    materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == existing.materia_id).first()
    return _puntaje_dict(existing, materia.nombre if materia else None)


@router.delete("/{puntaje_id}")
def delete_puntaje(puntaje_id: int, db: Session = Depends(database.get_db), current_user=Depends(get_current_user)):
    existing = db.query(models.puntaje.Puntaje).filter(models.puntaje.Puntaje.id == puntaje_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Puntaje no encontrado")
    db.delete(existing)
    db.commit()
    return {"detail": "Puntaje eliminado"}


@router.get("/{user_id}/promedio")
def promedio_puntajes(user_id: int, db: Session = Depends(database.get_db), current_user=Depends(get_current_user)):
    if current_user["role"] != "admin" and current_user["username"] != str(user_id):
        raise HTTPException(status_code=403, detail="No autorizado")
    puntajes = db.query(models.puntaje.Puntaje).filter(models.puntaje.Puntaje.user_id == user_id).all()
    if not puntajes:
        return {"promedio": 0}
    total = sum(float(p.valor) for p in puntajes)
    return {"promedio": round(total / len(puntajes), 2)}
