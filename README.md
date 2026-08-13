# Sistema Académico UCA V2

Sistema de gestión académica integral para la Universidad Católica (Paraguay) — backend FastAPI,
frontend web React y app móvil Expo/React Native, para los roles Alumno, Profesor y Admin.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | FastAPI + SQLAlchemy + Alembic + PostgreSQL (Supabase) + JWT |
| Frontend web | React 19 + TypeScript + Vite + Tailwind v4 |
| Mobile | Expo SDK 57 + React Native + expo-router + NativeWind v4 |
| Auth | JWT (access en body + refresh en cookie httpOnly) + CSRF double-submit + rate limiting |
| Storage | Cloudflare R2 (S3-compatible) |
| Email | Resend / SendGrid / SMTP (proveedor intercambiable, degrada con gracia) + templates HTML propios |
| Pagos | Stripe Checkout Sessions |
| PDF/QR | ReportLab, WeasyPrint, qrcode |

## Estado actual

19 fases de desarrollo completas en código (motor de notas por puntos, correlatividades, PPA,
financiero, becas, facturación electrónica, trámites, graduación, pasantías, equivalencias, portal
docente, app mobile) más una auditoría de seguridad pre-producción cerrada el 2026-07-24
(8 hallazgos reales corregidos: bug de arranque por dependencia sin pinnear, CSRF que podía
desactivarse por accidente, user enumeration en reset de contraseña, y otros — detalle completo en
[`docs/auditorias/AUDITORIA_2026-07-24.md`](docs/auditorias/AUDITORIA_2026-07-24.md)).

**No está en producción todavía.** Código, tests y CI están verdes; falta la parte de infraestructura
(elegir/confirmar hosting, cargar secretos reales de Stripe/VAPID/guarani.app, dominio). Detalle
completo en [`docs/documentacion-tecnica/DOCUMENTACION_TECNICA_TOTAL.md`](docs/documentacion-tecnica/DOCUMENTACION_TECNICA_TOTAL.md)
(sección 11 — Estado actual y roadmap).

## Instalación / correr local

Ver [`docs/web-system/INSTALACION.md`](docs/web-system/INSTALACION.md) para la guía completa
(backend + frontend + mobile).

## Estructura del repo

```
backend/     FastAPI + SQLAlchemy + Alembic (routers, services, models, tests, migraciones)
frontend/    React 19 + Vite (pages por módulo, componentes, hooks, lib/api)
mobile/      Expo/React Native (app-router, componentes, servicios)
docs/        Documentación consolidada (ver índice abajo)
```

## Documentación

| Carpeta | Contenido |
|---|---|
| `docs/web-system/` | `CLAUDE.md` (reglas del proyecto), `COMANDOS.md`, `ESTADO_FASES.md` (fase por fase), `ARQUITECTURA.md`, `API_REFERENCE.md`, `MODELO_DATOS.md`, `INSTALACION.md`, `INSTRUCTOR.md` |
| `docs/app-mobile-system/` | `CHANGELOG_MOBILE.md`, `PLAN_DESARROLLO_MOBILE.md`, `EXPO_GO_TESTING.md`, `CLAUDE.md` (reglas específicas mobile), `AGENTS.md`, `analisis_app_mobile.md` |
| `docs/auditorias/` | `AUDITORIA_2026-07-24.md` (auditoría de seguridad), `PLAN_FIXES_AUDITORIA.md`, `CHANGELOG_FIXES.md` (**fuente de verdad de seguridad/fixes recientes**) |
| `docs/documentacion-tecnica/` | `DOCUMENTACION_TECNICA_TOTAL.md` (documento consolidado, base para el PDF técnico), `RESUMEN_TECNICO_COMPLETO.md` (historial de las 19 fases), `CHANGELOG_TECNICO.md` |
| `docs/negocio/` | `PLAN_DESARROLLO_UNIVERSIDAD.md`, `PLAN_VENTAS_UNIVERSIDADES.md` |

`backend/README.md` y `frontend/README.md` tienen el arranque técnico rápido de cada subproyecto.

## Tests

```bash
# Backend (282 tests)
cd backend && pytest -v

# Frontend (19 tests + lint + tsc)
cd frontend && npm run test:run && npm run lint && npx tsc --noEmit

# Mobile (tsc)
cd mobile && npx tsc --noEmit
```

## Seguridad

Ver [`docs/auditorias/CHANGELOG_FIXES.md`](docs/auditorias/CHANGELOG_FIXES.md) para el historial completo
de fixes de seguridad aplicados (CSRF global, rate limiting, JWT blacklist, reset de contraseña con
token time-limited, refresh token fuera del response body, y los 8 hallazgos de la auditoría del
2026-07-24).

## Autoría

WebPy Studio.
