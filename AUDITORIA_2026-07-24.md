# AUDITORIA_2026-07-24.md

> Auditoría de código real (no de documentación) sobre branch `push-final`.
> Verifica `RESUMEN_TECNICO_COMPLETO.md` y `CHANGELOG_FIXES.md` contra el estado actual del repo.

## Resumen ejecutivo

Se corrió la suite completa backend (280 tests), frontend (19 tests + lint + tsc + build) y mobile (tsc).
Se encontraron y corrigieron **8 bugs reales** (7 en la pasada inicial + 1 encontrado durante la
revisión de comentarios de Parte 2, vía Pyrefly), dos de ellos críticos (uno rompía el backend al arrancar
con dependencias actuales, otro anulaba CSRF en producción bajo una config común). El resto de lo
documentado en `CHANGELOG_FIXES.md` (rate limiting, JWT blacklist, refresh token fuera del body, reset
de contraseña con token) se verificó en código real y está efectivamente aplicado.

**Veredicto:** con los fixes de esta auditoría aplicados, el sistema está en condiciones reales de
deploy a nivel de código/tests. Quedan pendientes items de infraestructura (secretos reales de Stripe/
VAPID/guarani.app, hosting) que ya estaban correctamente identificados como bloqueantes en el resumen
técnico y no son parte de esta auditoría de código.

---

## Hallazgos

### 1. [CRÍTICO] `bcrypt` sin pinnear rompe login/registro/reset de contraseña
- **Ubicación:** `backend/requeriments.txt`
- **Documentado vs real:** El resumen y changelog asumen que auth funciona end-to-end. En código real,
  `passlib[bcrypt]` sin versión fijada instala `bcrypt==5.0.0`, que eliminó el atributo `__about__` del
  que depende `passlib==1.7.4` para su self-test interno. Resultado: **cualquier llamada a
  `hash_password`/`verify_password` lanza `ValueError: password cannot be longer than 72 bytes`**, incluso
  con contraseñas normales — el self-test de passlib usa un secreto de prueba largo, y bcrypt 5.x lo
  rechaza antes de que passlib pueda usarlo.
- **Causa raíz:** dependencia sin pin de versión + incompatibilidad conocida passlib 1.7.4 / bcrypt ≥4.1
  (passlib está sin mantenimiento).
- **Impacto real verificado:** 256 de 280 tests backend fallaban con este error al instalar dependencias
  limpias (reproducido en entorno aislado). Esto afecta login, registro, reset de password, creación de
  usuarios — prácticamente todo el sistema.
- **Fix:** pin `bcrypt==4.0.1` en `requeriments.txt`.

### 2. [CRÍTICO] `slowapi` usado pero no declarado en `requeriments.txt`
- **Ubicación:** `backend/app/main.py`, `backend/app/rate_limiter.py`
- **Documentado vs real:** CHANGELOG_FIXES ISSUE 3-6 documenta rate limiting global con `slowapi`. El
  paquete se importa en `main.py` pero nunca se agregó a `requeriments.txt`.
- **Impacto real:** `pip install -r requeriments.txt` en un entorno limpio (CI, Render) deja el backend
  sin poder arrancar: `ModuleNotFoundError: No module named 'slowapi'`.
- **Fix:** agregado `slowapi` a `requeriments.txt`.

### 3. [CRÍTICO] CSRF middleware se desactiva por completo si `RATE_LIMIT_ENABLED=false`
- **Ubicación:** `backend/app/middleware/csrf.py:23`
- **Documentado vs real:** CHANGELOG_FIXES afirma "CSRF global: middleware ASGI intercepta todos los
  métodos mutantes". En código real, la primera línea del `dispatch()` es:
  ```python
  if os.getenv("RATE_LIMIT_ENABLED", "true").lower() != "true":
      return await call_next(request)
  ```
  — un copy-paste del flag equivocado. Si alguna vez se desactiva el rate limiting en producción
  (`RATE_LIMIT_ENABLED=false`, una config plausible y legítima), **la protección CSRF completa se
  desactiva también**, silenciosamente, para todos los endpoints mutantes.
- **Evidencia de que era un bug real y no intencional:** el propio test
  `test_logout_revoca_access_token` en `tests/test_security.py` togglea `RATE_LIMIT_ENABLED` con el
  comentario `# Enable CSRF temporarily for this test so logout validates CSRF` — el autor del test ya
  había caído en la misma confusión de nombres.
- **Fix:** separado el flag en `CSRF_ENABLED` (propio, default `true`), independiente de
  `RATE_LIMIT_ENABLED`. Actualizado `tests/conftest.py` (agrega `CSRF_ENABLED=false` para tests) y
  `tests/test_security.py` (usa `CSRF_ENABLED` en vez de `RATE_LIMIT_ENABLED`).

### 4. [IMPORTANTE] User enumeration en `/auth/recuperar-contrasena`
- **Ubicación:** `backend/app/routers/auth_router.py` (función `recuperar_contrasena`)
- **Documentado vs real:** CHANGELOG_FIXES ISSUE-2 dice explícitamente que el flujo sigue el estándar
  OWASP. El código de hecho ya tenía preparado el mensaje de respuesta genérico
  (`"Si el usuario existe, recibirás un email con instrucciones."`) — pero antes de llegar a ese
  `return`, había un `if not db_user: raise HTTPException(404, ...)`. Es decir, el mensaje "seguro" era
  **inalcanzable** cuando el usuario no existía: un atacante podía enumerar cuentas válidas comparando
  404 (no existe) vs 200 (existe).
- **Fix:** eliminado el `raise 404`; el flujo ahora envía el email solo si `db_user` existe pero siempre
  responde 200 con el mismo mensaje genérico. Agregado test de regresión
  `test_password_reset_usuario_inexistente_no_revela_enumeracion`.

### 5. [IMPORTANTE] `stripe.util` no existe en el SDK instalado (`stripe>=15.0`)
- **Ubicación:** `backend/app/services/pagos_online.py:65`
- **Detalle:** el fallback de `confirmar_pago_webhook()` (cuando `STRIPE_WEBHOOK_SECRET` no está
  configurada — el estado actual real de producción, con placeholder) llamaba
  `stripe.util.json.loads(payload)`. El módulo `stripe.util` no existe en las versiones actuales del SDK
  de Stripe (`>=15.0`, como pide `requeriments.txt`) — confirmado en el entorno instalado
  (`hasattr(stripe, 'util') == False`). Cualquier webhook real recibido en el estado placeholder actual
  crashearía con `AttributeError` en vez de procesar el evento.
- **Fix:** reemplazado por `json.loads()` de la librería estándar.

### 6. Script de debug commiteado rompía la recolección de tests de pytest
- **Ubicación:** `backend/test_login.py` (eliminado)
- **Detalle:** archivo suelto en la raíz de `backend/` (no en `tests/`), commiteado en un fase anterior,
  ejecuta una query a la base de datos **a nivel de módulo** (fuera de cualquier función/fixture) contra
  `SessionLocal()` con la `DATABASE_URL` por defecto (`sqlite:///./sistema_academico.db`). pytest lo
  descubre igual por el patrón `test_*.py`, y como el archivo `sistema_academico.db` local fue borrado en
  este mismo branch (`D backend/sistema_academico.db` en git status), la recolección de pytest fallaba
  por completo con `no such table: users` — bloqueando la corrida de los 273+ tests reales.
- **Fix:** eliminado. No era un test — era un script exploratorio de una sesión anterior.

### 7. `DetachedInstanceError` generalizado en tests que verifican datos tras una request autenticada
- **Ubicación:** `backend/tests/conftest.py` (fixture `client`)
- **Detalle:** el hook de tests para el blacklist de JWT (ISSUE-11) hace
  `deps.get_blacklist_db = override_blacklist_db` devolviendo directamente la sesión `db` compartida por
  el resto del test. El código real de `get_current_user()` (que corre en **cada** request autenticada)
  hace `db.close()` sobre lo que sea que devuelva `get_blacklist_db()` — comportamiento correcto en
  producción (ahí es una `SessionLocal()` dedicada), pero en tests cerraba la sesión compartida que
  sostiene los objetos ORM de la fixture `seed`. Cualquier test que hiciera una request autenticada y
  luego accediera a un atributo de un objeto `seed[...]` fallaba con
  `sqlalchemy.orm.exc.DetachedInstanceError`.
- **Impacto medido:** 10 tests fallando de forma determinística (reproducido en aislamiento, no era
  flakiness de orden de ejecución).
- **Fix:** la override ahora envuelve la sesión compartida en un proxy cuyo `.close()` es no-op,
  preservando el comportamiento real (`db.close()` se llama, pero no destruye la sesión de test).

### 8. Import roto en `GET /pasantias/profesores` — 500 real en producción
- **Ubicación:** `backend/app/routers/pasantias_router.py:63` (función `listar_profesores`)
- **Encontrado:** durante la revisión de comentarios de Parte 2, no en la corrida original de tests
  (Pyrefly lo marcó como `Cannot find module app.models.user`; se verificó a mano en el intérprete real
  antes de tocar nada).
- **Detalle:** `from app.models.user import User` (import lazy, dentro de la función). El módulo real es
  `app.models.users` (plural) — `app.models.user` solo existe como *atributo* alias creado en
  `app/models/__init__.py` (`from . import users as user`), lo cual no es suficiente para que
  `from app.models.user import User` resuelva: ese import busca un submódulo real vía
  `sys.modules`/finders, no un atributo del paquete. Reproducido directo:
  `ModuleNotFoundError: No module named 'app.models.user'`, incluso con `app.models` ya cargado.
- **Impacto real:** como el import es lazy (dentro del cuerpo de la función), el router carga bien y el
  servidor arranca sin problema — pero **cualquier llamada real a `GET /pasantias/profesores` devuelve
  500**. Ese endpoint alimenta el selector de tutor académico en Pasantías Admin (Fase 10B, "select
  profesores"). Sin test que lo cubriera — el gap explica por qué no apareció en los 273/280 tests
  previos.
- **Fix:** `from app.models.user import User` → `from app.models.users import User`. Único lugar con
  este typo (grep confirmó cero ocurrencias más). Agregado test de regresión
  `test_listar_profesores_no_crashea` en `tests/test_pasantias.py`.
- **Nota — falso positivo relacionado, no corregido:** Pyrefly también marcó
  `puntajes_utils.py:38` (`max(final_vals)`, `float | None` no asignable al bound de comparación).
  Verificado a mano: `final_vals` se arma con
  `[notas.get(t) for t in FINAL_TIPOS if notas.get(t) is not None]` — el filtro ya garantiza que la
  lista, si no está vacía, no contiene `None`. `max()` solo corre cuando la lista es no-vacía. Es una
  limitación de narrowing del type-checker sobre comprehensions con filtro, no un bug de runtime — no
  hay escenario real (nota pendiente, evaluación sin cargar) que llegue a crashear esto. No se tocó.

### Adicional (severidad menor, corregido de paso)
- `backend/seed_restante.py:85` — `print(f"...{count}")` referenciaba una variable inexistente
  (`NameError` real si se corre el script hasta el final); la variable correcta es `count_cuotas`. Script
  de seeding manual, no forma parte de la app servida ni de CI — corregido por ser trivial y de una línea.

---

## Verificado en código (confirma lo documentado en CHANGELOG_FIXES.md)

- **CSRF global:** aplicado a POST/PUT/PATCH/DELETE vía middleware ASGI, con excepciones correctas
  (`/auth/login`, `/auth/registro`, `/auth/recuperar-contrasena`, `/auth/reset-password`,
  `/auth/refresh`, `/static/*`). Bug de activación (#3 arriba) corregido.
- **Rate limiting:** `slowapi` con 100/min global + límites específicos (`/refresh` 10/min, `/registro`
  3/hora, `/recuperar-contrasena` 3/15min, `/reset-password` 10/min) confirmados en
  `auth_router.py`. Los `threading.Lock()` ad-hoc (`_password_reset_lock`, `_login_lock`) están presentes
  y protegen las secciones críticas de los rate limiters manuales.
- **JWT blacklist:** `TokenBlacklist` + migración presentes, `get_current_user()` verifica `jti` contra
  blacklist antes de aceptar el token, `/auth/logout` revoca el `jti` del access token. Confirmado con
  test `test_logout_revoca_access_token` pasando de punta a punta.
- **Refresh token fuera del body:** confirmado — ni `/auth/login` ni `/auth/refresh` devuelven
  `refresh_token` en el JSON; solo se setea como cookie httpOnly. `csrf_token` sí viaja en el body (es lo
  esperado, no es sensible de la misma forma).
- **Reset de contraseña con token time-limited:** `PasswordResetToken` con `expires_at` de 1 hora, hash
  del token (no el token crudo) almacenado, endpoint `/auth/reset-password` valida hash + expiración +
  `used`. No se genera ni se envía contraseña en texto plano en ningún flujo (`registro` tampoco).
- **Secretos:** no hay secretos reales commiteados. `.env.test` (con una URL de Neon real, uso interno de
  test) está correctamente en `.gitignore` — no trackeado. Placeholders de Stripe/VAPID/guarani.app están
  claramente marcados con el sufijo `_placeholder` o vacíos, no silenciosos.
- **Migraciones:** cadena de Alembic tiene un solo head (`4b897d038ce9`), sin bifurcaciones. Las dos
  migraciones nuevas de esta sesión (`password_reset_tokens`, `token_blacklist`) están bien encadenadas y
  no tienen problemas estructurales visibles.

## Verificado — estado real de tests/linters (no el documentado)

| Check | Resultado real (este run) | Documentado |
|---|---|---|
| pytest backend | **282 passed** (tras fixes #1, #2, #6, #7 + tests de regresión #4 y #8) | "273/273 ✅" |
| vitest frontend | **19 passed** | "19/19 ✅" |
| eslint frontend | **0 errores** | "0 errores" ✅ coincide |
| tsc frontend | **0 errores** | "0 errores" ✅ coincide |
| build frontend | **OK** (920 módulos, solo warnings de bundle-size preexistentes) | no documentado explícito |
| tsc mobile | **0 errores** | "0 errores" ✅ coincide |
| ruff (E,F,W) backend | **618 errores** (491 son E501 largo de línea en tests, resto F401/F841/E402/etc.) | "873→0 errores" — **desactualizado**, no se re-corrió tras las Fases 7-19 |
| mypy backend | **0 errores reales** tras fix de `stripe.util` (quedan ~10 falsos positivos de invarianza de tipos Decimal/float en columnas Numeric — no son bugs, ver nota abajo) | "53→0 errores" — parcialmente desactualizado |

**Nota sobre mypy y `Numeric`:** los ~10 avisos restantes (`puntajes_router.py`, `profesor_router.py`,
`reportes_router.py`) son asignaciones `float` a columnas `Numeric`/campos tipados como `int | None` que
en realidad son porcentajes/promedios. SQLAlchemy convierte esto correctamente en runtime (no hay bug de
datos), es solo que la anotación de tipo del diccionario/columna es más angosta de lo que el valor real
requiere. Se documentan como deuda técnica de tipado, no como bugs — no se tocaron para no generar un
diff de bajo valor en 3 archivos no relacionados con la auditoría de seguridad.

## Deuda técnica confirmada (ya documentada correctamente, no se tocó)

- **Ruff con 618 hallazgos** (mayormente E501 en archivos de test) — la afirmación "0 errores" en el
  resumen técnico quedó desactualizada tras las Fases 7-19. No se corrigió por ser 95% cosmético
  (longitud de línea) y estar fuera de la prioridad de esta auditoría (seguridad/integridad de datos
  primero, según instrucción explícita del usuario). **Pregunta abierta:** ¿se quiere una pasada de
  `ruff --fix` + ajuste manual de las líneas largas restantes como tarea aparte?
- **Dummy data en mobile** (`app/cursos/[id].tsx` usa `DUMMY_MATERIAS` como fallback) — confirmado que
  sigue presente, ya estaba correctamente listado como deuda de bajo impacto en el resumen. No se tocó
  (implicaría escribir integración nueva con el backend, fuera de alcance de una auditoría de bugs).
- **Rediseño visual del login** — confirmado pausado, no se tocó (instrucción explícita del usuario en
  esta sesión y en el resumen).
- **Design System / CSS inline duplicado** — deferido intencionalmente, no se tocó.

## No verificado en esta pasada (limitación de entorno)

- **Auditoría visual en vivo por rol** (paleta de colores, dead clicks, empty states) — esta sesión no
  tuvo un entorno de browser/preview activo contra el sistema corriendo con datos reales; el resumen
  técnico documenta trabajo ya hecho en sesiones anteriores sobre esto (Fase 10A paleta, Fase 11D dead
  clicks en Usuarios.tsx). No se re-verificó visualmente. **Recomendación:** correr una pasada de
  verificación visual real en browser antes de deploy final si no se hizo ya en la sesión que cerró la
  Fase 19.
- **`alembic upgrade head` contra Postgres real** — no hay Postgres disponible en este entorno local. Se
  verificó la integridad estructural de la cadena de migraciones (un solo head, FKs válidas, sin
  referencias a tablas/índices renombrados) pero la ejecución real contra Postgres fresco depende de que
  corra en CI (que ya se corrigió y verificó en un ciclo previo de esta misma sesión, ver commits
  `7a097b8` y `9d92a44`).

---

*Auditoría generada 2026-07-24 sobre branch `push-final`.*
