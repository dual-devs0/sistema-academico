import sys
from io import TextIOWrapper

if isinstance(sys.stdout, TextIOWrapper):
    sys.stdout.reconfigure(encoding="utf-8")

from app.database import engine, SessionLocal, Base  # noqa: E402
from app.models.users import User  # noqa: E402
from app.models.carrera import Carrera  # noqa: E402
from app.models.materia import Materia  # noqa: E402
from app.security import hash_password  # noqa: E402

Base.metadata.create_all(bind=engine)

db = SessionLocal()

# ── Carreras ──
carreras_data = ["Ing. Informática", "Ing. Civil", "Ing. Electrónica", "Administración"]
carreras = {}
for nombre in carreras_data:
    existe = db.query(Carrera).filter(Carrera.nombre == nombre).first()
    if not existe:
        c = Carrera(nombre=nombre)
        db.add(c)
        db.flush()
        carreras[nombre] = c
        print(f"  Carrera creada: {nombre}")
    else:
        carreras[nombre] = existe
        print(f"  Carrera ya existe: {nombre}")

# ── Usuarios ──
usuarios = [
    {
        "username": "admin@uca.edu.py",
        "password": "Admin1234!",
        "role": "admin",
        "nombre": "Admin UCA",
        "email": "admin@uca.edu.py",
        "carrera": None,
        "becado": False,
    },
    {
        "username": "12345678",
        "password": "Alumno1234!",
        "role": "alumno",
        "nombre": "María González",
        "email": "maria@uca.edu.py",
        "carrera": "Ing. Informática",
        "becado": True,
    },
    {
        "username": "prof@uca.edu.py",
        "password": "Profesor1234!",
        "role": "profesor",
        "nombre": "Carlos Méndez",
        "email": "carlos@uca.edu.py",
        "carrera": "Ing. Informática",
        "becado": False,
    },
]

users_map = {}
for u in usuarios:
    existe = db.query(User).filter(User.username == u["username"]).first()
    if not existe:
        user = User(
            username=u["username"],
            hashed_password=hash_password(u["password"]),
            role=u["role"],
            nombre=u["nombre"],
            email=u["email"],
            carrera_id=carreras[u["carrera"]].id if u["carrera"] else None,
            es_becado=u["becado"],
        )
        db.add(user)
        db.flush()
        users_map[u["username"]] = user
        print(f"  Usuario creado: {u['username']} ({u['role']})")
    else:
        users_map[u["username"]] = existe
        print(f"  Usuario ya existe: {u['username']}")

# ── Materias ──
materias_data = [
    {
        "nombre": "Análisis Matemático I",
        "profesor": "prof@uca.edu.py",
        "carrera": "Ing. Informática",
        "anio": 1,
        "semestre": 1,
    },
    {
        "nombre": "Física I",
        "profesor": "prof@uca.edu.py",
        "carrera": "Ing. Informática",
        "anio": 1,
        "semestre": 1,
    },
    {
        "nombre": "Programación I",
        "profesor": "prof@uca.edu.py",
        "carrera": "Ing. Informática",
        "anio": 1,
        "semestre": 1,
    },
]
for m in materias_data:
    existe = db.query(Materia).filter(Materia.nombre == m["nombre"]).first()
    if not existe:
        materia = Materia(
            nombre=m["nombre"],
            profesor_id=users_map[m["profesor"]].id,
            carrera_id=carreras[m["carrera"]].id,
            anio=m["anio"],
            semestre=m["semestre"],
        )
        db.add(materia)
        print(f"  Materia creada: {m['nombre']}")
    else:
        print(f"  Materia ya existe: {m['nombre']}")

db.commit()
db.close()
print("\nSeed completado.")
