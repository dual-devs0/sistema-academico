from fastapi import APIRouter, Depends
from app.dependencias import get_current_user

router = APIRouter(prefix="/test", tags=["test"])

@router.get("/")
def test_endpoint():
    return {"msg": "API funcionando"}

@router.get("/auth")
def test_auth(current_user = Depends(get_current_user)):
    return {
        "msg": "Autenticación OK",
        "user": current_user["username"],
        "role": current_user["role"]
    }
