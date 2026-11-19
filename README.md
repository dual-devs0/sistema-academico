# Sistema Académico

Sistema de gestión académica para la Universidad Católica (Unidad Pedagógica de Caacupé). Tiene backend en FastAPI, frontend web en React y app móvil en Expo/React Native, para los roles **alumno**, **profesor** y **admin**.

> README técnico para quien desarrolla en el proyecto. Para el detalle de cada módulo, ver [Documentación](#documentación).

## Entornos

| Entorno | Frontend | Backend | Base de datos |
|---|---|---|---|
| Producción | https://sistema-academico-alpha.vercel.app (Vercel) | https://uca-v2-backend.onrender.com (Render, [`render.yaml`](render.yaml)) | PostgreSQL en Supabase |
| Local | http://localhost:5173 (Vite) | http://localhost:8000 (Uvicorn), Swagger en `/docs` | Postgres local (`backend/docker-compose.yml`) o SQLite para la demo |

- El frontend en Vercel reenvía `/api/*` al backend de Render ([`frontend/vercel.json`](frontend/vercel.json)).
- En local, Vite reenvía `/api` y `/static` a `API_PROXY_TARGET` (por defecto `http://127.0.0.1:8000`).
- El plan gratuito de Render apaga el backend por inactividad. El workflow [`keep-alive.yml`](.github/workflows/keep-alive.yml) le pega a `/health` para mantenerlo despierto.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2, Alembic, Pydantic 2, PostgreSQL |
| Frontend web | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, Recharts |
| Mobile | Expo SDK 57, React Native, expo-router, NativeWind 4 |
| Auth | JWT (access en el body, refresh en cookie httpOnly), CSRF double-submit, rate limiting propio y blacklist de tokens |
| Integraciones | Stripe Checkout, guarani.app (facturación electrónica), Cloudflare R2, Gemini (import de calendario), Web Push (VAPID), email con Resend, SendGrid o SMTP |
| PDF y QR | WeasyPrint (boleta), ReportLab, qrcode, jsQR |

## Puesta en marcha

### Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requeriments.txt
copy .env.example .env          # completar DATABASE_URL, JWT_SECRET, etc.
docker compose up -d            # opcional: Postgres local (sa_user / sa_pass)
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

- Variables de entorno: [`docs/web-system/VARIABLES_ENTORNO.md`](docs/web-system/VARIABLES_ENTORNO.md).
- WeasyPrint necesita GTK en Windows (MSYS2 + pango). El paso a paso está en [`docs/web-system/INSTALACION.md`](docs/web-system/INSTALACION.md). Sin GTK, el PDF de la boleta y sus 4 tests fallan con `OSError`.
- `RATE_LIMIT_ENABLED=false` y `CSRF_ENABLED=false` sirven para tests y desarrollo. En producción no se tocan.

### Demo local con SQLite y datos ficticios

Sirve para levantar algo navegable sin Postgres ni secretos. `DATABASE_URL` definida en la terminal tiene prioridad sobre el `.env`.

```powershell
cd backend
$env:DATABASE_URL = "sqlite:///./demo.db"
$env:TEST_DATABASE_URL = $env:DATABASE_URL
$env:PYTHONPATH = "."
python -c "import app.main; from app.database import Base, engine; Base.metadata.create_all(bind=engine)"
python scripts/seed_pensum_piloto.py
python scripts/seed_masivo.py
python scripts/seed_restante.py
uvicorn app.main:app --port 8000
```

| Rol | Usuario | Contraseña |
|---|---|---|
| Admin | `director@uca.edu.py` (en `/admin`) | `Director1234!` |
| Profesor | `prof01@uca.edu.py` … `prof20@uca.edu.py` | `Profesor1234!` |
| Alumno | cédula del seed, por ejemplo `03000000` | `Alumno1234!` |

> `seed_completo.py` quedó desactualizado respecto del modelo `Materia` (usa `profesor_id`) y falla. Usar los tres scripts de arriba.

### Frontend

```powershell
cd frontend
npm install
npm run dev                     # http://localhost:5173
# backend en otro puerto: $env:API_PROXY_TARGET = "http://127.0.0.1:8010"
```

### Mobile

```powershell
cd mobile
npm install
npx expo start                  # Expo Go (SDK 57) o dev client
```

- URL del backend: `EXPO_PUBLIC_API_BASE`, si no `extra.apiBase` de `app.json`, y si no `http://localhost:8000` (`services/api.ts`).
- **Ojo con los builds locales:** `expo` carga `mobile/.env` al compilar. Si ese archivo tiene una IP de LAN, el APK queda apuntando a esa IP. Para un build contra producción hay que exportar `EXPO_PUBLIC_API_BASE=https://uca-v2-backend.onrender.com` antes de `gradlew assembleRelease`, o usar los perfiles `preview`/`production` de [`eas.json`](mobile/eas.json).
- Expo Go solo abre proyectos de su mismo SDK. Si el Expo Go del celular es de otro SDK, hay que usar un dev client (`eas build --profile development`).

## Comandos frecuentes

| Tarea | Comando |
|---|---|
| Tests backend | `cd backend; python -m pytest -q` |
| Tests frontend | `cd frontend; npm run test:run` |
| Lint y tipos frontend | `cd frontend; npm run lint; npx tsc -p tsconfig.app.json --noEmit` |
| Build frontend | `cd frontend; npm run build` |
| Tests y tipos mobile | `cd mobile; npm test; npm run typecheck` |
| Lint y tipos backend | `npm run check:backend` (ruff + mypy, desde la raíz) |
| Nueva migración | `cd backend; alembic revision --autogenerate -m "descripcion"` |
| Aplicar migraciones | `cd backend; alembic upgrade head` |

Estado al 2026-11-18: el backend pasa 399 tests (4 de PDF requieren GTK), el frontend 20 de 20 con el build OK y mobile 10 de 10 con `tsc` limpio.

## Estructura

```text
backend/
  app/
    main.py              # app FastAPI, CORS, middlewares, routers
    routers/             # 29 routers por dominio (auth, alumno, profesor, admin, finanzas, boleta…)
    services/            # lógica de negocio (puntajes_utils, expediente, pagos_online, boleta_pdf…)
    models/  schemas/    # SQLAlchemy y Pydantic
    middleware/          # CSRF
    rate_limiting.py  security.py  audit.py
  alembic/versions/      # 42 migraciones
  scripts/               # seeds de datos ficticios
  tests/                 # pytest (SQLite en memoria, ver conftest.py)
frontend/src/
  pages/                 # una vista por ruta; la mayoría separa la vista por rol
  components/            # Layout (sidebar por rol), paneles compartidos, common/
  services/              # clientes de la API por módulo
  lib/api.ts             # fetch con JWT, refresh single-flight y header CSRF
  styles/design-tokens.css
mobile/
  app/                   # expo-router: (auth), (tabs), cursos/[id], scanner, examenes, cuenta
  services/  hooks/  components/
docs/                    # ver tabla de abajo
```

## Convenciones

**Backend**
- La regla de rol va en cada endpoint (dependencias de `app/dependencias.py`) y además se valida la pertenencia del recurso para evitar IDOR. Los cambios de agosto de 2026 cerraron 11 casos (ver el historial de git).
- La nota final se calcula **solo** con `calcular_promedio_final()` en `services/puntajes_utils.py`: puntos sobre pesos configurables (`pesos_evaluacion`, 20/20/10/50 por defecto), mapeados a la escala entera 1–5. No reimplementar promedios en los routers.
- Todo cambio de modelo va con su migración de Alembic. En los tests se usa `create_all` sobre SQLite.

**Frontend**
- Los colores salen de `design-tokens.css`. `--accent` cambia por rol con `[data-role]`: alumno celeste, profesor naranja, admin verde.
- **Rediseño "jerarquía por foco" (Fase 20, en curso):** cada vista usa `PageHead` (eyebrow + título + acciones con `RefreshButton`) y `KpiRow` (un KPI dominante + secundarios), de `components/common/PageKpi.tsx`. Las vistas nuevas o migradas deben usar esas piezas en lugar de armar headers a mano. Falta migrar Expediente, Equivalencias, Becas, Pasantías, Trámites (alumno), Asistencia en vivo, Mis Materias y Gestión de Calificaciones (profesor). El diseño de referencia y el estado están en [`ESTADO_FASES.md`](docs/web-system/ESTADO_FASES.md).
- La barra lateral arranca con los grupos Recursos y Trámites colapsados. Los tests de `Layout` cuentan solo los ítems visibles.
- Las vistas con datos en vivo hacen polling cada 30 s y tienen un botón de refresh manual.

**Documentación**
- Al cerrar o modificar una fase, actualizar `docs/web-system/ESTADO_FASES.md` y la referencia correspondiente (`API_REFERENCE.md`, `MODELO_DATOS.md`, `FRONTEND_REFERENCE.md`).

## CI y deploy

- [`ci.yml`](.github/workflows/ci.yml): en push a `main`, `develop` y `push-final`, corre en el backend `alembic upgrade head` + pytest sobre Postgres, y en el frontend `npm ci`, lint, tests y build.
- Backend en Render: `pip install` + `alembic upgrade head` en el build y `uvicorn` en el start. Frontend en Vercel. Paso a paso en [`GUIA_DEPLOY_PRODUCCION.md`](docs/web-system/GUIA_DEPLOY_PRODUCCION.md).
- Los secretos (Stripe, VAPID, guarani.app, R2, SMTP, `JWT_SECRET`) viven solo en el panel de cada servicio. `backend/.env` está en `.gitignore`.

## Documentación

| Carpeta | Contenido |
|---|---|
| `docs/web-system/` | `CLAUDE.md` (reglas del proyecto), `COMANDOS.md`, `ESTADO_FASES.md`, `ARQUITECTURA.md`, `API_REFERENCE.md`, `MODELO_DATOS.md`, `FRONTEND_REFERENCE.md`, `SERVICIOS.md`, `VARIABLES_ENTORNO.md`, `INSTALACION.md`, `GUIA_DEPLOY_PRODUCCION.md`, `ESTADO_PRODUCCION.md` |
| `docs/app-mobile-system/` | `CHANGELOG_MOBILE.md`, `PLAN_DESARROLLO_MOBILE.md`, `EXPO_GO_TESTING.md`, `CLAUDE.md`, `AGENTS.md`, `analisis_app_mobile.md` |
| `docs/auditorias/` | `AUDITORIA_2026-07-24.md`, `PLAN_FIXES_AUDITORIA.md`, `CHANGELOG_FIXES.md` (fuente de verdad de los fixes de seguridad) |
| `docs/documentacion-tecnica/` | `DOCUMENTACION_TECNICA_TOTAL.md`, `RESUMEN_TECNICO_COMPLETO.md`, `CHANGELOG_TECNICO.md` |
| `docs/negocio/` | `PLAN_DESARROLLO_UNIVERSIDAD.md`, `PLAN_VENTAS_UNIVERSIDADES.md` |

## Autoría

WebPy Studio.
