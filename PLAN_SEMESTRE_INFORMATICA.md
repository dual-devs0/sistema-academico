# Plan de Implementación — Semestre Informática (3° año, 6° semestre)

> **Referencia**: este plan amplía [`uca-v2-roles-y-asistencia.md`](uca-v2-roles-y-asistencia.md).
> **Contexto**: grupo reducido (8 alumnos, 5 materias). Algunas funcionalidades se **comentan**
> (no se eliminan) y otras **nuevas** se agregan para el uso diario de asistencia.
> **Regla general**: NO borrar código de módulos existentes; solo comentar/desactivar o adaptar.
>
> **Alcance**: cubre (a) qué usar/comentar del sistema, (b) las funcionalidades nuevas, y
> (c) el **despliegue en producción aparte de la demo + app móvil**, dividido en fases aplicables.

---

## 1. Estado actual verificado (conexiones en verde)

| Conexión | Estado | Evidencia |
|---|---|---|
| Frontend → Backend (`/api` → `127.0.0.1:8000`) | ✅ | `frontend/vite.config.ts` (rewrite `/api`) |
| Login → JWT con rol | ✅ | `backend/app/auth.py:20` + `dependencias.py:35` |
| Admin: crear usuarios | ✅ | `POST /users/` solo admin (`users_router.py:75`) |
| Profesor: generar QR | ✅ | `GET /asistencias/qr/{materia_id}` (`asistencias_router.py:780`) |
| Alumno: escanear QR | ✅ | `POST /asistencias/qr/verificar` (`asistencias_router.py:527`) |
| Asistencia → OfertaMateria → Materia → Inscripcion | ✅ | FKs coherentes (`asistencia.py:22-25`) |
| Routers montados | ✅ | `main.py:109-134` |

Campos ya existentes útiles para lo nuevo (no hay que crearlos):
- `User.es_becado` → `backend/app/models/users.py:22` (booleano, `default=False`).
- `Asistencia.es_becado` (snapshot) → `asistencia.py:28`.
- `Asistencia.motivo` (justificación / motivo de ausencia) → `asistencia.py:29`.
- `Asistencia.presente` → `asistencia.py:27`.
- Endpoint de historial del alumno → `GET /alumno/mi-asistencia` (`alumno_router.py:193`).

---

## 2. Hallazgos / inconsistencias a tener en cuenta (no rompen el flujo)

1. **El horario NO se valida al marcar asistencia.** El QR solo valida oferta activa,
   inscripción y no-duplicado del día (+ TTL del token). No compara contra `Horario`.
   → Aceptable para un semestre real; se deja documentado, no como bug.
2. **La inscripción solo se valida en el flujo QR.** Los endpoints manuales
   (`POST /asistencias/`, `/lote`, `/profesor/marcar`) aceptan cualquier `alumno_id`.
   → Con 8 alumnos es de bajo riesgo, pero conviene usar un único método de carga.
3. Incoherencias menores (no bloquean): `Inscripcion.alumno_id` nullable y sin UNIQUE en BD
   (`inscripcion.py:13`); campo residual `Materia.horario` (`materia.py:20`).

---

## 3. Tecnología a usar (cambios por capa)

Estilo ya usado en el repo:
- **Backend**: FastAPI + SQLAlchemy. Endpoints en `backend/app/routers/`, schemas en
  `backend/app/schemas/`, modelos en `backend/app/models/`.
- **Frontend**: servicios delgados en `frontend/src/services/`, páginas en `frontend/src/pages/`
  que llaman al cliente central `frontend/src/lib/api.ts` (métodos get/post/put/patch/delete).
- **Rol**: control por `require_role(...)` en backend y `RutaProtegida` + `getMenuPorRol` en frontend.
- **Mobile**: Expo/React Native; cliente Axios en `mobile/services/api.ts` (Bearer token + refresh).

---

## 4. 🎯 Recomendación para el semestre (Informática — 3° año, 6° semestre, 8 alumnos, 5 materias)

### Mantener ACTIVO (lo que SÍ usás)

**Admin (configuración inicial del ciclo):**
- `Usuarios.tsx` (`/usuarios`) → crear las 8 cuentas de alumnos + 5 profesores + admins.
- `GestionAsignaciones.tsx` (`/gestion-asignaciones`) → crear las 5 materias, asignar profesor y activar la oferta.
- `Inscripciones.tsx` (`/inscripciones`) → matricular a los 8 alumnos en las 5 materias.
- Carga de horarios (crítico para el plan: `horarios_router.py`).

**Profesor (uso diario):**
- `Asistencia.tsx` (`/asistencia`, vista profesor) → generar QR + marcar/toggle presente.
- `Dashboard.tsx` y `MisMaterias.tsx`.
- Lógica backend completa en `asistencias_router.py` (lote, marcar, toggle, resumen).

**Alumno (uso diario):**
- `AsistenciaScan.tsx` (`/asistencia/scan`) → escanear QR.
- `Asistencia.tsx` (vista alumno) + `Dashboard.tsx` + `Boleta/`.
- Backend: `/alumno/mi-asistencia`, `/alumno/mis-materias`, `/asistencias/qr/verificar`.

### Comentar / desactivar (NO hace falta para 8 alumnos — opcional y útil para no recargar)

Esto es lo que podés comentar en `main.py` (router) y en el menú de `Layout.tsx`, sin eliminar código:

| Módulo | Por qué desactivarlo |
|---|---|
| Finanzas + MisCuotas (Stripe) | Infraestructura de pagos; innecesario para un curso. |
| Becas | Gestión de becas institucional. |
| Pasantias | Vinculación laboral; no aplica a 6° semestre general. |
| Graduacion | Solo para egreso; no aplica. |
| Equivalencias | Trámite de reconocimiento de materias. |
| Tramites | Gestión administrativa de solicitudes. |
| Foro / Apuntes (Biblioteca) | Colaboración; opcional. |
| Notifications (VAPID push) | Requiere push service; opcional. |
| Reportes globales + Estadisticas | Analítica institucional de 4000+ alumnos; con 8 alumnos el Dashboard cubre lo esencial. |
| Expediente / PPA | Solo si no necesitás promedios acumulados por carrera. |

**Mantené siempre activos**: auth, users, materias/ofertas, inscripciones, horarios, asistencias,
alumno, profesor, boleta, dashboard. Son lo mínimo para que corra el plan del curso.

---

## 5. Funcionalidades nuevas

### 5.A — Distinción provisional: Becado / No becado

**Objetivo**: que el admin pueda marcar a un alumno como becado (o revertir) de forma
**provisoria**, hasta tanto se cargue el dato real desde la institución. Es un flag por alumno.

**Estado del código**: `User.es_becado` ya existe y el admin ya puede editarlo.

Detalle:
- **Backend**
  - El campo `es_becado` debe poder editarse **solo por admin**. Ya está en la lista de campos
    prohibidos para no-admin (`users_router.py:244`).
  - Verificar que `PATCH /users/{id}` acepte `es_becado` cuando quien edita es admin
    (`users_router.py:224`). Si no lo acepta hoy, exponerlo en el schema de actualización.
  - Al registrar asistencia se toma una **snapshot** del flag (`asistencias_router.py:196`),
    así el "estado en esa fecha" queda histórico aunque luego cambie el flag. **Mantener esto.**
- **Frontend**
  - En `Usuarios.tsx` (vista admin) agregar un **toggle/switch "Becado"** por alumno que llame
    `actualizarUsuario(id, { es_becado })`.
  - Mostrar una insignia "Becado" en la lista (reutilizar `StatusBadge`/`RoleBadge`).
- **Nota institucional**: puede agregarse un flag `beca_provisoria: bool` o una columna de
  comentario en `User` para saber que el dato es provisional y aún resta confirmar con la
  institución. Se deja a criterio; mínimo viable = solo el booleano `es_becado`.

---

### 5.B — Lista de asistencia del profesor (presente / ausente / con justificativo)

**Objetivo**: en la pantalla de asistencia el profesor ve la **lista de alumnos** de la materia
(de la inscripción), y por cada uno puede marcar:
- **Presente** (escaneo QR o manual).
- **Ausente** y si tiene o no **justificativo** (motivo).

**Estado del código**: los endpoints `POST /asistencias/profesor/marcar`
(`asistencias_router.py:855`) y `POST /asistencias/lote` ya permiten marcar presente/ausente y
guardar `motivo`. Falta vincular la **lista a la inscripción** y exponer el **justificativo**
de forma explícita en la UI.

Detalle:
- **Backend**
  - Asegurar que `GET /asistencias/profesor/alumnos?materia_id=&fecha=`
    (`asistencias_router.py:706`) devuelva **solo alumnos inscriptos** en la oferta activa
    (hoy lista por oferta activa; validar que no meta no-inscriptos). Agregar a la respuesta:
    `es_becado` y `justificado` (derivado de `Asistencia.motivo`).
  - Mantener `motivo` como columna de justificación en `Asistencia` (`asistencia.py:29`).
  - Si se quiere registrar **ausente con recibo**, agregar campo opcional
    `tiene_justificativo: bool` a `Asistencia` (nueva columna nullable) o reusar `motivo`.
    Recomendado: **reusar `motivo`** (el texto) + un `presente=false` para ausencia con justificativo.
- **Frontend**
  - En `Asistencia.tsx` (vista profesor) la tabla actual ya lista alumnos + botones de marcar.
  - Añadir, por fila:
    - Estado visual: **Presente / Ausente**. Si ausente, un control para
      **"¿Tiene justificativo?"** (sí/no) que guarda `motivo`/`tiene_justificativo`.
    - Cuando se establece "Ausente", persistir con `POST /asistencias/profesor/marcar`
      pasando `presente=false` y el motivo/justificativo.
- **Al inicio de la clase**: al generar el QR (`GET /asistencias/qr/{materia_id}`) la lista del
  profesor queda en pantalla para ir verificando quién se presenta y marcando a los que no.

---

### 5.C — Historial por mes (días en que asistió cada alumno)

**Objetivo**: el alumno (y el profesor si corresponde) ve un **historial mensual**: por cada mes,
la lista de días (fechas) con su estado presente/ausente/justificado.

**Estado del código**: `GET /alumno/mi-asistencia` (`alumno_router.py:193`) agrega por materia y
período, pero **no agrupa por mes**.

Detalle:
- **Backend**
  - Extender el endpoint `/alumno/mi-asistencia` (o agregar `/alumno/mi-asistencia/mensual`)
    para agrupar por `año-mes`: `{"anio": 2026, "mes": 8, "asistencias": [ {fecha, presente, motivo}, ... ]}`.
  - Incluir en cada fila `es_becado` (snapshot de esa fecha) y `justificado` (`motivo != null`).
  - Opcional: sumario por mes (presentes %, ausentes, justificados).
- **Frontend**
  - En `AsistenciaAlumnoPanel.tsx` (`frontend/src/components/`) agregar una vista
    **"Historial / Mes"**: selector de mes y listado de días, con un indicador
    (✓ presente / ✗ ausente / J justificado). Mantener el resumen por materia ya existente.

---

### 5.D — Corrección de errores con autorización del Admin

**Objetivo**: si el profesor marcó mal (ej. presente a quien faltó), el cambio en un registro
debe **pedir autorización al admin**, no corregirlo el profesor directamente.

**Estado del código**: HOY los endpoints `PUT /asistencias/{id}`, `DELETE /asistencias/{id}`,
`PUT /asistencias/profesor/toggle/{id}` y `POST /asistencias/profesor/marcar` están abiertos a
**admin y profesor titular** (`asistencias_router.py:260,298,827,855`). Esto contradice el requisito.

Detalle (cambio controlado):
- **Backend**
  - **Restringir la modificación/borrado a solo admin.**
    - `PUT /asistencias/{asistencia_id}` y `DELETE /asistencias/{asistencia_id}`:
      exigir `require_role("admin")` (hoy permiten al profesor titular).
    - `PUT /asistencias/profesor/toggle/{id}` y `POST /asistencias/profesor/marcar`:
      el profesor puede **crear** el registro del día, pero una vez creado, un **cambio posterior**
      (edición de ese mismo registro ya existente) debe requerir admin.
  - Implementar una **solicitud de corrección** (opcional, más completo):
    - Nueva entidad `SolicitudCorreccionAsistencia` (id, asistencia_id, profesor_id, cambio_propuesto,
      estado=pendiente/aprobada/rechazada, fecha_solicitud).
    - `POST /asistencias/solicitudes-correccion` (profesor) → crea la solicitud.
    - `GET /asistencias/solicitudes-correccion` (admin) → lista pendientes.
    - `PUT /asistencias/solicitudes-correccion/{id}/resolver` (admin) → aprueba y aplica el cambio
      (modifica `presente`) o lo rechaza.
- **Frontend**
  - Vista **profesor**: cuando el registro ya existe, mostrar botón **"Solicitar corrección"**
    en vez de permitir el toggle directo.
  - Vista **admin** (`Usuarios` o nueva sección o `Reportes`): listado de solicitudes pendientes
    con acción Aprobar/Rechazar.
  - Como variante mínima inmediata (sin entidad nueva): simplemente el **profesor ya no puede
    editar/borrar** registros; solo el admin edita desde `/asistencias`.

---

## 6. Cambios por archivo (resumen de toque)

| Capa | Archivo | Cambio |
|---|---|---|
| Backend model | `models/users.py` | (opcional) comentario `beca_provisoria` / columna `beca_provisoria` |
| Backend model | `models/asistencia.py` | (opcional) `tiene_justificativo` o reusar `motivo` |
| Backend router | `routers/asistencias_router.py` | validar inscripción en carga manual; restringir edición/borrado a admin; (opcional) endpoints de solicitud de corrección; exponer `es_becado`/`justificado` en lista de alumnos |
| Backend router | `routers/alumno_router.py` | agrupar `/mi-asistencia` por mes (o nuevo endpoint mensual) |
| Backend schema | `schemas/asistencia.py`, `schemas/user_schema.py` | exponer `es_becado` / `justificado` / solicitud de corrección |
| Frontend leaflet | `pages/Usuarios.tsx` | toggle "Becado" por alumno |
| Frontend | `components/AsistenciaAlumnoPanel.tsx` | historial por mes |
| Frontend | `pages/Asistencia.tsx` (vista profesor) | lista con presente/ausente/justificativo; botón "Solicitar corrección" |
| Frontend | sección admin | aprobar/rechazar solicitudes de corrección |
| Frontend service | `usersService.ts` | soporte `es_becado` en actualización |

---

## 7. Endpoints nuevos/modificados propuestos

| Método | Ruta | Rol | Uso |
|---|---|---|---|
| GET | `/asistencias/menu/{materia_id}` (o ajustar `/profesor/alumnos`) | admin/profesor | Lista de alumnos inscriptos + `es_becado` + `justificado` |
| POST | `/asistencias/profesor/marcar` (mantener) | admin/profesor | Marcar presente/ausente + motivo (solo crear el día) |
| PUT/DELETE | `/asistencias/{id}` | **solo admin** | Editar/borrar registro (corrección) |
| PUT | `/asistencias/profesor/toggle/{id}` | **solo admin** | Alternar presente/ausente en corrección |
| GET | `/alumno/mi-asistencia/mensual` (nuevo) | alumno | Historial agrupado por año-mes |
| POST | `/asistencias/solicitudes-correccion` (opcional) | profesor | Crear solicitud de corrección |
| GET | `/asistencias/solicitudes-correccion` (opcional) | admin | Listar solicitudes |
| PUT | `/asistencias/solicitudes-correccion/{id}/resolver` (opcional) | admin | Aprobar/rechazar y aplicar |

---



## 8. 🚀 DESPLIEGUE — Producción aparte de la demo (dividido por fases)

> **Objetivo**: tener UNA producción separada de la demo, con su propia base de datos,
> backend y frontend, y poner en uso la **app móvil** para el alumno (escaneo QR).
>
> **Principio clave**: la demo actual usa `render.yaml` (`.onrender.com`),
> `frontend/vercel.json` (`uca-v2-backend.onrender.com`), `backend/.env` (Neon) y
> `mobile/app.json` (`extra.apiBase`). Para **no tocar la demo** se crea un **entorno paralelo**
> con nombres y credenciales propias.

### Fase 8.1 — Separación del repositorio (elegir UNA opción)

| Opción | Cómo | Cuándo |
|---|---|---|
| **A. Branch de producción** (recomendado) | Crear una rama `prod-semestre` (o `main` si vas a publicar) donde cambias solo configs de despliegue. | Si mantenés un solo repo con demo y producción. |
| **B. Fork/Repo separado** | Clonar/copiar el repo a uno nuevo (`git clone` + cambiar `origin`), o `gh repo create`. | Si querés historial y CI totalmente independientes. |
| **C. Export dir / archivo** | Copiar los directorios `backend/`, `frontend/`, `mobile/` a una carpeta nueva. | Si no usás git para publicar. |

> Los **cambios funcionales** (asistencia, alumno, etc.) están en las secciones 5–7;
> el despliegue **NO modifica lógica**, solo configuración.

### Fase 8.2 — Base de datos (PostgreSQL) separada

1. En **Neon** (o proveedor) crear un proyecto **nuevo** (distinto del de la demo).
2. Anotar la connection string nueva:
   `postgresql+psycopg2://user:pass@<host>/<db>?sslmode=require`
3. Configurar el compute en **Auto-suspend: Never** (evita que el backend no conecte).
4. **No reutilizar** `DATABASE_URL` de la demo en ningún env de producción.

> Migraciones: `render.yaml` ya ejecuta `alembic upgrade head` en el build (`render.yaml:7`).
> En local/VPS: `cd backend && alembic upgrade head`.

### Fase 8.3 — Backend desplegado aparte

**Opción 3A — PaaS (Render)** (recomendada):
Nuevo servicio web copiando `render.yaml` con **nombres/valores distintos**:
- `name: uca-v2-backend-<semestre>` (¡no usar `uca-v2-backend` de la demo!).
- `rootDir: backend`, `buildCommand` igual: `pip install -r requeriments.txt && alembic upgrade head`.
- En Render, `envVars` con valores propios:
  - `DATABASE_URL` → base nueva (Fase 8.2).
  - `JWT_SECRET` → **nuevo** (string largo random).
  - `CORS_ORIGINS` → `https://<tu-frontend>.vercel.app` + `https://<frontend-produccion>.vercel.app`.
  - `COOKIE_SECURE=true`, `CSRF_ENABLED=true`, `RATE_LIMIT_ENABLED=true`.
  - Mail, R2, Stripe, Guarani, VAPID: **solo los que vayas a usar**; para **asistencia pura
    no hace falta Stripe/Guarani** (dejarlos vacíos). R2 solo si subís fotos.
  - Anotar la nueva URL pública del backend (ej. `https://uca-v2-backend-semestre.onrender.com`).

**Opción 3B — Docker en VPS** (si querés control total):
`backend/docker-compose.yml` trae solo Postgres 16; ampliarlo con un servicio web uvicorn
y poner detrás de un proxy (nginx/traefik) con TLS.
```bash
cd backend
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Fase 8.4 — Frontend web desplegado aparte

El `vercel.json` actual reescribe `/api/*` a la demo (`vercel.json:6`). Para producción, **cambiar el destino**:
1. Copiar `frontend/vercel.json` con el backend nuevo:
   ```json
   { "source": "/api/(.*)", "destination": "https://uca-v2-backend-semestre.onrender.com/$1" }
   ```
2. Insertar en Vercel un proyecto **nuevo** (distinto de la demo): `framework: vite`,
   build `npm run build`, output `dist`.
3. En `CORS_ORIGINS` del backend incluir el dominio del **nuevo** frontend de Vercel.
4. Headers/seguridad del `vercel.json` quedan iguales. **Ojo**: `connect-src 'self'` en el CSP —
   como el frontend reenvía `/api` a su propio dominio (rewrite), no hay problema; si llamaras
   directo a otro origen habría que ajustar CSP.

### Fase 8.5 — App móvil acoplada al backend de producción

La app ya tiene el escáner QR (`mobile/services/asistenciaService.ts` → `POST /asistencias/qr/verificar`),
la cámara habilitada (`app.json` → `expo-camera`, permiso `CAMERA`) y login con refresh. Solo hay que **apuntar al backend nuevo**.

**Dónde se configura la URL** (`mobile/config.ts:24-27`, `mobile/services/api.ts:23-27`):
1. `process.env.EXPO_PUBLIC_API_BASE` (build-time) — **prioridad máxima**.
2. `app.json` → `extra.apiBase`.
3. Fallback `http://localhost:8000`.

**Pasos:**
1. `mobile/app.json` → `extra.apiBase` = backend de producción:
   ```json
   "extra": { "apiBase": "https://uca-v2-backend-semestre.onrender.com" }
   ```
   (o definir `EXPO_PUBLIC_API_BASE` en el build para no tocar `app.json`).
2. **CORS**: con `withCredentials: true` y cookies httpOnly, si se consulta desde Expo **web**,
   `CORS_ORIGINS` debe incluir esos orígenes; para **APK instalada** no aplica origin (token en
   `Authorization: Bearer`).
3. Generar build con EAS (`mobile/eas.json`):
   ```bash
   cd mobile
   npx eas build --platform android --profile preview   # APK instalable
   # o producción:
   npx eas build --platform android --profile production
   ```
   Descargar el APK e instalar en los dispositivos de los 8 alumnos.

**NOTA escáner en físico:**
- El QR del profesor (`GET /asistencias/qr/{materia_id}`) devuelve `scan_url`
  (`asistencias_router.py:817`) = `/asistencia/scan?token=...` (para la **web**).
- En la **app móvil** el alumno escanea el **token** (`qr_token`) y lo envía a
  `POST /asistencias/qr/verificar` → funciona igual con el backend de producción.
- El backend debe quedar en **HTTPS público** para que el teléfono lo alcance desde cualquier red;
  un `http://192.168.x.x` solo funciona en la LAN local.

### Resumen de qué cambiar (producción aparte)

| Componente | Archivo | Cambio |
|---|---|---|
| Repo del caso | — | Branch `prod-semestre` o repo/fork nuevo (deja intacta la demo). |
| Base de datos | panel Neon | Nueva DB + connection string; `Auto-suspend: Never`. |
| Backend | `render.yaml` / Render panel | Nuevo servicio `uca-v2-backend-semestre` con `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS` propios. |
| Frontend | `frontend/vercel.json` | Rewrite `/api/*` → backend **nuevo**. |
| Mobile | `mobile/app.json` `extra.apiBase` | Apuntar al backend de producción. |
| Mobile | `mobile/eas.json` | Build APK (`preview`/`production`). |
| Accesos | — | Cargar usuarios (8 alumnos, 5 profes, admin) y horarios en la base nueva antes de usar. |

---

## 9. ✅ Fases de ejecución (para aplicar todo en orden)

> Este cronograma **divide** la implementación y el despliegue en pasos aplicables y verificables.

- **FASE A — Configurar usuario y datos (web).** Crear base nueva + deploy backend + frontend.
  Cargar 8 alumnos, 5 profesores, 5 materias/ofertas, inscripciones y **horarios**. Probar los 3 roles.
- **FASE B — Becado provisorio (5.A).** Toggle "Becado" en `Usuarios.tsx` + verificar `PATCH /users/{id}`.
- **FASE C — Lista del profesor (5.B).** Lista con presente/ausente/justificativo en `Asistencia.tsx`
  (vista profesor) + validar inscripción + exponer `es_becado`/`justificado`.
- **FASE D — Historial mensual (5.C).** Agrupar `/mi-asistencia` por mes + vista en `AsistenciaAlumnoPanel.tsx`.
- **FASE E — Corrección con admin (5.D).** Restringir edición/borrado a solo admin (variante mínima);
  opcional añadir solicitudes de corrección.
- **FASE F — App móvil (8.5).** Apuntar `extra.apiBase` al backend de producción, generar APK con EAS,
  instalar y probar el escaneo QR de punta a punta en un teléfono de prueba.

### Checklist de puesta en marcha (web + mobile)

1. ✅ Crear la base de datos nueva y probar conexión desde local (`alembic upgrade head`).
2. ✅ Deploy del backend nuevo y verificar `https://<backend>/docs` responde.
3. ✅ Deploy del frontend nuevo y probar `/login` (admin) contra el backend nuevo.
4. ✅ Cargar con admin: 8 alumnos + 5 profesores (`Usuarios`), 5 materias + ofertas (`Asignaciones`),
   matricular (`Inscripciones`), **horarios** (crítico).
5. ✅ Probar los 3 roles: admin (config) + profesor (QR + lista + marcar) + alumno (escanear).
6. ✅ Generar APK mobile apuntando al backend nuevo e instalar en 1 teléfono de prueba.
7. ✅ Probar escaneo QR de punta a punta (profesor genera → alumno escanea → se guarda).
8. ✅ Verificar historial (por mes) y flujo de correcciones desde admin (FASES B–E).

---

## 10. Qué se mantiene activo vs. qué se comenta (modo mínimo)

**Mantener activo** (mínimo imprescindible para el semestre):
auth, users, materias/ofertas, inscripciones, horarios, asistencias, alumno, profesor,
boleta, dashboard. Páginas: `Usuarios`, `GestionAsignaciones`, `Inscripciones`,
`Asistencia`, `AsistenciaScan`, `Dashboard`, `MisMaterias`, `Boleta`.

**Comentar/desactivar en `main.py` y en el menú de `Layout.tsx`** (sin eliminar código):
finanzas/cuotas, becas, pasantías, graduación, equivalencias, trámites, foro/apuntes
(biblioteca), notificaciones push (VAPID), reportes globales y estadísticas, expediente/PPA.
(Detalle y razones en la sección 4.)

---

## 11. Notas / riesgos del despliegue y pendientes

- **Flujo cookie+CSRF vs. móvil**: la app móvil envía `Authorization: Bearer` + refresh propio
  (`mobile/services/api.ts`), así que no depende de las cookies del navegador. Asegurarse de que
  `CORS_ORIGINS` y `COOKIE_SECURE` sean coherentes si también sirves la web desde el mismo backend.
- **HTTPS obligatorio** para que los teléfonos alcancen el backend en producción (Render/Vercel lo
  dan; `http://192.168.x.x` solo funciona en la LAN y **no** en redes móviles).
- **Claves nuevas**: jamás reutilizar `JWT_SECRET`, `DATABASE_URL` ni credenciales R2/Stripe/Guarani
  de la demo en la nueva producción.
- **WeasyPrint** (boleta PDF): en Render el runtime nativo de Python no corre `apt-get`; si necesitás
  el PDF de boleta hay un riesgo documentado (`INSTALACION.md:72-74`) — para **solo asistencia**
  no hace falta WeasyPrint.
- **Pendientes de funcionalidades**: definir si el justificativo se guarda como **texto** (`motivo`)
  o como **bool** (recomendado: texto en `motivo`); si el flag de becado provisorio lleva marca de
  "provisorio" o solo el booleano; y el UX de "Solicitar corrección" (flujo completo vs. solo-admin-edita).