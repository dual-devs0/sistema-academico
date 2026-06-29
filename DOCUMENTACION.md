# Sistema Académico — Universidad Católica de Caacupé

## Documentación Técnica
**Versión 0.1.0 — Beta · Junio 2026**

FastAPI · SQLAlchemy · Alembic · React 19 · TypeScript · Vite · Tailwind v4

---

## 1. Visión General

El Sistema Académico UCA es una aplicación web de gestión académica desarrollada para la Universidad Católica de Caacupé. Permite administrar alumnos, profesores, materias, calificaciones, asistencias, apuntes y calendarios de eventos, con acceso diferenciado por roles.

### Roles del sistema

| Rol | Descripción |
|-----|-------------|
| **admin** | Acceso total. Gestiona usuarios, materias, reportes y configuración. |
| **profesor** | Visualiza y edita sus materias asignadas. Carga puntajes, asistencias y genera QR. |
| **alumno** | Ve sus propias notas, asistencia, boleta, apuntes y escanea QR. |

### Funcionalidades principales

- Autenticación JWT con expiración configurable desde `.env`
- CRUD completo de usuarios, materias y carreras
- Registro y consulta de puntajes con filtrado por rol (alumno ve solo los suyos)
- Registro y resumen de asistencias por materia
- **Asistencia por QR**: el profesor genera un QR con JWT propio (15 min de expiración), el alumno escanea y se registra automáticamente
- Generación de boleta PDF server-side (ReportLab)
- Panel de estadísticas con gráficos (Recharts)
- Reportes administrativos con datos reales de la base de datos
- Calendario de eventos académicos · Biblioteca de apuntes · Temario de clases
- Migraciones de base de datos con Alembic
- Row Level Security en PostgreSQL para tablas sensibles
- Suite de pruebas Pytest — 17/17 tests pasando
- HTTP Security Headers + CORS configurable
- Exportación a CSV y PDF desde la interfaz
- Notificaciones globales Toast

---

## 2. Arquitectura del Sistema

```
sistema-academico/
├── backend/                  # API REST — FastAPI + Python
│   ├── app/
│   │   ├── main.py           # Punto de entrada, 13 routers registrados
│   │   ├── database.py       # SQLAlchemy engine, SessionLocal
│   │   ├── auth.py           # Generación de tokens JWT (lee SECRET_KEY de .env)
│   │   ├── security.py       # Hash/verificación de contraseñas (bcrypt)
│   │   ├── dependencias.py   # get_current_user, require_role (extrae user_id)
│   │   ├── models/           # 9 modelos SQLAlchemy
│   │   ├── schemas/          # Schemas Pydantic v2
│   │   ├── routers/          # 13 routers FastAPI
│   │   │   ├── auth_router.py
│   │   │   ├── users_router.py
│   │   │   ├── materia_router.py
│   │   │   ├── puntajes_router.py
│   │   │   ├── asistencias_router.py   # QR generation + scan
│   │   │   ├── inscripciones_router.py
│   │   │   ├── carreras_router.py
│   │   │   ├── apuntes_router.py
│   │   │   ├── eventos_router.py
│   │   │   ├── temarios_router.py
│   │   │   ├── reportes_router.py
│   │   │   ├── boleta_router.py
│   │   │   └── test.py
│   │   └── middleware/       # SecurityHeadersMiddleware
│   ├── alembic/              # Migraciones de base de datos
│   ├── tests/                # Suite Pytest con fixtures en memoria
│   ├── seed.py              # Datos iniciales
│   ├── .env                 # Variables de entorno (no versionar)
│   └── docker-compose.yml   # PostgreSQL para producción
│
└── frontend/                 # SPA — React 19 + TypeScript + Vite
    └── src/
        ├── App.tsx           # Rutas protegidas por rol
        ├── lib/api.ts        # Cliente HTTP + decodeToken (incluye user_id)
        ├── components/
        │   ├── Layout.tsx    # Sidebar dinámico por rol
        │   ├── GlobalToast.tsx
        │   └── QRModal.tsx   # Modal de QR con countdown (nuevo)
        └── pages/            # 14 páginas
            ├── Login.tsx
            ├── AdminLogin.tsx
            ├── Dashboard.tsx
            ├── Puntajes.tsx
            ├── Asistencia.tsx
            ├── AsistenciaScan.tsx   # Escaneo de QR (rediseñado)
            ├── Perfil.tsx
            ├── Usuarios.tsx
            ├── Materias.tsx
            ├── Calendario.tsx
            ├── Biblioteca.tsx
            ├── Temario.tsx
            ├── Boleta.tsx
            ├── Reportes.tsx
            ├── MisCursos.tsx
            └── Estadisticas.tsx
```

### Flujo de datos

```
Browser → Vite (/api/*) → FastAPI (puerto 8000)
                               ↓
                    JWT verificado en dependencias.py
                               ↓
                         Router correspondiente
                               ↓
                    SQLAlchemy → SQLite (dev) / PostgreSQL (prod)
```

El archivo `vite.config.ts` redirige las llamadas `/api/*` al servidor FastAPI en `http://127.0.0.1:8000`. En producción esta redirección debe configurarse en Nginx.

---

## 3. Instalación y Configuración

### Requisitos previos

- Python 3.11+
- Node.js 20+
- npm 10+
- Docker (producción)

### Backend

```bash
cd sistema-academico/backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux / macOS
pip install -r requeriments.txt
copy .env.example .env          # Editar con tus valores
alembic upgrade head
python seed.py
uvicorn app.main:app --reload --port 8000
```

### Variables de entorno (`.env`)

| Variable | Valor de ejemplo | Descripción |
|----------|-----------------|-------------|
| `DATABASE_URL` | `sqlite:///./sistema_academico.db` | Conexión a la BD |
| `JWT_SECRET` | `<cadena aleatoria 32+ chars>` | Clave para firmar JWT |
| `JWT_EXPIRES_MINUTES` | `480` | Duración del token (8 hs) |
| `CORS_ORIGINS` | `http://localhost:5173` | Orígenes permitidos |
| `QR_SECRET` | `<cadena distinta a JWT_SECRET>` | Clave para firmar QR tokens |
| `FRONTEND_URL` | `http://localhost:5173` | URL del frontend (para QR) |

> El archivo `.env` está en `.gitignore` y nunca debe subirse al repositorio.

### Frontend

```bash
cd sistema-academico/frontend
npm install
npm run dev
# Disponible en http://localhost:5173
```

Para exponer en la red local (acceso desde celular):
```bash
npm run dev -- --host
```

---

## 4. Modelos de Datos

### Diagrama de relaciones

```
carreras (1) ──── (N) users
carreras (1) ──── (N) materias
users    (1) ──── (N) materias         [profesor_id]
users    (1) ──── (N) puntajes / asistencias / apuntes / inscripciones
materias (1) ──── (N) puntajes / asistencias / apuntes / inscripciones / temarios
materias (0..1) ── (N) eventos_calendario
carreras (0..1) ── (N) eventos_calendario
```

### Tabla: users

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | Integer PK | Identificador único |
| username | String UNIQUE | Email o cédula del usuario |
| hashed_password | String | Hash bcrypt |
| role | String | admin \| profesor \| alumno |
| nombre | String(120) | Nombre completo |
| email | String(200) UNIQUE | Correo electrónico |
| carrera_id | FK → carreras | Carrera (opcional para admin) |
| es_becado | Boolean | Beca activa |
| created_at | DateTime | Fecha de creación |

### Tabla: materias

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | Integer PK | Identificador único |
| nombre | String UNIQUE | Nombre de la materia |
| profesor_id | FK → users | Profesor responsable |
| carrera_id | FK → carreras | Carrera |
| anio | Integer | Año del plan (1-5) |
| semestre | Integer | Semestre (1 o 2) |

### Tabla: puntajes

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | Integer PK | Identificador único |
| user_id | FK → users | Alumno evaluado |
| materia_id | FK → materias | Materia |
| tipo | String(20) | parcial1 \| parcial2 \| practico \| final |
| valor | Numeric(5,2) | Nota (0.00 – 10.00) |
| editado_por | FK → users | Quién cargó el puntaje |
| editado_en | DateTime | Fecha de edición |

### Tabla: asistencias

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | Integer PK | Identificador único |
| user_id | FK → users | Alumno |
| materia_id | FK → materias | Materia |
| fecha | Date | Fecha de la clase |
| presente | Boolean | true = presente |
| es_becado | Boolean | Snapshot estado de beca |

### Tabla: inscripciones

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | Integer PK | Identificador único |
| alumno_id | FK → users | Alumno inscripto |
| materia_id | FK → materias | Materia |

### Tabla: eventos_calendario

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | Integer PK | Identificador único |
| titulo | String(200) | Nombre del evento |
| tipo | String(20) | parcial \| final \| feriado \| entrega \| actividad |
| fecha | Date | Fecha del evento |
| materia_id | FK → materias | Materia (opcional) |
| carrera_id | FK → carreras | Carrera (opcional) |
| creado_por | FK → users | Usuario creador |

---

## 5. Referencia de API

La API corre en `http://localhost:8000`. Documentación interactiva:
- Swagger UI: `http://localhost:8000/docs`
- Redoc: `http://localhost:8000/redoc`

Todos los endpoints (salvo `POST /auth/login`) requieren: `Authorization: Bearer <token>`

### 5.1 Autenticación — `/auth`

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/auth/login` | Inicia sesión, devuelve JWT | Público |

### 5.2 Usuarios — `/users`

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/users/` | Crear usuario | admin |
| GET | `/users/` | Listar usuarios | admin |
| GET | `/users/me` | Perfil del usuario autenticado | Todos |
| GET | `/users/{id}` | Ver usuario por ID | admin |
| PATCH | `/users/{id}` | Actualizar usuario | admin |
| DELETE | `/users/{id}` | Eliminar usuario | admin |

### 5.3 Materias — `/materias`

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/materias/` | Crear materia | admin |
| GET | `/materias/` | Listar (filtros: profesor_id, carrera_id) | Todos |
| GET | `/materias/{id}` | Detalle de materia | Todos |

### 5.4 Puntajes — `/puntajes`

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/puntajes/` | Registrar puntaje | admin, profesor |
| GET | `/puntajes/` | Listar (alumno: solo los suyos) | Todos |
| PUT | `/puntajes/{id}` | Actualizar puntaje | Todos |
| DELETE | `/puntajes/{id}` | Eliminar puntaje | Todos |
| GET | `/puntajes/{user_id}/promedio` | Promedio de un usuario | admin, alumno propio |

### 5.5 Asistencias — `/asistencias`

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/asistencias/` | Registrar asistencia | Todos |
| GET | `/asistencias/` | Listar (filtros: materia_id, user_id, fecha) | Todos |
| PUT | `/asistencias/{id}` | Actualizar | Todos |
| DELETE | `/asistencias/{id}` | Eliminar | Todos |
| GET | `/asistencias/{materia_id}/resumen` | % asistencia de una materia | Todos |
| **GET** | **`/asistencias/qr/{materia_id}`** | **Generar QR de asistencia (JWT 15 min)** | **admin, profesor** |
| **POST** | **`/asistencias/scan`** | **Escaneo de QR (registra asistencia)** | **alumno** |

### 5.6 Inscripciones — `/inscripciones`

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/inscripciones/` | Inscribirse en una materia | alumno |
| GET | `/inscripciones/{alumno_id}` | Ver inscripciones propias | alumno propio |

### 5.7 Reportes — `/reportes`

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/reportes/resumen` | KPIs globales del sistema | admin |
| GET | `/reportes/por-carrera` | Stats desglosadas por carrera | admin |
| GET | `/reportes/becados` | Lista de alumnos becados | admin |

### 5.8 Boleta PDF — `/boleta`

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/boleta/{user_id}` | Genera y devuelve boleta en PDF | admin, profesor, alumno propio |

### 5.9 Otros routers

| Endpoint base | Operaciones | Roles |
|--------------|-------------|-------|
| `/carreras` | GET (listar), POST (crear) | Todos / admin |
| `/apuntes` | GET, POST, PUT, DELETE | Todos autenticados |
| `/temarios` | GET, POST, PUT, DELETE | Todos autenticados |
| `/eventos` | GET, POST, PUT, DELETE | Todos autenticados |

---

## 6. Frontend — Páginas y Rutas

| Ruta | Página | admin | profesor | alumno |
|------|--------|-------|----------|--------|
| `/login` | Login | — | — | — |
| `/admin` | Admin Login | — | — | — |
| `/dashboard` | Dashboard | ✅ | ✅ | ✅ |
| `/perfil` | Perfil | ✅ | ✅ | ✅ |
| `/puntajes` | Puntajes | ✅ | ✅ | ✅ |
| `/asistencia` | Asistencia | ✅ | ✅ | ✅ |
| `/asistencia/scan` | Escaneo QR | — | — | ✅ |
| `/calendario` | Calendario | ✅ | ✅ | ✅ |
| `/biblioteca` | Biblioteca | ✅ | ✅ | ✅ |
| `/temario` | Temario | ✅ | ✅ | ✅ |
| `/boleta` | Boleta PDF | ✅ | ✅ | ✅ |
| `/materias` | Materias | ✅ | ✅ | — |
| `/estadisticas` | Estadísticas | ✅ | ✅ | — |
| `/miscursos` | Mis Cursos | — | ✅ | — |
| `/usuarios` | Usuarios | ✅ | — | — |
| `/reportes` | Reportes | ✅ | — | — |

---

## 7. Sistema de Asistencia por QR

### Flujo completo

```
PROFESOR (Asistencia.tsx)
  1. Abre /asistencia
  2. Hace clic en "Generar QR" junto a una materia
  3. GET /asistencias/qr/{materia_id}
  4. Backend genera JWT con QR_SECRET (15 min expiración)
  5. Backend devuelve QR imagen (base64 PNG)
  6. Se muestra modal con QR + countdown visual + barra de progreso
  7. Proyecta QR en pantalla para que alumnos escaneen

ALUMNO (AsistenciaScan.tsx)
  1. Escanea QR con cámara del celular
  2. Se abre URL: http://FRONTEND_URL/asistencia/scan?token=xxx
  3. Componente verifica: token en localStorage, rol alumno
  4. POST /asistencias/scan con { token }
  5. Backend decodifica JWT con QR_SECRET, verifica, registra asistencia
  6. Muestra estado: éxito | duplicado | expirado | error
```

### Estados del modal QR (profesor)

- **Cargando**: spinner mientras se genera el QR
- **Listo**: imagen QR + countdown (MM:SS) + barra de progreso (cyan → amber → rojo)
- **Expirado**: mensaje de expiración + botón "Generar nuevo QR"
- **Error**: reintentar

### Estados del scan (alumno)

- **Verificando**: validando token + llamando al backend
- **Éxito**: ✅ "Asistencia registrada" con datos de materia, fecha, alumno
- **Duplicado**: "Ya registraste tu asistencia hoy"
- **Expirado**: "QR expirado, pedile al profesor que genere uno nuevo"
- **No autorizado**: "Solo alumnos pueden registrar asistencia"
- **Error**: mensaje de error + reintentar

### Seguridad QR

- Usa `QR_SECRET` separado del JWT de autenticación principal
- Token expira en 15 minutos
- Valida inscripción del alumno en la materia
- Previene asistencias duplicadas (misma materia + mismo día)
- Almacena snapshot del estado de beca al momento del registro

---

## 8. Correcciones Aplicadas (Junio 2026)

### Backend

| # | Corrección | Archivo | Estado |
|---|------------|---------|--------|
| 1 | `SECRET_KEY` lee de `JWT_SECRET` en `.env` (no hardcodeada) | `auth.py` | ✅ |
| 2 | `ACCESS_TOKEN_EXPIRE_MINUTES` lee de `.env` | `auth.py` | ✅ |
| 3 | `user_id` agregado al payload JWT y extraído en `get_current_user` | `auth_router.py`, `dependencias.py` | ✅ |
| 4 | `POST /users/` protegido con admin auth | `users_router.py` | ✅ |
| 5 | `GET /users/` protegido con admin auth | `users_router.py` | ✅ |
| 6 | `create_user` guarda nombre, email, carrera_id, es_becado | `users_router.py` | ✅ |
| 7 | `GET /users/me` implementado | `users_router.py` | ✅ |
| 8 | `PATCH /users/{id}` y `DELETE /users/{id}` implementados | `users_router.py` | ✅ |
| 9 | `GET /puntajes/` filtra por rol (alumno ve solo los suyos) | `puntajes_router.py` | ✅ |
| 10 | `GET /puntajes/{user_id}/promedio` verifica por user_id | `puntajes_router.py` | ✅ |
| 11 | Corrección comparación en inscripciones (`user_id` vs `alumno_id`) | `inscripciones_router.py` | ✅ |
| 12 | Schema `LoginRequest` separado de `UserCreate` | `users_schemas.py` | ✅ |
| 13 | QR endpoints con secret separado (`QR_SECRET`) | `asistencias_router.py` | ✅ |
| 14 | Boleta PDF con ReportLab implementada | `boleta_router.py` | ✅ |

### Frontend

| # | Corrección | Archivo | Estado |
|---|------------|---------|--------|
| 1 | Dashboard usa `user_id` numérico en query de puntajes | `Dashboard.tsx` | ✅ |
| 2 | Puntajes no filtra por `user_id` para profesor/admin | `Puntajes.tsx` | ✅ |
| 3 | Perfil conectado a `GET /users/me` | `Perfil.tsx` | ✅ |
| 4 | Login guarda `user_rol` en localStorage | `Login.tsx`, `AdminLogin.tsx` | ✅ |
| 5 | QRModal con countdown, barra de progreso, 4 estados | `QRModal.tsx` | ✅ |
| 6 | AsistenciaScan rediseñado con 5 estados + redirect preservando token | `AsistenciaScan.tsx` | ✅ |
| 7 | Integración de QRModal en Asistencia.tsx | `Asistencia.tsx` | ✅ |
| 8 | `decodeToken` devuelve `user_id` | `api.ts` | ✅ |
| 9 | Rutas protegidas por rol en `App.tsx` | `App.tsx` | ✅ |

---

## 9. Autenticación y Seguridad

### Flujo de autenticación JWT

1. `POST /auth/login` → username + password
2. Backend verifica hash bcrypt con passlib
3. Genera JWT con: `sub` (username), `role`, `user_id`, `exp`
4. Frontend guarda el token en `localStorage`
5. Cada request: `Authorization: Bearer <token>`
6. `dependencias.py` decodifica y expone `{username, role, user_id}`

### Capas de seguridad implementadas

1. **JWT + Roles**: Todos los endpoints requieren token válido. Los roles se verifican en cada router. La `SECRET_KEY` se lee de `.env`.
2. **QR_SECRET separado**: Los tokens QR usan una clave distinta al JWT de auth.
3. **HTTP Security Headers**: Middleware agrega: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`.
4. **CORS**: Orígenes permitidos configurables via `CORS_ORIGINS` en `.env`.
5. **Row Level Security (PostgreSQL)**: Migración habilita RLS en tablas sensibles. Se omite en SQLite automáticamente.
6. **Hash de contraseñas**: bcrypt via passlib. Nunca se almacena texto plano.

---

## 10. Pruebas

```bash
cd backend
python -m pytest tests/ -v
# Resultado: 17 passed in 9.69s
```

| Archivo | Qué prueba |
|----------|------------|
| `conftest.py` | Fixtures: BD SQLite en memoria (StaticPool), seed, tokens por rol |
| `test_auth.py` | Login válido, contraseña incorrecta, usuario desconocido |
| `test_users.py` | CRUD de usuarios, verificación de rol admin, GET /me |
| `test_puntajes.py` | Filtrado por rol, creación y lectura de puntajes |
| `test_flow.py` | Flujo integrado: inscripción, notas, perfil |
| `test_basic.py` | Health checks básicos |

---

## 11. Despliegue

### PostgreSQL con Docker

```bash
cd backend
docker-compose up -d
# Levanta sa_postgres en localhost:5432
# Usuario: sa_user / Contraseña: sa_pass / BD: sistema_academico
```

Actualizar `.env` para PostgreSQL:
```
DATABASE_URL=postgresql://sa_user:sa_pass@localhost:5432/sistema_academico
alembic upgrade head
```

### Build del frontend para producción

```bash
cd frontend
npm run build
# Archivos estáticos en frontend/dist/
```

### Checklist antes de producción

- [ ] Cambiar `JWT_SECRET` por cadena aleatoria de 32+ caracteres
- [ ] Cambiar `QR_SECRET` por cadena distinta a `JWT_SECRET`
- [ ] Actualizar `CORS_ORIGINS` con el dominio real del frontend
- [ ] Actualizar `FRONTEND_URL` con la URL real (para QR)
- [ ] Configurar Nginx como reverse proxy frente a Uvicorn
- [ ] Habilitar HTTPS y añadir `Strict-Transport-Security`
- [ ] Ejecutar `alembic upgrade head` contra PostgreSQL real
- [ ] Correr `python seed.py` para datos iniciales
- [ ] Cambiar las credenciales por defecto

---

## 12. Credenciales de Prueba

Generadas por `seed.py`. Solo para uso en desarrollo. Cambiar antes de cualquier deploy.

| Usuario / Legajo | Contraseña | Rol | Nombre |
|------------------|-----------|-----|--------|
| `admin@uca.edu.py` | `Admin1234!` | admin | Admin UCA |
| `12345678` | `Alumno1234!` | alumno | María González |
| `prof@uca.edu.py` | `Profesor1234!` | profesor | Carlos Méndez |

---

## 13. Estado del Proyecto

### ✅ Funcionando con API real

| Página | Estado | Notas |
|--------|--------|-------|
| Login / Admin Login | ✅ | JWT, guarda rol en localStorage |
| Dashboard | ✅ | API + mock fallback, role-aware |
| Perfil | ✅ | Conectado a GET /users/me |
| Puntajes | ✅ | Filtrado por rol (alumno/profesor/admin) |
| Asistencia | ✅ | CRUD + QR generation + scan |
| Asistencia QR | ✅ | QRModal + AsistenciaScan con 5 estados |
| Calendario | ✅ | API + mock fallback |
| Biblioteca | ✅ | API + mock fallback |
| Temario | ✅ | API + mock fallback |
| Boleta PDF | ✅ | PDF server-side con ReportLab |

### ⚠️ Funcionando con datos mock (pendiente conectar a API)

| Página | Estado | Pendiente |
|--------|--------|-----------|
| Usuarios | ⚠️ Mock | Conectar CRUD a API real |
| Materias | ⚠️ Mock | Conectar a API real |
| Reportes | ⚠️ Mock | Conectar a endpoints reales |
| Estadísticas | ⚠️ Mock/API | Mejorar datos mock |
| MisCursos | ⚠️ Comentado | Implementar o eliminar |

---

*Documentación generada a partir del código fuente del proyecto Sistema Académico UCA · Junio 2026*
