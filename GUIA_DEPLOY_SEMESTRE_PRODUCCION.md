# Guía de Despliegue — Producción Aparte (Web + App Móvil + Asistencia)

> **Objetivo**: tener UNA producción separada de la demo, con su propia base de datos,
> backend y frontend, y poner en uso la **app móvil** para que el alumno gestione la asistencia
> (escaneo QR). Complementa [`PLAN_SEMESTRE_INFORMATICA.md`](PLAN_SEMESTRE_INFORMATICA.md).
>
> **Principio clave**: la demo actual usa estos manifiestos — `render.yaml` (`.onrender.com`),
> `frontend/vercel.json` (`uca-v2-backend.onrender.com`), `backend/.env` (Neon) y
> `mobile/app.json` (`extra.apiBase`). Para **no tocar la demo**, se crea un **entorno paralelo**
> (repo o branch separado) con nombres y credenciales propias.

---

## 1. Estrategia de separación del repositorio

Elegí una de estas (la demo queda intacta siempre):

| Opción | Cómo | Cuándo |
|---|---|---|
| **A. Branch de producción** (recomendado) | Crear una rama `prod-semestre` (o `main` si querés publicar) donde cambias solo configs de despliegue. | Si mantenés un solo repo con la demo y la producción. |
| **B. Fork/Repo separado** | Copiar/clonar el repo a un repositorio nuevo (`git clone` + cambiar `origin`), o `gh repo create`. | Si querés historial y CI totalmente independientes. |
| **C. Export dir / archivo** | Copiar los directorios `backend/`, `frontend/`, `mobile/` a una carpeta nueva. | Si no usás git para publicar. |

> Los **cambios funcionales** (asistencia, alumno, etc.) ya están planeados en
> `PLAN_SEMESTRE_INFORMATICA.md`; el despliegue NO modifica lógica, solo configuración.

---

## 2. Base de datos (PostgreSQL) — separada de la demo

La demo usa su propia base Neon. Para producción hay que crear **OTRA**.

1. En **Neon** (o el proveedor elegido) crear un proyecto nuevo (distinto del de la demo).
2. Anotar la connection string **nueva**:
   `postgresql+psycopg2://user:pass@<host>/<db>?sslmode=require`
3. Configurar el compute en **Auto-suspend: Never** (evita que el backend no conecte por inactividad).
4. **No reutilizar** `DATABASE_URL` de la demo en ningún env de producción.

> Migraciones: el `render.yaml` ya ejecuta `alembic upgrade head` en el build
> (`render.yaml:7`), así que el esquema se crea solo. En local/VPS correr
> `cd backend && alembic upgrade head`.

---

## 3. Backend — despliegue separado

### Opción 3A: PaaS (Render), recomenda
Crear un nuevo servicio web copiando `render.yaml` **con nombres/valores distintos**:
- `name: uca-v2-backend-<semestre>` (¡no usar `uca-v2-backend` de la demo!).
- `rootDir: backend`, `buildCommand` igual: `pip install -r requeriments.txt && alembic upgrade head`.
- En el panel de Render, configurar `envVars` con los **valores propios**:
  - `DATABASE_URL` → la base nueva del punto 2.
  - `JWT_SECRET` → **nuevo** (string largo random).
  - `CORS_ORIGINS` → `https://<tu-frontend>.vercel.app` (o el dominio real) + `https://<frontend-produccion>.vercel.app`.
  - `COOKIE_SECURE=true`, `CSRF_ENABLED=true`, `RATE_LIMIT_ENABLED=true`.
  - Mail, R2, Stripe, Guarani, VAPID: solo los que vayas a usar. **Para asistencia pura
    no hace falta Stripe/Guarani** (se pueden dejar vacíos). R2 solo si subís fotos.
  - Anotar la nueva URL pública del backend (ej. `https://uca-v2-backend-semestre.onrender.com`).

### Opción 3B: Docker en VPS (Recomendado si querés el control total)
El repo tiene `backend/docker-compose.yml` (Postgres 16). Se puede:
- Levantar Postgres + backend en el VPS con un `docker-compose.yml` ampliado (backing service el backend
  no está en el actual, solo la DB — habría que agregar un servicio web para la app uvicorn).
- Colocar detrás de un proxy (nginx/traefik) con TLS.

```bash
cd backend
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 4. Frontend web — despliegue separado

El `vercel.json` actual reescribe `/api/*` a la demo (`vercel.json:6`). Para producción, **cambia ese destino**:

1. Copiar `frontend/vercel.json` y poner el nuevo backend:
   ```json
   { "source": "/api/(.*)", "destination": "https://uca-v2-backend-semestre.onrender.com/$1" }
   ```
2. Insertar en Vercel un proyecto nuevo (distinto del de la demo) con `framework: vite`,
   build `npm run build`, output `dist`.
3. En `CORS_ORIGINS` del backend tienes que incluir el dominio del **nuevo** frontend de Vercel.
4. **Headers/seguridad** del `vercel.json` quedan iguales. **Ojo**: `connect-src 'self'` en el CSP —
   como el frontend reenvía `/api` a su propio dominio (rewrite), no hay problema. Si llamaras directo
   a otro origen habría que ajustar CSP.

---

## 5. App móvil — acoplar la app del alumno al backend de producción

La app móvil ya tiene el escáner QR para asistencia (`mobile/services/asistenciaService.ts` →
`POST /asistencias/qr/verificar`), la cámara habilitada (`app.json` → `expo-camera`,
permiso `CAMERA` en Android) y el flujo de login con refresh. Solo hay que **apuntar al backend nuevo**.

### Dónde se configura la URL del backend
Se resuelve así (`mobile/config.ts:24-27`, `mobile/services/api.ts:23-27`):
1. `process.env.EXPO_PUBLIC_API_BASE` (build-time) — **prioridad máxima**.
2. `app.json` → `extra.apiBase`.
3. Fallback `http://localhost:8000`.

### Pasos
1. Editar `mobile/app.json` → `extra.apiBase` al **backend de producción**:
   ```json
   "extra": { "apiBase": "https://uca-v2-backend-semestre.onrender.com" }
   ```
   O bien definir `EXPO_PUBLIC_API_BASE` en el build para no tocar `app.json`.
2. **Importante — CORS**: el backend cuando sirve a la app instalada no usa navegador, pero con
   `withCredentials: true` y cookies httpOnly, **si** usas el flujo de cookie+CSRF el `CORS_ORIGINS`
   debe incluir los orígenes de la app si se consulta desde Expo web. Para APK instalada (sin
   navegador) no aplica origin; el token va en header `Authorization: Bearer`.
3. Generar la build con EAS (`mobile/eas.json`):
   ```bash
   cd mobile
   npx eas build --platform android --profile preview   # APK instalable
   # o producción:
   npx eas build --platform android --profile production
   ```
   Descargar el APK e instalar en los dispositivos de los 8 alumnos.

### NOTA para escáner en dispositivo físico
- El QR generado por el profesor (`GET /asistencias/qr/{materia_id}`) devuelve `scan_url`
  (`asistencias_router.py:817`) = `/asistencia/scan?token=...` (para la **web**).
- En la **app móvil** el alumno escanea el **token** (`qr_token`) desde su cámara y lo envía a
  `POST /asistencias/qr/verificar` → funciona igual de bien con el backend de producción.
- El backend debe quedar expuesto en HTTPS público (Render/Vercel lo dan) para que el teléfono
  pueda alcanzarlo desde cualquier red. Con `http://192.168.x.x` solo funciona en la LAN local.

---

## 6. Resumen de qué cambiar para separar la nueva producción

| Componente | Archivo | Cambio |
|---|---|---|
| Repo del caso | — | Branch `prod-semestre` o repo/fork nuevo (deja intacta la demo). |
| Base de datos | panel Neon | Nueva DB + connection string; `Auto-suspend: Never`. |
| Backend | `render.yaml` / Render panel | Nuevo servicio `uca-v2-backend-semestre` con `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS` propios. |
| Frontend | `frontend/vercel.json` | Rewrite `/api/*` → backend **nuevo**. |
| Mobile | `mobile/app.json` `extra.apiBase` | Apuntar al backend de producción. |
| Mobile | `mobile/eas.json` | Build APK (`preview`/`production`). |
| Accessos | — | Cargar en la base nueva los usuarios (8 alumnos, 5 profes, admin) y configurar horarios antes de usarlo. |

---

## 7. Checklist de puesta en marcha (web + mobile)

1. ✅ Crear la base de datos nueva y probar conexión desde local (`alembic upgrade head`).
2. ✅ Deploy del backend nuevo y verificar `https://<backend>/docs` (Swagger) responde.
3. ✅ Deploy del frontend nuevo y probar `/login` (admin) contra el backend nuevo.
4. ✅ Cargar con admin: **8 alumnos + 5 profesores** (`Usuarios`), **5 materias + ofertas**
   (`Asignaciones`), **matricular** (`Inscripciones`), **horarios** (crítico).
5. ✅ Probar los 3 roles: admin (configuración) + profesor (QR + lista + marcar) + alumno (escanear).
6. ✅ Generar APK mobile apuntando al backend nuevo e instalar en 1 teléfono de prueba.
7. ✅ Probar el escaneo QR de punta a punta (profesor genera → alumno escanea → se guarda).
8. ✅ Verificar el historial (por mes) y el flujo de correcciones desde admin (ver PLAN_SEMESTRE).

---

## 8. Notas / riesgos

- **Flujo de cookie+CSRF vs. móvil**: la app móvil envía `Authorization: Bearer` + manejo propio de
  refresh (`mobile/services/api.ts`), así que no depende de las cookies del navegador. Asegurarse de
  que `CORS_ORIGINS` y `COOKIE_SECURE` sean coherentes si también sirves la web desde el mismo backend.
- **HTTPS obligatorio** para que los teléfonos alcancen el backend en producción (Render/Vercel lo dan;
  un `http://192.168.x.x` solo funciona en la LAN y **no** en redes móviles).
- **Claves nuevas**: jamás reutilizar `JWT_SECRET`, `DATABASE_URL` ni credenciales R2/Stripe/Guarani
  de la demo en la nueva producción.
- **WeasyPrint** (boleta PDF): en Render el runtime nativo de Python no corre `apt-get`; si necesitás
  el PDF de boleta, hay un riesgo documentado (`INSTALACION.md:72-74`) — para **solo asistencia**
  no hace falta WeasyPrint.