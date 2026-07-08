# Estado de fases — Plan Universidad UCA V2

| Fase | Estado | Fecha inicio | Fecha cierre | Notas |
|---|---|---|---|---|
| Fase 0 — Deuda técnica crítica | COMPLETA | 2026-07-04 | 2026-07-05 | 79 tests ✓ PostgreSQL Neon · Storage R2 · SMTP Gmail · Auth refresh httpOnly cookie |
| Fase 1 — Quick wins + portal docente | COMPLETA | 2026-07-06 | 2026-07-07 | 96 tests ✓ (sqlite). 1.1 Estadísticas conectada al endpoint real. 1.2 Foro: fijar/cerrar + edición 15min + paginación. 1.3 Usuarios.tsx + TablaPaginada server-side. 1.4 Fusión Mis Materias (Activas/Histórico/Agenda) + mi-historico + mi-agenda + recordatorios_docente. |
| Fase 2 — Pensum y malla curricular | COMPLETA | 2026-07-07 | 2026-07-07 | Backend: 121 tests ✓ (120 + 1 nuevo, listado de correlatividades; test de pendientes extiende uno existente). 3 tablas nuevas + carreras extendida. 8 endpoints /pensum (7 + GET correlatividades) + integración en POST /inscripciones/. Frontend: MallaAdmin.tsx, MallaAlumno.tsx, Malla.tsx, pensumService.ts, ruta /malla, KPI créditos en Dashboard alumno. |
| Fase 3 — Expediente académico | EN_PROGRESO | 2026-07-08 | — | Backend: implementado (calcular_ppa, calcular_regularidad, 4 endpoints /expediente, 137 tests ✓ sqlite). Migración r5s6t7u8v9w0 escrita, **pendiente de aplicar** (neondb_test caído, 2do intento fallido). Frontend: implementado (ExpedienteAlumno.tsx, ExpedienteAdmin.tsx, Expediente.tsx, ruta /expediente, menú "Expediente" renombrado de /puntajes a "Calificaciones"). **Verificación visual pendiente.** |
| Fase 4 — Financiero + becas | PENDIENTE | — | — | |
| Fase 4B — Facturación electrónica | PENDIENTE | — | — | |
| Fase 5 — Solicitudes/Graduación/Pasantías/Equivalencias | PENDIENTE | — | — | |

Estados válidos: PENDIENTE / EN_PROGRESO / EN_REVISION / COMPLETA

---

## Notas pendientes para próxima sesión

### Deuda técnica menor (no bloquea Fase 1)

- **Tests postgres_compat necesitan DB de test separada en Neon** — RESUELTA (2026-07-06).
  Branch `neondb_test` creada en el mismo proyecto Neon. `TEST_DATABASE_URL` vive en
  `backend/.env.test` (gitignored, nunca commiteado — verificado con
  `git log --all --full-history`). `tests/conftest.py` carga ese archivo con
  `load_dotenv` antes de importar `app.main`. Suite completa: 79 passed, incluyendo
  los 4 tests de `test_postgres_compat.py` (antes skipped) corriendo contra
  `neondb_test`. Confirmado por conteo de filas antes/después que `neondb`
  (desarrollo) no fue tocada.

### Infra cerrada durante diagnóstico de Fase 1 (2026-07-06)

- **Migración Materia → Materia + OfertaMateria** — RESUELTA. `Materia.profesor_id`
  fijo no permitía distinguir profesor por período (bloqueante real para 1.4.3
  Histórico). Nueva tabla `ofertas_materia` (materia_id + profesor_id + periodo +
  activa). `Inscripcion`/`Puntaje`/`Asistencia` migrados a `oferta_materia_id`
  (arregla también colisión de `UniqueConstraint` para alumnos repitentes).
  21 puntos de autorización consolidados en `app/services/autorizacion.py`.
  Migración `n1o2p3q4r5s6` aplicada en `neondb_test` (validada con dato sembrado)
  y en `neondb` (dev real, con backup lógico previo en
  `backend/backup_neondb_pre_migracion_2026-07-06.json`, gitignored).
- **Drift `uq_materia_nombre_carrera` vs `materias_nombre_key`** — RESUELTA.
  El schema real de `neondb` tenía la tabla `materias` creada por
  `Base.metadata.create_all()` en Fase 0, nunca por una revisión Alembic —
  su UNIQUE constraint real (`materias_nombre_key`, solo sobre `nombre`) no
  coincidía con el modelo (`nombre`+`carrera_id`). Migración `o2p3q4r5s6t7`
  corrige el schema real para que coincida con el modelo. Sin duplicados
  verificados antes de aplicar.
- **Hallazgo colateral:** se encontró y eliminó una tabla `ofertas_materia`
  huérfana en `neondb` (creada manualmente fuera del flujo de Alembic,
  confirmado con el usuario, vacía, sin riesgo) antes de aplicar la migración
  real — `alembic_version` nunca reflejó ese cambio manual.
- **Nota de infra:** `neondb_test` quedó inaccesible (`password authentication
  failed`) durante el cierre de esta tarea — problema de la branch en Neon,
  no relacionado con el código. La migración del drift se validó por inspección
  directa (chequeo de duplicados) y se aplicó solo en `neondb` con el visto
  bueno explícito del usuario. Revisar la branch de test antes de la próxima
  sesión.

### Fase 1 — cierre (2026-07-06/07)

- **1.1** — `estadisticasService.ts` nuevo, `Estadisticas.tsx` sin mocks, consume
  `/puntajes/materia/{id}/estadisticas` por materia (N llamadas agregadas
  client-side, ya que el endpoint es por-materia y el dashboard es institucional).
  Asistencia/alertas siguen en fetch crudo (ya eran reales, solo se sacó el
  fallback a mock). Estado vacío explícito cuando `total_notas=0`.
- **1.2** — `PATCH /foro/mensajes/{id}` (ventana 15 min), `GET /foro/hilos/{id}/mensajes`
  paginado (reemplaza mensajes embebidos), botones Fijar/Cerrar conectados al
  `PUT` existente (que ahora sí valida titularidad del profesor — antes cualquier
  profesor podía fijar/cerrar hilo ajeno). Bug de auth (`sessionStorage` nunca
  seteado) corregido en `Foro.tsx`.
- **1.3** — `GET /users/` acepta `skip/limit/q/role`, devuelve `{items,total}`.
  `TablaPaginada.tsx` nuevo en `src/components/common/` (genérico, controlado,
  reutilizable en Fase 4). `Usuarios.tsx` sin fetch-todo-y-cortar.
- **1.4** — `OfertaMateria` (ya resuelto antes) + `recordatorios_docente` (Alembic
  `p3q4r5s6t7u8`) + `GET /profesor/mi-historico` + `GET /profesor/mi-agenda` +
  CRUD `/profesor/recordatorios`. `MisCursos.tsx` eliminado, `MisMaterias.tsx`
  reescrito con 3 pestañas (Activas/Histórico/Agenda). Rutas `/miscursos` y
  `/mismaterias` redirigen a `/mis-materias`; menú desktop y bottomnav mobile
  colapsados a 1 entrada.
- **Bug transversal encontrado y corregido 3 veces esta fase:** `Foro.tsx`,
  `MisCursos.tsx`/`MisMaterias.tsx` y `hooks/useRole.ts` (este último usado por
  `Layout.tsx` para *todo* el menú/bottomnav de *todos* los roles) leían
  `sessionStorage.getItem('token')`, que nunca se setea — el token vive en
  memoria (`lib/api.ts`). Efecto real: el menú lateral y bottomnav mostraban
  **siempre** la navegación de alumno, sin importar el rol logueado. Corregido
  a `getCurrentUser()` en los tres lugares.
- **Nota de infra:** `neondb_test` siguió inaccesible (`password authentication
  failed`) en esta sesión — la migración de `recordatorios_docente` (aditiva,
  bajo riesgo) se aplicó directo en `neondb`. Revisar la branch de test antes
  de la próxima sesión de Fase 2.

### Limitación conocida — compute de `neondb_test` (free tier), inicio Fase 3 (2026-07-07)

`neondb_test` (branch `ep-late-grass-aczm8idk`, la misma que respondió `SELECT 1`
al inicio de la sesión de Fase 2) quedó inalcanzable al arrancar Fase 3:
`ERROR: The requested endpoint could not be found, or you don't have access to it.`
3 reintentos con backoff de 5s, sin éxito — no es error de código, es el compute
del free tier de Neon suspendido/expirado. `tests/test_postgres_compat.py::pg_engine`
ahora hace un `SELECT 1` de sondeo antes de `create_all()` y usa `pytest.skip()`
explícito si falla, en vez de `ERROR` — se re-habilita solo cuando el endpoint
vuelva a responder, sin tocar el test de nuevo. Suite: 117 passed, 4 skipped
(antes 120-121 passed con los 4 postgres incluidos). Pendiente: revisar/reactivar
el endpoint en el dashboard de Neon antes de validar cualquier migración de
Fase 3 contra Postgres real.

**Segundo reintento (mismo día, cierre de Fase 3 backend):** mismo error
exacto, endpoint sigue caído. Migración `r5s6t7u8v9w0_create_expediente_regularidad`
escrita y validada solo estáticamente (`alembic heads`/`history` resuelven la
cadena sin error; no se pudo hacer dry-run completo porque las migraciones
anteriores usan sintaxis Postgres-only como `ALTER TABLE ... ALTER COLUMN`,
incompatible con SQLite incluso en un archivo descartable). **Antes de tocar
`neondb`:** reactivar el endpoint en el dashboard de Neon, aplicar primero
contra `neondb_test`, confirmar con `alembic current`, recién ahí aplicar
contra `neondb`.

### Pendiente de próxima sesión — cierre de Fase 3

1. **Reactivar `neondb_test`** en el dashboard de Neon (branch `ep-late-grass-aczm8idk`) — 2 intentos fallidos en esta sesión, no es problema de código.
2. Aplicar migración `r5s6t7u8v9w0_create_expediente_regularidad` — primero `neondb_test`, confirmar con `alembic current`, recién después `neondb`.
3. Verificación visual del frontend de Fase 3 (`ExpedienteAlumno.tsx`/`ExpedienteAdmin.tsx`, ruta `/expediente`) en browser — no realizada esta sesión, bloqueada por falta de datos de expediente en `neondb` dev y por el punto 1.