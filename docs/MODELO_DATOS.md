# Modelo de Datos — Sistema Académico UCA V2

> Generado leyendo cada clase en `backend/app/models/*.py` y las migraciones Alembic reales en `backend/alembic/versions/`. No incluye tablas de fases futuras no implementadas.

## `users` — `models/users.py`

| Campo | Tipo | Notas |
|---|---|---|
| id | Integer PK | |
| username | String, unique | login |
| hashed_password | String | bcrypt |
| role | String | `admin` \| `profesor` \| `alumno`, sin FK a tabla de roles |
| nombre | String(120) | default `""` |
| email | String(200), unique, nullable | |
| carrera_id | FK → carreras.id, nullable | |
| es_becado | Boolean | |
| foto_url | String, nullable | storage key en R2 |
| created_at | DateTime(tz) | |

## `carreras` — `models/carrera.py`

| Campo | Tipo | Notas |
|---|---|---|
| id | Integer PK | |
| nombre | String(150), unique | |
| duracion_semestres | Integer, nullable | agregado Fase 2 |
| creditos_totales | Integer, nullable | agregado Fase 2 |

## `materias` — `models/materia.py`

Catálogo puro, **sin profesor** (ver `ARQUITECTURA.md`).

| Campo | Tipo | Notas |
|---|---|---|
| id | Integer PK | |
| nombre | String, index | |
| carrera_id | FK → carreras.id, nullable | |
| anio | Integer | posición curricular (año de carrera), no año calendario |
| semestre | Integer | posición curricular |
| creditos | Integer | default 4 |
| cupos | Integer | default 40 |
| horario | String, nullable | legacy, no usado por `horarios` (tabla separada) |
| secciones | Integer | default 1 |

`UniqueConstraint(nombre, carrera_id)` como `uq_materia_nombre_carrera`.

## `ofertas_materia` — `models/oferta_materia.py`

Vincula materia + profesor + período. Introducida en Fase 1 para separar catálogo de dictado real.

| Campo | Tipo | Notas |
|---|---|---|
| id | Integer PK | |
| materia_id | FK → materias.id | |
| profesor_id | FK → users.id | |
| periodo | String(10) | ej. `'2026-1'` |
| activa | Boolean | |

`UniqueConstraint(materia_id, periodo)` — una oferta por materia por período.

## `inscripciones` — `models/inscripcion.py`

| Campo | Tipo | Notas |
|---|---|---|
| id | Integer PK | |
| alumno_id | FK → users.id | |
| oferta_materia_id | FK → ofertas_materia.id | reemplazó `materia_id` directo en Fase 1 |

Property `materia_id` (solo lectura, vía `oferta.materia_id`) para compatibilidad de código legacy.

## `puntajes` — `models/puntaje.py`

| Campo | Tipo | Notas |
|---|---|---|
| id | Integer PK | |
| user_id | FK → users.id | |
| oferta_materia_id | FK → ofertas_materia.id | |
| tipo | String(20) | `parcial1`\|`parcial2`\|`practico`\|`final` |
| valor | Numeric(5,2) | |
| editado_por | FK → users.id, nullable | |
| editado_en | DateTime(tz) | |

`UniqueConstraint(user_id, oferta_materia_id, tipo)` como `uq_puntaje_user_oferta_tipo` — permite repetir la materia en otro período sin colisión.

## `asistencias` — `models/asistencia.py`

| Campo | Tipo | Notas |
|---|---|---|
| id | Integer PK | |
| user_id | FK → users.id | |
| oferta_materia_id | FK → ofertas_materia.id | |
| fecha | Date | |
| presente | Boolean | |
| es_becado | Boolean | snapshot del alumno al momento de marcar |
| motivo | String, nullable | motivo de ausencia |

`UniqueConstraint(user_id, oferta_materia_id, fecha)` como `uq_asistencia_user_oferta_fecha`.

## `horarios` — `models/horario.py`

| Campo | Tipo | Notas |
|---|---|---|
| id | Integer PK | |
| materia_id | FK → materias.id | a nivel catálogo, no por oferta/período |
| dia_semana | Integer | 0=Lunes .. 6=Domingo |
| hora_inicio / hora_fin | Time | |
| aula | String(50), nullable | |

`UniqueConstraint(materia_id, dia_semana, hora_inicio)`.

## `foro_hilos` / `foro_mensajes` — `models/foro.py`

**foro_hilos**: id, materia_id (FK), titulo, descripcion, creado_por (FK users), fijado (bool), cerrado (bool), created_at.

**foro_mensajes**: id, hilo_id (FK), user_id (FK), contenido, created_at. Sin `updated_at` — la edición (Fase 1) sobreescribe `contenido` directo, ventana de 15 min validada contra `created_at`.

## `eventos_calendario` — `models/evento_calendario.py`

id, titulo, tipo (`parcial`\|`final`\|`feriado`\|`asueto`\|`entrega`\|`actividad`), fecha, fecha_fin (nullable), materia_id (FK, nullable = institucional), carrera_id (FK, nullable), descripcion, creado_por (FK, nullable), anio, semestre, archivo_pdf.

## `apuntes` — `models/apunte.py`

id, user_id (FK), materia_id (FK), titulo, descripcion, archivo_url (legacy), storage_key (R2 actual), tags (comma-separated), aprobado (bool), tipo_contenido (default `pdf`), likes, descargas, visibilidad (default `publico`), fecha_subida.

## `programas` — `models/programa.py`

id, materia_id (FK), semana, titulo, descripcion. Sin bibliografía (a diferencia de `temarios`).

## `temarios` — `models/temario.py`

id, materia_id (FK), semana, titulo, descripcion, bibliografia (JSON, lista de `{autor,titulo,anio,tipo}`).

## `refresh_tokens` — `models/refresh_token.py`

id, usuario_id (FK), token_hash (String(64), unique — SHA-256 del token crudo), expira_en (DateTime tz), revocado (bool), created_at.

## `recordatorios_docente` — `models/recordatorio_docente.py`

Fase 1 (Agenda docente). id, profesor_id (FK users), titulo, descripcion (nullable), fecha (DateTime), materia_id (FK, nullable), completado (bool).

## `pensum_materias` — `models/pensum_materia.py`

Fase 2. id, carrera_id (FK), materia_id (FK), semestre, creditos, es_electiva (bool). `UniqueConstraint(carrera_id, materia_id)` como `uq_pensum_carrera_materia`.

## `correlatividades` — `models/correlatividad.py`

Fase 2. id, materia_id (FK — materia que exige), prerrequisito_id (FK — materia exigida), tipo (`aprobada`\|`cursando`). `CheckConstraint(materia_id != prerrequisito_id)`, `UniqueConstraint(materia_id, prerrequisito_id, tipo)`.

## `avance_alumno_pensum` — `models/avance_alumno_pensum.py`

Fase 2. id, alumno_id (FK users), pensum_materia_id (FK), estado (`pendiente`\|`cursando`\|`aprobada`\|`bloqueada`), fecha_actualizacion (DateTime tz, `onupdate=func.now()`). `UniqueConstraint(alumno_id, pensum_materia_id)`. Se recalcula y cachea en cada `GET /pensum/alumno/{id}/avance`, no se edita a mano.

## `expediente_materias` — `models/expediente_materia.py`

**Para qué sirve:** Registro oficial cerrado de una materia cursada — snapshot de nota final, créditos y condición, independiente de futuras ediciones al pensum o a `Puntaje`.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id | |
| oferta_materia_id | Integer | FK → ofertas_materia.id | Intento concreto (período+profesor), no `materia_id` directo — mismo criterio que `Puntaje`/`Asistencia` |
| nota_final | Numeric(5,2) | | Snapshot, calculado con `_calcular_promedio_final` al momento del cierre |
| creditos | Integer | | Snapshot de `pensum_materias.creditos` al momento del cierre |
| condicion | String(20) | CHECK IN ('aprobada','reprobada') | `nota_final >= 6` → `aprobada` |
| cerrado_por | Integer | FK → users.id | Admin que cerró (auditoría) |
| cerrado_en | DateTime(tz) | server_default now() | |

`UniqueConstraint(alumno_id, oferta_materia_id)` como `uq_expediente_alumno_oferta` — un cierre por alumno por oferta; rectificar una nota es un segundo `POST /expediente/cerrar-materia` que actualiza esta fila (upsert), no crea una nueva.

## `expediente_semestres` — `models/expediente_semestre.py`

**Para qué sirve:** Caché de agregación por alumno+período (PPA del período, créditos, cantidad de aprobadas/reprobadas). Se recalcula y persiste en cada `GET /expediente/alumno/{id}`.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id | |
| periodo | String(10) | | Formato `'YYYY-N'`, ej. `'2026-1'` |
| ppa_periodo | Numeric(5,2), nullable | | PPA solo de las aprobadas de ese período |
| creditos_periodo | Integer | default 0 | |
| materias_aprobadas | Integer | default 0 | |
| materias_reprobadas | Integer | default 0 | |

`UniqueConstraint(alumno_id, periodo)` como `uq_expediente_semestre_alumno_periodo`.

## `regularidad_alumno` — `models/regularidad_alumno.py`

**Para qué sirve:** Caché del estado de regularidad del alumno, recalculado en cada `GET /expediente/alumno/{id}/regularidad`.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id, UNIQUE | |
| estado | String(20) | CHECK IN ('activo','en_riesgo','irregular','de_baja') | Ver `ARQUITECTURA.md` para la lógica y precedencia |
| ppa_acumulado | Numeric(5,2), nullable | | Snapshot de `calcular_ppa()` al momento del cálculo |
| motivo | String(255), nullable | | Texto human-readable (ej. `"PPA 6.5 < 7.0"`) |
| calculado_en | DateTime(tz) | server_default now(), onupdate now() | |

## Diagrama de dependencias (FK, alto nivel)

```
carreras ← materias ← ofertas_materia ← inscripciones
                    ↖                 ↖ puntajes
                     ↖                ↖ asistencias
                      pensum_materias ← avance_alumno_pensum
                      correlatividades (auto-referencia a materias)
                      ofertas_materia ← expediente_materias
users ← refresh_tokens, recordatorios_docente, foro_hilos, foro_mensajes, apuntes,
        expediente_materias, expediente_semestres, regularidad_alumno
```

## Nota de integridad (drift histórico, ya resuelto)

`materias` y varias tablas de Fase 0 fueron creadas originalmente vía `Base.metadata.create_all()`, no por Alembic — causó un drift real entre el constraint del modelo (`uq_materia_nombre_carrera`) y el schema de Postgres (`materias_nombre_key`, solo sobre `nombre`). Corregido en migración `o2p3q4r5s6t7`. Toda tabla desde entonces se crea exclusivamente vía revisión Alembic.
