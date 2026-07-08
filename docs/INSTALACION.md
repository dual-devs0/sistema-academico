# Instalación y Ejecución — Sistema Académico UCA V2

Guía para clonar y correr el proyecto local. Backend (FastAPI + PostgreSQL) +
Frontend (React/Vite). Windows/Linux/Mac, comandos equivalentes indicados.

> Migrado desde `INSTALACION.md` (raíz) durante consolidación de docs. Sección de
> base de datos corregida: el archivo original describía SQLite pre-Fase 0 —
> el stack actual (`CLAUDE.md`) requiere PostgreSQL.

## 1. Requisitos previos

- **Python 3.11 o superior** (probado con 3.14).
- **Node.js 20 o superior** + npm.
- **PostgreSQL** — vía [Neon](https://neon.tech) (usado en este proyecto, branches separadas dev/test) o una instancia local. No hay modo SQLite soportado para desarrollo real: `DATABASE_URL` debe apuntar a Postgres (`backend/app/database.py` solo tiene fallback SQLite para tests, ver `tests/conftest.py`).
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

> **Si falla instalar `weasyprint` o `pdfplumber`/`pymupdf`** (piden librerías del
> sistema tipo GTK/Pango en Windows): no se usan en el código actual, podés
> comentarlas en `requeriments.txt` y reinstalar. La generación de boleta PDF usa
> `reportlab`, no `weasyprint`.

Copiar el archivo de entorno:
```bash
cp .env.example .env       # Linux/Mac
copy .env.example .env     # Windows
```

> **`.env.example` está desactualizado** — trae `DATABASE_URL=sqlite:///./sistema_academico.db`
> por default y no incluye las variables de storage R2. Editar `backend/.env` manualmente
> con los valores reales de abajo, no confiar en el `.example` tal cual.

Editar `backend/.env` y completar:
- **`DATABASE_URL`**: connection string de Postgres, ej. `postgresql+psycopg2://user:pass@host/db?sslmode=require` (formato Neon). Requerido — sin esto el backend no arranca.
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
- **`password authentication failed` / `endpoint could not be found` contra Neon**:
  el compute del free tier de Neon se suspende por inactividad. Reactivar desde el
  dashboard de Neon — no es un problema de código ni de configuración local.
  **Solución permanente:** en el dashboard de Neon, editar el compute → **Auto-suspend**
  → seleccionar **Never** para que nunca se suspenda.

## 8. Estructura rápida

```
backend/    FastAPI + SQLAlchemy + PostgreSQL (app/routers, app/models, app/schemas)
frontend/   React 19 + TypeScript + Vite (src/pages, src/components)
```

Ver [ARQUITECTURA.md](ARQUITECTURA.md) para arquitectura técnica y
[API_REFERENCE.md](API_REFERENCE.md) para el detalle de cada endpoint por rol.
