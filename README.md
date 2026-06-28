# Sistema Académico — Universidad Católica de Caacupé

Sistema web para gestión académica: autenticación por roles, asistencias, puntajes, boleta PDF, estadísticas, calendario de eventos, biblioteca de apuntes y temario de clases.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript + Vite 8 + Tailwind v4 + Recharts |
| Backend | Python 3.11 + FastAPI + Uvicorn |
| ORM / Migraciones | SQLAlchemy + Alembic |
| Base de datos | SQLite (desarrollo) · PostgreSQL (producción) |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| PDF server-side | ReportLab |

---

## Requisitos previos

- [Python 3.11+](https://www.python.org/)
- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (solo para PostgreSQL en producción)
- [Git](https://git-scm.com/)

---

## Configuración inicial (primera vez)

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/sistema-academico.git
cd sistema-academico
```

### 2. Configurar el backend

```bash
cd backend

# Crear y activar entorno virtual
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux / macOS

# Instalar dependencias
pip install -r requeriments.txt

# Crear archivo .env con las variables de entorno
copy .env.example .env
# Editar .env con tus valores (JWT_SECRET, DATABASE_URL, etc.)

# Aplicar migraciones y cargar datos iniciales
alembic upgrade head
python seed.py

cd ..
```

### 3. Configurar el frontend

```bash
cd frontend
npm install
cd ..
```

### 4. Levantar el proyecto

```bash
# Terminal 1 — backend (puerto 8000)
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload

# Terminal 2 — frontend (puerto 5173)
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Swagger UI (docs interactivos): http://localhost:8000/docs

---

## Variables de entorno (`backend/.env`)

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./sistema_academico.db` | Conexión a la base de datos |
| `JWT_SECRET` | `<cadena aleatoria 32+ chars>` | Clave para firmar tokens JWT |
| `JWT_EXPIRES_MINUTES` | `480` | Duración del token (480 = 8 horas) |
| `CORS_ORIGINS` | `http://localhost:5173` | Orígenes permitidos (separados por coma) |

> El archivo `.env` está en `.gitignore` y **nunca** debe subirse al repositorio.

---

## Base de datos PostgreSQL (producción)

```bash
cd backend
docker compose up -d
```

Levanta PostgreSQL en `localhost:5432` con:
- Usuario: `sa_user`
- Contraseña: `sa_pass`
- Base de datos: `sistema_academico`

Luego actualizar `DATABASE_URL` en `.env`:
```
DATABASE_URL=postgresql://sa_user:sa_pass@localhost:5432/sistema_academico
```

---

## Flujo de trabajo Git

### Ramas principales

| Rama | Propósito |
|------|-----------|
| `main` | Código en producción. Solo se toca con releases. |
| `develop` | Integración del trabajo de ambos. Base para todo. |
| `feature/nombre` | Trabajo diario. Sale de develop, vuelve via PR. |

### Comandos del día a día

```bash
# Antes de arrancar — sincronizar develop
git checkout develop
git pull origin develop

# Crear rama para tu tarea
git checkout -b feature/nombre-modulo

# Commitear
git add .
git commit -m "feat: descripción del cambio"
git push origin feature/nombre-modulo

# Abrir Pull Request en GitHub → base: develop
```

---

## Estructura del proyecto

```
sistema-academico/
├── frontend/
│   └── src/
│       ├── components/     # Layout con sidebar dinámico por rol
│       ├── pages/          # 14 páginas (una por ruta)
│       ├── lib/api.ts      # Cliente HTTP centralizado + decodeToken
│       └── App.tsx         # Rutas protegidas por rol
├── backend/
│   ├── app/
│   │   ├── main.py         # Punto de entrada, 13 routers registrados
│   │   ├── auth.py         # Generación JWT
│   │   ├── dependencias.py # get_current_user, require_role
│   │   ├── models/         # 9 modelos SQLAlchemy
│   │   ├── schemas/        # Schemas Pydantic v2
│   │   ├── routers/        # auth, users, materias, carreras, puntajes,
│   │   │                   # asistencias, inscripciones, apuntes,
│   │   │                   # temarios, eventos, reportes, boleta
│   │   └── middleware/     # SecurityHeadersMiddleware
│   ├── alembic/            # Migraciones de base de datos
│   ├── tests/              # Suite Pytest con fixtures en memoria
│   ├── seed.py             # Datos iniciales
│   ├── .env                # Variables de entorno (no versionar)
│   └── requeriments.txt    # Dependencias Python
├── docker-compose.yml
└── README.md
```

---

## Roles del sistema

| Rol | Acceso |
|-----|--------|
| `admin` | Total: usuarios, materias, reportes, estadísticas, boletas |
| `profesor` | Mis Cursos, materias, puntajes, asistencias, estadísticas |
| `alumno` | Dashboard, puntajes propios, asistencia, boleta, biblioteca |

---

## Pruebas

```bash
cd backend
pytest tests/ -v
```

Las pruebas usan SQLite en memoria y no afectan la base de datos de desarrollo.

---

## Credenciales por defecto (desarrollo)

Generadas por `seed.py`. Cambiar antes de cualquier deploy.

| Rol | Usuario | Contraseña |
|-----|---------|-----------|
| admin | `admin@uca.edu.py` | `Admin1234!` |
| alumno | `12345678` | `Alumno1234!` |
| profesor | `prof@uca.edu.py` | `Profesor1234!` |

---

## Documentación

Ver [`DOCUMENTACION.md`](../DOCUMENTACION.md) para la referencia completa de la API, modelos de datos, arquitectura y guía de seguridad.

---

## Fases del proyecto

- **v0.1 (Beta):** Auth + roles + CRUD usuarios/materias + puntajes + asistencias + boleta PDF + estadísticas + reportes + seguridad (JWT, CORS, headers, RLS)
- **v1.0:** Notificaciones + QR de asistencia + mobile responsive
- **v2.0:** Foro, integración Moodle
