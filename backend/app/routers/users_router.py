from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.security import hash_password
from app.dependencias import require_role

router = APIRouter(prefix="/users", tags=["users"])

@router.post(
    "/",
    response_model=schemas.user.UserOut,
    responses={
        403: {"description": "No autorizado"},
        400: {"description": "Error de validación"}
    }
)
def create_user(
    user: schemas.user.UserCreate,
    db: Session = Depends(database.SessionLocal),
    current_user = Depends(require_role("admin"))
):
    new_user = models.user.User(
        username=user.username,
        hashed_password=hash_password(user.password),
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get(
    "/",
    response_model=list[schemas.user.UserOut],
    responses={
        403: {"description": "No autorizado"}
    }
)

#@router.get("/", response_model=list[schemas.user.UserOut])
def list_users(
    db: Session = Depends(database.SessionLocal),
    current_user = Depends(require_role("admin"))
):
    return db.query(models.user.User).all()
