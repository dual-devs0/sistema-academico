"""Seed piloto Fase 2 (pensum/correlatividades).

Conecta EXPLICITAMENTE a TEST_DATABASE_URL. Nunca usa DATABASE_URL.
Idempotente: si los datos ya existen, no falla ni duplica.
"""

import sys
import io

if isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout.reconfigure(encoding="utf-8")

import os  # noqa: E402
import unicodedata  # noqa: E402

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))  # noqa: E402

from dotenv import load_dotenv  # noqa: E402


def normalizar(s: str) -> str:
    """Compara nombres ignorando acentos/mayusculas (evita duplicados como
    'Ing. Informatica' vs 'Ing. Informática')."""
    return (
        unicodedata.normalize("NFKD", s)
        .encode("ascii", "ignore")
        .decode()
        .strip()
        .lower()
    )


load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.test"))

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
if not TEST_DATABASE_URL:
    raise SystemExit("TEST_DATABASE_URL no configurada en .env.test")

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.models.carrera import Carrera  # noqa: E402
from app.models.materia import Materia  # noqa: E402
from app.models.pensum_materia import PensumMateria  # noqa: E402
from app.models.correlatividad import Correlatividad  # noqa: E402
from app.models.users import User  # noqa: E402
from app.security import hash_password  # noqa: E402

url = TEST_DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
engine = create_engine(url)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

print("\n=== SEED PILOTO — Pensum y Correlatividades (neondb_test) ===\n")

# 1. Carrera
target_carrera = normalizar("Ing. Informatica")
carrera = next(
    (c for c in db.query(Carrera).all() if normalizar(str(c.nombre)) == target_carrera), None
)
if not carrera:
    carrera = Carrera(
        nombre="Ing. Informatica", duracion_semestres=10, creditos_totales=240
    )
    db.add(carrera)
    db.flush()
    print(f"  + Carrera creada: {carrera.nombre} (id={carrera.id})")
else:
    print(f"  = Carrera ya existe: {carrera.nombre} (id={carrera.id})")

# 2. Materias reales
materias_data = ["Analisis Matematico I", "Fisica I", "Programacion I"]
materias_carrera = db.query(Materia).filter(Materia.carrera_id == carrera.id).all()
materias = {}
for nombre in materias_data:
    target = normalizar(nombre)
    m = next((x for x in materias_carrera if normalizar(str(x.nombre)) == target), None)
    if not m:
        m = Materia(
            nombre=nombre, carrera_id=carrera.id, anio=1, semestre=1, creditos=4
        )
        db.add(m)
        db.flush()
        materias_carrera.append(m)
        print(f"  + Materia creada: {nombre} (id={m.id})")
    else:
        print(f"  = Materia ya existe: {m.nombre} (id={m.id})")
    materias[nombre] = m

analisis = materias["Analisis Matematico I"]
fisica = materias["Fisica I"]
programacion = materias["Programacion I"]

# 3. pensum_materias — las 3 en semestre 1, creditos=4
for m in (analisis, fisica, programacion):
    pm = (
        db.query(PensumMateria)
        .filter(
            PensumMateria.carrera_id == carrera.id,
            PensumMateria.materia_id == m.id,
        )
        .first()
    )
    if not pm:
        pm = PensumMateria(
            carrera_id=carrera.id,
            materia_id=m.id,
            semestre=1,
            creditos=4,
            es_electiva=False,
        )
        db.add(pm)
        db.flush()
        print(
            f"  + PensumMateria creada: {m.nombre} -> semestre 1, creditos=4 (id={pm.id})"  # noqa: E501
        )
    else:
        print(f"  = PensumMateria ya existe: {m.nombre} (id={pm.id})")

# 4. correlatividad: Fisica I exige aprobada Analisis Matematico I
corr = (
    db.query(Correlatividad)
    .filter(
        Correlatividad.materia_id == fisica.id,
        Correlatividad.prerrequisito_id == analisis.id,
        Correlatividad.tipo == "aprobada",
    )
    .first()
)
if not corr:
    corr = Correlatividad(
        materia_id=fisica.id, prerrequisito_id=analisis.id, tipo="aprobada"
    )
    db.add(corr)
    db.flush()
    print(
        f"  + Correlatividad creada: Fisica I (id={fisica.id}) exige aprobada Analisis Matematico I (id={analisis.id})"  # noqa: E501
    )
else:
    print("  = Correlatividad ya existe: Fisica I exige aprobada Analisis Matematico I")

# 5. Alumno piloto sin historial: Maria Gonzalez
maria = db.query(User).filter(User.username == "12345678").first()
if not maria:
    maria = User(
        username="12345678",
        hashed_password=hash_password("Alumno1234!"),
        role="alumno",
        nombre="Maria Gonzalez",
        email="maria@uca.edu.py",
        carrera_id=carrera.id,
        es_becado=True,
    )
    db.add(maria)
    db.flush()
    print(f"  + Alumno creado: {maria.nombre} (id={maria.id})")
else:
    print(f"  = Alumno ya existe: {maria.nombre} (id={maria.id})")

db.commit()

print("\n--- IDs para verificacion ---")
print(
    f"carrera_id={carrera.id}  analisis_id={analisis.id}  fisica_id={fisica.id}  programacion_id={programacion.id}  maria_id={maria.id}"  # noqa: E501
)

db.close()
print("\n=== Seed piloto terminado ===")
