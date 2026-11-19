# API Reference — Sistema Académico UCA V2

> Generado leyendo el código real en `backend/app/routers/*.py` y sus schemas correspondientes en `backend/app/schemas/` — endpoint por endpoint, sin inventar nada. Cubre los **206 endpoints** de los 29 routers montados en `app/main.py` (`app.include_router(...)`) más el router interno `test.py` (solo se registra si `ENV=development`).
>
> Última actualización: 2026-09-03 — incluye los fixes de seguridad del commit `9a6e0bd` ("mass-assignment en apuntes permitía autoaprobación") y `ca43b80` ("cerrar 11 huecos de IDOR y mass-assignment entre roles").
>
> Formato por endpoint: **Rol requerido** (según `Depends(get_current_user)` / `Depends(require_role(...))` / chequeos manuales de `current_user.role` en el cuerpo), **Qué hace** (comportamiento real, no el nombre de la ruta), **Request body** (schema Pydantic exacto, omitido si el endpoint no recibe body), **Respuestas** (todos los `HTTPException` alcanzables), y **Archivo** de origen. Donde el código no permite confirmar un detalle con certeza, queda marcado `<!-- TODO: verificar -->` en vez de inventarse.

## Notas generales de autenticación

- `get_current_user` (`app/dependencias.py`) valida el JWT Bearer: firma, presencia de `sub`/`role`/`user_id` en el payload, y que el `jti` no esté en `TokenBlacklist` (revocado por logout o reset de password). No exige ningún rol específico — **401** `"Token inválido"` o `"Token revocado"` si falla.
- `require_role(rol_o_lista)` envuelve `get_current_user` y además exige que `current_user.role` esté en la lista permitida — **403** `"No autorizado"` si no.
- Varios routers no usan `require_role` sino un chequeo manual equivalente dentro del cuerpo de la función (`if current_user.role != "admin": raise HTTPException(403, ...)`) — el efecto es el mismo, se documenta caso por caso.
- "público" = no depende de `get_current_user` en absoluto (accesible sin token).

---

## `/auth` — `auth_router.py`

### POST /auth/login
**Rol requerido:** público (sin `Depends` de autenticación)
**Qué hace:** Verifica username+password contra la BD (rate-limited por `username:ip`), emite un access token JWT (body), crea un refresh token (persistido hasheado en `RefreshToken`, entregado como cookie httpOnly y también en el body para mobile), y emite `csrf_token` (cookie no-httpOnly + body).
**Request body:** `LoginRequest` (`app/schemas/users_schemas.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| username | string | Sí | Sin validación de longitud/formato adicional |
| password | string | Sí | Sin validación de longitud/formato adicional |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Login exitoso — devuelve `access_token`, `token_type`, `csrf_token`, `refresh_token` |
| 400 | Usuario no existe o password inválido (`"Credenciales inválidas"`) |
| 429 | Más de 5 intentos fallidos en 15 minutos para la clave `username:ip` (`_check_login_rate_limit`) |

**Archivo:** `app/routers/auth_router.py`

---

### POST /auth/refresh
**Rol requerido:** público (no usa `get_current_user`; valida su propio refresh token + CSRF)
**Qué hace:** Rota el refresh token: acepta el token por cookie httpOnly (requiere validar CSRF header contra cookie CSRF) o por body explícito (flujo mobile, sin chequeo CSRF). Revoca el token usado, emite uno nuevo, y un nuevo access token + csrf_token.
**Request body:** `RefreshRequest` (opcional; `app/schemas/users_schemas.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| refresh_token | string \| null | No | Si se omite, se usa la cookie `refresh_token` |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Refresh exitoso — nuevo `access_token`, `token_type`, `csrf_token`, `refresh_token` |
| 401 | No hay token (ni body ni cookie) (`"No hay refresh token"`) |
| 403 | Flujo cookie sin CSRF válido: falta `csrf_token` cookie, falta header `x-csrf-token`, o no coinciden (`secrets.compare_digest`) |
| 401 | Token no encontrado en DB, revocado o expirado (`"Refresh token inválido o expirado"`) |
| 404 | El `usuario_id` del refresh token no corresponde a ningún usuario existente (guard AUDIT-FIX B-6) |

**Archivo:** `app/routers/auth_router.py`

---

### POST /auth/logout
**Rol requerido:** público (no exige `get_current_user`; opera sobre lo que encuentre en cookie/header)
**Qué hace:** Revoca (marca `revocado=True`) el refresh token de la cookie si existe, y si viene un header `Authorization: Bearer`, decodifica el JWT y agrega su `jti` a `TokenBlacklist` (para invalidar el access token vigente antes de su expiración natural). Borra ambas cookies (`refresh_token`, `csrf_token`).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Siempre — `{"detail": "Sesión cerrada"}` (no lanza excepciones; el bloque de decodificación de JWT está en `try/except Exception: pass`) |

**Archivo:** `app/routers/auth_router.py`

---

### POST /auth/recuperar-contrasena
**Rol requerido:** público
**Qué hace:** Busca usuario por username o email; si existe, genera un token de reset criptográficamente aleatorio (se persiste solo su hash SHA-256), invalida tokens de reset previos no usados del mismo usuario, y dispara email de recuperación en background. Responde **siempre** el mismo mensaje genérico exista o no el usuario, para evitar user enumeration (fix de AUDITORIA_2026-07-24 #4).
**Request body:** `RecuperarRequest` (`app/schemas/users_schemas.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| username_or_email | string | Sí | `Field(min_length=1, max_length=200)`. Si contiene `@`, se valida con regex `^[^@\s]+@[^@\s]+\.[^@\s]+$` (si no matchea, `ValueError` → 422 de Pydantic) |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Siempre — `{"detail": "Si el usuario existe, recibirás un email con instrucciones."}` |
| 429 | Más de 3 intentos en 15 minutos para esa clave (`_check_password_reset_rate_limit`) |
| 422 | Validación Pydantic falla (`username_or_email` vacío, muy largo, o con `@` pero formato de email inválido) |

**Archivo:** `app/routers/auth_router.py`

---

### POST /auth/reset-password
**Rol requerido:** público
**Qué hace:** Consume un token de reset (valida hash, `used=False`, no expirado), actualiza la contraseña, marca el token como usado, borra otros tokens de reset pendientes del usuario, y revoca **todos** los refresh tokens del usuario (cierra todas las sesiones activas).
**Request body:** `ResetPasswordRequest` (`app/schemas/users_schemas.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| token | string | Sí | `Field(min_length=10, max_length=500)` |
| new_password | string | Sí | `Field(min_length=8, max_length=100)`. Validator `contraseña_fuerte`: debe contener al menos una letra y un dígito, si no `ValueError` |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"detail": "Contraseña actualizada correctamente."}` |
| 400 | Token no encontrado, ya usado, o expirado (`"Token inválido o expirado..."`) |
| 404 | El `usuario_id` del token no corresponde a un usuario existente |
| 422 | Validación Pydantic (`new_password` no cumple regla letra+dígito, o longitudes fuera de rango) |

**Archivo:** `app/routers/auth_router.py`

---

### POST /auth/cambiar-contrasena
**Rol requerido:** cualquier usuario autenticado (`Depends(get_current_user)`) — alumno, profesor o admin
**Qué hace:** Cambio de contraseña autenticado: exige la contraseña actual, la verifica, y actualiza el hash. No revoca refresh tokens ni fuerza re-login.
**Request body:** `ChangePasswordRequest` (`app/schemas/users_schemas.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| current_password | string | Sí | Sin validación adicional |
| new_password | string | Sí | `Field(min_length=8, max_length=100)`. Validator `contraseña_fuerte`: letra + dígito requeridos |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"detail": "Contraseña actualizada correctamente."}` |
| 404 | `current_user.user_id` no corresponde a un usuario existente en DB |
| 400 | `current_password` no coincide con el hash almacenado (`"Contraseña actual incorrecta"`) |
| 422 | Validación Pydantic de `new_password` |
| 401 | Token inválido/ausente (vía `get_current_user`) |

**Archivo:** `app/routers/auth_router.py`

---

### POST /auth/registro
**Rol requerido:** público
**Qué hace:** Activación de cuenta pre-creada por un admin: busca un usuario cuyo `username == matricula` y `cedula == documento`. Si existe y tiene email, envía un email de bienvenida (sin contraseña; el usuario debe usar "recuperar contraseña" después). No crea usuarios nuevos.
**Request body:** `RegistroRequest` (`app/schemas/users_schemas.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| documento | string | Sí | Comparado contra `User.cedula` |
| matricula | string | Sí | Comparado contra `User.username`; también es la clave de rate limit |
| tipo_documento_extranjero | string \| null | No | <!-- TODO: verificar --> no se usa en el cuerpo de la función más allá de recibirse en el schema |
| pais_documento | string \| null | No | <!-- TODO: verificar --> no se usa en el cuerpo de la función más allá de recibirse en el schema |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"detail": "Si los datos son correctos, recibirás un email con instrucciones."}` (nota: a diferencia de recuperar-contrasena, este caso de éxito **sí** requiere que el usuario exista, porque el 404 se lanza antes) |
| 429 | Rate limit de `_check_password_reset_rate_limit` sobre la clave `matricula` (3 intentos / 15 min) |
| 404 | No existe usuario con esa combinación matricula+documento (`"No se encontró una cuenta con esos datos..."`) |

**Archivo:** `app/routers/auth_router.py`

---

## `/users` — `users_router.py`

### GET /users/stats
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Devuelve conteos agregados de usuarios por rol, total de becados, y crecimiento mensual de altas de usuario en los últimos 6 meses (agrupado por `date_trunc('month', created_at)`).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Siempre que el rol sea admin |
| 403 | Rol distinto de admin (vía `require_role`) |

**Archivo:** `app/routers/users_router.py`

---

### POST /users/
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Crea un usuario nuevo con password hasheado. Admin puede fijar cualquier campo incluyendo `role`, `carrera_id`, `es_becado` desde la creación (no hay restricción de mass-assignment aquí porque solo admin puede llamarlo).
**Request body:** `UserCreate` (`app/schemas/users_schemas.py`, extiende `UserBase`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| username | string | Sí | `Field(min_length=3, max_length=50)` |
| role | string | Sí | Sin enum/constraint a nivel Pydantic <!-- TODO: verificar si se valida contra un enum en otra capa --> |
| nombre | string \| null | No | — |
| email | string \| null | No | Sin `EmailStr`, es `str` libre <!-- TODO: verificar --> |
| carrera_id | int \| null | No | — |
| es_becado | bool \| null | No | — |
| password | string | Sí | `Field(min_length=6, max_length=100)` |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Usuario creado, devuelve `UserOut` |
| 403 | Rol distinto de admin |
| 422 | Validación Pydantic (username/password fuera de rango) |

**Archivo:** `app/routers/users_router.py`

---

### GET /users/me
**Rol requerido:** cualquier usuario autenticado (`get_current_user`)
**Qué hace:** Devuelve los datos del propio usuario autenticado. Si tiene `foto_url`, la reemplaza por una URL firmada temporal (`obtener_url_firmada`).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Devuelve `UserOut` |
| 404 | `current_user.user_id` no existe en DB (caso raro: usuario borrado con token aún válido) |

**Archivo:** `app/routers/users_router.py`

---

### GET /users/{user_id}
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Devuelve los datos de cualquier usuario por id.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Devuelve `UserOut` |
| 403 | Rol distinto de admin |
| 404 | `user_id` no existe |

**Archivo:** `app/routers/users_router.py`

---

### GET /users/{user_id}/materias
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Lista las ofertas de materia (con datos de materia y carrera) donde el usuario dado es el `profesor_id`, ordenadas por período descendente. Nota: no valida que `user_id` sea realmente profesor, solo filtra por `profesor_id == user_id` en `OfertaMateria` (si es alumno, simplemente devuelve lista vacía).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de objetos con `id, materia_id, materia_nombre, carrera_id, carrera_nombre, anio, semestre, periodo, activa` |
| 403 | Rol distinto de admin |
| 404 | `user_id` no existe |

**Archivo:** `app/routers/users_router.py`

---

### GET /users/
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Listado paginado de usuarios con filtros opcionales por búsqueda de texto (`nombre`/`email`/`username` con `ilike`), `role`, `es_becado` (bug: el filtro real ignora el valor y siempre filtra `es_becado == True` cuando el query param no es `None` — ver nota abajo) y `carrera_id`.
**Query params:** `skip:int=0`, `limit:int=20`, `q:str|None`, `role:str|None`, `es_becado:bool|None`, `carrera_id:int|None`
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Devuelve `UserListOut` (`items`, `total`) |
| 403 | Rol distinto de admin |

**Nota de bug encontrado leyendo el código:** el filtro `if es_becado is not None: query = query.filter(models.user.User.es_becado.is_(True))` ignora el valor real del query param (`es_becado=false` filtra igual por `True`). <!-- comportamiento real confirmado en el código, no es un TODO -->

**Archivo:** `app/routers/users_router.py`

---

### GET /users/secure
**Rol requerido:** cualquier usuario autenticado (`get_current_user`)
**Qué hace:** Endpoint trivial de verificación de sesión — devuelve username y rol del usuario autenticado.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"msg": "Hola {username}, tu rol es {role}"}` |
| 401 | Token inválido/ausente |

**Archivo:** `app/routers/users_router.py`

---

### POST /users/me/foto
**Rol requerido:** cualquier usuario autenticado (`get_current_user`)
**Qué hace:** Sube una foto de perfil (multipart `UploadFile`) a storage, guarda la `storage_key` en `foto_url` del propio usuario, y devuelve la URL firmada.
**Request body:** multipart form, campo `foto` (`UploadFile`, requerido)
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"storage_key": ..., "url": ...}` |
| 422 | `subir_archivo` lanza `ValueError` (ej. tipo de archivo inválido) — propagado como 422 con el mensaje de la excepción |
| 404 | `current_user.user_id` no existe en DB |

**Archivo:** `app/routers/users_router.py`

---

### PATCH /users/{user_id}
**Rol requerido:** cualquier usuario autenticado; autorización adicional manual: solo el propio usuario (`current_user.user_id == user_id`) o un admin
**Qué hace:** Actualiza campos del usuario. **Fix crítico de mass-assignment (3 sep 2026):** si quien edita NO es admin, se eliminan del payload los campos `role`, `carrera_id`, `es_becado`, `activo`, `fecha_ingreso`, `cedula`, `cv`, `password` antes de aplicar el update — es decir, un usuario no-admin editándose a sí mismo NO puede cambiar su propio rol, carrera, beca, estado activo, fecha de ingreso, cédula, CV ni contraseña por esta vía (para password usan `/auth/cambiar-contrasena`). Si se actualiza `password` (solo posible siendo admin), se hashea. Si hay nueva password y el usuario tiene email, se dispara notificación en background (con `try/except` que solo loggea, no falla el request).
**Request body:** `UserUpdate` (`app/schemas/users_schemas.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| nombre | string \| null | No | — |
| email | string \| null | No | — |
| carrera_id | int \| null | No | Eliminado del payload si el actor no es admin |
| es_becado | bool \| null | No | Eliminado del payload si el actor no es admin |
| role | string \| null | No | Eliminado del payload si el actor no es admin |
| password | string \| null | No | `Field(None, min_length=6, max_length=100)`. Eliminado del payload si el actor no es admin |
| fecha_ingreso | date \| null | No | Eliminado del payload si el actor no es admin |
| cv | string \| null | No | Eliminado del payload si el actor no es admin |
| activo | bool \| null | No | Eliminado del payload si el actor no es admin |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Devuelve `UserOut` actualizado |
| 403 | Actor no es admin y `current_user.user_id != user_id` (`"No autorizado"`) |
| 404 | `user_id` no existe |
| 422 | Validación Pydantic de `password` (longitud) |

**Archivo:** `app/routers/users_router.py`

---

### DELETE /users/{user_id}
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Elimina un usuario y hace cascade manual sobre registros relacionados antes del delete: `RefreshToken`, `Asistencia`, `Puntaje`, `Inscripcion` (como alumno), `ForoMensaje`, `Apunte` — todos filtrados por el `user_id`/`alumno_id`/`user_id` correspondiente.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"detail": "Usuario eliminado correctamente"}` |
| 403 | Rol distinto de admin |
| 404 | `user_id` no existe |

**Archivo:** `app/routers/users_router.py`

---

## `/materias` — `materia_router.py`

### POST /materias/
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Crea una materia nueva en el catálogo, validando que no exista ya una materia con el mismo `nombre` + `carrera_id`. Devuelve la materia enriquecida (`_enrich`: incluye oferta activa, profesor, carrera, cantidad de inscritos).
**Request body:** `MateriaCreate` (`app/schemas/materia_schema.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| nombre | string | Sí | — |
| codigo | string \| null | No | — |
| carrera_id | int \| null | No | — |
| anio | int \| null | No | Si no se envía, se guarda `1` por defecto |
| semestre | int \| null | No | Si no se envía, se guarda `1` por defecto |
| creditos | int \| null | No | — |
| cupos | int \| null | No | — |
| horario | string \| null | No | — |
| secciones | int \| null | No | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Materia creada, objeto enriquecido |
| 400 | Ya existe una materia con ese `nombre` + `carrera_id` |
| 403 | Rol distinto de admin |

**Archivo:** `app/routers/materia_router.py`

---

### GET /materias/
**Rol requerido:** cualquier usuario autenticado (`get_current_user`)
**Qué hace:** Lista materias con filtros opcionales `profesor_id` (join con oferta activa) y `carrera_id`, paginado, enriquecidas en batch (`_enrich_batch`, optimizado para evitar N+1 queries).
**Query params:** `profesor_id:int|None`, `carrera_id:int|None`, `skip:int=0 (ge=0)`, `limit:int=500 (ge=1,le=2000)`
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de materias enriquecidas |
| 422 | `skip`/`limit` fuera de rango |

**Archivo:** `app/routers/materia_router.py`

---

### GET /materias/stats
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Estadísticas agregadas: total de materias, total de profesores, materias con/sin profesor asignado (según oferta activa), carga promedio de materias por profesor, desglose por carrera.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Siempre |
| 403 | Rol distinto de admin |

**Archivo:** `app/routers/materia_router.py`

**Nota:** esta ruta está declarada **después** de `GET /materias/{materia_id}` en el archivo, pero antes de ella en el orden real de aparición del código leído (`/stats` en línea 198, `/{materia_id}` en línea 255) — no hay conflicto de orden de rutas aquí.

---

### GET /materias/{materia_id}
**Rol requerido:** cualquier usuario autenticado (`get_current_user`)
**Qué hace:** Devuelve una materia enriquecida por id.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Objeto enriquecido |
| 404 | `materia_id` no existe |

**Archivo:** `app/routers/materia_router.py`

---

### PATCH /materias/{materia_id}
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Único campo mutable vía este endpoint es `profesor_id` (reasigna el profesor de la oferta activa de la materia). No modifica ningún otro campo de `Materia` pese a existir `MateriaUpdate` con más campos — ese schema no se usa acá, se usa un `BaseModel` inline `MateriaPatchBody` con solo `profesor_id`.
**Request body:** `MateriaPatchBody` (definido inline en `materia_router.py`, no en `schemas/`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| profesor_id | int \| null | No | Si se envía y no es `None`, requiere que exista oferta activa para la materia |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Objeto enriquecido tras la actualización (o sin cambios si `profesor_id` es `None`) |
| 403 | Rol distinto de admin |
| 404 | `materia_id` no existe |
| 400 | No hay oferta activa para la materia (`"Creá una oferta primero."`) |

**Archivo:** `app/routers/materia_router.py`

---

### POST /materias/ofertas
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Crea una `OfertaMateria` (asigna un profesor a una materia para un período), validando que la materia y el profesor existan y que no haya ya una oferta para esa materia+período.
**Request body:** `OfertaMateriaCreate` (`app/schemas/oferta_materia_schema.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| materia_id | int | Sí | Debe existir en `Materia`, si no 404 |
| profesor_id | int | Sí | Debe existir en `User`, si no 404 |
| periodo | string | Sí | — |
| activa | bool \| null | No | Default `True` si no se envía |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Devuelve `OfertaMateriaOut` |
| 404 | Materia no encontrada, o profesor no encontrado |
| 400 | Ya existe una oferta de esa materia para ese período |
| 403 | Rol distinto de admin |

**Archivo:** `app/routers/materia_router.py`

**Nota importante de ruteo:** `POST /materias/ofertas` está registrado **después** de `GET/PATCH /materias/{materia_id}` en el archivo, pero como es un método `POST` distinto (`GET`/`PATCH` vs `POST`) y FastAPI resuelve por método+path exacto antes que por path-param greedy, no hay colisión real con `{materia_id}` para este método. <!-- TODO: verificar si existe un POST /materias/{materia_id} en otro lugar que pudiera colisionar; no se encontró en este archivo -->

---

## `/inscripciones` — `inscripciones_router.py`

### POST /inscripciones/
**Rol requerido:** alumno o admin (chequeo manual: `current_user.role not in ("alumno", "admin")` → 403); usa `get_current_user` como dependencia base
**Qué hace:** Inscribe a un alumno en la oferta activa de una materia. Si quien llama es `alumno`, se fuerza `alumno_id = current_user.user_id` (un alumno no puede inscribir a otro, sin importar lo que envíe en el body). Valida correlatividades (`validar_correlatividades`), valida que exista oferta activa, valida bloqueo por mora (`verificar_deuda_inscripcion`) con posibilidad de override solo si es admin y `override_mora=true` (queda registrado en auditoría vía `registrar_override_mora`), valida que no exista ya inscripción duplicada, y valida que no haya solapamiento de horario con otras materias del alumno.
**Request body:** `InscripcionCreate` (`app/schemas/inscripcion_schema.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| alumno_id | int | Sí | Ignorado y sobreescrito por `current_user.user_id` si el rol es `alumno`; solo admin puede inscribir a otro alumno indicándolo aquí |
| materia_id | int | Sí | — |
| override_mora | bool | No | Default `False`. Solo tiene efecto si el actor es admin y hay bloqueo por mora |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Devuelve `InscripcionOut` |
| 403 | Rol no es `alumno` ni `admin` |
| 404 | Materia no encontrada, o no hay oferta activa para la materia (`_oferta_activa_o_404`) |
| 422 | Correlatividades no cumplidas (`validar_correlatividades`), o alumno bloqueado por mora sin override válido |
| 400 | El alumno ya está inscripto en esa materia |
| 409 | Solapamiento de horario con otra materia inscripta (`verificar_solapamiento_inscripcion`) |

**Archivo:** `app/routers/inscripciones_router.py`

---

### DELETE /inscripciones/{inscripcion_id}
**Rol requerido:** cualquier usuario autenticado (`get_current_user`); autorización manual: admin, o el propio alumno dueño de la inscripción
**Qué hace:** Elimina una inscripción.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"detail": "Desinscripto correctamente"}` |
| 404 | `inscripcion_id` no existe |
| 403 | El actor no es admin y no es el `alumno_id` dueño de la inscripción |

**Archivo:** `app/routers/inscripciones_router.py`

---

### GET /inscripciones/materia/{materia_id}
**Rol requerido:** admin, o profesor de esa materia específica (`es_profesor_de_materia`); cualquier otro rol (incluido alumno) es rechazado
**Qué hace:** Lista los alumnos inscriptos en la oferta activa de una materia (id, nombre, username, email).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de alumnos (vacía si no hay inscripciones) |
| 403 | Rol `profesor` pero no es el profesor asignado a esa materia; o rol no es `admin` ni `profesor` |
| 404 | No hay oferta activa para la materia |

**Archivo:** `app/routers/inscripciones_router.py`

---

### GET /inscripciones/stats
**Rol requerido:** cualquier usuario autenticado (`get_current_user`) — sin restricción de rol adicional
**Qué hace:** Devuelve el conteo total de inscripciones en el sistema (sin filtrar por usuario/rol).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"total": N}` |

**Archivo:** `app/routers/inscripciones_router.py`

---

### GET /inscripciones/
**Rol requerido:** cualquier usuario autenticado (`get_current_user`); el alcance de datos varía por rol
**Qué hace:** Lista inscripciones. Si el actor es `alumno`, solo ve las propias (fuerza filtro por `alumno_id == current_user.user_id`, ignorando el query param `alumno_id`). Si es `profesor`, solo ve inscripciones de materias donde él es el profesor de la oferta, con filtro opcional adicional por `alumno_id`. Cualquier otro rol (admin) puede filtrar libremente por `alumno_id` via query param.
**Query params:** `alumno_id:int|None`
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `InscripcionOut` |

**Archivo:** `app/routers/inscripciones_router.py`

---

### POST /inscripciones/promocionar
**Rol requerido:** admin (chequeo manual `current_user.role != "admin"` → 403; dependencia base es `get_current_user`)
**Qué hace:** Promueve en bloque a todos los alumnos inscriptos en las materias de un semestre origen (`carrera_id`+`desde_anio`+`desde_semestre`) hacia las materias del semestre destino (`hasta_anio`+`hasta_semestre`) de la misma carrera, creando nuevas inscripciones en las ofertas activas destino (evitando duplicados).
**Request body:** `PromocionarBody` (definido inline en `inscripciones_router.py`, no en `schemas/`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| carrera_id | int | Sí | — |
| desde_anio | int | Sí | — |
| desde_semestre | int | Sí | — |
| hasta_anio | int | Sí | — |
| hasta_semestre | int | Sí | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"detail": ..., "promovidos": N, "ya_inscriptos": N, "errores": N, "alumnos_afectados": N}` |
| 403 | Rol distinto de admin |
| 404 | No hay materias en el semestre origen, o no hay materias en el semestre destino |
| 400 | No hay alumnos inscriptos en el semestre origen |

**Archivo:** `app/routers/inscripciones_router.py`

---

### GET /inscripciones/carrera/{carrera_id}
**Rol requerido:** admin (chequeo manual `current_user.role != "admin"` → 403; dependencia base es `get_current_user`)
**Qué hace:** Lista todas las materias de una carrera junto con sus alumnos inscriptos (en la oferta activa de cada materia).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de materias con array `alumnos` (vacío si no hay oferta activa o inscripciones) |
| 403 | Rol distinto de admin |

**Archivo:** `app/routers/inscripciones_router.py`

---

## `/carreras` — `carreras_router.py`

### POST /carreras/
**Rol requerido:** admin (chequeo manual `current_user.role != "admin"` → 403; dependencia base es `get_current_user`, no `require_role`)
**Qué hace:** Crea una carrera nueva, validando que no exista ya una con el mismo `nombre`.
**Request body:** `CarreraCreate` (`app/schemas/carrera_schema.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| nombre | string | Sí | — |
| duracion_semestres | int \| null | No | — |
| creditos_totales | int \| null | No | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Devuelve `CarreraOut` |
| 403 | Rol distinto de admin |
| 400 | Ya existe una carrera con ese nombre |

**Archivo:** `app/routers/carreras_router.py`

---

### GET /carreras/
**Rol requerido:** cualquier usuario autenticado (`get_current_user`) — solo requiere estar logueado, sin restricción de rol
**Qué hace:** Lista el catálogo de carreras, paginado.
**Query params:** `skip:int=0 (ge=0)`, `limit:int=500 (ge=1,le=2000)`
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `CarreraOut` |
| 422 | `skip`/`limit` fuera de rango |

**Archivo:** `app/routers/carreras_router.py`

---

## `/test` — `test.py`

### GET /test/
**Rol requerido:** público (sin `Depends`)
**Qué hace:** Healthcheck trivial, no toca base de datos.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"msg": "API funcionando"}` |

**Archivo:** `app/routers/test.py`

---

### GET /test/auth
**Rol requerido:** cualquier usuario autenticado (`get_current_user`)
**Qué hace:** Smoke-test manual de que el JWT valida correctamente; devuelve username y rol del token decodificado.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"msg": "Autenticación OK", "user": ..., "role": ...}` |
| 401 | Token inválido/ausente/revocado |

**Archivo:** `app/routers/test.py`

## `/asistencias` — `asistencias_router.py`

### POST /asistencias/
**Rol requerido:** admin, o profesor titular de la materia (validado por `_verificar_profesor_materia` → `es_profesor_de_materia`).
**Qué hace:** Crea un registro de asistencia individual para un alumno en la oferta activa de una materia, en una fecha dada. Toma un snapshot del campo `es_becado` del alumno al momento de crear el registro. Si el alumno queda marcado ausente, dispara (en background) el chequeo de alerta de inasistencia crítica (25%) y potencialmente envía email a alumno, profesor y admins.
**Request body:** `AsistenciaCreate` (= `AsistenciaBase`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| user_id | int | Sí | Alumno al que se le registra asistencia |
| materia_id | int | Sí | Debe tener oferta activa |
| fecha | date | Sí | Fecha de la clase |
| presente | bool | Sí | Presente/ausente |
| es_becado | bool \| null | No | Se ignora en la práctica: el endpoint recalcula `es_becado` desde el registro real del alumno, no usa el valor del body |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Asistencia creada |
| 403 | `current_user` no es admin ni profesor titular de la materia |
| 404 | Materia no encontrada (dentro de `_verificar_profesor_materia`) o no hay oferta activa para la materia |
| 409 | Ya existe un registro de asistencia para ese alumno en esa fecha y oferta |

**Archivo:** `app/routers/asistencias_router.py`

---

### GET /asistencias/
**Rol requerido:** cualquier usuario autenticado (filtrado por rol dentro de la función).
**Qué hace:** Lista asistencias con filtros opcionales (`materia_id`, `user_id`, `fecha`, paginación `skip`/`limit`). Si el usuario es `alumno`, fuerza el filtro a sus propias asistencias (ignora `user_id` recibido). Si es `profesor`, si pide `user_id` valida que sea alumno suyo (`es_profesor_de_alumno`), si no filtra por todos los alumnos inscriptos en ofertas activas que dicta. Otros roles (admin) pueden filtrar libremente por `user_id`. Enriquece cada resultado con `materia_nombre` vía joinedload (evita N+1).
**Query params:** `materia_id` (int, opc.), `user_id` (int, opc.), `fecha` (date, opc.), `skip` (int, ≥0, default 0), `limit` (int, 1–2000, default 500).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de asistencias (puede ser vacía) |
| 403 | Profesor pide `user_id` de un alumno que no es suyo (`es_profesor_de_alumno` falla) |

**Archivo:** `app/routers/asistencias_router.py`

---

### PUT /asistencias/{asistencia_id}
**Rol requerido:** admin, o profesor titular de la materia del registro existente.
**Qué hace:** Actualiza un registro de asistencia existente. El campo `user_id` del body se descarta explícitamente (comentario en código: "no reasignable: mass assignment hubiera permitido robar la asistencia a otro alumno"). Si `materia_id` cambia, recalcula la oferta activa correspondiente. Si tras la actualización queda ausente, dispara el chequeo de alerta de inasistencia.
**Request body:** `AsistenciaCreate` (mismo schema que POST, ver arriba). Nota: `user_id` enviado es ignorado por el servidor.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Actualizado correctamente |
| 404 | Asistencia no encontrada, o (si cambia materia_id) no hay oferta activa para la nueva materia |
| 403 | `current_user` no es admin ni profesor titular de la materia del registro |

**Archivo:** `app/routers/asistencias_router.py`

---

### DELETE /asistencias/{asistencia_id}
**Rol requerido:** admin, o profesor titular de la materia del registro.
**Qué hace:** Elimina un registro de asistencia.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"detail": "Asistencia eliminada"}` |
| 404 | Asistencia no encontrada |
| 403 | No es admin ni profesor titular |

**Archivo:** `app/routers/asistencias_router.py`

---

### POST /asistencias/lote
**Rol requerido:** admin, o profesor titular de la materia.
**Qué hace:** Carga/actualiza asistencia de toda una clase (varios alumnos) en un solo request para una fecha. Hace pre-fetch batch de usuarios y registros existentes (2 queries fijas en vez de 2×N) para performance. Por cada registro ausente dispara el chequeo de alerta de inasistencia.
**Request body:** `AsistenciaLote`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| materia_id | int | Sí | — |
| fecha | date | Sí | Fecha común para todos los registros |
| registros | list[RegistroIndividual] | Sí | `Field(..., min_length=1)` — al menos 1 elemento |

`RegistroIndividual`:
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| user_id | int | Sí | — |
| presente | bool | Sí | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `AsistenciaLoteResponse` con `guardados`, `actualizados`, `total` |
| 403 | No es admin ni profesor titular de la materia |
| 404 | No hay oferta activa para la materia |

**Archivo:** `app/routers/asistencias_router.py`

---

### GET /asistencias/materia/{materia_id}/alumnos
**Rol requerido:** admin o profesor (chequeo manual `current_user.role not in ("admin", "profesor")` → 403). No valida que el profesor sea titular de esa materia específica <!-- TODO: verificar si esto es intencional; el código no llama a es_profesor_de_materia aquí -->.
**Qué hace:** Retorna alumnos matriculados en cualquier oferta de la materia (todas las ofertas, no solo la activa) con su porcentaje de asistencia ponderado (usando `puntaje_asistencia_sql`/`PUNTAJE_PRESENTE`), permite filtrar por `becado`. Usa GROUP BY para calcular conteos en una sola query.
**Query params:** `becado` (bool, opcional).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `list[AlumnoAsistenciaOut]` (lista vacía si no hay inscripciones) |
| 403 | Rol no es admin ni profesor |

**Archivo:** `app/routers/asistencias_router.py`

---

### GET /asistencias/alumno/{user_id}/porcentaje
**Rol requerido:** admin, o el propio alumno (`current_user.user_id == user_id`).
**Qué hace:** Calcula el porcentaje de asistencia de un alumno (global o filtrado por `materia_id`) usando la función pura `calcular_porcentaje_asistencia` (promedio del puntaje de asistencia por sesión, escalado a 100 — no un simple presentes/total).
**Query params:** `materia_id` (int, opcional).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | dict con `user_id`, `materia_id`, `total_clases`, `presentes`, `porcentaje` |
| 403 | `current_user` no es admin y no es el alumno consultado |

**Archivo:** `app/routers/asistencias_router.py`

---

### GET /asistencias/{materia_id}/resumen
**Rol requerido:** cualquier usuario autenticado (sin chequeo de rol adicional en el cuerpo). <!-- TODO: verificar si esto es intencional, no filtra por rol ni valida acceso a la materia -->
**Qué hace:** Calcula el porcentaje simple de asistencia (presentes/total, sin ponderar) sobre TODAS las ofertas históricas de una materia (no solo la activa).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"porcentaje": 0}` si no hay registros, o `{"porcentaje": <float>}` |

**Archivo:** `app/routers/asistencias_router.py`

---

### POST /asistencias/qr/verificar
**Rol requerido:** cualquier usuario autenticado, pero el cuerpo exige explícitamente `role == "alumno"` (403 si no).
**Qué hace:** Registra la asistencia del alumno autenticado escaneando un QR generado por el profesor. Decodifica y valida el JWT del QR (firmado con `SECRET_KEY`, algoritmo de `ALGORITHM`, `kind == "asistencia_qr"`, TTL 15 min vía `exp`). Verifica que la oferta del QR sigue siendo la activa de la materia, que el alumno está inscripto en ella, y que no tiene asistencia registrada hoy. Crea el registro con `presente=True` y devuelve conteo de presentes/ausentes de la clase de hoy.
**Request body:** `QrVerifyRequest`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| qr_token | str | Sí | JWT emitido por `GET /asistencias/qr/{materia_id}` |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `QrVerifyResponse` (materia_nombre, fecha, hora_registro, presentes, ausentes) |
| 403 | `current_user.role != "alumno"`, o el alumno no está inscripto en la oferta activa |
| 400 | JWT inválido/expirado (`JWTError`), `kind` distinto de `asistencia_qr`, faltan `materia_id`/`oferta_id` en el payload, o la oferta del QR ya no coincide con la oferta activa actual de la materia |
| 409 | Ya existe asistencia registrada para el alumno hoy en esa oferta |

**Archivo:** `app/routers/asistencias_router.py`

---

### GET /asistencias/profesor/carreras
**Rol requerido:** admin o profesor (403 si no).
**Qué hace:** Devuelve las carreras donde el profesor dicta clases (join Carrera→Materia→OfertaMateria activa filtrando por `profesor_id`). Si el rol es admin, ignora el filtro anterior y devuelve TODAS las carreras.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `{"id", "nombre"}` |
| 403 | Rol no es admin ni profesor |

**Archivo:** `app/routers/asistencias_router.py`

---

### GET /asistencias/profesor/materias
**Rol requerido:** admin o profesor (403 si no).
**Qué hace:** Devuelve las materias de una carrera dada; si el rol es profesor, filtra solo las materias donde dicta una oferta activa.
**Query params:** `carrera_id` (int, requerido, `Query(...)`).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `{"id", "nombre", "codigo"}` |
| 403 | Rol no es admin ni profesor |
| 422 | `carrera_id` faltante (validación FastAPI de query requerido) |

**Archivo:** `app/routers/asistencias_router.py`

---

### GET /asistencias/profesor/alumnos
**Rol requerido:** admin o profesor (403 si no). No valida que el profesor sea titular de esa materia específica <!-- TODO: verificar si esto es intencional -->.
**Qué hace:** Devuelve la lista de alumnos inscriptos (en cualquier oferta) de una materia junto a su estado de asistencia para una fecha dada (batch query, evita N+1).
**Query params:** `materia_id` (int, requerido), `fecha` (str, requerido, formato ISO parseado con `date.fromisoformat`).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `ProfesorAlumnosResponse` |
| 403 | Rol no es admin ni profesor |
| 404 | Materia no encontrada |
| 422 | Parámetros requeridos faltantes, o `fecha` con formato inválido (`ValueError` de `date.fromisoformat` no capturado — <!-- TODO: verificar código exacto que devuelve FastAPI/Starlette ante excepción no manejada, probablemente 500 -->) |

**Archivo:** `app/routers/asistencias_router.py`

---

### GET /asistencias/qr/{materia_id}
**Rol requerido:** admin, o profesor titular de la materia (`es_profesor_de_materia`).
**Qué hace:** Genera un QR (imagen PNG en base64) que codifica un JWT de tipo `asistencia_qr` válido por 15 minutos, para que los alumnos lo escaneen y registren su propia asistencia vía `POST /asistencias/qr/verificar`.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `QrGenerateResponse` (qr_base64, token, scan_url, expira_en) |
| 403 | Rol no es admin/profesor, o es profesor pero no titular de la materia |
| 404 | Materia no encontrada, o no hay oferta activa para la materia |

**Archivo:** `app/routers/asistencias_router.py`

---

### PUT /asistencias/profesor/toggle/{asistencia_id}
**Rol requerido:** admin, o profesor titular de la materia asociada al registro.
**Qué hace:** Cambia el estado presente/ausente de un registro de asistencia existente, y opcionalmente actualiza `motivo` y `puntaje_justificacion`. Si se marca `presente=True`, limpia `puntaje_justificacion` (no tiene sentido justificar algo que no ocurrió). Si se pasa `puntaje_justificacion` explícitamente en una ausencia, lo actualiza; si no se pasa, preserva el valor anterior.
**Query params (no hay body):** `presente` (bool, requerido), `motivo` (str, opcional), `puntaje_justificacion` (int, opcional).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"id", "presente", "motivo"}` |
| 403 | Rol no autorizado, o es profesor pero no titular de la materia de la oferta del registro |
| 422 | `puntaje_justificacion` no es `None`, 3 ni 4 |
| 404 | Asistencia no encontrada |

**Archivo:** `app/routers/asistencias_router.py`

---

### POST /asistencias/profesor/marcar
**Rol requerido:** admin, o profesor titular de la materia.
**Qué hace:** Crea (o actualiza si ya existe) un registro de asistencia para un alumno en una materia/fecha específica, vía query params (no body JSON). Valida que el alumno esté inscripto en la oferta activa antes de marcar. Si ya existe un registro para esa fecha/alumno/oferta, lo actualiza en vez de crear uno nuevo (misma lógica de `puntaje_justificacion` que el toggle).
**Query params (no hay body):** `materia_id` (int, requerido), `alumno_id` (int, requerido), `fecha` (str, requerido, alias del parámetro interno `fecha_str`), `presente` (bool, requerido), `motivo` (str, opcional), `puntaje_justificacion` (int, opcional).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"id", "presente", "motivo"}` |
| 403 | Rol no autorizado, o es profesor pero no titular de la materia; o el alumno no está inscripto en la oferta activa |
| 422 | `puntaje_justificacion` no es `None`, 3 ni 4 |
| 404 | No hay oferta activa para la materia, o alumno no encontrado |

**Archivo:** `app/routers/asistencias_router.py`

---

## `/puntajes` — `puntajes_router.py`

Todas las notas se guardan sobre la **oferta activa** de la materia (`_oferta_activa_id`, importado de `asistencias_router.py`). Toda la lógica de cálculo de promedio vive en `services/puntajes_utils.py`; el router solo valida permisos y delega.

### GET /puntajes/pesos/{materia_id}
**Rol requerido:** cualquier usuario autenticado (sin chequeo de rol). <!-- TODO: verificar si es intencional exponer esto a alumnos -->
**Qué hace:** Devuelve el puntaje máximo configurado por tipo de evaluación para una materia (default 20/20/10/50 si no hay fila configurada en `PesoEvaluacion`).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `PesoEvaluacionOut` |

**Archivo:** `app/routers/puntajes_router.py`

---

### PUT /puntajes/pesos/{materia_id}
**Rol requerido:** admin, o profesor titular de la materia.
**Qué hace:** Crea o actualiza la fila de `PesoEvaluacion` (pesos máximos por tipo) para una materia. Registra `updated_by` con el id del usuario actual.
**Request body:** `PesoEvaluacionUpdate`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| parcial1_max | float | Sí | `Field(gt=0)` |
| parcial2_max | float | Sí | `Field(gt=0)` |
| practico_max | float | Sí | `Field(gt=0)` |
| final_max | float | Sí | `Field(gt=0)` |

Validador a nivel modelo (`model_validator`): la suma de los 4 campos redondeada a 2 decimales debe ser exactamente 100, si no `ValueError` (→ 422 de FastAPI).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `PesoEvaluacionOut` actualizado |
| 403 | Rol no es admin ni profesor; o es profesor pero no titular de la materia |
| 404 | Materia no encontrada |
| 422 | Suma de pesos ≠ 100, o algún campo ≤ 0 |

**Archivo:** `app/routers/puntajes_router.py`

---

### POST /puntajes/
**Rol requerido:** admin, o profesor titular de la materia.
**Qué hace:** Crea una nota (`Puntaje`) para un alumno en la oferta activa de una materia. Si es profesor (no admin), aplica el gate de regularidad (`_verificar_regularidad`): para tipos "final" (final1/2/3, directa) no permite cargar la nota si la asistencia del alumno está por debajo del mínimo institucional (un admin sí puede forzarlo, salteando este chequeo). Valida que `valor` no exceda el máximo configurado para el tipo. Impide duplicar tipo de nota para el mismo alumno/oferta (409... en realidad 400, ver abajo). Los tipos "directa" y el desglose (parcial/practico/final) son mutuamente excluyentes: al crear una nota de un modo, borra automáticamente cualquier nota existente del modo contrario para ese alumno/oferta. Envía email al alumno (background task) notificando la nueva nota, si tiene email registrado.
**Request body:** `PuntajeCreate` (= `PuntajeBase`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| user_id | int | Sí | Alumno |
| materia_id | int | Sí | — |
| tipo | Literal["parcial1","parcial2","practico","final1","final2","final3","directa"] | Sí | — |
| valor | float | Sí | `Field(ge=0, le=50)`; además validación a nivel modelo: si `tipo=="directa"`, debe ser entero entre 1 y 5 |
| felicitado | bool | No (default False) | Validación: solo puede ser `True` si `tipo=="directa"`, si no `ValueError` |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `PuntajeOut` creado |
| 403 | Rol no es admin ni profesor; o es profesor pero no titular de la materia; o (dentro de `_verificar_regularidad`) el alumno no cumple el mínimo de asistencia para cargar nota final |
| 404 | Usuario autenticado no encontrado en DB; o materia no encontrada (si profesor); o no hay oferta activa para la materia |
| 422 | `valor` excede el máximo configurado para el `tipo` en esa materia; o violaciones de validadores Pydantic del body (felicitado sin directa, directa fuera de rango 1-5, valor fuera de 0-50) |
| 400 | Ya existe una nota de ese `tipo` para el alumno en esa materia |

**Archivo:** `app/routers/puntajes_router.py`

---

### GET /puntajes/
**Rol requerido:** cualquier usuario autenticado (filtrado por rol dentro).
**Qué hace:** Lista puntajes con filtros opcionales (`user_id`, `materia_id`, `tipo`, paginación). Igual lógica de scoping por rol que `GET /asistencias/`: alumno solo ve las propias, profesor solo las de sus alumnos (o valida `es_profesor_de_alumno` si pide un `user_id` puntual), otros roles filtran libremente.
**Query params:** `user_id` (int, opc.), `materia_id` (int, opc.), `tipo` (str, opc.), `skip` (int ≥0, default 0), `limit` (int 1–2000, default 500).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `PuntajeOut` |
| 403 | Profesor pide `user_id` de un alumno que no es suyo |

**Archivo:** `app/routers/puntajes_router.py`

---

### PUT /puntajes/{puntaje_id}
**Rol requerido:** admin, o profesor titular de la materia del puntaje existente.
**Qué hace:** Actualiza una nota existente. El campo `user_id` del body se descarta (comentario explícito de seguridad: evita robar la nota a otro alumno). Si es profesor, vuelve a aplicar el gate de regularidad con el nuevo `tipo`. Si `materia_id` cambia, recalcula oferta activa. Valida `valor` contra el máximo del `tipo` en la materia (nueva). Si el `tipo` cambia, borra la nota del modo contrario (directa vs desglose) igual que en create. Actualiza `editado_por` y `editado_en`. Envía email al alumno notificando el cambio.
**Request body:** `PuntajeCreate` (mismo schema, ver POST). `user_id` enviado es ignorado por el servidor.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `PuntajeOut` actualizado |
| 403 | Rol no autorizado, o profesor no titular de la materia, o gate de regularidad falla |
| 404 | Usuario autenticado no encontrado; puntaje no encontrado; o no hay oferta activa para la nueva materia |
| 400 | `existing.materia_id` es `None` (dato inconsistente) — 400 con detalle "Materia no asociada al puntaje" |
| 422 | `valor` excede máximo del `tipo`, o violaciones del schema Pydantic |

**Archivo:** `app/routers/puntajes_router.py`

---

### DELETE /puntajes/{puntaje_id}
**Rol requerido:** admin, o profesor titular de la materia del puntaje.
**Qué hace:** Elimina una nota.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"detail": "Puntaje eliminado"}` |
| 403 | Rol no autorizado, o profesor no titular |
| 404 | Puntaje no encontrado |
| 400 | `materia_id` del puntaje es `None` |

**Archivo:** `app/routers/puntajes_router.py`

---

### GET /puntajes/materia/{materia_id}
**Rol requerido:** admin, o profesor titular de la materia.
**Qué hace:** Devuelve las notas de todos los alumnos de la oferta activa de una materia, agrupadas por alumno con desglose por tipo, más el promedio final calculado (`calcular_promedio_final`) con los pesos configurados.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `list[PromedioFinalOut]` |
| 403 | Rol no autorizado, o profesor no titular |

**Archivo:** `app/routers/puntajes_router.py`

---

### GET /puntajes/alumno/{user_id}/promedio-final
**Rol requerido:** admin, o el propio alumno.
**Qué hace:** Calcula el promedio ponderado final de un alumno. Si se pasa `materia_id`, filtra a esa oferta activa; si no, toma todos los puntajes del alumno (potencialmente mezclando materias — nota: sin `materia_id`, `get_pesos(db, None)` se llama con `materia_id=None` <!-- TODO: verificar comportamiento de get_pesos con materia_id=None en services/puntajes_utils.py, no leído en este análisis -->).
**Query params:** `materia_id` (int, opcional).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `PromedioFinalOut` |
| 403 | `current_user` no es admin y no es el alumno consultado |

**Archivo:** `app/routers/puntajes_router.py`

---

### GET /puntajes/materia/{materia_id}/exportar
**Rol requerido:** admin, o profesor titular de la materia.
**Qué hace:** Exporta todas las notas + promedio + porcentaje de asistencia de cada alumno de la materia, en un formato pensado para descarga/exportación. Usa batch queries para asistencia (una sola query agregada en vez de N).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `ExportacionMateriaOut` |
| 403 | Rol no autorizado, o profesor no titular |
| 404 | Materia no encontrada |

**Archivo:** `app/routers/puntajes_router.py`

---

### GET /puntajes/materia/{materia_id}/estadisticas
**Rol requerido:** admin, o profesor titular de la materia.
**Qué hace:** Calcula estadísticas agregadas de la materia: total de alumnos, promedio grupal, nota máxima/mínima, distribución por escalón (1 a 5, escala real del Art. 24), cantidad de aprobados (`>= APROBACION_MINIMA`) y en riesgo. Devuelve estructura "vacía" (`total_alumnos: 0`, etc.) si no hay oferta activa o no hay notas.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | dict con estadísticas (ver cuerpo) |
| 403 | Rol no autorizado, o profesor no titular |

**Archivo:** `app/routers/puntajes_router.py`

---

### GET /puntajes/{user_id}/promedio
**Rol requerido:** admin, o el propio alumno.
**Qué hace:** Calcula el promedio real del alumno (promedio de promedios por materia, usando pesos reales de cada materia — evita mezclar escalas distintas de un AVG crudo) vía `promedios_por_alumno`. Nota: esta ruta está deliberadamente definida al final del archivo (comentario en código) para no capturar otras rutas `/materia/...`.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"user_id", "promedio", "total_puntajes"}` |
| 403 | `current_user` no es admin y no es el alumno consultado |
| 404 | No se encontraron puntajes para ese usuario (`user_id` no está en el dict devuelto por `promedios_por_alumno`) |

**Archivo:** `app/routers/puntajes_router.py`

---

## `/notas` — `notas_router.py`

Router de endpoints compuestos, consumido por la app mobile (`notasService.ts`). No tiene endpoints de escritura, solo lectura de datos ya cargados vía `/asistencias` y `/puntajes`.

### GET /notas/materia/{materia_id}/detalle
**Rol requerido:** cualquier usuario autenticado. No hay chequeo explícito de rol; implícitamente devuelve datos del `current_user.user_id` (siempre filtra por el usuario autenticado, no acepta otro `user_id`), por lo que cualquier alumno/profesor/admin solo puede ver su propio detalle.
**Qué hace:** Compone el detalle completo de una materia para el usuario autenticado: datos generales de la materia, nombre del profesor de la oferta activa, desglose de notas por tipo (parcial1/2, práctico, final1/2/3) comparando puntaje logrado vs. máximo configurado, nota "directa" si existe (con flag `felicitado`), y resumen de asistencia (porcentaje ponderado, total de clases, presentes). Calcula el promedio final con `calcular_promedio_final`.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | dict con `materiaId`, `nombre`, `profesor`, `semestre`, `promedio`, `directa`, `felicitado`, `asistenciaPct`, `totalClases`, `presentes`, `desglose` |
| 404 | Materia no encontrada |

**Archivo:** `app/routers/notas_router.py`

---

### GET /notas/materia/{materia_id}/asistencia
**Rol requerido:** cualquier usuario autenticado. Igual que el anterior, siempre filtra por `current_user.user_id`, no acepta ver la asistencia de otro usuario.
**Qué hace:** Devuelve el detalle de asistencia (todos los registros) del usuario autenticado en una materia, formateado para la app mobile: fecha, tipo de clase (hardcodeado `"P"`), horas cátedra (hardcodeado `4`), y estado (`"Presente"` / `"Justificado"` si tiene `motivo` / `"Ausente"`). Si no hay oferta activa, devuelve `registros: []`.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"nombre", "registros"}` |
| 404 | Materia no encontrada |

**Archivo:** `app/routers/notas_router.py`

---

## `/programas` — `programas_router.py`

Router de temario/programa semanal por materia (contenido del curso).

### POST /programas/
**Rol requerido:** admin, o profesor titular de la materia (`_verificar_acceso_materia`; alumno u otro rol → 403).
**Qué hace:** Crea un ítem de programa (semana + título + descripción) para una materia.
**Request body:** `ProgramaCreate` (= `ProgramaBase`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| materia_id | int | Sí | — |
| semana | int | Sí | Sin validación de rango en el schema |
| titulo | str | Sí | Sin validación de longitud |
| descripcion | str \| null | No | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `ProgramaOut` creado |
| 403 | `current_user.role` no es admin, ni (profesor y titular de la materia) |

**Archivo:** `app/routers/programas_router.py`

---

### GET /programas/
**Rol requerido:** cualquier usuario autenticado (sin chequeo de rol ni de acceso a la materia). <!-- TODO: verificar si es intencional que no valide `_verificar_acceso_materia` aquí, a diferencia de los demás endpoints del router -->
**Qué hace:** Lista todos los ítems de programa, opcionalmente filtrados por `materia_id`.
**Query params:** `materia_id` (int, opcional).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de objetos `Programa` (ORM, sin `response_model` declarado — serialización default de FastAPI) |

**Archivo:** `app/routers/programas_router.py`

---

### GET /programas/{materia_id}
**Rol requerido:** cualquier usuario autenticado (sin chequeo de rol ni de acceso a la materia). <!-- TODO: verificar si es intencional -->
**Qué hace:** Devuelve todos los ítems de programa de una materia, ordenados por `semana`.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de objetos `Programa` (sin `response_model` declarado) |

**Archivo:** `app/routers/programas_router.py`

---

### PUT /programas/{programa_id}
**Rol requerido:** admin, o profesor titular tanto de la materia del ítem existente como de la materia nueva enviada en el body (se valida acceso dos veces: `existing.materia_id` y `programa.materia_id`).
**Qué hace:** Actualiza un ítem de programa existente, incluyendo la posibilidad de reasignarlo a otra materia (siempre que el usuario tenga acceso a ambas).
**Request body:** `ProgramaCreate` (mismo schema que POST, ver arriba).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `ProgramaOut` actualizado |
| 404 | Programa no encontrado |
| 403 | No autorizado sobre la materia actual o la materia destino |

**Archivo:** `app/routers/programas_router.py`

---

### DELETE /programas/{programa_id}
**Rol requerido:** admin, o profesor titular de la materia del ítem.
**Qué hace:** Elimina un ítem de programa.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"detail": "Eliminado"}` |
| 404 | Programa no encontrado |
| 403 | No autorizado sobre la materia del ítem |

**Archivo:** `app/routers/programas_router.py`

---

### PUT /programas/materia/{materia_id}/bulk
**Rol requerido:** admin, o profesor titular de la materia.
**Qué hace:** Reemplaza TODO el programa de una materia: borra todos los ítems existentes de esa materia y los recrea desde la lista recibida. Si un ítem no trae `semana` (valor "falsy", p.ej. 0 o None), usa el índice+1 en la lista como número de semana.
**Request body:** `list[ProgramaCreate]` (array JSON, no un objeto envolvente). Cada elemento usa el mismo schema `ProgramaCreate` documentado en POST (nota: aunque el schema requiere `materia_id`, el endpoint ignora el `materia_id` de cada ítem del body y siempre usa el `materia_id` del path).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de dicts `{"id", "materia_id", "semana", "titulo", "descripcion"}` de los ítems recreados |
| 404 | Materia no encontrada |
| 403 | No autorizado sobre la materia |
| 422 | Body no es una lista válida de `ProgramaCreate` (validación FastAPI) |

**Archivo:** `app/routers/programas_router.py`

## `/apuntes` — `apuntes_router.py`

Biblioteca digital de apuntes (archivo en R2 vía `services/storage.py`, URL de descarga firmada). Todos los endpoints requieren usuario autenticado (`Depends(get_current_user)`); no hay endpoints públicos en este router.

### POST /apuntes/
**Rol requerido:** cualquier usuario autenticado (alumno, profesor, admin). El campo `aprobado` solo puede quedar en `True` si `current_user.role == "admin"` **y** el cliente lo envió como `True`; para cualquier otro rol se fuerza a `False` sin importar lo que mande el body (fix del commit `9a6e0bd`, evita autoaprobación por mass-assignment).
**Qué hace:** Crea un apunte asociándolo a `current_user.user_id` como `user_id` (ignora cualquier `user_id` enviado en el body, porque se sobreescribe con `data["user_id"] = current_user.user_id` después de `model_dump()`). Guarda directamente en la tabla `Apunte`.
**Request body:** `ApunteCreate` (= `ApunteBase`, `schemas/apunte_schema.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| user_id | int | Sí (schema) | Ignorado por el router: se sobreescribe siempre con `current_user.user_id`. |
| materia_id | int | Sí | Sin validación de existencia de materia en este endpoint. |
| titulo | str | Sí | Sin validación de longitud a nivel Pydantic (la validación de min 5 caracteres solo ocurre en `/apuntes/validar`, no se aplica aquí). |
| descripcion | str \| None | No | — |
| archivo_url | str | Sí | — |
| tags | str \| None | No | — |
| aprobado | bool \| None | No | Ver nota de rol arriba: el valor real queda determinado por el rol, no por el body. |
| tipo_contenido | Literal["pdf","video","imagen","link","documento","otro"] | No (default "pdf") | — |
| visibilidad | Literal["publico","privado","solo_materia"] | No (default "publico") | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Apunte creado, devuelve `ApunteOut`. |
| 401 | Token inválido/revocado. |
| 422 | Body no cumple el schema `ApunteCreate` (validación FastAPI). |

**Archivo:** `app/routers/apuntes_router.py`

---

### GET /apuntes/
**Rol requerido:** cualquier usuario autenticado.
**Qué hace:** Lista apuntes con filtros opcionales (`materia_id`, `aprobado`, `tipo_contenido`, `q` búsqueda ilike sobre título/tags/descripción) y paginación `skip`/`limit`. No filtra por visibilidad ni por rol: cualquier usuario autenticado ve todos los apuntes que matcheen los filtros, incluyendo no aprobados si pasa `aprobado=false` o no filtra. <!-- TODO: verificar si esto es intencional; no hay chequeo de rol/ownership en el listado -->
**Query params:** `materia_id: int?`, `aprobado: bool?`, `tipo_contenido: str?`, `q: str?`, `skip: int (>=0, default 0)`, `limit: int (1-2000, default 500)`.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `ApunteOut` (puede ser vacía). |
| 401 | Token inválido/revocado. |
| 422 | Query params fuera de rango (ej. `limit` > 2000). |

**Archivo:** `app/routers/apuntes_router.py`

---

### POST /apuntes/validar
**Rol requerido:** cualquier usuario autenticado.
**Qué hace:** No crea nada; corre el heurístico `validar_contenido()` (lista de palabras bloqueadas, longitud mínima del título, chequeo de relación con el nombre de la materia) y devuelve advertencias, sin persistir cambios.
**Request body:** `ValidarRequest` (`schemas/apunte_schema.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| titulo | str | Sí | Se valida `len(titulo.strip()) < 5` dentro de `validar_contenido`. |
| descripcion | str \| None | No | — |
| tags | str \| None | No | — |
| tipo_contenido | TipoContenido | No (default "pdf") | Si es `"video"` agrega advertencia de "revisión adicional". |
| materia_id | int | Sí | Se busca la `Materia` en DB; si no existe, simplemente no agrega la advertencia de relación temática. |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Devuelve `ValidarResponse {valido: bool, advertencias: list[str]}`. |
| 401 | Token inválido/revocado. |
| 422 | Body inválido. |

**Archivo:** `app/routers/apuntes_router.py`

---

### GET /apuntes/{apunte_id}
**Rol requerido:** cualquier usuario autenticado.
**Qué hace:** Devuelve un apunte por id, sin chequeo de ownership/visibilidad.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `ApunteOut`. |
| 401 | Token inválido/revocado. |
| 404 | `"Apunte no encontrado"` si no existe el id. |

**Archivo:** `app/routers/apuntes_router.py`

---

### PUT /apuntes/{apunte_id}
**Rol requerido:** admin, o el propio dueño (`current_user.user_id == apunte.user_id`). Cualquier otro rol/usuario recibe 403.
**Qué hace:** Actualiza campos parciales (`exclude_unset=True`) del apunte usando `schemas.apunte.ApunteUpdate`, que **no incluye el campo `aprobado`** — por lo tanto ni admin ni dueño pueden reaprobar/desaprobar por esta vía (fix relacionado al commit 9a6e0bd; la única forma de aprobar es `PATCH /apuntes/{id}/aprobar`).
**Request body:** `ApunteUpdate` (`schemas/apunte_schema.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| titulo | str \| None | No | — |
| descripcion | str \| None | No | — |
| archivo_url | str \| None | No | — |
| tags | str \| None | No | — |
| tipo_contenido | TipoContenido \| None | No | — |
| visibilidad | Visibilidad \| None | No | — |

Nota: `aprobado`, `user_id`, `materia_id` no forman parte de este schema, por lo que no son modificables vía este endpoint aunque se envíen (Pydantic los ignora al no estar declarados, salvo config `extra` — no hay `extra="allow"` en el modelo, así que se descartan).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `ApunteOut` actualizado. |
| 401 | Token inválido/revocado. |
| 403 | `"No autorizado"` si no es admin ni el dueño del apunte. |
| 404 | `"Apunte no encontrado"`. |
| 422 | Body inválido. |

**Archivo:** `app/routers/apuntes_router.py`

---

### PATCH /apuntes/{apunte_id}/aprobar
**Rol requerido:** admin exclusivamente (`current_user.role != "admin"` → 403). Chequeo de rol ocurre **antes** de buscar el apunte en DB.
**Qué hace:** Único endpoint que puede poner `apunte.aprobado = True`. No recibe body.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `ApunteOut` con `aprobado=True`. |
| 401 | Token inválido/revocado. |
| 403 | `"No autorizado"` si el rol no es admin. |
| 404 | `"Apunte no encontrado"`. |

**Archivo:** `app/routers/apuntes_router.py`

---

### PATCH /apuntes/{apunte_id}/like
**Rol requerido:** cualquier usuario autenticado (sin restricción de ownership; cualquier usuario puede dar like a cualquier apunte, y no hay control de "like duplicado" — se puede llamar repetidas veces incrementando cada vez).
**Qué hace:** Incrementa `likes` en 1 vía `UPDATE ... SET likes = likes + 1` (atómico a nivel SQL) y devuelve el apunte refrescado.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `ApunteOut` con `likes` incrementado. |
| 401 | Token inválido/revocado. |
| 404 | `"Apunte no encontrado"`. |

**Archivo:** `app/routers/apuntes_router.py`

---

### PATCH /apuntes/{apunte_id}/descargar
**Rol requerido:** cualquier usuario autenticado.
**Qué hace:** Incrementa el contador `descargas` en 1 (no descarga el archivo en sí; es un contador que el frontend dispara al iniciar la descarga real, que se obtiene aparte con `GET /apuntes/{id}/url-descarga`).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `ApunteOut` con `descargas` incrementado. |
| 401 | Token inválido/revocado. |
| 404 | `"Apunte no encontrado"`. |

**Archivo:** `app/routers/apuntes_router.py`

---

### POST /apuntes/{apunte_id}/archivo
**Rol requerido:** admin, o el propio dueño del apunte. Cualquier otro usuario recibe 403.
**Qué hace:** Sube un archivo (multipart `UploadFile`) a R2 vía `services.storage.subir_archivo(contenido, filename, "apunte")`, guarda el `storage_key` resultante en el apunte, y borra el archivo anterior en R2 si existía (`eliminar_archivo`, con `try/except` silencioso si falla el borrado). Devuelve la nueva key y una URL firmada de descarga.
**Request:** multipart/form-data, campo `archivo` (`UploadFile`, requerido). No usa un schema Pydantic (es `File(...)`).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"storage_key": ..., "url": ...}`. |
| 401 | Token inválido/revocado. |
| 403 | `"No autorizado"` si no es admin ni dueño. |
| 404 | `"Apunte no encontrado"`. |
| 422 | `subir_archivo` lanza `ValueError` (ej. tipo/tamaño de archivo inválido, validado dentro de `services/storage.py` — no revisado en detalle aquí) <!-- TODO: verificar reglas exactas en services/storage.py -->. |

**Archivo:** `app/routers/apuntes_router.py`

---

### GET /apuntes/{apunte_id}/url-descarga
**Rol requerido:** cualquier usuario autenticado (sin chequeo de ownership/visibilidad — cualquier usuario logueado puede pedir la URL firmada de descarga de cualquier apunte que tenga archivo).
**Qué hace:** Devuelve una URL firmada temporal (`obtener_url_firmada`) para descargar el `storage_key` del apunte.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"url": ...}`. |
| 401 | Token inválido/revocado. |
| 404 | `"Apunte no encontrado"`, o `"Este apunte no tiene archivo subido"` si `storage_key` es falsy. |

**Archivo:** `app/routers/apuntes_router.py`

---

### DELETE /apuntes/{apunte_id}
**Rol requerido:** admin, o el propio dueño del apunte. Cualquier otro usuario recibe 403.
**Qué hace:** Borra el registro del apunte en DB. **No borra el archivo en R2** (`storage_key`) — solo la fila de la tabla. <!-- TODO: verificar si es intencional o un huérfano en R2 -->
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"detail": "Apunte eliminado"}`. |
| 401 | Token inválido/revocado. |
| 403 | `"No autorizado"` si no es admin ni dueño. |
| 404 | `"Apunte no encontrado"`. |

**Archivo:** `app/routers/apuntes_router.py`

---

## `/eventos` — `eventos_router.py`

Calendario académico (parciales, feriados, entregas). Todos los endpoints requieren usuario autenticado. La visibilidad para alumnos se filtra según sus inscripciones (eventos globales `materia_id IS NULL` + los de las materias en las que están inscriptos).

### POST /eventos/
**Rol requerido:** admin o profesor (`current_user.role not in ("admin","profesor")` → 403).
**Qué hace:** Crea un evento de calendario, asignando `creado_por = current_user.user_id`. Usa `model_dump(exclude_unset=True)` sobre el body.
**Request body:** `EventoCreate` (= `EventoBase`, `schemas/evento_schema.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| titulo | str | Sí | — |
| tipo | Literal["parcial","parcial_1","parcial_2","final","feriado","asueto","entrega","actividad"] | Sí | — |
| fecha | date | Sí | — |
| fecha_fin | date \| None | No | — |
| materia_id | int \| None | No | `None` = evento global (visible para todos los alumnos). |
| carrera_id | int \| None | No | — |
| descripcion | str \| None | No | — |
| anio | int \| None | No | — |
| semestre | int \| None | No | — |
| archivo_pdf | str \| None | No | — |
| hora | str \| None | No | Formato libre "HH:MM", sin validación de formato a nivel Pydantic. |
| ubicacion | str \| None | No | — |

Nota: `creado_por` y `profesor_nombre` no son parte de `EventoCreate`, así que no son asignables por el cliente.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `EventoOut` creado. |
| 401 | Token inválido/revocado. |
| 403 | `"No autorizado"` si el rol no es admin/profesor. |
| 422 | Body inválido. |

**Archivo:** `app/routers/eventos_router.py`

---

### GET /eventos/
**Rol requerido:** cualquier usuario autenticado.
**Qué hace:** Lista eventos con filtros (`tipo`, `carrera_id`, `materia_id`, `anio`, `semestre`, rango `desde`/`hasta`), ordenados por fecha, paginados. Si `current_user.role == "alumno"`, se restringe a eventos globales (`materia_id IS NULL`) + eventos de materias en las que el alumno está inscripto (vía tabla `Inscripcion` → `oferta.materia_id`). Admin/profesor ven todo sin restricción.
**Query params:** `tipo: str?`, `carrera_id: int?`, `materia_id: int?`, `anio: int?`, `semestre: int?`, `desde: str? (YYYY-MM-DD)`, `hasta: str? (YYYY-MM-DD)`, `skip: int (>=0, default 0)`, `limit: int (1-2000, default 500)`.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `EventoOut`. |
| 401 | Token inválido/revocado. |
| 400/422 | `date.fromisoformat(desde/hasta)` lanza `ValueError` si el formato es inválido — **no está capturado en un try/except**, por lo que probablemente propaga como error 500 no controlado. <!-- TODO: verificar comportamiento exacto de FastAPI/exception handler global ante ValueError no capturado --> |

**Archivo:** `app/routers/eventos_router.py`

---

### GET /eventos/{evento_id}
**Rol requerido:** cualquier usuario autenticado (sin filtro adicional por rol/visibilidad — cualquier usuario logueado puede ver cualquier evento por id, incluso los de materias en las que no está inscripto).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `EventoOut`. |
| 401 | Token inválido/revocado. |
| 404 | `"Evento no encontrado"`. |

**Archivo:** `app/routers/eventos_router.py`

---

### PUT /eventos/{evento_id}
**Rol requerido:** admin o profesor.
**Qué hace:** Actualiza campos parciales (`exclude_unset=True`) con `EventoUpdate`. Cualquier profesor puede editar cualquier evento (no hay chequeo de que sea "su" materia). <!-- TODO: verificar si es intencional -->
**Request body:** `EventoUpdate` (`schemas/evento_schema.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| titulo | str \| None | No | — |
| tipo | TipoEvento \| None | No | — |
| fecha | date \| None | No | — |
| fecha_fin | date \| None | No | — |
| materia_id | int \| None | No | — |
| carrera_id | int \| None | No | — |
| descripcion | str \| None | No | — |
| anio | int \| None | No | — |
| semestre | int \| None | No | — |
| hora | str \| None | No | — |
| ubicacion | str \| None | No | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `EventoOut` actualizado. |
| 401 | Token inválido/revocado. |
| 403 | `"No autorizado"` si el rol no es admin/profesor. |
| 404 | `"Evento no encontrado"`. |
| 422 | Body inválido. |

**Archivo:** `app/routers/eventos_router.py`

---

### DELETE /eventos/{evento_id}
**Rol requerido:** admin o profesor.
**Qué hace:** Borra el evento.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"detail": "Evento eliminado"}`. |
| 401 | Token inválido/revocado. |
| 403 | `"No autorizado"`. |
| 404 | `"Evento no encontrado"`. |

**Archivo:** `app/routers/eventos_router.py`

---

### POST /eventos/cargar-pdf
**Rol requerido:** admin o profesor.
**Qué hace:** Flujo de carga de calendario con IA:
1. Decodifica `payload.pdf_base64` (base64 → bytes); si falla, 400.
2. Llama a `_parsear_pdf_con_gemini(pdf_bytes, anio, semestre, instrucciones)`:
   - Importa `google.genai`; si no está instalado, 500 `"google-genai no instalado..."`.
   - Si no hay `GEMINI_API_KEY` configurada en el entorno (`os.getenv("GEMINI_API_KEY", "")`), 500.
   - Crea cliente Gemini, arma un prompt fijo (pide extraer eventos con campos `titulo`, `tipo`, `fecha`, `fecha_fin`, `descripcion` en JSON) e incluye `anio`, `semestre` e `instrucciones` opcionales del usuario dentro del prompt.
   - Llama a `client.models.generate_content` con `model="gemini-2.0-flash"`, pasando el prompt de texto + el PDF como `types.Blob`.
   - Limpia el texto de fences ```json``` si Gemini los agrega, y hace `json.loads`. Si el JSON es inválido, 500 con los primeros 300 caracteres de la respuesta. Si el resultado no es una lista, 500.
   - Rellena defaults (`fecha_fin=None`, `descripcion=None`, `tipo="actividad"`, `titulo="Sin título"`) por cada evento si faltan.
3. Por cada evento parseado, intenta crear un `EventoCalendario` (con `anio`/`semestre` del payload, `creado_por=current_user.user_id`); si algún evento individual falla (ej. fecha mal formada, `tipo` no válido para el modelo, etc.), se agrega a la lista `errores` **sin abortar el resto** (try/except por evento).
4. Hace commit al final y devuelve cuántos se crearon, la lista de eventos creados y los errores por evento.

**Request body:** `CargaPdfRequest` (`schemas/evento_schema.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| pdf_base64 | str | Sí | `Field(..., description=...)`. PDF completo codificado en base64. |
| nombre_archivo | str | No (default "calendario.pdf") | No se usa realmente en la lógica del endpoint (solo referencia informativa). <!-- TODO: verificar si se usa en otra parte --> |
| anio | int | Sí | Se usa en el prompt a Gemini y se asigna a cada evento creado. |
| semestre | int | Sí | Idem. |
| instrucciones | str \| None | No | Instrucciones adicionales inyectadas literalmente en el prompt de Gemini. |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `CargaPdfResponse {procesados, eventos, errores}`. |
| 400 | `"Base64 inválido"` si `base64.b64decode` falla. |
| 401 | Token inválido/revocado. |
| 403 | `"No autorizado"` si el rol no es admin/profesor. |
| 500 | `"google-genai no instalado..."` si falta el paquete; `"GEMINI_API_KEY no configurada en .env"` si falta la env var; `"Gemini devolvió JSON inválido: ..."` si la respuesta no parsea; `"Gemini no devolvió un array"` si la respuesta no es una lista JSON. |
| 422 | Body inválido según `CargaPdfRequest`. |

**Archivo:** `app/routers/eventos_router.py`

---

### GET /eventos/mes/{anio}/{mes}
**Rol requerido:** cualquier usuario autenticado.
**Qué hace:** Devuelve todos los eventos de un mes calendario específico (calcula primer/último día del mes, maneja diciembre como caso especial). Aplica el mismo filtro de visibilidad para alumnos que `GET /eventos/` (globales + materias inscriptas).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `EventoOut`. |
| 401 | Token inválido/revocado. |
| 422 | `anio`/`mes` no son enteros válidos en la ruta (FastAPI), o `date(anio, mes, 1)` lanza `ValueError` si `mes` está fuera de 1-12 — **no está capturado**, probablemente error 500 no controlado. <!-- TODO: verificar manejo real de mes inválido --> |

**Archivo:** `app/routers/eventos_router.py`

---

### GET /eventos/dia/{fecha_str}
**Rol requerido:** cualquier usuario autenticado.
**Qué hace:** Devuelve los eventos de un día específico, agrupados dentro de un único objeto `EventoDiaOut`, ordenados por `tipo`. Mismo filtro de visibilidad para alumnos.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `EventoDiaOut {fecha, eventos}`. |
| 400 | `"Fecha inválida. Usá YYYY-MM-DD"` si `date.fromisoformat(fecha_str)` falla. |
| 401 | Token inválido/revocado. |

**Archivo:** `app/routers/eventos_router.py`

---

## `/notificaciones` — `notificaciones_router.py`

Suscripciones Web Push (VAPID) y envío de notificación de prueba.

### GET /notificaciones/vapid-public-key
**Rol requerido:** público — **no tiene `Depends(get_current_user)`**, cualquiera puede llamarlo sin token.
**Qué hace:** Devuelve la clave pública VAPID (`get_vapid_keys()` del servicio `notificaciones_push`), necesaria en el navegador para registrar una suscripción push.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"public_key": ...}`. |

**Archivo:** `app/routers/notificaciones_router.py`

---

### POST /notificaciones/subscribe
**Rol requerido:** cualquier usuario autenticado.
**Qué hace:** Guarda o actualiza (upsert manual por `user_id` + `endpoint`) una suscripción Web Push del usuario, con `p256dh`/`auth`/`user_agent` (el user agent se toma del header de la request, no del body).
**Request body:** `dict` crudo (no hay schema Pydantic — se lee directamente del `dict`).
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| endpoint | str | Sí (validado a mano) | Si falta o es falsy → 400. |
| keys | dict | No (default `{}`) | Se leen `keys.get("p256dh", ...)` y `keys.get("auth", ...)` con fallback al valor existente (si es update) o `""` (si es nuevo). |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"mensaje": "Suscripción guardada"}`. |
| 400 | `"endpoint requerido"` si `body.get("endpoint")` es falsy. |
| 401 | Token inválido/revocado. |
| 422 | Body no es un JSON object (por el tipado `dict`). |

**Archivo:** `app/routers/notificaciones_router.py`

---

### DELETE /notificaciones/subscribe
**Rol requerido:** cualquier usuario autenticado.
**Qué hace:** Elimina la(s) suscripción(es) del usuario actual que coincidan con el `endpoint` recibido (filtrado por `user_id == current_user.user_id`, por lo que no puede borrar suscripciones de otros usuarios).
**Request body:** `dict` crudo.
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| endpoint | str | Sí (validado a mano) | Si falta → 400. |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"mensaje": "Suscripción eliminada"}` (incluso si no existía ninguna coincidencia, no valida cuántas filas borró). |
| 400 | `"endpoint requerido"`. |
| 401 | Token inválido/revocado. |

**Archivo:** `app/routers/notificaciones_router.py`

---

### POST /notificaciones/test
**Rol requerido:** cualquier usuario autenticado.
**Qué hace:** Envía una notificación push de prueba real a todas las suscripciones activas del usuario actual, vía `enviar_notificaciones_masivo` (título y cuerpo fijos hardcodeados en el endpoint).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"mensaje": "Notificación enviada", "exitosos": int, "fallidos": int, "total": int}`. |
| 400 | `"No tenés suscripciones push activas. Activá las notificaciones desde tu perfil."` si el usuario no tiene ninguna `SuscripcionPush`. |
| 401 | Token inválido/revocado. |

**Archivo:** `app/routers/notificaciones_router.py`

---

## `/boleta` — `boleta_router.py`

Dos piezas independientes: (1) sello digital verificable (HMAC + QR) y (2) reporte unificado de notas (resumen JSON + PDF).

### GET /boleta/verificar/{codigo}
**Rol requerido:** público — **no tiene `Depends(get_current_user)`**, solo requiere `db` (endpoint pensado para verificación externa de un documento impreso/QR).
**Qué hace:** Decodifica el código con `_verificar_codigo()` (parsea `"UCA-X{user_id:04d}-{firma}"`, recalcula la firma HMAC-SHA256 con `SECRET_KEY` y compara con `hmac.compare_digest`). Si es válido, busca el usuario y devuelve su nombre; si el código está corrupto/inventado o el usuario no existe, devuelve `valido: false` (no lanza 404, responde 200 igual).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"valido": false}` si el código es inválido o el usuario no existe; `{"valido": true, "alumno_nombre": ..., "validado_en": ...}` si es válido. |

**Archivo:** `app/routers/boleta_router.py`

---

### GET /boleta/{user_id}/sello
**Rol requerido:** admin, profesor (solo si `es_profesor_de_alumno(db, current_user.user_id, user_id)` es True), o el propio alumno (`current_user.user_id == user_id`). Doble chequeo: primero rechaza si no es admin/profesor/propio; luego, si es profesor, verifica explícitamente que le dé clase a ese alumno.
**Qué hace:** Genera el código de verificación determinístico (`_codigo_verificacion`) y un QR (librería `qrcode`) codificado en base64 con ese código como payload — para incrustar en el PDF/vista de la boleta.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"codigo": ..., "qr_base64": ..., "validado_en": ...}`. |
| 401 | Token inválido/revocado. |
| 403 | `"No autorizado"` si no es admin/profesor-del-alumno/propio usuario. |
| 404 | `"Usuario no encontrado"` si `user_id` no existe. |

**Archivo:** `app/routers/boleta_router.py`

---

### GET /boleta/resumen
**Rol requerido:** cualquier usuario autenticado; el acceso a datos de otro alumno se resuelve con `_resolver_alumno_id`: sin `alumno_id` o si es el propio usuario → se permite; si es otro alumno → solo admin, o profesor que efectivamente le da clase (`es_profesor_de_alumno`), si no, 403.
**Qué hace:** Arma el resumen académico del alumno objetivo llamando a `services/boleta_data.py::construir_boleta_data(db, target_id)`.
**Query params:** `alumno_id: int?` (si se omite, es el propio usuario).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `BoletaDataOut {resumen, periodos}` (ver campos abajo). |
| 401 | Token inválido/revocado. |
| 403 | `"No autorizado"` (desde `_resolver_alumno_id`) si se pide `alumno_id` de otro usuario sin ser admin/profesor autorizado. |
| 404 | `"Alumno no encontrado"` si `construir_boleta_data` devuelve `None`. |

**Response body (`BoletaDataOut`, `schemas/boleta_schema.py`):**
| Campo | Tipo | Notas |
|---|---|---|
| resumen | `ResumenAcademicoOut` | `promedioGlobal: float`, `materiasAprobadas: int`, `materiasTotales: int`, `avanceCarreraPct: int`, `faltanParaGraduarse: int`. |
| periodos | `list[SemestrePeriodoOut]` | Cada uno: `anio: int`, `semestre: int`, `etiqueta: str`, `promedioSemestre: float`, `materias: list[MateriaOut]` (con `id: str`, `nombre: str`, `p1/p2/tp/final: float\|None`, `promedio: float`, `estado: Literal["aprobado","reprobado","cursando"]`). |

**Archivo:** `app/routers/boleta_router.py`

---

### GET /boleta/pdf
**Rol requerido:** igual que `/boleta/resumen`, vía `_resolver_alumno_id`.
**Qué hace:** Genera el PDF de la boleta con `services/reporte_notas.py::construir_reporte_notas` + `services/boleta_pdf.py::render_boleta_pdf`, según el `scope` pedido (documento completo, por año, o solo semestre actual), y lo devuelve como descarga (`StreamingResponse`, `Content-Disposition: attachment`).
**Query params:**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| alumno_id | int \| None | No | Ver `_resolver_alumno_id`. |
| scope | Literal["global","anio","semestre_actual"] | No (default "global") | — |
| anio | int \| None | No, **excepto si `scope=anio`** (ahí es obligatorio, validado a mano) | — |
| semestre | int \| None | No | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | PDF (`application/pdf`), nombre de archivo `boleta_{scope}.pdf` o `boleta_{scope}_{anio}.pdf` si `scope=anio`. |
| 401 | Token inválido/revocado. |
| 403 | `"No autorizado"` (desde `_resolver_alumno_id`). |
| 404 | `"Alumno no encontrado"` si `construir_reporte_notas` devuelve `None`. |
| 422 | `"El parámetro 'anio' es requerido para scope=anio"` si `scope=anio` y no se envía `anio`. |

**Archivo:** `app/routers/boleta_router.py`

---

## `/horarios` — `horarios_router.py`

Horarios de cursada por materia (día/hora/aula), con validación de solapamiento.

### POST /horarios/
**Rol requerido:** admin, o profesor que efectivamente dicta esa materia (`es_profesor_de_materia`). Si es profesor y no dicta la materia → 403.
**Qué hace:** Crea un horario para una materia. Valida: (1) que la materia exista, (2) que `hora_inicio < hora_fin`, (3) que no exista ya un horario para esa `materia_id` + `dia_semana` + `hora_inicio` exactos (chequeo simple de duplicado exacto, **no** detecta solapamientos parciales entre horarios de la misma materia — a diferencia de `GET /horarios/verificar-solapamiento`, que sí usa lógica de solapamiento real pero para inscripción del alumno). Devuelve el horario creado con `materia_nombre` resuelto.
**Request body:** `HorarioCreate` (= `HorarioBase`, `schemas/horario_schema.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| materia_id | int | Sí | Debe existir (404 si no). |
| dia_semana | int | Sí | `Field(ge=0, le=6)` — validado por Pydantic. |
| hora_inicio | time | Sí | Debe ser menor a `hora_fin` (chequeo manual en el router). |
| hora_fin | time | Sí | — |
| aula | str \| None | No | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `HorarioOut` creado (incluye `materia_nombre`). |
| 401 | Token inválido/revocado. |
| 403 | `"Solo administradores y profesores pueden crear horarios"` si el rol no es admin/profesor; `"No sos el profesor de esta materia"` si es profesor pero no dicta esa materia. |
| 404 | `"Materia no encontrada"`. |
| 400 | `"La hora de inicio debe ser anterior a la hora de fin"`; `"Ya existe un horario para esta materia en ese día y hora"` (duplicado exacto). |
| 422 | Body inválido (ej. `dia_semana` fuera de 0-6). |

**Archivo:** `app/routers/horarios_router.py`

---

### GET /horarios/
**Rol requerido:** cualquier usuario autenticado.
**Qué hace:** Lista horarios (filtro opcional `materia_id`), ordenados por día/hora, resolviendo `materia_nombre` por cada uno (una query adicional por horario — N+1). <!-- TODO: verificar impacto de performance, no es parte del alcance funcional -->
**Query params:** `materia_id: int?`.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `HorarioOut`. |
| 401 | Token inválido/revocado. |

**Archivo:** `app/routers/horarios_router.py`

---

### GET /horarios/materia/{materia_id}
**Rol requerido:** cualquier usuario autenticado.
**Qué hace:** Igual que el listado general pero fijado a una materia por path param; no valida que la materia exista (si no existe, devuelve lista vacía y `materia_nombre=None` en teoría, pero como no hay horarios tampoco se arma la lista).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `HorarioOut` (vacía si la materia no tiene horarios o no existe). |
| 401 | Token inválido/revocado. |

**Archivo:** `app/routers/horarios_router.py`

---

### DELETE /horarios/{horario_id}
**Rol requerido:** admin, o profesor que dicta la materia del horario (`es_profesor_de_materia`). Otros roles/profesores no autorizados → 403.
**Qué hace:** Borra el horario.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"detail": "Horario eliminado"}`. |
| 401 | Token inválido/revocado. |
| 403 | `"No autorizado"` (rol distinto de admin/profesor, o profesor que no dicta esa materia). |
| 404 | `"Horario no encontrado"`. |

**Archivo:** `app/routers/horarios_router.py`

---

### GET /horarios/verificar-solapamiento
**Rol requerido:** solo alumno (`current_user.role != "alumno"` → 403).
**Qué hace:** Verifica si el alumno actual tendría un conflicto de horario al inscribirse en `materia_id`, delegando en `services/pensum.py::verificar_solapamiento_inscripcion(db, current_user.user_id, materia_id)`.
**Query params:** `materia_id: int` (requerido, `Query(...)`).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"tiene_conflicto": bool, "conflictos": list}`. |
| 401 | Token inválido/revocado. |
| 403 | `"Solo alumnos pueden verificar solapamiento"` si el rol no es alumno. |
| 422 | Falta `materia_id` en query. |

**Archivo:** `app/routers/horarios_router.py`

---

## `/admin` — `admin_router.py`

Router de endpoints administrativos sueltos. Según el docstring del archivo, "todo endpoint requiere rol admin".

### GET /admin/dashboard
**Rol requerido:** admin exclusivamente, vía `Depends(require_role("admin"))` (403 si el rol no es "admin"; 401 si no hay token válido).
**Qué hace:** Arma el dashboard administrativo agregando varias métricas en una sola llamada:
- Conteos de `role_counts` (alumnos, profesores), total de materias, total de becados (`es_becado`), trámites pendientes (`Solicitud.estado == "pendiente"`).
- Materias con/sin oferta activa.
- KPIs académicos: `alumnos_activos` (distintos alumnos inscriptos en ofertas activas), `promedio_general` y `aprobacion_pct` calculados vía `services/puntajes_utils.py::promedios_por_alumno` (promedio ponderado real por alumno, no un AVG crudo, según el comentario del código: pesos distintos para parcial/final/directa) comparado contra `APROBACION_MINIMA`, y `asistencia_pct` global (presentes/total de registros de `Asistencia` en ofertas activas).
- Últimos 5 usuarios registrados (`ORDER BY created_at DESC LIMIT 5`).
- "Alertas" de hasta 5 alumnos en riesgo: alumnos con `inasistencia_pct >= 10%` (calculado sobre ofertas activas), ordenados de mayor a menor inasistencia, con su nombre y promedio de notas si existe.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Objeto con `resumen`, `kpis`, `ultimos_usuarios`, `alertas`, `timestamp`. |
| 401 | Token inválido/revocado. |
| 403 | `"No autorizado"` si `current_user.role != "admin"`. |

**Archivo:** `app/routers/admin_router.py`

---

## Resumen de hallazgos de seguridad relevantes (commit 9a6e0bd)

- **`POST /apuntes/`**: el campo `aprobado` del body solo se respeta si `current_user.role == "admin"`; para cualquier otro rol se fuerza a `False` sin importar el valor enviado (línea `data["aprobado"] = current_user.role == "admin" and data.get("aprobado") is True`).
- **`PUT /apuntes/{apunte_id}`**: usa `ApunteUpdate`, que **no declara el campo `aprobado`** — por diseño del schema, es imposible cambiar el estado de aprobación por esta vía, sea cual sea el rol. Solo `PATCH /apuntes/{apunte_id}/aprobar` (admin-only) puede aprobar un apunte.
- Ambos puntos están confirmados leyendo directamente `apuntes_router.py` (líneas 93-108 y 168-191) y `schemas/apunte_schema.py` (líneas 21-31).

## `/becas` — `becas_router.py`

### GET /becas/fuentes
**Rol requerido:** cualquier usuario autenticado (`Depends(get_current_user)`, sin restricción de rol)
**Qué hace:** Lista todas las fuentes de beca (`FuenteBeca`) ordenadas por nombre. Solo lectura, sin filtros.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Listado devuelto (puede ser vacío) |
| 401 | Sin autenticación válida (dependencia `get_current_user`) <!-- TODO: verificar --> |

**Archivo:** `app/routers/becas_router.py`

---

### GET /becas/catalogo
**Rol requerido:** cualquier usuario autenticado (`get_current_user`)
**Qué hace:** Lista el catálogo de becas (`BecaCatalogo`), con filtro opcional por `fuente_id` (query param), ordenado por nombre.

**Query params:**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| fuente_id | int | No | Si se pasa, filtra becas de esa fuente |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Listado devuelto |

**Archivo:** `app/routers/becas_router.py`

---

### POST /becas/catalogo
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Crea una beca nueva en el catálogo, validando primero que la `fuente_id` indicada exista.

**Request body:** `BecaCatalogoCreate` (`app/schemas/financiero.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| nombre | str | Sí | `Field(min_length=2, max_length=200)` |
| fuente_id | int | Sí | Debe existir en `FuenteBeca`, si no → 404 |
| porcentaje_descuento | Decimal | Sí | `Field(ge=0, le=100)` |
| monto_fijo | Decimal | No | Sin validación adicional en el schema |
| requisitos | str | No | — |
| cupos_totales | int | No | — |
| cupos_disponibles | int | No | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Beca creada y devuelta |
| 404 | `fuente = db.query(FuenteBeca)...` no encontrada → "Fuente beca no encontrada" |

**Archivo:** `app/routers/becas_router.py`

---

### POST /becas/postulaciones
**Rol requerido:** alumno o admin (`require_role(["alumno", "admin"])`)
**Qué hace:** El usuario autenticado (`current_user.user_id` como `alumno_id`) postula a una beca del catálogo. Valida que la beca exista, que tenga cupos disponibles y que el alumno no tenga ya una postulación activa (`pendiente` o `en_revision`) para esa misma beca. Crea la postulación en estado `pendiente`.

**Request body:** `PostulacionCreate`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| beca_id | int | Sí | Debe existir en `BecaCatalogo` |
| documentos_storage_keys | List[str] | No | Claves de storage de documentos adjuntos |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Postulación creada |
| 404 | Beca no encontrada |
| 422 | `beca.cupos_disponibles is not None and beca.cupos_disponibles <= 0` → "No hay cupos disponibles para esta beca" |
| 409 | Ya existe postulación activa (`pendiente`/`en_revision`) del mismo alumno para la misma beca |

**Archivo:** `app/routers/becas_router.py`

Nota: nótese que `alumno_id` se toma siempre de `current_user.user_id`, no del body — no hay riesgo de suplantación aquí (a diferencia de otros endpoints del sistema mencionados en el historial de commits sobre mass-assignment).

---

### GET /becas/postulaciones
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Lista postulaciones filtradas **obligatoriamente** por `fuente_id` (query param requerido, sin default) para no mezclar flujos de revisión internos vs. externos; filtro opcional adicional por `estado`. Ordena por `fecha_postulacion` descendente.

**Query params:**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| fuente_id | int | Sí | `Query(...)` — mandatorio, FastAPI devuelve 422 si falta |
| estado | str | No | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Listado devuelto |
| 422 | `fuente_id` ausente (validación automática de FastAPI, no un `raise` explícito en el código) |

**Archivo:** `app/routers/becas_router.py`

---

### GET /becas/mis-postulaciones
**Rol requerido:** alumno (`require_role(["alumno"])`)
**Qué hace:** Devuelve todas las postulaciones del alumno autenticado (`current_user.user_id`), sin necesidad de `fuente_id`, ordenadas por fecha descendente.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Listado devuelto (puede ser vacío) |

**Archivo:** `app/routers/becas_router.py`

---

### PUT /becas/postulaciones/{postulacion_id}/revisar
**Rol requerido:** admin (`require_role("admin")`) — descripto como "Comité"
**Qué hace:** Revisa (aprueba/rechaza/pasa a en_revision) una postulación existente que esté en estado `pendiente` o `en_revision`. Si el nuevo estado es `aprobada`, crea un registro `BecaActiva` para el alumno (periodo_inicio = mes actual, estado `vigente`) y decrementa en 1 los `cupos_disponibles` de la beca (sin bajar de 0).

**Path params:** `postulacion_id: int`

**Request body:** `PostulacionRevisar`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| estado | str | Sí | `Field(pattern="^(en_revision|aprobada|rechazada)$")` |
| motivo_rechazo | str | No | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Postulación actualizada |
| 404 | Postulación no encontrada |
| 409 | `post.estado not in ("pendiente", "en_revision")` → "Postulación ya cerrada (estado: ...)" |

**Archivo:** `app/routers/becas_router.py`

<!-- TODO: verificar — si beca.id no existe en el momento de aprobar (borrada entre postulación y revisión), el código simplemente omite la creación de BecaActiva sin error (if beca: ...), no lanza excepción -->

---

### GET /becas/alumno/{alumno_id}/activas
**Rol requerido:** cualquier usuario autenticado, pero con chequeo manual: solo `admin` o el propio alumno (`current_user.user_id == alumno_id`)
**Qué hace:** Devuelve las becas activas del alumno indicado, vía `get_becas_activas_out` (servicio en `app/services/financiero.py`), que arma un `BecaActivaOut` por cada `BecaActiva` del alumno con datos de beca/fuente.

**Path params:** `alumno_id: int`

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Listado devuelto |
| 403 | `current_user.role != "admin" and current_user.user_id != alumno_id` → "No autorizado" |

**Archivo:** `app/routers/becas_router.py`

---

### GET /becas/reportes/rendicion
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Exporta un archivo Excel (`.xlsx`) de rendición de becas para una fuente dada (nombre exacto, obligatorio), con filtro opcional de período. Genera el archivo con `export_rendicion_excel` (servicio) y lo devuelve como `StreamingResponse` con `Content-Disposition: attachment`.

**Query params:**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| fuente | str | Sí | Nombre exacto de la fuente (ej. "ITAIPU"); debe existir en `FuenteBeca.nombre` |
| periodo | str | No | Ej. "2026-06" |
| formato | str | No | Default `"excel"`; **el parámetro se recibe pero no se usa para decidir el formato real** — el código siempre genera Excel vía `export_rendicion_excel` y responde con media type de xlsx, sin ruta para CSV pese a la descripción "excel \| csv" <!-- TODO: verificar, posible endpoint con comportamiento incompleto respecto al parámetro `formato` --> |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Archivo `.xlsx` devuelto en streaming |
| 404 | `fuente_obj` no encontrada por nombre → `f"Fuente '{fuente}' no encontrada"` |
| 422 (indirecto) | Dentro de `export_rendicion_excel`, si `ws is None` (worksheet activo no encontrado) se lanza `ValueError`, que **no está capturado en el router** — esto propagaría como 500, no 422 <!-- TODO: verificar, el router no envuelve la llamada a export_rendicion_excel en try/except ValueError --> |

**Archivo:** `app/routers/becas_router.py`

---

## `/finanzas` — `finanzas_router.py`

### POST /finanzas/conceptos
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Crea un `ConceptoArancel` (concepto de arancel/cuota) con nombre, carrera opcional, monto base y periodicidad.

**Request body:** `ConceptoArancelCreate`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| nombre | str | Sí | `Field(min_length=2, max_length=200)` |
| carrera_id | int | No | — |
| monto_base | Decimal | Sí | `Field(gt=0)` — monto monetario, tipo `Decimal` (OK, respeta la convención Numeric(12,2)) |
| periodicidad | str | No | Default `"mensual"`, `max_length=80` |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Concepto creado |

**Archivo:** `app/routers/finanzas_router.py`

---

### GET /finanzas/conceptos
**Rol requerido:** admin (`require_role(["admin"])`)
**Qué hace:** Lista conceptos de arancel, por defecto solo activos (`activo == True`); parámetro `incluir_inactivos` para traerlos todos. Filtro opcional `carrera_id` que incluye también conceptos globales (`carrera_id IS NULL`).

**Query params:**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| carrera_id | int | No | — |
| incluir_inactivos | bool | No | Default `False` |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Listado devuelto |

**Archivo:** `app/routers/finanzas_router.py`

---

### PATCH /finanzas/conceptos/{concepto_id}
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Edición parcial de un concepto de arancel (incluye poder activar/desactivar vía `activo`). Aplica solo los campos presentes en el body (`exclude_unset=True`).

**Path params:** `concepto_id: int`

**Request body:** `ConceptoArancelUpdate`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| nombre | str | No | `Field(min_length=2, max_length=200)` |
| monto_base | Decimal | No | `Field(gt=0)` |
| periodicidad | str | No | `max_length=80` |
| activo | bool | No | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Concepto actualizado |
| 404 | Concepto no encontrado |

**Archivo:** `app/routers/finanzas_router.py`

---

### POST /finanzas/cuotas/generar
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Genera un lote de cuotas para un alumno y concepto dados, una por cada período en la lista, aplicando el mayor descuento de beca vigente del alumno (vía `calcular_descuento_beca` dentro del servicio `generar_cuotas_alumno`). La fecha de vencimiento de cada cuota se calcula sumando meses (`relativedelta`) a partir de `fecha_vencimiento_base`. Operación atómica (`db.begin_nested()`).

**Request body:** `GenerarCuotasRequest`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| alumno_id | int | Sí | — |
| concepto_id | int | Sí | Debe existir; si no → 422 |
| periodos | List[str] | Sí | `Field(min_length=1)` — ej. `["2026-01","2026-02"]` |
| fecha_vencimiento_base | date | Sí | Fecha de vencimiento del primer período |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Cuotas generadas y devueltas (lista) |
| 422 | `ValueError` capturado del servicio: `concepto_id` no existe (`f"Concepto arancel {concepto_id} no existe"`) |

**Archivo:** `app/routers/finanzas_router.py`

---

### GET /finanzas/alumno/{alumno_id}/cuotas
**Rol requerido:** cualquier usuario autenticado, con chequeo manual: solo `admin` o el propio alumno
**Qué hace:** Lista las cuotas del alumno, con filtro opcional por `estado`, ordenadas por fecha de vencimiento descendente. Cada cuota se serializa con `cuota_to_out` (incluye trazabilidad de beca, último pago y estado de comprobante).

**Path params:** `alumno_id: int`
**Query params:**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| estado | str | No | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Listado devuelto |
| 403 | `current_user.role != "admin" and current_user.user_id != alumno_id` → "No autorizado" |

**Archivo:** `app/routers/finanzas_router.py`

---

### POST /finanzas/pagos
**Rol requerido:** admin (`require_role(["admin"])`)
**Qué hace:** Registra un pago **inmutable** sobre una cuota (no existen PUT/DELETE para pagos; para correcciones se usa `pago_ajuste_ref_id` + `nota_ajuste`, creando un pago de ajuste). Soporta pagos parciales: la cuota pasa a `pagada` solo cuando la suma de pagos no-ajuste cubre `monto - monto_descuento`. Tras registrar el pago crea un `Comprobante` en estado `pendiente` y dispara en background (`BackgroundTasks`) la emisión fiscal vía `procesar_facturacion` — un fallo del proveedor externo (guaraní.app) no revierte el pago académico. Operación de registro atómica (`db.begin_nested()`).

**Request body:** `PagoCreate`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| cuota_id | int | Sí | Debe existir y no estar `anulada`; si no → 422 |
| monto_pagado | Decimal | Sí | `Field(gt=0)` |
| metodo | str | Sí | `Field(pattern="^(transferencia|efectivo|cheque|tarjeta|deposito)$")` |
| referencia | str | No | — |
| nota_ajuste | str | No | Para pagos de ajuste |
| pago_ajuste_ref_id | int | No | Si está presente, marca el pago como ajuste (`es_ajuste=True`) — no se valida en el schema ni en el servicio que el pago referenciado exista <!-- TODO: verificar --> |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Pago registrado |
| 422 | `ValueError` del servicio: cuota no encontrada (`f"Cuota {cuota_id} no encontrada"`) o cuota `anulada` (`"No se puede pagar una cuota anulada"`) |

**Archivo:** `app/routers/finanzas_router.py`

Nota: no hay validación explícita de que `monto_pagado` no exceda el saldo pendiente (podría sobrepagar sin error) <!-- TODO: verificar, comportamiento no confirmado como bug o diseño intencional -->.

---

### GET /finanzas/pagos/{pago_id}/comprobante
**Rol requerido:** cualquier usuario autenticado, con chequeo manual: alumno solo puede ver comprobantes de sus propias cuotas; cualquier otro rol no-admin es rechazado
**Qué hace:** Obtiene el comprobante fiscal asociado a un pago.

**Path params:** `pago_id: int`

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Comprobante devuelto |
| 404 | Pago no encontrado |
| 403 | Alumno cuya cuota del pago no le pertenece, o rol distinto de `alumno`/`admin` |
| 404 | Comprobante no encontrado para ese pago |

**Archivo:** `app/routers/finanzas_router.py`

---

### POST /finanzas/pagos/{pago_id}/comprobante/reintentar
**Rol requerido:** admin (`require_role(["admin"])`)
**Qué hace:** Fuerza un reintento manual (síncrono, `await`) de la emisión fiscal de un comprobante existente, siempre que no haya superado el máximo de intentos (`MAX_INTENTOS`, constante de `app/services/facturacion_electronica.py`).

**Path params:** `pago_id: int`

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Comprobante reintentado y devuelto (estado actualizado) |
| 404 | Comprobante no encontrado para ese `pago_id` |
| 422 | `comp.intentos >= MAX_INTENTOS` → mensaje con el máximo de intentos |

**Archivo:** `app/routers/finanzas_router.py`

---

### GET /finanzas/comprobantes/pendientes
**Rol requerido:** admin (`require_role(["admin"])`)
**Qué hace:** Lista comprobantes en estado `pendiente`, `error` o `reintentando`, para el panel admin, incluyendo nombre del alumno y monto pagado (resuelto navegando `comprobante.pago.cuota.alumno`).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Listado devuelto (puede ser vacío) |

**Archivo:** `app/routers/finanzas_router.py`

---

### GET /finanzas/alumno/{alumno_id}/estado-deuda-inscripcion
**Rol requerido:** admin (`require_role("admin")`) — descripto como "uso interno"
**Qué hace:** Verifica si el alumno puede inscribirse según su mora (cuotas `pendiente` vencidas respecto de hoy). El umbral de cuotas en mora permitidas (`max_cuotas_mora`) se toma de la carrera del alumno (default 1 si no tiene carrera). Excepción: si el alumno tiene una beca 100% (`tiene_beca_100`), nunca se bloquea. Siempre se llama con `es_admin=True` desde este endpoint, por lo que `override_disponible` siempre es `True` en la respuesta.

**Path params:** `alumno_id: int`

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Estado de deuda devuelto |

**Archivo:** `app/routers/finanzas_router.py`

---

### POST /finanzas/pagos/init
**Rol requerido:** alumno (`require_role("alumno")`)
**Qué hace:** Inicia un pago online vía Stripe Checkout para una cuota del propio alumno. Calcula `monto_a_pagar = cuota.monto - cuota.monto_descuento`, crea un registro `PagoOnline` en estado `pendiente` con un `transaction_id` (`uuid4`), y crea la sesión de Stripe Checkout (`crear_checkout_session`). Si Stripe falla, marca el `PagoOnline` como `error` y guarda el detalle en `gateway_response`.

**Request body:** `PagoOnlineInitRequest`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| cuota_id | int | Sí | Debe existir y pertenecer al alumno autenticado; no debe estar `pagada` |
| success_url | str | No | Si se omite, se arma con `request.base_url` |
| cancel_url | str | No | Igual |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Sesión de Stripe creada, devuelve URL de redirect |
| 404 | Cuota no encontrada |
| 403 | `cuota.alumno_id != current_user.user_id` → "Esta cuota no te pertenece" |
| 400 | `cuota.estado == "pagada"` → "La cuota ya está pagada" |
| 502 | `stripe.error.StripeError` al crear la sesión → "Error al comunicar con Stripe: ..." |
| 503 | `RuntimeError` (Stripe no configurado/disponible) → "Stripe no disponible: ..." |

**Archivo:** `app/routers/finanzas_router.py`

---

### POST /finanzas/pagos/webhook
**Rol requerido:** ninguno — **endpoint público**, sin `Depends` de autenticación de usuario (la seguridad depende de la verificación de firma de Stripe vía `Stripe-Signature` header dentro de `confirmar_pago_webhook`)
**Qué hace:** Recibe el webhook de Stripe. Verifica firma y payload; si el evento es `checkout.session.completed`, busca el `PagoOnline` por `transaction_id` (tomado de `session.metadata`), y si está en estado `pendiente` lo marca `confirmado` (guarda `gateway_response`) y marca la `Cuota` asociada como `pagada`. Si el pago ya no está `pendiente`, no hace nada (idempotencia) y responde `{"status": "already_processed"}`. Si no encuentra `transaction_id` o el `PagoOnline`, responde con `{"status": "ignored"}` / `{"status": "not_found"}` (sin excepción). Para tipos de evento no manejados, responde `{"status": "unhandled_event_type", ...}`.

**Request body:** raw body de Stripe (no un schema Pydantic; se lee con `await request.body()` y se valida la firma con el header `Stripe-Signature`)

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Evento procesado (incluye los casos "ignored"/"not_found"/"already_processed"/"unhandled_event_type", todos con status 200 vía dict de retorno) |
| 400 | Firma inválida o error de parsing (`ValueError` o `stripe.error.SignatureVerificationError`) → "Webhook inválido"; o cualquier otra excepción no prevista al procesar → "Error al procesar webhook" |

**Archivo:** `app/routers/finanzas_router.py`

---

### POST /finanzas/pagos/confirm
**Rol requerido:** admin (`require_role("admin")`) — descripto como "solo pruebas, usar webhook en producción"
**Qué hace:** Confirma o rechaza manualmente un `PagoOnline` por `transaction_id` (bypass del webhook real de Stripe). Si `estado == "confirmado"`, marca el pago y la cuota asociada como pagados; si no, marca el pago como `rechazado`.

**Request body:** `PagoOnlineConfirmRequest`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| transaction_id | str | Sí | Debe existir en `PagoOnline` |
| estado | str | No | Default `"confirmado"`; alternativa implícita `"rechazado"` — **sin validación de patrón/enum en el schema**, cualquier string entra al `if body.estado == "confirmado": ... else: ...` (rama else trata cualquier valor distinto como rechazo) <!-- TODO: verificar si esto es intencional --> |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Confirmado/rechazado, devuelve mensaje y `transaction_id` |
| 404 | Transacción no encontrada |
| 400 | `pago.estado != "pendiente"` → "Transacción ya procesada" |

**Archivo:** `app/routers/finanzas_router.py`

---

### GET /finanzas/pagos/online/{pago_id}
**Rol requerido:** alumno (`require_role("alumno")`)
**Qué hace:** Consulta el estado de un `PagoOnline` propio.

**Path params:** `pago_id: int`

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Estado del pago devuelto |
| 404 | Pago no encontrado |
| 403 | `pago.alumno_id != current_user.user_id` → "Acceso denegado" |

**Archivo:** `app/routers/finanzas_router.py`

---

### GET /finanzas/resumen
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Calcula KPIs para el panel financiero: total recaudado (suma de `Pago.monto_pagado` excluyendo ajustes), cantidad de cuotas `pendiente`/`vencida`, cantidad de becas activas `vigente`, y cantidad de comprobantes pendientes/en error/reintentando.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | KPIs devueltos |

**Archivo:** `app/routers/finanzas_router.py`

---

## `/tramites` — `tramites_router.py`

### GET /tramites/tipos
**Rol requerido:** cualquier usuario autenticado (`get_current_user`)
**Qué hace:** Lista todos los tipos de trámite disponibles (`TipoTramite`), sin filtros ni orden explícito.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Listado devuelto |

**Archivo:** `app/routers/tramites_router.py`

---

### POST /tramites/solicitudes
**Rol requerido:** alumno (`require_role("alumno")`)
**Qué hace:** El alumno autenticado crea una solicitud de trámite de un tipo dado, vía el servicio `crear_solicitud` (`app/services/tramites.py`). Si el tipo de trámite corresponde a un generador automático (`_GENERADORES_AUTO`), el servicio valida además la regularidad académica del alumno antes de permitir la solicitud (debe estar en estado "activo" según `calcular_regularidad`).

**Request body:** `SolicitudCreate`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| tipo_tramite_id | int | Sí | Debe existir en `TipoTramite`; si no → 422 |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Solicitud creada |
| 422 | `ValueError` del servicio: tipo de trámite no existe (`f"Tipo de trámite {tipo_tramite_id} no existe"`), o el alumno no está en estado regular para un trámite que requiere generación automática (mensaje incluye nombre del trámite) |

**Archivo:** `app/routers/tramites_router.py`

<!-- TODO: verificar — el detalle completo de calcular_regularidad() no fue leído; el mensaje de error exacto en ese caso está truncado en el grep, se resume su condición general -->

---

### GET /tramites/solicitudes/mias
**Rol requerido:** cualquier usuario autenticado, con lógica distinta por rol dentro del cuerpo
**Qué hace:** Si el usuario es `admin`, lista TODAS las solicitudes con filtros opcionales por `estado`, `tipo_tramite_id` y búsqueda de texto `q` (nombre o username del alumno, `ilike`). Si es `alumno`, solo lista las propias (sin filtros adicionales aplicados sobre esas mismas query params salvo que se note que `estado`/`tipo_tramite_id`/`q` **no se aplican para el rol alumno**, solo para admin — ver el código: los filtros están dentro del `if current_user.role == "admin":`). Cualquier otro rol es rechazado. Limita a 1000 resultados, ordenados por fecha descendente.

**Query params:**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| estado | str | No | Solo aplicado si el rol es admin |
| tipo_tramite_id | int | No | Solo aplicado si el rol es admin |
| q | str | No | Solo aplicado si el rol es admin; busca en `User.nombre`/`User.username` |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Listado devuelto |
| 403 | Rol distinto de `admin`/`alumno` → "No autorizado" |

**Archivo:** `app/routers/tramites_router.py`

---

### PUT /tramites/solicitudes/{solicitud_id}/resolver
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Resuelve manualmente una solicitud de trámite (marca `resuelta` o `rechazada`). Es un endpoint `multipart/form-data` (usa `Form(...)` y `File(...)`, no un body JSON/Pydantic). Si el estado es `resuelta` y se adjunta un archivo, lo sube a storage (`subir_archivo`) y guarda la `storage_key_resultado`. Si es `rechazada`, guarda el `motivo_rechazo` (y lo limpia si el estado es `resuelta`).

**Path params:** `solicitud_id: int`

**Request (form-data, NO Pydantic body):**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| estado | str (Form) | Sí | Debe ser `"resuelta"` o `"rechazada"` (constante `ESTADOS_RESOLUCION_VALIDOS`); si no → 422 |
| motivo_rechazo | str (Form) | No | Solo se persiste si `estado == "rechazada"` |
| archivo | UploadFile (File) | No | Solo se procesa si `estado == "resuelta"` |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Solicitud resuelta y devuelta |
| 422 | `estado` no está en `("resuelta", "rechazada")` |
| 404 | Solicitud no encontrada |
| 422 | `ValueError` de `subir_archivo`: extensión no permitida, o archivo excede el tamaño máximo permitido para el prefijo `"tramite"` (límites definidos en `app/services/storage.py`, no confirmados en detalle) <!-- TODO: verificar límites exactos de tamaño/extensión para prefix "tramite" --> |

**Archivo:** `app/routers/tramites_router.py`

---

### GET /tramites/solicitudes/{solicitud_id}/descargar
**Rol requerido:** cualquier usuario autenticado, con chequeo manual: admin o el propio alumno dueño de la solicitud
**Qué hace:** Devuelve una URL firmada (temporal) para descargar el resultado de una solicitud ya resuelta, vía `obtener_url_firmada` (`app/services/storage.py`).

**Path params:** `solicitud_id: int`

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"download_url": ...}` devuelto |
| 404 | Solicitud no encontrada |
| 403 | `current_user.role != "admin" and current_user.user_id != solicitud.alumno_id` → "No autorizado" |
| 404 | `solicitud.storage_key_resultado` vacío → "La solicitud todavía no tiene un resultado disponible" |

**Archivo:** `app/routers/tramites_router.py`

---

### GET /tramites/stats
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Calcula KPIs de solicitudes de trámite agrupando por `estado` (total, pendientes, en_proceso, resueltas, rechazadas).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | KPIs devueltos |

**Archivo:** `app/routers/tramites_router.py`

---

## `/pasantias` — `pasantias_router.py`

### GET /pasantias/empresas
**Rol requerido:** cualquier usuario autenticado (`get_current_user`)
**Qué hace:** Lista empresas receptoras con `convenio_activo` verdadero.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Listado devuelto |

**Archivo:** `app/routers/pasantias_router.py`

---

### GET /pasantias/profesores
**Rol requerido:** cualquier usuario autenticado (`get_current_user`)
**Qué hace:** Lista usuarios con `role == "profesor"` (id, nombre, email) para usarlos como tutores académicos. Si `nombre` es null, usa `f"Prof. #{p.id}"` como fallback.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Listado devuelto (lista de dicts, no un schema Pydantic estricto — `response_model=list[dict]`) |

**Archivo:** `app/routers/pasantias_router.py`

---

### GET /pasantias/solicitudes
**Rol requerido:** cualquier usuario autenticado, con lógica por rol dentro del cuerpo
**Qué hace:** Si admin: lista TODAS las pasantías, con filtro opcional `estado`. Si alumno: solo las propias. Cualquier otro rol es rechazado. Limita a 1000, ordenadas por `fecha_inicio` descendente. Incluye datos de alumno, empresa y tutor académico vía `joinedload`.

**Query params:**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| estado | str | No | Solo aplicado si el rol es admin |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Listado devuelto |
| 403 | Rol distinto de `admin`/`alumno` → "No autorizado" |

**Archivo:** `app/routers/pasantias_router.py`

---

### POST /pasantias/empresas
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Registra una nueva empresa receptora, validando que no exista ya una con el mismo nombre (vía servicio `crear_empresa`).

**Request body:** `EmpresaReceptoraCreate`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| nombre | str | Sí | Sin `Field`/validaciones adicionales en el schema; debe ser único (validado en servicio) |
| rubro | str | No | — |
| contacto | str | No | — |
| telefono | str | No | — |
| email | str | No | Sin validación de formato email (tipo `str`, no `EmailStr`) <!-- TODO: verificar si es intencional --> |
| convenio_activo | bool | No | Default `False` |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Empresa creada |
| 422 | `ValueError` del servicio: `f"La empresa '{nombre}' ya está registrada"` |

**Archivo:** `app/routers/pasantias_router.py`

---

### POST /pasantias/solicitudes
**Rol requerido:** alumno (`require_role("alumno")`)
**Qué hace:** El alumno autenticado solicita una pasantía en una empresa dada, con fecha de inicio y horas requeridas. `alumno_id` se toma de `current_user.user_id`.

**Request body:** `PasantiaCreate`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| empresa_id | int | Sí | Debe existir; si no → 422 |
| fecha_inicio | date | Sí | — |
| horas_requeridas | int | Sí | Sin validación de rango (podría ser negativo o 0; no hay `Field(gt=0)`) <!-- TODO: verificar si es intencional --> |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Pasantía creada |
| 422 | `ValueError` del servicio: "Empresa no encontrada" |

**Archivo:** `app/routers/pasantias_router.py`

---

### PUT /pasantias/{id}/aprobar
**Rol requerido:** admin o profesor (`require_role(["admin", "profesor"])`)
**Qué hace:** Aprueba una solicitud de pasantía, asignándole un tutor académico (debe ser un usuario con `role == "profesor"`), y cambia el estado a `en_curso`.

**Path params:** `id: int`
**Query params (NO body):**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| tutor_id | int | Sí | Parámetro simple de función sin `Query(...)` explícito — FastAPI lo trata como query param obligatorio ya que no coincide con un path param y no tiene default. Debe ser un `User` con `role == "profesor"`; si no → 422 |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Pasantía aprobada |
| 422 | `ValueError` del servicio: "Pasantía no encontrada", o "Tutor académico no encontrado o no es profesor" |

**Archivo:** `app/routers/pasantias_router.py`

Nota de seguridad: cualquier usuario con rol `profesor` (no necesariamente el tutor asignado) puede aprobar cualquier pasantía y asignar como tutor a cualquier otro profesor — no hay chequeo de que el profesor autenticado sea el mismo `tutor_id` que se está asignando. <!-- TODO: verificar si es el comportamiento esperado -->

---

### PUT /pasantias/{id}/horas
**Rol requerido:** admin o profesor (`require_role(["admin", "profesor"])`), con chequeo adicional dentro del servicio: si no es admin, debe ser el tutor académico asignado a esa pasantía específica
**Qué hace:** Actualiza `horas_completadas` de una pasantía.

**Path params:** `id: int`

**Request body:** `PasantiaHorasUpdate`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| horas_completadas | int | Sí | Sin validación de rango (podría ser negativo, o mayor a `horas_requeridas`, sin error) <!-- TODO: verificar si es intencional --> |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Pasantía actualizada |
| 403 | `PermissionError` del servicio: `current_user.role != "admin" and current_user.user_id != pasantia.tutor_academico_id` → "No autorizado" |
| 422 | `ValueError` del servicio: "Pasantía no encontrada" |

**Archivo:** `app/routers/pasantias_router.py`

---

### POST /pasantias/{id}/informes
**Rol requerido:** admin, profesor o alumno (`require_role(["admin", "profesor", "alumno"])`), con chequeo adicional en el servicio (`autorizado`) — según el código leído, el servicio valida que sea admin, el tutor asignado, o el propio alumno de la pasantía (no confirmado el detalle exacto de la condición para alumno) <!-- TODO: verificar la condición completa de `autorizado` en app/services/pasantia.py, el grep solo mostró parte de la expresión -->
**Qué hace:** Sube un informe de pasantía (tipo indicado por form, ej. "parcial"/"final") con archivo opcional adjunto a storage (prefix `"informes_pasantia"`).

**Path params:** `id: int`

**Request (form-data, NO Pydantic body):**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| tipo | str (Form) | Sí | — |
| archivo | UploadFile (File) | No | Si se adjunta, se sube vía `subir_archivo` |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Informe creado |
| 403 | `PermissionError` del servicio: "No autorizado" (usuario no autorizado para esta pasantía) |
| 422 | `ValueError` del servicio: "Pasantía no encontrada"; también puede propagarse un `ValueError` de `subir_archivo` (extensión/tamaño no permitido) — el router captura genéricamente `ValueError` así que también resultaría en 422 |

**Archivo:** `app/routers/pasantias_router.py`

---

### PUT /pasantias/{id}/rechazar
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Rechaza una pasantía, cambiando su estado a `rechazada` y guardando un motivo opcional.

**Path params:** `id: int`
**Query params (NO body):**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| motivo | str \| None | No | Parámetro de función simple (`motivo: str | None = None`), tratado como query param opcional por FastAPI |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Pasantía rechazada |
| 422 | `ValueError` del servicio: "Pasantía no encontrada" |

**Archivo:** `app/routers/pasantias_router.py`

---

### PUT /pasantias/{id}/finalizar
**Rol requerido:** admin o profesor (`require_role(["admin", "profesor"])`), con chequeo adicional en el servicio: si no es admin, debe ser el tutor académico asignado
**Qué hace:** Finaliza una pasantía, exigiendo que `horas_completadas >= horas_requeridas`.

**Path params:** `id: int`

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Pasantía finalizada |
| 403 | `PermissionError` del servicio: usuario no es admin ni el tutor asignado → "No autorizado" |
| 422 | `ValueError` del servicio: "Pasantía no encontrada", o `f"Horas incompletas: {horas_completadas}/{horas_requeridas}"` |

**Archivo:** `app/routers/pasantias_router.py`

## `/pensum` — `pensum_router.py`

### POST /pensum/carreras/{carrera_id}/materias
**Rol requerido:** admin (chequeo manual `current_user.role != "admin"` dentro del cuerpo; requiere estar autenticado vía `get_current_user`)
**Qué hace:** Agrega una materia a la malla curricular (pensum) de una carrera, creando un registro `PensumMateria`. Verifica que la carrera y la materia existan y que la combinación carrera+materia no esté ya en la malla.
**Request body:** `schemas.pensum.PensumMateriaCreate`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| materia_id | int | Sí | — |
| semestre | int | Sí | — |
| creditos | int | Sí | — |
| es_electiva | bool \| null | No | Default `False` si es `None` (`data.es_electiva or False`) |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | `current_user.role != "admin"` |
| 404 | La carrera (`carrera_id`) no existe |
| 404 | La materia (`data.materia_id`) no existe |
| 400 | Ya existe un `PensumMateria` con ese `carrera_id` + `materia_id` |
| 200 | Creado correctamente, devuelve `PensumMateriaOut` (incluye `materia_nombre`) |

**Archivo:** `app/routers/pensum_router.py`

---

### DELETE /pensum/carreras/{carrera_id}/materias/{pensum_materia_id}
**Rol requerido:** admin
**Qué hace:** Elimina una materia de la malla de una carrera (borra el registro `PensumMateria`).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | `current_user.role != "admin"` |
| 404 | No existe `PensumMateria` con ese `id` y `carrera_id` |
| 200 | `{"detail": "Materia removida de la malla"}` |

**Archivo:** `app/routers/pensum_router.py`

---

### PATCH /pensum/materias/{pensum_materia_id}
**Rol requerido:** admin
**Qué hace:** Actualiza parcialmente un registro de `PensumMateria` (semestre, créditos, es_electiva) usando `model_dump(exclude_unset=True)`, y devuelve el objeto actualizado con el nombre/código de la materia.
**Request body:** `PensumMateriaUpdate` (clase local definida dentro del propio router, no en `schemas/pensum_schema.py`)
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| semestre | int \| null | No | Solo se aplica si viene explícito en el payload (`exclude_unset`) |
| creditos | int \| null | No | Ídem |
| es_electiva | bool \| null | No | Ídem |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | `current_user.role != "admin"` |
| 404 | No existe `PensumMateria` con ese id |
| 200 | Actualizado, devuelve `PensumMateriaOut` |

**Archivo:** `app/routers/pensum_router.py`

---

### GET /pensum/correlatividades
**Rol requerido:** cualquier usuario autenticado (solo `get_current_user`, sin restricción de rol)
**Qué hace:** Lista correlatividades (prerrequisitos entre materias). Si se pasa `carrera_id` como query param, filtra solo las correlatividades de materias que pertenecen a la malla de esa carrera.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `CorrelatividadOut` (puede ser vacía) |

**Archivo:** `app/routers/pensum_router.py`

---

### POST /pensum/correlatividades
**Rol requerido:** admin
**Qué hace:** Crea una correlatividad (prerrequisito) entre dos materias. Valida que no sea auto-referencial, que el tipo sea válido, que ambas materias existan y, si la materia ya está en una malla, valida la estructura de correlatividad vía `validar_correlatividad_estructural` (servicio `services/pensum.py`).
**Request body:** `schemas.pensum.CorrelatividadCreate`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| materia_id | int | Sí | — |
| prerrequisito_id | int | Sí | Debe ser distinto de `materia_id` |
| tipo | str | Sí | Debe ser `"aprobada"` o `"cursando"` |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | `current_user.role != "admin"` |
| 422 | `materia_id == prerrequisito_id` |
| 422 | `tipo` no es `"aprobada"` ni `"cursando"` |
| 404 | `materia_id` o `prerrequisito_id` no existe como `Materia` (mensaje incluye el id faltante) |
| 422 | `validar_correlatividad_estructural` devuelve `valido=False` (p.ej. ciclo de correlatividades) — detail = `validacion["error"]` <!-- TODO: verificar el detalle exacto de validar_correlatividad_estructural, no leído en este análisis --> |
| 200 | Creada, devuelve `CorrelatividadOut` |

**Archivo:** `app/routers/pensum_router.py`

---

### DELETE /pensum/correlatividades/{correlatividad_id}
**Rol requerido:** admin
**Qué hace:** Elimina una correlatividad por id.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | `current_user.role != "admin"` |
| 404 | No existe la correlatividad |
| 200 | `{"detail": "Correlatividad eliminada"}` |

**Archivo:** `app/routers/pensum_router.py`

---

### GET /pensum/carreras/{carrera_id}
**Rol requerido:** cualquier usuario autenticado (sin chequeo de rol)
**Qué hace:** Devuelve la malla curricular completa de una carrera (todas las `PensumMateria` ordenadas por semestre, con nombre y código de materia).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 404 | La carrera no existe |
| 200 | Lista de `PensumMateriaOut` |

**Archivo:** `app/routers/pensum_router.py`

---

### GET /pensum/alumno/{alumno_id}/avance
**Rol requerido:** admin, o el propio alumno (`current_user.user_id == alumno_id`)
**Qué hace:** Calcula y devuelve el avance del alumno en toda la malla de su carrera: estado de cada materia (aprobada/cursando/reprobada/pendiente/bloqueada), nota, pendientes (prerrequisitos no cumplidos) y prerrequisitos completos. Como efecto secundario, hace upsert de `AvanceAlumnoPensum` por cada materia de la malla (crea o actualiza el estado) y hace `db.commit()`.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | No es admin ni es el propio alumno |
| 404 | El alumno (`User`) no existe |
| 200 | `[]` si el alumno no tiene `carrera_id` asignada; si no, lista de `AvanceMateriaOut` |

**Archivo:** `app/routers/pensum_router.py`

---

### GET /pensum/alumno/{alumno_id}/creditos
**Rol requerido:** admin, o el propio alumno (`current_user.user_id == alumno_id`)
**Qué hace:** Calcula los créditos acumulados (suma de créditos de materias con nota aprobatoria, vía `_tiene_nota_aprobatoria_cached`) contra los créditos totales de la carrera del alumno.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | No es admin ni es el propio alumno |
| 404 | El alumno no existe |
| 200 | Si el alumno no tiene `carrera_id`: `CreditosAlumnoOut(creditos_acumulados=0, creditos_totales=None)`. Si no: créditos reales calculados |

**Archivo:** `app/routers/pensum_router.py`

---

## `/graduacion` — `graduacion_router.py`

### GET /graduacion/candidatos
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Lista paginada (`skip`/`limit`) de alumnos con su condición de egreso resuelta (créditos, PPA, pasantía, estado del proceso de graduación si existe). Filtros opcionales `carrera_id` y `q` (búsqueda por nombre/username/email). Delegado en `services/graduacion.py::listar_candidatos`.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no es admin (vía `require_role`) |
| 200 | `CandidatosGraduacionPageOut` con `items` y `total` |

**Archivo:** `app/routers/graduacion_router.py`

---

### GET /graduacion/procesos/{id}/etapas
**Rol requerido:** admin, o el alumno dueño del proceso (`_verificar_acceso_alumno`)
**Qué hace:** Lista las etapas de tesis (`EtapaTesis`) de un proceso de graduación, ordenadas por id.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 404 | El `ProcesoGraduacion` con ese `id` no existe |
| 403 | No es admin ni es el alumno dueño del proceso |
| 200 | Lista de `EtapaTesisOut` (puede ser vacía) |

**Archivo:** `app/routers/graduacion_router.py`

---

### GET /graduacion/alumno/{id}/condicion
**Rol requerido:** admin, o el propio alumno
**Qué hace:** Verifica y devuelve la condición de egreso del alumno (créditos aprobados vs totales, PPA actual vs mínimo institucional, pasantía) vía `services/graduacion.py::verificar_condicion_egreso`. Si el alumno no existe, el service devuelve un dict con todo en `False`/`None` y `motivo="Alumno no encontrado"` (no lanza 404).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | No es admin ni el propio alumno |
| 200 | `CondicionEgresoOut` (incluso si el alumno no existe, ver nota arriba) |

**Archivo:** `app/routers/graduacion_router.py`

---

### POST /graduacion/procesos
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Inicia un proceso de graduación para un alumno (`services/graduacion.py::iniciar_proceso`): valida que no tenga ya un proceso activo (`en_proceso` o `tesis_en_curso`) y que cumpla condición de egreso; crea el `ProcesoGraduacion`.
**Request body:** `ProcesoGraduacionCreate`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| alumno_id | int | Sí | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no es admin |
| 422 | El alumno ya tiene un proceso de graduación activo (`ValueError` → capturado y convertido a 422) |
| 422 | El alumno no cumple condiciones de egreso (detail incluye el motivo) |
| 200 | Proceso creado, devuelve `ProcesoGraduacionOut` enriquecido con nombres de alumno/tutor |

**Archivo:** `app/routers/graduacion_router.py`

---

### PUT /graduacion/procesos/{id}/tutor
**Rol requerido:** admin
**Qué hace:** Asigna un tutor (debe ser un `User` con `role == "profesor"`) a un proceso de graduación existente.
**Request body:** `ProcesoGraduacionTutorUpdate`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| tutor_id | int | Sí | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no es admin |
| 422 | El proceso de graduación no existe (`ValueError` "Proceso de graduación no encontrado") |
| 422 | `tutor_id` no corresponde a un `User` con `role == "profesor"` |
| 200 | Devuelve `ProcesoGraduacionOut` enriquecido |

**Archivo:** `app/routers/graduacion_router.py`

---

### PUT /graduacion/procesos/{id}/etapas/{eid}
**Rol requerido:** admin
**Qué hace:** Actualiza el estado (y opcionalmente observaciones) de una etapa de tesis específica.
**Request body:** `EtapaTesisUpdate`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| estado | str | Sí | Sin validación de valores permitidos en el schema <!-- TODO: verificar si hay enum de estados válido en otro lado --> |
| observaciones | str \| null | No | Solo se aplica si no es `None` |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no es admin |
| 422 | La etapa no existe (`ValueError` "Etapa no encontrada") |
| 200 | Devuelve `EtapaTesisOut` actualizado |

**Archivo:** `app/routers/graduacion_router.py`

---

### GET /graduacion/procesos/{id}/solvencia
**Rol requerido:** admin, o el alumno dueño del proceso
**Qué hace:** Lista las verificaciones de solvencia (financiera/biblioteca) asociadas a un proceso de graduación.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 404 | El proceso no existe |
| 403 | No es admin ni el alumno dueño |
| 200 | Lista de `VerificacionSolvenciaOut` (puede ser vacía) |

**Archivo:** `app/routers/graduacion_router.py`

---

### GET /graduacion/procesos/{id}/documentos-cones
**Rol requerido:** admin, o el alumno dueño del proceso
**Qué hace:** Endpoint placeholder — no integra realmente con CONES. Solo valida existencia del proceso y acceso, y devuelve un mensaje fijo.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 404 | El proceso no existe |
| 403 | No es admin ni el alumno dueño |
| 200 | `{"mensaje": "Endpoint pendiente de integración con CONES"}` (placeholder, sin lógica real) |

**Archivo:** `app/routers/graduacion_router.py`

---

## `/equivalencias` — `equivalencias_router.py`

### GET /equivalencias/solicitudes
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Lista todas las solicitudes de equivalencia (hasta 1000, ordenadas desc por id), con filtro opcional por `estado` vía query param. Enriquece cada solicitud con `alumno_nombre`.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no es admin |
| 200 | Lista de `SolicitudEquivalenciaOut` |

**Archivo:** `app/routers/equivalencias_router.py`

---

### GET /equivalencias/materias
**Rol requerido:** cualquier usuario autenticado (solo `get_current_user`)
**Qué hace:** Devuelve lista simple (id, nombre, codigo) de todas las materias, para usarlas como opciones al crear equivalencias.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `dict` con `id`, `nombre`, `codigo` (codigo `""` si es None) |

**Archivo:** `app/routers/equivalencias_router.py`

---

### POST /equivalencias/solicitudes
**Rol requerido:** alumno (`require_role("alumno")`)
**Qué hace:** El alumno autenticado crea una solicitud de equivalencia. Valida que no tenga ya una solicitud en estado `pendiente` o `en_proceso`. `alumno_id` se toma de `current_user.user_id`, no del body (no hay mass-assignment).
**Request body:** `SolicitudEquivalenciaCreate`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| tipo | str | Sí | Sin restricción de valores en el schema <!-- TODO: verificar si hay enum de tipos válido en otro lado --> |
| universidad_origen | str \| null | No | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no tiene rol `alumno` |
| 422 | Ya existe una solicitud pendiente/en_proceso para ese alumno (`ValueError`) |
| 200 | Solicitud creada, devuelve `SolicitudEquivalenciaOut` |

**Archivo:** `app/routers/equivalencias_router.py`

---

### PUT /equivalencias/{id}/materias/{mid}/resolver
**Rol requerido:** admin
**Qué hace:** Resuelve (aprueba/rechaza) una materia específica dentro de una solicitud de equivalencia. Si se aprueba con `materia_destino_id`, integra el resultado en el expediente del alumno (crea/actualiza `ExpedienteMateria` con nota fija 6.0 y actualiza `AvanceAlumnoPensum` a "aprobada"), y sincroniza el estado global de la solicitud padre (`resuelta`/`rechazada`/`en_proceso` según queden materias pendientes).
**Request body:** `EquivalenciaMateriaResolver`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| resolucion | str | Sí | Se compara contra `"aprobada"` literal para decidir si se integra al expediente; sin enum validado en el schema <!-- TODO: verificar valores permitidos --> |
| materia_destino_id | int \| null | No | Requerido implícitamente para que se aplique la integración a expediente |
| motivo | str \| null | No | No se usa en el service leído (se recibe pero no se persiste en `resolver_materia`) <!-- TODO: verificar si `motivo` se usa en otro lugar --> |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no es admin |
| 422 | No existe `EquivalenciaMateria` con ese `id`(solicitud)/`mid`(materia_eq) (`ValueError` "Equivalencia de materia no encontrada") |
| 200 | Devuelve `EquivalenciaMateriaOut` |

**Archivo:** `app/routers/equivalencias_router.py`

---

### PUT /equivalencias/{solicitud_id}/resolver
**Rol requerido:** admin
**Qué hace:** Variante que resuelve automáticamente la **primera** materia pendiente (`resolucion IS NULL`) de una solicitud, sin necesidad de indicar el id de materia. Reutiliza `resolver_materia` del service con la misma lógica de integración a expediente que el endpoint anterior.
**Request body:** `EquivalenciaMateriaResolver` (mismos campos que arriba)
**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no es admin |
| 404 | No hay materias pendientes (`resolucion IS NULL`) en la solicitud |
| 422 | Error de `resolver_materia` (p. ej. condición de carrera interna) — no debería ocurrir dado que el registro se acaba de consultar, pero está capturado igual |
| 200 | Devuelve `EquivalenciaMateriaOut` |

**Archivo:** `app/routers/equivalencias_router.py`

---

### POST /equivalencias/examenes-suficiencia
**Rol requerido:** admin
**Qué hace:** Registra un examen de suficiencia (sin resultado inicial) para un alumno y materia. Valida que `alumno_id` corresponda a un `User` real con `role == "alumno"`.
**Request body:** `ExamenSuficienciaCreate`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| alumno_id | int | Sí | Debe existir como `User` con `role == "alumno"` |
| materia_id | int | Sí | No se valida existencia contra tabla `Materia` en este endpoint <!-- TODO: verificar si `crear_examen_suficiencia` valida materia_id --> |
| fecha | date | Sí | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no es admin |
| 422 | `alumno_id` no existe o no es alumno |
| 422 | Excepción `ValueError` del service (no se observó ninguna condición que la lance en `crear_examen_suficiencia` actual — el service simplemente inserta) |
| 200 | Devuelve `ExamenSuficienciaOut` (con `resultado=None`) |

**Archivo:** `app/routers/equivalencias_router.py`

---

### GET /equivalencias/alumno/{id}
**Rol requerido:** admin, o el propio alumno; además el rol del usuario autenticado debe ser exactamente `"admin"` o `"alumno"` (chequeo doble)
**Qué hace:** Devuelve todas las solicitudes de equivalencia del alumno indicado, con `alumno_nombre` enriquecido.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | No es admin y `current_user.user_id != id` |
| 403 | El rol del usuario no es `"admin"` ni `"alumno"` (p. ej. `"profesor"` intentando acceder a su propio id, caso que no debería darse pero está bloqueado igual) |
| 200 | Lista de `SolicitudEquivalenciaOut` |

**Archivo:** `app/routers/equivalencias_router.py`

---

## `/examenes` — `examenes_router.py`

### GET /examenes/
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Lista todos los exámenes (tabla `Examen`), con filtros opcionales `periodo`, `materia_id`, `estado`, ordenados por fecha descendente.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no es admin |
| 200 | Lista de `ExamenOut` |

**Archivo:** `app/routers/examenes_router.py`

---

### POST /examenes/
**Rol requerido:** admin
**Qué hace:** Crea un examen (final/parcial/etc.) asociado a una materia.
**Request body:** `ExamenCreate`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| materia_id | int | Sí | Debe existir como `Materia` |
| fecha | date | Sí | — |
| hora_inicio | str \| null | No | — |
| hora_fin | str \| null | No | — |
| aula | str \| null | No | — |
| tipo | str | No | Default `"final"` |
| periodo | str | Sí | — |
| cupos | int \| null | No | — |
| profesor_id | int \| null | No | No se valida existencia del profesor en este endpoint <!-- TODO: verificar --> |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no es admin |
| 404 | `materia_id` no existe como `Materia` |
| 200 | Examen creado, devuelve `ExamenOut` (estado inicial definido por default de la columna en el modelo, no seteado explícitamente aquí — <!-- TODO: verificar default de `Examen.estado` en models/examen.py --> probablemente `"programado"` según el filtro usado en `/disponibles`) |

**Archivo:** `app/routers/examenes_router.py`

---

### GET /examenes/disponibles
**Rol requerido:** cualquier usuario autenticado (solo `get_current_user`)
**Qué hace:** Lista los exámenes con `estado == "programado"` (filtros opcionales `periodo`, `materia_id`), calculando para cada uno cupos disponibles, si el alumno autenticado (`current_user.user_id`) ya está inscripto, y nombre de materia/profesor.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `ExamenDisponible` (puede ser vacía) |

**Archivo:** `app/routers/examenes_router.py`

---

### GET /examenes/inscriptos
**Rol requerido:** cualquier usuario autenticado
**Qué hace:** Lista las inscripciones activas (`estado == "inscripto"`) del usuario autenticado a exámenes, con detalle del examen y nombre de materia.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `InscripcionExamenDetalle` (puede ser vacía) |

**Archivo:** `app/routers/examenes_router.py`

---

### POST /examenes/inscripciones
**Rol requerido:** alumno o admin (`require_role(["alumno", "admin"])`)
**Qué hace:** Inscribe al usuario autenticado (`current_user.user_id`, no viene del body) a un examen. Valida que el examen exista, esté en estado `"programado"`, que haya cupos disponibles y que no exista ya una inscripción activa duplicada del mismo alumno al mismo examen.
**Request body:** `InscripcionExamenCreate`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| examen_id | int | Sí | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no tiene rol `alumno` ni `admin` |
| 404 | El examen no existe |
| 422 | `examen.estado != "programado"` (detail incluye el estado actual) |
| 422 | No hay cupos disponibles (`inscritos >= examen.cupos`, solo si `cupos` no es `None`) |
| 409 | Ya existe una inscripción activa del mismo alumno a ese examen |
| 200 | Inscripción creada, devuelve `InscripcionExamenOut` |

**Archivo:** `app/routers/examenes_router.py`

---

### DELETE /examenes/inscripciones/{inscripcion_id}
**Rol requerido:** cualquier usuario autenticado, pero solo puede cancelar el dueño de la inscripción o un admin (chequeo manual)
**Qué hace:** Cancela una inscripción a examen (cambia `estado` a `"cancelada"` y setea `cancelado_en`).
**Respuestas:**
| Código | Cuándo |
|---|---|
| 404 | La inscripción no existe |
| 403 | El usuario no es admin y no es el dueño de la inscripción |
| 409 | La inscripción no está en estado `"inscripto"` (ya cancelada u otro estado) — detail incluye el estado actual |
| 200 | Cancelada, devuelve `InscripcionExamenOut` |

**Archivo:** `app/routers/examenes_router.py`

---

## `/expediente` — `expediente_router.py`

### POST /expediente/cerrar-materia
**Rol requerido:** admin
**Qué hace:** Cierra formalmente una materia cursada por un alumno: calcula la nota final ponderada a partir de los puntajes cargados (`Puntaje`) usando los pesos de evaluación de la materia, determina condición `aprobada`/`reprobada` según `APROBACION_MINIMA`, y hace upsert en `ExpedienteMateria` (crea o actualiza si ya existía un cierre previo para esa oferta).
**Request body:** `CerrarMateriaIn`
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| alumno_id | int | Sí | Debe existir como `User` |
| oferta_materia_id | int | Sí | Debe existir como `OfertaMateria`; su materia debe estar en el pensum de la carrera del alumno |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no es admin |
| 404 | El alumno no existe |
| 404 | La oferta (`oferta_materia_id`) no existe |
| 404 | La materia de la oferta no está en el pensum de la carrera del alumno |
| 422 | El alumno no tiene ninguna nota cargada para esa oferta (`nota_final` calculado es `None`) |
| 200 | Cierre creado/actualizado, devuelve `ExpedienteMateriaOut` |

**Archivo:** `app/routers/expediente_router.py`

---

### GET /expediente/alumno/{alumno_id}/ppa
**Rol requerido:** admin, o el propio alumno
**Qué hace:** Calcula el PPA (promedio ponderado acumulado) del alumno vía `services/expediente.py::calcular_ppa`.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | No es admin ni el propio alumno |
| 200 | `PPAOut` (`ppa`, `creditos_computados`) |

**Archivo:** `app/routers/expediente_router.py`

---

### GET /expediente/alumno/{alumno_id}
**Rol requerido:** admin, o el propio alumno
**Qué hace:** Devuelve el expediente completo del alumno: todas las materias cerradas (`ExpedienteMateria`) con nombre de materia y periodo, agrupadas por periodo con agregados (créditos, aprobadas, reprobadas, PPA del periodo). Como efecto secundario, hace upsert de `ExpedienteSemestre` por cada periodo encontrado y `db.commit()`.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | No es admin ni el propio alumno |
| 200 | `ExpedienteAlumnoOut` (`materias`, `semestres`) |

**Archivo:** `app/routers/expediente_router.py`

---

### GET /expediente/alumno/{alumno_id}/regularidad
**Rol requerido:** admin, o el propio alumno
**Qué hace:** Calcula el estado de regularidad académica del alumno vía `services/expediente.py::calcular_regularidad`, y hace upsert del resultado en `RegularidadAlumno`.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | No es admin ni el propio alumno |
| 200 | `RegularidadOut` (`estado`, `motivo`, `ppa_acumulado`) |

**Archivo:** `app/routers/expediente_router.py`

---

## `/reportes` — `reportes_router.py`

Todos los endpoints de este router usan la dependencia local `get_admin_user` (definida en el propio archivo), que envuelve `get_current_user` y exige `current_user.role == "admin"`. Ningún endpoint recibe body (todos son GET).

### GET /reportes/resumen
**Rol requerido:** admin (`get_admin_user`)
**Qué hace:** Devuelve conteos globales: total de alumnos, total de becados, total de materias, total de profesores.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no es admin |
| 200 | `{"total_alumnos", "total_becados", "total_materias", "total_profesores"}` |

**Archivo:** `app/routers/reportes_router.py`

---

### GET /reportes/por-carrera
**Rol requerido:** admin
**Qué hace:** Para cada carrera, calcula total de alumnos, porcentaje de asistencia (ponderado, no solo "presente"), porcentaje de aprobados y cantidad en riesgo (promedio bajo `APROBACION_MINIMA`), usando queries agregadas para evitar N+1.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no es admin |
| 200 | Lista de `{"carrera", "total_alumnos", "asistencia_pct", "aprobados_pct", "en_riesgo"}` |

**Archivo:** `app/routers/reportes_router.py`

---

### GET /reportes/dashboard
**Rol requerido:** admin
**Qué hace:** Dashboard agregado admin: KPIs globales (promedio general, % aprobación, % asistencia, alumnos activos), estadísticas por materia (distribución de notas 1-5, aprobados/en riesgo), asistencia por materia, y alertas de riesgo crítico (top 5 alumnos con mayor inasistencia y promedio bajo). Todo calculado en batch (pocas queries) para evitar N+1.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no es admin |
| 200 | `{"kpis", "materias", "asistencia_por_materia", "alertas"}` |

**Archivo:** `app/routers/reportes_router.py`

---

### GET /reportes/becados
**Rol requerido:** admin
**Qué hace:** Lista paginada de usuarios becados (`es_becado == True`).
**Request/Query params:**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| skip | int | No | Default 0, `ge=0` |
| limit | int | No | Default 100, `ge=1, le=500` |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no es admin |
| 422 | `skip < 0` o `limit` fuera de rango `[1,500]` (validación automática de FastAPI/Query) |
| 200 | Lista de `schemas.user.UserOut` |

**Archivo:** `app/routers/reportes_router.py`

---

### GET /reportes/asistencia-por-materia
**Rol requerido:** admin
**Qué hace:** Para cada materia con oferta activa, calcula total de registros de asistencia, presentes, ausentes y porcentaje.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no es admin |
| 200 | Lista de `{"materia_id", "materia", "total", "presentes", "ausentes", "pct"}` |

**Archivo:** `app/routers/reportes_router.py`

---

### GET /reportes/rue-es/matricula
**Rol requerido:** admin
**Qué hace:** Exporta un CSV (descarga, `StreamingResponse`) de matrícula para el formato RUE-ES/MEC: cédula, nombre, carrera, año de ingreso, condición de beca, estado. Filtra usuarios con `role == "alumno"`.
**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no es admin |
| 200 | Archivo CSV `rue_es_matricula.csv` (`Content-Disposition: attachment`) |

**Archivo:** `app/routers/reportes_router.py`

---

### GET /reportes/rue-es/trayecto-academico
**Rol requerido:** admin
**Qué hace:** Exporta un CSV con el trayecto académico de todas las inscripciones (cédula, nombre, carrera, materia, periodo, nota final, estado calculado APROBADO/REPROBADO/CURSANDO, % asistencia), usando queries batch para evitar N+1.
**Request/Query params:**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| skip | int | No | Default 0, `ge=0` |
| limit | int | No | Default 5000, `ge=1, le=50000` |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 403 | Usuario no es admin |
| 422 | `skip`/`limit` fuera de rango (validación automática de FastAPI) |
| 200 | Archivo CSV `rue_es_trayecto_academico.csv`; si no hay inscripciones, devuelve CSV solo con encabezado |

**Archivo:** `app/routers/reportes_router.py`

---

## `/alumno` — `reporte_notas_router.py`

> Nota: el archivo se llama `reporte_notas_router.py` pero su `APIRouter` usa `prefix="/alumno"`, por lo que el único endpoint queda expuesto en `GET /alumno/reporte-notas`.

### GET /alumno/reporte-notas
**Rol requerido:** cualquier usuario autenticado (solo `get_current_user`); es siempre self-service — no recibe `alumno_id` como parámetro, usa `current_user.user_id`
**Qué hace:** Construye y devuelve el reporte de calificaciones del alumno autenticado, agrupado por semestre o global, delegando el cálculo a `services/reporte_notas.py::construir_reporte_notas`.
**Request/Query params:**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| semestre | str \| null | No | Formato `"YYYY-N"`, ej. `"2026-1"`. Si se omite, el reporte es global. Sin validación de formato en el schema/endpoint (pasa el string tal cual al service) <!-- TODO: verificar si `construir_reporte_notas` valida el formato de `semestre` --> |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 404 | `construir_reporte_notas` devuelve `None` (detail: "Alumno no encontrado") — condición interna exacta no verificada en este análisis <!-- TODO: verificar bajo qué condición construir_reporte_notas retorna None, no se leyó services/reporte_notas.py --> |
| 200 | Reporte de notas (estructura definida por `construir_reporte_notas`, `response_model=None` así que no hay schema Pydantic fijo en el router) |

**Archivo:** `app/routers/reporte_notas_router.py`

## `/alumno` — `alumno_router.py`

Todos los endpoints de este router dependen de `Depends(get_current_user)` (JWT válido,
no expirado, no revocado en blacklist). **Ninguno usa `require_role`**: no hay chequeo
explícito de `current_user.role == "alumno"` en el cuerpo de estas funciones — cualquier
usuario autenticado (alumno, profesor o admin) puede llamarlos y verá datos filtrados por
**su propio** `current_user.user_id` (self-service). No hay forma de pasar un ID externo.
`get_current_user` (en `app/dependencias.py`) lanza `401 "Token inválido"` si el JWT no
decodifica, si falta `sub`/`role`/`user_id` en el payload, o si el `jti` está en la
blacklist de tokens revocados (`401 "Token revocado"`).

### GET /alumno/mi-perfil
**Rol requerido:** cualquier usuario autenticado (sin chequeo de rol explícito; en la práctica pensado para alumno)
**Qué hace:** Busca el `User` por `current_user.user_id` y lo devuelve. Si tiene `foto_url`, la reemplaza por una URL firmada (`obtener_url_firmada`).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Usuario encontrado, se retorna `UserOut` |
| 401 | Token inválido/ausente/revocado (vía `get_current_user`) |
| 404 | No existe un `User` con `id == current_user.user_id` |

**Archivo:** `app/routers/alumno_router.py`

---

### PATCH /alumno/mi-perfil
**Rol requerido:** cualquier usuario autenticado (self-service sobre su propio registro)
**Qué hace:** Actualiza el propio usuario. Recibe un `UserUpdate` completo pero **filtra en el backend** el `dict` a solo las claves `{"nombre", "email", "password"}` — cualquier otro campo enviado (`role`, `carrera_id`, `es_becado`, `activo`, `fecha_ingreso`, `cv`) es descartado silenciosamente, evitando mass-assignment/autoescalada de rol. Si viene `password`, la hashea con `hash_password` antes de guardar (`hashed_password`).

**Request body:** `schemas.user.UserUpdate` (`app/schemas/users_schemas.py`) — nota: el schema completo acepta más campos, pero el router solo aplica los marcados "Usado":

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| nombre | str \| None | No | Usado. Sin validación adicional en el schema. |
| email | str \| None | No | Usado. Sin validación de formato en el schema (no `EmailStr`). |
| carrera_id | int \| None | No | Aceptado por el schema pero **ignorado** por este endpoint (filtrado). |
| es_becado | bool \| None | No | Aceptado por el schema pero **ignorado**. |
| role | str \| None | No | Aceptado por el schema pero **ignorado** (protección anti-autoescalada). |
| password | str \| None | No | Usado. `Field(None, min_length=6, max_length=100)`. Se hashea antes de guardar. |
| fecha_ingreso | date \| None | No | Aceptado por el schema pero **ignorado**. |
| cv | str \| None | No | Aceptado por el schema pero **ignorado**. |
| activo | bool \| None | No | Aceptado por el schema pero **ignorado**. |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Actualización exitosa, retorna `UserOut` actualizado |
| 401 | Token inválido/revocado |
| 404 | No existe `User` con `id == current_user.user_id` |
| 422 | Body no cumple el schema `UserUpdate` (p.ej. password de menos de 6 caracteres) — validación automática de FastAPI/Pydantic |

**Archivo:** `app/routers/alumno_router.py`

---

### GET /alumno/mis-materias
**Rol requerido:** cualquier usuario autenticado
**Qué hace:** Lista las materias en las que el usuario (`current_user.user_id`) tiene inscripción, vía `Inscripcion.alumno_id`. Sin query params `anio`/`semestre`: solo muestra materias cuya `oferta.activa == True` (período actual). Con `anio` y/o `semestre`: ignora el flag `activa` y filtra por `Materia.anio`/`Materia.semestre` (permite ver períodos históricos). Deduplica por `materia.id`. Ordena por nombre.

**Query params:** `anio: int | None`, `semestre: int | None` (no validados con Field/constraints, simples query params opcionales de FastAPI).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista (posiblemente vacía) de materias `{id, nombre, profesor, anio, semestre, oferta_periodo}` |
| 401 | Token inválido/revocado |

**Archivo:** `app/routers/alumno_router.py`

---

### GET /alumno/mis-materias-hoy
**Rol requerido:** cualquier usuario autenticado
**Qué hace:** Para las inscripciones con oferta activa del usuario, busca bloques de `Horario` cuyo `dia_semana` coincide con el día de hoy (`date.today().weekday()`), y devuelve materia+hora+aula. Pensado para el scanner QR mobile.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista (puede ser `[]`) de `{id, nombre, hora, aula}` ordenada por hora de inicio |
| 401 | Token inválido/revocado |

**Archivo:** `app/routers/alumno_router.py`

---

### GET /alumno/mis-periodos
**Rol requerido:** cualquier usuario autenticado
**Qué hace:** Devuelve la lista distinta de pares `(anio, semestre)` de las materias en las que el usuario tiene inscripciones (join Materia→OfertaMateria→Inscripcion), ordenados descendente.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `{anio, semestre}` (excluye filas con `anio`/`semestre` `None`) |
| 401 | Token inválido/revocado |

**Archivo:** `app/routers/alumno_router.py`

---

### GET /alumno/mis-notas
**Rol requerido:** cualquier usuario autenticado
**Qué hace:** Llama a `construir_reporte_notas(db, current_user.user_id)` (mismo motor que la boleta oficial) y aplana el resultado a una lista de materias con sus notas/promedio (una fila por materia, el intento vigente si hubo recursada).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de materias con notas (`[]` si `construir_reporte_notas` retorna falsy) |
| 401 | Token inválido/revocado |
| — | Cualquier excepción interna de `construir_reporte_notas` no está capturada aquí <!-- TODO: verificar comportamiento de construir_reporte_notas ante errores, no está en el alcance de los routers leídos --> |

**Archivo:** `app/routers/alumno_router.py`

---

### GET /alumno/mi-asistencia
**Rol requerido:** cualquier usuario autenticado
**Qué hace:** Agrega asistencias del usuario por materia. Sin `anio`/`semestre`: todas las asistencias del usuario (no filtra por oferta activa, a diferencia del docstring "período actual" — el código no aplica ese filtro salvo el que impone el join cuando se pasan `anio`/`semestre`). Con `anio`/`semestre`: filtra vía join Asistencia→OfertaMateria→Materia. Calcula puntaje ponderado por sesión (`puntaje_sesion`) y porcentaje sobre `PUNTAJE_PRESENTE`.

**Query params:** `anio: int | None`, `semestre: int | None`.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `{materia_id, materia_nombre, total_clases, presentes, porcentaje}` ordenada por nombre |
| 401 | Token inválido/revocado |

**Archivo:** `app/routers/alumno_router.py`

---

### GET /alumno/dashboard
**Rol requerido:** cualquier usuario autenticado
**Qué hace:** Endpoint agregado para pantalla principal mobile: combina perfil, resumen académico (llamando internamente a `mis_notas`/`mi_asistencia` como funciones Python, no vía HTTP), próximos eventos (30 días desde hoy), saldo de cuotas (`models.financiero.Cuota`, con `try/except` que ignora silenciosamente si la tabla/modelo no existe), y una bandera de "regularidad activa" (asistencia promedio ≥70% en todas las materias con datos; `True` si no hay asistencias registradas).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Objeto agregado `{user, resumen, proximoEvento, eventosCercanos, cuentaSaldoPendiente, cuentaSaldoVencido, cuentaPagado, cuentaHayCuotas, regularidadActiva}` |
| 401 | Token inválido/revocado |
| — | Si `user` es `None` (usuario borrado pero token vigente) no lanza 404: retorna `resumen.alumno = None`, `user_out = None`, sigue devolviendo 200 con el resto de los datos |

**Archivo:** `app/routers/alumno_router.py`

---

### GET /alumno/mi-resumen
**Rol requerido:** cualquier usuario autenticado
**Qué hace:** Versión reducida de `dashboard`: perfil + notas + asistencia + promedio general, sin eventos ni cuenta corriente. Llama internamente a `mis_notas`/`mi_asistencia`.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Objeto `{alumno, cantidad_materias, promedio_general, notas, asistencia}` (`alumno: None` si el usuario no existe) |
| 401 | Token inválido/revocado |

**Archivo:** `app/routers/alumno_router.py`

---

## `/profesor` — `profesor_router.py`

La mayoría de los endpoints usan el helper local `_requiere_profesor(current_user)`, que
lanza `HTTPException(403, "Solo administradores o profesores pueden acceder a este recurso")`
si `current_user.role not in ("admin", "profesor")`. Esto significa que un **admin también
puede usar estos endpoints**, y como las queries filtran por `O.profesor_id == current_user.user_id`,
un admin autenticado vería únicamente **sus propias** ofertas como si fuera profesor (no ve las
de terceros) — el docstring del archivo advierte justamente sobre la importancia de este filtro.
`GET /profesor/lista-alumnos` usa un chequeo de rol inline equivalente pero distinto en el mensaje
(`403 "No autorizado"`).

### GET /profesor/dashboard
**Rol requerido:** admin o profesor (`_requiere_profesor`)
**Qué hace:** Dashboard agregado del docente: resumen (materias activas, total alumnos únicos, promedio general y % de aprobación calculados con los pesos reales por materia vía `calcular_promedio_final`/`get_pesos`, asistencia promedio), detalle por materia (alumnos, promedio, horarios), agenda de hoy (clases fijas + eventos institucionales de sus materias + recordatorios propios del profesor), y alertas de alumnos con inasistencia ≥25% o promedio < `APROBACION_MINIMA`. Solo considera ofertas con `activa == True` del profesor autenticado.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Objeto `{resumen, materias, agenda_hoy, alertas, timestamp}`; si el profesor no tiene ofertas activas retorna estructura vacía igualmente |
| 401 | Token inválido/revocado |
| 403 | `current_user.role` no es `admin` ni `profesor` |

**Archivo:** `app/routers/profesor_router.py`

---

### GET /profesor/materias
**Rol requerido:** admin o profesor (`_requiere_profesor`)
**Qué hace:** Lista simple de materias con oferta activa dictadas por el usuario autenticado (`O.profesor_id == current_user.user_id`).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `{id, nombre, codigo, carrera}` |
| 401 | Token inválido/revocado |
| 403 | Rol no autorizado |

**Archivo:** `app/routers/profesor_router.py`

---

### GET /profesor/mi-historico
**Rol requerido:** admin o profesor (`_requiere_profesor`)
**Qué hace:** Histórico de TODAS las ofertas del profesor (activas e inactivas, `O.profesor_id == uid` sin filtro de `activa`), agrupadas por `periodo`, con cantidad de alumnos, promedio de grupo y % de aprobación por cátedra (pesos reales vía `get_pesos`/`calcular_promedio_final`).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `{periodo, catedras: [...]}` (`[]` si no tiene ofertas) |
| 401 | Token inválido/revocado |
| 403 | Rol no autorizado |

**Archivo:** `app/routers/profesor_router.py`

---

### GET /profesor/mi-agenda
**Rol requerido:** admin o profesor (`_requiere_profesor`)
**Qué hace:** Agenda normalizada por día entre `desde` y `hasta`: clases fijas (repite `Horario` recurrente por cada día del rango que coincida con `dia_semana`) solo de ofertas **activas** del profesor, eventos institucionales (`materia_id is None`) o de sus materias en el rango de fechas, y recordatorios propios del profesor en el rango.

**Query params:**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| desde | date | Sí | `Query(...)` |
| hasta | date | Sí | `Query(...)` |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Objeto `{desde, hasta, items: [...]}` con items tipo `clase`/`evento`/`recordatorio` |
| 401 | Token inválido/revocado |
| 403 | Rol no autorizado |
| 422 | `hasta < desde` (chequeo manual explícito en el código) |

**Archivo:** `app/routers/profesor_router.py`

---

### POST /profesor/recordatorios
**Rol requerido:** admin o profesor (`_requiere_profesor`)
**Qué hace:** Crea un `RecordatorioDocente` asociado al `profesor_id = current_user.user_id` (no se puede crear a nombre de otro profesor: el campo no viene del body).

**Request body:** `schemas.recordatorio.RecordatorioCreate` (`app/schemas/recordatorio_schema.py`)

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| titulo | str | Sí | Sin constraints adicionales en el schema |
| descripcion | str \| None | No | — |
| fecha | datetime | Sí | — |
| materia_id | int \| None | No | No se valida contra las materias del profesor <!-- TODO: verificar si en otra capa se valida pertenencia de materia_id --> |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Recordatorio creado, retorna `RecordatorioOut` |
| 401 | Token inválido/revocado |
| 403 | Rol no autorizado |
| 422 | Body inválido según `RecordatorioCreate` (p.ej. falta `titulo` o `fecha`) |

**Archivo:** `app/routers/profesor_router.py`

---

### PATCH /profesor/recordatorios/{recordatorio_id}
**Rol requerido:** admin o profesor (`_requiere_profesor`), y además debe ser el dueño del recordatorio
**Qué hace:** Busca el `RecordatorioDocente` por id; si existe pero `rec.profesor_id != current_user.user_id`, rechaza. Aplica solo los campos enviados (`exclude_unset=True`).

**Request body:** `schemas.recordatorio.RecordatorioUpdate`

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| titulo | str \| None | No | — |
| descripcion | str \| None | No | — |
| fecha | datetime \| None | No | — |
| materia_id | int \| None | No | — |
| completado | bool \| None | No | — |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Actualizado, retorna `RecordatorioOut` |
| 401 | Token inválido/revocado |
| 403 | Rol no autorizado, o `rec.profesor_id != current_user.user_id` ("No autorizado") — nota: un admin autenticado que no sea el dueño del recordatorio también recibe este 403, porque el chequeo de ownership no exceptúa a admin |
| 404 | No existe recordatorio con ese id |
| 422 | Body inválido según schema |

**Archivo:** `app/routers/profesor_router.py`

---

### DELETE /profesor/recordatorios/{recordatorio_id}
**Rol requerido:** admin o profesor (`_requiere_profesor`), y además debe ser el dueño del recordatorio
**Qué hace:** Igual chequeo de existencia/ownership que el PATCH; elimina el registro.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{"detail": "Recordatorio eliminado"}` |
| 401 | Token inválido/revocado |
| 403 | Rol no autorizado, o no es el dueño del recordatorio (mismo comportamiento que PATCH, incluido admin no-dueño) |
| 404 | No existe recordatorio con ese id |

**Archivo:** `app/routers/profesor_router.py`

---

### GET /profesor/lista-alumnos
**Rol requerido:** admin o profesor (chequeo inline `current_user.role not in ("admin", "profesor")`, distinto de `_requiere_profesor` solo en el texto del detail)
**Qué hace:** Lista paginada de usuarios con `role == "alumno"`. Si quien llama es `profesor` (no admin), filtra además a solo los alumnos inscriptos en ofertas activas dictadas por ese profesor (join Inscripcion→OfertaMateria filtrando `profesor_id` y `activa == True`, con `distinct()`). Si es `admin`, ve todos los alumnos sin ese filtro.

**Query params:**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| skip | int | No | `Query(0, ge=0)` |
| limit | int | No | `Query(50, ge=1, le=500)` |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `{total, skip, limit, items: [{id, nombre, username, cedula}]}` |
| 401 | Token inválido/revocado |
| 403 | `current_user.role` no es `admin` ni `profesor` |
| 422 | `skip`/`limit` fuera de rango (validación automática de FastAPI por los `Query(..., ge=..., le=...)`) |

**Archivo:** `app/routers/profesor_router.py`

---

## `/admin/settings` — `settings_router.py`

Todos los endpoints requieren `Depends(require_role("admin"))` — solo usuarios con
`role == "admin"` pueden acceder; `require_role` internamente depende de `get_current_user`
y lanza `403 "No autorizado"` si el rol no coincide (y hereda los `401` de `get_current_user`
si el token es inválido/revocado). Todos llaman primero a `_seed_defaults(db)`, que inserta
en `GlobalSetting` los valores de la constante `DEFAULTS` si la tabla está vacía, y
re-sincroniza `descripcion`/`tipo`/`categoria` de filas existentes contra `DEFAULTS` en cada
arranque (nunca toca `value`, que es dato real configurado por el admin).

### GET /admin/settings
**Rol requerido:** admin (`require_role("admin")`)
**Qué hace:** Lista todos los `GlobalSetting`, opcionalmente filtrados por `categoria`, ordenados por `key`.

**Query params:** `categoria: str | None` (sin validación de valores permitidos — cualquier string, si no matchea ninguna fila simplemente devuelve lista vacía).

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `GlobalSettingOut` (`key, value, tipo, categoria, descripcion, editable, updated_at, updated_by`) |
| 401 | Token inválido/revocado |
| 403 | Rol distinto de `admin` |

**Archivo:** `app/routers/settings_router.py`

---

### GET /admin/settings/{key}
**Rol requerido:** admin
**Qué hace:** Busca un setting puntual por `key` exacta.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `GlobalSettingOut` del setting encontrado |
| 401 | Token inválido/revocado |
| 403 | Rol distinto de `admin` |
| 404 | No existe setting con esa `key` (`f"Setting '{key}' no encontrado"`) |

**Archivo:** `app/routers/settings_router.py`

**Nota de ruteo:** Esta ruta con path param `{key}` está declarada en el archivo **antes** que `/audit/list` y `/export/all` en el orden de aparición del código fuente — sin embargo FastAPI resuelve por especificidad de ruta y las rutas literales (`/audit/list`, `/export/all`, `""`, `/import`) están registradas como paths propios y no colisionan con `{key}` porque FastAPI las matchea como segmentos completos independientes del prefijo `/admin/settings`; no se detectó riesgo de shadowing real en este router. <!-- TODO: verificar el orden real de registro en el objeto APIRouter si se requiere certeza absoluta sobre precedencia --> (De igual modo, `GET /admin/settings/{key}` con `key="audit"` no puede colisionar porque `/audit/list` tiene un segmento adicional `/list` que no matchea `{key}` solo.)

---

### PUT /admin/settings/{key}
**Rol requerido:** admin
**Qué hace:** Actualiza el `value` de un setting existente. Guarda el `old_value`, actualiza `updated_at`/`updated_by = current_user.user_id`, y crea un `SettingAuditLog` con `old_value`, `new_value`, `changed_by`, `reason` (del body). Rechaza si el setting no es `editable`.

**Request body:** `GlobalSettingUpdate` (`app/schemas/global_settings.py`)

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| value | str \| None | No | Sin validación de formato/tipo contra `tipo` del setting (p.ej. no valida que un setting `tipo="number"` reciba un número parseable) <!-- TODO: verificar si existe validación de tipo en otra capa --> |
| reason | str \| None | No | Se guarda tal cual en el audit log |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Setting actualizado, retorna `GlobalSettingOut` |
| 401 | Token inválido/revocado |
| 403 | Rol distinto de `admin`, o el setting existe pero `editable == False` (`f"Setting '{key}' no es editable"`) |
| 404 | No existe setting con esa `key` |
| 422 | Body inválido según `GlobalSettingUpdate` |

**Archivo:** `app/routers/settings_router.py`

---

### GET /admin/settings/audit/list
**Rol requerido:** admin
**Qué hace:** Lista el historial de auditoría (`SettingAuditLog`), opcionalmente filtrado por `setting_key`, paginado con `limit`/`offset`, ordenado por `changed_at` descendente. Hace un LEFT JOIN con `User` para incluir el nombre de quien hizo el cambio (`changer_nombre`); si el usuario fue borrado, `changer_nombre` queda `None` (por ser `isouter=True`).

**Query params:**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| setting_key | str \| None | No | Filtro exacto por clave de setting |
| limit | int | No | `Query(50, le=200)` — sin `ge`, en teoría acepta valores negativos <!-- TODO: verificar si FastAPI/Pydantic infiere algún mínimo implícito; el código solo declara `le=200` --> |
| offset | int | No | `int = 0`, parámetro simple sin `Query()`, sin restricciones |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Lista de `SettingAuditLogOut` (`id, setting_key, old_value, new_value, changed_by, changed_at, reason, changer_nombre`) |
| 401 | Token inválido/revocado |
| 403 | Rol distinto de `admin` |
| 422 | `limit` fuera de rango (`> 200`) |

**Archivo:** `app/routers/settings_router.py`

---

### GET /admin/settings/export/all
**Rol requerido:** admin
**Qué hace:** Exporta todos los `GlobalSetting` (ordenados por `key`) envueltos en `SettingsExportData` — pensado como respaldo/backup para luego reimportar con `POST /admin/settings/import`.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `SettingsExportData{ settings: [GlobalSettingOut, ...] }` |
| 401 | Token inválido/revocado |
| 403 | Rol distinto de `admin` |

**Archivo:** `app/routers/settings_router.py`

---

### POST /admin/settings/import
**Rol requerido:** admin
**Qué hace:** Importación masiva de settings desde un `SettingsExportData` (típicamente el output de `/export/all`). Para cada setting del payload: si existe en DB y **no** es `editable`, lo cuenta como `skipped` y continúa sin tocarlo (protección de settings no editables). Si existe y es editable, actualiza `value`/`updated_at`/`updated_by`. Si no existe, crea una fila nueva `GlobalSetting` completa (`key, value, tipo, categoria, descripcion, editable, updated_by`) — es decir, permite **crear** settings nuevos que no estaban en `DEFAULTS` ni en la tabla, sin restricción alguna sobre `key`/`tipo`/`categoria`. Cada cambio (update o create) genera un `SettingAuditLog` con `reason="Importación masiva"`. Cualquier excepción por fila individual se captura y se agrega a la lista `errors` (no aborta el resto del batch); al final hace un único `db.commit()`.

**Request body:** `SettingsExportData` — `{ settings: list[GlobalSettingOut] }`, donde cada item de `settings` es:

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| key | str | Sí | Clave del setting (usada para upsert) |
| value | str \| None | No | — |
| tipo | str | Sí | Solo se usa si el setting es nuevo (create); si ya existe, **no se actualiza** `tipo` en el UPDATE (`existing.tipo` no se reasigna en la rama `if existing:`) <!-- TODO: confirmar si esto es intencional; el código solo actualiza value/updated_at/updated_by en la rama existing --> |
| categoria | str | Sí | Ídem: solo aplica al crear, no se actualiza en settings existentes |
| descripcion | str \| None | No | Ídem |
| editable | bool | No (default `True` en el schema `GlobalSettingOut`) | Solo aplica al crear |
| updated_at | datetime \| None | No | Ignorado por el import (se recalcula server-side solo en la rama create/update via `datetime.now`, y solo para `existing`; para settings nuevos no se setea `updated_at` explícitamente en el código, quedará el default de columna) <!-- TODO: verificar default de columna `updated_at` en el modelo `GlobalSetting` -->|
| updated_by | int \| None | No | Ignorado, se sobreescribe con `current_user.user_id` |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | `SettingsImportResult{ imported, skipped, errors: [] }` — nota: el endpoint **nunca** devuelve un HTTP de error por filas individuales fallidas; los errores van dentro del body 200 en la lista `errors` |
| 401 | Token inválido/revocado |
| 403 | Rol distinto de `admin` |
| 422 | Body no cumple `SettingsExportData` (p.ej. falta `key`/`tipo`/`categoria` en algún item, que son requeridos por `GlobalSettingOut`) |

**Archivo:** `app/routers/settings_router.py`

---

## Resumen de TODOs marcados

1. `POST /profesor/recordatorios` — no se confirma si `materia_id` se valida contra las materias reales del profesor en otra capa.
2. `mis-notas` (alumno) — no se confirma el manejo de excepciones internas de `construir_reporte_notas` (fuera del alcance de los routers leídos).
3. `GET /admin/settings/{key}` — orden de registro de rutas en el `APIRouter` no verificado línea por línea contra el objeto FastAPI en runtime (aunque el análisis de paths concluye que no hay colisión real).
4. `PUT /admin/settings/{key}` — no se confirma si existe validación de `value` contra el `tipo` declarado del setting en otra capa.
5. `GET /admin/settings/audit/list` — `limit` solo tiene `le=200` sin `ge`, comportamiento ante valores negativos no verificado en este alcance.
6. `POST /admin/settings/import` — comportamiento exacto de `updated_at` para settings recién creados (default de columna del modelo `GlobalSetting`) no verificado; no se leyó `app/models/global_settings.py` en este alcance.

