# ANÁLISIS COMPLETO Y ROADMAP — Sistema Académico UCA

> Revisión técnica completa del proyecto. Backend: FastAPI + SQLAlchemy + SQLite/PostgreSQL. Frontend: React 19 + TypeScript + Vite + Tailwind v4.
> Fecha: Junio 2026

---

## ESTADO ACTUAL — QUÉ FUNCIONA

| Área | Estado |
|------|--------|
| Login con JWT y roles (admin, profesor, alumno) | ✅ |
| Modelos de BD: users, carreras, materias, asistencias, puntajes, apuntes, temarios, eventos, inscripciones | ✅ |
| Schemas Pydantic para todos los modelos | ✅ |
| Routers: auth, users, materias, carreras, asistencias, puntajes, apuntes, eventos, temarios, inscripciones | ✅ |
| Seed con 3 usuarios, 4 carreras, 3 materias | ✅ |
| Frontend: todas las páginas creadas con diseño dark | ✅ |
| Layout con menú dinámico por rol | ✅ |
| Rutas protegidas con redireccionamiento por rol | ✅ |
| API client con JWT en headers | ✅ |
| Proxy Vite: `/api` → `http://127.0.0.1:8000` | ✅ |
| Fallback a datos mock si la API falla | ✅ |

---

## BUGS CRÍTICOS A CORREGIR

### BACKEND

#### 1. `SECRET_KEY` hardcodeada — `backend/app/auth.py` línea 4
```python
# MAL — cualquiera que vea el repo puede forjar tokens
SECRET_KEY = "supersecretkey"

# BIEN
import os
SECRET_KEY = os.getenv("JWT_SECRET", "cambiar-en-produccion")
```

#### 2. `POST /users/` sin autenticación — `backend/app/routers/users_router.py`
Cualquiera sin token puede crear usuarios (incluso admins). Agregar `current_user = Depends(get_current_user)` y verificar `role == "admin"`.

#### 3. `GET /users/` sin autenticación — mismo archivo
La lista completa de usuarios es pública. Agregar auth y restricción a admin.

#### 4. `create_user` no guarda campos nuevos — `users_router.py`
```python
# MAL — solo guarda username, hashed_password, role
new_user = models.user.User(
    username=user.username,
    hashed_password=hash_password(user.password),
    role=user.role
)

# BIEN — guardar todos los campos del schema
new_user = models.user.User(
    username=user.username,
    hashed_password=hash_password(user.password),
    role=user.role,
    nombre=user.nombre or "",
    email=user.email,
    carrera_id=user.carrera_id,
    es_becado=user.es_becado or False,
)
```

#### 5. `create_materia` no guarda carrera_id, anio, semestre — `materia_router.py`
```python
# MAL
new_materia = models.materia.Materia(
    nombre=materia.nombre,
    profesor_id=materia.profesor_id
)

# BIEN
new_materia = models.materia.Materia(
    nombre=materia.nombre,
    profesor_id=materia.profesor_id,
    carrera_id=materia.carrera_id,
    anio=materia.anio or 1,
    semestre=materia.semestre or 1,
)
```

#### 6. Schema de login usa `UserCreate` (que tiene `role`) — `auth_router.py`
`UserCreate` incluye el campo `role` como requerido. Para login solo se necesitan `username` y `password`. Crear `LoginRequest` separado:
```python
class LoginRequest(BaseModel):
    username: str
    password: str
```

#### 7. Verificación incorrecta en inscripciones — `inscripciones_router.py`
```python
# MAL — compara username (str) con alumno_id (int)
if current_user["role"] != "alumno" or current_user["username"] != str(alumno_id):

# BIEN — comparar user_id con alumno_id
if current_user["role"] != "alumno" or current_user["user_id"] != alumno_id:
```
Esto requiere agregar `user_id` al payload JWT y al `get_current_user`.

#### 8. `GET /puntajes/` sin restricción de rol
Un alumno puede ver los puntajes de TODOS los alumnos. Filtrar por rol:
- admin/profesor: ven todos
- alumno: solo ve los suyos

#### 9. No existe `GET /users/me`
El frontend necesita obtener el perfil completo del usuario logueado (nombre, email, carrera, es_becado) pero no hay endpoint para esto.

#### 10. No existe `PATCH /users/{id}` ni `DELETE /users/{id}`
El frontend de Usuarios.tsx intenta editar y eliminar pero el backend no tiene estos endpoints.

#### 11. La migración de Alembic está vacía
`b948d85238e3_create_users_table.py` tiene `upgrade()` y `downgrade()` vacíos. Las tablas se crean via `Base.metadata.create_all()` en el startup, lo cual no es apropiado para producción.

#### 12. Token expira en 30 minutos — muy corto para uso en aula
`.env.example` dice `JWT_EXPIRES_IN="8h"`. El código usa 30 minutos. Debería leer de variable de entorno.

#### 13. No hay endpoint de generación de Boleta PDF
`reportlab` y `weasyprint` están en `requeriments.txt` pero no hay ningún router que genere PDF.

---

### FRONTEND

#### 14. `Dashboard.tsx` — query incorrecta para puntajes
```typescript
// MAL — username es string ("12345678"), no el ID numérico
await api.get(`/puntajes/?user_id=${userData.username}`)

// BIEN — usar user_id del token
await api.get(`/puntajes/?user_id=${userData.user_id}`)
```

#### 15. `Usuarios.tsx` — el CRUD no llega a la API
La página tiene `import { api }` pero usa `usuariosIniciales` mock. Los botones de crear, editar y eliminar usuarios operan solo en estado local. Los cambios se pierden al recargar.

#### 16. `Materias.tsx` — igual que Usuarios.tsx
Usa `materiasIniciales` hardcodeado. El API devuelve `profesor_id` (número), pero el frontend muestra `profesor` (string) — hay un mismatch de tipos.

#### 17. `Boleta.tsx` — datos completamente hardcodeados
```typescript
// El alumno está hardcodeado, nunca usa la API
const alumno = {
  nombre: 'María González',
  legajo: '2024-0123',
  ...
}
```

#### 18. `Perfil.tsx` — solo muestra datos del JWT
Solo usa `decodeToken()` para mostrar username y role. No hace fetch del perfil completo (nombre real, email, carrera, estado de beca).

#### 19. `MisCursos.tsx` — completamente comentado
Todo el componente está en comentarios `//`. No está en las rutas de `App.tsx`. Hay que decidir: implementarlo o eliminarlo.

#### 20. `Reportes.tsx` — datos 100% mock, sin conexión a API
Los números (125 alumnos, 80 alumnos, etc.) están hardcodeados. Los botones "Ver" y "Exportar" no hacen nada real.

---

## LO QUE FALTA IMPLEMENTAR (FASE 4)

### BACKEND — por orden de prioridad

| # | Tarea | Archivo(s) | Dificultad |
|---|-------|------------|------------|
| 1 | Leer `SECRET_KEY` y `ACCESS_TOKEN_EXPIRE_MINUTES` de `.env` | `auth.py` | Fácil |
| 2 | Agregar `user_id` al payload JWT y al `get_current_user` | `auth_router.py`, `auth.py`, `dependencias.py` | Fácil |
| 3 | Proteger `POST /users/` y `GET /users/` con admin auth | `users_router.py` | Fácil |
| 4 | Corregir `create_user` para guardar todos los campos | `users_router.py` | Fácil |
| 5 | Corregir `create_materia` para guardar carrera_id, anio, semestre | `materia_router.py` | Fácil |
| 6 | Crear schema `LoginRequest` separado | `users_schemas.py`, `auth_router.py` | Fácil |
| 7 | Agregar `GET /users/me` | `users_router.py` | Fácil |
| 8 | Agregar `PATCH /users/{id}` para actualizar perfil | `users_router.py` | Media |
| 9 | Agregar `DELETE /users/{id}` solo para admin | `users_router.py` | Fácil |
| 10 | Filtrar `GET /puntajes/` por rol (alumno solo ve los suyos) | `puntajes_router.py` | Fácil |
| 11 | Corregir verificación en inscripciones | `inscripciones_router.py` | Fácil |
| 12 | Endpoint `GET /boleta/{user_id}` — generar PDF server-side | nuevo `boleta_router.py` | Alta |
| 13 | Crear migraciones Alembic reales para todos los modelos | `alembic/versions/` | Media |
| 14 | Agregar `GET /materias/{materia_id}` para detalle de materia | `materia_router.py` | Fácil |
| 15 | Agregar `DELETE /materias/{id}` para admin | `materia_router.py` | Fácil |

### FRONTEND — por orden de prioridad

| # | Tarea | Archivo(s) | Dificultad |
|---|-------|------------|------------|
| 1 | Corregir query de puntajes en Dashboard (usar `user_id` numérico) | `Dashboard.tsx` | Fácil |
| 2 | Conectar `Perfil.tsx` a `GET /users/me` | `Perfil.tsx` | Fácil |
| 3 | Conectar `Usuarios.tsx` a API real (GET, POST, PATCH, DELETE) | `Usuarios.tsx` | Media |
| 4 | Conectar `Materias.tsx` a API real (GET, POST) + resolver mismatch `profesor_id` vs `profesor` | `Materias.tsx` | Media |
| 5 | Conectar `Boleta.tsx` a API real (cargar datos del alumno logueado) | `Boleta.tsx` | Media |
| 6 | Conectar `Reportes.tsx` a API real (stats reales) | `Reportes.tsx` | Alta |
| 7 | Implementar o eliminar `MisCursos.tsx` | `MisCursos.tsx`, `App.tsx` | Media |
| 8 | Crear página `/estadisticas` con gráficos (Recharts ya instalado) | nuevo `Estadisticas.tsx` | Alta |
| 9 | Agregar `user_id` a la respuesta de `decodeToken()` en llamadas API | `api.ts` | Fácil |
| 10 | Agregar tipos TypeScript centrales en `/src/types/` | `/src/types/index.ts` | Media |

---

## PRÓXIMOS PASOS RECOMENDADOS (orden de ejecución)

### PASO 1 — Fixes rápidos del backend (1-2 horas)
Corregir todos los bugs críticos del backend. Son cambios pequeños de 1-5 líneas cada uno.
Archivos: `auth.py`, `auth_router.py`, `dependencias.py`, `users_router.py`, `materia_router.py`, `puntajes_router.py`, `inscripciones_router.py`, `users_schemas.py`

### PASO 2 — Conectar frontend a backend real (2-3 horas)
Reemplazar mocks por llamadas reales a la API en Usuarios.tsx, Materias.tsx, Perfil.tsx y Boleta.tsx.

### PASO 3 — Endpoint Boleta PDF (1-2 horas)
Crear `boleta_router.py` con `GET /boleta/{user_id}` que use `reportlab` para generar el PDF del alumno con sus notas reales desde la BD.

### PASO 4 — Página Estadísticas (2-3 horas)
Nueva página `/estadisticas` con gráficos Recharts (ya instalado):
- Promedio por materia (barras)
- Distribución de notas (torta)
- Asistencia mensual (líneas)
- Stats rápidas: promedio general, % aprobación, % asistencia, alumnos activos

### PASO 5 — Migraciones Alembic reales
Generar y aplicar migraciones para todos los modelos existentes. Cambiar `create_all()` en startup por el control de migraciones con Alembic.

### PASO 6 — Reportes con datos reales
Conectar `Reportes.tsx` a endpoints de la API que devuelvan estadísticas agregadas reales.

### PASO 7 — Pruebas (pytest)
Escribir tests unitarios e integración con Pytest para los endpoints principales.

---

## NOTAS DE ARQUITECTURA

### BD: SQLite vs PostgreSQL
- El proyecto usa **SQLite por defecto** (`sqlite:///./sistema_academico.db`).
- Para producción usar **PostgreSQL** (docker-compose ya configurado).
- Para cambiar: solo editar `DATABASE_URL` en `.env`.
- SQLite es suficiente para desarrollo y demos; no usar en producción real.

### Autenticación
- JWT con `python-jose`. El token incluye `sub` (username), `role` y `user_id`.
- `user_id` ya está en el token (lo agrega `auth_router.py`), pero `get_current_user` en `dependencias.py` no lo extrae todavía.
- Solución: agregar `user_id: int = payload.get("user_id")` al `get_current_user`.

### Proxy Vite
- El frontend usa `/api/...` y Vite lo redirige a `http://127.0.0.1:8000/...`.
- En producción esto debe configurarse en Nginx o similar.

### Credenciales de prueba (seed.py)
| Usuario | Contraseña | Rol |
|---------|------------|-----|
| `admin@uca.edu.py` | `Admin1234!` | admin |
| `12345678` | `Alumno1234!` | alumno |
| `prof@uca.edu.py` | `Profesor1234!` | profesor |

---

## CHECKLIST ANTES DE SUBIR AL REPOSITORIO

- [ ] `SECRET_KEY` leyendo de `.env` (no hardcodeada)
- [ ] `.env` en `.gitignore` (ya está)
- [ ] `POST /users/` protegido con admin auth
- [ ] `GET /users/` protegido con admin auth
- [ ] `create_user` guarda nombre, email, carrera_id, es_becado
- [ ] `create_materia` guarda carrera_id, anio, semestre
- [ ] `GET /users/me` implementado
- [ ] `PATCH /users/{id}` implementado
- [ ] `GET /puntajes/` filtra por rol (alumno solo ve los suyos)
- [ ] Dashboard.tsx usa `user_id` numérico en query
- [ ] Perfil.tsx carga datos desde `/users/me`
- [ ] Usuarios.tsx persiste cambios a la API
- [ ] Materias.tsx persiste cambios a la API
- [ ] Boleta.tsx carga datos del alumno logueado
- [ ] No hay `console.log` en producción
- [ ] No hay código comentado innecesario (MisCursos.tsx)
- [ ] Todas las páginas muestran loading state mientras cargan datos
- [ ] Todas las páginas muestran error state si la API falla
