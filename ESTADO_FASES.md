# Estado de fases — Plan Universidad UCA V2

| Fase | Estado | Fecha inicio | Fecha cierre | Notas |
|---|---|---|---|---|
| Fase 0 — Deuda técnica crítica | COMPLETA | 2026-07-04 | 2026-07-05 | 79 tests ✓ PostgreSQL Neon · Storage R2 · SMTP Gmail · Auth refresh httpOnly cookie |
| Fase 1 — Quick wins + portal docente | COMPLETA | 2026-07-06 | 2026-07-07 | 96 tests ✓ (sqlite). 1.1 Estadísticas conectada al endpoint real. 1.2 Foro: fijar/cerrar + edición 15min + paginación. 1.3 Usuarios.tsx + TablaPaginada server-side. 1.4 Fusión Mis Materias (Activas/Histórico/Agenda) + mi-historico + mi-agenda + recordatorios_docente. |
| Fase 2 — Pensum y malla curricular | COMPLETA | 2026-07-07 | 2026-07-07 | Backend: 121 tests ✓ (120 + 1 nuevo, listado de correlatividades; test de pendientes extiende uno existente). 3 tablas nuevas + carreras extendida. 8 endpoints /pensum (7 + GET correlatividades) + integración en POST /inscripciones/. Frontend: MallaAdmin.tsx, MallaAlumno.tsx, Malla.tsx, pensumService.ts, ruta /malla, KPI créditos en Dashboard alumno. |
| Fase 3 — Expediente académico | COMPLETA | 2026-07-08 | 2026-07-08 | Backend: calcular_ppa, calcular_regularidad, 4 endpoints /expediente, 137 tests ✓ sqlite. Migración r5s6t7u8v9w0 aplicada en neondb (`alembic stamp head` tras drift de `create_all()`) y en neondb_test (`alembic upgrade head`). Frontend: ExpedienteAlumno.tsx, ExpedienteAdmin.tsx, Expediente.tsx, ruta /expediente, menú renombrado ("Expediente"→/puntajes pasó a "Calificaciones"). Verificado visualmente en browser (admin + alumno). |
| Fase 4 — Financiero + becas | COMPLETA | 2026-07-08 | 2026-07-08 | Backend: Migración s6t7u8v9w0x1, 8 tablas nuevas. Modelos con Numeric(12,2), pagos inmutables. 2 routers nuevos (finanzas, becas). Bloqueo de mora en inscripciones con bypass para beca 100%. Export a Excel. Frontend: MisCuotas.tsx, Finanzas.tsx, badges/info de becas en Perfil.tsx. |
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

### Resuelto — compute de `neondb_test` recreado (2026-07-08)

Tras 3 sesiones consecutivas con el error `endpoint could not be found` (compute
suspendido por inactividad en free tier de Neon), se creó una **nueva branch** en
Neon (`neondb_test2`, basada en `main`) con **auto-suspensión desactivada (Never)**
para evitar que vuelva a caerse. `TEST_DATABASE_URL` actualizada en `.env.test`.

Migrations aplicadas contra la nueva branch:
```powershell
$env:DATABASE_URL = (Get-Content .env.test) -replace "TEST_DATABASE_URL=", ""
alembic upgrade head
```

`alembic current` confirma `r5s6t7u8v9w0 (head)` en `neondb_test2`. Tests de
compatibilidad Postgres pueden volver a correr sin restricción.

Verificación visual completada (sesión previa): login admin y alumno contra `neondb`.
`ExpedienteAdmin` — búsqueda, badge "ACTIVO", estado vacío correcto.
`ExpedienteAlumno` — PPA "—", "0 créd. computados", badge "ACTIVO", estado vacío
correcto. Menú "Calificaciones" y "Expediente" separados correctamente.