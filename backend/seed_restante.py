"""Seed complementario: asistencias + cuotas (rápido)."""
import sys, random, time as time_mod
from datetime import date, timedelta

sys.stdout.reconfigure(encoding="utf-8")
print = lambda *a, **kw: (__builtins__.print(*a, **kw) or sys.stdout.flush())
t0 = time_mod.time()

from dotenv import load_dotenv; load_dotenv()
from app.database import SessionLocal
from app.models.asistencia import Asistencia
from app.models.inscripcion import Inscripcion
from app.models.users import User
from app.models.financiero import ConceptoArancel, Cuota
from app.models.carrera import Carrera
from sqlalchemy.dialects.postgresql import insert as pg_insert

BATCH = 1000
db = SessionLocal()

def bulk_ignore(tbl, rows):
    if not rows: return
    if db.bind.dialect.name == "postgresql":
        db.execute(pg_insert(tbl).values(rows).on_conflict_do_nothing())
    else:
        db.execute(tbl.insert().prefix_with("OR IGNORE"), rows)
    db.commit()

admin = db.query(User).filter(User.role=="admin").first()

# ── ASISTENCIAS (80k registros) ──
print(f"[{time_mod.time()-t0:.0f}s] Asistencias: generando...")
inscs = db.query(Inscripcion).limit(6000).all()
fechas = [date(2026,3,2)+timedelta(days=i) for i in range(0, 80, 2) if (date(2026,3,2)+timedelta(days=i)).weekday()<5]
becado_cache = {u.id: u.es_becado for u in db.query(User.id, User.es_becado).filter(User.role=="alumno").all()}

count = 0
batch = []
for ins in inscs:
    for f in fechas[:20]:
        batch.append({"user_id": ins.alumno_id, "oferta_materia_id": ins.oferta_materia_id,
                      "fecha": f, "presente": random.random()<0.75,
                      "es_becado": becado_cache.get(ins.alumno_id, False)})
        count += 1
    if len(batch) >= BATCH:
        bulk_ignore(Asistencia.__table__, batch); batch = []
        print(f"  [{time_mod.time()-t0:.0f}s] {count} asistencias...")
if batch:
    bulk_ignore(Asistencia.__table__, batch)
print(f"[{time_mod.time()-t0:.0f}s] Asistencias: {count}")

# ── CUOTAS (mismos alumnos + conceptos) ──
print(f"[{time_mod.time()-t0:.0f}s] Cuotas: generando...")
conceptos = {}
carreras = db.query(Carrera).all()
for c in carreras:
    conc = db.query(ConceptoArancel).filter(ConceptoArancel.nombre==f"Cuota Mensual {c.nombre}", ConceptoArancel.carrera_id==c.id).first()
    if conc:
        conceptos[c.id] = conc
if not conceptos:
    # crear conceptos generales
    for c in carreras:
        conc = ConceptoArancel(nombre=f"Cuota Mensual {c.nombre}", carrera_id=c.id, monto_base=400000, periodicidad="mensual")
        db.add(conc); db.flush()
        conceptos[c.id] = conc
    db.commit()

alumnos = db.query(User).filter(User.role=="alumno").all()
count = 0
batch = []
for a in alumnos[:2000]:
    conc = conceptos.get(a.carrera_id)
    if not conc: continue
    for mes in range(3, 8):
        batch.append({"alumno_id": a.id, "concepto_id": conc.id, "periodo": f"2026-{mes}",
                      "monto": conc.monto_base, "monto_descuento": 0,
                      "fecha_vencimiento": date(2026,mes,15), "estado": "pendiente", "generado_por": admin.id if admin else 1})
        count += 1
    if len(batch) >= BATCH*5:
        bulk_ignore(Cuota.__table__, batch); batch = []
if batch:
    bulk_ignore(Cuota.__table__, batch)
print(f"[{time_mod.time()-t0:.0f}s] Cuotas: {count}")

db.close()
print(f"\n✅ Seed complementario completado en {time_mod.time()-t0:.0f}s")
print(f"   Asistencias: {count if 'count' in dir() else 0}")
print(f"   Cuotas:      {count}")
