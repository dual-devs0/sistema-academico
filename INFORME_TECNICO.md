# Sistema Académico UCA V2 — Informe Técnico Integral

**Universidad Católica "Nuestra Señora de la Asunción" — Unidad Pedagógica Caacupé**  
**Stack:** React 19 + TypeScript 6 + Vite 8 + Tailwind v4 (frontend) · FastAPI + SQLAlchemy + SQLite (backend)

---

## Índice

1. [Arquitectura General](#1-arquitectura-general)
2. [Frontend](#2-frontend)
3. [Backend](#3-backend)
4. [API REST — Endpoints](#4-api-rest--endpoints)
5. [Base de Datos](#5-base-de-datos)
6. [Seguridad Implementada](#6-seguridad-implementada)
7. [Funcionalidades por Rol](#7-funcionalidades-por-rol)
8. [Módulos Recientes (Fix de Seguridad, Horarios y Tests)](#8-módulos-recientes)
9. [Pruebas](#9-pruebas)
10. [Flujo de Trabajo y Despliegue](#10-flujo-de-trabajo-y-despliegue)
11. [Lo que Falta / Próximos Pasos](#11-lo-que-falta--próximos-pasos)

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────┐
│                  Frontend (React 19)             │
│  Vite 8 · TypeScript 6 · Tailwind v4 · Axios    │
│  Proxy: /api → http://127.0.0.1:8000            │
├─────────────────────────────────────────────────┤
│                  Backend (FastAPI)               │
│  SQLAlchemy ORM · SQLite · JWT · bcrypt         │
│  Python 3.14 · Uvicorn                          │
├─────────────────────────────────────────────────┤
│                  Base de Datos                   │
│  SQLite (dev) · Preparado para PostgreSQL        │
│  13 tablas · Migraciones runtime + Alembic       │
└─────────────────────────────────────────────────┘
```

Comunicación: REST JSON sobre HTTP. Autenticación por JWT Bearer Token.

---

## 2. Frontend

### Stack Tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| React | 19.2.7 | UI components, hooks, estado local |
| TypeScript | ~6.0 | Tipado estático en todo el frontend |
| Vite | 8.1 | Bundler, dev server con proxy |
| Tailwind CSS | 4.3 | Estilos utilitarios, design tokens por rol |
| React Router | 7.18 | Ruteo con protección por rol |
| Axios | 1.18 | HTTP client hacia backend |
| Recharts | 3.9 | Gráficos (distribución de notas, KPIs) |
| html2pdf.js / jsPDF | — | Generación de PDF en cliente |
| Motion | 12.42 | Animaciones |
| Tabler Icons | CDN | Iconografía |

### Estructura de Directorios

```
frontend/src/
├── assets/
├── components/        # Componentes compartidos
│   ├── Layout.tsx     # Sidebar (216px), topbar, bottom-nav, notificaciones, ayuda, apps
│   ├── GlobalToast.tsx
│   ├── QRModal.tsx
│   ├── StatCard.tsx, RoleBadge.tsx, StatusBadge.tsx
│   └── ...
├── hooks/
│   └── useRole.ts     # getRole(), getUserId(), getUsername() desde JWT
├── lib/
│   └── api.ts         # request() genérico + api.{get,post,put,patch,delete}
├── pages/
│   ├── Dashboard.tsx, Asistencia.tsx, AsistenciaScan.tsx
│   ├── Puntajes.tsx, Boleta.tsx, Biblioteca.tsx
│   ├── Calendario.tsx, Foro.tsx, Programa.tsx, MisCursos.tsx
│   ├── Inscripciones.tsx, Perfil.tsx, MisMaterias.tsx
│   ├── GestionAsignaciones.tsx, Usuarios.tsx, Reportes.tsx
│   ├── Estadisticas.tsx
│   ├── AcademicoLogin.tsx, AdminLogin.tsx
│   └── NotFound.tsx
├── styles/
│   └── design-tokens.css  # Variables CSS por rol
├── types/             # Interfaces TypeScript
├── App.tsx            # Router + Rutas Protegidas
├── main.tsx           # Entry point
└── index.css          # Importa design tokens + Tailwind
```

### Sistema de Diseño

- **Tipografía**: Inter (UI) + JetBrains Mono (datos numéricos, badges)
- **Accent dinámico por rol**: `data-role` en `<body>`
  - Alumno → cyan `#00b4d8`
  - Profesor → violeta `#8b5cf6`
  - Admin → azul `#2563eb`
- **Clases utilitarias**: `.card`, `.btn-primary`, `.btn-ghost`, `.badge`, `.input-uca`, `.table-uca`, `.pill-tab`, `.progress-track`, `.kpi-card`, `.avatar-initials`, `.fab`
- **Iconos**: Tabler Icons vía CDN (`<i className="ti ti-*">`)

### Estado Global

No se usa Redux ni Context pesado. El estado se maneja con:
- **JWT** almacenado en `sessionStorage`
- Eventos globales del DOM (`emitToast`, `emitHelp`, `emitAvatarUpdated`)
- Props y estado local en cada página
- Peticiones a backend en cada render (no hay caché pesada)

### Comunicación con Backend

`lib/api.ts`:
- `request<T>(path, options?)` → lee token de sessionStorage, setea header `Authorization: Bearer`, maneja 401 (redirige a login)
- `api.get()`, `.post()`, `.put()`, `.patch()`, `.delete()` → wrappers sobre request

---

## 3. Backend

### Stack Tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| Python | 3.14 | Runtime |
| FastAPI | — | Framework web REST |
| Uvicorn | — | Servidor ASGI |
| SQLAlchemy | — | ORM, declarative models |
| Alembic | — | Migraciones de esquema |
| SQLite | — | BD en desarrollo |
| Psycopg2 | — | Preparado para PostgreSQL |
| python-jose | — | JWT encode/decode |
| passlib[bcrypt] | — | Hashing de contraseñas |
| Pydantic | v2 | Schemas de validación |
| ReportLab | — | Generación de PDF (boleta) |
| qrcode[PIL] | — | Generación de QR (asistencia) |
| google-generativeai | — | Parseo de PDF de calendario |
| fastapi-mail | — | Notificaciones email |
| Pillow | — | Procesamiento de imágenes |
| pytest | — | Tests unitarios |

### Estructura de Directorios

```
backend/
├── app/
│   ├── auth.py                 # JWT config (HS256, 60min exp, iat, jti)
│   ├── database.py             # Engine SQLAlchemy, session, Base
│   ├── dependencias.py         # get_current_user(), require_role()
│   ├── security.py             # hash_password(), verify_password() (bcrypt)
│   ├── email_utils.py          # FastMail, send_password_reset, send_new_grade
│   ├── main.py                 # FastAPI app, routers, CORS, migrations runtime
│   ├── middleware/
│   │   └── security_headers.py # HSTS, CSP, X-Frame-Options, etc.
│   ├── models/
│   │   ├── user.py, materia.py, carrera.py
│   │   ├── inscripcion.py, asistencia.py, puntaje.py
│   │   ├── apunte.py, foro.py, horario.py
│   │   ├── programa.py, temario.py, evento_calendario.py
│   │   └── __init__.py
│   ├── routers/
│   │   ├── auth_router.py, users_router.py
│   │   ├── materia_router.py, carreras_router.py
│   │   ├── inscripciones_router.py, asistencias_router.py
│   │   ├── puntajes_router.py, apuntes_router.py
│   │   ├── eventos_router.py, programas_router.py
│   │   ├── boleta_router.py, foro_router.py
│   │   ├── horarios_router.py, temarios_router.py
│   │   ├── reportes_router.py, alumno_router.py
│   │   └── __init__.py
│   └── schemas/
│       ├── users_schemas.py, materia_shemas.py
│       ├── inscripcion_shemas.py, carrera_schema.py
│       ├── asistencia_schema.py, puntaje_schema.py
│       ├── apunte_schema.py, evento_schema.py
│       ├── programa_schema.py, foro_schema.py
│       ├── horario_schema.py, temario_schema.py
│       └── __init__.py
├── tests/
│   ├── conftest.py             # Fixtures: db, client, seed, tokens
│   ├── test_auth.py, test_basic.py, test_flow.py
│   ├── test_users.py, test_puntajes.py
│   └── test_security.py       # 31 tests de seguridad
├── .env                        # Config: JWT, DB, CORS, Mail
└── requeriments.txt
```

### Dependencias Clave

```python
# Framework principal
fastapi
uvicorn[standard]

# ORM y BD
sqlalchemy
alembic
psycopg2-binary          # PostgreSQL (producción)

# Autenticación
python-jose[cryptography]
passlib[bcrypt]
python-dotenv

# PDFs y utilidades
pymupdf, pdfplumber      # Lectura de PDF
reportlab                # Generación PDF (boleta)
weasyprint               # PDF alternativo
qrcode[pil], Pillow      # QR de asistencia
google-generativeai      # Parseo de calendario PDF

# Email
fastapi-mail
email-validator

# Tests
pytest
httpx
python-multipart
```

---

## 4. API REST — Endpoints

### Autenticación (`/auth`)

| Método | Ruta | Protegido | Descripción |
|---|---|---|---|
| POST | `/auth/login` | No | Login, devuelve JWT |
| POST | `/auth/recuperar-contrasena` | No | Reset password (rate limited: 3/15min) |

### Usuarios (`/users`)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/users/` | admin | Crear usuario |
| GET | `/users/me` | cualquiera | Perfil propio |
| GET | `/users/` | admin | Listar todos |
| GET | `/users/secure` | cualquiera | Echo del token |
| PATCH | `/users/{id}` | admin/owner | Editar (admin: todo; owner: solo nombre/email/password) |
| DELETE | `/users/{id}` | admin | Eliminar con cascade |

### Materias (`/materias`)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/materias/` | admin | Crear materia |
| GET | `/materias/` | cualquiera | Listar (filtro por profesor/carrera) |
| GET | `/materias/{id}` | cualquiera | Detalle con profesor y carrera |

### Inscripciones (`/inscripciones`)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/inscripciones/` | alumno/admin | Inscribir (alumno forzado a sí mismo); verifica solapamiento |
| DELETE | `/inscripciones/{id}` | alumno/owner | Desinscribir |
| GET | `/inscripciones/materia/{id}` | cualquiera | Alumnos por materia |
| GET | `/inscripciones/` | cualquiera | Listar (alumno solo las propias) |

### Asistencias (`/asistencias`)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/asistencias/` | profesor (titular) / admin | Crear (con snapshot es_becado, duplicado → 409) |
| GET | `/asistencias/` | cualquiera | Listar (alumno solo propias) |
| PUT | `/asistencias/{id}` | profesor (titular) / admin | Actualizar |
| DELETE | `/asistencias/{id}` | profesor (titular) / admin | Eliminar |
| POST | `/asistencias/lote` | profesor (titular) / admin | Carga masiva de una clase |
| GET | `/asistencias/materia/{id}/alumnos` | admin/profesor | Alumnos con % de asistencia |
| GET | `/asistencias/alumno/{id}/porcentaje` | cualquiera | % de asistencia (alumno solo propia) |
| GET | `/asistencias/{materia_id}/resumen` | cualquiera | % de asistencia de una materia |

### Puntajes (`/puntajes`)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/puntajes/` | profesor (titular) / admin | Crear nota (verifica titularidad, duplicado → 400) |
| GET | `/puntajes/` | cualquiera | Listar (alumno solo propias) |
| PUT | `/puntajes/{id}` | profesor (titular) / admin | Actualizar |
| DELETE | `/puntajes/{id}` | profesor (titular) / admin | Eliminar |
| GET | `/puntajes/materia/{id}` | admin/profesor (titular) | Notas + promedios ponderados |
| GET | `/puntajes/alumno/{id}/promedio-final` | cualquiera | Promedio ponderado del alumno |
| GET | `/puntajes/materia/{id}/exportar` | admin/profesor (titular) | Datos completos por materia |
| GET | `/puntajes/materia/{id}/estadisticas` | admin/profesor (titular) | Distribución de notas, aprobados/riesgo |
| GET | `/puntajes/{user_id}/promedio` | admin/owner | Promedio simple |

### Apuntes (`/apuntes`)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/apuntes/` | cualquiera | Crear (forzado user_id = current_user) |
| GET | `/apuntes/` | cualquiera | Listar con filtros y búsqueda |
| GET | `/apuntes/{id}` | cualquiera | Detalle |
| PUT | `/apuntes/{id}` | admin/owner | Editar |
| PATCH | `/apuntes/{id}/aprobar` | admin | Aprobar |
| PATCH | `/apuntes/{id}/like` | cualquiera | Like (UPDATE atómico) |
| PATCH | `/apuntes/{id}/descargar` | cualquiera | Descarga (UPDATE atómico) |
| DELETE | `/apuntes/{id}` | admin/owner | Eliminar |

### Eventos (`/eventos`)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/eventos/` | admin/profesor | Crear |
| GET | `/eventos/` | cualquiera | Listar (alumno filtra por sus materias + globales) |
| GET | `/eventos/{id}` | cualquiera | Detalle |
| PUT | `/eventos/{id}` | admin/profesor | Actualizar |
| DELETE | `/eventos/{id}` | admin/profesor | Eliminar |
| POST | `/eventos/cargar-pdf` | admin/profesor | Carga calendario PDF → Gemini → eventos |
| GET | `/eventos/mes/{anio}/{mes}` | cualquiera | Eventos del mes |
| GET | `/eventos/dia/{fecha}` | cualquiera | Eventos del día |

### Programas (`/programas`)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/programas/` | admin/profesor | Crear |
| GET | `/programas/` | cualquiera | Listar |
| GET | `/programas/{materia_id}` | cualquiera | Por materia |
| PUT | `/programas/{id}` | admin/profesor | Actualizar |
| DELETE | `/programas/{id}` | admin/profesor | Eliminar |
| PUT | `/programas/materia/{id}/bulk` | admin/profesor | Reemplazar todos |

### Temarios (`/temarios`)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/temarios/` | admin/profesor | Crear |
| GET | `/temarios/` | cualquiera | Listar |
| GET | `/temarios/{id}` | cualquiera | Detalle |
| PUT | `/temarios/{id}` | admin/profesor | Actualizar |
| DELETE | `/temarios/{id}` | admin/profesor | Eliminar |

### Horarios (`/horarios`)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/horarios/` | admin/profesor (titular) | Crear (con validación de solapamiento) |
| GET | `/horarios/` | cualquiera | Listar (filtro por materia) |
| GET | `/horarios/materia/{id}` | cualquiera | Horarios de una materia |
| DELETE | `/horarios/{id}` | admin/profesor (titular) | Eliminar |
| GET | `/horarios/verificar-solapamiento` | alumno | Verificar conflicto antes de inscribirse |

### Foro (`/foro`)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/foro/hilos` | cualquiera | Crear hilo (verifica inscripción o titularidad) |
| GET | `/foro/hilos` | cualquiera | Listar hilos |
| GET | `/foro/hilos/{id}` | cualquiera | Detalle con mensajes |
| PUT | `/foro/hilos/{id}` | admin/profesor | Actualizar (fijar, cerrar) |
| DELETE | `/foro/hilos/{id}` | admin/profesor | Eliminar (cascade mensajes) |
| POST | `/foro/hilos/{id}/mensajes` | cualquiera | Crear mensaje (verifica acceso) |
| DELETE | `/foro/mensajes/{id}` | admin/autor | Eliminar mensaje |

### Boleta (`/boleta`)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/boleta/{user_id}` | admin/profesor/owner | PDF con promedio ponderado |

### Alumno (`/alumno`)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/alumno/mi-perfil` | alumno | Perfil propio |
| PATCH | `/alumno/mi-perfil` | alumno | Editar solo nombre/email/password |
| GET | `/alumno/mis-materias` | alumno | Materias inscriptas |
| GET | `/alumno/mis-notas` | alumno | Notas con promedio ponderado |
| GET | `/alumno/mi-asistencia` | alumno | Asistencia por materia |
| GET | `/alumno/mi-resumen` | alumno | Dashboard completo (notas + asistencia + perfil) |

### Reportes (`/reportes`)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/reportes/resumen` | admin | Totales (alumnos, becados, materias, profesores) |
| GET | `/reportes/por-carrera` | admin | KPIs por carrera |
| GET | `/reportes/becados` | admin | Lista de becados |

---

## 5. Base de Datos

### Modelo Entidad-Relación

```
┌──────────┐       ┌──────────────┐       ┌───────────┐
│  users   │───────│ inscripciones│───────│ materias  │
│ (roles)  │       │ (alumno_id,  │       │ (profesor)│
└────┬─────┘       │  materia_id) │       └─────┬─────┘
     │             └──────────────┘             │
     │                                          │
     ├──────────────────────────────────────────┤
     │                   │                      │
┌────┴─────┐      ┌─────┴──────┐      ┌────────┴────────┐
│puntajes  │      │ asistencias │      │    horarios     │
│(user_id, │      │ (user_id,   │      │ (materia_id,    │
│ materia, │      │  materia,   │      │  dia, hora)     │
│ tipo)    │      │  fecha)     │      └─────────────────┘
└──────────┘      └─────────────┘
```

### Tablas (13)

| Tabla | Columnas clave | Restricciones |
|---|---|---|
| **users** | id, username, hashed_password, role, nombre, email, carrera_id, es_becado, foto_url, created_at | UNIQUE(username), FK→carreras |
| **carreras** | id, nombre | — |
| **materias** | id, nombre, profesor_id, carrera_id, anio, semestre | FK→users, FK→carreras |
| **inscripciones** | id, alumno_id, materia_id | FK→users, FK→materias, UNIQUE(alumno, materia) |
| **asistencias** | id, user_id, materia_id, fecha, presente, es_becado, motivo | FK→users, FK→materias, **UNIQUE(user_id, materia_id, fecha)** |
| **puntajes** | id, user_id, materia_id, tipo, valor, editado_por, editado_en | FK→users, FK→materias, **UNIQUE(user_id, materia_id, tipo)** |
| **horarios** | id, materia_id, dia_semana(0-6), hora_inicio, hora_fin, aula | FK→materias, **UNIQUE(materia_id, dia_semana, hora_inicio)** |
| **apuntes** | id, user_id, materia_id, titulo, archivo_url, aprobado, likes, descargas, tags, tipo_contenido, visibilidad, descripcion, fecha_subida | FK→users, FK→materias |
| **eventos_calendario** | id, titulo, tipo, fecha, fecha_fin, descripcion, carrera_id, materia_id, anio, semestre, creado_por, archivo_pdf | FK→materias, FK→carreras, FK→users |
| **foro_hilos** | id, materia_id, titulo, descripcion, creado_por, fijado, cerrado, created_at | FK→materias, FK→users |
| **foro_mensajes** | id, hilo_id, user_id, contenido, created_at | FK→foro_hilos, FK→users |
| **programas** | id, materia_id, semana, titulo, descripcion | FK→materias |
| **temarios** | id, materia_id, unidades (JSON), bibliografia (JSON) | FK→materias |

---

## 6. Seguridad Implementada

### 6.1 Autenticación y Tokens

- **JWT HS256** con:
  - `exp` (expiración): 60 minutos por defecto
  - `iat` (emitido en): timestamp de creación
  - `jti` (ID único): `secrets.token_hex(16)` para evitar replay
- **Secret Key**: Si no está en `JWT_SECRET` del entorno, genera una temporal con `secrets.token_hex(32)` (avisa con warning)

### 6.2 Protección de Endpoints

- Todos los endpoints protegidos con `Depends(get_current_user)` que extrae y valida el JWT
- Middleware `require_role(roles)` para restringir por rol
- Middleware `SecurityHeadersMiddleware` que agrega:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Content-Security-Policy` restrictiva
  - `Referrer-Policy`, `Permissions-Policy`

### 6.3 Control de Acceso por Recurso

| Vulnerabilidad Prevista | Solución |
|---|---|
| Alumno cambia su rol a admin | PATCH `/users/{id}` restrige `role`, `carrera_id`, `es_becado` a no-admin |
| Alumno inscribe a otro alumno | POST `/inscripciones/` fuerza `alumno_id = current_user` si es alumno |
| Alumno crea apunte como otro usuario | POST `/apuntes/` fuerza `user_id = current_user` |
| Profesor modifica notas de materia ajena | POST/PUT/DELETE `/puntajes/` verifica que sea profesor titular |
| Profesor ve notas de materia ajena | GET `/puntajes/materia/{id}` verifica titularidad |
| Profesor exporta/estadísticas de materia ajena | GET `/puntajes/materia/{id}/exportar` y `/estadisticas` verifican titularidad |
| Duplicado de nota para mismo alumno/materia/tipo | `UniqueConstraint(user_id, materia_id, tipo)` + verificación previa |
| Duplicado de asistencia mismo alumno/materia/fecha | `UniqueConstraint(user_id, materia_id, fecha)` + verificación 409 |
| Alumno crea hilo en materia no inscripta | POST `/foro/hilos` verifica inscripción o titularidad |
| Alumno mensajea en materia no inscripta | POST `/foro/hilos/{id}/mensajes` verifica inscripción |
| Solapamiento de horarios al inscribirse | POST `/inscripciones/` verifica conflicto con materias ya cursadas |
| Rate limiting en password reset | POST `/auth/recuperar-contrasena` limita a 3 intentos cada 15 minutos |
| Eliminación de usuario sin limpieza de datos | DELETE `/users/{id}` hace cascade manual de registros relacionados |
| Lectura de datos de otros alumnos | GET `/alumno/*` filtra por `current_user["user_id"]` |
| Fuga de contraseña en consola | Eliminado `print(password)` en auth_router |
| Valor de nota fuera de rango | Schema `Field(ge=0, le=10)` en Pydantic → 422 automático |

### 6.4 Validación de Schemas Pydantic

- `users_schemas.py`: `username` con `min_length=3, max_length=50`; `password` con `min_length=6, max_length=100`
- `puntaje_schema.py`: `valor` con `Field(ge=0, le=10)`
- `horario_schema.py`: `dia_semana` con `Field(ge=0, le=6)`

### 6.5 CORS

Configurado desde `CORS_ORIGINS` del entorno (default: `http://localhost:5173`). Middleware permite métodos y headers estándar.

---

## 7. Funcionalidades por Rol

### Alumno

| Funcionalidad | Cómo se implementa |
|---|---|
| Dashboard resumen | `/alumno/mi-resumen` → promedio general, materias, asistencia |
| Ver notas | `/alumno/mis-notas` → puntajes con promedio ponderado por materia |
| Asistencia propia | `/alumno/mi-asistencia` → % por materia, total de clases |
| Escanear QR | Frontend: `BarcodeDetector` API → POST `/asistencias/scan` |
| Inscribirse a materias | POST `/inscripciones/` forzado a sí mismo, verifica solapamiento y cupos |
| Biblioteca | CRUD `/apuntes/` con likes, descargas, búsqueda |
| Calendario | GET `/eventos/` filtrado por materias inscriptas + globales |
| Foro | Crear hilos/mensajes solo en materias donde está inscripto |
| Boleta PDF | GET `/boleta/{id}` → PDF con promedio ponderado |
| Perfil | GET/PATCH `/users/me` y `/alumno/mi-perfil` |
| Programa/Temario | GET `/programas/`, `/temarios/` |

### Profesor

| Funcionalidad | Cómo se implementa |
|---|---|
| Dashboard | Datos de sus materias, próximas clases |
| Mis Materias | GET `/materias/?profesor_id=X` agrupadas por carrera |
| Cargar notas | POST/PUT `/puntajes/` verifica que sea titular de la materia |
| Asistencia QR | GET `/asistencias/qr/{materia_id}` genera QR con JWT propio, countdown 15min |
| Carga masiva asistencia | POST `/asistencias/lote` con verificación de titularidad |
| Estadísticas de materia | GET `/puntajes/materia/{id}/estadisticas` (distribución, aprobados/riesgo) |
| Exportar materia | GET `/puntajes/materia/{id}/exportar` (notas + asistencia) |
| Calendario PDF | POST `/eventos/cargar-pdf` con Gemini |
| Foro | Crear hilos/mensajes en materias que dicta |
| Programa/Temario | CRUD `/programas/` y `/temarios/` |

### Administrador

| Funcionalidad | Cómo se implementa |
|---|---|
| Dashboard global | KPIs, usuarios activos, logs |
| CRUD Usuarios | POST/GET/PATCH/DELETE `/users/` (solo admin) |
| Gestión de Asignaciones | PATCH `/materias/{id}` reasignar profesor; GET `/materias/` con stats |
| Reportes | GET `/reportes/resumen`, `/por-carrera`, `/becados` |
| Estadísticas institucionales | GET `/puntajes/materia/{id}/estadisticas` (cross-materia) |
| Inscripciones de terceros | POST `/inscripciones/` para cualquier alumno (sin forzar current_user) |
| Calendario global | CRUD eventos sin restricción de materia |
| Moderación de foro | Acceso a todos los hilos/mensajes |
| Boleta de cualquier alumno | GET `/boleta/{user_id}` |

---

## 8. Módulos Recientes

### 8.1 Fix de Seguridad (CRÍTICO)

Implementado para cerrar las siguientes brechas:

1. **Escalación de privilegios** (`users_router.py`):
   - Alumnos no pueden cambiar `role`, `carrera_id`, `es_becado` mediante PATCH
   - DELETE de usuarios ahora limpia registros relacionados (asistencias, puntajes, inscripciones, foro, apuntes)

2. **Inscripción forzada** (`inscripciones_router.py`):
   - Alumno solo puede inscribirse a sí mismo (se ignora `alumno_id` enviado y se usa `current_user`)
   - Validación de existencia de materia antes de inscribir

3. **Creación de apuntes** (`apuntes_router.py`):
   - Force `user_id = current_user["user_id"]` en POST
   - Likes y descargas ahora usan UPDATE atómico en la BD

4. **Propiedad de notas** (`puntajes_router.py`):
   - Profesor debe ser titular de la materia para crear/editar/eliminar notas
   - También verificado para ver notas, exportar y estadísticas
   - Verificación de tipo de nota duplicado antes de crear

5. **Validación de rango** (`puntaje_schema.py`):
   - `Field(ge=0, le=10)` en valor de nota → rechazo 422 automático

6. **Duplicados** (`asistencia.py`, `puntaje.py`):
   - `UniqueConstraint` en ambos modelos + verificación pre-insert (409 en asistencias, 400 en puntajes)

7. **Autenticación en GET** (múltiples routers):
   - GET de materias, apuntes, programas, temarios, eventos/{id} ahora requieren auth

8. **Foro** (`foro_router.py`):
   - Verificación de inscripción del alumno o titularidad del profesor al crear hilos/mensajes

9. **Eventos** (`eventos_router.py`):
   - Filtro corregido para alumnos: usa OR en lugar de AND

10. **Rate limiting** (`auth_router.py`):
    - POST `/auth/recuperar-contrasena`: máximo 3 intentos cada 15 minutos
    - Eliminada fuga de contraseña nueva en consola

11. **Boleta** (`boleta_router.py`):
    - Promedio corregido a cálculo ponderado: 25% parcial1, 25% parcial2, 20% práctico, 30% final

12. **Headers de seguridad** (`security_headers.py`):
    - Agregado `Strict-Transport-Security`
    - CSP extendido con CDNs (jsdelivr, fastapi.tiangolo.com)

### 8.2 Módulo Horarios (Anti-solapamiento)

Nuevo modelo y funcionalidad completa:

- `models/horario.py`: `Horario` con `materia_id`, `dia_semana` (0-6), `hora_inicio`, `hora_fin`, `aula` + `UniqueConstraint(materia_id, dia_semana, hora_inicio)`
- `schemas/horario_schema.py`: Validación `Field(ge=0, le=6)` para día
- `horarios_router.py`: CRUD completo con verificación de solapamiento
- Integración con inscripciones: al inscribirse, se verifica que el horario de la nueva materia no se solape con materias ya cursadas
- Endpoint público `GET /horarios/verificar-solapamiento` para que el alumno verifique antes de inscribirse

### 8.3 Tests Integrales (49 tests)

| Archivo | Tests | Cubre |
|---|---|---|
| `test_security.py` | 31 | Escalación de privilegios, inscripción forzada, creación de apuntes, eliminación de usuarios, propiedad de notas, validación de rango, duplicados, autenticación en endpoints, foro con verificación, filtro de eventos, CRUD horarios, detección de solapamiento, rate limit, boleta ponderada |
| `test_auth.py` | 3 | Login exitoso, wrong password, unknown user |
| `test_users.py` | 7 | Listar sin token, alumno 403, admin list, get_me, create user admin/alumno |
| `test_flow.py` | 3 | Root, user flow, alumno flow |
| `test_basic.py` | 1 | Root endpoint |
| `test_puntajes.py` | 3 | Alumno ve solo sus notas, admin ve todas, crear puntaje |

**Configuración de tests** (`conftest.py`):
- Base de datos en memoria SQLite
- Seed con 4 usuarios (admin, profesor, alumno, alumno2), carrera, materia
- Fixtures para tokens JWT de cada rol
- `SUPPRESS_SEND=1` en `.env` para evitar errores SMTP en tests

### 8.4 Otras Mejoras Recientes

- **Autenticación**: `JWT_EXPIRES_MINUTES` bajó de 480 a 60 (configurable vía env)
- **JWT**: Agregados `iat` y `jti` a los claims
- **Carga de PDF calendario** (`eventos_router.py`): permite a profesor (no solo admin) cargar PDF con Gemini
- **`alumno_router.py`**: endpoints para perfil, materias, notas, asistencia y resumen del alumno logueado
- **PATCH `/materias/{id}`**: nuevo endpoint para reasignación de profesor (usado por GestionAsignaciones)

---

## 9. Pruebas

### Ejecución

```bash
cd backend
./venv/Scripts/python.exe -m pytest tests/ -v
```

### Cobertura de Tests de Seguridad

| # | Test | Verifica |
|---|---|---|
| 1 | `test_alumno_cannot_change_role_to_admin` | PATCH no modifica role para no-admin |
| 2 | `test_alumno_cannot_change_carrera_id` | PATCH no modifica carrera_id para no-admin |
| 3 | `test_alumno_can_change_own_name` | PATCH sí permite cambiar nombre |
| 4 | `test_admin_can_change_role` | Admin sí puede cambiar role |
| 5 | `test_alumno_cannot_enroll_other_student` | Inscripción forzada a sí mismo |
| 6 | `test_admin_can_enroll_any_student` | Admin puede inscribir a cualquiera |
| 7 | `test_apunte_creation_forces_current_user` | user_id ignorado, se usa current_user |
| 8 | `test_delete_user_actually_removes` | DELETE con cascade |
| 9 | `test_delete_user_non_admin_returns_403` | No-admin no puede eliminar |
| 10 | `test_profesor_cannot_create_grade_for_other_materia` | Profesor no titular → 403 |
| 11 | `test_profesor_can_create_grade_for_own_materia` | Profesor titular → 200 |
| 12 | `test_grade_value_out_of_range_rejected` | Nota > 10 → 422 |
| 13 | `test_grade_value_negative_rejected` | Nota < 0 → 422 |
| 14 | `test_duplicate_grade_type_rejected` | Mismo tipo duplicado → 400 |
| 15 | `test_duplicate_attendance_handled_by_unique_constraint` | Misma fecha duplicada → 409 |
| 16 | `test_materias_list_requires_auth` | GET /materias/ sin token → 401 |
| 17 | `test_apuntes_list_requires_auth` | GET /apuntes/ sin token → 401 |
| 18 | `test_programas_list_requires_auth` | GET /programas/ sin token → 401 |
| 19 | `test_temarios_list_requires_auth` | GET /temarios/ sin token → 401 |
| 20 | `test_eventos_get_requires_auth` | GET /eventos/1 sin token → 401 |
| 21 | `test_alumno_cannot_create_thread_in_unenrolled_materia` | Hilo en materia no inscripta → 403 |
| 22 | `test_alumno_can_create_thread_in_enrolled_materia` | Hilo en materia inscripta → 200 |
| 23 | `test_alumno_sees_global_and_own_materia_events` | Filtro OR de eventos |
| 24 | `test_create_horario_admin` | POST /horarios/ admin → 200 |
| 25 | `test_create_horario_alumno_forbidden` | POST /horarios/ alumno → 403 |
| 26 | `test_horario_overlap_detection` | Inscripción con solapamiento → 409 |
| 27 | `test_password_reset_rate_limit` | 4º intento → 429 |
| 28 | `test_materia_get_requires_auth` | GET /materias/1 sin token → 401 |
| 29 | `test_alumno_cannot_list_other_users` | GET /users/ alumno → 403 |
| 30 | `test_boleta_uses_weighted_average` | PDF generado con promedio ponderado |
| 31 | `test_schedule_overlap_verification_endpoint` | Verificar solapamiento endopint |

---

## 10. Flujo de Trabajo y Despliegue

### Desarrollo

```bash
# Backend
cd backend
./venv/Scripts/python.exe -m uvicorn app.main:app --port 8000 --reload

# Frontend (terminal separada)
cd frontend
npm run dev
# → http://localhost:5173 (proxy /api → backend)
```

### Usuarios Demo

| Rol | Usuario | Contraseña | Login en |
|---|---|---|---|
| Alumno | `12345678` | `Alumno1234!` | `/login` pestaña Alumno |
| Profesor | `prof@uca.edu.py` | `Profesor1234!` | `/login` pestaña Profesor |
| Admin | `admin@uca.edu.py` | `Admin1234!` | `/admin` |

### Construcción

```bash
cd frontend
npm run build   # TypeScript check + Vite build → dist/
```

### Variables de Entorno (`.env`)

```
DATABASE_URL=sqlite:///./sistema_academico.db
JWT_SECRET=<clave-segura-32+chars>
JWT_EXPIRES_MINUTES=60
CORS_ORIGINS=http://localhost:5173
GEMINI_API_KEY=<opcional-para-carga-pdf>
SUPPRESS_SEND=1
# Mail (opcional)
MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM, MAIL_SERVER, MAIL_PORT, ...
```

---

## 11. Lo que Falta / Próximos Pasos

### Necesario para Producción

1. **GEMINI_API_KEY** en `.env` — sin esto, `POST /eventos/cargar-pdf` falla. Clave gratuita en https://aistudio.google.com/apikey + `pip install google-generativeai`
2. **Migrar a PostgreSQL** para concurrencia real
3. **Hacer `profesor_id` nullable** en `Materia` para modelar "materia vacante"
4. **Storage de archivos** para fotos de perfil (S3 o disco local servido por FastAPI)
5. **SMTP real** configurado para notificaciones de notas y reseteo de contraseña

### Recomendado a Futuro

6. **UI de Foro mejorada** (edición, fijado, cierre de hilos desde frontend)
7. **Gráfico de distribución de notas** consumiendo `GET /puntajes/materia/{id}/estadisticas`
8. **Paginación en Usuarios.tsx** para grandes volúmenes
9. **Tests automatizados de frontend** (hoy solo `tsc` + `vite build`)
10. **Integración asistencia QR + foro** (ej. notificar en foro cuando se abre asistencia)
11. **Alertas de deserción** con datos históricos y machine learning básico
