"""
Run once to migrate materias table:
  - Remove UNIQUE on nombre alone
  - Add UNIQUE(nombre, carrera_id)
  - Deduplicate any exact-same (nombre, carrera_id) rows, keeping the one with lower id

Usage: python migrate_materias.py
"""

import sqlite3
import os

DB = os.path.join(os.path.dirname(__file__), "sistema_academico.db")
print(f"Migrating: {DB}")

conn = sqlite3.connect(DB)
conn.execute("PRAGMA foreign_keys = OFF")
conn.executescript("""
BEGIN;

CREATE TABLE IF NOT EXISTS materias_new (
    id INTEGER PRIMARY KEY,
    nombre VARCHAR NOT NULL,
    profesor_id INTEGER NOT NULL REFERENCES users(id),
    carrera_id INTEGER REFERENCES carreras(id),
    anio INTEGER DEFAULT 1,
    semestre INTEGER DEFAULT 1,
    UNIQUE (nombre, carrera_id)
);

INSERT OR IGNORE INTO materias_new
SELECT id, nombre, profesor_id, carrera_id, anio, semestre
FROM materias
ORDER BY id;

-- Redirect all FK references to kept IDs
UPDATE inscripciones SET materia_id = (
    SELECT mn.id FROM materias_new mn
    JOIN materias m
      ON m.nombre = (SELECT nombre FROM materias WHERE id = inscripciones.materia_id)
     AND (mn.carrera_id = m.carrera_id
          OR (mn.carrera_id IS NULL AND m.carrera_id IS NULL))
    ORDER BY mn.id LIMIT 1
) WHERE materia_id NOT IN (SELECT id FROM materias_new);

UPDATE puntajes SET materia_id = (
    SELECT mn.id FROM materias_new mn
    JOIN materias m
      ON m.nombre = (SELECT nombre FROM materias WHERE id = puntajes.materia_id)
     AND (mn.carrera_id = m.carrera_id
          OR (mn.carrera_id IS NULL AND m.carrera_id IS NULL))
    ORDER BY mn.id LIMIT 1
) WHERE materia_id NOT IN (SELECT id FROM materias_new);

UPDATE asistencias SET materia_id = (
    SELECT mn.id FROM materias_new mn
    JOIN materias m
      ON m.nombre = (SELECT nombre FROM materias WHERE id = asistencias.materia_id)
     AND (mn.carrera_id = m.carrera_id
          OR (mn.carrera_id IS NULL AND m.carrera_id IS NULL))
    ORDER BY mn.id LIMIT 1
) WHERE materia_id NOT IN (SELECT id FROM materias_new);

UPDATE apuntes SET materia_id = (
    SELECT mn.id FROM materias_new mn
    JOIN materias m
      ON m.nombre = (SELECT nombre FROM materias WHERE id = apuntes.materia_id)
     AND (mn.carrera_id = m.carrera_id
          OR (mn.carrera_id IS NULL AND m.carrera_id IS NULL))
    ORDER BY mn.id LIMIT 1
) WHERE materia_id IS NOT NULL AND materia_id NOT IN (SELECT id FROM materias_new);

DROP TABLE materias;
ALTER TABLE materias_new RENAME TO materias;

COMMIT;
""")
conn.execute("PRAGMA foreign_keys = ON")

c = conn.cursor()
c.execute("SELECT id, nombre, carrera_id FROM materias ORDER BY id")
rows = c.fetchall()
print(f"Materias after migration ({len(rows)} rows):")
for r in rows:
    print(f"  {r}")
conn.close()
print("Done.")
