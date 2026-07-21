"""
Seed masivo para pruebas de carga (~4000 alumnos).
Uso: python seed_masivo.py
"""
import sys, random, time as time_mod
from datetime import date, timedelta, time
from io import TextIOWrapper

if isinstance(sys.stdout, TextIOWrapper):
    sys.stdout.reconfigure(encoding="utf-8")
print = lambda *a, **kw: (__builtins__.print(*a, **kw) or sys.stdout.flush())
t0 = time_mod.time()
def elapsed():
    return f"[{time_mod.time()-t0:.0f}s]"

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app.models.users import User
from app.models.carrera import Carrera
from app.models.materia import Materia
from app.models.oferta_materia import OfertaMateria
from app.models.inscripcion import Inscripcion
from app.models.puntaje import Puntaje
from app.models.asistencia import Asistencia
from app.models.horario import Horario
from app.models.pensum_materia import PensumMateria
from app.models.financiero import ConceptoArancel, Cuota
from app.security import hash_password
from sqlalchemy.dialects.postgresql import insert as pg_insert

random.seed(42)

def bulk_ignore(tbl, rows):
    """Insert batch ignoring conflicts (PostgreSQL + SQLite)."""
    if not rows:
        return
    if db.get_bind().dialect.name == "postgresql":
        db.execute(pg_insert(tbl).values(rows).on_conflict_do_nothing())
    else:
        db.execute(tbl.insert().prefix_with("OR IGNORE"), rows)
    db.commit()
BATCH = 500
PERIODO = "2026-1"

db = SessionLocal()

print(f"\n{elapsed()} === SEED MASIVO ===\n")

# ── 1. CARRERAS ──
carreras = {}
for nombre in ["Ingenieria Informatica","Ingenieria Civil","Ingenieria Electronica",
                "Administracion de Empresas","Contabilidad"]:
    obj = db.query(Carrera).filter(Carrera.nombre == nombre).first()
    if not obj:
        obj = Carrera(nombre=nombre, duracion_semestres=10, creditos_totales=200, max_cuotas_mora=2)
        db.add(obj); db.flush()
    carreras[nombre] = obj
db.commit()
print(f"{elapsed()} Carreras: {len(carreras)}")

# ── 2. ADMIN ──
admin = db.query(User).filter(User.username == "director@uca.edu.py").first()
if not admin:
    admin = User(username="director@uca.edu.py", hashed_password=hash_password("Director1234!"),
                 role="admin", nombre="Director General", email="director@uca.edu.py",
                 cedula="1000000", carrera_id=None, es_becado=False)
    db.add(admin); db.commit()
    print(f"{elapsed()} Admin creado: director@uca.edu.py / Director1234!")
print(f"{elapsed()} Admin OK")

# ── 3. PROFESORES (20) ──
nombres_prof = ["Carlos Mendez","Ana Torres","Luis Ramirez","Maria Fernandez",
    "Pedro Gonzalez","Laura Martinez","Jose Acosta","Sofia Benitez",
    "Miguel Villalba","Carmen Duarte","Roberto Rivas","Patricia Ayala",
    "Alberto Gimenez","Rosa Mendoza","Fernando Cabrera","Lilian Ortiz",
    "Hector Franco","Gloria Pereira","Diego Rojas","Cristina Nunez"]
prof_hash = hash_password("Profesor1234!")
prof_list = []
for i, nombre in enumerate(nombres_prof):
    username = f"prof{i+1:02d}@uca.edu.py"
    obj = db.query(User).filter(User.username == username).first()
    if not obj:
        obj = User(username=username, hashed_password=prof_hash, role="profesor",
                   nombre=nombre, email=username, cedula=f"20000{i+1:04d}",
                   carrera_id=list(carreras.values())[i%len(carreras)].id, es_becado=False)
        db.add(obj); db.flush()
    prof_list.append(obj)
db.commit()
print(f"{elapsed()} Profesores: {len(prof_list)}")

# ── 4. MATERIAS (25) ──
materias_data = {
    "Ingenieria Informatica": [
        ("INF101","Analisis Matematico I",1,1,6,50), ("INF102","Programacion I",1,1,6,50),
        ("INF103","Fisica I",1,1,5,40), ("INF104","Matematica Discreta",1,2,4,40),
        ("INF201","Estructura de Datos",2,1,6,45)],
    "Ingenieria Civil": [
        ("CIV101","Calculo I",1,1,6,50), ("CIV102","Topografia",1,1,5,40),
        ("CIV103","Geometria Descriptiva",1,1,4,40), ("CIV104","Materiales de Construccion",1,2,5,40),
        ("CIV201","Resistencia de Materiales",2,1,6,45)],
    "Ingenieria Electronica": [
        ("ELE101","Analisis de Circuitos",1,1,6,50), ("ELE102","Electronica Digital",1,1,5,40),
        ("ELE103","Programacion para Ingenieria",1,1,4,40), ("ELE104","Sistemas Digitales",1,2,5,40),
        ("ELE201","Microcontroladores",2,1,6,45)],
    "Administracion de Empresas": [
        ("ADM101","Introduccion a la Administracion",1,1,5,50), ("ADM102","Contabilidad General",1,1,5,50),
        ("ADM103","Microeconomia",1,1,4,40), ("ADM104","Marketing I",1,2,4,40),
        ("ADM201","Gestion de Recursos Humanos",2,1,5,45)],
    "Contabilidad": [
        ("CON101","Contabilidad I",1,1,6,50), ("CON102","Matematica Financiera",1,1,5,40),
        ("CON103","Legislacion Comercial",1,1,4,40), ("CON104","Costos I",1,2,5,40),
        ("CON201","Auditoria I",2,1,6,45)],
}
materias_map = {}
for cn, mats in materias_data.items():
    for cod, nombre, anio, sem, cred, cup in mats:
        obj = db.query(Materia).filter(Materia.codigo == cod).first()
        if not obj:
            obj = Materia(nombre=nombre, codigo=cod, carrera_id=carreras[cn].id,
                          anio=anio, semestre=sem, creditos=cred, cupos=cup)
            db.add(obj); db.flush()
        materias_map[nombre] = obj
db.commit()
print(f"{elapsed()} Materias: {len(materias_map)}")

# ── 5. PENSUM ──
p_count = 0
for cn, mats in materias_data.items():
    for _, nombre, anio, sem, cred, _ in mats:
        m = materias_map[nombre]
        if not db.query(PensumMateria).filter(PensumMateria.carrera_id==carreras[cn].id, PensumMateria.materia_id==m.id).first():
            db.add(PensumMateria(carrera_id=carreras[cn].id, materia_id=m.id,
                                 semestre=(anio-1)*2+sem, creditos=cred))
            p_count += 1
db.commit()
print(f"{elapsed()} Pensum: {p_count}")

# ── 6. OFERTAS + HORARIOS ──
dias = [0,1,2,3,4]
h_inicio = [time(7,0),time(8,30),time(10,0),time(11,30),time(14,0),time(15,30)]
ofertas_map = {}
o_count = h_count = 0
for i, (nombre, materia) in enumerate(materias_map.items()):
    of = db.query(OfertaMateria).filter(OfertaMateria.materia_id==materia.id, OfertaMateria.periodo==PERIODO).first()
    if not of:
        of = OfertaMateria(materia_id=materia.id, profesor_id=prof_list[i%len(prof_list)].id, periodo=PERIODO, activa=True)
        db.add(of); db.flush(); o_count += 1
    ofertas_map[nombre] = of
    if db.query(Horario).filter(Horario.materia_id==materia.id).count() == 0:
        for d in dias[:3]:
            hi = random.choice(h_inicio)
            hf = time(min(hi.hour+1, 16), 30)
            db.add(Horario(materia_id=materia.id, dia_semana=d, hora_inicio=hi, hora_fin=hf, aula=f"A{random.randint(1,30):03d}"))
            h_count += 1
db.commit()
print(f"{elapsed()} Ofertas: {o_count} | Horarios: {h_count}")

# ── 7. ALUMNOS (4000) ──
nombres = ["Juan","Maria","Carlos","Ana","Pedro","Laura","Diego","Sofia",
    "Luis","Valentina","Jose","Camila","Miguel","Lucia","Andres","Gabriela",
    "Pablo","Martina","Santiago","Isabella","Mateo","Emma","Daniel","Victoria",
    "Alejandro","Paula","Fernando","Julia","Gabriel","Elena","Ricardo","Claudia",
    "Hector","Rosa","Alberto","Patricia","Jorge","Monica","Raul","Adriana",
    "Oscar","Silvia","Hugo","Lorena","Ivan","Andrea","Cristian","Natalia","Federico","Mariana"]
apellidos = ["Gonzalez","Rodriguez","Perez","Lopez","Martinez","Garcia","Fernandez",
    "Benitez","Acosta","Villalba","Duarte","Rivas","Ayala","Gimenez","Mendoza",
    "Cabrera","Ortiz","Franco","Pereira","Rojas","Nunez","Ramirez","Torres","Mendez",
    "Flores","Vera","Caceres","Bareiro","Bogado","Delgado","Espinola","Davalos",
    "Meza","Rolon","Paredes","Cuevas","Aquino","Fleitas","Ocampos","Portillo","Salinas"]

print(f"{elapsed()} Alumnos: hasheando password comun...")
alumno_hash = hash_password("Alumno1234!")
print(f"{elapsed()} Alumnos: hash listo, insertando...")

total_alumnos = 0
existing_cedulas = set(r[0] for r in db.query(User.cedula).filter(User.role == "alumno").all())
batch = []
carrids = list(carreras.values())

for i in range(4000):
    ced = f"{3000000+i:08d}"
    if ced in existing_cedulas:
        continue
    c = carrids[i % len(carrids)]
    batch.append(User(
        username=ced, hashed_password=alumno_hash,
        role="alumno", nombre=random.choice(nombres)+" "+random.choice(apellidos),
        email=f"a{i+1:05d}@uca.edu.py", cedula=ced,
        carrera_id=c.id, es_becado=random.random()<0.15,
    ))
    if len(batch) >= BATCH:
        db.bulk_save_objects(batch); db.commit()
        total_alumnos += len(batch); batch = []
        print(f"  {elapsed()} {total_alumnos} alumnos insertados...")
if batch:
    db.bulk_save_objects(batch); db.commit()
    total_alumnos += len(batch)
print(f"{elapsed()} Alumnos: {total_alumnos}")

# ── 8. INSCRIPCIONES ──
alumnos = db.query(User).filter(User.role=="alumno").all()
mat_por_carrera = {}
for cn, mats in materias_data.items():
    mat_por_carrera[carreras[cn].id] = [materias_map[n] for _,n,_,_,_,_ in mats]

print(f"{elapsed()} Inscripciones: generando...")
insc_count = 0
batch = []
for a in alumnos:
    for m in mat_por_carrera.get(a.carrera_id, []):
        batch.append({"alumno_id": a.id, "oferta_materia_id": ofertas_map[m.nombre].id})
        insc_count += 1
    if len(batch) >= BATCH*5:
        bulk_ignore(Inscripcion.__table__, batch); batch = []
if batch:
    bulk_ignore(Inscripcion.__table__, batch)
print(f"{elapsed()} Inscripciones: {insc_count}")

# ── 9. PUNTAJES (limit 50k) ──
max_puntajes = 50000
print(f"{elapsed()} Puntajes: generando hasta {max_puntajes}...")
inscs = db.query(Inscripcion).limit(17000).all()
p_count = 0
batch = []
admin_id = admin.id
for ins in inscs:
    for t in ["parcial1","parcial2","practico"]:
        batch.append({"user_id": ins.alumno_id, "oferta_materia_id": ins.oferta_materia_id,
                      "tipo": t, "valor": round(random.uniform(2.0,10.0),2), "editado_por": admin_id})
        p_count += 1
    if len(batch) >= BATCH*5:
        bulk_ignore(Puntaje.__table__, batch); batch = []
if batch:
    bulk_ignore(Puntaje.__table__, batch)
print(f"{elapsed()} Puntajes: {p_count}")

# ── 10. ASISTENCIAS (limit 80k) ──
max_asist = 80000
print(f"{elapsed()} Asistencias: generando hasta {max_asist}...")
fechas = [date(2026,3,2)+timedelta(days=i) for i in range(0,120,2) if (date(2026,3,2)+timedelta(days=i)).weekday()<5]
a_count = 0
batch = []
# Pre-cache alumno becado status
becado_cache = {u.id: u.es_becado for u in db.query(User.id, User.es_becado).filter(User.role=="alumno").all()}
for ins in inscs[:6000]:
    for f in fechas[:20]:
        batch.append({"user_id": ins.alumno_id, "oferta_materia_id": ins.oferta_materia_id,
                      "fecha": f, "presente": random.random()<0.75,
                      "es_becado": becado_cache.get(ins.alumno_id, False)})
        a_count += 1
    if len(batch) >= BATCH:
        bulk_ignore(Asistencia.__table__, batch); batch = []
if batch:
    bulk_ignore(Asistencia.__table__, batch)
print(f"{elapsed()} Asistencias: {a_count}")

# ── 11. CUOTAS (1000 alumnos x 5 meses) ──
print(f"{elapsed()} Cuotas: generando...")
conceptos = {}
for cn, c in carreras.items():
    conc = db.query(ConceptoArancel).filter(ConceptoArancel.nombre==f"Cuota Mensual {cn}", ConceptoArancel.carrera_id==c.id).first()
    if not conc:
        conc = ConceptoArancel(nombre=f"Cuota Mensual {cn}", carrera_id=c.id, monto_base=random.choice([350000,400000,450000,500000]), periodicidad="mensual")
        db.add(conc); db.flush()
    conceptos[c.id] = conc
db.commit()

c_count = 0
batch = []
for a in alumnos[:1000]:
    conc = conceptos.get(a.carrera_id)
    if not conc: continue
    for mes in range(3,8):
        batch.append({"alumno_id": a.id, "concepto_id": conc.id, "periodo": f"2026-{mes}",
                      "monto": conc.monto_base, "monto_descuento": 0,
                      "fecha_vencimiento": date(2026,mes,15), "estado": "pendiente", "generado_por": admin_id})
        c_count += 1
    if len(batch) >= BATCH*5:
        bulk_ignore(Cuota.__table__, batch); batch = []
if batch:
    bulk_ignore(Cuota.__table__, batch)
print(f"{elapsed()} Cuotas: {c_count}")

# ── FIN ──
db.close()
print(f"\n{'='*50}")
print(f"SEED MASIVO COMPLETADO en {time_mod.time()-t0:.0f}s")
print(f"{'='*50}")
print(f"  Director --> director@uca.edu.py / Director1234!")
print(f"  Profesor  --> prof01@uca.edu.py  / Profesor1234! (prof01..prof20)")
print(f"  Alumno    --> 30000000            / Alumno1234! (cedula + password comun)")
print(f"  Alumnos:   {total_alumnos}")
print(f"  Inscrip.:  {insc_count}")
print(f"  Puntajes:  {p_count}")
print(f"  Asisten.:  {a_count}")
print(f"  Cuotas:    {c_count}")
print()
