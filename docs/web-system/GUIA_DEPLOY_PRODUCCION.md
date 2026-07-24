# Guía de Deploy a Producción — Render (backend) + Vercel (frontend)

> **Qué es esto:** UCA V2 es un sistema de gestión académica (backend FastAPI + PostgreSQL,
> frontend React + Vite) para universidades paraguayas. Esta guía asume que quien la ejecuta no
> tuvo contexto previo del proyecto — si necesitás más contexto general antes de arrancar, el
> `README.md` de la raíz del repo es el punto de entrada.

> Estado al momento de escribir esto (2026-07-24): no hay cuentas creadas en Render ni Vercel,
> no hay dominio propio (se usan subdominios gratis), y no hay instancia de Neon Postgres de
> producción todavía (solo la de test, local, no trackeada en el repo). Primer deploy va sin
> credenciales reales de Stripe/guarani.app/VAPID salvo las VAPID que se generaron en este paso
> (ver sección 3) — el sistema degrada con gracia por diseño, así que el core debe funcionar igual.

## 0. Bug real encontrado y corregido en este paso

Antes de seguir: al generar las VAPID keys para esta guía se encontró que
`_generar_vapid_keys()` (`backend/app/services/notificaciones_push.py`) devolvía objetos crudos
de la librería `cryptography` en vez de strings — la versión de `py_vapid` instalada cambió su
API desde que se escribió ese código originalmente. Esto significa que **`GET
/notificaciones/vapid-public-key` crasheaba con 500** en cualquier deploy sin `VAPID_PUBLIC_KEY`
seteada — exactamente el estado del primer deploy. No era degradación con gracia real, a pesar de
estar documentado como tal. Corregido (serialización base64url correcta, verificada con roundtrip
`Vapid.from_string()`), con test de regresión en `backend/tests/test_notificaciones_push.py`
(no existía ningún test de este módulo antes). 282 tests backend siguen pasando.

Stripe y guarani.app sí degradan con gracia como estaba documentado — verificado en código real
(`finanzas_router.py::pago_online_init` atrapa `RuntimeError`/`StripeError` y responde 503/502 sin
crashear el proceso; `facturacion_electronica.py::emitir_factura` deja el comprobante en estado
`error`, reintentable, sin bloquear el pago).

---

## 1. Orden de creación de cuentas/infraestructura

1. **Neon** (base de datos) — primero, porque Render la necesita para arrancar.
2. **Render** (backend) — segundo, porque Vercel necesita saber la URL del backend.
3. **Vercel** (frontend) — último.

### 1.1 Neon — crear instancia de producción

No existe todavía. La única instancia referenciada en el repo es de test (`backend/.env.test`,
no trackeada en git). Pasos:

1. Ir a [neon.tech](https://neon.tech), crear cuenta si no existe.
2. Crear un proyecto nuevo (o un branch nuevo dentro del proyecto existente si ya hay uno de
   test/dev) — nombrarlo claramente `production` o similar para no confundirlo con test.
3. Copiar el connection string (`postgresql://...`) — es el valor de `DATABASE_URL` para Render.
4. **No hay registro propio para crear el primer admin** — `POST /auth/registro` solo activa
   cuentas *ya precreadas* por un admin (ver `docs/web-system/API_REFERENCE.md`), así que una DB
   nueva no tiene forma de arrancar sin al menos un usuario admin ya insertado. `scripts/seed_usuarios.py`
   es el único bootstrap disponible — corré ese script **una sola vez** contra la DB de producción
   después del primer deploy (sección 4 abajo tiene el comando exacto), y **rotá esas 3
   contraseñas inmediatamente después de confirmar que el login funciona** (son públicas, están en
   el repo). No correr `seed.py`/`seed_completo.py`/`seed_masivo.py` contra producción — esos sí
   generan datos de prueba masivos, pensados solo para desarrollo/demo.

Las migraciones de Alembic corren automáticamente en cada deploy de Render, **antes** de que el
servicio empiece a recibir tráfico (ver `buildCommand` en `render.yaml`: `pip install -r
requeriments.txt && alembic upgrade head` corre completo antes de que arranque `startCommand`) —
no hace falta correrlas a mano como paso separado, el orden ya garantiza que el schema existe
antes de que el backend sirva el primer request.

Si preferís verificar el schema *antes* de crear el servicio en Render (por ejemplo para confirmar
que la instancia de Neon quedó bien creada), podés correrlas a mano desde tu máquina:
```bash
cd backend
pip install -r requeriments.txt
DATABASE_URL="<connection string de Neon>" alembic upgrade head
```
Esto es opcional — el deploy de Render las corre igual. No se pudo verificar contra una instancia
Neon real en este entorno (sin Postgres local ni acceso a la cuenta del usuario) — la cadena de
migraciones sí se verificó estructuralmente sana (37 migraciones, un solo head, sin bifurcaciones)
en la auditoría del 2026-07-24 ([`AUDITORIA_2026-07-24.md`](../auditorias/AUDITORIA_2026-07-24.md)).

### 1.2 Render — backend

1. Ir a [render.com](https://render.com), crear cuenta si no existe.
2. **New → Blueprint**, conectar el repo de GitHub, seleccionar la rama (`push-final` o la que se
   decida como canónica), Render detecta `render.yaml` automáticamente.
3. Al crear el Blueprint, Render va a pedir valores para cada `envVar` con `sync: false` — pegar
   los de la sección 2 de esta guía.
4. El nombre del servicio queda fijo en `uca-v2-backend` (definido en `render.yaml`) → la URL será
   `https://uca-v2-backend.onrender.com`, que ya coincide con lo que `frontend/vercel.json` espera.
   Si ese nombre ya está tomado en Render, Render va a pedir uno alternativo — en ese caso hay que
   editar `frontend/vercel.json` (`destination`) para que apunte a la URL real antes de deployar
   el frontend.
5. Plan `free` (ya seteado en `render.yaml`) — nota: el free tier de Render se "duerme" tras 15 min
   de inactividad y tarda ~30-60s en responder el primer request tras despertar. Esperable en este
   primer deploy, no es un bug.
6. Deploy. Revisar logs — el build corre `pip install -r requeriments.txt && alembic upgrade head`
   automáticamente.

### 1.3 Vercel — frontend

1. Ir a [vercel.com](https://vercel.com), crear cuenta si no existe.
2. **New Project**, conectar el mismo repo.
3. **Root Directory**: `frontend` (configuración del dashboard de Vercel, no está en `vercel.json`
   — hay que setearla a mano al crear el proyecto).
4. Framework, build command y output directory ya quedan explícitos en `frontend/vercel.json`
   (`vite`, `npm run build`, `dist`) — Vercel los debería tomar automáticamente al detectar el
   archivo.
5. **No hace falta ninguna variable de entorno de build-time** — el frontend usa siempre rutas
   relativas (`/api/...`) y depende 100% del rewrite en `vercel.json` para llegar al backend en
   Render (mismo-origen, evita problemas de CORS/cookies `SameSite`). Verificado: cero usos de
   `import.meta.env` en todo `frontend/src`.
6. Deploy. La URL que asigne Vercel (`*.vercel.app`) es la que hay que setear como
   `CORS_ORIGINS` en Render (paso siguiente) — el orden real termina siendo: deployar Vercel una
   vez para obtener la URL, después volver a Render y actualizar `CORS_ORIGINS` con esa URL real,
   redeploy del backend.

---

## 2. Variables de entorno — checklist completo

### 2.1 Generadas en este paso — listas para copiar/pegar en Render

> **No están commiteadas en el repo.** El asistente se las mostró al usuario en el chat para que
> las guarde en un gestor de contraseñas o similar — no en texto plano en ningún otro lado.

- `VAPID_PUBLIC_KEY` — generada con la función real del proyecto (`_generar_vapid_keys()`, ya
  corregida — ver sección 0).
- `VAPID_PRIVATE_KEY` — idem.
- `JWT_SECRET` — 64 caracteres hex, generado con `secrets.token_hex(32)` (criptográficamente
  seguro), distinto al usado en desarrollo/test.

### 2.2 Con placeholder — el deploy funciona igual, features asociadas quedan degradadas

| Variable | Valor a usar | Qué queda sin funcionar |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_placeholder` | Pago online responde 503 ("Stripe no disponible") en vez de crashear. Cuota queda en estado `error`, retryable. |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_placeholder` | Igual que arriba (par de la clave anterior). |
| `STRIPE_WEBHOOK_SECRET` | `whsec_placeholder` | Sin verificación de firma de webhook — no importa porque sin `STRIPE_SECRET_KEY` real no va a llegar ningún webhook real tampoco. |
| `GUARANI_APP_API_KEY` | *(vacío)* | Facturación electrónica: comprobante queda en estado `error`, reintentable, **el pago en sí no se bloquea**. |
| `GUARANI_APP_PUNTO_EMISION` | *(vacío)* | Idem. |
| `GUARANI_APP_BASE_URL` | `https://api.guarani.app/v1` | Ya tiene default en `render.yaml`, no hace falta tocarlo. |

### 2.3 Dependen de infraestructura creada en el momento

| Variable | De dónde sale |
|---|---|
| `DATABASE_URL` | Connection string de la instancia Neon de producción (sección 1.1) |
| `CORS_ORIGINS` | URL real que asigne Vercel tras el primer deploy (sección 1.3) — hasta entonces, dejar temporalmente `http://localhost:5173` y actualizar después |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | Cuenta Gmail real de envío (app password, no la contraseña normal) — confirmar que es la cuenta de producción, no la de dev |
| `R2_ENDPOINT_URL` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` | Cuenta Cloudflare R2 — **no están en `render.yaml` todavía, agregarlas a mano en el dashboard de Render** (bloqueante conocido, ya documentado antes de esta auditoría: sin esto, subida de fotos/apuntes/comprobantes/informes de pasantía falla) |

### 2.4 Ya tienen valor fijo correcto en `render.yaml` — no tocar salvo necesidad real

`JWT_EXPIRES_MINUTES=480`, `COOKIE_SECURE=true`, `CSRF_ENABLED=true`, `RATE_LIMIT_ENABLED=true`
(las últimas dos agregadas en este paso — antes faltaban en `render.yaml`, quedaban sin setear en
Render y el backend caía al default `true` de todos modos por código, pero es mejor tenerlas
explícitas; contexto completo de por qué existen estos dos flags separados en
[`AUDITORIA_2026-07-24.md`](../auditorias/AUDITORIA_2026-07-24.md) hallazgo #3), `MAIL_PORT=587`,
`MAIL_SERVER=smtp.gmail.com`, `MAIL_STARTTLS=True`, `MAIL_SSL_TLS=False`, `USE_CREDENTIALS=True`,
`VALIDATE_CERTS=True`.

### 2.5 Vercel (frontend)

Ninguna. Ver sección 1.3 punto 5.

---

## 3. Qué va a funcionar y qué no en este primer deploy

**Va a funcionar (core, sin secretos de terceros):**
- Login/registro/logout, recuperación de contraseña con email real (si `MAIL_USERNAME`/`PASSWORD`
  están seteados).
- Materias, ofertas, inscripciones, correlatividades, cupos.
- Calificaciones (motor de puntos), asistencias (manual y QR), pensum/malla.
- Expediente, PPA, regularidad, boleta con sello digital.
- Trámites, pasantías, graduación, equivalencias, foro, calendario.
- Notificaciones push (VAPID ya generada y corregida en este paso).
- Financiero: cuotas y pagos manuales (efectivo/transferencia registrado por admin) — todo lo que
  no depende de Stripe.

**No va a funcionar (degradado a propósito, no es bug):**
- Pago online real con tarjeta (Stripe placeholder) — responde 503 claro, no crashea.
- Emisión de comprobante fiscal real vía guarani.app — comprobante queda en estado `error`,
  reintentable.
- Subida de fotos de perfil/apuntes/comprobantes/informes — **bloqueante real**, faltan las
  credenciales R2 (sección 2.3), sin esto esas features sí fallan al usarlas, no degradan solas.

---

## 4. Verificación post-deploy (smoke test mínimo)

Con el backend en Render y el frontend en Vercel ya desplegados:

1. **Bootstrap del primer admin** (una sola vez, ver sección 1.1 punto 4):
   ```bash
   cd backend
   DATABASE_URL="<connection string de Neon de producción>" python scripts/seed_usuarios.py
   ```
   Crea 3 usuarios: `admin@uca.edu.py` / `Admin1234!` (admin), `12345678` / `Alumno1234!` (alumno),
   `prof@uca.edu.py` / `Profesor1234!` (profesor).

2. **Login** — entrar a la URL de Vercel, loguearse con `admin@uca.edu.py` / `Admin1234!`.
   Confirma: JWT + CSRF funcionando, CORS bien configurado (si esto falla, ver sección 6).

3. **Flujo de notas** — loguearse como profesor (`prof@uca.edu.py`), entrar a una materia
   (necesita tener al menos una oferta/inscripción creada primero, vía admin), cargar una nota.
   Loguearse como alumno y confirmar que la nota aparece en Calificaciones/Boleta. Confirma: DB
   escribe y lee bien, motor de notas por puntos funcionando.

4. **Flujo de asistencia** — como profesor, registrar asistencia manual para el alumno de prueba.
   Como alumno, confirmar que aparece en su vista de asistencia. Confirma: el flujo académico core
   end-to-end funciona.

5. **Rotar las 3 contraseñas de bootstrap** (`Perfil → Cambiar contraseña` de cada usuario, o
   `PATCH /users/{id}` como admin) antes de dar acceso a usuarios reales — son públicas, están en
   este mismo repo.

No hace falta probar pagos online, facturación electrónica ni push reales en este smoke test — ver
sección 3, están degradados a propósito en este primer deploy.

## 5. Si algo falla — diagnóstico de los errores más probables

| Síntoma | Causa probable | Cómo confirmar / arreglar |
|---|---|---|
| Login falla con error de red / CORS en la consola del browser | `CORS_ORIGINS` en Render todavía apunta a `localhost` o a una URL de Vercel vieja | Confirmar la URL real del deploy de Vercel, actualizar `CORS_ORIGINS` en el dashboard de Render (Environment), redeploy del backend |
| Backend responde 500 en cualquier endpoint, logs de Render muestran error de conexión a DB | `DATABASE_URL` mal copiada, o la instancia de Neon no acepta conexiones (SSL/branch equivocado) | Revisar logs de build/deploy en Render — si `alembic upgrade head` falló ahí, el servicio ni llega a arrancar. Confirmar el connection string completo (incluye `?sslmode=require`) |
| Backend no arranca, log muestra error de `alembic` | Migraciones no corrieron o corrieron contra una DB vacía sin permisos de crear tablas | Revisar el log del build step en Render (corre antes del deploy) — el error específico de Alembic va a estar ahí, no en los logs de runtime |
| Login funciona pero cualquier POST/PUT/PATCH/DELETE devuelve 403 "CSRF token inválido" | Cookies bloqueadas (`COOKIE_SECURE=true` requiere HTTPS — si el rewrite de Vercel no está funcionando y el browser está pegándole directo a Render sin pasar por el proxy, las cookies `SameSite=Lax` no viajan) | Confirmar que las requests del frontend van a `/api/...` (mismo origen que Vercel), no directo a `*.onrender.com` |
| Frontend carga pero todas las páginas muestran error de fetch | El rewrite en `vercel.json` apunta a una URL de Render que no coincide con el nombre real del servicio | Revisar `frontend/vercel.json` → `destination` vs la URL real que Render asignó (sección 1.2 punto 4) |
| `GET /notificaciones/vapid-public-key` da 500 | Si esto pasa incluso con `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` seteadas correctamente, es una regresión del fix de la sección 0 — reportar, no es esperable | Confirmar que las env vars están bien pegadas (sin espacios/saltos de línea extra) antes de asumir que es un bug nuevo |
| Cualquier endpoint tarda 30-60s en la primera request tras un rato sin uso | Free tier de Render se duerme tras 15 min de inactividad | Esperado, no es un bug — ver sección 1.2 punto 5 |

---

## 6. Pendiente 100% del usuario (no automatizable)

- Comprar dominio propio (hoy se usa el subdominio gratis de cada plataforma).
- Configurar DNS del dominio cuando exista.
- Dar de alta cuenta real en Stripe (modo test primero, después activación real) y en guarani.app.
- Crear la cuenta de Cloudflare R2 y el bucket, si no existe ya una de otra sesión.
- Decidir la rama canónica de producción (el repo tiene varias ramas divergentes — deployar sin
  resolver esto arriesga perder trabajo o servir código viejo).
- Actualizar `CORS_ORIGINS` en Render con la URL real de Vercel tras el primer deploy (paso
  manual, ver sección 1.3).
