# CHANGELOG_FIXES.md

> Generado automáticamente por la auditoría del 2026-07-23
> Última modificación: 2026-07-24

## 2026-07-24 — Fix: COOKIE_SECURE nunca declarada en CI (hallazgo #9, ver AUDITORIA_2026-07-24.md)

### Antes (cómo estaba)
`backend/.env.test` (gitignored, nunca trackeado) era el único lugar que seteaba
`COOKIE_SECURE=false`. En CI, sin ese archivo, `_COOKIE_SECURE` caía al default `true` — las
cookies `refresh_token`/`csrf_token` se seteaban con flag `Secure` y nunca se reenviaban sobre
`http://testserver` (sin TLS). 6 tests fallaban en el job `backend`: `test_refresh_tokens.py`
completo (refresh sin cookie → 401 en vez de 200/403) y
`test_security.py::test_logout_revoca_access_token` (logout sin cookie CSRF → 403 en vez de 200).
Confirmado con la API de GitHub que el mismo job ya fallaba en el commit anterior al merge del PR
#81 (`3590583`, cambio puramente de documentación) — no lo causó el merge ni la resolución de
conflictos.

### Después (cómo quedó)
`COOKIE_SECURE: "false"` explícito en el bloque `env:` del job `backend` de
`.github/workflows/ci.yml`. `COOKIE_SECURE=true` sigue siendo el default correcto para producción
real (HTTPS) — el cambio es específico al entorno de test.

### Cambio realizado
- `.github/workflows/ci.yml` — agregado `COOKIE_SECURE: "false"` junto a `JWT_SECRET`/`DATABASE_URL`/`PYTHONPATH`

### Por qué se hizo
El `.env.test` local enmascaraba el problema en cada corrida de desarrollo — nunca se había
verificado esta suite contra CI real durante la sesión de auditoría, solo localmente. Reproducido
con certeza forzando `COOKIE_SECURE=true` local (mismos 6 asserts exactos que el log real de CI).

### Para qué sirve
CI real refleja el mismo comportamiento que el entorno local ya tenía — sin depender de un archivo
no trackeado que solo existe en discos individuales.

### Cambios que debe encontrar un revisor
- `.github/workflows/ci.yml` — una línea agregada

## 2026-07-24 — Fix: import roto en GET /pasantias/profesores (hallazgo #8, ver AUDITORIA_2026-07-24.md)

### Antes (cómo estaba)
`listar_profesores()` en `pasantias_router.py:63` hacía `from app.models.user import User` (import lazy,
dentro de la función). El módulo real es `app.models.users` (plural) — `app.models.user` solo existe
como atributo-alias en `app/models/__init__.py`, insuficiente para que un import de submódulo directo
resuelva. Como el import es lazy, el router cargaba y el servidor arrancaba sin problema, pero
**`GET /pasantias/profesores` devolvía 500** en cualquier llamada real — endpoint que alimenta el
selector de tutor académico en Pasantías Admin. Sin test que lo cubriera.

### Después (cómo quedó)
`from app.models.users import User` (módulo correcto). Endpoint responde 200. Agregado test de
regresión.

### Cambio realizado
- `backend/app/routers/pasantias_router.py:63` — corregido el import
- `backend/tests/test_pasantias.py` — nuevo `TestListarProfesores::test_listar_profesores_no_crashea`

### Por qué se hizo
Encontrado con Pyrefly durante la revisión de comentarios de mantenibilidad (Parte 2 de la auditoría),
verificado a mano en el intérprete real antes de tocar código (`ModuleNotFoundError` reproducido
directamente). Nota: Pyrefly también marcó `puntajes_utils.py:38` (`max()` sobre `float | None`) — se
verificó y es falso positivo (el filtro previo en la comprehension ya garantiza no-None; limitación de
narrowing del type-checker, no bug de runtime). No se tocó, ver detalle en AUDITORIA_2026-07-24.md #8.

### Para qué sirve
El selector de tutor académico en Pasantías Admin funciona en vez de crashear.

### Cambios que debe encontrar un revisor
- `backend/app/routers/pasantias_router.py` — línea 63
- `backend/tests/test_pasantias.py` — nuevo test

## 2026-07-24 — Fix: Auditoría pre-producción — 7 bugs reales (ver AUDITORIA_2026-07-24.md)

### Antes (cómo estaba)
- `requeriments.txt` sin pin de `bcrypt` → instala 5.0.0, incompatible con `passlib==1.7.4` → login,
  registro y reset de contraseña rotos con `ValueError: password cannot be longer than 72 bytes`.
- `slowapi` usado en `main.py`/`rate_limiter.py` pero nunca declarado en `requeriments.txt` → backend no
  arranca en un entorno limpio.
- `CSRFMiddleware.dispatch()` chequeaba `RATE_LIMIT_ENABLED` (copy-paste del flag equivocado) para
  decidir si aplicar CSRF → desactivar rate limiting en producción desactivaba CSRF también, sin aviso.
- `/auth/recuperar-contrasena` respondía 404 si el usuario no existía, antes de llegar al mensaje
  genérico ya preparado en el código → user enumeration.
- `pagos_online.py` usaba `stripe.util.json.loads()`, módulo inexistente en `stripe>=15.0` → cualquier
  webhook real con `STRIPE_WEBHOOK_SECRET` sin configurar crasheaba con `AttributeError`.
- `backend/test_login.py`, script de debug commiteado en la raíz de `backend/` (no en `tests/`), rompía
  la recolección de pytest completa al no encontrar la DB local.
- `tests/conftest.py` sobreescribía `get_blacklist_db()` devolviendo la sesión compartida de test
  directamente; el `db.close()` real de `get_current_user()` en cada request autenticada la cerraba,
  causando `DetachedInstanceError` en 10 tests que accedían a objetos `seed[...]` después de una request.

### Después (cómo quedó)
- `bcrypt==4.0.1` pinneado explícitamente.
- `slowapi` agregado a `requeriments.txt`.
- CSRF ahora usa su propio flag `CSRF_ENABLED` (default `true`), independiente de `RATE_LIMIT_ENABLED`.
- `/auth/recuperar-contrasena` responde siempre 200 con el mensaje genérico, exista o no el usuario.
- `pagos_online.py` usa `json.loads()` de la librería estándar.
- `test_login.py` eliminado.
- Override de blacklist en tests envuelve la sesión en un proxy con `close()` no-op.

### Cambio realizado
- `backend/requeriments.txt` — agregado `slowapi` y `bcrypt==4.0.1`
- `backend/app/middleware/csrf.py` — flag `CSRF_ENABLED` en vez de `RATE_LIMIT_ENABLED`
- `backend/app/routers/auth_router.py` — `recuperar_contrasena()` ya no revela existencia de usuario
- `backend/app/services/pagos_online.py` — `json.loads()` en vez de `stripe.util.json.loads()`
- `backend/test_login.py` — eliminado (script de debug commiteado por error)
- `backend/seed_restante.py` — fix de `NameError` (`count` → `count_cuotas`) en script de seeding manual
- `backend/tests/conftest.py` — proxy no-closing para `get_blacklist_db()`, agregado `CSRF_ENABLED=false`
- `backend/tests/test_security.py` — usa `CSRF_ENABLED`, agregado test de regresión de user enumeration
- `backend/alembic/versions/b42cc57fda33_...py` — (fix de un ciclo anterior de esta sesión) removido
  drop de tabla/índice `temarios` ya inexistentes, ver commit `9d92a44`
- `.github/workflows/ci.yml` — (fix de un ciclo anterior de esta sesión) `cache-dependency-path` en
  `setup-python`, ver commit `7a097b8`

### Por qué se hizo
Auditoría solicitada explícitamente para dejar el sistema en condiciones reales de deploy: verificar que
lo documentado en fases anteriores coincide con el código real, no solo con los MD. El bug de CSRF/rate
limit era el más serio — anulaba en silencio una protección de seguridad ya "cerrada" en una fase previa
bajo una configuración de producción plausible.

### Para qué sirve
Backend arranca e instala limpio desde cero. Auth funciona con las versiones de dependencias reales que
se instalarían en Render. CSRF no se puede desactivar accidentalmente. No se puede enumerar cuentas vía
el flujo de recuperación de contraseña. Webhooks de Stripe no crashean. Suite de tests corre completa y
confiable (280/280) sin falsos negativos por bugs de fixtures.

### Cambios que debe encontrar un revisor
Ver tabla de hallazgos completa en `AUDITORIA_2026-07-24.md`.

## 2026-07-23 — Fix: ESLint 51 problemas + Mobile tsc + CI + JWT jti + Cache (ISSUEs 8-12)

### ISSUE-8 — ESLint 51 problemas
- 51 issues corregidos en 31 archivos (react-hooks/immutability, react-hooks/set-state-in-effect, exhaustive-deps, no-irregular-whitespace)
- 0 errores, 0 warnings ✅

### ISSUE-9 — Mobile tsc
- Reemplazado `@expo/ui/community/pager-view` (módulo inexistente) por renderizado condicional con `display: none/flex`
- `npx tsc --noEmit` → 0 errors ✅

### ISSUE-10 — CI pipeline
- `continue-on-error: true` → `false` en el paso `npm run lint` del CI

### ISSUE-11 — JWT jti
- Creado modelo `TokenBlacklist` + migración `add_token_blacklist`
- `dependencias.py`: verifica si `jti` está en blacklist antes de aceptar token
- `auth_router.py logout`: revoca access token (jti) en blacklist al cerrar sesión

### ISSUE-12 — Cache
- Creado `backend/app/cache.py` con decorador `@ttl_cache(ttl=300)` para caché en memoria

### Cambios realizados
- 31 archivos frontend modificados para ESLint
- `mobile/app/(tabs)/_layout.tsx` — reemplazo de PagerView
- `.github/workflows/ci.yml` — continue-on-error: false
- `backend/app/models/token_blacklist.py` — nuevo modelo
- `backend/app/dependencias.py` — verificación jti en blacklist
- `backend/app/routers/auth_router.py` — revocación jti en logout
- `backend/alembic/versions/4b897d038ce9_add_token_blacklist.py` — migración
- `backend/app/cache.py` — decorador ttl_cache

## 2026-07-23 — Fix: Rate limiting global + race conditions + CSRF global (ISSUEs 3,4,5,6)

### Antes (cómo estaba)
- **CSRF**: Solo el endpoint `/auth/refresh` tenía protección CSRF (double-submit cookie). Todos los demás endpoints POST/PUT/PATCH/DELETE no tenían ninguna protección.
- **Rate limiting**: Solo login y password-reset tenían rate limiting ad-hoc con race conditions (check y register en llamadas separadas no atómicas). `/auth/refresh` y `/auth/registro` no tenían rate limiting.

### Después (cómo quedó)
- **CSRF global**: Se creó un middleware ASGI (`CSRFMiddleware`) que intercepta todos los métodos mutantes (POST/PUT/PATCH/DELETE) y verifica el token CSRF de la cookie vs el header `X-CSRF-Token`, usando `secrets.compare_digest`. Endpoints públicos (login, registro, recuperar-contrasena, reset-password, refresh) están exentos.
- **Rate limiting global**: Se agregó `slowapi` con límite global de 100 requests/minuto por IP y límites específicos por endpoint. Las race conditions en los rate limiters ad-hoc se corrigieron usando `threading.Lock()`.
- **Frontend**: El interceptor `api.ts` ahora envía el header `X-CSRF-Token` en todas las peticiones mutantes (POST/PUT/PATCH/DELETE), no solo en `/auth/refresh`.

### Cambio realizado
**CSRF middleware:**
- `backend/app/middleware/csrf.py`: Nuevo middleware ASGI que valida CSRF en POST/PUT/PATCH/DELETE
- `backend/app/main.py`: Aplicado `CSRFMiddleware` antes de SecurityHeadersMiddleware

**Rate limiting:**
- `backend/app/rate_limiter.py`: Nueva instancia compartida de `Limiter` con default 100/minuto
- `backend/app/main.py`: `app.state.limiter = limiter`, handler para RateLimitExceeded
- `backend/app/routers/auth_router.py`: Decoradores `@limiter.limit()` en `/refresh` (10/min), `/registro` (3/hora), `/recuperar-contrasena` (3/15min), `/reset-password` (10/min)

**Race conditions:**
- `backend/app/routers/auth_router.py`: Agregados `threading.Lock()` (`_password_reset_lock`, `_login_lock`) envolviendo las secciones críticas de rate limiting

**Frontend CSRF:**
- `frontend/src/lib/api.ts`: `request()` y `requestFormData()` ahora incluyen `X-CSRF-Token` header en todas las peticiones mutantes

**Tests:**
- `backend/tests/conftest.py`: `RATE_LIMIT_ENABLED=false` para entornos de test

### Por qué se hizo
Sin CSRF global, un atacante podía realizar acciones en nombre de un usuario autenticado mediante CSRF en cualquier endpoint que no fuera `/auth/refresh`. Sin rate limiting, los endpoints de refresh y registro eran vulnerables a ataques de fuerza bruta y enumeración. Las race conditions permitían exceder los límites de rate bajo concurrencia.

### Para qué sirve
Protege todos los endpoints mutantes contra ataques CSRF. Previene fuerza bruta en refresh y registro. Elimina race conditions en rate limiters.

### Cambios que debe encontrar un revisor
- `backend/app/middleware/csrf.py` — nuevo middleware CSRF global
- `backend/app/main.py` — CSRFMiddleware + limiter config
- `backend/app/rate_limiter.py` — nuevo módulo compartido de slowapi
- `backend/app/routers/auth_router.py` — decoradores @limiter.limit + threading.Lock()
- `frontend/src/lib/api.ts` — CSRF header en todas las peticiones mutantes
- `backend/tests/conftest.py` — RATE_LIMIT_ENABLED=false

## 2026-07-23 — Fix: Password enviada en texto plano por email (ISSUE-2)

### Antes (cómo estaba)
En `/auth/recuperar-contrasena` se generaba una contraseña aleatoria, se hasheaba y se almacenaba en DB — pero la misma contraseña NUNCA se enviaba por email (el template solo decía "usá Recuperar contraseña"). Sin embargo, el flujo era incorrecto: la contraseña se sobrescribía sin que el usuario la conociera, obligando a repetir el proceso. En `/auth/registro` ocurría lo mismo: se generaba una contraseña temporal que nunca llegaba al usuario.

Además, resetear la contraseña generando un valor aleatorio es una mala práctica de seguridad: no hay validación de identidad, no hay token time-limited, no hay link que el usuario deba hacer clic.

### Después (cómo quedó)
- **Reset**: Se implementó un flujo con token time-limited. `POST /auth/recuperar-contrasena` genera un `PasswordResetToken` (hash + expiry de 1 hora), almacenado en una nueva tabla `password_reset_tokens`. Se envía un email con un link `https://sistema.uca.edu.py/reset-password?token=xxx`. El frontend en `/reset-password` lee el token de la URL, muestra un formulario para ingresar nueva contraseña, y la envía a `POST /auth/reset-password`.
- **Registro**: Ya no se genera ninguna contraseña. Se envía un email de bienvenida sin contraseña; el usuario debe usar "Recuperar contraseña" para establecerla.

### Cambio realizado
**Nuevo modelo:**
- `backend/app/models/password_reset_token.py`: Nuevo modelo con `usuario_id`, `token_hash`, `expires_at`, `used`

**Migration:**
- `backend/alembic/versions/2422e74fba7b_add_password_reset_tokens.py`: Crea tabla `password_reset_tokens`

**Nuevos endpoints:**
- `backend/app/routers/auth_router.py:284-317`: `POST /auth/reset-password` — acepta token + new_password, valida hash y expiry, setea password, marca token usado

**Endpoints modificados:**
- `backend/app/routers/auth_router.py:247-282`: `POST /auth/recuperar-contrasena` — ahora genera reset token + hash, almacena en DB, envía email con link (no password)
- `backend/app/routers/auth_router.py:319-350`: `POST /auth/registro` — ya no genera password, envía email de bienvenida

**Email templates:**
- `backend/app/email_utils.py`: Agregadas `send_reset_link_email_bg` (envía link con token) y `send_welcome_email_bg` (bienvenida sin password)

**Frontend:**
- `frontend/src/pages/ResetPassword.tsx`: Nueva página que lee `?token=` de la URL, muestra formulario de nueva contraseña
- `frontend/src/App.tsx`: Ruta `/reset-password` agregada

**Tests:**
- `backend/tests/test_email.py`: Tests para `send_reset_link_email_bg` y `send_welcome_email_bg`

### Por qué se hizo
El envío de contraseñas por email (aunque no ocurriera realmente aquí, el diseño lo permitía) viola principios de seguridad. El flujo token-based con link time-limited es el estándar de la industria (OWASP).

### Para qué sirve
Elimina el riesgo de exposición de contraseñas en tránsito/correo. Implementa un flujo seguro de restablecimiento de contraseña con verificación de identidad mediante token.

### Cambios que debe encontrar un revisor
- `backend/app/models/password_reset_token.py` — nuevo modelo
- `backend/app/models/__init__.py` — import
- `backend/alembic/env.py` — import
- `backend/alembic/versions/...add_password_reset_tokens.py` — migración
- `backend/app/routers/auth_router.py:247-350` — endpoints modificados y nuevo
- `backend/app/email_utils.py` — nuevas funciones de email
- `backend/app/schemas/users_schemas.py` — nuevo schema ResetPasswordRequest
- `frontend/src/pages/ResetPassword.tsx` — nueva página
- `frontend/src/App.tsx` — nueva ruta
- `backend/tests/test_email.py` — nuevos tests

## 2026-07-23 — Fix: Refresh token leak en response body (ISSUE-1)

### Antes (cómo estaba)
El refresh token se devolvía en el JSON body (`"refresh_token": raw`) además de setearse como httpOnly cookie en los endpoints `/auth/login` y `/auth/refresh`. Esto anulaba la protección httpOnly porque cualquier JS (incluyendo XSS) podía leerlo del response de fetch.

### Después (cómo quedó)
El refresh token **solo** se setea como httpOnly cookie. Ya no aparece en el response body de login ni refresh. Los clientes móviles ahora usan `withCredentials: true` para que las cookies se envíen automáticamente, y el CSRF token (que sí está en el body) se utiliza como header `X-CSRF-Token` para proteger el flujo cookie-based de `/auth/refresh`.

### Cambio realizado
**Backend:**
- `backend/app/routers/auth_router.py:157`: Eliminado `"refresh_token": raw` del response de login
- `backend/app/routers/auth_router.py:220`: Eliminado `"refresh_token": raw` del response de refresh
- `backend/app/schemas/users_schemas.py`: Actualizado `LoginResponse` — reemplazado `refresh_token` por `csrf_token`

**Mobile:**
- `mobile/services/authService.ts`: `LoginResponse` ahora incluye `csrf_token` en vez de `refresh_token`; `refreshRequest` ahora acepta `csrfToken` y lo envía como header `X-CSRF-Token` con body vacío
- `mobile/hooks/useAuth.ts`: Reemplazado `refreshRef` por `csrfRef`; login captura `csrf_token`; refresh usa CSRF header + cookie (body vacío)
- `mobile/app/(auth)/login.tsx`: `setTokens` ahora pasa `csrf_token` en vez de `refresh_token`

**Tests:**
- `backend/tests/test_refresh_tokens.py`: Actualizados todos los tests que leían `refresh_token` del body — ahora lo leen de `res.cookies`

### Por qué se hizo
La presencia del refresh token en el response body permitía que cualquier script XSS leyera el token directamente del resultado de fetch(). La cookie httpOnly es el mecanismo correcto para proteger tokens de acceso con alta sensibilidad.

### Para qué sirve
Elimina un vector de exfiltración de refresh tokens vía XSS. Mejora la postura de seguridad del sistema.

### Cambios que debe encontrar un revisor
- `backend/app/routers/auth_router.py:157` — login response ya no incluye refresh_token
- `backend/app/routers/auth_router.py:220` — refresh response ya no incluye refresh_token
- `backend/app/schemas/users_schemas.py` — LoginResponse actualizado
- `mobile/services/authService.ts` — interfaces y refreshRequest modificados
- `mobile/hooks/useAuth.ts` — refreshRef → csrfRef
- `mobile/app/(auth)/login.tsx` — setTokens con csrf_token
- `backend/tests/test_refresh_tokens.py` — tests actualizados
