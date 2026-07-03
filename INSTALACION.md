# Instalación y Ejecución — Sistema Académico UCA V2

Guía para clonar y correr el proyecto local sin errores. Backend (FastAPI) +
Frontend (React/Vite). Windows/Linux/Mac, comandos equivalentes indicados.

## 1. Requisitos previos

- **Python 3.11 o superior** (probado con 3.14).
- **Node.js 20 o superior** + npm.
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

La base de datos SQLite (`backend/sistema_academico.db`) ya viene versionada con
datos de demo (usuarios, materias, carreras, notas, asistencias). **No hace falta
seedear nada** para arrancar y probar.

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

Editar `backend/.env` y completar:
- `JWT_SECRET`: cualquier string largo random (no dejar el valor de ejemplo).
- `MAIL_PASSWORD`: opcional. Sin configurar, los emails (nueva nota, reset de
  contraseña) se imprimen en consola en vez de enviarse — no rompe nada.
- `GEMINI_API_KEY`: opcional, agregar esta línea manualmente si querés probar la
  carga de calendario por PDF (Calendario → "Subir PDF del semestre"). Sacala gratis
  en https://aistudio.google.com/apikey. Sin ella, esa función tira error controlado
  y el resto del sistema sigue funcionando normal.

Levantar el servidor (desde `backend/`, con el venv activado):
```bash
uvicorn app.main:app --reload --port 8000
```

Al arrancar corre automáticamente una migración liviana (`ALTER TABLE` si faltan
columnas nuevas) — es segura de ejecutar más de una vez, no borra datos.

Verificar: abrir http://127.0.0.1:8000/docs — debe mostrar la documentación Swagger.

## 4. Frontend (React + Vite)

En otra terminal:
```bash
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173. El proxy de Vite (`vite.config.ts`) ya está configurado
para mandar `/api/*` y `/static/*` a `http://127.0.0.1:8000` — el backend **tiene que
estar corriendo en el puerto 8000** para que el login y todas las páginas funcionen.

## 5. Usuarios de prueba

| Rol | Usuario | Contraseña | Login |
|---|---|---|---|
| Alumno | `12345678` | `Alumno1234!` | `/login` |
| Profesor | `prof@uca.edu.py` | `Profesor1234!` | `/login` |
| Admin | `admin@uca.edu.py` | `Admin1234!` | `/admin` |

## 6. Problemas comunes

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
- **Base de datos "corrupta" o querés arrancar de cero**: borrar
  `backend/sistema_academico.db` y reiniciar el backend — se recrean las tablas
  vacías (`Base.metadata.create_all`), pero perdés los datos de demo. Para
  restaurarlos, hacer `git checkout backend/sistema_academico.db`.

## 7. Estructura rápida

```
backend/    FastAPI + SQLAlchemy + SQLite (app/routers, app/models, app/schemas)
frontend/   React 19 + TypeScript + Vite (src/pages, src/components)
```

Ver [FUNCIONES_POR_ROL.md](FUNCIONES_POR_ROL.md) para qué hace cada pantalla y
[DOCUMENTACION_REDISENO.md](DOCUMENTACION_REDISENO.md) para arquitectura técnica y
estado del proyecto.
