# Sistema Académico UCA V2

Sistema de gestión académica integral con backend en FastAPI y frontend en React.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind v4 |
| Backend | FastAPI + SQLAlchemy + Alembic + PostgreSQL |
| Auth | JWT (access + refresh token httpOnly cookie) |
| Storage | Cloudflare R2 (S3-compatible) |
| Email | SMTP + fastapi-mail |
| PDF | ReportLab / WeasyPrint |
| Tests | pytest + httpx (209 tests) |

## Módulos

- **Autenticación**: JWT + refresh tokens, roles (admin/profesor/alumno)
- **Materias y Ofertas**: CRUD con ofertas por período y profesor
- **Inscripciones**: Validación de correlatividades + bloqueo por mora
- **Puntajes/Calificaciones**: Notas ponderadas con cálculo de promedio
- **Asistencias**: Registro diario por QR
- **Pensum**: Malla curricular, correlatividades, avance del alumno
- **Expediente**: PPA, estados (activo/irregular/de_baja), historial
- **Financiero**: Cuotas, pagos inmutables, exportación Excel, bloqueo por mora
- **Becas**: ITAIPU / institucionales, bypass de mora para beca 100%
- **Facturación Electrónica**: Integración con guarani.app, reintentos automáticos
- **Foro**: Hilos, mensajes paginados, fijar/cerrar, edición con ventana 15 min
- **Trámites**: Solicitudes automáticas y manuales con generación de PDF
- **Pasantías**: Empresas, solicitudes, informes, control de horas
- **Graduación**: Procesos, tesis, verificación de egreso (créditos + PPA + pasantía)
- **Equivalencias**: Solicitudes, resolución por examen o reválida
- **Portal Docente**: Cátedras activas, histórico, agenda, recordatorios
- **Reportes**: Estadísticas exportables

## Inicio rápido

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env  # configurar DB y JWT
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Tests

```bash
cd backend
pytest -v              # 209 tests (SQLite)
```

## Estructura

```
backend/
  app/
    models/       # SQLAlchemy models
    schemas/      # Pydantic schemas
    routers/      # FastAPI endpoints
    services/     # Business logic
    auth.py       # JWT
  alembic/        # Migraciones
  tests/          # pytest suite

frontend/
  src/
    pages/        # Vistas por módulo
    components/   # Componentes compartidos
    services/     # API client
    hooks/        # Custom hooks
    lib/          # Utilidades
```
