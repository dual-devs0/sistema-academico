# Changelog Técnico — Sistema Académico UCA V2

> Orden cronológico inverso (más reciente primero). Cubre Fase 0, Fase 1, Fase 2, Fase 3, Fase 4, Fase 4B, Fase 5A, Fase 6b y Fase 8 — todas cerradas. (Fase 5B/5C/5D y Fase 6 se implementaron fuera de esta bitácora — ver `ESTADO_FASES.md` para su resumen.)

---

## Fase 8 — Hardening de seguridad + roadmap funcional (2026-07-13) — COMPLETA

Origen: auditoría externa de dos agentes (gap funcional Paraguay-específico + auditoría técnica de código), verificada contra el código real antes de tocar nada (algunos hallazgos de la auditoría externa resultaron sobreestimados — ver detalle por tarea). Orden de ejecución acordado con el usuario, cada tarea cerrada con tests antes de pasar a la siguiente.

**1. `secure=True` + CSRF en `/auth/refresh`.** `auth_router.py` reescrito: cookie `refresh_token` ahora usa `secure=_COOKIE_SECURE` (env var `COOKIE_SECURE`, `true` por defecto, `false` en `.env`/`.env.test` para dev/test local sobre http). Patrón CSRF double-submit cookie: cookie `csrf_token` (no httpOnly) + header `X-CSRF-Token`, comparados con `secrets.compare_digest`. Solo aplica al flujo cookie (web); el flujo mobile (refresh token en el body) queda exento. `frontend/src/lib/api.ts` captura el csrf_token y lo reenvía en cada `/auth/refresh`. 3 tests nuevos en `test_refresh_tokens.py` (21/21 ✓).

**2. `current_user` tipado con Pydantic.** Nuevo `app/schemas/current_user_schema.py::CurrentUser` (`username`, `role`, `user_id`). `dependencias.py::get_current_user` devuelve esta instancia en vez de un dict. Conversión mecánica de `current_user["key"]` → `current_user.key` en 26 routers. La conversión destapó 2 bugs reales preexistentes: `finanzas_router.py` usaba `current_user.id` (no existe en el dict original tampoco — atributo inexistente) en `pago_online_init`/`pago_online_status`, corregido a `.user_id`; `profesor_router.py::eliminar_recordatorio` tenía el `return` truncado a la palabra `re` (bug de guardado de archivo, no de lógica) causando `NameError` en runtime, no detectado por `py_compile`.

**3. `tramites` conectado al import explícito de Alembic.** `alembic/env.py`: agregado `tramites` a la tupla de imports explícitos de `app.models` — sin esto, el modelo corría riesgo real de perderse en el próximo `alembic revision --autogenerate` (los demás modelos ya estaban cubiertos por el import de paquete `app.models`, que ejecuta su `__init__.py` completo).

**4. `temario` eliminado (decisión del usuario, no reconectado).** Confirmado que `/programas/` cubre la misma función y está activamente en uso desde `Programa.tsx`; `temarios_router.py` estaba huérfano (nunca montado en `main.py`). Eliminados: `app/models/temario.py`, `app/schemas/temario_schema.py`, `app/routers/temarios_router.py`, referencias en `main.py` (`_apply_db_migrations`), `tests/conftest.py`, `tests/test_postgres_compat.py`, `scripts/migrate_sqlite_to_pg.py`, `seed_completo.py` (bloque de seed "9. TEMARIOS"). Migraciones históricas de Alembic y el test `test_temarios_list_requires_auth` (ya tolerante a 401/404) quedaron sin tocar.

**5. Paginación en `asistencias`, `puntajes`, `materia`.** `GET /asistencias/`, `GET /puntajes/`, `GET /materias/` aceptan `skip`/`limit` (`limit` default 500, máx. 2000), respuesta sigue siendo lista plana (no `{items,total}`) para no romper los 10 archivos frontend que ya consumen estos endpoints sin esos parámetros. Al revisar el código real se encontraron y corrigieron 2 truncaciones preexistentes no relacionadas con esta tarea: `materia_router.py::crear_oferta` y `asistencias_router.py::verificar_qr_asistencia` tenían el `return` final cortado a mitad de statement (ambos rotos en runtime pese a que el resto del archivo compilaba).

**6. Rate limit en `/login`.** 5 intentos fallidos / 15 min por clave `username:ip_cliente` (dict en memoria, mismo patrón que el limiter existente de recuperar-contraseña). Solo cuenta fallos; login exitoso limpia el contador. 3 tests nuevos en `test_auth.py`.

**7. Alerta de inasistencia crítica (25%).** Nueva función `_verificar_alerta_inasistencia` en `asistencias_router.py`, invocada tras cada ausencia registrada (individual, lote — no aplica a QR, que solo marca presentes). Detecta el **cruce** del umbral (antes `<25%`, ahora `>=25%`) recalculando el estado con y sin el registro recién insertado, evitando así reenvíos en cada ausencia subsiguiente sin necesitar columna ni migración nueva. Notifica por email a alumno + profesor titular + todos los admins (`send_alerta_inasistencia_email_bg`, nuevo en `email_utils.py`). De paso se corrigió otro bug de tipado de la tarea 2 que había quedado sin convertir: `notificaciones_router.py` usaba `current_user.id` en vez de `.user_id` en 3 endpoints (`subscribe`, `unsubscribe`, `test_notification`). 3 tests nuevos en `test_alerta_inasistencia.py`.

**8. Exportación RUE-ES (MEC).** Dos endpoints nuevos admin-only en `reportes_router.py`: `GET /reportes/rue-es/matricula` y `GET /reportes/rue-es/trayecto-academico`, CSV delimitado por `;`. El MEC/CONES no publica una plantilla técnica pública (confirmado por búsqueda web); se usó un formato con campos estándar de este tipo de registro, dejando `codigo_mec_carrera` como columna placeholder vacía hasta contar con el código oficial — **pendiente de validar contra la plantilla real cuando la universidad la reciba**. Nota final reusa `PESOS`/`_calcular_promedio_final` de `puntajes_router.py`. 4 tests nuevos en `test_rue_es_export.py`.

**Archivos tocados (resumen):** `app/routers/auth_router.py`, `app/schemas/current_user_schema.py` (nuevo), `app/dependencias.py`, 26 routers (conversión dict→atributo), `app/routers/finanzas_router.py` (bugfix `.id`→`.user_id`), `app/routers/profesor_router.py` (bugfix truncación), `alembic/env.py`, `app/routers/materia_router.py` (paginación + bugfix truncación), `app/routers/asistencias_router.py` (paginación + bugfix truncación + alerta inasistencia), `app/routers/puntajes_router.py` (paginación), `app/routers/notificaciones_router.py` (bugfix `.id`→`.user_id`), `app/email_utils.py` (nueva función de alerta), `app/routers/reportes_router.py` (export RUE-ES), `.env`/`.env.example`/`.env.test` (var `COOKIE_SECURE`), `frontend/src/lib/api.ts` (captura CSRF token), eliminados: `app/models/temario.py`, `app/schemas/temario_schema.py`, `app/routers/temarios_router.py`.

**Tests:** 21/21 (`test_refresh_tokens.py`), 5/5 (`test_auth.py`, incluye rate limit), 3/3 (`test_alerta_inasistencia.py`), 4/4 (`test_rue_es_export.py`), 31/31 (`test_security.py`), suites de `puntajes`/`asistencias_qr` sin regresiones — todo verificado tras cada tarea, no solo al final.

**Pendiente de esta fase:** validar el CSV de RUE-ES contra la plantilla oficial del MEC/CONES cuando esté disponible (no existe públicamente). Deuda de mypy y warnings de eslint de Fase 6b siguen sin resolver (fuera de alcance de esta fase).

---

## Fase 6b — Auditoría de seguimiento + hardening (2026-07-09) — COMPLETA

**Bug de producción crítico encontrado y corregido:** `POST /auth/refresh` estaba completamente roto en `backend/app/routers/auth_router.py` (línea ~106) — el código tenía `not RefreshToken.revocado` dentro de un `.filter(...)`. Esto **no** es una negación SQL: es el operador `not` de Python aplicado al objeto `Column` de la clase (no a una instancia), que siempre evalúa a `False` como booleano de Python — el filtro terminaba siendo efectivamente `.filter(..., False, ...)`, que hace que la query nunca devuelva ninguna fila. Efecto real: ningún refresh token era encontrado nunca, por lo que `/auth/refresh` devolvía 401 para cualquier usuario, siempre — el flujo de renovación de sesión estaba muerto en producción. Corregido a `RefreshToken.revocado == False` (con `# noqa: E712` — en contexto de query SQLAlchemy la comparación explícita con `False` es la forma correcta, no un error de estilo). El mismo antipatrón apareció 2 veces más en `backend/tests/test_refresh_tokens.py`, cuyas propias queries de aserción estaban igual de rotas (pasaban en falso). Las 3 correcciones llevaron la suite de 3 failed a 0 failed.

**Auditoría de calidad ejecutada:**
- Suite backend (pytest): 3 failed → 0 failed (209 passed, sqlite).
- `ruff check . --select E,F,W`: 5 → 0 (imports sin usar en `materia_router.py`, `inscripcion_shemas.py`, `materia_shemas.py`; 2 `__init__.py` sin newline final — regresión menor posterior a la auditoría ruff previa de Fase 6, corregida con `--fix`).
- `mypy`: 267 errores, el 100% del mismo patrón sistémico (`Column[T]` incompatible con `T`) porque el codebase declara modelos con `Column()` clásico de SQLAlchemy, no `Mapped[]` (estilo 2.0) — no son bugs reales, a runtime cada atributo de una instancia ORM es su tipo real. Se probó el plugin oficial `sqlalchemy.ext.mypy.plugin`: empeoró a 377 errores (mezcla mal con `Column()` clásico, genera `"Mapped[Any]" has no attribute`) — descartado. `backend/mypy.ini` (nuevo) documenta esta decisión. Los 267 quedan como deuda técnica conocida — se resolverían migrando a `Mapped[]`, fuera de alcance.
- Frontend: `tsc --noEmit` → 0 errores. `eslint . --ext .ts,.tsx` → 0 errores, 6 warnings pre-existentes de `react-hooks/exhaustive-deps` (`Asistencia.tsx`, `EquivalenciasAlumno.tsx`, `Foro.tsx`, `MallaAdmin.tsx`, `MisMaterias.tsx`) sin tocar — requieren revisar caso a caso si envolver en `useCallback` cambia comportamiento de negocio.
- `tsconfig.app.json`: agregado `"strict": true` (ya tenía `noUnusedLocals`/`noUnusedParameters`). 0 errores nuevos.
- Scripts `check`/`check:backend` agregados en `package.json` (raíz) y `"check"` en `frontend/package.json`.

**Archivos tocados:**
- `backend/app/routers/auth_router.py` — fix del filtro roto en `/auth/refresh`
- `backend/tests/test_refresh_tokens.py` — mismo fix en 2 queries de test
- `backend/mypy.ini` — nuevo
- `backend/app/routers/materia_router.py`, `backend/app/schemas/inscripcion_shemas.py`, `backend/app/schemas/materia_shemas.py`, `backend/app/__init__.py`, `backend/tests/__init__.py` — limpieza automática ruff
- `frontend/tsconfig.app.json` — `strict: true`
- `frontend/package.json`, `package.json` (raíz) — scripts `check`/`check:backend`

**Tests:** 209/209 pasando (sqlite), incluyendo los 3 de `test_refresh_tokens.py` que fallaban antes de esta auditoría.

**Pendiente de esta tarea:** deuda técnica de mypy (267 errores `Column[T]`, requiere migrar a `Mapped[]`). 6 warnings de `react-hooks/exhaustive-deps` sin resolver.

---

## Fase 5A — Solicitudes y trámites (2026-07-09) — COMPLETA

**Qué se hizo:** Catálogo de tipos de trámite y flujo de solicitudes de alumnos. Los trámites automáticos (constancia de alumno regular, historial académico oficial) generan su PDF de forma síncrona al crear la solicitud — reusando `calcular_regularidad()` de Fase 3 como gate (solo se genera si el alumno está `activo`) y el patrón reportlab de `boleta_router.py` (Fase 3 no tenía ninguna plantilla PDF, pese a que el plan decía lo contrario — se corrigió esa premisa antes de implementar). Los trámites manuales (carta de presentación, constancia de egreso — dependientes de Fases 5C/5D) quedan `pendiente` hasta que un admin los resuelve, opcionalmente adjuntando un documento propio.

**Decisión de diseño:** `tipos_tramite` no tiene columna para identificar qué generador de PDF usar en los automáticos — se sembraron 4 filas fijas en la migración y el servicio hace *dispatch* por `nombre` exacto (`_GENERADORES_AUTO` en `tramites.py`). Catálogo fijo, sin endpoint de edición en este bloque.

**Decisión de diseño:** el criterio de aceptación pedía exactamente 5 endpoints, pero el panel admin necesita alguna forma de listar solicitudes pendientes de otros alumnos. Se resolvió sin agregar un 6º endpoint: `GET /tramites/solicitudes/mias` tiene comportamiento dual por rol — admin ve todas (filtro opcional `?estado=`), alumno ve solo las propias.

**Archivos tocados:**
- `backend/alembic/versions/u8v9w0x1y2z3_create_tramites.py` — nuevo (`tipos_tramite`, `solicitudes`, seed de 4 tipos)
- `backend/app/models/tramites.py`, `backend/app/schemas/tramites.py` — nuevos
- `backend/app/services/tramites.py` — nuevo (`crear_solicitud`, `generar_constancia_regular_pdf`, `generar_historial_oficial_pdf`)
- `backend/app/services/storage.py` — prefix `"tramite"` agregado a `ALLOWED_EXTENSIONS`/`MAX_SIZE_BYTES`
- `backend/app/routers/tramites_router.py` — nuevo, prefix `/tramites`
- `backend/app/routers/__init__.py`, `backend/app/main.py` — registro del router
- `frontend/src/services/tramitesService.ts`, `frontend/src/pages/SolicitudesTramites.tsx` — nuevos
- `frontend/src/App.tsx` — ruta `/tramites` (roles admin + alumno)

**Tests:** 182/182 pasando (sqlite) — 10 nuevos en `tests/test_tramites.py`: auto-resolución con alumno activo, rechazo con motivo si no-regular, trámite manual queda pendiente, admin resuelve vía multipart, autorización dueño-o-admin en descarga, listado dual-role. `subir_archivo` mockeado (`unittest.mock.patch`), sin llamadas reales a R2. Migración `u8v9w0x1y2z3` aplicada en `neondb_test` y `neondb` (confirmado con el usuario antes de tocar prod) — se encontró el mismo drift de `test_postgres_compat.py::pg_engine` corriendo `Base.metadata.create_all()` contra `neondb_test` antes de que la migración se aplicara (ya conocido de Fase 4B); la migración se hizo idempotente (`inspector.has_table`) siguiendo el mismo patrón que `s6t7u8v9w0x1`.

**Pendiente de esta tarea:** Fase 5B (equivalencias), 5C (pasantías), 5D (graduación) — los tipos de trámite "Carta de presentación" y "Constancia de egreso" quedan sembrados pero sin generador automático propio hasta que esas fases se implementen.

---

## Fase 4B — Facturación electrónica guarani.app (2026-07-09) — COMPLETA

**Qué se hizo:** Integración con guarani.app para emitir factura electrónica válida ante la DNIT en cada pago, con degradación con gracia — un fallo del proveedor externo nunca bloquea ni revierte el pago académico. Extiende la tabla `comprobantes` de Fase 4 (que solo tenía campos mínimos, sin lógica de emisión) con el ciclo de vida completo: `estado_emision`, `intentos`, `ultimo_error`, `url_pdf`, `timbrado`. Agrega `users.cedula` (requerido por guarani.app, no existía en el modelo). Job de reintentos cada 10 min (máx. 5 intentos por comprobante) implementado con `asyncio` puro vía `lifespan` de FastAPI — no se agregó ninguna dependencia de scheduler nueva.

Auditado contra el pseudocódigo de diseño en `PLAN_DESARROLLO_UNIVERSIDAD.md` (líneas 583-765) antes de implementar: se corrigieron 3 discrepancias con el código real (`alumno.cedula` no existía, `cuota.saldo` no existe — se reusa `registrar_pago()` existente en vez de duplicar esa lógica, `pago.alumno` no es relationship directa — se accede vía `pago.cuota.alumno`).

Sin credenciales reales de guarani.app disponibles esta sesión (`GUARANI_APP_API_KEY` vacía) — todos los tests mockean la llamada externa; en producción, hasta que se configuren las credenciales, todo comprobante queda en `error` reintentable sin afectar pagos.

**Archivos tocados:**
- `backend/alembic/versions/t7u8v9w0x1y2_facturacion_electronica.py` — nuevo (users.cedula + comprobantes extendido)
- `backend/app/models/users.py`, `backend/app/models/financiero.py` — columnas nuevas
- `backend/app/schemas/financiero.py` — `ComprobanteOut` extendido, `ComprobantePendienteOut` nuevo, `CuotaOut` gana `pago_id`/`comprobante_estado`/`comprobante_url_pdf`
- `backend/app/services/facturacion_electronica.py` — nuevo (`emitir_factura`, `procesar_facturacion`)
- `backend/app/services/financiero.py` — `cuota_to_out()` resuelve comprobante del último pago
- `backend/app/jobs/reintento_facturacion.py` — nuevo (`ciclo_reintentos`)
- `backend/app/main.py` — `lifespan` con loop de reintentos cada 600s
- `backend/app/routers/finanzas_router.py` — `crear_pago` dispara facturación en background; 2 endpoints nuevos (`.../comprobante/reintentar`, `/comprobantes/pendientes`)
- `backend/.env.example`, `.env`, `.env.test` — `GUARANI_APP_API_KEY/PUNTO_EMISION/BASE_URL`
- `frontend/src/services/finanzasService.ts` — tipo `Comprobante`/`ComprobantePendiente`, wrappers nuevos
- `frontend/src/pages/MisCuotas.tsx` — badge/link de comprobante, gateado por `estado_emision==='emitido'`
- `frontend/src/pages/Finanzas.tsx` — tab "Comprobantes" (admin) con reintento manual

**Tests:** 172/172 pasando (sqlite) — 8 nuevos en `TestComprobantes` (`tests/test_financiero.py`): emisión exitosa, `TimeoutException`, `HTTPStatusError`, sin API key, límite de 5 intentos, rol no-admin rechazado, listado admin-only, job de reintentos ignora intentos agotados. Migración `t7u8v9w0x1y2` aplicada en `neondb_test` y `neondb` (confirmado con el usuario antes de tocar prod).

**Pendiente de esta tarea:** credenciales reales de guarani.app (alta de cuenta, punto de emisión) — gestión, no desarrollo. Sin eso, la emisión real no puede probarse end-to-end.

## Fase 4 — Financiero + becas (2026-07-08) — COMPLETA

**Qué se hizo:** Módulo financiero completo: aranceles (`ConceptoArancel`), cuotas con descuento por beca (`Cuota`, aplica el **mayor** % entre becas vigentes del alumno, no suma), pagos inmutables (`Pago`, correcciones vía `pago_ajuste_ref_id`), becas diferenciadas por fuente institucional/externa (`FuenteBeca`, `BecaCatalogo`, `PostulacionBeca`, `BecaActiva`) con flujo de revisión por comité, bloqueo de inscripción por mora leído de `carreras.max_cuotas_mora` (con excepción para beca 100% y override auditado para admin), y exportación Excel de rendición para convenios externos. Todos los montos en `Numeric(12,2)`, nunca float.

*(Documentado retroactivamente el 2026-07-09, junto con el cierre de Fase 4B — no se generó changelog al cerrar esta fase originalmente.)*

**Archivos tocados:**
- `backend/alembic/versions/s6t7u8v9w0x1_create_financiero_becas.py` — 8 tablas nuevas + `carreras.max_cuotas_mora`
- `backend/app/models/financiero.py`, `backend/app/schemas/financiero.py` — nuevos
- `backend/app/services/financiero.py` — `calcular_descuento_beca`, `generar_cuotas_alumno`, `registrar_pago`, `verificar_deuda_inscripcion`, `export_rendicion_excel`
- `backend/app/routers/finanzas_router.py`, `backend/app/routers/becas_router.py` — nuevos
- `backend/app/routers/inscripciones_router.py` — integración del bloqueo por mora
- `frontend/src/pages/MisCuotas.tsx`, `frontend/src/pages/Finanzas.tsx`, `frontend/src/services/finanzasService.ts` — nuevos
- `frontend/src/pages/Perfil.tsx` — badges/info de becas

**Tests:** ver Fase 4B (suite consolidada, no se registró conteo separado al cierre original de Fase 4).

**Pendiente de esta tarea:** ninguno (facturación electrónica quedó explícitamente diferida a Fase 4B).

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
