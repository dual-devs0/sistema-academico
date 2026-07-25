# API Reference — Sistema Académico UCA V2

> Generado leyendo cada router real en `backend/app/routers/`. Solo endpoints implementados — nada planeado/pendiente. `[admin|profesor|alumno]` = roles permitidos; `[auth]` = requiere token válido sin restricción de rol; `[público]` = sin `Depends(get_current_user)`.

## `/auth` — `auth_router.py`

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/login` | público | `{username, password}` → `{access_token, token_type}` + cookies `refresh_token` (httpOnly) y `csrf_token`. Rate-limit 5 intentos fallidos/15min por `username:ip` *(nuevo, 2026-07-13)* — 429 si se excede, se resetea en login exitoso |
| POST | `/auth/refresh` | público (cookie) | Rota refresh token, emite access token nuevo. Flujo cookie exige header `X-CSRF-Token` igual a la cookie `csrf_token` *(nuevo, 2026-07-13)* — 403 si falta o no coincide. Flujo mobile (refresh token en el body) no requiere CSRF |
| POST | `/auth/logout` | público (cookie) | Revoca refresh token en DB, borra cookies `refresh_token` y `csrf_token` |
| POST | `/auth/recuperar-contrasena` | público | Rate-limit 3/15min. Genera password temporal, envía por email |

## `/users` — `users_router.py`

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/users/` | admin | Crea usuario |
| GET | `/users/me` | auth | Perfil propio |
| GET | `/users/` | admin | `?skip&limit&q&role` → `{items, total}` (paginado server-side) |
| GET | `/users/secure` | auth | Endpoint de smoke-test de auth |
| POST | `/users/me/foto` | auth | Sube foto de perfil (multipart) a R2 |
| PATCH | `/users/{user_id}` | admin o self | Self no puede cambiar `role/carrera_id/es_becado` |
| DELETE | `/users/{user_id}` | admin | Borra usuario + cascada manual (asistencias, puntajes, inscripciones, mensajes foro, apuntes) |

## `/materias` — `materia_router.py`

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/materias/` | admin | Crea materia (catálogo, sin profesor) |
| GET | `/materias/` | auth | `?profesor_id&carrera_id&skip&limit` (paginado, `limit` default 500 máx. 2000 *(nuevo, 2026-07-13)*) — si `profesor_id`, filtra por oferta activa de ese profesor |
| GET | `/materias/{materia_id}` | auth | Detalle + profesor/carrera resueltos vía oferta activa |
| POST | `/materias/ofertas` | admin | Crea `OfertaMateria` (asigna profesor+período a una materia) |

## `/inscripciones` — `inscripciones_router.py`

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/inscripciones/` | alumno, admin | Valida correlatividades (422 si no cumple), solapamiento de horario (409), duplicado (400) |
| DELETE | `/inscripciones/{id}` | self o admin | Desinscribe |
| GET | `/inscripciones/materia/{materia_id}` | auth | Alumnos inscriptos en la oferta activa |
| GET | `/inscripciones/` | auth | Propias (alumno) o todas (resto) |

## `/carreras` — `carreras_router.py`

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/carreras/` | admin | Crea carrera |
| GET | `/carreras/` | público | Lista todas |

## `/asistencias` — `asistencias_router.py`

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/asistencias/` | profesor (titular) o admin | Registra asistencia individual. `?skip&limit` no aplica (POST). Si la ausencia cruza 25% de inasistencia en la oferta, dispara alerta por email *(nuevo, 2026-07-13 — ver `ARQUITECTURA.md`)* |
| GET | `/asistencias/` | auth | `?materia_id&user_id&fecha&skip&limit` (paginado, `limit` default 500 máx. 2000 *(nuevo, 2026-07-13)*), alumno solo ve las propias |
| PUT | `/asistencias/{id}` | profesor (titular) o admin | También puede disparar la alerta de inasistencia si el cambio marca ausente y cruza el umbral |
| DELETE | `/asistencias/{id}` | profesor (titular) o admin | |
| POST | `/asistencias/lote` | profesor (titular) o admin | Carga/actualiza asistencia de toda una clase en un request. Dispara alerta de inasistencia por cada alumno marcado ausente que cruce el umbral |
| GET | `/asistencias/materia/{materia_id}/alumnos` | admin, profesor | Alumnos inscriptos + % asistencia — fuente de verdad para conteo de alumnos por materia |
| GET | `/asistencias/alumno/{user_id}/porcentaje` | self o no-alumno | `?materia_id` opcional |
| GET | `/asistencias/{materia_id}/resumen` | auth | % global de asistencia de la materia |
| POST | `/asistencias/qr/verificar` | alumno (auth) | Registra la asistencia propia escaneando el QR emitido por el profesor (JWT firmado, TTL 15 min). Valida inscripción y evita duplicados. Solo registra presentes, nunca dispara la alerta de inasistencia |

## `/puntajes` — `puntajes_router.py`

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/puntajes/` | admin, profesor (titular) | Rechaza duplicado de mismo `tipo` para el alumno en esa oferta |
| GET | `/puntajes/` | auth | `?user_id&materia_id&tipo&skip&limit` (paginado, `limit` default 500 máx. 2000 *(nuevo, 2026-07-13)*), alumno solo ve las propias |
| PUT | `/puntajes/{id}` | admin, profesor (titular) | |
| DELETE | `/puntajes/{id}` | admin, profesor (titular) | |
| GET | `/puntajes/materia/{materia_id}` | admin, profesor (titular) | Notas de todos los alumnos + promedio ponderado |
| GET | `/puntajes/alumno/{user_id}/promedio-final` | self o no-alumno | `?materia_id` opcional |
| GET | `/puntajes/materia/{materia_id}/exportar` | admin, profesor (titular) | Notas + asistencia combinadas |
| GET | `/puntajes/materia/{materia_id}/estadisticas` | admin, profesor (titular) | Promedio de grupo, distribución por rango, aprobados/en riesgo |
| GET | `/puntajes/{user_id}/promedio` | self o admin | Promedio simple global |

Pesos del promedio ponderado (constante `PESOS` repetida en varios módulos): `parcial1=0.25, parcial2=0.25, practico=0.20, final=0.30`.

## `/apuntes` — `apuntes_router.py`

CRUD + moderación de apuntes compartidos. `POST /`, `GET /` (`?materia_id&aprobado&tipo_contenido&q`), `GET /{id}`, `PUT /{id}` (owner o admin), `PATCH /{id}/aprobar` (admin), `PATCH /{id}/like`, `PATCH /{id}/descargar`, `POST /{id}/archivo` (upload a R2), `GET /{id}/url-descarga`, `DELETE /{id}` (owner o admin).

## `/eventos` — `eventos_router.py`

Calendario académico. `POST /`, `GET /` (filtra por materias del alumno + eventos institucionales), `GET /{id}`, `PUT /{id}` (admin/profesor), `DELETE /{id}` (admin/profesor), `POST /cargar-pdf` (parsea PDF con Gemini, admin/profesor), `GET /mes/{anio}/{mes}`, `GET /dia/{fecha}`.

## `/programas` y `/temarios` — `programas_router.py`, `temarios_router.py`

Contenido curricular por materia (semana + título + descripción; temario además con bibliografía JSON). CRUD estándar, escritura restringida a admin/profesor. `temarios` no tiene endpoint bulk; `programas` sí (`PUT /programas/materia/{id}/bulk`, reemplaza todo el programa de la materia).

## `/reportes` — `reportes_router.py` (todo admin)

`GET /reportes/resumen` (totales institucionales), `GET /reportes/por-carrera` (asistencia/aprobación/riesgo por carrera), `GET /reportes/becados`.

**Exportación RUE-ES/MEC** *(nuevo, 2026-07-13 — ver `ARQUITECTURA.md` para la nota sobre falta de plantilla oficial)*: `GET /reportes/rue-es/matricula` (CSV `;`, un renglón por alumno: `cedula;apellidos_nombres;carrera;codigo_mec_carrera;anio_ingreso;condicion_beca;estado`), `GET /reportes/rue-es/trayecto-academico` (CSV `;`, un renglón por inscripción: `cedula;apellidos_nombres;carrera;materia;periodo;nota_final;estado_materia;porcentaje_asistencia`, `estado_materia` = `CURSANDO`/`APROBADO`/`REPROBADO` según promedio ponderado `>=6`).

## `/boleta` — `boleta_router.py`

`GET /boleta/{user_id}` (self, profesor o admin) — genera PDF con reportlab, promedio ponderado por materia.

## `/alumno` — `alumno_router.py` (self siempre, vía token)

`GET/PATCH /mi-perfil`, `GET /mis-materias`, `GET /mis-notas`, `GET /mi-asistencia`, `GET /mi-resumen` (agregado de los tres anteriores).

## `/foro` — `foro_router.py`

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/foro/hilos` | admin, profesor (titular), alumno (inscripto) | |
| GET | `/foro/hilos` | auth | `?materia_id`, sin mensajes embebidos |
| GET | `/foro/hilos/{id}` | auth | Metadata del hilo, sin mensajes (ver endpoint dedicado) |
| PUT | `/foro/hilos/{id}` | admin, profesor (titular) | `{titulo?,descripcion?,fijado?,cerrado?}` |
| DELETE | `/foro/hilos/{id}` | admin, profesor (titular) | |
| POST | `/foro/hilos/{id}/mensajes` | admin, profesor (titular), alumno (inscripto) | Rechaza si hilo cerrado |
| GET | `/foro/hilos/{id}/mensajes` | auth | `?skip&limit` → `{items, total}`, orden más-nuevo-primero |
| PATCH | `/foro/mensajes/{id}` | autor únicamente | Ventana de 15 min desde `created_at`, 403 fuera de ventana |
| DELETE | `/foro/mensajes/{id}` | autor o admin | |

## `/horarios` — `horarios_router.py`

`POST /` (admin, profesor titular), `GET /` (`?materia_id`), `GET /materia/{id}`, `DELETE /{id}` (admin, profesor titular), `GET /verificar-solapamiento` (alumno, `?materia_id`) — usado también internamente por `/inscripciones/`.

## `/profesor` — `profesor_router.py` (rol profesor exclusivamente)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/profesor/mi-historico` | Cátedras propias agrupadas por período (desc), con promedio/% aprobación por oferta |
| GET | `/profesor/mi-agenda` | `?desde&hasta` — clases fijas + eventos institucionales + recordatorios propios, normalizado por día |
| POST | `/profesor/recordatorios` | Crea recordatorio propio |
| PATCH | `/profesor/recordatorios/{id}` | Solo dueño |
| DELETE | `/profesor/recordatorios/{id}` | Solo dueño |

## `/pensum` — `pensum_router.py`

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/pensum/carreras/{carrera_id}/materias` | admin | Agrega materia a la malla |
| DELETE | `/pensum/carreras/{carrera_id}/materias/{pensum_materia_id}` | admin | Quita de la malla |
| GET | `/pensum/correlatividades` | auth | `?carrera_id` opcional — filtra correlatividades cuya `materia_id` está en la malla de esa carrera |
| POST | `/pensum/correlatividades` | admin | `{materia_id, prerrequisito_id, tipo}`, rechaza auto-referencia (422) |
| DELETE | `/pensum/correlatividades/{id}` | admin | |
| GET | `/pensum/carreras/{carrera_id}` | auth | Malla completa ordenada por semestre |
| GET | `/pensum/alumno/{alumno_id}/avance` | self o admin | Estado por materia (aprobada/cursando/pendiente/bloqueada), recalculado y cacheado en cada lectura. Si `bloqueada`, incluye `pendientes: [{materia_id, materia_nombre, tipo}]` con el/los prerrequisito(s) faltante(s) |
| GET | `/pensum/alumno/{alumno_id}/creditos` | self o admin | Créditos acumulados vs. `creditos_totales` de la carrera |

## `/expediente` — `expediente_router.py`

### POST /expediente/cerrar-materia

**Rol requerido:** admin
**Qué hace:** Cierra oficialmente una materia cursada para un alumno. Calcula `nota_final` (fórmula ponderada `PESOS`, reutilizada de `puntajes_router._calcular_promedio_final`) sobre los `Puntaje` de esa oferta, fija `condicion` (`aprobada` si `nota_final >= 6`) y snapshotea `creditos` desde `PensumMateria`. **Upsert**: si ya existe un cierre para ese alumno+oferta, lo actualiza en vez de rechazar (rectificación de nota).

**Request body:**
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| alumno_id | int | sí | |
| oferta_materia_id | int | sí | |

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Cerrado (o rectificado) correctamente |
| 403 | No es admin |
| 404 | Alumno u oferta no encontrados, o la materia no está en el pensum de la carrera del alumno |
| 422 | El alumno no tiene ninguna nota cargada para esa oferta |

**Archivo:** `app/routers/expediente_router.py`

### GET /expediente/alumno/{alumno_id}/ppa

**Rol requerido:** self o admin
**Qué hace:** Llama `calcular_ppa()` — promedio ponderado por créditos sobre `expediente_materias` con `condicion='aprobada'`. Devuelve `ppa: null` (no `0`) si el alumno no tiene ninguna materia aprobada en su expediente.

**Respuesta:** `{ppa: float|null, creditos_computados: int}`

**Archivo:** `app/routers/expediente_router.py`

### GET /expediente/alumno/{alumno_id}

**Rol requerido:** self o admin
**Qué hace:** Transcripción completa — lista todas las `expediente_materias` del alumno (con `materia_nombre`/`periodo` resueltos vía oferta) agrupadas y agregadas por período en `expediente_semestres` (recalculado y cacheado en cada lectura, igual que `avance_alumno_pensum` en Fase 2).

**Respuesta:** `{materias: [...], semestres: [{periodo, ppa_periodo, creditos_periodo, materias_aprobadas, materias_reprobadas}]}`

**Archivo:** `app/routers/expediente_router.py`

### GET /expediente/alumno/{alumno_id}/regularidad

**Rol requerido:** self o admin
**Qué hace:** Llama `calcular_regularidad()` — clasifica en `activo`/`en_riesgo`/`irregular`/`de_baja` (precedencia en ese orden, ver `ARQUITECTURA.md`). Cachea el resultado en `regularidad_alumno`.

**Respuesta:** `{estado: str, motivo: str|null, ppa_acumulado: float|null}`

**Archivo:** `app/routers/expediente_router.py`

## `/finanzas` — `finanzas_router.py` (Fase 4 + 4B)

### POST /finanzas/conceptos

**Rol requerido:** admin
**Qué hace:** Crea un concepto de arancel (ej. "Cuota Mensual Ingeniería").

**Archivo:** `app/routers/finanzas_router.py`

### POST /finanzas/cuotas/generar

**Rol requerido:** admin
**Qué hace:** Genera cuotas para un alumno dado un concepto y lista de períodos. Aplica el mayor % de descuento entre las becas vigentes del alumno (`calcular_descuento_beca()`, nunca suma porcentajes).

**Archivo:** `app/routers/finanzas_router.py`

### GET /finanzas/alumno/{alumno_id}/cuotas

**Rol requerido:** self o admin
**Qué hace:** Lista cuotas del alumno, opcionalmente filtradas por `estado`. Cada cuota incluye trazabilidad de beca (`beca_nombre`, `fuente_beca`, `es_beca_externa`) y, si está `pagada`, el estado del comprobante fiscal del último pago (`pago_id`, `comprobante_estado`, `comprobante_url_pdf` — agregado Fase 4B).

**Archivo:** `app/routers/finanzas_router.py`

### POST /finanzas/pagos

**Rol requerido:** admin
**Qué hace:** Registra un pago (inmutable — sin PUT/DELETE; correcciones vía `pago_ajuste_ref_id` + `nota_ajuste`). Marca la cuota como `pagada` si el pago cubre el saldo, admite pagos parciales.

Fase 4B: al confirmar el pago crea un `Comprobante` en `estado_emision='pendiente'` y dispara `procesar_facturacion()` en background (`BackgroundTasks`) contra guarani.app. Un fallo del proveedor externo **no** revierte ni bloquea el pago — el comprobante queda en `error`, reintentable.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Pago registrado (el estado del comprobante se resuelve async, no bloquea esta respuesta) |
| 422 | Cuota inexistente, ya pagada en exceso, o anulada |

**Archivo:** `app/routers/finanzas_router.py`

### GET /finanzas/pagos/{pago_id}/comprobante

**Rol requerido:** self (alumno dueño de la cuota) o admin
**Qué hace:** Devuelve el comprobante fiscal del pago — incluye `estado_emision`, `url_pdf` (si `emitido`), `intentos`, `ultimo_error`. Endpoint de Fase 4 extendido en Fase 4B con los campos del ciclo de emisión.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | OK |
| 403 | Alumno intentando ver comprobante de otra cuota |
| 404 | Pago o comprobante no encontrado |

**Archivo:** `app/routers/finanzas_router.py`

### POST /finanzas/pagos/{pago_id}/comprobante/reintentar — *(nuevo, Fase 4B)*

**Rol requerido:** admin
**Qué hace:** Fuerza un reintento manual e inmediato de `procesar_facturacion()` (awaited, no en background — el admin espera el resultado). Usado desde el panel "Comprobantes" de `Finanzas.tsx`.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Comprobante actualizado (puede seguir en `error` si guarani.app vuelve a fallar) |
| 404 | Comprobante no encontrado |
| 422 | Ya alcanzó `MAX_INTENTOS` (5) |

**Archivo:** `app/routers/finanzas_router.py`

### GET /finanzas/comprobantes/pendientes — *(nuevo, Fase 4B)*

**Rol requerido:** admin
**Qué hace:** Lista comprobantes en `pendiente`, `error` o `reintentando`, con datos del alumno y monto, para el panel de monitoreo admin.

**Archivo:** `app/routers/finanzas_router.py`

### GET /finanzas/alumno/{alumno_id}/estado-deuda-inscripcion

**Rol requerido:** uso interno (llamado por `inscripciones_router.py`)
**Qué hace:** Llama `verificar_deuda_inscripcion()` — bloquea si `cuotas_vencidas >= carrera.max_cuotas_mora` (leído de la carrera del alumno, no hardcodeado; fallback 1 si el alumno no tiene carrera asignada). Excepción: alumno con beca 100% vigente nunca bloquea. Admin puede pasar `override_mora=true` al inscribir (queda auditado en `auditoria_override_mora`).

**Archivo:** `app/routers/finanzas_router.py`

## `/becas` — `becas_router.py` (Fase 4)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/becas/fuentes` | auth | Catálogo de fuentes de becas |
| GET | `/becas/catalogo` | auth | Becas disponibles, filtro opcional `?fuente_id` |
| GET | `/becas/alumno/{alumno_id}/activas` | self o admin | Becas vigentes del alumno con trazabilidad |
| POST | `/becas/postulaciones` | alumno | Postula a una beca del catálogo (409 si ya postuló) |
| GET | `/becas/postulaciones` | admin | Lista por `?fuente_id` y `?estado` — flujo separado por fuente |
| PUT | `/becas/postulaciones/{id}/revisar` | admin | Aprueba/rechaza (`estado`, `motivo_rechazo` opcional) |
| GET | `/becas/reportes/rendicion` | admin | Excel de rendición por fuente/período (`openpyxl`), para reporte a convenios externos |

**Archivo:** `app/routers/becas_router.py`

## `/tramites` — `tramites_router.py` (Fase 5A)

### GET /tramites/tipos

**Rol requerido:** auth (cualquier rol autenticado)
**Qué hace:** Lista el catálogo de `tipos_tramite`.

**Archivo:** `app/routers/tramites_router.py`

### POST /tramites/solicitudes

**Rol requerido:** alumno
**Qué hace:** Crea una solicitud. Si el tipo es automático
(`requiere_aprobacion=false` y tiene generador en `_GENERADORES_AUTO`),
la resuelve de forma síncrona: valida que `calcular_regularidad()` del
alumno sea `activo`, genera el PDF (reportlab) y lo sube a R2
(`prefix="tramite"`) — todo dentro de la misma request. Si el tipo es
manual, queda en `pendiente`.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Solicitud creada (auto-resuelta o pendiente según el tipo) |
| 422 | Tipo de trámite inexistente, o alumno no está en estado `activo` para un trámite automático |

**Archivo:** `app/routers/tramites_router.py`

### GET /tramites/solicitudes/mias

**Rol requerido:** auth — comportamiento **dual por rol**
**Qué hace:** Alumno ve solo sus propias solicitudes. Admin ve **todas**
las solicitudes, con filtro opcional `?estado=`. Mismo endpoint para
ambos casos — decisión tomada para no exceder los 5 endpoints del
alcance de Fase 5A en vez de agregar una ruta de listado admin aparte.

**Archivo:** `app/routers/tramites_router.py`

### PUT /tramites/solicitudes/{solicitud_id}/resolver

**Rol requerido:** admin
**Qué hace:** Resuelve manualmente una solicitud. Request `multipart/form-data`
con `estado` (`resuelta` \| `rechazada`), `motivo_rechazo` opcional, y
`archivo` opcional (PDF, sube a R2 con `prefix="tramite"` si `estado='resuelta'`).
Setea `resuelto_por` y `fecha_resolucion`.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | Resuelta correctamente |
| 404 | Solicitud no encontrada |
| 422 | `estado` fuera de `('resuelta','rechazada')`, o archivo con extensión/tamaño no permitidos |

**Archivo:** `app/routers/tramites_router.py`

### GET /tramites/solicitudes/{solicitud_id}/descargar

**Rol requerido:** alumno dueño de la solicitud, o admin (chequeo manual — `require_role` no cubre "self or admin", mismo patrón que `boleta_router.py`)
**Qué hace:** Devuelve `{download_url}` con una URL firmada de corta duración (`obtener_url_firmada()`, `app/services/storage.py`) al PDF resultante.

**Respuestas:**
| Código | Cuándo |
|---|---|
| 200 | OK |
| 403 | Otro alumno intentando ver una solicitud que no es suya |
| 404 | Solicitud no encontrada, o todavía no tiene resultado (`storage_key_resultado` vacío) |

**Archivo:** `app/routers/tramites_router.py`

## `/test` — `test.py` (interno, health-check)

`GET /test/` (sin auth), `GET /test/auth` (smoke test de token). No es API de dominio.
