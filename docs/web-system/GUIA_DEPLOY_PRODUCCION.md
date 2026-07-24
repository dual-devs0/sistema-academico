# Guía de Deploy a Producción — Render (backend) + Vercel (frontend)

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
4. **No correr ningún seed de prueba contra esta instancia** — `backend/scripts/seed*.py` crean
   usuarios con contraseñas conocidas (`admin@uca.edu.py`, etc.), pensados solo para desarrollo.

Las migraciones de Alembic corren automáticamente en cada deploy de Render (ver `buildCommand` en
`render.yaml`: `alembic upgrade head`) — no hace falta correrlas a mano. No se pudo verificar
contra una instancia Neon real en este entorno (sin Postgres local ni acceso a la cuenta del
usuario) — la cadena de migraciones sí se verificó estructuralmente sana (37 migraciones, un solo
head, sin bifurcaciones) en la auditoría del 2026-07-24.

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
explícitas), `MAIL_PORT=587`, `MAIL_SERVER=smtp.gmail.com`, `MAIL_STARTTLS=True`,
`MAIL_SSL_TLS=False`, `USE_CREDENTIALS=True`, `VALIDATE_CERTS=True`.

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

## 4. Pendiente 100% del usuario (no automatizable)

- Comprar dominio propio (hoy se usa el subdominio gratis de cada plataforma).
- Configurar DNS del dominio cuando exista.
- Dar de alta cuenta real en Stripe (modo test primero, después activación real) y en guarani.app.
- Crear la cuenta de Cloudflare R2 y el bucket, si no existe ya una de otra sesión.
- Decidir la rama canónica de producción (el repo tiene varias ramas divergentes — deployar sin
  resolver esto arriesga perder trabajo o servir código viejo).
- Actualizar `CORS_ORIGINS` en Render con la URL real de Vercel tras el primer deploy (paso
  manual, ver sección 1.3).
