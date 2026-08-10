# Instalación y Ejecución — Sistema Académico UCA V2

Guía para clonar y correr el proyecto local. Backend (FastAPI + PostgreSQL) +
Frontend (React/Vite). Windows/Linux/Mac, comandos equivalentes indicados.

> Migrado desde `INSTALACION.md` (raíz) durante consolidación de docs. Sección de
> base de datos corregida: el archivo original describía SQLite pre-Fase 0 —
> el stack actual (`CLAUDE.md`) requiere PostgreSQL.

## 1. Requisitos previos

- **Python 3.11 o superior** (probado con 3.14).
- **Node.js 20 o superior** + npm.
- **PostgreSQL** — vía [Supabase](https://supabase.com) (usado en este proyecto, pooler de conexión) o una instancia local. No hay modo SQLite soportado para desarrollo real: `DATABASE_URL` debe apuntar a Postgres (`backend/app/database.py` solo tiene fallback SQLite para tests, ver `tests/conftest.py`).
- Git.

Verificar:
```bash
python --version   # o python3 --version
node --version
npm --version
```

## 2. Clonar el repositorio

```bash
git clone <url-del-repo>
cd sistema-academico
```

## 3. Backend (FastAPI)

```bash
cd backend
python -m venv venv
```

Activar el entorno virtual:
```bash
# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# Windows (cmd)
.\venv\Scripts\activate.bat

# Linux/Mac
source venv/bin/activate
```

Instalar dependencias:
```bash
pip install -r requeriments.txt
```

> **`weasyprint` (2026-08-03): SÍ se usa** — genera el PDF de la Boleta
> (`GET /boleta/pdf`, ver `API_REFERENCE.md`) vía HTML/CSS con Jinja2
> (`app/services/boleta_pdf.py` + `app/templates/boleta_pdf.html`). Se eligió
> sobre `reportlab` (que sigue en `requeriments.txt` mixto por compatibilidad,
> pero ya no genera el PDF de boleta) porque WeasyPrint soporta paginación real
> vía CSS `@page` (`counter(page)`/`counter(pages)`), que reportlab no da nativo.
>
> **`pip install` no alcanza en Windows** — WeasyPrint necesita las librerías
> nativas GTK3 (Pango, Cairo, GObject) instaladas en el sistema, no vienen en
> el wheel de pip. Sin esto falla al importar con
> `OSError: cannot load library 'libgobject-2.0-0'`. Instalar:
> 1. [MSYS2](https://www.msys2.org/) (instalable también vía `winget install MSYS2.MSYS2`).
> 2. Desde una shell de MSYS2 (`C:\msys64\usr\bin\bash.exe`): `pacman -Sy && pacman -S mingw-w64-x86_64-pango` (trae cairo/gobject/freetype/fontconfig como dependencias).
> 3. Agregar `C:\msys64\mingw64\bin` al `PATH` (variable de usuario alcanza, no hace falta admin).
> 4. Verificar: `python -c "import weasyprint; print(weasyprint.__version__)"` sin traceback.
>
> En Linux (prod) se instala vía apt, no hace falta MSYS2 — ver
> `GUIA_DEPLOY_PRODUCCION.md` (**ojo:** el `render.yaml` actual usa runtime
> nativo de Python, que no soporta `apt-get`; hay un riesgo real de deploy
> documentado ahí, sin resolver todavía).

Copiar el archivo de entorno:
```bash
cp .env.example .env       # Linux/Mac
copy .env.example .env     # Windows
```

> **`.env.example` está desactualizado** — trae `DATABASE_URL=sqlite:///./sistema_academico.db`
> por default y no incluye las variables de storage R2. Editar `backend/.env` manualmente
> con los valores reales de abajo, no confiar en el `.example` tal cual.

Editar `backend/.env` y completar:
- **`DATABASE_URL`**: connection string de Postgres, ej. `postgresql+psycopg2://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require` (formato Supabase pooler). Requerido — sin esto el backend no arranca.
- `JWT_SECRET`: cualquier string largo random (no dejar el valor de ejemplo).
- `R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`: credenciales de Cloudflare R2 (o cualquier S3-compatible) para storage de archivos (fotos de perfil, apuntes de biblioteca). Sin esto, los endpoints de upload fallan.
- `MAIL_PASSWORD`: opcional. Sin configurar, los emails (nueva nota, reset de
  contraseña) se imprimen en consola en vez de enviarse — no rompe nada.
- `GEMINI_API_KEY`: opcional, agregar esta línea manualmente si querés probar la
  carga de calendario por PDF (Calendario → "Subir PDF del semestre"). Sacala gratis
  en https://aistudio.google.com/apikey. Sin ella, esa función tira error controlado
  (`500 GEMINI_API_KEY no configurada`) y el resto del sistema sigue funcionando normal.

Para correr la suite de tests de compatibilidad Postgres (`tests/test_postgres_compat.py`),
crear además `backend/.env.test` con `TEST_DATABASE_URL` apuntando a una branch de Postgres
**distinta** de `DATABASE_URL` (el propio test aborta con `pytest.skip()` si detecta que
apuntan a la misma branch, para evitar perder datos de producción). Sin este archivo, esos
4 tests se saltean automáticamente — el resto de la suite (SQLite in-memory) corre igual.

Levantar el servidor (desde `backend/`, con el venv activado):
```bash
uvicorn app.main:app --reload --port 8000
```

Verificar: abrir http://127.0.0.1:8000/docs — debe mostrar la documentación Swagger.

## 4. Poblar datos de prueba (opcional)

```bash
python seed_completo.py
```

Crea carreras, usuarios (admin/profesor/alumnos), materias, inscripciones,
asistencias y puntajes de ejemplo contra `DATABASE_URL`. Idempotente (no duplica
si ya corriste). Ver credenciales resultantes en la sección 6.

## 5. Frontend (React + Vite)

En otra terminal:
```bash
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173. El proxy de Vite (`vite.config.ts`) ya está configurado
para mandar `/api/*` y `/static/*` a `http://127.0.0.1:8000` — el backend **tiene que
estar corriendo en el puerto 8000** para que el login y todas las páginas funcionen.

## 6. Usuarios de prueba

| Rol | Usuario | Contraseña | Login |
|---|---|---|---|
| Alumno | `12345678` | `Alumno1234!` | `/login` |
| Profesor | `prof@uca.edu.py` | `Profesor1234!` | `/login` |
| Admin | `admin@uca.edu.py` | `Admin1234!` | `/admin` |

## 7. Problemas comunes

- **`RuntimeError: Form data requires "python-multipart"`**: ya está en
  `requeriments.txt`, correr `pip install -r requeriments.txt` de nuevo dentro del venv.
- **Puerto 8000 ocupado**: matar el proceso anterior o correr con `--port 8001` y
  actualizar el `target` en `frontend/vite.config.ts`.
- **CORS error en consola del navegador**: revisar `CORS_ORIGINS` en `backend/.env`,
  tiene que incluir `http://localhost:5173`.
- **La foto de perfil o el logo no cargan**: confirmar que el backend esté corriendo
  (sirve `/static/*`) y que el proxy `/static` esté en `vite.config.ts`.
- **`bcrypt` warnings o error de versión**: el proyecto usa `bcrypt` 4.0.1 por
  compatibilidad con `passlib`; si `pip` instaló una versión más nueva por error,
  correr `pip install "bcrypt==4.0.1"`.
- **`password authentication failed` / `connection refused` contra Supabase**:
  confirmar que se está usando la connection string del **pooler** (puerto 6543,
  `?sslmode=require`), no la conexión directa. Verificar también que el proyecto
  Supabase no esté pausado (el free tier de Supabase pausa proyectos inactivos
  por 7+ días — reactivar desde el dashboard).

## 8. Estructura rápida

```
backend/    FastAPI + SQLAlchemy + PostgreSQL (app/routers, app/models, app/schemas)
frontend/   React 19 + TypeScript + Vite (src/pages, src/components)
```

Ver [ARQUITECTURA.md](ARQUITECTURA.md) para arquitectura técnica y
[API_REFERENCE.md](API_REFERENCE.md) para el detalle de cada endpoint por rol.
