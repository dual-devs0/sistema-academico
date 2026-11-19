# Variables de Entorno — Sistema Académico UCA V2

> Generado grepeando `os.getenv(`/`os.environ` en todo `backend/app/` (no solo lo listado en `backend/.env.example`, que está desactualizado — ver nota en `INSTALACION.md`). Para cada variable: dónde se lee (`archivo:línea`) y qué pasa si falta. Ver también [INSTALACION.md](INSTALACION.md) para la guía de setup y [ARQUITECTURA.md](ARQUITECTURA.md) para el resto del stack.

## Placeholders conocidos (comportamiento especial si el valor sigue siendo el placeholder)

| Variable | Placeholder en `.env.example` | Efecto si no se reemplaza |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_placeholder` | `services/pagos_online.py:20-25` (`init_stripe`) detecta el string literal `"sk_test_placeholder"` y NO inicializa `stripe.api_key` — loguea warning "Stripe no disponible". Cualquier intento de checkout falla con `RuntimeError("Stripe no está configurado")` en `crear_checkout_session` (`pagos_online.py:36-37`). |
| `STRIPE_WEBHOOK_SECRET` | `whsec_placeholder` | `services/pagos_online.py:72-84` (`confirmar_pago_webhook`) detecta el placeholder (o ausencia) y **salta la verificación de firma** del webhook — construye el evento directo con `json.loads(payload)` sin validar que venga realmente de Stripe. Riesgo de seguridad documentado en el propio código. |
| `VAPID_PUBLIC_KEY` | `BP_placeholder` | `services/notificaciones_push.py:44-49` (`get_vapid_keys`) detecta el placeholder (o clave vacía) y genera un par de claves VAPID **efímero en memoria** (`_generar_vapid_keys()`), logueando warning. Las claves generadas no persisten entre reinicios del proceso — cada restart del backend invalida las suscripciones push existentes hasta que el navegador vuelva a suscribirse. |
| `VAPID_PRIVATE_KEY` | `placeholder` | Mismo comportamiento que `VAPID_PUBLIC_KEY` arriba — ambas se evalúan juntas en el mismo `if`. |

No se encontraron otros placeholders de ese tipo (comparación literal contra un string mágico) en el resto del código grepeado — el resto de variables opcionales simplemente usan un default sensato o degradan con un `if not <var>`.

## Base de datos y autenticación

| Variable | Dónde se lee | Si falta |
|---|---|---|
| `DATABASE_URL` | `backend/app/database.py:6` | Default `sqlite:///./sistema_academico.db`. `INSTALACION.md` aclara que en desarrollo/producción real debe apuntar a Postgres — el fallback SQLite es solo para tests (`tests/conftest.py`). |
| `JWT_SECRET` | `backend/app/auth.py:7` | Default `""` (string vacío) — <!-- TODO: verificar --> no se confirmó en este archivo si hay una validación posterior que rechace el arranque con secret vacío; usar un secret vacío firmaría/verificaría tokens de forma insegura. |
| `JWT_EXPIRES_MINUTES` | `backend/app/auth.py:16` | Default `15` (minutos) si falta o no es parseable como int. |
| `COOKIE_SECURE` | `backend/app/routers/auth_router.py:61` | Default `"true"` → cookies `refresh_token`/`csrf_token` con flag `Secure` (exige HTTPS). Bajar a `false` solo en dev local sobre `http://localhost`. |

## CSRF y CORS

| Variable | Dónde se lee | Si falta |
|---|---|---|
| `CSRF_ENABLED` | `backend/app/middleware/csrf.py:39` | Default `"true"` → protección CSRF activa en todo POST/PUT/PATCH/DELETE mutante (excepto login/registro/recuperar-contraseña/reset-password/refresh/static). `CSRF_ENABLED=false` desactiva la protección completa — no usar en producción. |
| `CORS_ORIGINS` | `backend/app/main.py:91` | Default `"http://localhost:5173"` (CSV de orígenes permitidos). En producción debe incluir el dominio real. |

## Rate limiting

| Variable | Dónde se lee | Si falta |
|---|---|---|
| `RATE_LIMIT_ENABLED` | `backend/app/rate_limiting.py:159` | Default `"true"`. En `false`, todo el rate limiting queda desactivado (se fuerza `false` en tests vía `conftest.py`). |
| `API_KEYS` | `backend/app/rate_limiting.py:157` | Default `""` → sin API keys extra configuradas (CSV, header `X-API-Key`). |
| `REDIS_URL` (o `UPSTASH_REDIS_REST_URL` como alias) | `backend/app/rate_limiting.py:160` | Si ambas faltan, el store del rate limiter degrada automáticamente a memoria local del proceso (no compartida entre instancias) — loguea warning una vez. `UPSTASH_REDIS_REST_URL` es un fallback si `REDIS_URL` no está seteada. |
| `REDIS_TOKEN` | `backend/app/rate_limiting.py:161` | Default `""` — token de auth para Redis (`redis://default:<token>@...`). Solo relevante si `REDIS_URL` está configurada. |
| `RATE_LIMIT_EXCLUDE_PATHS` | `backend/app/rate_limiting.py:151-155` | Default `/health,/version,/metrics,/` (rutas exactas eximidas). |
| `RATE_LIMIT_EXCLUDE_PREFIXES` | `backend/app/rate_limiting.py:143-150` | Default `/static,/docs,/openapi.json,/redoc` (prefijos eximidos). |
| `RATE_LIMIT_<CATEGORIA>` | `backend/app/rate_limiting.py:94-116` | Patrón genérico — una variable por categoría: `AUTH`, `AUTH_LOGIN`, `AUTH_REGISTER`, `PASSWORD_RESET`, `VERIFY_EMAIL`, `UPLOADS`, `QR`, `REPORTS`, `EXPORTS`, `IMPORTS`, `SEARCH`, `HEAVY_ENDPOINTS`, `ADMIN`, `CRUD`, `PUBLIC_ENDPOINTS`, más `DEFAULT_READ`/`DEFAULT_WRITE` para el resto de GET/mutaciones. Formato `"N"` o `"N/Mminutes"`. Si una categoría no tiene variable seteada, usa el default hardcodeado en `DEFAULTS` (ver tabla en el propio `rate_limiting.py:98-116`, ej. `AUTH_LOGIN` → 15/60s, `PASSWORD_RESET` → 6/900s). |

## Email

> `EMAIL_PROVIDER=auto` (default) resuelve en cascada: Resend si hay `RESEND_API_KEY` → SendGrid si hay `SENDGRID_API_KEY` → SMTP si está configurado → modo mock (solo loggea, no envía). Ningún fallo de este bloque rompe el request — reintenta con backoff y degrada con gracia (`email_utils.py`, `email_provider.py`).

| Variable | Dónde se lee | Si falta |
|---|---|---|
| `EMAIL_PROVIDER` | `backend/app/email_provider.py:33` | Default `"auto"`. |
| `EMAIL_FROM` | `backend/app/email_provider.py:38` | Fallback a `MAIL_FROM`, y si tampoco está, a `"sistema@uca.edu.py"`. |
| `EMAIL_FROM_NAME` | `backend/app/email_provider.py:39` | Default `"Sistema Académico UCA"`. |
| `EMAIL_MAX_ATTEMPTS` | `backend/app/email_provider.py:40` | Default `3`. |
| `EMAIL_MOCK` | `backend/app/email_provider.py:41` | Default `false` (no forzado). En `true`/`1`/`yes` fuerza el proveedor mock (solo logs) aunque haya credenciales reales configuradas. |
| `RESEND_API_KEY` | `backend/app/email_provider.py:34` | Vacío por defecto — sin esto, `auto` no elige Resend. |
| `SENDGRID_API_KEY` | `backend/app/email_provider.py:35` | Vacío por defecto — sin esto, `auto` no elige SendGrid. |
| `SMTP_HOST` | `backend/app/email_provider.py:123` | Fallback a `MAIL_SERVER`, default final `"smtp.gmail.com"`. |
| `SMTP_PORT` | `backend/app/email_provider.py:122` | Fallback a `MAIL_PORT`, default final `587`. |
| `SMTP_USER` | `backend/app/email_provider.py:36` | Fallback a `MAIL_USERNAME` si vacío. |
| `SMTP_PASSWORD` | `backend/app/email_provider.py:37` | Fallback a `MAIL_PASSWORD` si vacío. |
| `SMTP_STARTTLS` | `backend/app/email_provider.py:124` (lee `MAIL_STARTTLS`, no una var `SMTP_STARTTLS` separada) | Default `"True"` <!-- TODO: verificar — .env.example documenta SMTP_STARTTLS pero el código solo lee MAIL_STARTTLS en email_provider.py; podría ser una var sin efecto real, revisar si hay otro punto de lectura --> |
| `SMTP_SSL_TLS` | `backend/app/email_provider.py:125` (lee `MAIL_SSL_TLS`) | Mismo caso que `SMTP_STARTTLS` arriba. <!-- TODO: verificar --> |
| `MAIL_USERNAME` | `backend/app/email_utils.py:43`, `email_provider.py:36` | Default `"dummy@example.com"` (en `email_utils.py`, motor legacy fastapi-mail). |
| `MAIL_PASSWORD` | `backend/app/email_utils.py:44,61`, `email_provider.py:37` | Default `"dummy"`. Sin configurar, `_credentials_configured()` devuelve False y los emails se loguean en consola en vez de enviarse (ver `INSTALACION.md`). |
| `MAIL_FROM` | `backend/app/email_utils.py:45` | Default `"sistema@uca.edu.py"`. |
| `MAIL_PORT` | `backend/app/email_utils.py:46` | Default `587`. |
| `MAIL_SERVER` | `backend/app/email_utils.py:47` | Default `"smtp.gmail.com"`. |
| `MAIL_STARTTLS` | `backend/app/email_utils.py:48` | Default `"True"`. |
| `MAIL_SSL_TLS` | `backend/app/email_utils.py:49` | Default `"False"`. |
| `USE_CREDENTIALS` | `backend/app/email_utils.py:50-51` | Default `"True"`. |
| `VALIDATE_CERTS` | `backend/app/email_utils.py:52` | Default `"True"`. |
| `RESET_TOKEN_EXPIRATION_MINUTES` | `backend/app/email_utils.py:57` | Default `60`. Vigencia del token de reset de contraseña (hasheado SHA-256 en DB, un solo uso). |
| `FRONTEND_URL` | `backend/app/email_utils.py:125-130` | Usado como fallback de `RESET_PASSWORD_FRONTEND_URL` si esta última no está seteada; default final `"https://sistema.uca.edu.py/reset-password"`. |
| `RESET_PASSWORD_FRONTEND_URL` | `backend/app/email_utils.py:125` | Ver `FRONTEND_URL` arriba — construye el link `{url}?token=...` del email de reset. |

## Stripe (pagos online)

| Variable | Dónde se lee | Si falta |
|---|---|---|
| `STRIPE_SECRET_KEY` | `backend/app/services/pagos_online.py:20` | Sin valor real (o con el placeholder `sk_test_placeholder`), Stripe no se inicializa — endpoints de pago online responden error controlado (ver tabla de placeholders arriba). |
| `STRIPE_WEBHOOK_SECRET` | `backend/app/services/pagos_online.py:72` | Sin valor real (o con `whsec_placeholder`), se salta la verificación de firma del webhook (ver tabla de placeholders arriba — riesgo de seguridad). |

## Facturación electrónica (guarani.app)

| Variable | Dónde se lee | Si falta |
|---|---|---|
| `GUARANI_APP_API_KEY` | `backend/app/services/facturacion_electronica.py:35` | Vacío por defecto → `emitir_factura` lanza `RuntimeError("GUARANI_APP_API_KEY no configurada en .env")`. El pago académico YA se registró antes de llegar acá (no se bloquea) — el comprobante queda en `estado_emision="error"`, reintentable. |
| `GUARANI_APP_PUNTO_EMISION` | `backend/app/services/facturacion_electronica.py:39` | Vacío por defecto — se envía como `""` en el payload a la API externa. |
| `GUARANI_APP_BASE_URL` | `backend/app/services/facturacion_electronica.py:30` | Default `"https://api.guarani.app/v1"`. |

## Web Push (VAPID)

| Variable | Dónde se lee | Si falta |
|---|---|---|
| `VAPID_PUBLIC_KEY` | `backend/app/services/notificaciones_push.py:40` | Ver tabla de placeholders arriba — genera claves efímeras si falta o es el placeholder. |
| `VAPID_PRIVATE_KEY` | `backend/app/services/notificaciones_push.py:41` | Ídem. |
| `VAPID_CLAIM_EMAIL` | `backend/app/services/notificaciones_push.py:42` | Default `"admin@uca.edu.py"`. |

## Storage (Cloudflare R2 / S3-compatible)

| Variable | Dónde se lee | Si falta |
|---|---|---|
| `R2_ENDPOINT_URL` | `backend/app/services/storage.py:31` | `None` si falta → `boto3.client()` fallará al intentar conectar (subidas/descargas de archivo rotas: fotos de perfil, apuntes, comprobantes, informes de pasantía). |
| `R2_ACCESS_KEY_ID` | `backend/app/services/storage.py:32` | Ídem — `None` si falta. |
| `R2_SECRET_ACCESS_KEY` | `backend/app/services/storage.py:33` | Ídem — `None` si falta. |
| `R2_BUCKET_NAME` | `backend/app/services/storage.py:38` | Default `"uca-v2-storage"`. |

## Otras (no documentadas en `.env.example` — encontradas solo por grep)

| Variable | Dónde se lee | Si falta |
|---|---|---|
| `GEMINI_API_KEY` | `backend/app/routers/eventos_router.py:21` | Vacío por defecto → la función de carga de calendario por PDF (Calendario → "Subir PDF del semestre", vía Gemini) responde `500 GEMINI_API_KEY no configurada en .env`; el resto del sistema sigue funcionando normal. Mencionada solo como nota en `INSTALACION.md`, no está en `backend/.env.example`. |
| `ENV` | `backend/app/main.py:153`, `backend/app/middleware/security_headers.py:22` | Default `"production"`. En `"development"` se monta el router de test (`test_router`) y `security_headers.py` relaja el modo `_IS_PRODUCTION`. No está en `.env.example`. |
| `MOBILE_LATEST_VERSION` | `backend/app/main.py:176` | Default `"1.0.0"`. Devuelto por `GET /version` (chequeo de versión de la app mobile). |
| `MOBILE_MIN_VERSION` | `backend/app/main.py:177` | Default `"1.0.0"`. |
| `MOBILE_UPDATE_URL` | `backend/app/main.py:178-181` | Default `"https://expo.dev/accounts/cabrvix/projects/uca-movil/builds"`. |
| `MOBILE_RELEASE_NOTES` | `backend/app/main.py:182-185` | Default `"Primera versión del sistema académico móvil UCA Caacupé."`. |
| `UPSTASH_REDIS_REST_URL` | `backend/app/rate_limiting.py:160` | Alias/fallback de `REDIS_URL` (ver sección Rate limiting arriba). No está en `.env.example`. |

<!-- TODO: verificar -- no se encontró una variable UPSTASH_REDIS_REST_TOKEN pareja de UPSTASH_REDIS_REST_URL; el código solo lee REDIS_TOKEN genérico, confirmar si eso es intencional o un descuido de la integración Upstash. -->
