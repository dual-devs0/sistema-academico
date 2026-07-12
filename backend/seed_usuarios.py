"""Seed mínimo: solo crea los 3 usuarios de prueba en PostgreSQL."""
import sys
from dotenv import load_dotenv
load_dotenv()

from app.database import engine, SessionLocal, Base
from app.models.users import User
from app.security import hash_password

USERS = [
    {"username": "admin@uca.edu.py", "password": "Admin1234!", "role": "admin",
     "nombre": "Admin UCA", "email": "admin@uca.edu.py", "ci": "0"},
    {"username": "12345678", "password": "Alumno1234!", "role": "alumno",
     "nombre": "Maria Gonzalez", "email": "maria@uca.edu.py", "ci": "12345678"},
    {"username": "prof@uca.edu.py", "password": "Profesor1234!", "role": "profesor",
     "nombre": "Carlos Mendez", "email": "carlos@uca.edu.py", "ci": "87654321"},
]

db = SessionLocal()
try:
    for u in USERS:
        existe = db.query(User).filter(User.username == u["username"]).first()
        if existe:
            print(f"  Ya existe: {u['username']}")
            continue
        user = User(
            username=u["username"],
            hashed_password=hash_password(u["password"]),
            role=u["role"],
            nombre=u["nombre"],
            email=u["email"],
            ci=u["ci"],
            activo=True,
        )
        db.add(user)
        db.commit()
        print(f"  Creado: {u['username']} ({u['role']})")
    print("\nSeed completado. Credenciales:")
    print("  Admin    → admin@uca.edu.py   / Admin1234!")
    print("  Alumno   → 12345678           / Alumno1234!")
    print("  Profesor → prof@uca.edu.py    / Profesor1234!")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
