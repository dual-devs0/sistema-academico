# Modelo de Datos — Sistema Académico UCA V2

> Generado leyendo cada clase SQLAlchemy en `backend/app/models/*.py` (una por una, incluyendo archivos con múltiples tablas) y cruzado con las migraciones reales en `backend/alembic/versions/` para constraints no obvias (`ondelete`, drift histórico, índices). No incluye tablas de fases futuras no implementadas.
>
> **Total: 51 tablas** en 31 archivos de modelos (varios archivos declaran más de una tabla: `financiero.py` tiene 11, `equivalencia.py` 3, `graduacion.py` 3, `pasantia.py` 3, `examen.py` 2, `foro.py` 2, `global_settings.py` 2, `tramites.py` 2).

## Índice

1. [Núcleo académico](#1-núcleo-académico) — `users`, `carreras`, `materias`, `ofertas_materia`, `inscripciones`, `horarios`, `pensum_materias`, `correlatividades`, `avance_alumno_pensum`
2. [Evaluación](#2-evaluación) — `puntajes`, `pesos_evaluacion`, `asistencias`, `examenes`, `inscripciones_examen`
3. [Expediente y regularidad](#3-expediente-y-regularidad) — `expediente_materias`, `expediente_semestres`, `regularidad_alumno`
4. [Contenido y comunicación](#4-contenido-y-comunicación) — `apuntes`, `programas`, `foro_hilos`, `foro_mensajes`, `eventos_calendario`, `recordatorios_docente`
5. [Autenticación y seguridad](#5-autenticación-y-seguridad) — `refresh_tokens`, `password_reset_tokens`, `token_blacklist`, `audit_log`
6. [Configuración](#6-configuración) — `global_settings`, `setting_audit_log`
7. [Financiero y becas](#7-financiero-y-becas) — `fuentes_beca`, `becas_catalogo`, `postulaciones_beca`, `becas_activas`, `conceptos_arancel`, `cuotas`, `pagos`, `comprobantes`, `auditoria_override_mora`, `pagos_online`
8. [Trámites](#8-trámites) — `tipos_tramite`, `solicitudes`
9. [Graduación](#9-graduación) — `procesos_graduacion`, `etapas_tesis`, `verificacion_solvencia`
10. [Pasantías](#10-pasantías) — `empresas_receptoras`, `pasantias`, `informes_pasantia`
11. [Equivalencias y suficiencia](#11-equivalencias-y-suficiencia) — `solicitudes_equivalencia`, `equivalencias_materia`, `examenes_suficiencia`
12. [Notificaciones](#12-notificaciones) — `suscripciones_push`

---

## 1. Núcleo académico

### Tabla: users

**Para qué sirve:** Usuario del sistema — alumno, profesor o admin en una sola tabla (`role` como string, sin tabla de roles separada). Tabla central, referenciada por FK desde casi todos los demás modelos.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| username | String | UNIQUE, index, not null | login |
| hashed_password | String | not null | bcrypt |
| role | String | not null, index | `admin` \| `profesor` \| `alumno` — sin FK a tabla de roles |
| nombre | String(120) | not null, default `""` | |
| email | String(200) | UNIQUE, nullable | |
| cedula | String(20) | nullable | agregado Fase 4B — documento del alumno, requerido por guarani.app para emitir factura válida ante la DNIT |
| carrera_id | Integer | FK → carreras.id ON DELETE SET NULL, nullable, index | |
| es_becado | Boolean | nullable, default false | |
| foto_url | String | nullable | storage key en R2 |
| fecha_ingreso | Date | nullable | |
| cv | Text | nullable | |
| activo | Boolean | not null, default true | |
| created_at | DateTime(tz) | not null (endurecido en migración `b42cc57fda33`) | |

**Archivo:** `app/models/users.py`

---

### Tabla: carreras

**Para qué sirve:** Catálogo de carreras.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| nombre | String(150) | UNIQUE, not null | |
| duracion_semestres | Integer | nullable | agregado Fase 2 |
| creditos_totales | Integer | nullable | agregado Fase 2 |
| max_cuotas_mora | Integer | not null, default 1 | agregado Fase 4 — umbral de cuotas vencidas que bloquea inscripción (`verificar_deuda_inscripcion` bloquea cuando `cuotas_vencidas >= max_cuotas_mora`, salvo beca 100%) |

**Archivo:** `app/models/carrera.py`

---

### Tabla: materias

**Para qué sirve:** Catálogo puro de materias — **sin profesor ni período**, eso vive en `OfertaMateria`.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| nombre | String | not null, index | |
| codigo | String(20) | nullable | backfill de Fase 10B (migración `d1e2f3g4h5i6`) — prefijo de 3 letras del nombre + secuencial de 3 dígitos por carrera |
| carrera_id | Integer | FK → carreras.id, nullable | |
| anio | Integer | default 1 | posición curricular (año de carrera), no año calendario |
| semestre | Integer | default 1 | posición curricular |
| creditos | Integer | default 4 | |
| cupos | Integer | default 40 | |
| horario | String | nullable | legacy, no usado por `horarios` (tabla separada) |
| secciones | Integer | default 1 | |

`UniqueConstraint(nombre, carrera_id)` como `uq_materia_nombre_carrera`; `UniqueConstraint(carrera_id, codigo)` como `uq_materia_codigo_carrera`.

**Archivo:** `app/models/materia.py`

**Decisión de diseño — Materia vs OfertaMateria:** la separación (introducida en Fase 1, migración `n1o2p3q4r5s6`) evita duplicar el catálogo por cada período dictado. `Materia` es el catálogo curricular estable; `OfertaMateria` es la instancia concreta materia+profesor+período de la que cuelgan inscripciones, notas y asistencias.

**Nota de integridad (drift histórico, ya resuelto):** `materias` fue creada originalmente vía `Base.metadata.create_all()`, no por Alembic — causó drift real entre el constraint del modelo (`uq_materia_nombre_carrera`) y el schema de Postgres (`materias_nombre_key`, solo sobre `nombre`). Corregido en migración `o2p3q4r5s6t7` (verificado sin duplicados antes de aplicar). Toda tabla desde entonces se crea exclusivamente vía revisión Alembic.

---

### Tabla: ofertas_materia

**Para qué sirve:** Instancia de una `Materia` dictada en un período concreto, con profesor asignado.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| materia_id | Integer | FK → materias.id, not null | |
| profesor_id | Integer | FK → users.id, not null | |
| periodo | String(10) | not null | ej. `'2026-1'` |
| activa | Boolean | nullable, default true | |

`UniqueConstraint(materia_id, periodo)` como `uq_oferta_materia_periodo` — una oferta por materia por período.

**Archivo:** `app/models/oferta_materia.py`

---

### Tabla: inscripciones

**Para qué sirve:** Inscripción de un alumno a una oferta de materia. Alta bloqueada por correlatividades (`services/pensum.py`) y por mora (`services/financiero.py`) salvo beca 100%.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id ON DELETE SET NULL, nullable, index | |
| oferta_materia_id | Integer | FK → ofertas_materia.id, nullable, index | reemplazó `materia_id` directo en Fase 1 |

Property `materia_id` (solo lectura, vía `oferta.materia_id`) para compatibilidad de código legacy. RLS habilitada en Postgres (migración `63005e9acb85`, ver nota en sección 5).

**Archivo:** `app/models/inscripcion.py`

---

### Tabla: horarios

**Para qué sirve:** Bloques horarios de una materia (día/hora/aula), a nivel de catálogo, no por oferta/período.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| materia_id | Integer | FK → materias.id, not null | |
| dia_semana | Integer | not null | 0=Lunes .. 6=Domingo |
| hora_inicio | Time | not null | |
| hora_fin | Time | not null | |
| aula | String(50) | nullable | |

`UniqueConstraint(materia_id, dia_semana, hora_inicio)` como `uq_horario_materia_dia_hora`. Usado por `services/pensum.py::verificar_solapamiento_inscripcion` para bloquear inscripción con choque de horario.

**Archivo:** `app/models/horario.py`

---

### Tabla: pensum_materias

**Para qué sirve:** Materia dentro del pensum de una carrera (semestre sugerido, créditos propios del pensum, si es electiva).

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| carrera_id | Integer | FK → carreras.id, not null | |
| materia_id | Integer | FK → materias.id, not null | |
| semestre | Integer | not null | |
| creditos | Integer | not null | |
| es_electiva | Boolean | nullable, default false | |

`UniqueConstraint(carrera_id, materia_id)` como `uq_pensum_carrera_materia`.

**Archivo:** `app/models/pensum_materia.py`

---

### Tabla: correlatividades

**Para qué sirve:** Prerrequisitos entre materias (`aprobada` o `cursando`). Base de `validar_correlatividades()` en `services/pensum.py` — bloquea inscripción si no se cumplen.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| materia_id | Integer | FK → materias.id, not null | materia que exige el prerrequisito |
| prerrequisito_id | Integer | FK → materias.id, not null | materia exigida |
| tipo | String(20) | not null | `aprobada` \| `cursando` |

`CheckConstraint(materia_id != prerrequisito_id)` como `ck_correlatividad_no_autorreferencia`; `UniqueConstraint(materia_id, prerrequisito_id, tipo)` como `uq_correlatividad_regla`.

**Archivo:** `app/models/correlatividad.py`

---

### Tabla: avance_alumno_pensum

**Para qué sirve:** Estado de avance de un alumno por materia del pensum, cacheado.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id, not null, index | |
| pensum_materia_id | Integer | FK → pensum_materias.id, not null | |
| estado | String(20) | not null, default `pendiente` | `pendiente`\|`cursando`\|`aprobada`\|`reprobada`\|`bloqueada` — el comentario en `materia.py`/doc anterior omitía `reprobada`; confirmado en el código del modelo <!-- TODO: verificar si existe CHECK constraint a nivel DB, no se encontró en migraciones --> |
| fecha_actualizacion | DateTime(tz) | server_default now(), onupdate now() | |

`UniqueConstraint(alumno_id, pensum_materia_id)` como `uq_avance_alumno_pensum_materia`. Se recalcula y cachea en cada `GET /pensum/alumno/{id}/avance`, no se edita a mano. Índice adicional `ix_avance_alumno_pensum_alumno_id` (migración `e2f3g4h5i6j7`).

**Archivo:** `app/models/avance_alumno_pensum.py`

---

## 2. Evaluación

### Tabla: puntajes

**Para qué sirve:** Nota individual por tipo de evaluación, puntos crudos. Fuente del motor de notas — ver `services/puntajes_utils.py::calcular_promedio_final`.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| user_id | Integer | FK → users.id, not null, index | Alumno dueño de la nota |
| oferta_materia_id | Integer | FK → ofertas_materia.id, not null, index | Intento concreto (período+profesor), no `materia_id` directo |
| tipo | String(20) | not null | `parcial1`\|`parcial2`\|`practico`\|`final1`\|`final2`\|`final3`\|`final`\|`directa` (validado a nivel de schema Pydantic, no CHECK de DB; `directa` agregado 2026-08-02: carga simplificada del profesor, nota final única 0-10 sin desglose) |
| valor | Numeric(5,2) | not null | Para `tipo="directa"` es directamente el promedio 0-10, no un puntaje crudo |
| felicitado | Boolean | not null, default false, server_default `false` (migración `a9b8c7d6e5f4`, 2026-08-02) | Solo tiene sentido con `tipo="directa"` — marca la nota como "5F" (5 Felicitado) en toda la UI |
| editado_por | Integer | FK → users.id, nullable | |
| editado_en | DateTime(tz) | nullable | También usado como "fecha" de la nota en el reporte/PDF de boleta (no hay campo de fecha de examen separado) |

`UniqueConstraint(user_id, oferta_materia_id, tipo)` como `uq_puntaje_user_oferta_tipo` — permite repetir la materia en otro período sin colisión. RLS habilitada en Postgres. Índices `ix_puntajes_user_id`, `ix_puntajes_oferta_materia_id` (migración `e2f3g4h5i6j7`).

**Archivo:** `app/models/puntaje.py`

---

### Tabla: pesos_evaluacion

**Para qué sirve:** Puntaje máximo por tipo de evaluación, configurable por materia (default 20/20/10/50).

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| materia_id | Integer | FK → materias.id, not null | |
| parcial1_max | Numeric(5,2) | not null, default 20 | |
| parcial2_max | Numeric(5,2) | not null, default 20 | |
| practico_max | Numeric(5,2) | not null, default 10 | |
| final_max | Numeric(5,2) | not null, default 50 | |
| updated_by | Integer | FK → users.id, nullable | |
| updated_at | DateTime(tz) | not null, default/onupdate now() | |

`UniqueConstraint(materia_id)` como `uq_peso_evaluacion_materia` — un registro de pesos por materia (a nivel de catálogo, no por oferta).

**Archivo:** `app/models/peso_evaluacion.py`

---

### Tabla: asistencias

**Para qué sirve:** Registro de asistencia por alumno/oferta/fecha (manual o vía QR).

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| user_id | Integer | FK → users.id, not null, index | |
| oferta_materia_id | Integer | FK → ofertas_materia.id, not null, index | |
| fecha | Date | not null | |
| presente | Boolean | not null, default true | |
| es_becado | Boolean | nullable, default false | snapshot del alumno al momento de marcar |
| motivo | String | nullable | motivo de ausencia |
| puntaje_justificacion | Integer | nullable | puntaje (3 o 4) que el profesor elige al justificar una ausencia (migración `b1c2d3e4f5g6`) — ver `services/asistencia_utils.py::puntaje_sesion`; null si presente o si la ausencia no está justificada |

`UniqueConstraint(user_id, oferta_materia_id, fecha)` como `uq_asistencia_user_oferta_fecha`. RLS habilitada en Postgres. Índices `ix_asistencias_user_id`, `ix_asistencias_oferta_materia_id`.

**Archivo:** `app/models/asistencia.py`

---

### Tabla: examenes

**Para qué sirve:** Mesa de examen programada por admin/profesor (Fase 7E — Exámenes Regulares).

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| materia_id | Integer | FK → materias.id, not null | |
| fecha | Date | not null | |
| hora_inicio | String(5) | nullable | formato `HH:MM` |
| hora_fin | String(5) | nullable | |
| aula | String(50) | nullable | |
| tipo | String(20) | not null, default `final` | `parcial`\|`final`\|`recuperatorio` |
| periodo | String(10) | not null | ej. `'2026-1'` |
| cupos | Integer | nullable | `null` = sin límite |
| estado | String(20) | not null, default `programado` | `programado`\|`en_curso`\|`finalizado`\|`cancelado` |
| profesor_id | Integer | FK → users.id ON DELETE SET NULL, nullable | |
| created_at | DateTime(tz) | | |

**Archivo:** `app/models/examen.py`

---

### Tabla: inscripciones_examen

**Para qué sirve:** Inscripción de un alumno a una mesa de examen.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| examen_id | Integer | FK → examenes.id, not null | |
| alumno_id | Integer | FK → users.id, not null | |
| estado | String(20) | not null, default `inscripto` | `inscripto`\|`presente`\|`ausente`\|`cancelada` |
| inscripto_en | DateTime(tz) | | |
| cancelado_en | DateTime(tz) | nullable | |

`UniqueConstraint(examen_id, alumno_id)` como `uq_inscripcion_examen_alumno`.

**Archivo:** `app/models/examen.py`

---

## 3. Expediente y regularidad

### Tabla: expediente_materias

**Para qué sirve:** Registro oficial cerrado de una materia cursada — snapshot de nota final, créditos y condición, independiente de futuras ediciones al pensum o a `Puntaje`.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id, not null | |
| oferta_materia_id | Integer | FK → ofertas_materia.id, not null | Intento concreto (período+profesor), no `materia_id` directo — mismo criterio que `Puntaje`/`Asistencia` |
| nota_final | Numeric(5,2) | not null | Snapshot, calculado con `_calcular_promedio_final` al momento del cierre |
| creditos | Integer | not null | Snapshot de `pensum_materias.creditos` al momento del cierre |
| condicion | String(20) | not null, CHECK IN ('aprobada','reprobada') como `ck_expediente_condicion` | `nota_final >= 6` → `aprobada` |
| cerrado_por | Integer | FK → users.id, not null | Admin que cerró (auditoría) |
| cerrado_en | DateTime(tz) | server_default now() | |

`UniqueConstraint(alumno_id, oferta_materia_id)` como `uq_expediente_alumno_oferta` — un cierre por alumno por oferta; rectificar una nota es un segundo `POST /expediente/cerrar-materia` que actualiza esta fila (upsert), no crea una nueva.

**Archivo:** `app/models/expediente_materia.py`

---

### Tabla: expediente_semestres

**Para qué sirve:** Caché de agregación por alumno+período (PPA del período, créditos, cantidad de aprobadas/reprobadas). Derivado de `expediente_materias`, no fuente de verdad — recalculable. Se recalcula y persiste en cada `GET /expediente/alumno/{id}`.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id, not null | |
| periodo | String(10) | not null | Formato `'YYYY-N'`, ej. `'2026-1'` |
| ppa_periodo | Numeric(5,2) | nullable | PPA solo de las aprobadas de ese período |
| creditos_periodo | Integer | not null, default 0 | |
| materias_aprobadas | Integer | not null, default 0 | |
| materias_reprobadas | Integer | not null, default 0 | |

`UniqueConstraint(alumno_id, periodo)` como `uq_expediente_semestre_alumno_periodo`.

**Archivo:** `app/models/expediente_semestre.py`

---

### Tabla: regularidad_alumno

**Para qué sirve:** Snapshot cacheado del estado de regularidad del alumno, recalculado por `services/expediente.py::calcular_regularidad` — no editar a mano.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id, not null, UNIQUE | |
| estado | String(20) | not null, CHECK IN ('activo','en_riesgo','irregular','de_baja') como `ck_regularidad_estado` | Ver `ARQUITECTURA.md` para la lógica y precedencia |
| ppa_acumulado | Numeric(5,2) | nullable | Snapshot de `calcular_ppa()` al momento del cálculo |
| motivo | String(255) | nullable | Texto human-readable (ej. `"PPA 6.5 < 7.0"`) |
| calculado_en | DateTime(tz) | server_default now(), onupdate now() | |

**Archivo:** `app/models/regularidad_alumno.py`

---

## 4. Contenido y comunicación

### Tabla: apuntes

**Para qué sirve:** Apuntes/biblioteca digital subidos por alumnos, por materia (storage en R2).

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| user_id | Integer | FK → users.id ON DELETE CASCADE, not null | |
| materia_id | Integer | FK → materias.id, not null | |
| titulo | String(200) | not null | |
| descripcion | Text | nullable | |
| archivo_url | Text | nullable | legacy |
| storage_key | Text | nullable | R2 actual |
| tags | Text | nullable | comma-separated |
| aprobado | Boolean | nullable, default false | ver nota de seguridad abajo |
| tipo_contenido | String(50) | nullable, default `pdf` | |
| likes | Integer | nullable, default 0 | |
| descargas | Integer | nullable, default 0 | |
| visibilidad | String(20) | nullable, default `publico` | |
| fecha_subida | DateTime(tz) | server_default now() | |

RLS habilitada en Postgres. FK `user_id` con `ondelete='CASCADE'` agregado en migración `b42cc57fda33` (antes sin acción explícita).

**Archivo:** `app/models/apunte.py`

**Decisión de diseño — mass-assignment en `aprobado`:** commit reciente (`9a6e0bd`) cerró un hueco de seguridad donde el schema de creación/edición permitía que un alumno seteara `aprobado=true` directamente al crear/editar su propio apunte (autoaprobación). El campo debe ser escribible solo por el flujo de aprobación de un rol con permiso, no por el dueño del recurso. <!-- TODO: verificar el schema/endpoint puntual tras el fix para confirmar el mecanismo final (campo excluido del schema de input vs. chequeo de rol explícito) -->

---

### Tabla: programas

**Para qué sirve:** Programa/temario semanal de una materia (contenido curricular, no confundir con la entidad `Materia`).

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| materia_id | Integer | FK → materias.id, not null | |
| semana | Integer | not null | |
| titulo | String(200) | not null | |
| descripcion | Text | nullable | |

**Archivo:** `app/models/programa.py`

**Decisión de diseño — ex `temarios`:** esta tabla fue renombrada de `temarios` a `programas` (migración `rename_temarios_to_programas`). La versión previa de este documento describía una tabla `temarios` con campo `bibliografia` (JSON) separada de `programas`; **ese modelo (`app/models/temario.py`) ya no existe en el código** — no hay archivo `temario.py` en `app/models/`, y la migración `b42cc57fda33` documenta explícitamente que el drop de la tabla `temarios` fue removido de su script porque "la tabla ya no existe con ese nombre". El campo `bibliografia` no aparece en `Programa`. <!-- TODO: verificar si la bibliografía se perdió en el rename o si vive en otro lugar (ej. columna JSON agregada después) — no se encontró en el modelo actual -->

---

### Tabla: foro_hilos

**Para qué sirve:** Hilo de discusión del foro de una materia.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| materia_id | Integer | FK → materias.id, not null | |
| titulo | String(200) | not null | |
| descripcion | Text | nullable | |
| creado_por | Integer | FK → users.id, not null | |
| fijado | Boolean | nullable, default false | |
| cerrado | Boolean | nullable, default false | |
| created_at | DateTime(tz) | server_default now() | |

**Archivo:** `app/models/foro.py`

---

### Tabla: foro_mensajes

**Para qué sirve:** Mensaje dentro de un hilo del foro.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| hilo_id | Integer | FK → foro_hilos.id, not null | |
| user_id | Integer | FK → users.id, not null | |
| contenido | Text | not null | |
| created_at | DateTime(tz) | server_default now() | |

Sin `updated_at` — la edición (Fase 1.2) sobreescribe `contenido` directo, ventana de 15 min validada contra `created_at`.

**Archivo:** `app/models/foro.py`

---

### Tabla: eventos_calendario

**Para qué sirve:** Eventos de calendario académico (parciales, feriados, entregas), globales o por materia/carrera.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| titulo | String(200) | not null | |
| tipo | String(20) | not null | `parcial`\|`final`\|`feriado`\|`asueto`\|`entrega`\|`actividad` |
| fecha | Date | not null | |
| fecha_fin | Date | nullable | |
| materia_id | Integer | FK → materias.id, nullable | `null` = institucional |
| carrera_id | Integer | FK → carreras.id, nullable | |
| descripcion | Text | nullable | |
| creado_por | Integer | FK → users.id ON DELETE SET NULL, nullable | |
| anio | Integer | nullable | |
| semestre | Integer | nullable | |
| archivo_pdf | Text | nullable | |
| hora | String(5) | nullable | formato `HH:MM` 24h, agregado migración `w1x2y3z4a5b6` |
| ubicacion | String(200) | nullable | ej. "Aula 203", agregado migración `w1x2y3z4a5b6` |

**Archivo:** `app/models/evento_calendario.py`

---

### Tabla: recordatorios_docente

**Para qué sirve:** Recordatorios personales de un profesor (agenda propia, no visible a otros roles). Fase 1 — Agenda docente.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| profesor_id | Integer | FK → users.id ON DELETE CASCADE, not null | |
| titulo | String(200) | not null | |
| descripcion | Text | nullable | |
| fecha | DateTime(tz) | not null | |
| materia_id | Integer | FK → materias.id, nullable | |
| completado | Boolean | nullable, default false | |

**Archivo:** `app/models/recordatorio_docente.py`

---

## 5. Autenticación y seguridad

### Tabla: refresh_tokens

**Para qué sirve:** Refresh token hasheado (nunca el crudo) por usuario, rotado en cada uso, revocable.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| usuario_id | Integer | FK → users.id ON DELETE CASCADE, not null | |
| token_hash | String(64) | not null, UNIQUE | SHA-256 del token crudo |
| expira_en | DateTime(tz) | not null | |
| revocado | Boolean | nullable, default false | |
| created_at | DateTime(tz) | server_default now() | |

**Archivo:** `app/models/refresh_token.py`

---

### Tabla: password_reset_tokens

**Para qué sirve:** Token de un solo uso para reset de contraseña (hash, no el token crudo; expiry 1h). Parte del fix de seguridad ISSUE-2.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| usuario_id | Integer | FK → users.id ON DELETE CASCADE, not null | |
| token_hash | String(64) | not null, UNIQUE, index | |
| expires_at | DateTime(tz) | not null | |
| used | Boolean | nullable, default false | |
| created_at | DateTime(tz) | | |

**Archivo:** `app/models/password_reset_token.py`

---

### Tabla: token_blacklist

**Para qué sirve:** Access tokens (JWT) revocados por `jti` antes de su expiración natural (logout). Parte del fix ISSUE-11.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| jti | String(64) | not null, UNIQUE, index | |
| expires_at | DateTime(tz) | not null, index | |
| revoked_at | DateTime(tz) | | |

Consultado en `dependencias.py::get_current_user` en cada request autenticado.

**Archivo:** `app/models/token_blacklist.py`

---

### Tabla: audit_log

**Para qué sirve:** Log de auditoría genérico — eventos de seguridad y cambios sensibles (reset de contraseña, login/logout, fallos de token, etc.). Append-only por convención: no expone endpoints de update/delete.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| evento | String(100) | not null, index | |
| usuario_id | Integer | FK → users.id ON DELETE SET NULL, nullable | |
| usuario | String(120) | nullable | denormalizado (username/nombre en el momento del evento, sobrevive borrado del usuario) |
| ip | String(64) | nullable | |
| detalle | Text | nullable | |
| timestamp | DateTime(tz) | index, default now (aplicación) | |

Índice compuesto `ix_audit_log_evento_usuario` (evento, usuario_id).

**Archivo:** `app/models/audit_log.py`

**Nota de seguridad general (RLS):** la migración `63005e9acb85` habilita PostgreSQL Row-Level Security sobre `puntajes`, `asistencias`, `apuntes` e `inscripciones` — las 4 tablas con datos personales de alumnos — con una política permisiva para el usuario de la app (`sa_user`/`POSTGRES_USER`). Es no-op en SQLite (dev); bloquea acceso directo de cualquier otro rol de base de datos que no sea el de la aplicación.

---

## 6. Configuración

### Tabla: global_settings

**Para qué sirve:** Configuración global editable por admin (key/value tipado).

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| key | String(100) | PK | |
| value | Text | nullable | |
| tipo | String(20) | not null, default `string` | |
| categoria | String(50) | not null, default `general` | |
| descripcion | Text | nullable | |
| editable | Boolean | default true | |
| updated_at | DateTime(tz) | server_default now(), onupdate now() | |
| updated_by | Integer | FK → users.id, nullable | |

**Archivo:** `app/models/global_settings.py`

---

### Tabla: setting_audit_log

**Para qué sirve:** Log de auditoría de cambios sobre `global_settings` (quién cambió qué, de qué valor a qué valor).

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| setting_key | String(100) | FK → global_settings.key, not null | |
| old_value | Text | nullable | |
| new_value | Text | nullable | |
| changed_by | Integer | FK → users.id, not null | |
| changed_at | DateTime(tz) | server_default now(), index | |
| reason | Text | nullable | |

**Archivo:** `app/models/global_settings.py`

---

## 7. Financiero y becas

Todos los montos monetarios usan `Numeric(12,2)` — regla explícita en el docstring de `financiero.py`, nunca `Float`.

### Tabla: fuentes_beca

**Para qué sirve:** Catálogo de fuentes de becas (institucional o convenio externo — ITAIPU, BECAL, Fundasep). Sembrada con 4 filas en la migración `s6t7u8v9w0x1`.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| nombre | String(150) | not null, UNIQUE | |
| tipo | String(80) | not null | `institucional` \| `convenio_externo` |
| es_externa | Boolean | not null, default false | Determina badge visual (🏦 vs 🎓) en frontend |
| requiere_reporte_externo | Boolean | not null, default false | Fuentes externas exportan rendición Excel para el convenio |
| editable_porcentaje | Boolean | not null, default true | Si es false (convenios), el % de descuento es fijo por el proveedor, no editable en UI |

**Archivo:** `app/models/financiero.py`

---

### Tabla: becas_catalogo

**Para qué sirve:** Catálogo de becas disponibles (nombre, % de descuento, cupos).

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| nombre | String(200) | not null | |
| fuente_id | Integer | FK → fuentes_beca.id ON DELETE CASCADE, not null | |
| porcentaje_descuento | Numeric(5,2) | not null, CHECK 0-100 (`ck_beca_porcentaje_rango`) | |
| monto_fijo | Numeric(12,2) | nullable | Alternativa a porcentaje (no usada actualmente en el cálculo) |
| requisitos | Text | nullable | |
| cupos_totales | Integer | nullable | |
| cupos_disponibles | Integer | nullable | |

**Archivo:** `app/models/financiero.py`

---

### Tabla: postulaciones_beca

**Para qué sirve:** Solicitud de un alumno a una beca del catálogo, con flujo de revisión por comité.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id, not null | |
| beca_id | Integer | FK → becas_catalogo.id ON DELETE CASCADE, not null | |
| estado | String(20) | not null, default `pendiente`, CHECK IN ('pendiente','en_revision','aprobada','rechazada') (`ck_postulacion_estado`) | |
| fecha_postulacion | DateTime(tz) | | |
| documentos_storage_keys | JSON | nullable | Keys en R2 de documentos adjuntos |
| motivo_rechazo | Text | nullable | |
| revisado_por | Integer | FK → users.id ON DELETE SET NULL, nullable | |
| revisado_en | DateTime(tz) | nullable | |

**Archivo:** `app/models/financiero.py`

---

### Tabla: becas_activas

**Para qué sirve:** Beca efectivamente otorgada a un alumno (tras aprobar postulación), con vigencia y seguimiento de rendimiento académico para renovación.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id, not null | |
| beca_id | Integer | FK → becas_catalogo.id ON DELETE CASCADE, not null | |
| fuente_id | Integer | FK → fuentes_beca.id, not null | Denormalizado para reportes de rendición |
| periodo_inicio | String(10) | not null | |
| periodo_fin | String(10) | nullable | |
| promedio_minimo_requerido | Numeric(5,2) | nullable | |
| promedio_actual | Numeric(5,2) | nullable | |
| estado_renovacion | String(30) | not null, default `vigente`, CHECK IN ('vigente','en_riesgo','suspendida','finalizada') (`ck_beca_activa_estado`) | Solo `vigente` cuenta para el cálculo de descuento |
| otorgado_por | Integer | FK → users.id ON DELETE SET NULL, nullable | |
| otorgado_en | DateTime(tz) | | |

**Archivo:** `app/models/financiero.py`

**Decisión de diseño — multi-beca:** un alumno puede tener varias `BecaActiva` vigentes simultáneamente. `calcular_descuento_beca()` (`app/services/financiero.py`) aplica el **mayor** porcentaje entre todas las vigentes (`max()`, no suma) — evita que acumular becas supere el 100% del arancel. `Cuota.beca_aplicada_id` referencia una sola `BecaActiva` (la ganadora), no una lista.

---

### Tabla: conceptos_arancel

**Para qué sirve:** Catálogo de conceptos facturables (ej. "Cuota Mensual Ingeniería").

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| nombre | String(200) | not null | |
| carrera_id | Integer | FK → carreras.id, nullable | Null = aplica a cualquier carrera |
| monto_base | Numeric(12,2) | not null | |
| periodicidad | String(80) | not null, default `mensual` | mensual / semestral / anual / unica |
| activo | Boolean | not null, default true | |

**Archivo:** `app/models/financiero.py`

---

### Tabla: cuotas

**Para qué sirve:** Cuota generada para un alumno a partir de un concepto, con el descuento de beca ya aplicado.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id, not null | |
| concepto_id | Integer | FK → conceptos_arancel.id ON DELETE CASCADE, not null | |
| periodo | String(10) | not null | |
| monto | Numeric(12,2) | not null | Monto original del concepto |
| monto_descuento | Numeric(12,2) | not null, default 0 | Calculado con `calcular_descuento_beca()` al generar |
| fecha_vencimiento | Date | not null | |
| estado | String(20) | not null, default `pendiente`, CHECK IN ('pendiente','pagada','vencida','anulada') (`ck_cuota_estado`) | |
| beca_aplicada_id | Integer | FK → becas_activas.id, nullable | La beca ganadora (mayor %) al momento de generar |
| generado_en | DateTime(tz) | | |
| generado_por | Integer | FK → users.id ON DELETE SET NULL, nullable | |

`monto_a_pagar` (`monto - monto_descuento`) se calcula en `cuota_to_out()`, no persiste como columna.

**Archivo:** `app/models/financiero.py`

---

### Tabla: pagos

**Para qué sirve:** Registro de un pago sobre una cuota. **Inmutable** — no existe endpoint PUT/DELETE; correcciones se hacen con un pago nuevo `es_ajuste=True` referenciando el original.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| cuota_id | Integer | FK → cuotas.id ON DELETE CASCADE, not null | |
| monto_pagado | Numeric(12,2) | not null | |
| fecha_pago | DateTime(tz) | | |
| metodo | String(50) | not null | transferencia / efectivo / cheque / tarjeta / deposito |
| referencia | String(200) | nullable | |
| registrado_por | Integer | FK → users.id, not null | |
| pago_ajuste_ref_id | Integer | FK → pagos.id (auto-referencia), nullable | Apunta al pago original que corrige |
| es_ajuste | Boolean | not null, default false | |
| nota_ajuste | Text | nullable | |

Un pago que cubre el saldo (`monto - monto_descuento`) marca la `Cuota.estado` como `pagada` (`registrar_pago()` en `app/services/financiero.py`); soporta pagos parciales.

**Archivo:** `app/models/financiero.py`

---

### Tabla: comprobantes

**Para qué sirve:** Referencia al comprobante fiscal (factura electrónica) de un pago. Fase 4 creó la tabla mínima; **Fase 4B** (migración `t7u8v9w0x1y2`) la extendió con el ciclo de vida completo de emisión vía guarani.app.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| pago_id | Integer | FK → pagos.id ON DELETE CASCADE, not null, UNIQUE | Un comprobante por pago |
| tipo | String(20) | not null, default `factura` | factura / nota_credito / nota_debito / remision (solo `factura` implementado) |
| numero_comprobante | String(50) | nullable | Devuelto por guarani.app |
| cdc | String(44) | nullable | Código de Control DNIT (44 dígitos exactos) |
| timbrado | String(20) | nullable | agregado Fase 4B |
| url_pdf | String(500) | nullable | agregado Fase 4B — URL del PDF servido por guarani.app, UCA V2 no almacena el archivo |
| storage_key | String(500) | nullable | Vestigial de Fase 4 — sin uso; el PDF vive en guarani.app, no en R2 |
| estado_emision | String(20) | not null, default `pendiente`, CHECK IN ('pendiente','emitido','error','reintentando') (`ck_comprobante_estado_emision`) | agregado Fase 4B |
| intentos | Integer | not null, default 0 | agregado Fase 4B — incrementado en cada intento de emisión; tope 5 (`MAX_INTENTOS` en `facturacion_electronica.py`) |
| ultimo_error | Text | nullable | agregado Fase 4B — mensaje de la última excepción, visible en panel admin |
| fecha_emision | DateTime(tz) | nullable | Fase 4B cambió a nullable (antes se seteaba al crear; ahora solo al emitir con éxito) |

**Archivo:** `app/models/financiero.py`

**Decisión de diseño — degradación con gracia:** un fallo de guarani.app (timeout, HTTP error, credenciales faltantes) nunca revierte ni bloquea el `Pago` — el comprobante queda en `error` y se reintenta (endpoint manual o job cada 10 min, máx. 5 intentos). Ver `ARQUITECTURA.md`.

---

### Tabla: auditoria_override_mora

**Para qué sirve:** Registro de auditoría cuando un admin usa `override_mora=true` para inscribir a un alumno bloqueado por mora.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id, not null | |
| admin_id | Integer | FK → users.id, not null | |
| oferta_materia_id | Integer | FK → ofertas_materia.id, nullable | |
| motivo | Text | nullable | |
| registrado_en | DateTime(tz) | | |

**Archivo:** `app/models/financiero.py`

---

### Tabla: pagos_online

**Para qué sirve:** Pago iniciado por gateway online (Stripe Checkout). No documentada en la versión previa de este archivo.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| cuota_id | Integer | FK → cuotas.id, not null | |
| alumno_id | Integer | FK → users.id, not null | |
| monto | Numeric(12,2) | not null | |
| transaction_id | String(100) | UNIQUE, nullable | |
| stripe_session_id | String(500) | nullable | agregado migración `61880be1d112` (posterior a la creación de la tabla en `c6d7e8f9g0h1`) |
| estado | String(20) | not null, default `pendiente` | <!-- TODO: verificar valores válidos — no hay CheckConstraint en el modelo, solo se puede confirmar leyendo services/pagos_online o el router --> |
| gateway_url | String(500) | nullable | |
| gateway_response | JSON | nullable | Respuesta cruda del gateway (Stripe) |
| creado_en | DateTime(tz) | | |
| confirmado_en | DateTime(tz) | nullable | |

**Archivo:** `app/models/financiero.py`

---

## 8. Trámites

### Tabla: tipos_tramite

**Para qué sirve:** Catálogo fijo de trámites disponibles. Sembrado con 4 filas en la migración `u8v9w0x1y2z3`.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| nombre | String(200) | not null, UNIQUE | Usado como clave de dispatch para el generador de PDF automático (ver Decisión de diseño) |
| descripcion | Text | nullable | |
| requiere_aprobacion | Boolean | not null, default false | `false` = intenta generación automática al solicitar; `true` = queda `pendiente` para resolución manual del admin |
| dias_estimados | Integer | nullable | Informativo, no aplica lógica sobre plazos |

Índice `ix_tipos_tramite_id` (migración `b42cc57fda33`).

**Archivo:** `app/models/tramites.py`

**Decisión de diseño:** no hay columna `codigo`/slug — el servicio (`app/services/tramites.py`, dict `_GENERADORES_AUTO`) hace *dispatch* del generador de PDF por `nombre` exacto. Catálogo fijo sembrado por migración, sin endpoint de edición; si se agrega un endpoint para editar `nombre` en el futuro, este dispatch se rompe silenciosamente — revisar `_GENERADORES_AUTO` primero.

---

### Tabla: solicitudes

**Para qué sirve:** Solicitud de un alumno para un trámite del catálogo, con su ciclo de resolución (automática o manual).

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id, not null | |
| tipo_tramite_id | Integer | FK → tipos_tramite.id ON DELETE CASCADE, not null | |
| estado | String(20) | not null, default `pendiente`, CHECK IN ('pendiente','en_proceso','resuelta','rechazada') (`ck_solicitud_estado`) | |
| fecha_solicitud | DateTime(tz) | agregada explícitamente en migración `a22743f21549` | |
| fecha_resolucion | DateTime(tz) | nullable | Seteada tanto en auto-resolución como en resolución manual |
| resuelto_por | Integer | FK → users.id ON DELETE SET NULL, nullable | `null` si la solicitud se auto-resolvió (nadie la resolvió manualmente) |
| storage_key_resultado | String(500) | nullable | Key en R2 (prefix `tramite`) del PDF resultante |
| motivo_rechazo | Text | nullable | Solo poblado si `estado='rechazada'` |

Índice `ix_solicitudes_id` (migración `b42cc57fda33`).

**Archivo:** `app/models/tramites.py`

**Decisión de diseño:** trámites automáticos (`tipos_tramite.requiere_aprobacion=false` y con generador en `_GENERADORES_AUTO`) se resuelven de forma **síncrona** dentro de `POST /tramites/solicitudes` — no hay llamada externa de por medio (a diferencia de Fase 4B/guarani.app), así que no hace falta background task ni job de reintentos. Si el alumno no está en estado `activo` (`calcular_regularidad()` de Fase 3), la solicitud automática se rechaza con `ValueError` (422) en vez de crearse en `pendiente`.

---

## 9. Graduación

Fase 5B. Tres tablas nuevas no presentes en la versión previa de este documento.

### Tabla: procesos_graduacion

**Para qué sirve:** Proceso de graduación de un alumno (trámite de tesis + verificación de solvencia).

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id, not null | |
| fecha_inicio | DateTime(tz) | | |
| estado | String(20) | not null, default `en_proceso`, CHECK IN ('en_proceso','tesis_en_curso','tesis_aprobada','graduado','rechazado') (`ck_proceso_graduacion_estado`) | |
| tutor_id | Integer | FK → users.id ON DELETE SET NULL, nullable | |

**Archivo:** `app/models/graduacion.py`

---

### Tabla: etapas_tesis

**Para qué sirve:** Etapa individual dentro de un proceso de graduación (plan de trabajo, defensa, etc.).

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| proceso_id | Integer | FK → procesos_graduacion.id, not null | |
| nombre_etapa | String(200) | not null | |
| fecha_limite | Date | nullable | |
| estado | String(20) | not null, default `pendiente`, CHECK IN ('pendiente','en_curso','aprobada','rechazada') (`ck_etapa_tesis_estado`) | |
| observaciones | Text | nullable | |

**Archivo:** `app/models/graduacion.py`

---

### Tabla: verificacion_solvencia

**Para qué sirve:** Chequeo de solvencia financiera y bibliotecaria requerido para completar la graduación.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| proceso_id | Integer | FK → procesos_graduacion.id, not null | |
| solvencia_financiera | Boolean | not null, default false | <!-- TODO: verificar si se cruza automáticamente con `cuotas`/`auditoria_override_mora` o es marcado manual por admin — no se encontró en el modelo, revisar services/graduacion.py --> |
| solvencia_biblioteca | Boolean | not null, default false | |
| fecha_verificacion | DateTime(tz) | | |

**Archivo:** `app/models/graduacion.py`

---

## 10. Pasantías

Fase 5C. Tres tablas nuevas no presentes en la versión previa de este documento.

### Tabla: empresas_receptoras

**Para qué sirve:** Empresa donde un alumno puede realizar una pasantía, con convenio institucional o no.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| nombre | String(200) | not null, UNIQUE | |
| rubro | String(100) | nullable | |
| contacto | String(150) | nullable | |
| telefono | String(30) | nullable | |
| email | String(200) | nullable | |
| convenio_activo | Boolean | not null, default false | |

**Archivo:** `app/models/pasantia.py`

---

### Tabla: pasantias

**Para qué sirve:** Pasantía de un alumno en una empresa receptora, con tutor académico y seguimiento de horas.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id, not null | |
| empresa_id | Integer | FK → empresas_receptoras.id ON DELETE CASCADE, not null | |
| tutor_academico_id | Integer | FK → users.id ON DELETE SET NULL, nullable | |
| fecha_inicio | Date | not null | |
| fecha_fin | Date | nullable | |
| horas_requeridas | Integer | not null | |
| horas_completadas | Integer | not null, default 0 | |
| estado | String(20) | not null, default `pendiente`, CHECK IN ('pendiente','en_curso','completada','rechazada') (`ck_pasantia_estado`) | |
| motivo_rechazo | Text | nullable | |
| created_at | DateTime(tz) | agregado explícitamente en migración `c0e2c42a4b9d` (`add_created_at_to_pasantias`) | |

Propiedades de solo lectura (no columnas): `empresa_nombre`, `tutor_nombre`, `alumno_nombre` (derivadas de las relaciones). `motivo_rechazo` agregado en migración `m6m6m6m6m6m6`.

**Archivo:** `app/models/pasantia.py`

---

### Tabla: informes_pasantia

**Para qué sirve:** Documento entregado durante una pasantía (plan de trabajo, informe parcial, informe final).

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| pasantia_id | Integer | FK → pasantias.id ON DELETE CASCADE, not null | |
| tipo | String(30) | not null, CHECK IN ('plan_trabajo','informe_parcial','informe_final') (`ck_informe_tipo`) | |
| storage_key | String(500) | nullable | |
| fecha_entrega | DateTime(tz) | | |

**Archivo:** `app/models/pasantia.py`

---

## 11. Equivalencias y suficiencia

Fase 5D. Tres tablas nuevas no presentes en la versión previa de este documento.

### Tabla: solicitudes_equivalencia

**Para qué sirve:** Solicitud de un alumno para que se le reconozcan materias cursadas en otra institución (equivalencia) o para rendir directo una materia sin cursarla (convalidación).

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id, not null | |
| tipo | String(30) | not null, CHECK IN ('equivalencia','convalidacion') (`ck_solicitud_equivalencia_tipo`) | |
| universidad_origen | String(200) | nullable | |
| estado | String(20) | not null, default `pendiente`, CHECK IN ('pendiente','en_proceso','resuelta','rechazada') (`ck_solicitud_equivalencia_estado`) | |
| created_at | DateTime(tz) | | |

**Archivo:** `app/models/equivalencia.py`

---

### Tabla: equivalencias_materia

**Para qué sirve:** Detalle por materia de una solicitud de equivalencia (una solicitud puede cubrir varias materias de la carrera de origen).

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| solicitud_id | Integer | FK → solicitudes_equivalencia.id ON DELETE CASCADE, not null | |
| materia_origen_nombre | String(200) | not null | Nombre libre — la materia de origen no existe en el catálogo propio |
| materia_destino_id | Integer | FK → materias.id, nullable | Materia del catálogo propio a la que se homologa |
| programa_analitico_storage_key | String(500) | nullable | Adjunto en R2 del programa analítico de la materia de origen |
| resolucion | String(30) | nullable, CHECK IN ('aprobada','rechazada','pendiente') (`ck_equivalencia_resolucion`) | |

**Archivo:** `app/models/equivalencia.py`

---

### Tabla: examenes_suficiencia

**Para qué sirve:** Examen de suficiencia rendido por un alumno para aprobar directamente una materia sin cursarla.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id, not null | |
| materia_id | Integer | FK → materias.id, not null | |
| fecha | Date | not null | |
| resultado | String(20) | nullable, CHECK IN ('aprobado','reprobado','pendiente') (`ck_examen_suficiencia_resultado`) | |

**Archivo:** `app/models/equivalencia.py`

---

## 12. Notificaciones

### Tabla: suscripciones_push

**Para qué sirve:** Suscripción Web Push de un usuario para recibir notificaciones del navegador.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| user_id | Integer | FK → users.id ON DELETE CASCADE, not null | |
| endpoint | String(500) | not null | URL del endpoint push del navegador/proveedor |
| p256dh | String(200) | not null | Clave pública de cifrado (VAPID) |
| auth | String(200) | not null | Secreto de autenticación |
| user_agent | String(300) | nullable | |
| created_at | DateTime(tz) | | |

**Archivo:** `app/models/financiero.py` (pese al nombre del archivo — ver nota abajo)

**Nota:** `SuscripcionPush` y `PagoOnline` viven en `financiero.py` aunque no son conceptualmente financieras; ambas se agregaron juntas en la migración `c6d7e8f9g0h1_pagos_online_suscripciones_push`. <!-- TODO: verificar si vale la pena moverlas a un archivo propio (ej. notificaciones.py) en un refactor futuro -->

---

## Diagrama de dependencias (FK, alto nivel)

```
carreras ← materias ← ofertas_materia ← inscripciones
                    ↖                 ↖ puntajes
                     ↖                ↖ asistencias
                      pensum_materias ← avance_alumno_pensum
                      correlatividades (auto-referencia a materias)
                      ofertas_materia ← expediente_materias
                      materias ← horarios, programas, foro_hilos, eventos_calendario,
                                 examenes, pesos_evaluacion, equivalencias_materia (destino),
                                 examenes_suficiencia

users ← refresh_tokens, password_reset_tokens, recordatorios_docente, foro_hilos,
        foro_mensajes, apuntes, expediente_materias, expediente_semestres,
        regularidad_alumno, examenes (profesor), inscripciones_examen,
        audit_log (SET NULL), global_settings/setting_audit_log

fuentes_beca ← becas_catalogo ← postulaciones_beca
                              ← becas_activas → cuotas.beca_aplicada_id
carreras ← conceptos_arancel ← cuotas ← pagos ← comprobantes
cuotas ← pagos_online
users ← becas_activas, cuotas, pagos, comprobantes (vía pagos), auditoria_override_mora,
        pagos_online, suscripciones_push

tipos_tramite ← solicitudes
users ← procesos_graduacion ← etapas_tesis, verificacion_solvencia
empresas_receptoras ← pasantias ← informes_pasantia
users ← solicitudes_equivalencia ← equivalencias_materia (+ materias destino)
materias ← examenes_suficiencia
```

## Nota de integridad (drift histórico, ya resuelto)

`materias` y varias tablas de Fase 0 fueron creadas originalmente vía `Base.metadata.create_all()`, no por Alembic — causó un drift real entre el constraint del modelo (`uq_materia_nombre_carrera`) y el schema de Postgres (`materias_nombre_key`, solo sobre `nombre`). Corregido en migración `o2p3q4r5s6t7`. Toda tabla desde entonces se crea exclusivamente vía revisión Alembic.

## Seguridad a nivel de base de datos (RLS)

La migración `63005e9acb85` habilita Row-Level Security en PostgreSQL sobre `puntajes`, `asistencias`, `apuntes` e `inscripciones` (las tablas con datos personales de alumnos más consultadas), con una única política permisiva otorgando acceso total al usuario de aplicación (`sa_user`). No protege contra la propia aplicación con lógica de autorización rota (para eso están las verificaciones de rol en cada router) — protege contra acceso directo a la base con otras credenciales. No-op en SQLite.
