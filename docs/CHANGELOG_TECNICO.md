# Changelog Técnico — Sistema Académico UCA V2

> Orden cronológico inverso (más reciente primero). Cubre Fase 0, Fase 1, Fase 2 y Fase 3 — todas cerradas.

---

## Fase 3 (backend + frontend) — Expediente académico consolidado (2026-07-08) — COMPLETA

**Qué se hizo:** Registro oficial cerrado de materias cursadas (`ExpedienteMateria`), PPA ponderado por créditos (`calcular_ppa`), clasificador de regularidad del alumno (`calcular_regularidad`: activo/en_riesgo/irregular/de_baja) y 4 endpoints nuevos bajo `/expediente`.

**Archivos tocados:**
- `app/models/expediente_materia.py`, `expediente_semestre.py`, `regularidad_alumno.py` — nuevos
- `app/services/expediente.py` — `calcular_ppa`, `calcular_regularidad`, constantes `PPA_UMBRAL_RIESGO=7.0`, `ASISTENCIA_UMBRAL_RIESGO=75`, `PLAZO_RECURSAR_PERIODOS=2`, `PERIODOS_INACTIVIDAD_BAJA=3`
- `app/routers/expediente_router.py` — nuevo, prefix `/expediente`, reutiliza `_calcular_promedio_final`/`PESOS` de `puntajes_router.py`
- `app/schemas/expediente_schema.py` — nuevo
- `alembic/versions/r5s6t7u8v9w0_create_expediente_regularidad.py` — nueva migración (head), **aplicada en `neondb` y `neondb_test2`** (ver nota de cierre abajo)
- `alembic/env.py` — agregados imports de modelos Fase 2/3 faltantes (`pensum_materia`, `correlatividad`, `avance_alumno_pensum`, `expediente_*`) para que `--autogenerate` los detecte
- `tests/test_expediente.py`, `test_expediente_router.py` — nuevos, 20 tests

**Decisión de diseño destacada:** `PPA_UMBRAL_RIESGO=7.0`, no `6.0` — ver `ARQUITECTURA.md`. Un umbral igual a la nota de corte de aprobación nunca puede dispararse (el PPA solo promedia aprobadas, todas `>=6`).

**Tests:** 137 passed, 4 skipped (los 4 de `test_postgres_compat.py`, infra — ver nota abajo). Antes de esta entrada: 117 passed, 4 skipped.

### Frontend — Expediente académico UI

**Qué se hizo:** Vista de alumno (PPA, regularidad, historial cerrado por período) y panel de admin (buscar alumno, cerrar materia, consultar expediente/regularidad de cualquier alumno), unificados en una sola ruta `/expediente` que branchea por rol.

**Archivos tocados:**
- `frontend/src/services/expedienteService.ts` — nuevo, cliente 1:1 sobre los 4 endpoints `/expediente`
- `frontend/src/pages/ExpedienteAlumno.tsx`, `ExpedienteAdmin.tsx`, `Expediente.tsx` — nuevos
- `frontend/src/App.tsx` — ruta `/expediente` (`rolesPermitidos: ['admin','alumno']`)
- `frontend/src/components/Layout.tsx` — item de menú "Expediente"→`/puntajes` renombrado a "Calificaciones" (`menuAlumno`, `bottomNavByRole.alumno`); item nuevo "Expediente"→`/expediente` agregado a `menuAlumno` y `menuAdmin`

**Decisiones destacadas** (detalle en `ARQUITECTURA.md`): colisión de nombres con el menú existente resuelta por renombrado; `oferta_materia_id` para cerrar materia se resuelve filtrando `GET /inscripciones/` client-side (sin endpoint nuevo).

**Verificación visual (2026-07-08, sesión de cierre):** login admin y alumno en browser contra `neondb`. `ExpedienteAdmin` — búsqueda de alumno, badge de regularidad, estados vacíos, todo correcto. `ExpedienteAlumno` — PPA `—` (null), badge "ACTIVO", estado vacío correcto. Menú confirma "Calificaciones"/"Expediente" separados. Flujo completo de `cerrar-materia` no ejecutado en vivo (hubiera requerido fabricar datos de alumno sin autorización) — cubierto por los 20 tests de backend.

### Fix colateral — `test_postgres_compat.py` ya no falla en `ERROR` si Neon está caído

`pg_engine` (fixture module-scope) ahora hace un `SELECT 1` de sondeo antes de `create_all()`; si falla, `pytest.skip()` explícito con motivo en vez de propagar la excepción como `ERROR`. Se re-habilita solo cuando el endpoint vuelva a responder, sin tocar el test.

### Cierre — migración aplicada en `neondb` vía `alembic stamp` (drift de `create_all()`)

Tercer intento de reconexión a `neondb_test` falló (3 sesiones seguidas). Con autorización explícita del usuario se aplicó la migración directo en `neondb`. `alembic upgrade head` chocó con `DuplicateTable` en `expediente_materias` — las 3 tablas ya existían, creadas por el fallback `Base.metadata.create_all()` de `app/main.py` (corre en cada arranque del backend, se disparó en sesiones anteriores al levantar el servidor para verificar Fase 2). Verificado columna por columna y constraint por constraint (`information_schema.columns` + `pg_constraint`) que el schema de `create_all()` coincide exactamente con el de la migración — se usó `alembic stamp head` en vez de recrear tablas. `neondb` confirmado en `r5s6t7u8v9w0`.

**Resolución de infra:** Se creó una nueva branch en Neon (`neondb_test2`) con auto-suspensión desactivada (Never). `TEST_DATABASE_URL` actualizada en `.env.test`. `alembic upgrade head` ejecutado contra la nueva branch — `alembic current` confirma `r5s6t7u8v9w0 (head)`. Tests de compatibilidad Postgres pueden volver a correr contra `neondb_test2` sin restricción.

---

## Fase 2 (frontend) — Malla curricular UI (2026-07-07) — COMPLETA

**Qué se hizo:** UI de pensum/malla curricular. `MallaAdmin.tsx` (gestión de malla y correlatividades por carrera, rol admin) y `MallaAlumno.tsx` (visualización de avance con estado por materia y créditos acumulados, rol alumno), unificadas en una sola ruta `/malla` que branchea por rol. KPI de créditos de carrera agregado al Dashboard del alumno.

**Archivos tocados:**
- `frontend/src/services/pensumService.ts` — nuevo, cliente 1:1 sobre los 8 endpoints `/pensum`
- `frontend/src/pages/MallaAdmin.tsx`, `MallaAlumno.tsx`, `Malla.tsx` — nuevos
- `frontend/src/App.tsx` — ruta `/malla` (`rolesPermitidos: ['admin','alumno']`)
- `frontend/src/components/Layout.tsx` — entradas de menú "Mi Progreso" (alumno) / "Malla Curricular" (admin)
- `frontend/src/pages/Dashboard.tsx` — KPI "Créditos de Carrera" con barra de progreso en `AlumnoDash`
- `backend/app/schemas/pensum_schema.py`, `backend/app/routers/pensum_router.py` — `AvanceMateriaOut.pendientes` y `GET /pensum/correlatividades` nuevos (requeridos por el frontend, ver `ARQUITECTURA.md`)
- `backend/tests/test_pensum_router.py` — casos nuevos para ambos
- `backend/tests/test_postgres_compat.py` — fix de `_TABLE_CLEANUP_ORDER` (no incluía las 3 tablas Fase 2, teardown fallaba por FK)

**Bug colateral encontrado y corregido:** `Dashboard.tsx` leía `sessionStorage.getItem('token')` (nunca se setea — mismo bug de Fase 1 en `Foro.tsx`/`MisMaterias.tsx`/`useRole.ts`, no cubierto en ese momento) — el `user` del dashboard de alumno era siempre `null`, mostrando solo datos mock sin importar el usuario real logueado. Corregido a `getCurrentUser()`.

**Tests:** 121/121 backend (120 + 1 nuevo: listado de correlatividades; el caso de `pendientes` extiende un test existente).

**Pendiente de esta tarea:** verificación visual en browser no realizada — la DB de desarrollo (`neondb`) no tiene datos de pensum cargados y no se leyó su contenido (fuera del alcance autorizado en esta sesión, ver nota de infra). Verificado por `tsc --noEmit` limpio + tests backend en verde únicamente.

### Nota de infra

DB de desarrollo (`neondb`, vía `DATABASE_URL`) tiene 3 `users`/4 `carreras`/3 `materias` pero 0 filas en `pensum_materias`/`correlatividades` — la Fase 2 nunca se sembró ahí, solo en `neondb_test` (`backend/scripts/seed_pensum_piloto.py`). Pendiente para la próxima sesión: decidir si sembrar `neondb` o verificar con credenciales provistas por el usuario.

---

## Fase 2 (backend) — Pensum y malla curricular (2026-07-07) — COMPLETA

**Qué se hizo:** Módulo de pensum/malla curricular con validación de correlatividades. 3 tablas nuevas (`pensum_materias`, `correlatividades`, `avance_alumno_pensum`), extensión de `carreras` (`duracion_semestres`, `creditos_totales`), función pura `validar_correlatividades(alumno_id, materia_id, db)` (evalúa todos los prerrequisitos sin cortar en el primero), 7 endpoints CRUD en `pensum_router.py`, e integración en `POST /inscripciones/` (422 si hay prerrequisitos pendientes).

**Archivos tocados:**
- `app/models/pensum_materia.py`, `correlatividad.py`, `avance_alumno_pensum.py` — nuevos
- `app/models/carrera.py` — `duracion_semestres`, `creditos_totales`
- `app/services/pensum.py` — `validar_correlatividades`, `_tiene_nota_aprobatoria`, `_tiene_inscripcion`
- `app/routers/pensum_router.py` — nuevo, prefix `/pensum`
- `app/routers/inscripciones_router.py` — invoca `validar_correlatividades` antes de inscribir
- `alembic/versions/q4r5s6t7u8v9_create_pensum_correlatividades.py` — nueva migración (head)
- `tests/test_pensum.py`, `test_pensum_router.py` — nuevos
- `backend/scripts/seed_pensum_piloto.py` — nuevo, seed piloto idempotente contra `TEST_DATABASE_URL` (nunca `DATABASE_URL`)

**Tests:** 120/120 pasando (suite completa contra SQLite in-memory + `test_postgres_compat.py` contra `neondb_test`)

**Verificación manual:** seed piloto aplicado en `neondb_test` (Análisis Matemático I, Física I, Programación I en carrera "Ing. Informática", semestre 1, créditos=4; correlatividad Física I ← Análisis Matemático I `aprobada`). `GET /pensum/carreras/{id}` devuelve las 3 materias. `validar_correlatividades` para alumna sin historial devuelve `valido=False`, `pendientes=[{materia_id: <Análisis Mat. I>, tipo: "aprobada"}]`.

**Pendiente de esta tarea:** ninguno (backend). Frontend de Fase 2 (UI de malla/avance) no incluido en este alcance.

---

## Fase 1 — Quick wins + portal docente mejorado (2026-07-06 / 2026-07-07) — COMPLETA

### 1.4 — Fusión portal docente + Histórico + Agenda

- Prerrequisito de infraestructura: split `Materia` → `Materia` (catálogo) + `OfertaMateria` (materia+profesor+período). Migración `n1o2p3q4r5s6`. `Inscripcion`/`Puntaje`/`Asistencia` migrados a `oferta_materia_id`, arreglando de paso una colisión de `UniqueConstraint` para alumnos repitentes.
- Nueva tabla `recordatorios_docente` (migración `p3q4r5s6t7u8`).
- Endpoints nuevos: `GET /profesor/mi-historico`, `GET /profesor/mi-agenda`, CRUD `/profesor/recordatorios` (`profesor_router.py`).
- Frontend: `MisCursos.tsx` eliminado, `MisMaterias.tsx` reescrito con 3 pestañas (Activas/Histórico/Agenda). Rutas `/miscursos` y `/mismaterias` redirigen a `/mis-materias`; menú desktop y bottomnav mobile colapsados de 2 entradas a 1.

### 1.3 — Paginación server-side en Usuarios

- `GET /users/` acepta `skip/limit/q/role`, devuelve `{items, total}` (antes: lista completa sin paginar).
- `TablaPaginada.tsx` nuevo en `frontend/src/components/common/` — genérico, controlado, pensado para reutilizarse en fases futuras (financiero, becas).
- `Usuarios.tsx` sin fetch-todo-y-cortar-en-cliente.

### 1.2 — Foro: fijar/cerrar, edición, paginación

- `PUT /foro/hilos/{id}` (ya existía) ahora valida titularidad del profesor — antes cualquier profesor podía fijar/cerrar un hilo de una materia ajena.
- `PATCH /foro/mensajes/{id}` nuevo — solo autor, ventana de 15 min desde `created_at`.
- `GET /foro/hilos/{id}/mensajes` nuevo, paginado (`skip/limit` → `{items,total}`) — reemplaza los mensajes que antes venían embebidos en `GET /foro/hilos/{id}`.
- Botones Fijar/Cerrar y edición inline conectados en `Foro.tsx`.

### 1.1 — Estadísticas conectada a datos reales

- `estadisticasService.ts` nuevo, consumiendo `GET /puntajes/materia/{id}/estadisticas` (endpoint ya existía desde Fase 0, sin usar).
- `Estadisticas.tsx`: mocks (`MOCK_PUNTAJES`, `MOCK_MATERIAS`, `MOCK_ASISTENCIAS`) eliminados. Estado vacío explícito cuando `total_notas=0`.

### Bug transversal encontrado y corregido (3 archivos)

`Foro.tsx`, `MisCursos.tsx`/`MisMaterias.tsx` y `hooks/useRole.ts` leían `sessionStorage.getItem('token')`, que nunca se setea (el token vive en memoria en `lib/api.ts`). Efecto real: el menú lateral y bottomnav mostraban siempre la navegación de rol alumno, sin importar el rol logueado. Corregido a `getCurrentUser()` en los tres lugares.

### Drift de schema encontrado y corregido

`materias` tenía su `UNIQUE` real en Postgres (`materias_nombre_key`, solo sobre `nombre`) desacoplado del modelo (`nombre`+`carrera_id`) — la tabla se había creado originalmente vía `create_all()`, no Alembic. Corregido en migración `o2p3q4r5s6t7`.

### Incidente de datos e infraestructura de test

Durante el cierre de Fase 1, `TEST_DATABASE_URL` apuntaba (vía endpoint `-pooler`) a la **misma branch física** que `DATABASE_URL` de producción — un endpoint pooler de Neon no es una branch distinta, solo un proxy de conexión sobre la misma branch. La suite de tests de compatibilidad Postgres (que hace `DELETE FROM` de limpieza en su teardown) corrió contra producción, vaciando `users`, `carreras`, `materias`, `ofertas_materia`. Restaurado desde backup lógico manual (`backend/backup_neondb_pre_migracion_2026-07-06.json`). Guardia agregada en `tests/test_postgres_compat.py`: compara el hostname base (normalizando el sufijo `-pooler`) de `DATABASE_URL` contra `TEST_DATABASE_URL` y hace `pytest.skip()` si coinciden, antes de crear el engine de test.

---

## Fase 0 — Deuda técnica crítica (2026-07-04 / 2026-07-05) — COMPLETA

<!-- TODO: verificar detalle exacto — Fase 0 se cerró antes del inicio de esta sesión de documentación; reconstruido desde ESTADO_FASES.md y el estado actual del código, no desde una lectura línea por línea de cada commit de esa fase. -->

- Migración de SQLite a PostgreSQL (Neon), `pool_size=10, max_overflow=20, pool_pre_ping=True`.
- Storage real de archivos vía Cloudflare R2 (`app/services/storage.py`), reemplazando persistencia local.
- SMTP funcional (fastapi-mail) para reset de contraseña y notificaciones de nota.
- Autenticación: access token 15 min + refresh token httpOnly cookie 7 días, con rotación y revocación en `refresh_tokens`.
- Deuda técnica menor resuelta en el arranque de Fase 1: DB de test separada (`neondb_test`) para no correr `test_postgres_compat.py` contra datos de desarrollo — ver nota de incidente arriba, esta separación fue la que falló más adelante por el aliasing de endpoint pooler.
