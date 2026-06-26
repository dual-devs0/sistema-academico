from fastapi import APIRouter

router = APIRouter(prefix="/test", tags=["test"])

@router.get("/")
def test_endpoint():
    return {"msg": "Funciona el router"}
