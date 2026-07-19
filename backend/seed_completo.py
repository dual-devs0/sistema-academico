import sys

sys.stdout.reconfigure(encoding="utf-8")

from datetime import date, timedelta  # noqa: E402
from app.database import engine, SessionLocal, Base  # noqa: E402
from app.models.users import User  # noqa: E402
from app.models.carrera import Carrera  # noqa: E402
from app.models.materia import Materia  # noqa: E402
from app.models.inscripcion import Inscripcion  # noqa: E402
from app.models.puntaje import Puntaje  # noqa: E402
from app.models.asistencia import Asistencia  # noqa: E402
from app.models.evento_calendario import EventoCalendario  # noqa: E402
from app.models.apunte import Apunte  # noqa: E402
from app.security import hash_password  # noqa: E402

Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("\n=== SEED COMPLETO — Sistema Academico UCA ===\n")

# ─────────────────────────────────────────
# 1. CARRERAS
# ─────────────────────────────────────────
carreras_data = [
    "Ing. Informatica",
    "Ing. Civil",
    "Ing. Electronica",
    "Administracion",
]
carreras = {}
for nombre in carreras_data:
    obj = db.query(Carrera).filter(Carrera.nombre == nombre).first()
    if not obj:
        obj = Carrera(nombre=nombre)
        db.add(obj)
        db.flush()
        print(f"  + Carrera: {nombre}")
    carreras[nombre] = obj

# ─────────────────────────────────────────
# 2. USUARIOS
# ─────────────────────────────────────────
usuarios_data = [
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
        "username": "prof@uca.edu.py",
        "password": "Profesor1234!",
        "role": "profesor",
        "nombre": "Carlos Mendez",
        "email": "carlos@uca.edu.py",
        "carrera": "Ing. Informatica",
        "becado": False,
    },
    {
        "username": "prof2@uca.edu.py",
        "password": "Profesor1234!",
        "role": "profesor",
        "nombre": "Ana Torres",
        "email": "ana@uca.edu.py",
        "carrera": "Ing. Informatica",
        "becado": False,
    },
    {
        "username": "12345678",
        "password": "Alumno1234!",
        "role": "alumno",
        "nombre": "Maria Gonzalez",
        "email": "maria@uca.edu.py",
        "carrera": "Ing. Informatica",
        "becado": True,
    },
    {
        "username": "23456789",
        "password": "Alumno1234!",
        "role": "alumno",
        "nombre": "Juan Perez",
        "email": "juan@uca.edu.py",
        "carrera": "Ing. Informatica",
        "becado": False,
    },
    {
        "username": "34567890",
        "password": "Alumno1234!",
        "role": "alumno",
        "nombre": "Lucia Ramirez",
        "email": "lucia@uca.edu.py",
        "carrera": "Ing. Informatica",
        "becado": False,
    },
    {
        "username": "45678901",
        "password": "Alumno1234!",
        "role": "alumno",
        "nombre": "Diego Fernandez",
        "email": "diego@uca.edu.py",
        "carrera": "Ing. Informatica",
        "becado": True,
    },
    {
        "username": "56789012",
        "password": "Alumno1234!",
        "role": "alumno",
        "nombre": "Valentina Lopez",
        "email": "valentina@uca.edu.py",
        "carrera": "Ing. Informatica",
        "becado": False,
    },
]

users_map = {}
for u in usuarios_data:
    obj = db.query(User).filter(User.username == u["username"]).first()
    if not obj:
        obj = User(
            username=u["username"],
            hashed_password=hash_password(u["password"]),
            role=u["role"],
            nombre=u["nombre"],
            email=u["email"],
            carrera_id=carreras[u["carrera"]].id if u["carrera"] else None,
            es_becado=u["becado"],
        )
        db.add(obj)
        db.flush()
        print(f"  + Usuario: {u['nombre']} ({u['role']})")
    users_map[u["username"]] = obj

# ─────────────────────────────────────────
# 3. MATERIAS
# ─────────────────────────────────────────
materias_data = [
    {
        "nombre": "Analisis Matematico I",
        "prof": "prof@uca.edu.py",
        "carrera": "Ing. Informatica",
        "anio": 1,
        "semestre": 1,
    },
    {
        "nombre": "Fisica I",
        "prof": "prof2@uca.edu.py",
        "carrera": "Ing. Informatica",
        "anio": 1,
        "semestre": 1,
    },
    {
        "nombre": "Programacion I",
        "prof": "prof@uca.edu.py",
        "carrera": "Ing. Informatica",
        "anio": 1,
        "semestre": 1,
    },
    {
        "nombre": "Matematica Discreta",
        "prof": "prof2@uca.edu.py",
        "carrera": "Ing. Informatica",
        "anio": 1,
        "semestre": 1,
    },
    {
        "nombre": "Historia y Filosofia",
        "prof": "prof@uca.edu.py",
        "carrera": "Ing. Informatica",
        "anio": 1,
        "semestre": 1,
    },
]
materias_map = {}
for m in materias_data:
    obj = db.query(Materia).filter(Materia.nombre == m["nombre"]).first()
    if not obj:
        obj = Materia(
            nombre=m["nombre"],
            profesor_id=users_map[m["prof"]].id,
            carrera_id=carreras[m["carrera"]].id,
            anio=m["anio"],
            semestre=m["semestre"],
        )
        db.add(obj)
        db.flush()
        print(f"  + Materia: {m['nombre']}")
    materias_map[m["nombre"]] = obj

# ─────────────────────────────────────────
# 4. INSCRIPCIONES
# ─────────────────────────────────────────
alumnos_keys: list[str] = [
    str(u["username"]) for u in usuarios_data if u["role"] == "alumno"
]
for username in alumnos_keys:
    alumno = users_map[username]
    for materia in materias_map.values():
        existe = (
            db.query(Inscripcion)
            .filter(
                Inscripcion.alumno_id == alumno.id, Inscripcion.materia_id == materia.id
            )
            .first()
        )
        if not existe:
            db.add(Inscripcion(alumno_id=alumno.id, materia_id=materia.id))
print(f"  + Inscripciones: {len(alumnos_keys)} alumnos x {len(materias_map)} materias")


# ─────────────────────────────────────────
# 5. ASISTENCIAS
# ─────────────────────────────────────────
def generar_fechas(inicio, cant, intervalo=7):
    fechas = []
    d = inicio
    for _ in range(cant):
        fechas.append(d)
        d += timedelta(days=intervalo)
    return fechas


patrones = {
    "12345678": [
        True,
        True,
        True,
        True,
        True,
        True,
        False,
        False,
        True,
        True,
        True,
        False,
        True,
        True,
        True,
        True,
    ],
    "23456789": [
        True,
        True,
        True,
        True,
        True,
        True,
        True,
        True,
        True,
        True,
        True,
        True,
        True,
        True,
        True,
        True,
    ],
    "34567890": [
        True,
        True,
        False,
        True,
        True,
        False,
        True,
        True,
        True,
        False,
        True,
        True,
        True,
        True,
        False,
        True,
    ],
    "45678901": [
        True,
        True,
        True,
        False,
        True,
        True,
        True,
        True,
        True,
        True,
        False,
        False,
        True,
        True,
        True,
        True,
    ],
    "56789012": [
        True,
        False,
        True,
        True,
        True,
        True,
        True,
        True,
        False,
        True,
        True,
        True,
        True,
        False,
        True,
        True,
    ],
}

fechas_clases = generar_fechas(date(2026, 3, 3), 16, 7)
for username in alumnos_keys:
    alumno = users_map[username]
    patron = patrones.get(username, [True] * 16)
    for materia in materias_map.values():
        for i, fecha in enumerate(fechas_clases):
            existe = (
                db.query(Asistencia)
                .filter(
                    Asistencia.user_id == alumno.id,
                    Asistencia.materia_id == materia.id,
                    Asistencia.fecha == fecha,
                )
                .first()
            )
            if not existe:
                db.add(
                    Asistencia(
                        user_id=alumno.id,
                        materia_id=materia.id,
                        fecha=fecha,
                        presente=patron[i % len(patron)],
                        es_becado=alumno.es_becado,
                    )
                )
print(
    f"  + Asistencias generadas: {len(alumnos_keys)} alumnos x {len(materias_map)} materias x {len(fechas_clases)} clases"  # noqa: E501
)

# ─────────────────────────────────────────
# 6. PUNTAJES
# ─────────────────────────────────────────
admin_user = users_map["admin@uca.edu.py"]
notas_por_alumno = {
    "12345678": {"parcial1": 7.5, "parcial2": 8.0, "practico": 9.0},
    "23456789": {"parcial1": 9.0, "parcial2": 9.5, "practico": 10.0},
    "34567890": {"parcial1": 5.5, "parcial2": 6.0, "practico": 7.0},
    "45678901": {"parcial1": 8.5, "parcial2": 8.0, "practico": 9.5},
    "56789012": {"parcial1": 6.0, "parcial2": 7.5, "practico": 8.0},
}
for username in alumnos_keys:
    alumno = users_map[username]
    notas = notas_por_alumno.get(username, {})
    for materia in materias_map.values():
        for tipo, valor in notas.items():
            existe = (
                db.query(Puntaje)
                .filter(
                    Puntaje.user_id == alumno.id,
                    Puntaje.materia_id == materia.id,
                    Puntaje.tipo == tipo,
                )
                .first()
            )
            if not existe:
                db.add(
                    Puntaje(
                        user_id=alumno.id,
                        materia_id=materia.id,
                        tipo=tipo,
                        valor=valor,
                        editado_por=admin_user.id,
                    )
                )
print(f"  + Puntajes cargados para {len(alumnos_keys)} alumnos")

# ─────────────────────────────────────────
# 7. EVENTOS CALENDARIO
# ─────────────────────────────────────────
eventos_data = [
    {
        "titulo": "Parcial 1 - Analisis Matematico I",
        "tipo": "parcial",
        "fecha": date(2026, 4, 14),
        "materia": "Analisis Matematico I",
    },
    {
        "titulo": "Parcial 1 - Programacion I",
        "tipo": "parcial",
        "fecha": date(2026, 4, 16),
        "materia": "Programacion I",
    },
    {
        "titulo": "Parcial 1 - Fisica I",
        "tipo": "parcial",
        "fecha": date(2026, 4, 21),
        "materia": "Fisica I",
    },
    {
        "titulo": "Parcial 2 - Analisis Matematico I",
        "tipo": "parcial",
        "fecha": date(2026, 6, 9),
        "materia": "Analisis Matematico I",
    },
    {
        "titulo": "Parcial 2 - Programacion I",
        "tipo": "parcial",
        "fecha": date(2026, 6, 11),
        "materia": "Programacion I",
    },
    {
        "titulo": "Entrega TP - Programacion I",
        "tipo": "entrega",
        "fecha": date(2026, 5, 28),
        "materia": "Programacion I",
    },
    {
        "titulo": "Entrega Informe - Fisica I",
        "tipo": "entrega",
        "fecha": date(2026, 6, 4),
        "materia": "Fisica I",
    },
    {
        "titulo": "Final - Analisis Matematico I",
        "tipo": "final",
        "fecha": date(2026, 8, 5),
        "materia": "Analisis Matematico I",
    },
    {
        "titulo": "Final - Fisica I",
        "tipo": "final",
        "fecha": date(2026, 8, 7),
        "materia": "Fisica I",
    },
    {
        "titulo": "Final - Programacion I",
        "tipo": "final",
        "fecha": date(2026, 8, 12),
        "materia": "Programacion I",
    },
    {
        "titulo": "Dia del Maestro - Asueto",
        "tipo": "asueto",
        "fecha": date(2026, 4, 30),
        "materia": None,
    },
    {
        "titulo": "Semana Santa - Asueto",
        "tipo": "asueto",
        "fecha": date(2026, 4, 2),
        "materia": None,
    },
    {
        "titulo": "Reunion de padres",
        "tipo": "actividad",
        "fecha": date(2026, 5, 15),
        "materia": None,
    },
]
for ev in eventos_data:
    mat_id = materias_map[ev["materia"]].id if ev["materia"] else None
    existe = (
        db.query(EventoCalendario)
        .filter(
            EventoCalendario.titulo == ev["titulo"],
            EventoCalendario.fecha == ev["fecha"],
        )
        .first()
    )
    if not existe:
        db.add(
            EventoCalendario(
                titulo=ev["titulo"],
                tipo=ev["tipo"],
                fecha=ev["fecha"],
                materia_id=mat_id,
                carrera_id=carreras["Ing. Informatica"].id,
                creado_por=admin_user.id,
            )
        )
print(f"  + Eventos: {len(eventos_data)} cargados")

# ─────────────────────────────────────────
# 8. APUNTES (BIBLIOTECA)
# ─────────────────────────────────────────
apuntes_data = [
    {
        "titulo": "Resumen Unidad 1 - Limites y Continuidad",
        "materia": "Analisis Matematico I",
        "tags": "limites,continuidad,derivadas",
        "url": "https://drive.google.com/file/example1",
        "aprobado": True,
    },
    {
        "titulo": "Guia de Ejercicios - Derivadas",
        "materia": "Analisis Matematico I",
        "tags": "derivadas,ejercicios,practica",
        "url": "https://drive.google.com/file/example2",
        "aprobado": True,
    },
    {
        "titulo": "Formulario de Fisica - Cinematica",
        "materia": "Fisica I",
        "tags": "cinematica,fisica,formulas",
        "url": "https://drive.google.com/file/example3",
        "aprobado": True,
    },
    {
        "titulo": "Resumen Leyes de Newton",
        "materia": "Fisica I",
        "tags": "newton,fuerzas,leyes",
        "url": "https://drive.google.com/file/example4",
        "aprobado": False,
    },
    {
        "titulo": "Introduccion a Python - Variables y Tipos",
        "materia": "Programacion I",
        "tags": "python,variables,tipos",
        "url": "https://drive.google.com/file/example5",
        "aprobado": True,
    },
    {
        "titulo": "Estructuras de Control en Python",
        "materia": "Programacion I",
        "tags": "if,while,for,python",
        "url": "https://drive.google.com/file/example6",
        "aprobado": True,
    },
    {
        "titulo": "Logica Proposicional - Tablas de Verdad",
        "materia": "Matematica Discreta",
        "tags": "logica,tablas,proposicion",
        "url": "https://drive.google.com/file/example7",
        "aprobado": True,
    },
    {
        "titulo": "Teoria de Grafos - Introduccion",
        "materia": "Matematica Discreta",
        "tags": "grafos,teoria,discrete",
        "url": "https://drive.google.com/file/example8",
        "aprobado": False,
    },
]
alumno_principal = users_map["12345678"]
for ap in apuntes_data:
    existe = db.query(Apunte).filter(Apunte.titulo == ap["titulo"]).first()
    if not existe:
        db.add(
            Apunte(
                user_id=alumno_principal.id,
                materia_id=materias_map[ap["materia"]].id,
                titulo=ap["titulo"],
                archivo_url=ap["url"],
                tags=ap["tags"],
                aprobado=ap["aprobado"],
            )
        )
print(f"  + Apuntes: {len(apuntes_data)} cargados")

# ─────────────────────────────────────────
# GUARDAR TODO
# ─────────────────────────────────────────
db.commit()
db.close()
print("\n=== Seed completo terminado exitosamente ===")
print()
print("  Credenciales de acceso:")
print("  Admin    --> admin@uca.edu.py   / Admin1234!")
print("  Profesor --> prof@uca.edu.py    / Profesor1234!")
print("  Alumno   --> 12345678           / Alumno1234!")
