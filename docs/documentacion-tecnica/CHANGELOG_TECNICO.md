# Changelog Técnico — Sistema Académico UCA V2

> Orden cronológico inverso (más reciente primero). Cubre Fase 0 a Fase 19 — todas cerradas en código; Fase 19 pendiente de commit/push/deploy (ver checklist en `ESTADO_FASES.md`).

---

## Fase 19 — Motor de notas por puntos + Cursos unificado + auditoría real-data/mobile rol alumno (2026-07-23) — COMPLETA (código), PENDIENTE de commit/push/deploy

### Resumen

Dos partes: (A) cambio real al motor de calificación (0-10 → puntos configurables por materia, decidido explícitamente por el usuario) y fusión de Asistencia+Calificaciones dentro de Cursos; (B) auditoría módulo por módulo del rol alumno buscando datos fake/desincronizados y problemas de mobile, que destapó **6 bugs reales** (no cosméticos) además del trabajo visual pedido.

### 19A — Motor de notas 0-100

- Tabla nueva `pesos_evaluacion` (migración `caf9713210dd`): pesos configurables por materia, default `parcial1=20, parcial2=20, practico=10, final=50` (suma 100). Sin fila = usa el default, no hace falta sembrar todas las materias.
- Migración de datos en la misma revisión: `puntajes.tipo='final'→'final1'`, reescala `valor` histórico (×2 parciales, ×1 práctico, ×5 final) para preservar el promedio 0-10 real de cada alumno tras el cambio de escala.
- `tipo` extendido a `final1|final2|final3` — el final efectivo es el máximo de las 3 oportunidades no nulas.
- `calcular_promedio_final(notas, pesos)` centralizado en `puntajes_utils.py`, reemplaza ~7 reimplementaciones manuales del cálculo dispersas en `boleta_router.py`, `alumno_router.py`, `reportes_router.py`, `services/pensum.py` (×4), `notas_router.py` — de paso corregidos 3 bugs reales de `AVG()` crudo mezclando puntajes de escalas distintas (20pts y 50pts promediados como si fueran comparables).
- **Por qué no rompió PPA/boleta/regularidad:** con pesos sumando 100, `promedio_0_10 = puntos_obtenidos/10` sigue siendo matemáticamente un float 0-10 válido — todo consumidor externo (`calcular_ppa`, boleta PDF, `calcular_regularidad`) sigue recibiendo el mismo contrato sin tocar su propio código.
- Frontend: `Puntajes.tsx` (profesor) gana panel "Configurar Puntaje" + selector de oportunidad (1ª/2ª/3ª) para el final.

### 19B — Cursos unificado (alumno)

- `Programa.tsx` gana tabs Temario/Asistencia/Calificaciones. Asistencia: cards circulares por materia con selector de período real (`GET /alumno/mis-periodos`, `GET /alumno/mis-materias?anio&semestre`, nuevos endpoints). Click en una card abre vista de detalle **full-swap** (mismo patrón que `ExpedienteAdmin.tsx` al seleccionar un alumno — no un modal), con desglose completo de notas + bitácora de sesiones de esa materia.
- Sidebar alumno: entradas "Asistencia" y "Calificaciones" eliminadas (contenido vive en Cursos). Bottom-nav mobile: "Calificaciones" (ruta ya fusionada, muerta) → "Calendario" (ruta real).

### 19C — Auditoría real-data + mobile, rol alumno (bugs reales encontrados)

| Módulo | Bug real | Causa | Fix |
|---|---|---|---|
| `finanzas_router.py` (Pagar Online) | `AttributeError: 'Cuota' object has no attribute 'monto_a_pagar'` → 500 en cada intento de pago | `monto_a_pagar` es un campo calculado del *schema* de respuesta, no existe en el modelo ORM `Cuota` | `cuota.monto - cuota.monto_descuento` |
| `alumno_router.py::dashboard` | El sistema entero mostraba "Sin adeudos"/Gs. 0 para **cualquier** alumno con cuotas, siempre | Mismo bug (`c.monto_a_pagar`) pero enmascarado por `except Exception: pass` silencioso — nunca se veía el traceback. Bonus: comparaba `c.estado=='vencido'` contra el valor real del constraint, `'vencida'` | `c.monto - c.monto_descuento` + `estado=='vencida'` |
| `BecasAlumno.tsx` | Spinner "Cargando becas disponibles…" infinito | `firstLoad.current = false` corría síncrono, antes de que el `.finally()` de la promesa async se resolviera — `setLoadingCat(false)` nunca se ejecutaba con el ref ya en `false` | `Promise.allSettled` + `setLoadingCat(false)` incondicional en `.finally()` |
| `BecasAlumno.tsx` (tabs Postulaciones/Mis Becas) | Mismo síntoma de spinner infinito cuando el alumno no tenía postulaciones (caso más común) | Rama `postulaciones.length===0 ? spinner : postulaciones.length===0 ? vacío : lista` — segunda condición idéntica a la primera, inalcanzable | Primera condición cambiada a `loadingCat` |
| `Boleta.tsx` (alumno) | Desglose de notas roto (schema viejo `final` único), período "Otoño/Primavera" fake, sello digital con QR de píxeles random no verificable | Página nunca migrada al motor de puntos nuevo (19A); período nunca conectado a datos reales de inscripción | Desglose usa `/alumno/mis-notas` real; período usa `oferta.periodo` real (no currícula); sello reemplazado por código HMAC-SHA256 real + QR real, nuevos endpoints `GET /boleta/{id}/sello` y `GET /boleta/verificar/{codigo}` |
| `Inscripciones.tsx` (alumno) | Créditos sumados siempre con constante ×4 sin importar la materia real; cupo lleno no bloqueaba selección | Cálculo hardcodeado en vez de usar `m.creditos`/`m.cupos` reales ya devueltos por el backend | Créditos y bloqueo de cupo real; código de materia real (`m.codigo`) en vez de `MAT-XXX` fabricado |
| `SolicitudesTramites.tsx` (alumno) | Mensaje "Trámites próximamente disponibles" se mostraba también cuando el fetch fallaba por error real de red/servidor, indistinguible de catálogo vacío legítimo | `loadError` y "catálogo vacío" compartían el mismo render | Separados: banner de error real vs estado vacío real |
| `Perfil.tsx` (alumno) | Promedio General mezclaba notas de escalas distintas (parcial 20pts + final 50pts) en un `AVG` plano sin pesos | Nunca migrado al motor de puntos (19A) | Usa `/alumno/mis-notas` real (mismo cálculo que Boleta/Cursos/Malla) |
| `AdminLogin.tsx` | Colores inconsistentes (variables `--cyan-*` mezcladas con un teal viejo `rgba(0,180,216,…)` residual de un rediseño anterior, gradiente de "control total" hardcodeado a un tono que no coincidía con `--cyan-bright`) | Refactor de color incompleto en sesión previa | Unificado todo a 4 variables reales |
| `AdminLogin.tsx` (mobile) | Raya horizontal suelta + logo pegado al texto del hero en viewport ≤960px | `.panel-deco { border-bottom }` quedaba visible al superponerse con `.panel-form { margin-top:-60px }`, que arrastraba también el logo (`.form-header`) hacia arriba | `border-bottom` eliminado; el `margin-top:-60px` (efecto de card flotante) se movió solo a `.form-content`, `.form-header` con padding propio |
| `Dashboard.tsx` (alumno+profesor) | Tabla "Calificaciones por Materia" (7 columnas) y "Cursos Activos" (4 columnas, sin wrapper de `overflow-x`) ilegibles/desbordadas en mobile | Sin versión responsive, solo `overflow-x:auto` (o ni eso) | Cards apiladas por materia debajo de 680px, tabla intacta en desktop. Mismo fix aplicado al Desglose de Materias de `Boleta.tsx` |

Malla y Expediente ya tenían backend 100% real de sesiones previas — solo les faltaba tiempo real (poll 30s + botón Actualizar + banner de error visible, antes `.catch(()=>{})` silencioso). Pasantías ya tenía backend real pero solo mostraba la última solicitud (`.find()`) — se agregó historial completo con `motivo_rechazo` visible y se ocultó el form de nueva solicitud si ya hay una activa.

### Pendiente explícito

- **Pago online no probado end-to-end** — `STRIPE_SECRET_KEY` sigue en `sk_test_placeholder`, pendiente de que el usuario genere una clave real de Stripe (instrucciones ya entregadas).
- Rediseño visual tipo card+hero+violeta del login alumno/profesor (template pegado por el usuario en el chat) — pausado a pedido explícito del usuario, no se tocó.
- Ver checklist completo de pre-producción al final de `ESTADO_FASES.md` (commits/push, secretos de `.env`, elección de hosting — nada de esto es código, es lo que falta para el primer deploy real).

### Tests

Backend: 273/273 ✅ (sin regresiones sobre el motor de notas nuevo). Frontend: `npm run build` 919 módulos, 0 errores.

---

## Fase 17 — Ajustes Globales (Admin) con auditoría (2026-07-22) — COMPLETA

### Resumen

Módulo completo de configuración global del sistema para administradores. Antes: el menú "Ajustes Globales" apuntaba a `/perfil` (misma página de perfil personal que todos los roles). Ahora: página dedicada `/ajustes-globales` con 20 settings agrupados en 4 categorías, auditoría de cambios, export/import.

### Backend

**Modelos nuevos:**
- `GlobalSetting` (`global_settings`): tabla clave-valor con tipos (string/number/boolean/date), categoría, descripción, editable flag, timestamps
- `SettingAuditLog` (`setting_audit_log`): historial completo de cambios con old_value, new_value, changed_by, reason

**Migración:** `c8f8d13b8612` — `add_global_settings_module` (aplicada en neondb)

**Auto-seed:** 20 settings por defecto con valores iniciales en 4 categorías:
- Académico (7): período actual, fechas inscripción, PPA mínimo, % asistencia, intentos máx, créditos mínimos
- Financiero (4): días tolerancia mora, interés mensual, costo crédito, periodicidad cobro
- Sistema (5): email contacto, dominio institucional, max archivo size, modo mantenimiento
- Notificaciones (4): email/push activo, % alerta asistencia, días recordatorio

**Endpoints nuevos (admin-only):**

| Método | Ruta | Propósito |
|--------|------|-----------|
| GET | `/admin/settings` | Listar settings (opcional `?categoria=`) |
| GET | `/admin/settings/{key}` | Obtener un setting |
| PUT | `/admin/settings/{key}` | Actualizar + registrar auditoría |
| GET | `/admin/settings/audit/list` | Historial de cambios paginado con nombre del usuario |
| GET | `/admin/settings/export/all` | Exportar todos los settings como JSON |
| POST | `/admin/settings/import` | Importar settings desde JSON (con auditoría) |

### Frontend

**Nueva página `AjustesGlobales.tsx`:**
- 5 tabs: Académico, Financiero, Sistema, Notificaciones, Auditoría
- Cada setting renderizado con control según tipo (text, number, toggle booleano, date)
- Edición inline con botón "Guardar" que aparece al modificar un valor
- Indicador de última actualización por setting
- Polling automático cada 30s
- Tab de Auditoría: tabla con historial completo (setting, old→new, usuario, fecha, motivo)
- Botones Exportar/Importar con modal JSON

**Routing + menú:**
- Ruta `/ajustes-globales` registrada para admin en App.tsx
- Menú admin "Ajustes Globales" ahora apunta a `/ajustes-globales` (antes `/perfil`)

### Tests
- Backend settings: 8 tests nuevos ✅ (seed, CRUD, auth, audit, export, import)
- Backend suite existente: sin regresiones
- Frontend build: 0 errores tsc

---

## Fase 16C — Fix CSRF refresh + Pasantías Admin refinado (2026-07-22) — COMPLETA

### 1. Fix: sesión perdida al refrescar página (CSRF)

**Problema:** El token CSRF se almacenaba solo en memoria (`_csrfToken` en `api.ts`). Al refrescar la página:
- `_csrfToken` se perdía
- `tryRefresh()` llamaba `POST /auth/refresh` sin header `X-CSRF-Token`
- Backend requiere validación CSRF (cookie `csrf_token` vs header) para cookie flow → 403
- Sesión se perdía completamente al hacer F5

**Solución:** Nueva función `_readCsrfFromCookie()` que lee el token CSRF de la cookie (no es httpOnly, JS puede leerla). `_getCsrfToken()` intenta memoria primero, cae a cookie si no hay. El refresh silencioso funciona incluso después de F5.

### 2. Pasantías Admin — datos reales + UX mejorada

**Problemas encontrados:**
- `PasantiaOut` no exponía `motivo_rechazo` (existía en el modelo desde migración `m6m6m6m6m6m6`, pero el schema lo ignoraba)
- No existía columna `fecha_solicitud`/`created_at` en la tabla — la columna "Fecha solicitud" siempre mostraba "—"
- Modal de aprobación requería tipear manualmente el ID del tutor

**Cambios backend:**
- `Pasantia` model: columna `created_at` agregada (DateTime with timezone, default=utcnow)
- Migración `c0e2c42a4b9d` — `add_created_at_to_pasantias` (aplicada en `neondb`)
- `PasantiaOut` schema: expone `created_at` y `motivo_rechazo`
- Nuevo endpoint `GET /pasantias/profesores` — lista profesores disponibles como tutores (id, nombre, email)

**Cambios frontend:**
- `pasantiasService.ts`: interfaz `Pasantia` actualizada con `created_at`, `motivo_rechazo`; nuevo tipo `ProfesorItem`; nueva función `getProfesores()`
- `PasantiasAdmin.tsx`:
  - Modal de aprobación: input numérico reemplazado por `<select>` con lista real de profesores
  - Columna "Fecha solicitud" muestra `created_at` real
  - `motivo_rechazo` visible en detalle cuando existe
  - Polling cada 30s mantiene datos en tiempo real

### Tests
- Backend pasantías: 15/15 ✅
- Frontend: 19/19 ✅
- Mypy: 0 errores (4 archivos del módulo limpios)

---

## Fase 16D — Equivalencias Admin refinado (2026-07-22) — COMPLETA

### 1. Modelo + migración

**Problema:** `SolicitudEquivalencia` no tenía columna `created_at`. El frontend mostraba "—" en la columna "Fecha" y no se podía ordenar por antigüedad.

**Cambios:**
- `SolicitudEquivalencia` model: columna `created_at = Column(DateTime(timezone=True), server_default=func.now())`
- Migración `a22743f21549` — `add_created_at_to_solicitudes_equivalencia` (aplicada en `neondb`)
- Schema `SolicitudEquivalenciaOut`: expone `created_at`
- Schema `EquivalenciaMateriaResolver`: incluye `motivo`

### 2. Nuevos endpoints

| Endpoint | Rol | Propósito |
|----------|-----|-----------|
| `GET /equivalencias/solicitudes` | admin | Lista TODAS las solicitudes con filtro opcional `?estado=` |
| `GET /equivalencias/materias` | admin | Lista materias disponibles para dropdowns en modales |

Antes: no existía forma de listar solicitudes como admin — solo se podía consultar por alumno individual (`GET /equivalencias/alumno/{id}`).

### 3. Frontend — EquivalenciasAdmin.tsx reescrito

**Problemas originales:**
- Pantalla vacía hasta buscar alumno manualmente — sin vista general de solicitudes
- Modal resolver: campo numérico para `materia_id` (había que saber el ID de memoria)
- Modal examen: campo numérico para `materia_id`
- Sin columna de fecha real

**Cambios:**
- `equivalenciasService.ts`: nuevas funciones `getTodasSolicitudes()`, `getMateriasEquivalencia()`; nuevo tipo `MateriaItem` (id, nombre, codigo)
- `EquivalenciasAdmin.tsx`:
  - Carga **todas** las solicitudes al montar (sin búsqueda manual)
  - 3 tabs: Pendientes / Resueltas / Todas
  - Columna "Fecha" con `created_at` real formateado
  - Modal Resolver: `<select>` con materias reales en lugar de input numérico
  - Modal Examen de Suficiencia: `<select>` con materias reales + date picker
  - Polling automático cada 30s
  - Indicador de última actualización con spinner

### Tests
- Backend equivalencias: 7/7 ✅
- Frontend: 19/19 ✅
- Mypy: 0 errores en módulo equivalencias ✅

---

## Fase 16B — Mypy 0 errores + Pagos Online real (Stripe) + Notificaciones Push reales (pywebpush) (2026-07-22) — COMPLETA

**Origen:** Finalización de los 3 items activos que quedaban de Fase 16: mypy (53 errores reales en servicios/routers), Pagos Online (reemplazar stub por Stripe real), Notificaciones Push (reemplazar stub por pywebpush + service worker).

### 1. Mypy 53 → 0 errores (15 archivos)

Los modelos ya estaban migrados a `Mapped[]` de sesiones anteriores. Los 53 errores restantes estaban en servicios y routers:

| Categoría | Count | Files | Fix |
|-----------|-------|-------|-----|
| `bool | None` → `bool` en Pydantic | 14 | `x or False` |
| `int | None` → `int` dict key | 4 | `assert` guard |
| Missing type annotations (`dict[...]`) | 4 | | Annotation added |
| `str` → `NameEmail` (fastapi-mail) | 4 | `email_utils.py`, `facturacion_electronica.py` | `NameEmail(email=s)` wrapper |
| `datetime | None` → `datetime` | 4 | `tramites_router.py`, `foro_router.py` | `assert` / `or datetime.min` |
| `list[X]` vs `list[Y]` variance | 3 | `eventos_router.py` | `cast()` |
| `dict[str, float]` vs `dict[str, float | None]` | 1 | `expediente_router.py` | Fix type annotation |
| `Incompatible types in assignment` | 4 | `financiero.py`, `asistencias_router.py`, `expediente_router.py` | Fix variable types |
| `or_()` filter bool | 4 | `reportes_router.py`, `eventos_router.py` | Use `.is_(True)` |
| Generator `object` vs `bool` | 5 | `reportes_router.py` | Fix yields |
| Misc (list vs Query, list[dict] vs list[PendienteOut]) | 6 | misc | Fix types |

**Resultado:** `mypy app --ignore-missing-imports` → 0 errors (105 source files checked).

### 2. Pagos Online — Stripe real (reemplaza gateway.stub)

**Antes:** `gateway.stub` (dominio falso), sin SDK real, sin webhook.

**Ahora:**
- `stripe>=15.0` agregado a `requirements.txt` e instalado en venv
- Variables de entorno: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `backend/app/services/pagos_online.py` — nuevo servicio con `init_stripe()`, `crear_checkout_session()` (convierte montos Numeric(12,2) a centavos ×100), `confirmar_pago_webhook()` (verifica firma HMAC)
- `finanzas_router.py`:
  - `POST /finanzas/pagos/init` — crea Stripe Checkout Session real, almacena `stripe_session_id` + `gateway_url` (URL de checkout)
  - `POST /finanzas/pagos/webhook` — nuevo endpoint para eventos `checkout.session.completed` con verificación de firma
  - `POST /finanzas/pagos/confirm` — mantenido como endpoint manual de testing
- Modelo `PagoOnline` extendido con columna `stripe_session_id` (migración `61880be1d112`)
- Frontend `MisCuotas.tsx`: redirige a Stripe Checkout URL, maneja `?stripe=success`/`?stripe=cancel`
- `finanzasService.ts`: `initPagoOnline` acepta `success_url`/`cancel_url` opcionales

**Flujo:** Usuario hace clic en "Pagar Online" → backend crea Stripe Checkout Session → frontend redirige → Stripe cobra → webhook `checkout.session.completed` → backend marca PagoOnline como `confirmado` + cuota como `pagada`.

### 3. Notificaciones Push — pywebpush real (reemplaza stub)

**Antes:** Suscripción real guardada en DB, `POST /notificaciones/test` solo contaba subscribers y devolvía respuesta fake.

**Ahora:**
- `pywebpush>=1.14` agregado a `requirements.txt` e instalado en venv
- Variables de entorno: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CLAIM_EMAIL`
- `backend/app/services/notificaciones_push.py` — nuevo servicio con:
  - `get_vapid_keys()` — lee de env, auto-genera si no existen (las guarda en env para persistencia)
  - `enviar_notificacion(subscription, titulo, cuerpo, url)` — envía push real con pywebpush
  - `enviar_notificaciones_masivo(subscriptions, ...)` — batch con manejo de errores por suscripción
- `notificaciones_router.py`:
  - `GET /notificaciones/vapid-public-key` — expone la VAPID public key para el frontend
  - `POST /notificaciones/test` — envía push real a todos los suscriptores, devuelve `{exitosos, fallidos, total}`
- `frontend/public/sw.js` — service worker nuevo con:
  - `push` event → muestra notificación con título/cuerpo/icono
  - `notificationclick` → enfoca/abre URL de la notificación
- `frontend/src/pages/Perfil.tsx`:
  - Reemplazado mensaje "próximamente" por `NotificacionesPush` componente
  - `Notification.requestPermission()` + `navigator.serviceWorker.register('/sw.js')`
  - Suscripción vía `POST /notificaciones/subscribe` con la key VAPID pública
  - Botón toggle Activar/Desactivar, estados: no-soportado, denegado, inactivo, activo

### Tests

- **Mypy:** 0 errors ✅
- **Frontend (vitest):** 19/19 ✅
- **Python compile:** limpio (pagos_online.py, notificaciones_push.py, finanzas_router.py, notificaciones_router.py)

### Archivos tocados (nuevos)

- `backend/app/services/pagos_online.py` — nuevo (Stripe checkout + webhook)
- `backend/app/services/notificaciones_push.py` — nuevo (pywebpush + VAPID)
- `backend/alembic/versions/61880be1d112_add_stripe_session_id.py` — nuevo
- `frontend/public/sw.js` — nuevo (service worker)

### Archivos tocados (modificados)

- `backend/requirements.txt` — +`stripe>=15.0`, +`pywebpush>=1.14`
- `backend/.env`, `.env.example`, `.env.test` — +`STRIPE_*`, +`VAPID_*`
- `backend/app/models/financiero.py` — +`stripe_session_id`
- `backend/app/routers/finanzas_router.py` — Stripe real + webhook endpoint
- `backend/app/routers/notificaciones_router.py` — push real
- `backend/app/schemas/financiero.py` — +`stripe_session_id` en schemas
- `frontend/src/pages/MisCuotas.tsx` — redirige a Stripe
- `frontend/src/services/finanzasService.ts` — +success/cancel URL params
- `frontend/src/pages/Perfil.tsx` — notificaciones push reales

### Archivos tocados (mypy fixes)

15 archivos con correcciones de tipado (ver tabla en §1 arriba).

---

## Fase 16 — Auditoría crítica post-fixes + integridad referencial + CI/CD (2026-07-22) — COMPLETA

**Origen:** Cherry-pick de commits `08564f6` y `10022fc` con 7 fixes de backend/frontend. Auditoría integral de todo el proyecto para confirmar estado post-fixes y corregir hallazgos pendientes.

### Commits cherry-picked — 7 fixes verificados

| Fix | Prioridad | Archivo | Estado |
|-----|-----------|---------|--------|
| 1 — Bloquear `activo`/`fecha_ingreso`/`cedula`/`cv` en PATCH no-admin | ALTO | `users_router.py:236-238` | ✅ |
| 2 — `_requiere_profesor()` permite admin además de profesor | MEDIO | `profesor_router.py:14-18` | ✅ |
| 3 — `require_role('admin')` estandarizado (0 inline checks) | MEDIO | `materia_router.py`, `users_router.py` | ✅ |
| 4 — No enviar contraseña en texto plano por email | BAJO | `email_utils.py`, `auth_router.py` | ✅ |
| 5 — `joinedload` en mis_notas/mi_asistencia (N+1) | ALTO | `alumno_router.py:109,154` | ✅ |
| 6 — `contains_eager` en boleta PDF (N+1) | MEDIO | `boleta_router.py:368` | ✅ |
| 7 — `.items` extraído de respuesta paginada en Boleta.tsx | Frontend | `Boleta.tsx:65,83` | ✅ |

### Hallazgos de auditoría

**✅ sessionStorage.getItem('token') — FALSO POSITIVO.** No hay componentes que lean el token de storage. El token vive en memoria (`_accessToken` en `api.ts`). sessionStorage solo almacena flags auxiliares. Todos los accesos manejan null.

**🔴 Integridad referencial — CORREGIDO.** Solo 1 cascade existía (`Examen.inscripciones`). Se agregaron `ondelete="CASCADE"`/`ondelete="SET NULL"` a 30+ ForeignKeys en 12 modelos, más `cascade="all, delete-orphan"` en 18 relaciones padre→hijo. Migración Alembic generada (`b42cc57fda33`). Modelos tocados: `refresh_token`, `financiero`, `examen`, `inscripcion`, `pasantia`, `graduacion`, `tramites`, `equivalencia`, `users`, `recordatorio_docente`, `apunte`, `evento_calendario`.

**🟡 Pagos Online — STUB confirmado.** `gateway.stub` (dominio falso). Sin SDK real. Sin cambios.

**🟡 Notificaciones Push — STUB confirmado.** Suscripción real, envío es stub. Sin cambios.

**🔴 CI/CD — CREADO.** Nuevo pipeline GitHub Actions (`.github/workflows/ci.yml`) con jobs paralelos:
- **Backend:** Python 3.12, PostgreSQL 16 (service container), `alembic upgrade head`, `pytest` (sin postgres_compat).
- **Frontend:** Node 20, `npm ci`, `npm run test:run`, `npm run build`.

**🟡 Seed scripts — CORREGIDO.**
- `seed.py`: `Base.metadata.create_all()` reemplazado por verificación con `inspect()` — exige `alembic upgrade head` primero.
- `seed_restante.py`: variable `count` reusada (bug de línea 89) corregida separando `count_asist` / `count_cuotas`.

**🔴 Mypy — ~267 errores.** Deuda técnica documentada en `mypy.ini` (estilo SQLAlchemy 1.x `Column()` vs `Mapped[]`). Sin cambios.

**🟡 Tests frontend — CORREGIDO.** 6 tests fallaban por conteos desactualizados (se eliminaron Foro/Centro de Ayuda del menú) + mock `[]` causaba crash en AdminDash. Arreglado: `Layout.test.tsx` (admin 16, alumno 17, prof 9), `Dashboard.test.tsx` (mock retorna `AdminDashboardData` válido). 19/19 ✅.

**🟢 CSRF — ADECUADO.** Double-Submit Cookie en `/auth/refresh`. Bearer token protege el resto. `secrets.compare_digest()` usado. Tests existentes.

### Pyrefly errors corregidos

| Archivo | Error | Fix |
|---------|-------|-----|
| `admin_router.py:111-112` | `NoneType` no tiene `total`/`pres` | `asis_row if asis_row else 0` |
| `admin_router.py:137,165` | Variables no inicializadas fuera de `if` | Inicializadas como `set()`/`{}` al inicio |
| `eventos_router.py:59` | `response.text` puede ser None | `(response.text or "").strip()` |
| `finanzas_router.py:185-189` | Código muerto tras `return` | Eliminado |
| `graduacion_router.py:51-52` | `completo` puede ser None | Guard `if completo is None: return proceso` |

### Tests

- **Frontend:** 19/19 ✅ (antes 13/19, 6 fallaban)
- **Backend:** 38/38 ✅ (test_basic, test_auth, test_refresh_tokens, test_users)
- **Migración Alembic:** `b42cc57fda33` — feat: agregar ondelete cascada/setnull a FKs

### Archivos tocados (resumen)

**Modelos (12):** `refresh_token.py`, `financiero.py`, `examen.py`, `inscripcion.py`, `pasantia.py`, `graduacion.py`, `tramites.py`, `equivalencia.py`, `users.py`, `recordatorio_docente.py`, `apunte.py`, `evento_calendario.py`

**Routers corregidos (4):** `admin_router.py`, `eventos_router.py`, `finanzas_router.py`, `graduacion_router.py`

**Frontend corregido (3):** `Dashboard.tsx` (optional chain), `Layout.test.tsx` (conteos), `Dashboard.test.tsx` (mock)

**Seed scripts (2):** `seed.py` (sin create_all), `seed_restante.py` (count_asist/count_cuotas)

**Nuevos:** `.github/workflows/ci.yml`, `alembic/versions/b42cc57fda33_*.py`

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
