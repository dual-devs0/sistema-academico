# Sistema Académico — Universidad Católica de Caacupé

Sistema web para gestión académica: autenticación por roles, asistencias con QR, puntajes con notificaciones, boleta PDF, estadísticas, calendario de eventos, biblioteca de apuntes, foro por materia y más.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript + Vite 8 + Tailwind v4 + Recharts |
| Backend | Python 3.11+ · FastAPI + Uvicorn |
| ORM / Migraciones | SQLAlchemy + Alembic |
| Base de datos | SQLite (desarrollo) · PostgreSQL (producción) |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| PDF server-side | ReportLab |
| Email | fastapi-mail (SMTP) |
| IA | Gemini API (parsing PDF calendario) |

---

## Requisitos previos

- [Python 3.11+](https://www.python.org/)
- [Node.js 20+](https://nodejs.org/)
- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/) (solo para PostgreSQL en producción)

---

## Paso a paso para correr el proyecto

### 1. Clonar

```bash
git clone https://github.com/TU_USUARIO/sistema-academico.git
cd sistema-academico
```

### 2. Backend — entorno virtual y dependencias

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar
# Windows:
venv\Scripts\activate
# Linux / macOS:
# source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

### 3. Backend — variables de entorno

```bash
# Copiar el template .env.example a .env
copy .env.example .env
# En Linux/macOS: cp .env.example .env
```

Editar `backend/.env` con tus valores. Mínimo requerido:

```env
JWT_SECRET=cambia_esto_por_una_clave_aleatoria_de_32_caracteres
DATABASE_URL=sqlite:///./sistema_academico.db
CORS_ORIGINS=http://localhost:5173
```

Opcional (para emails y carga PDF con Gemini):

```env
MAIL_USERNAME=tu@email.com
MAIL_PASSWORD=tu_password
MAIL_FROM=sistema@uca.edu.py
GEMINI_API_KEY=tu_api_key_de_google
```

### 4. Backend — base de datos

```bash
# Crear las tablas (migraciones)
alembic upgrade head

# Cargar datos iniciales (usuarios, materias, etc.)
python seed.py
```

### 5. Frontend — dependencias

```bash
cd frontend
npm install
cd ..
```

### 6. Levantar el proyecto

```bash
# Terminal 1 — Backend (http://localhost:8000)
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend
npm run dev
```

### 7. Acceder

| URL | Qué es |
|-----|--------|
| http://localhost:5173 | Frontend |
| http://localhost:8000/docs | Swagger UI (documentación interactiva de la API) |
| http://localhost:8000/openapi.json | Esquema OpenAPI |

---

## Credenciales por defecto (seed.py)

| Rol | Usuario | Contraseña |
|-----|---------|-----------|
| Admin | `admin@uca.edu.py` | `Admin1234!` |
| Alumno | `12345678` | `Alumno1234!` |
| Profesor | `prof@uca.edu.py` | `Profesor1234!` |

---

## Ejecutar tests

```bash
cd backend
python -m pytest tests/ -v
```

Los tests usan SQLite en memoria. No afectan la base de datos de desarrollo.

---

## Variables de entorno (`backend/.env`)

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./sistema_academico.db` | Conexión a base de datos |
| `JWT_SECRET` | `clave_aleatoria_32+_chars` | Firma de tokens JWT |
| `JWT_EXPIRES_MINUTES` | `480` | Duración del token (8 horas) |
| `CORS_ORIGINS` | `http://localhost:5173` | Orígenes CORS permitidos |
| `GEMINI_API_KEY` | `AIza...` | API key de Google Gemini (para carga PDF de calendario) |
| `MAIL_USERNAME` | `tu@email.com` | SMTP username (notificaciones) |
| `MAIL_PASSWORD` | `****` | SMTP password |
| `MAIL_FROM` | `sistema@uca.edu.py` | Remitente de emails |
| `MAIL_SERVER` | `smtp.gmail.com` | Servidor SMTP |
| `MAIL_PORT` | `587` | Puerto SMTP |
| `QR_SECRET` | `clave_para_qr` | Firma de tokens QR (asistencia) |

> `.env` está en `.gitignore` y **nunca** debe subirse al repositorio.

---

## Base de datos PostgreSQL (producción)

```bash
cd backend
docker compose up -d
```

Luego actualizar `DATABASE_URL` en `.env`:

```env
DATABASE_URL=postgresql://sa_user:sa_pass@localhost:5432/sistema_academico
```

---

## Migraciones (Alembic)

```bash
cd backend
alembic upgrade head          # Aplicar pendientes
alembic revision --autogenerate -m "descripcion"  # Crear nueva
```

---

## Funcionalidades incluidas

| Módulo | Endpoints principales |
|--------|----------------------|
| **Auth** | login, recuperar contraseña |
| **Usuarios** | CRUD, perfil |
| **Materias** | CRUD, asignación profesor |
| **Inscripciones** | inscribir alumno, listar por materia |
| **Carreras** | CRUD |
| **Asistencia** | carga individual/lote, QR (generar + scan), porcentajes por alumno/materia, filtro por becados |
| **Puntajes** | CRUD, promedios (simple + ponderado), estadísticas de materia, exportar, notificaciones email |
| **Apuntes** | CRUD, aprobar, like, descargas, búsqueda, filtros |
| **Eventos** | CRUD, carga manual, carga por PDF (Gemini), vista mensual/día por alumno |
| **Programas/Temarios** | CRUD, bibliografía |
| **Foro** | hilos + mensajes por materia, fijar/cerrar, permisos |
| **Reportes** | resumen general, por carrera, becados |
| **Boleta** | PDF de calificaciones |
| **Alumno** | perfil, materias, notas, asistencia, resumen |

---

## Flujo de trabajo Git

```bash
# Sincronizar develop
git checkout develop
git pull origin develop

# Rama para tu tarea
git checkout -b feature/nombre

# Commits
git add .
git commit -m "feat: descripción"
git push origin feature/nombre

# PR en GitHub → base: develop
```

---

## Estructura del proyecto

```
sistema-academico/
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── lib/api.ts
│       └── App.tsx
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── auth.py
│   │   ├── email_utils.py
│   │   ├── dependencias.py
│   │   ├── models/       # 10 modelos SQLAlchemy
│   │   ├── schemas/      # Schemas Pydantic v2
│   │   ├── routers/      # 15 routers
│   │   └── middleware/
│   ├── alembic/          # Migraciones
│   ├── tests/            # 17 tests pytest
│   ├── seed.py
│   ├── .env
│   └── requirements.txt
├── docker-compose.yml
└── README.md
```
