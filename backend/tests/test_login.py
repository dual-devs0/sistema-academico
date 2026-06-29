import pytest
from app.models.users import User
from app.security import verify_password

def test_login_seed_user(db):
    # Crear un usuario de prueba en la base de datos
    user = User(
        username="admin@uca.edu.py",
        hashed_password="$2b$12$....",  # pon aquí un hash válido
        role="admin",
        nombre="Admin Test",
        email="admin@uca.edu.py"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Consultar el usuario
    found = db.query(User).filter(User.username == "admin@uca.edu.py").first()
    assert found is not None
    assert found.role == "admin"

    # Verificar contraseña
    assert verify_password("Admin1234!", found.hashed_password)
