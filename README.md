# Sistema Académico UCA V2

Plataforma de gestión académica para la **Universidad Católica "Nuestra Señora de la Asunción" — Unidad Pedagógica Caacupé**.

Tres roles con accesos distintos: **Alumno**, **Profesor**, **Administrador**.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind v4 |
| Backend | FastAPI + SQLAlchemy + SQLite (compatible PostgreSQL) |
| Auth | JWT + refresh tokens (cookie httpOnly) |
| Estilos | Design tokens CSS con accent dinámico por rol |

---

## Roles y accesos

| Rol | Login | Funcionalidades principales |
|-----|-------|---------------------------|
| Alumno | `/login` | Dashboard, expediente, inscripción, asistencia (QR), boleta PDF, calendario, biblioteca, foro, perfil |
| Profesor | `/login` | Dashboard, Mis Materias, calificaciones, asistencia (genera QR), estadísticas, calendario, biblioteca, foro, perfil |
| Admin | `/admin` | Dashboard global, usuarios CRUD, asignaciones, inscripciones, reportes, estadísticas institucionales, calendario, foro, perfil |

---

## Inicio rápido

### Requisitos

- Python 3.11+
- Node.js 20+ + npm

### Backend

```bash
cd backend
python -m venv venv

# Windows (PowerShell)
.\venv\Scripts\Activate.ps1
# Linux/Mac
source venv/bin/activate

pip install -r requeriments.txt
copy .env.example .env   # Windows
cp .env.example .env     # Linux/Mac
```

Editar `backend/.env` y configurar `JWT_SECRET` con un valor seguro.

```bash
uvicorn app.main:app --reload --port 8000
```

Swagger docs: http://127.0.0.1:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173

---

## Usuarios de prueba

| Rol | Usuario | Contraseña |
|-----|---------|-----------|
| Alumno | `12345678` | `Alumno1234!` |
| Profesor | `prof@uca.edu.py` | `Profesor1234!` |
| Admin | `admin@uca.edu.py` | `Admin1234!` |

---

## Estructura del proyecto

```
sistema-academico/
├── backend/
│   ├── app/
│   │   ├── routers/        # 18 routers (auth, users, materias, inscripciones, etc.)
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Storage service (R2/S3)
│   │   ├── middleware/     # Security headers
│   │   ├── main.py         # FastAPI app
│   │   ├── auth.py         # JWT creation
│   │   ├── database.py     # DB engine & session
│   │   ├── dependencias.py # Auth dependencies
│   │   ├── email_utils.py  # Email sending
│   │   └── security.py     # Password hashing
│   ├── alembic/            # Migrations
│   ├── tests/              # Backend tests
│   ├── static/             # Static files
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/          # 21 páginas (Dashboard, Puntajes, Asistencia, etc.)
│   │   ├── components/     # Layout, QRModal, GlobalToast, etc.
│   │   ├── lib/            # API client, helpers
│   │   ├── styles/         # Design tokens CSS
│   │   └── assets/         # Logo, imágenes
│   └── vite.config.ts
└── README.md
```

---

## Features destacadas

- **Dashboard por rol**: KPIs, materias en curso, eventos del día, alertas de riesgo
- **Inscripción online**: cupos reales, verificación de solapamiento de horarios
- **Asistencia con QR**: generación por materia con countdown, escaneo desde app
- **Boleta de calificaciones**: PDF descargable con promedio ponderado
- **Calendario académico**: eventos globales/por materia, carga automática vía PDF + Gemini API
- **Biblioteca**: apuntes con likes, descargas y búsqueda
- **Foro**: hilos y mensajes por materia
- **Notificaciones**: próximos eventos en tiempo real
- **Refresh tokens**: sesión segura con cookie httpOnly + refresh silencioso
- **Accent visual por rol**: cyan (alumno), violeta (profesor), azul (admin)
