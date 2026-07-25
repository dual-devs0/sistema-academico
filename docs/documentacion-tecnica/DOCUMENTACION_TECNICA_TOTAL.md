# Sistema Académico UCA V2 — Documentación Técnica Total

**Versión del documento:** 1.0
**Fecha:** 2026-07-24
**Autor / empresa:** WebPy Studio
**Sistema:** Sistema Académico UCA V2 (backend web + frontend web + app móvil)

> Este documento sintetiza y referencia el resto de `docs/` — no duplica contenido palabra por
> palabra. Para el detalle exhaustivo de cada sección, seguir los links a los documentos fuente.
> Es la base para la conversión a PDF (pendiente, a pedido del usuario).

---

## Tabla de contenidos

1. [Introducción y objetivos del sistema](#1-introducción-y-objetivos-del-sistema)
2. [Alcance](#2-alcance)
3. [Arquitectura general](#3-arquitectura-general)
4. [Modelo de datos](#4-modelo-de-datos)
5. [API y endpoints](#5-api-y-endpoints)
6. [Módulos del sistema web (por rol)](#6-módulos-del-sistema-web-por-rol)
7. [Módulo mobile](#7-módulo-mobile)
8. [Seguridad implementada](#8-seguridad-implementada)
9. [Testing y calidad](#9-testing-y-calidad)
10. [Historial de desarrollo](#10-historial-de-desarrollo)
11. [Estado actual y roadmap](#11-estado-actual-y-roadmap)
12. [Anexos](#12-anexos)

---

## 1. Introducción y objetivos del sistema

El Sistema Académico UCA V2 es una plataforma de gestión académica integral pensada para
universidades paraguayas, con foco inicial en la Universidad Católica (UCA). Cubre el ciclo completo
de vida académico y administrativo de un alumno — desde la inscripción a materias hasta la
graduación — y da soporte operativo a profesores y administración.

Objetivo del sistema: reemplazar procesos manuales/dispersos (planillas, papel, sistemas legacy) por
una plataforma única, con tres frentes de acceso — web (alumno/profesor/admin), y una app móvil
complementaria para alumnos y profesores — sobre una única fuente de verdad de datos (PostgreSQL).

## 2. Alcance

**Incluye (versión actual):**
- Gestión de materias, ofertas por período, inscripciones con validación de correlatividades.
- Motor de calificaciones por puntos configurables (0-100 por materia, reescalado a PPA 0-10).
- Asistencias (registro manual y por QR), alertas automáticas de inasistencia crítica.
- Pensum/malla curricular con estados de avance por materia.
- Expediente académico: PPA acumulado, regularidad (activo/en_riesgo/irregular/de_baja).
- Financiero: cuotas, pagos (efectivo + Stripe online), becas (ITAIPU/institucional), bloqueo por
  mora con bypass para beca 100%, facturación electrónica (guarani.app, degrada con gracia).
- Trámites (constancias/historiales, automáticos y manuales, PDF).
- Graduación: verificación de condición de egreso, procesos de tesis.
- Pasantías: empresas receptoras, solicitudes, control de horas, informes.
- Equivalencias: solicitudes, resolución por examen de suficiencia o reválida.
- Foro, calendario de eventos, biblioteca digital, notificaciones push.
- Portal docente (cátedras, histórico, agenda, recordatorios).
- App móvil (Expo/React Native) con las funciones core para alumno/profesor.

**No incluye (fuera de alcance de esta versión):**
- Modo colegio (documento de negocio separado, no iniciado).
- Reportes ANEAES (no iniciado).
- Alertas de deserción por ML (no iniciado).
- Pago online end-to-end verificado con cuenta Stripe real (código listo, falta clave real).
- Infraestructura de hosting desplegada (código listo para Render + Vercel, no desplegado todavía).

## 3. Arquitectura general

Backend FastAPI + SQLAlchemy sobre PostgreSQL (Neon, serverless), autenticación JWT (access token
15 min en el body de la respuesta, refresh token 7 días en cookie httpOnly), autorización por rol vía
`Depends(get_current_user)` + chequeo de rol en cada router. Frontend React 19 + Vite + Tailwind v4,
sin Redux — estado de sesión en memoria, eventos DOM globales para comunicación entre componentes
desacoplados. App móvil Expo/React Native con expo-router, mismo backend.

Patrones estructurales clave (detalle completo en
[`docs/web-system/ARQUITECTURA.md`](../web-system/ARQUITECTURA.md)):
- Separación `Materia` (catálogo, sin profesor) / `OfertaMateria` (instancia por período, con
  profesor y horario) — evita que se dupliquen materias por período.
- Storage de archivos (fotos, apuntes, comprobantes) vía Cloudflare R2 con URLs firmadas, nunca
  claves crudas expuestas al cliente.
- Middlewares ASGI globales: CSRF (double-submit cookie) y rate limiting (slowapi), aplicados a
  nivel app, no por endpoint individual — ver sección 8.
- Job de reintentos de facturación electrónica corriendo en el `lifespan` del proceso FastAPI
  (asyncio puro, sin scheduler externo).

## 4. Modelo de datos

~30 tablas gestionadas 100% por Alembic (37 migraciones, cadena lineal, un solo head — nunca
`create_all()` en producción, regla no negociable del proyecto). Entidades centrales:
`users` (rol embebido: alumno/profesor/admin), `carreras`, `materias`/`ofertas_materia`,
`inscripciones`, `puntajes` (motor de notas por puntos), `pesos_evaluacion` (configuración de
puntaje máximo por materia), `asistencias`, `expediente_materias`/`regularidad_alumno`,
el bloque financiero (`cuotas`, `pagos`, `comprobantes`, becas), `tramites`/`solicitudes`,
`pasantias`, `equivalencias`, `procesos_graduacion`, y las tablas de seguridad agregadas en la
auditoría de 2026-07-24: `password_reset_tokens`, `token_blacklist`.

Todos los montos monetarios son `Numeric(12,2)`, nunca `float` (regla no negociable del proyecto —
ver `docs/web-system/CLAUDE.md`). Detalle campo por campo, tipos y FKs en
[`docs/web-system/MODELO_DATOS.md`](../web-system/MODELO_DATOS.md).

## 5. API y endpoints

~89 endpoints REST organizados por router (uno por dominio: `/auth`, `/users`, `/materias`,
`/inscripciones`, `/puntajes`, `/asistencias`, `/pensum`, `/expediente`, `/finanzas`, `/tramites`,
`/pasantias`, `/graduacion`, `/equivalencias`, `/foro`, `/eventos`, `/profesor`, `/reportes`,
`/boleta`, `/alumno`, `/admin/settings`). Todo endpoint mutante requiere autenticación
(`Depends(get_current_user)`) + verificación de rol explícita — regla no negociable del proyecto.
Referencia completa endpoint por endpoint, con rol requerido y comportamiento, en
[`docs/web-system/API_REFERENCE.md`](../web-system/API_REFERENCE.md).

## 6. Módulos del sistema web (por rol)

**Alumno:** Dashboard (KPIs, próximas clases), Cursos (temario + asistencia + calificaciones
unificado), Inscripciones (con bloqueo real de correlatividades y cupo), Malla curricular, Expediente
(PPA, regularidad, historial), Boleta (con sello digital verificable vía QR/HMAC), Mis Cuotas (pago
online Stripe), Becas, Pasantías, Solicitudes/Trámites, Graduación, Equivalencias, Perfil.

**Profesor:** Mis Materias (activas/histórico/agenda unificado), carga de notas por puntos
configurables (con panel de configuración de pesos por materia), Asistencia (QR + batch), Portal
docente (recordatorios, agenda), Estadísticas de sus cursos, Perfil.

**Admin:** Usuarios (CRUD, paginación server-side), Materias/Ofertas, Malla Admin, Expediente Admin
(búsqueda de alumno, cierre de materia), Finanzas (cuotas, pagos, comprobantes, rendición Excel),
Pasantías Admin, Graduación Admin, Equivalencias Admin, Ajustes Globales (20 settings, auditoría de
cambios), Reportes/Estadísticas, Gestión de Asignaciones (profesor↔materia).

## 7. Módulo mobile

App Expo/React Native, 9 pantallas: Login (JWT + SecureStore + biometric), Dashboard, Notas
(selector de semestre, donut charts), QR Scanner (asistencia), Horario, Perfil, Cursos (detalle),
Cuenta (cuotas), Exámenes. Mismo backend que la web, auth con refresh token vía body (no solo cookie,
a diferencia de la web) para compatibilidad con el cliente móvil. Deuda conocida: pantalla
`cursos/[id].tsx` usa datos dummy de fallback en un caso puntual (bajo impacto, documentado, no
tocado en esta auditoría — ver sección 11).

## 8. Seguridad implementada

Resumen ejecutivo (detalle completo en
[`docs/auditorias/CHANGELOG_FIXES.md`](../auditorias/CHANGELOG_FIXES.md)):

- **Autenticación:** JWT de acceso corto (15 min) + refresh token httpOnly cookie (7 días, rotado en
  cada uso), nunca expuesto en el response body — solo vía cookie, mitigando robo por XSS.
- **CSRF:** middleware global (double-submit cookie) en todo POST/PUT/PATCH/DELETE mutante, con
  excepciones explícitas solo en los endpoints públicos de auth. Flag de activación propio
  (`CSRF_ENABLED`), separado del rate limiting tras un hallazgo de la auditoría de 2026-07-24 (ver
  sección 9).
- **Rate limiting:** slowapi, 100 req/min global + límites específicos en login, refresh, registro,
  recuperar-contraseña — con locks explícitos para evitar condiciones de carrera bajo concurrencia.
- **Revocación de sesión:** blacklist de JWT por `jti` — logout invalida el access token vigente, no
  solo el refresh token.
- **Reset de contraseña:** flujo con token time-limited (1 hora, hasheado en DB, de un solo uso),
  sin envío de contraseñas por email en ningún flujo. Respuesta uniforme (siempre 200 genérico) para
  no revelar si una cuenta existe.
- **Datos monetarios:** siempre `Numeric(12,2)`, pagos inmutables (nunca se editan in-place, se
  registran movimientos).
- **Secretos:** nunca commiteados; placeholders explícitos (`sk_test_placeholder`, etc.) en
  `.env.example`, gateados con degradación con gracia (feature deshabilitada, no crash) cuando faltan.

## 9. Testing y calidad

Métricas reales, verificadas en esta sesión sobre el commit real (no las que documentaban fases
anteriores, que habían quedado desactualizadas tras varias fases sin re-verificar):

| Check | Resultado |
|---|---|
| pytest backend | **282/282** ✅ |
| vitest frontend | **19/19** ✅ |
| eslint frontend | **0 errores** ✅ |
| tsc frontend | **0 errores** ✅ |
| tsc mobile | **0 errores** ✅ |
| build frontend | OK (920 módulos) |
| Migraciones Alembic | cadena lineal, un solo head, sin bifurcaciones |

La auditoría de seguridad del 2026-07-24 (detalle completo en
[`docs/auditorias/AUDITORIA_2026-07-24.md`](../auditorias/AUDITORIA_2026-07-24.md)) encontró y
corrigió **8 bugs reales**, dos críticos:
1. `bcrypt` sin pin de versión rompía login/registro/reset de contraseña en cualquier instalación
   limpia (incompatibilidad con `passlib`).
2. `slowapi` usado en código pero no declarado como dependencia — el backend no arrancaba en un
   entorno limpio (CI, Render).
3. El middleware CSRF leía el flag de rate limiting por error — desactivar el rate limiting en
   producción desactivaba también la protección CSRF, en silencio.
4. User enumeration en el endpoint de recuperación de contraseña (404 vs 200 revelaba si una cuenta
   existía).
5. Import roto en la verificación de webhooks de Stripe (`stripe.util` no existe en el SDK actual).
6-7. Dos bugs de higiene de tests que enmascaraban fallas reales (script de debug commiteado, fixture
   de sesión compartida mal cerrada).
8. Import roto (`app.models.user` vs `app.models.users`) causaba un 500 real en el endpoint que
   alimenta el selector de tutor académico en Pasantías Admin.

Nota sobre linters de estilo: `ruff` reporta 618 hallazgos (91% son líneas largas en archivos de
test, cosmético) — la cifra "0 errores" documentada en fases anteriores quedó desactualizada tras
las fases 7-19 sin re-correrse; no se corrigió por ser deuda de estilo, no de seguridad/datos
(prioridad explícita de esta auditoría).

## 10. Historial de desarrollo

19 fases de desarrollo completadas en código (Fase 0 — deuda técnica crítica y migración a
PostgreSQL, hasta Fase 19 — motor de notas por puntos y unificación de Cursos), más una fase de
hardening de seguridad (ISSUE-1 a ISSUE-12: CSRF global, rate limiting, JWT blacklist, cache TTL,
reset de contraseña seguro) y la auditoría de cierre del 2026-07-24 (8 hallazgos adicionales).
Resumen fase por fase, con fechas y detalle técnico, en
[`docs/documentacion-tecnica/RESUMEN_TECNICO_COMPLETO.md`](RESUMEN_TECNICO_COMPLETO.md) (anexo
principal de este documento) y en
[`docs/web-system/ESTADO_FASES.md`](../web-system/ESTADO_FASES.md).

## 11. Estado actual y roadmap

**Código:** verde. 282/282 backend, 19/19 frontend, 0 errores de lint/tsc en web y mobile, build OK,
migraciones consistentes. Todo el trabajo pendiente de commitear al inicio de esta sesión de
auditoría ya está commiteado en `push-final` (4 commits: limpieza, comentarios de mantenibilidad,
cierre de auditoría).

**Lo que falta para producción (no es código, es infraestructura/decisiones de negocio):**
- Secretos reales: `STRIPE_SECRET_KEY`/`PUBLISHABLE_KEY`/`WEBHOOK_SECRET` (hoy placeholder — pago
  online no funcional end-to-end), `GUARANI_APP_API_KEY` (facturación electrónica degrada sin
  bloquear, pero no emite comprobante real), `VAPID_PUBLIC_KEY`/`PRIVATE_KEY` fijas (no
  autogeneradas en cada deploy — invalidaría suscripciones push existentes).
- Hosting: decisión tomada en sesión previa (Render para backend — necesita proceso long-running por
  el job de reintentos de facturación; Vercel para frontend — build estático ya verificado), configs
  (`render.yaml`, `frontend/vercel.json`) ya en el repo; falta el deploy real (acción que requiere
  las credenciales/cuenta del usuario, no ejecutable por el asistente).
- Dominio propio (hoy se usa subdominio gratis del hosting, decisión explícita del usuario).
- `CORS_ORIGINS` debe apuntar al dominio real de producción antes de servir el frontend ahí.

**Deuda técnica conocida, no bloqueante:**
- 577 hallazgos de estilo de `ruff` (líneas largas en tests, mayormente).
- Dummy data en `mobile/app/cursos/[id].tsx` (fallback puntual, bajo impacto).
- Rediseño visual del login alumno/profesor — pausado a pedido explícito del usuario.
- Design System (29 componentes con CSS inline duplicado) — deferido intencionalmente, riesgo de
  regresión visual mayor al beneficio.
- Cobertura de tests mobile incompleta (3 de 9 pantallas).

**Venta formal — todavía no es solo una decisión técnica.** Más allá de la infraestructura de
hosting, hay gaps legales, comerciales y de validación de mercado (contrato de licencia, tratamiento
de datos de estudiantes, constitución legal de la empresa, proceso de contratación distinto para
universidades públicas vs privadas) que hay que resolver antes de poder ofrecer el sistema
formalmente a una universidad. Mapa completo en
[`docs/negocio/PLAN_VENTAS_UNIVERSIDADES.md`](../negocio/PLAN_VENTAS_UNIVERSIDADES.md) sección 9.

## 12. Anexos

Documentos completos referenciados en este documento, por carpeta:

**`docs/web-system/`** — `CLAUDE.md` (reglas no negociables del proyecto), `COMANDOS.md` (comandos
frecuentes de desarrollo), `ESTADO_FASES.md` (tabla fase por fase con fechas y detalle), 
`ARQUITECTURA.md` (patrones estructurales, auth, storage), `API_REFERENCE.md` (los ~89 endpoints
documentados uno por uno), `MODELO_DATOS.md` (las ~30 tablas, campo por campo), `INSTALACION.md`
(guía de instalación local), `INSTRUCTOR.md` (guía para quien vaya a dar de alta el sistema).

**`docs/app-mobile-system/`** — `CHANGELOG_MOBILE.md` (historial de cambios mobile),
`PLAN_DESARROLLO_MOBILE.md` (plan original de la app), `EXPO_GO_TESTING.md` (guía de testing con
Expo Go), `CLAUDE.md` (reglas específicas del subproyecto mobile), `AGENTS.md`,
`analisis_app_mobile.md` (análisis de paridad funcional con la web).

**`docs/auditorias/`** — `AUDITORIA_2026-07-24.md` (el reporte de auditoría completo, hallazgo por
hallazgo, con ubicación exacta y causa raíz), `PLAN_FIXES_AUDITORIA.md` (plan de una auditoría
previa), `CHANGELOG_FIXES.md` (changelog cronológico de cada fix de seguridad aplicado — es la fuente
de verdad para saber qué protecciones tiene el sistema hoy).

**`docs/documentacion-tecnica/`** — este documento, `RESUMEN_TECNICO_COMPLETO.md` (historial
detallado de las 19 fases), `CHANGELOG_TECNICO.md` (changelog técnico general, con decisiones de
diseño documentadas caso por caso).

**`docs/negocio/`** — `PLAN_DESARROLLO_UNIVERSIDAD.md`, `PLAN_VENTAS_UNIVERSIDADES.md` (documentos
de negocio, fuera del alcance técnico de este documento).
