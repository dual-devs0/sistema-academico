# RESUMEN TÉCNICO COMPLETO — Sistema Académico UCA V2

> Generado: 2026-07-24 · Última actualización: Fase 19 + fix seguridad (commit 99b1f3b)

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Backend** | FastAPI + SQLAlchemy (ORM) + PostgreSQL (Neon) + Alembic + JWT + Stripe + pywebpush + guarani.app |
| **Frontend** | React 19 + TypeScript + Vite + Tailwind v4 + Recharts + Vitest |
| **Mobile** | Expo SDK 57 + React Native 0.86 + NativeWind v4 + Reanimated 4.5 + expo-router |
| **CI/CD** | GitHub Actions (Python 3.12 + Node 20 + PostgreSQL 16) |
| **Infra** | Neon PostgreSQL (free tier) · Cloudflare R2 (storage) · SMTP Gmail/Resend |

---

## CRONOLOGÍA COMPLETA POR FASES

### FASE 0 — Deuda técnica crítica (2026-07-04 → 05) ✅ COMPLETA

**Objetivo:** Establecer la base técnica sólida.

| Tarea | Estado | Detalle |
|-------|--------|---------|
| Migración SQLite → PostgreSQL | ✅ | Neon PostgreSQL, pool_size=10, pool_pre_ping=True |
| Storage real (Cloudflare R2) | ✅ | `app/services/storage.py` con subir/eliminar/url_firmada |
| SMTP funcional (Gmail) | ✅ | Reset contraseña + notificaciones por email |
| Auth: cookie httpOnly + refresh | ✅ | Access 15min body + refresh 7d cookie httpOnly |
| Tests | ✅ | 79 tests (49 originales + 30 nuevos PostgreSQL compat) |

---

### FASE 1 — Quick wins + portal docente (2026-07-06 → 07) ✅ COMPLETA

**Objetivo:** Conectar frontend a datos reales + mejorar experiencia profesor.

| Subtarea | Estado | Detalle |
|----------|--------|---------|
| 1.1 Estadísticas al endpoint real | ✅ | `estadisticasService.ts`, sin mocks |
| 1.2 Foro: fijar/cerrar + edición + paginación | ✅ | `PATCH /foro/mensajes/{id}`, ventana 15min |
| 1.3 Usuarios: paginación server-side | ✅ | `TablaPaginada.tsx` genérico, `GET /users/` con skip/limit/q/role |
| 1.4 Fusión Mis Materias (Activas/Histórico/Agenda) | ✅ | `MisMaterias.tsx` reescrito con 3 pestañas |
| Bug transversal sessionStorage | ✅ | Corregido en Foro, MisMaterias, useRole (3 veces) |

**Tests:** 96/96 ✅

---

### FASE 2 — Pensum y malla curricular (2026-07-07) ✅ COMPLETA

**Objetivo:** Validar avance de carrera y bloqueo por correlatividad.

| Componente | Estado | Detalle |
|------------|--------|---------|
| Backend: 3 tablas nuevas + carreras extendida | ✅ | pensum_materias, correlatividades, avance_alumno_pensum |
| 8 endpoints /pensum | ✅ | CRUD + correlatividades + avance + créditos |
| Validación de correlatividades | ✅ | Función pura testable, integrada en POST /inscripciones |
| Frontend: MallaAdmin.tsx | ✅ | Grilla editable por semestre |
| Frontend: MallaAlumno.tsx | ✅ | Visualización tipo árbol con 5 estados de color |
| KPI créditos en Dashboard | ✅ | Barra de progreso |

**Tests:** 121/121 ✅

---

### FASE 3 — Expediente académico (2026-07-08) ✅ COMPLETA

**Objetivo:** Historial completo + PPA acumulado + regularidad.

| Componente | Estado | Detalle |
|------------|--------|---------|
| Backend: calcular_ppa, calcular_regularidad | ✅ | PPA_UMBRAL_RIESGO=7.0, 4 estados |
| 4 endpoints /expediente | ✅ | Historial, regularidad, PDF, recálculo manual |
| Frontend: ExpedienteAlumno.tsx | ✅ | PPA, regularidad, historial por período |
| Frontend: ExpedienteAdmin.tsx | ✅ | Búsqueda de alumno, cerrar materia |
| Migración aplicada en neondb | ✅ | Alembic stamp head tras drift de create_all() |

**Tests:** 137/137 ✅

---

### FASE 4 — Financiero + becas (2026-07-08) ✅ COMPLETA

**Objetivo:** Cuotas, pagos, bloqueo por deuda, becas diferenciadas.

| Componente | Estado | Detalle |
|------------|--------|---------|
| 8 tablas nuevas (Numeric(12,2)) | ✅ | ConceptoArancel, Cuota, Pago, FuenteBeca, BecaCatalogo, etc. |
| Bloqueo de mora en inscripciones | ✅ | Bypass para beca 100% |
| Becas ITAIPU vs Institucional | ✅ | Fuente externa = solo lectura; institucional = editable |
| Export Excel rendición | ✅ | Para convenios externos |
| Frontend: MisCuotas.tsx | ✅ | Vista alumno |
| Frontend: Finanzas.tsx | ✅ | Vista admin |

---

### FASE 4B — Facturación electrónica (2026-07-09) ✅ COMPLETA

**Objetivo:** Integración con guarani.app para comprobantes DNIT.

| Componente | Estado | Detalle |
|------------|--------|---------|
| Servicio facturacion_electronica.py | ✅ | httpx.AsyncClient, degradación con gracia |
| Migración users.cedula + comprobantes extendidos | ✅ | t7u8v9w0x1y2 |
| Job de reintentos cada 10min / máx 5 intentos | ✅ | asyncio puro via lifespan |
| 3 endpoints comprobantes | ✅ | get, reintentar, pendientes |
| Frontend badge + tab comprobantes | ✅ | MisCuotas + Finanzas admin |

**Tests:** 172/172 ✅

---

### FASE 5A — Solicitudes y trámites (2026-07-09) ✅ COMPLETA

**Objetivo:** Constancias, historiales oficiales con PDF automático.

| Componente | Estado | Detalle |
|------------|--------|---------|
| Tablas tipos_tramite + solicitudes | ✅ | 4 tipos fijos (2 automáticos + 2 manuales) |
| Generación PDF síncrona (reportlab) | ✅ | constancia_regular + historial_oficial |
| 5 endpoints dual-role | ✅ | alumno/admin con mismo endpoint |
| Frontend: SolicitudesTramites.tsx | ✅ | Vista alumno + admin condicional |

**Tests:** 182/182 ✅ (10 nuevos)

---

### FASE 5B — Graduación y tesis (2026-07-09) ✅ COMPLETA

**Objetivo:** Proceso de egreso, director de tesis, solvencia.

| Componente | Estado | Detalle |
|------------|--------|---------|
| 3 tablas + función verificar_condicion_egreso | ✅ | Verifica créditos + PPA + pasantía |
| 6 endpoints | ✅ | condición, procesos, tutor, etapas, solvencia, docs CONES |
| Frontend: GraduacionAdmin.tsx + GraduacionAlumno.tsx | ✅ | Admin + alumno |

**Tests:** 9/9 ✅

---

### FASE 5C — Pasantías (2026-07-09) ✅ COMPLETA

**Objetivo:** Empresas receptoras, horas, informes.

| Componente | Estado | Detalle |
|------------|--------|---------|
| 3 tablas | ✅ | empresas_receptoras, pasantias, informes_pasantia |
| 6 endpoints | ✅ | empresas, solicitudes, aprobar, horas, informes, finalizar |
| Frontend: PasantiasAlumno.tsx + PasantiasAdmin.tsx | ✅ | Alumno + admin |

**Tests:** 11/11 ✅

---

### FASE 5D — Equivalencias (2026-07-09) ✅ COMPLETA

**Objetivo:** Traslados, convalidaciones, exámenes de suficiencia.

| Componente | Estado | Detalle |
|------------|--------|---------|
| 3 tablas | ✅ | solicitudes_equivalencia, equivalencias_materia, examenes_suficiencia |
| 4 endpoints | ✅ | solicitudes, resolver, examenes, alumno |
| Auto-inscripción en expediente + pensum al aprobar | ✅ | Integración con Fases 2/3 |
| Frontend: EquivalenciasAlumno.tsx + EquivalenciasAdmin.tsx | ✅ | Alumno + admin |

**Tests:** 7/7 ✅

---

### FASE 6 — Auditoría integral (2026-07-09) ✅ COMPLETA

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| ruff E,F,W | ✅ | 873→0 errores |
| eslint frontend | ✅ | 89→0 errores |
| tsc frontend | ✅ | 0 errores |
| strict:true tsconfig | ✅ | Agregado sin errores nuevos |

---

### FASE 6B — Hardening (2026-07-09) ✅ COMPLETA

**Bug crítico encontrado y corregido:**
- `POST /auth/refresh` estaba completamente roto: `not RefreshToken.revocado` era negación Python de Column (siempre False), ningún refresh funcionaba → 401 siempre
- Corregido a `RefreshToken.revocado == False`

**Suite:** 3 failed → 0 failed (209 passed)

---

### FASE 7 — Extensión integral (2026-07-11) ✅ COMPLETA

| Subtarea | Estado | Detalle |
|----------|--------|---------|
| 7A Tests frontend (Vitest) | ✅ | 19/19 ✅ |
| 7B Design System | ⏸️ | Diferido (riesgo regresión > beneficio) |
| 7C Becas UI | ✅ | BecasAlumno.tsx (3 tabs), ruta /mis-becas |
| 7D Contraseña funcional | ✅ | PATCH /users/{id} + validaciones |
| 7E Backend exámenes | ✅ | Modelos + router + 15 tests ✅ |
| 7F.1 Pagos online (Stripe) | ✅ | Checkout Sessions + webhook + migración |
| 7F.2 Notificaciones Push | ✅ | pywebpush + VAPID keys + service worker |

**Tests:** 80 tests clave ✅

---

### FASE 7G — App móvil (2026-07-11) ✅ COMPLETA (v1 funcional)

**9/9 pantallas implementadas:**
1. Login (JWT + SecureStore + biometric)
2. Dashboard (KPIs, progress, next event)
3. Notas (semester selector, donut charts)
4. QR Scanner (asistencia)
5. Horario (calendar)
6. Perfil (settings, theme toggle)
7. Cursos (detail)
8. Cuenta (billing, cuotas)
9. Exámenes (próximamente)

**Backend extensido:** `POST /asistencias/qr/verificar` (JWT TTL 15min)

**Tests:** 221/221 backend ✅, 10/10 mobile ✅

---

### FASE 8 — Hardening seguridad (2026-07-13) ✅ COMPLETA

| Hallazgo | Fix |
|----------|-----|
| CSRF solo en refresh | CSRF global middleware ASGI |
| current_user era dict | Pydantic CurrentUser en 26 routers |
| temarios huérfano | Eliminado (programas lo cubre) |
| Sin paginación | skip/limit en asistencias, puntajes, materias |
| Sin rate limit en login | 5 fallos/15min por username:ip |
| Sin alerta inasistencia | Alerta ≥25% con email a alumno+profesor+admins |
| Sin export RUE-ES | CSV para MEC/CONES |

**Tests:** 21+5+3+4+31 = 64 nuevos ✅

---

### FASE 9 — Auditoría mobile (2026-07-16) ✅ COMPLETA

- TypeScript 0 errores ✅
- Tests 10/10 ✅
- Endpoints `GET /notas/materia/{id}/detalle` y `GET /notas/materia/{id}/asistencia` creados
- Conexión app→backend configurada

---

### FASE 9B — UI polish mobile (2026-07-17) ✅ COMPLETA

- Tab bar sync en UI thread
- SemestreSheet con PanResponder
- NotificationsSheet panel flotante
- Perfil: PromedioCard + RegularidadCard
- Scanner: glow circles removidos
- WelcomeOverlay profesional
- BackHandler inteligente
- Login: FadeIn sin glitch

---

### FASE 10A — Paleta roles + 4 bugs (2026-07-18) ✅ COMPLETA

| Fix | Detalle |
|-----|---------|
| Paleta de roles | `[data-role]` sincronizado (alumno=sky, profesor=orange, admin=emerald) |
| Bug: Perfil/Boleta usaban sessionStorage | Corregido a getCurrentUser()/getAccessToken() |
| Bug: Asistencia badge "EN RIESGO" con 0 sesiones | Muestra "Sin datos aún" |
| Bug: Trámites mostraba error en catálogo vacío | Skeleton cards + empty state |
| Drift neondb | Migración u8v9w0x1y2z3 stampeada pero nunca ejecutada — cirugía de migración |

---

### FASE 10B — Malla/Pasantías/Graduación enriquecidas (2026-07-18) ✅ COMPLETA

| Fix | Detalle |
|-----|---------|
| Malla: columna código materia | Migración d1e2f3g4h5i6, backfill PREFIJO-NNN |
| Malla: nota + estado reprobada | AvanceMateriaOut.expone nota, 5 estados |
| Pasantías: endpoint listado faltante | GET /pasantias/solicitudes (dual-role) |
| Pasantías: admin con datos reales | Select profesores, created_at, motivo_rechazo |
| Graduación: endpoint candidatos | GET /graduacion/candidatos (paginado) |
| Graduación: etapas endpoint faltante | GET /graduacion/procesos/{id}/etapas |

---

### FASE 11A — Índices FK (2026-07-18) ✅ COMPLETA

Migración e2f3g4h5i6j7: 8 índices en columnas FK usadas en filtros/joins frecuentes:
- `users.role`, `asistencias.user_id/oferta_materia_id`, `puntajes.user_id/oferta_materia_id`, `inscripciones.alumno_id/oferta_materia_id`, `avance_alumno_pensum.alumno_id`

**Tests:** 271/271 ✅

---

### FASE 11B — Eliminar N+1 (2026-07-18) ✅ COMPLETA

7 endpoints refactorizados:
- `avance_alumno`: ~250-600 queries → 7 fijas
- `creditos_alumno`: 2×N → 2 fijas
- `obtener_malla_carrera`: N → 1 batch
- `alumnos_asistencia`: 2×N → 1 GROUP BY
- `profesor_alumnos`: N → 1 batch IN
- `cargar_asistencia_lote`: 2×N → 2 batches
- `listar_candidatos`: ~8×N → ~5 fijas

---

### FASE 11C — Bugs de conexión (2026-07-18) ✅ COMPLETA

| Bug | Fix |
|-----|-----|
| BecasAlumno: userId siempre 0 | getCurrentUser() |
| Foto de perfil: campo wrong | 'file'→'foto', 'data.foto_url'→data.url |
| Foto: storage_key cruda no URL firmada | 3 endpoints ahora llaman obtener_url_firmada() |
| Inscripciones: exponía TODAS las materias | Filtrado por carrera_id del alumno |
| Registro: endpoint inexistente | POST /auth/registro implementado |

---

### FASE 11D — Hardening final (2026-07-18) ✅ COMPLETA

| Fix | Detalle |
|-----|---------|
| XSS en Reportes.tsx | escapeHtml() en interpolación |
| Listener leak en Layout.tsx | Función nombrada para cleanup |
| Dead clicks en Usuarios.tsx | UI selección múltiple eliminada (sin backend) |
| Mobile: React 19 conflict | react@19.2.3→19.2.7 |
| Mobile: @lottiefiles/dotlottie-react | Agregado para splash animado |

---

### FASE 12 — Diagnóstico sin fixes (2026-07-19) ✅ COMPLETA

**Resultado:** 3 bugs reales, 1 gap mobile, resto ruido de linter.

---

### FASE 13 — Fix 3 bugs reales (2026-07-18) ✅ COMPLETA

| Bug | Fix |
|-----|-----|
| pasantias_router.py:184 TypeError | Firma corregida subir_archivo() |
| Boleta.tsx: dropdown vacío profesor | GET /users/ era admin-only, endpoint nuevo GET /profesor/lista-alumnos |
| DELETE users no limpiaba refresh_tokens | Cascade delete agregado |

**Tests:** 273/273 ✅

---

### FASE 14 — Gap mobile (2026-07-19) ✅ COMPLETA

- React 19.2.3→19.2.7 (alineado con ecosistema Expo)
- @lottiefiles/dotlottie-react agregado
- Build web: 1487 módulos sin error

---

### FASE 15 — Fixes auditoría julio 2026 (2026-07-20) ✅ COMPLETA

Cherry-pick commits con fixes de Dev A + Dev C:
- Merge Alembic heads
- Migración peligrosa b890f76d76ae corregida
- rename temarios→programas
- postgresql.JSON()→sa.JSON()
- Pasantia.motivo_rechazo
- window.__auth_token__ eliminado
- helpers api.upload()/api.download()
- GET /carreras/ con auth
- Router-to-router imports eliminados

**Tests:** 273/273 ✅

---

### FASE 16 — Mypy 0 errores + Pagos Online real + Push real (2026-07-22) ✅ COMPLETA

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Mypy | ✅ | 53→0 errores en 15 archivos |
| Pagos Online | ✅ | Stripe Checkout Sessions + webhook real |
| Notificaciones Push | ✅ | pywebpush + VAPID keys + service worker sw.js |
| Frontend tests | ✅ | 19/19 ✅ |

---

### FASE 16C — CSRF refresh + Pasantías Admin (2026-07-22) ✅ COMPLETA

- Fix CSRF: sesión persiste tras F5 (cookie-based)
- Pasantías: created_at + motivo_rechazo + select tutores reales

---

### FASE 16D — Equivalencias Admin (2026-07-22) ✅ COMPLETA

- created_at en SolicitudEquivalencia
- GET /equivalencias/solicitudes (admin todas)
- GET /equivalencias/materias (dropdown)
- Frontend reescrito con selects reales

---

### FASE 17 — Ajustes Globales (2026-07-22) ✅ COMPLETA

- Modelos GlobalSetting + SettingAuditLog
- Auto-seed 20 settings en 4 categorías
- 6 endpoints admin-only
- Frontend AjustesGlobales.tsx con 5 tabs, edición inline, auditoría, export/import

---

### FASE 18 — Refinamiento visual (2026-07-22) ✅ COMPLETA

| Módulo | Mejora |
|--------|--------|
| Calendario | PDF upload admin, modal profesor, tipos parcial_1/2 |
| Asistencia Profesor | Chips compactos, QR+timer, batch global, DELETE |
| MisMaterias | Grade distribution bars, polling 30s, agenda en vivo |
| Puntajes | Batch save, dirty tracking, CSV export |
| Estadisticas | Rewrite completo, discrimina admin/profesor |
| BibliotecaDigital | Glassmorphism, FAB upload, validación contenido |
| PerfilProfesor | Polling 30s, barras aprobación, cambio contraseña |
| CentroAyuda | Modal rediseñado 4 acciones + FAQ |
| Logout | Confirmación modal |

---

### FASE 19 — Motor de notas por puntos + Cursos unificado (2026-07-23) ✅ COMPLETA (código) — PENDIENTE commit/push/deploy

| Componente | Estado | Detalle |
|------------|--------|---------|
| 19A Motor notas 0-100 | ✅ | pesos_evaluacion configurable, migración de datos, calcular_promedio_final centralizado |
| 19B Cursos unificado | ✅ | Asistencia+Calificaciones en Programa.tsx, tabs Temario/Asistencia/Calificaciones |
| 19C Auditoría real-data | ✅ | 6 bugs reales encontrados y corregidos (finanzas, dashboard, becas, boleta, inscripciones, tramites) |

**Tests:** 273/273 backend ✅, build frontend 0 errores

---

### FASE ÚLTIMA (commit 99b1f3b) — Auditoría seguridad (2026-07-23) ✅ (staged, sin commit)

Cherry-pick aplicado con:
- ESLint 51→0 problemas
- Mobile tsc fix (PagerView)
- CI: continue-on-error: false
- JWT blacklist (TokenBlacklist + migración)
- Cache con TTL (cache.py)
- CSRF global middleware
- Rate limiting global (slowapi)
- Race condition fixes (threading.Lock)
- Password reset con token time-limited (no envío de contraseña)
- Refresh token leak eliminado del response body

---

## MÉTRICAS FINALES

| Métrica | Valor |
|---------|-------|
| **Tests backend** | 273+ ✅ |
| **Tests frontend** | 19/19 ✅ |
| **Tests mobile** | 10/10 ✅ |
| **tsc errores** | 0 |
| **eslint errores** | 0 |
| **mypy errores** | 0 |
| **ruff errores** | 0 |
| **Migraciones Alembic** | ~24 aplicadas |
| **Modelos SQLAlchemy** | ~28 tablas |
| **Endpoints backend** | ~89+ |
| **Páginas frontend** | ~30+ |
| **Pantallas mobile** | 9/9 |
| **Fases completadas** | 19/19 + fix seguridad |

---

## LO QUE FALTA POR HACER

### Bloqueante antes de deploy real:

| # | Tarea | Prioridad | Detalle |
|---|-------|-----------|---------|
| 1 | **Commitear y pushear** | CRITICO | 114 archivos modificados sin commitear en push-final, 47 commits adelante de origin sin push |
| 2 | **Decidir rama canónica** | CRITICO | 15 branches divergentes — deployar sin resolver esto pierde trabajo |
| 3 | **Secretos de producción** | CRITICO | STRIPE_SECRET_KEY, VAPID keys, GUARANI_APP_API_KEY en placeholder |
| 4 | **Hosting** | CRITICO | Elegir y configurar (Render backend, Vercel frontend) |
| 5 | **DNI/codigo_mec_carrera** | MEDIO | Placeholder vacío en export RUE-ES, necesita plantilla oficial del MEC |

### Deuda técnica conocida:

| # | Item | Impacto | Detalle |
|---|------|---------|---------|
| 1 | **Design System** | Bajo | 29 componentes con CSS inline duplicado (deferido intencionalmente) |
| 2 | **Tests mobile incompletos** | Medio | Solo 3 de 9 pantallas cubiertas |
| 3 | **Pago online sin probar end-to-end** | Medio | Stripe en sk_test_placeholder |
| 4 | **6 warnings eslint exhaustive-deps** | Bajo | Revisar caso a caso |
| 5 | **Dummy data en mobile** | Bajo | cursos/[id].tsx y asistencia.tsx |
| 6 | **Rediseño visual login** | Bajo | Pausado a pedido del usuario |

### Funcionalidades pendientes:

| # | Feature | Estado |
|---|---------|--------|
| 1 | **Pago online end-to-end** | Stub listo, falta configurar Stripe real |
| 2 | **Rediseño login alumno/profesor** | Pausado por usuario |
| 3 | **Modo colegio** | Fuera de alcance (documento separado) |
| 4 | **Reportes ANEAES** | No iniciado |
| 5 | **Alertas deserción ML** | No iniciado |

---

## ESTADO DE LA BASE DE DATOS

| Entorno | Estado |
|---------|--------|
| **Producción (neondb)** | Todas las migraciones aplicadas hasta `b42cc57fda33` (FK cascades) + commit 99b1f3b pendiente |
| **Testing (neondb_test2)** | Auto-suspensión desactivada (Never), migraciones al día |
| **Local (SQLite)** | Usado para tests, ~28 tablas |
| **Drift detectado y corregido** | 3 instancias resueltas (temarios→programas, expediente_materias, u8v9w0x1y2z3) |

---

*Sistema Académico UCA V2 | Resumen Técnico Completo | Julio 2026*
