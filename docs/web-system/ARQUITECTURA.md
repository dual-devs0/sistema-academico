# Arquitectura — Sistema Académico UCA V2

> Generado leyendo el código real en `backend/app/` y `frontend/src/` (Fase 0 y Fase 1 cerradas). Fuente citada en cada sección.

## Stack

**Backend** — `backend/requeriments.txt`:
- FastAPI + Uvicorn
- SQLAlchemy + Alembic + psycopg2-binary (PostgreSQL)
- python-jose (JWT) + passlib[bcrypt]
- boto3 (Cloudflare R2 / S3-compatible)
- fastapi-mail (SMTP)
- reportlab (PDFs — boletas)
- pytest + pytest-asyncio + pytest-mock + httpx

**Frontend** — `frontend/package.json`: React 19.2.7 + TypeScript 6.0.2 + Vite 8.1 + Tailwind 4.3.1 + React Router 7.18

**Base de datos:** PostgreSQL vía Neon (branches separadas dev/test). Tests usan SQLite in-memory (`tests/conftest.py`) vía `Base.metadata.create_all()`; el schema real de Postgres se gestiona **solo** con Alembic (`backend/alembic/versions/`).

## Autenticación

Fuente: `backend/app/routers/auth_router.py`, `backend/app/dependencias.py`, `backend/app/models/refresh_token.py`.

- **Access token**: JWT, 15 min (`JWT_EXPIRES_MINUTES` en `.env`), payload `{sub, role, user_id}`. Verificado en cada request vía `Depends(get_current_user)` (`dependencias.py`), que decodifica y devuelve una instancia tipada `CurrentUser` (Pydantic, `app/schemas/current_user_schema.py`: `username: str`, `role: str`, `user_id: int`) — **no** un dict. *(Cambio de hardening, 2026-07-13: antes era un dict crudo `{username, role, user_id}` accedido con `current_user["role"]`; tipar con Pydantic evita typos silenciosos de key en los ~26 routers que lo consumen — ver `CHANGELOG_TECNICO.md`.)*
- **Refresh token**: cookie httpOnly, `secure` (gateado por `COOKIE_SECURE` en `.env`, `true` en producción, `false` solo en dev/test local sobre http), `SameSite=Lax`, 7 días, hash SHA-256 guardado en tabla `refresh_tokens` (nunca el token crudo). Rotación: cada `POST /auth/refresh` revoca el token usado y emite uno nuevo.
- **CSRF en `/auth/refresh`** *(2026-07-13)*: patrón double-submit cookie. `/auth/login` y `/auth/refresh` emiten además una cookie `csrf_token` (no httpOnly, mismas flags `secure`/`SameSite`). El flujo web (cookie-based) debe reenviar ese valor en el header `X-CSRF-Token`; se compara con `secrets.compare_digest` contra la cookie y rechaza con 403 si falta o no coincide. El flujo mobile (refresh token enviado en el body, no por cookie) queda exento — no hay cookie de sesión que un sitio de terceros pueda explotar.
- **Rate limit en `/auth/login`** *(2026-07-13)*: 5 intentos fallidos / 15 min, clave `username:ip_cliente` (dict en memoria en `auth_router.py`, mismo patrón que el rate-limit de recuperar-contraseña). Solo cuenta intentos fallidos (no bloquea logins legítimos repetidos); un login exitoso limpia el contador de esa clave.
- **Logout**: revoca el refresh token en DB, no solo limpia cookie (borra `refresh_token` y `csrf_token`).
- **Reset de contraseña**: `POST /auth/recuperar-contrasena`, rate-limited en memoria (3 intentos / 15 min por username_or_email), genera password aleatoria de 10 caracteres y la envía por email.
- **Roles**: `admin`, `profesor`, `alumno` — string plano en `users.role`, sin tabla de roles separada.

## Patrón de autorización

Cada endpoint usa `Depends(get_current_user)` y compara `current_user.role` (atributo tipado, ver arriba) contra los roles permitidos (no hay decorador centralizado de roles en la mayoría de routers, salvo `require_role()` en `dependencias.py`, poco usado).

**Excepción centralizada:** verificación de "¿este profesor dicta esta materia?" vive en `backend/app/services/autorizacion.py` (`es_profesor_de_materia`), consumida por `puntajes_router`, `asistencias_router`, `horarios_router`, `foro_router` — antes de la Fase 1 estaba duplicada 21 veces, se consolidó ahí.

## Modelo de oferta académica (clave para entender el resto)

Fuente: `backend/app/models/materia.py`, `oferta_materia.py`.

`Materia` es **catálogo puro** (nombre, carrera, año/semestre curricular, créditos, cupos) — **no tiene profesor**. `OfertaMateria` vincula `materia_id + profesor_id + periodo` (ej. `'2026-1'`) + `activa: bool`. Esto permite que un profesor distinto dicte la misma materia en otro período sin perder histórico. `Inscripcion`, `Puntaje`, `Asistencia` apuntan a `oferta_materia_id`, no a `materia_id` directo — el nombre de la materia se resuelve vía join cuando hace falta (varios modelos exponen una property `materia_id` de solo lectura para compatibilidad).

## Módulo Pensum (Fase 2)

Fuente: `backend/app/models/pensum_materia.py`, `correlatividad.py`, `avance_alumno_pensum.py`, `backend/app/routers/pensum_router.py`, `backend/app/services/pensum.py`.

`PensumMateria` define la malla curricular: qué `Materia` corresponde a qué `semestre`/`creditos` dentro de una `Carrera`. `Correlatividad` define prerrequisitos entre materias (`tipo`: `aprobada` | `cursando`). `AvanceAlumnoPensum` cachea el estado calculado (`pendiente`/`cursando`/`aprobada`/`bloqueada`) por alumno, recalculado en cada `GET /pensum/alumno/{id}/avance`.

**Decisión de diseño:** `pensum_materias.materia_id` y `correlatividades.materia_id`/`prerrequisito_id` apuntan a `materias.id`, **no** a `ofertas_materia.id`. La malla y las correlatividades son propiedades de la materia como catálogo (independientes del período/profesor que la dicta); solo `Inscripcion`/`Puntaje`/`Asistencia` necesitan resolución a nivel de oferta concreta. `validar_correlatividades()` (`services/pensum.py`) resuelve esta diferencia internamente: busca todas las `ofertas_materia` de la materia prerrequisito y evalúa notas/inscripción sobre cualquiera de ellas, sin importar en qué período se cursó.

`POST /inscripciones/` invoca `validar_correlatividades(alumno_id, materia_id, db)` antes de crear la inscripción — 422 si hay prerrequisitos pendientes.

**Gap encontrado y resuelto durante el frontend:** el router original no tenía forma de *listar* correlatividades (solo `POST`/`DELETE` por id) — imposible construir una UI de administración sin eso. Se agregó `GET /pensum/correlatividades?carrera_id=` (`pensum_router.py`), que resuelve `carrera_id` a un `IN` sobre `pensum_materias.materia_id` ya que `correlatividades` no tiene FK directa a `carreras`.

**Frontend:** `frontend/src/services/pensumService.ts` (cliente 1:1 sobre los 8 endpoints). `frontend/src/pages/MallaAdmin.tsx` (CRUD de malla + correlatividades, rol admin) y `MallaAlumno.tsx` (visualización de avance con estado por materia y tooltip de prerrequisito faltante, rol alumno) se renderizan ambos detrás de una única ruta `/malla`, que branchea por rol en `frontend/src/pages/Malla.tsx` — mismo patrón que `Dashboard.tsx` para `AlumnoDash`/`ProfesorDash`/`AdminDash`.

## Módulo Expediente académico (Fase 3)

Fuente: `backend/app/models/expediente_materia.py`, `expediente_semestre.py`, `regularidad_alumno.py`, `backend/app/routers/expediente_router.py`, `backend/app/services/expediente.py`.

`ExpedienteMateria` es el **registro oficial cerrado** de una materia cursada — distinto de `Puntaje` (notas crudas y mutables por tipo de evaluación). Un admin lo crea vía `POST /expediente/cerrar-materia`, que snapshotea `nota_final` (fórmula ponderada existente sobre los `Puntaje` de esa oferta) y `creditos` (de `PensumMateria` en ese momento) y fija `condicion` (`aprobada`/`reprobada`, `nota_final >= 6`). `ExpedienteSemestre` y `RegularidadAlumno` son cachés recalculadas en cada lectura (mismo patrón que `AvanceAlumnoPensum` de Fase 2).

**Decisión de diseño — por qué `expediente_materias` es la fuente de verdad del PPA, no `Puntaje` en vivo:** el expediente es un registro histórico; no debe cambiar si después se edita el pensum o se cargan notas de otro período. `calcular_ppa()` (`services/expediente.py`) solo lee `expediente_materias` con `condicion='aprobada'` — nunca recalcula desde `Puntaje` directamente.

**Decisión de diseño — por qué `PPA_UMBRAL_RIESGO=7.0` y no `6.0`:** `calcular_ppa()` promedia únicamente materias `aprobada`, y una materia solo es `aprobada` si su `nota_final >= 6`. Un promedio ponderado de números que son todos `>= 6` es matemáticamente siempre `>= 6` — un umbral de riesgo igual a la nota de corte (`6.0`) nunca podría dispararse, sería código muerto. `7.0` sí es alcanzable (ej. varias materias aprobadas justo con 6) y captura la semántica real: "aprobado, pero con margen flojo".

`POST /inscripciones/` (Fase 2) y `POST /expediente/cerrar-materia` (Fase 3) son independientes — cerrar una materia no crea ni modifica inscripciones ni correlatividades.

**Frontend:** `frontend/src/services/expedienteService.ts` (cliente 1:1 sobre los 4 endpoints). `ExpedienteAlumno.tsx` (PPA, badge de regularidad, historial cerrado agrupado por período, rol alumno) y `ExpedienteAdmin.tsx` (buscador de alumno, cerrar materia, ver expediente/regularidad de cualquier alumno, rol admin) se renderizan detrás de una única ruta `/expediente` que branchea por rol en `Expediente.tsx` — mismo patrón que `Malla.tsx` de Fase 2.

**Colisión de nombres encontrada y resuelta:** el menú ya tenía un item **"Expediente"** apuntando a `/puntajes` (`Layout.tsx`) — esa página (`Puntajes.tsx`) muestra notas vivas/editables por el profesor, conceptualmente distinto del registro cerrado de Fase 3. Se renombró ese item a **"Calificaciones"** (sigue apuntando a `/puntajes`, sin tocar esa página) y se agregó un item nuevo **"Expediente"** → `/expediente` (el módulo real de Fase 3), en `menuAlumno`, `menuAdmin` y `bottomNavByRole.alumno`.

**Gap de datos resuelto sin tocar backend:** no existe un endpoint para listar inscripciones filtradas por alumno. `ExpedienteAdmin.tsx` resuelve qué `oferta_materia_id` cerrar pidiendo `GET /inscripciones/` completo (el admin ve todas) y filtrando client-side por `alumno_id` — mismo patrón de fetch-amplio-y-filtrar-en-cliente ya usado en `Dashboard.tsx`.

## Storage de archivos

Fuente: `backend/app/services/storage.py` (no leído completo en esta pasada — <!-- TODO: verificar firma exacta de subir_archivo/obtener_url_firmada/eliminar_archivo -->). Usado por `apuntes_router.py` (archivo de apunte) y `users_router.py` (foto de perfil). Guarda solo la `storage_key` en DB, sirve con URL firmada.

## Alerta de inasistencia crítica (2026-07-13)

Fuente: `backend/app/routers/asistencias_router.py` (`_verificar_alerta_inasistencia`), `backend/app/email_utils.py` (`send_alerta_inasistencia_email_bg`).

Cuando se registra una ausencia (`POST /asistencias/`, `PUT /asistencias/{id}`, `POST /asistencias/lote` — no aplica a `POST /asistencias/qr/verificar`, que solo registra presentes), se recalcula el % de inasistencia del alumno en esa `oferta_materia_id` y se compara contra el estado **antes** de ese registro (`total-1` clases, `ausentes-1`).

**Decisión de diseño — por qué "cruce de umbral" y no "está sobre 25%":** no hay columna de tipo `alerta_enviada` en `asistencias`. Si se alertara cada vez que el % actual es `>=25`, cada ausencia subsiguiente reenviaría el mismo email indefinidamente. En cambio, solo se dispara cuando el % **pasa** de `<25` a `>=25` en ese registro puntual — se detecta recalculando el estado con y sin el registro recién insertado, sin necesidad de persistir un flag ni migración nueva. Efecto secundario aceptado: si se borra una asistencia (`DELETE /asistencias/{id}`) y el % vuelve a bajar de 25%, una ausencia posterior sí volvería a disparar la alerta — comportamiento correcto (la alerta refleja el estado real del alumno, no un evento único de por vida).

Destinatarios: alumno, profesor titular de la oferta (`OfertaMateria.profesor_id`) y todos los usuarios `role == "admin"`, deduplicados. Reusa `send_..._email_bg` (patrón `BackgroundTasks.add_task`, mismo mecanismo que notas nuevas y reset de contraseña).

## Exportación RUE-ES / MEC (2026-07-13)

Fuente: `backend/app/routers/reportes_router.py` (`GET /reportes/rue-es/matricula`, `GET /reportes/rue-es/trayecto-academico`).

El MEC/CONES (Registro Único del Estudiante de Educación Superior, Paraguay) no publica una plantilla técnica CSV descargable — no encontrada en búsqueda web ni en `datos.gov.py`. El export se construyó con los campos estándar que este tipo de registro institucional suele requerir (cédula, nombre, carrera, período, nota final, % asistencia), con `codigo_mec_carrera` como columna placeholder vacía hasta que la universidad reciba el código oficial de carrera del VESC/CONES. **Antes de usarse para una entrega real al MEC, este formato debe validarse contra la plantilla oficial** — ver comentario en el propio archivo. Nota final calculada reusando `PESOS`/`_calcular_promedio_final` de `puntajes_router.py` (mismo criterio de aprobación que el resto del sistema: promedio ponderado `>=6`).

## Estructura de carpetas

```
backend/app/
  routers/     — 1 archivo por recurso, prefijo REST (ej. materia_router.py -> /materias)
  models/      — 1 clase SQLAlchemy por archivo
  schemas/     — Pydantic, sufijo _schema.py o _shemas.py (inconsistente, histórico)
  services/    — lógica de negocio reutilizada entre routers (autorizacion.py, pensum.py, storage.py, email_utils.py)
  dependencias.py — get_current_user, require_role
  auth.py      — create_access_token, create_refresh_token, constantes JWT
  database.py  — engine, SessionLocal, Base, get_db

frontend/src/
  pages/       — 1 componente por ruta
  components/common/ — componentes genéricos reutilizables (ej. TablaPaginada.tsx)
  services/    — wrappers finos sobre fetch por dominio (ej. estadisticasService.ts)
  lib/api.ts   — cliente HTTP central, maneja access token en memoria + refresh silencioso
```

## Frontend — sistema de diseño y componentes compartidos

Fuente: `frontend/src/styles/design-tokens.css`, `frontend/src/components/Layout.tsx`, `GlobalToast.tsx`, `QRModal.tsx`, `StatCard.tsx`, `RoleBadge.tsx`, `StatusBadge.tsx`, `frontend/src/hooks/useRole.ts`, `frontend/src/lib/api.ts`.

- **Tipografía:** Inter (UI general) + JetBrains Mono (`--font-mono`, labels/badges/valores numéricos).
- **Accent dinámico por rol:** `document.body.setAttribute('data-role', rol)` en `Layout.tsx` — alumno cian `#00b4d8`, profesor violeta `#8b5cf6`, admin azul `#2563eb`. Los CSS custom properties (`--accent`, `--accent-bright`, `--accent-muted`) resuelven al color del rol activo.
- **Clases utilitarias reusables** (`design-tokens.css`): `.card` / `.card-elevated`, `.btn-primary` / `.btn-ghost`, `.badge`, `.input-uca`, `.table-uca`, `.pill-tab` / `.line-tabs`, `.progress-track` / `.progress-fill`, `.kpi-card`, `.mono-label`, `.avatar-initials`, `.fab`. Todas las páginas nuevas (Fase 2/3: `MallaAdmin.tsx`, `ExpedienteAlumno.tsx`, etc.) reusan estas clases en vez de definir estilos propios.
- **Iconografía:** Tabler Icons vía CDN, `<i className="ti ti-*">`.
- **Estado global:** sin Redux ni Context pesado. Token de sesión en memoria (`lib/api.ts`, nunca `localStorage`/`sessionStorage` — ver incidente de Fase 1 en `CHANGELOG_TECNICO.md`), eventos DOM globales (`emitToast`, `emitHelp`, `emitAvatarUpdated`) para comunicación entre componentes desacoplados, resto es estado local por página.
- **`Layout.tsx`:** sidebar 216px desktop / drawer mobile, topbar, bottom-nav mobile (5 ítems por rol, `bottomNavByRole`). Incluye dropdown de notificaciones (`GET /eventos/`, click navega a `/calendario`), dropdown de aplicaciones (quick-launcher con los ítems del menú del rol activo) y modal de Centro de Ayuda (invocable desde cualquier componente vía `emitHelp()`).
- **`hooks/useRole.ts`:** `getRole()`, `getUserId()`, `getUsername()` derivados del JWT decodificado en memoria (`getCurrentUser()` de `lib/api.ts`) — nunca leer el rol de otra fuente.

## Migraciones

Alembic obligatorio para todo cambio de schema en Postgres (`CLAUDE.md`, regla no negociable). El backend además tiene un fallback `_apply_db_migrations()` en `main.py` que hace `ALTER TABLE ADD COLUMN` directo sobre SQLite en dev local — **no aplica a Postgres**, es solo conveniencia de desarrollo.
