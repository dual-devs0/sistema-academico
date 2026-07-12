# INSTRUCTOR — Sistema Académico UCA V2

Guía técnica de uso y estructura de los dos sistemas: **Web (gestión académica)** y **Móvil (alumno)**.

---

## 1. Visión general

El sistema académico UCA V2 consta de tres componentes principales:

```
┌─────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                     │
│  PostgreSQL + SQLAlchemy + Alembic + JWT + Cloudflare R2 │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP REST
            ┌────────────┴────────────┐
            ▼                         ▼
┌───────────────────────┐  ┌──────────────────────┐
│   Frontend Web (Vite)  │  │   App Móvil (Expo)   │
│   React 19 + TS + TW  │  │   React Native 0.86  │
│   Gestión completa     │  │   Consulta alumno    │
└───────────────────────┘  └──────────────────────┘
```

- **Web**: administración completa (admin, profesor, alumno, comité de becas)
- **Móvil**: consulta y acciones del alumno (notas, asistencia QR, horario, exámenes, cuenta)
- **Backend**: API REST unificada que ambos consumen

---

## 2. Stack técnico

### Backend (`backend/`)

| Componente | Tecnología | Uso |
|-----------|-----------|-----|
| Framework | FastAPI (Python 3.14) | API REST |
| ORM | SQLAlchemy 2.0 | Modelos y consultas |
| DB | PostgreSQL 16 (producción) / SQLite (tests) | Persistencia |
| Migraciones | Alembic | Versionado de schema |
| Auth | JWT HS256 + Refresh Token (cookie/body) | Autenticación |
| Roles | RBAC (admin, profesor, alumno, comité) | Autorización |
| Archivos | Cloudflare R2 (S3-compatible) | Fotos, apuntes, comprobantes |
| Email | Resend / SMTP Gmail | Notificaciones, reset password |
| Facturación | guarani.app (API externa) | Comprobantes electrónicos DNIT |

### Frontend Web (`frontend/`)

| Componente | Tecnología |
|-----------|-----------|
| Framework | React 19 + TypeScript 6 (strict) |
| Build | Vite 8 |
| Estilos | Tailwind v4 + design-tokens.css |
| Formularios | react-hook-form + zod |
| Tablas | TablaPaginada (componente propio) |
| Testing | Vitest + @testing-library/react |

### App Móvil (`mobile/`)

| Componente | Tecnología |
|-----------|-----------|
| Runtime | Expo SDK 57 |
| Framework | React Native 0.86 + TypeScript 6 (strict) |
| Navegación | expo-router (auth + tabs) |
| Estilos | NativeWind + Tailwind v4 |
| HTTP | Axios con interceptor 401 single-flight |
| QR | expo-camera (CameraView) |
| Biometría | expo-local-authentication |
| Testing | Jest + @testing-library/react-native |

---

## 3. Estructura del proyecto

```
sistema-academico/
├── backend/
│   ├── app/
│   │   ├── models/           # Modelos SQLAlchemy
│   │   │   ├── users.py
│   │   │   ├── materia.py
│   │   │   ├── examen.py     # Examen + InscripcionExamen
│   │   │   ├── financiero.py # Cuota, Pago, PagoOnline, SuscripcionPush, Beca*
│   │   │   └── ...
│   │   ├── routers/          # Endpoints organizados por módulo
│   │   │   ├── auth_router.py
│   │   │   ├── examenes_router.py
│   │   │   ├── finanzas_router.py
│   │   │   ├── becas_router.py
│   │   │   ├── notificaciones_router.py
│   │   │   └── ...
│   │   ├── schemas/          # Pydantic (validación/serialización)
│   │   ├── services/         # Lógica de negocio (financiero, expediente, etc.)
│   │   └── main.py           # Punto de entrada FastAPI
│   ├── alembic/              # Migraciones de base de datos
│   ├── tests/                # Suite de tests (pytest)
│   └── venv/                 # Entorno virtual Python
│
├── frontend/
│   ├── src/
│   │   ├── components/       # Componentes React reutilizables
│   │   ├── pages/            # Páginas/rutas
│   │   ├── services/         # Llamadas API (finanzasService, etc.)
│   │   ├── hooks/            # Custom hooks (useRole, etc.)
│   │   ├── lib/              # Utilidades (api.ts con axios)
│   │   ├── styles/           # design-tokens.css, global.css
│   │   └── test/             # Tests Vitest
│   └── package.json
│
├── mobile/
│   ├── app/                  # expo-router pages
│   │   ├── (auth)/login.tsx  # Pantalla de login
│   │   ├── (tabs)/           # Tab navigation
│   │   │   ├── index.tsx     # Dashboard
│   │   │   ├── notas.tsx
│   │   │   ├── horario.tsx
│   │   │   ├── perfil.tsx
│   │   │   └── _layout.tsx   # Tab bar con QR central
│   │   ├── scanner.tsx       # QR asistencia
│   │   ├── examenes.tsx      # Exámenes (pantalla 9)
│   │   └── cuenta.tsx        # Estado de cuenta
│   ├── components/ui/        # Componentes base (GlassCard, CyanBadge, etc.)
│   ├── services/             # Axios service layer
│   ├── constants/            # Design tokens (colores, tipografía, etc.)
│   └── app.json              # Config Expo
│
├── docs/
│   ├── INSTALACION.md
│   └── INSTRUCTOR.md         # Este archivo
│
└── ESTADO_FASES.md           # Estado de cada fase del plan
```

---

## 4. Roles del sistema

| Rol | Acceso web | Acceso móvil |
|-----|-----------|-------------|
| **Admin** | Completo — gestión de usuarios, materias, horarios, cuotas, pagos, exámenes, pensum, expediente, trámites, graduación, pasantías, equivalencias | No aplica |
| **Profesor** | Carga de notas, asistencia QR, foro, programa/temario, agenda personal, histórico de cátedras | No aplica |
| **Alumno** | Dashboard, calificaciones, horario, cuotas, becas, perfil, foro, exámenes, trámites, pasantías, equivalencias, graduación | Dashboard, notas, QR asistencia, horario, exámenes, cuenta, perfil |
| **Comité becas** | Revisión y aprobación de postulaciones, reportes de rendición | No aplica |

---

## 5. Cómo usar el sistema web

### 5.1 Login

- URL: `http://localhost:5173` (desarrollo) o la URL de producción
- El login redirige al dashboard según el rol
- Las sesiones duran 15 min (access token) + 7 días (refresh token en cookie httpOnly)

### 5.2 Navegación por roles

**Admin** — menú con 18 items:
- Dashboard, Usuarios, Materias, Inscripciones, Horarios, Pensum/Malla, Calificaciones, Asistencia QR, Apuntes, Programas, Foro, Eventos, Cuotas/Pagos, Becas (catálogo+postulaciones+comité), Trámites, Pasantías, Equivalencias, Graduación

**Alumno** — menú con 17 items:
- Dashboard, Mis Materias, Calificaciones, Horario, Exámenes, Cuotas, Becas, Asistencia QR, Foro, Apuntes, Eventos, Trámites, Pasantías, Equivalencias, Graduación, Perfil, Expediente

**Profesor** — menú con 10 items:
- Dashboard, Mis Materias (Activas/Histórico/Agenda), Calificaciones, Asistencia QR, Foro, Apuntes, Programas, Eventos, Perfil

### 5.3 Módulos principales

#### Dashboard
- KPIs: materias activas, próximos eventos, promedio general, cuotas pendientes
- Cada rol ve su propio dashboard con datos relevantes

#### Materias / Inscripciones
- Admin crea ofertas de materias por período
- Alumno se inscribe (con validación de correlatividades y bloqueo por mora)
- Profesor ve sus materias asignadas

#### Calificaciones (Puntajes)
- Profesor carga notas con ponderación 25/25/20/30
- Alumno consulta sus notas por materia y semestre
- Admin puede rectificar notas (con registro de auditoría)

#### Asistencia QR
- Profesor genera QR con JWT de 30 segundos
- Alumno escanea con la app móvil (expo-camera)
- El QR contiene materia_id + oferta_materia_id + timestamp + firma HMAC

#### Foro
- Hilos por materia, mensajes paginados (20 por página)
- Profesor puede fijar/cerrar hilos
- Alumno edita mensajes propios dentro de ventana de 15 min

#### Pensum / Malla curricular
- Admin define la malla de cada carrera por semestre
- Admin crea correlatividades (prerrequisitos: "aprobada" o "cursando")
- Alumno visualiza su avance (verde=aprobada, cian=disponible, gris=bloqueada)
- Inscripción se bloquea si no cumple correlatividades

#### Expediente académico
- Historial completo por semestre con PPA acumulado
- Regularidad: Activo / En riesgo / Irregular / De baja
- PDF descargable del historial oficial

#### Cuotas / Pagos (Financiero)
- Admin genera cuotas por período
- Alumno ve sus cuotas (pendientes, vencidas, pagadas)
- Admin registra pagos manuales (efectivo, transferencia, tarjeta)
- **Pago Online**: alumno puede iniciar pago con gateway Bancard (stub)
- Descuentos de becas aplicados automáticamente
- Bloqueo de inscripción por mora (configurable por carrera)

#### Becas
- **Alumno**: catálogo de becas disponibles → postular → seguimiento → ver becas activas con badge de descuento
- **Admin/Comité**: revisar postulaciones, aprobar/rechazar, asignar beca activa
- **Fuentes**: ITAIPU (externa, % fijo), Institucional (interna, % editable), BECAL, Fundasep
- **Reportes**: Rendición ITAIPU (exportable Excel)

#### Exámenes regulares
- Admin crea exámenes (fecha, hora, aula, tipo, cupos, profesor)
- Alumno se inscribe en exámenes disponibles (validación de cupos y duplicados)
- Alumno cancela inscripción propia; admin cancela cualquiera

#### Trámites
- Catálogo de trámites (automáticos y manuales)
- Alumno solicita (constancia de alumno regular, historial oficial, etc.)
- Admin resuelve y adjunta documento PDF

#### Graduación
- Verificación de condición de egreso (créditos, PPA, pasantía)
- Inicio de proceso de graduación
- Asignación de tutor de tesis, etapas, solvencia

#### Pasantías
- Admin registra empresas receptoras
- Alumno solicita pasantía
- Admin asigna tutor, registra horas, finaliza

#### Equivalencias
- Alumno solicita con programas adjuntos
- Jefe de departamento resuelve por materia
- Al aprobar, se actualiza expediente y avance de pensum

#### Notificaciones Push
- Alumno se suscribe desde el navegador (Web Push API)
- Backend guarda suscripción en `suscripciones_push`
- Endpoints: `POST /notificaciones/subscribe`, `DELETE /notificaciones/subscribe`, `POST /notificaciones/test`

---

## 6. Cómo usar la app móvil

### 6.1 Requisitos

- Expo Go (iOS/Android) o build nativo
- El backend debe estar corriendo (`http://localhost:8000` por defecto)

### 6.2 Inicio

```bash
cd mobile
npx expo start
```

Escanea el QR con Expo Go (iOS) o la cámara (Android).

### 6.3 Pantallas

| # | Pantalla | Ruta | Cómo se usa |
|---|---------|------|-------------|
| 1 | **Login** | `/login` | Usuario/contraseña. Soporta biometría (Face ID / fingerprint) |
| 2 | **Dashboard** | `/` | KPIs (materias, promedio, cuotas, exámenes), próximo evento, avance académico. Pull-to-refresh |
| 3 | **Notas** | `/notas` | Calificaciones agrupadas por semestre con desglose por tipo de evaluación |
| 4 | **QR Scanner** | `/scanner` | Escanea código QR generado por el profesor para registrar asistencia |
| 5 | **Horario** | `/horario` | Calendario mensual + eventos del día seleccionado. Clases fijas e institucionales |
| 6 | **Perfil** | `/perfil` | Datos del alumno, becas activas, toggle biométrico, cerrar sesión |
| 7 | **Cursos** | `/cursos` | Materias por carrera/semestre con detalle de cada una |
| 8 | **Cuenta** | `/cuenta` | Estado de cuenta: saldo pendiente, cuotas, historial de pagos, facturas |
| 9 | **Exámenes** | `/examenes` | Exámenes disponibles para inscribirse y exámenes en los que está inscripto |

### 6.4 Navegación

- **Tab bar inferior**: Dashboard, Notas, QR (central elevado), Horario, Perfil
- **Botón QR**: abre el escáner como modal
- **Header**: avatar + nombre + campana de notificaciones (stub)
- **Gestos**: swipe back en pantallas anidadas

### 6.5 Características técnicas móvil

- **Auth single-flight**: un solo refresh en vuelo, requests en cola se reintentan automáticamente
- **Refresh token persistente**: en SecureStore (iOS Keychain / Android EncryptedSharedPreferences)
- **Fetch parcial tolerante**: Dashboard carga 4 endpoints en paralelo; si uno falla, el resto se muestra igual
- **Stagger fade-in**: animaciones de entrada con FadeInDown + springify
- **Design tokens**: colores, radios, espaciados y tipografías centralizados en `constants/design.ts`

---

## 7. Ejecución de tests

### Backend (pytest, 236 tests)
```bash
cd backend
.\venv\Scripts\Activate
$env:JWT_SECRET="<clave>"
$env:DATABASE_URL="sqlite:///test.db"
python -m pytest tests/ -v --tb=short
```

Para excluir tests de Postgres:
```bash
python -m pytest tests/ -v --tb=short -k "not postgres_compat"
```

### Frontend (Vitest, 19 tests)
```bash
cd frontend
npx vitest run --reporter verbose
```

### Móvil (Jest, 10 tests — 1 pasa)
```bash
cd mobile
npx jest --verbose
```

---

## 8. Migraciones de base de datos

Toda tabla nueva se crea con Alembic, nunca con `create_all()`.

```bash
cd backend
.\venv\Scripts\Activate
$env:DATABASE_URL="postgresql://..."
alembic revision --autogenerate -m "descripcion"
alembic upgrade head
```

Si no hay acceso a Postgres, las migraciones se crean manualmente como archivos Python en `alembic/versions/`.

---

## 9. Scripts útiles

### Backend
```bash
ruff check app/              # Linter Python
ruff check --fix app/        # Auto-fix
cd backend; .\venv\Scripts\Activate; python -m pytest tests/  # Tests
alembic current              # Ver migración actual
alembic upgrade head         # Aplicar migraciones
```

### Frontend
```bash
npm run dev                  # Servidor de desarrollo :5173
npm run build                # Build producción
npx tsc --noEmit             # Typecheck
npx vitest run               # Tests
npx eslint src/              # Linter
```

### Móvil
```bash
npx expo start               # Iniciar servidor Expo
npx expo start --tunnel      # Acceso desde otro dispositivo
npx jest --verbose            # Tests
npx tsc --noEmit             # Typecheck
```
