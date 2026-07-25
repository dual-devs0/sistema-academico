# Modelo de Datos — Sistema Académico UCA V2

> Generado leyendo cada clase en `backend/app/models/*.py` y las migraciones Alembic reales en `backend/alembic/versions/`. No incluye tablas de fases futuras no implementadas.

## `users` — `models/users.py`

| Campo | Tipo | Notas |
|---|---|---|
| id | Integer PK | |
| username | String, unique | login |
| hashed_password | String | bcrypt |
| role | String | `admin` \| `profesor` \| `alumno`, sin FK a tabla de roles |
| nombre | String(120) | default `""` |
| email | String(200), unique, nullable | |
| carrera_id | FK → carreras.id, nullable | |
| es_becado | Boolean | |
| foto_url | String, nullable | storage key en R2 |
| cedula | String(20), nullable | agregado Fase 4B — documento del alumno, requerido por guarani.app para emitir factura válida ante la DNIT |
| created_at | DateTime(tz) | |

## `carreras` — `models/carrera.py`

| Campo | Tipo | Notas |
|---|---|---|
| id | Integer PK | |
| nombre | String(150), unique | |
| duracion_semestres | Integer, nullable | agregado Fase 2 |
| creditos_totales | Integer, nullable | agregado Fase 2 |
| max_cuotas_mora | Integer, default 1 | agregado Fase 4 — umbral de cuotas vencidas que bloquea inscripción (`verificar_deuda_inscripcion` bloquea cuando `cuotas_vencidas >= max_cuotas_mora`, salvo beca 100%) |

## `materias` — `models/materia.py`

Catálogo puro, **sin profesor** (ver `ARQUITECTURA.md`).

| Campo | Tipo | Notas |
|---|---|---|
| id | Integer PK | |
| nombre | String, index | |
| carrera_id | FK → carreras.id, nullable | |
| anio | Integer | posición curricular (año de carrera), no año calendario |
| semestre | Integer | posición curricular |
| creditos | Integer | default 4 |
| cupos | Integer | default 40 |
| horario | String, nullable | legacy, no usado por `horarios` (tabla separada) |
| secciones | Integer | default 1 |

`UniqueConstraint(nombre, carrera_id)` como `uq_materia_nombre_carrera`.

## `ofertas_materia` — `models/oferta_materia.py`

Vincula materia + profesor + período. Introducida en Fase 1 para separar catálogo de dictado real.

| Campo | Tipo | Notas |
|---|---|---|
| id | Integer PK | |
| materia_id | FK → materias.id | |
| profesor_id | FK → users.id | |
| periodo | String(10) | ej. `'2026-1'` |
| activa | Boolean | |

`UniqueConstraint(materia_id, periodo)` — una oferta por materia por período.

## `inscripciones` — `models/inscripcion.py`

| Campo | Tipo | Notas |
|---|---|---|
| id | Integer PK | |
| alumno_id | FK → users.id | |
| oferta_materia_id | FK → ofertas_materia.id | reemplazó `materia_id` directo en Fase 1 |

Property `materia_id` (solo lectura, vía `oferta.materia_id`) para compatibilidad de código legacy.

## `puntajes` — `models/puntaje.py`

| Campo | Tipo | Notas |
|---|---|---|
| id | Integer PK | |
| user_id | FK → users.id | |
| oferta_materia_id | FK → ofertas_materia.id | |
| tipo | String(20) | `parcial1`\|`parcial2`\|`practico`\|`final` |
| valor | Numeric(5,2) | |
| editado_por | FK → users.id, nullable | |
| editado_en | DateTime(tz) | |

`UniqueConstraint(user_id, oferta_materia_id, tipo)` como `uq_puntaje_user_oferta_tipo` — permite repetir la materia en otro período sin colisión.

## `asistencias` — `models/asistencia.py`

| Campo | Tipo | Notas |
|---|---|---|
| id | Integer PK | |
| user_id | FK → users.id | |
| oferta_materia_id | FK → ofertas_materia.id | |
| fecha | Date | |
| presente | Boolean | |
| es_becado | Boolean | snapshot del alumno al momento de marcar |
| motivo | String, nullable | motivo de ausencia |

`UniqueConstraint(user_id, oferta_materia_id, fecha)` como `uq_asistencia_user_oferta_fecha`.

## `horarios` — `models/horario.py`

| Campo | Tipo | Notas |
|---|---|---|
| id | Integer PK | |
| materia_id | FK → materias.id | a nivel catálogo, no por oferta/período |
| dia_semana | Integer | 0=Lunes .. 6=Domingo |
| hora_inicio / hora_fin | Time | |
| aula | String(50), nullable | |

`UniqueConstraint(materia_id, dia_semana, hora_inicio)`.

## `foro_hilos` / `foro_mensajes` — `models/foro.py`

**foro_hilos**: id, materia_id (FK), titulo, descripcion, creado_por (FK users), fijado (bool), cerrado (bool), created_at.

**foro_mensajes**: id, hilo_id (FK), user_id (FK), contenido, created_at. Sin `updated_at` — la edición (Fase 1) sobreescribe `contenido` directo, ventana de 15 min validada contra `created_at`.

## `eventos_calendario` — `models/evento_calendario.py`

id, titulo, tipo (`parcial`\|`final`\|`feriado`\|`asueto`\|`entrega`\|`actividad`), fecha, fecha_fin (nullable), materia_id (FK, nullable = institucional), carrera_id (FK, nullable), descripcion, creado_por (FK, nullable), anio, semestre, archivo_pdf.

## `apuntes` — `models/apunte.py`

id, user_id (FK), materia_id (FK), titulo, descripcion, archivo_url (legacy), storage_key (R2 actual), tags (comma-separated), aprobado (bool), tipo_contenido (default `pdf`), likes, descargas, visibilidad (default `publico`), fecha_subida.

## `programas` — `models/programa.py`

id, materia_id (FK), semana, titulo, descripcion. Sin bibliografía (a diferencia de `temarios`).

## `temarios` — `models/temario.py`

id, materia_id (FK), semana, titulo, descripcion, bibliografia (JSON, lista de `{autor,titulo,anio,tipo}`).

## `refresh_tokens` — `models/refresh_token.py`

id, usuario_id (FK), token_hash (String(64), unique — SHA-256 del token crudo), expira_en (DateTime tz), revocado (bool), created_at.

## `recordatorios_docente` — `models/recordatorio_docente.py`

Fase 1 (Agenda docente). id, profesor_id (FK users), titulo, descripcion (nullable), fecha (DateTime), materia_id (FK, nullable), completado (bool).

## `pensum_materias` — `models/pensum_materia.py`

Fase 2. id, carrera_id (FK), materia_id (FK), semestre, creditos, es_electiva (bool). `UniqueConstraint(carrera_id, materia_id)` como `uq_pensum_carrera_materia`.

## `correlatividades` — `models/correlatividad.py`

Fase 2. id, materia_id (FK — materia que exige), prerrequisito_id (FK — materia exigida), tipo (`aprobada`\|`cursando`). `CheckConstraint(materia_id != prerrequisito_id)`, `UniqueConstraint(materia_id, prerrequisito_id, tipo)`.

## `avance_alumno_pensum` — `models/avance_alumno_pensum.py`

Fase 2. id, alumno_id (FK users), pensum_materia_id (FK), estado (`pendiente`\|`cursando`\|`aprobada`\|`bloqueada`), fecha_actualizacion (DateTime tz, `onupdate=func.now()`). `UniqueConstraint(alumno_id, pensum_materia_id)`. Se recalcula y cachea en cada `GET /pensum/alumno/{id}/avance`, no se edita a mano.

## `expediente_materias` — `models/expediente_materia.py`

**Para qué sirve:** Registro oficial cerrado de una materia cursada — snapshot de nota final, créditos y condición, independiente de futuras ediciones al pensum o a `Puntaje`.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id | |
| oferta_materia_id | Integer | FK → ofertas_materia.id | Intento concreto (período+profesor), no `materia_id` directo — mismo criterio que `Puntaje`/`Asistencia` |
| nota_final | Numeric(5,2) | | Snapshot, calculado con `_calcular_promedio_final` al momento del cierre |
| creditos | Integer | | Snapshot de `pensum_materias.creditos` al momento del cierre |
| condicion | String(20) | CHECK IN ('aprobada','reprobada') | `nota_final >= 6` → `aprobada` |
| cerrado_por | Integer | FK → users.id | Admin que cerró (auditoría) |
| cerrado_en | DateTime(tz) | server_default now() | |

`UniqueConstraint(alumno_id, oferta_materia_id)` como `uq_expediente_alumno_oferta` — un cierre por alumno por oferta; rectificar una nota es un segundo `POST /expediente/cerrar-materia` que actualiza esta fila (upsert), no crea una nueva.

## `expediente_semestres` — `models/expediente_semestre.py`

**Para qué sirve:** Caché de agregación por alumno+período (PPA del período, créditos, cantidad de aprobadas/reprobadas). Se recalcula y persiste en cada `GET /expediente/alumno/{id}`.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id | |
| periodo | String(10) | | Formato `'YYYY-N'`, ej. `'2026-1'` |
| ppa_periodo | Numeric(5,2), nullable | | PPA solo de las aprobadas de ese período |
| creditos_periodo | Integer | default 0 | |
| materias_aprobadas | Integer | default 0 | |
| materias_reprobadas | Integer | default 0 | |

`UniqueConstraint(alumno_id, periodo)` como `uq_expediente_semestre_alumno_periodo`.

## `regularidad_alumno` — `models/regularidad_alumno.py`

**Para qué sirve:** Caché del estado de regularidad del alumno, recalculado en cada `GET /expediente/alumno/{id}/regularidad`.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id, UNIQUE | |
| estado | String(20) | CHECK IN ('activo','en_riesgo','irregular','de_baja') | Ver `ARQUITECTURA.md` para la lógica y precedencia |
| ppa_acumulado | Numeric(5,2), nullable | | Snapshot de `calcular_ppa()` al momento del cálculo |
| motivo | String(255), nullable | | Texto human-readable (ej. `"PPA 6.5 < 7.0"`) |
| calculado_en | DateTime(tz) | server_default now(), onupdate now() | |

## `fuentes_beca` — `models/financiero.py`

**Para qué sirve:** Catálogo de fuentes de becas (institucional o convenio externo — ITAIPU, BECAL, Fundasep). Sembrada con 4 filas en la migración `s6t7u8v9w0x1`.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| nombre | String(150) | UNIQUE | |
| tipo | String(80) | | `institucional` \| `convenio_externo` |
| es_externa | Boolean | default false | Determina badge visual (🏦 vs 🎓) en frontend |
| requiere_reporte_externo | Boolean | default false | Fuentes externas exportan rendición Excel para el convenio |
| editable_porcentaje | Boolean | default true | Si es false (convenios), el % de descuento es fijo por el proveedor, no editable en UI |

## `becas_catalogo` — `models/financiero.py`

**Para qué sirve:** Catálogo de becas disponibles (nombre, % de descuento, cupos).

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| nombre | String(200) | | |
| fuente_id | Integer | FK → fuentes_beca.id | |
| porcentaje_descuento | Numeric(5,2) | CHECK 0-100 (`ck_beca_porcentaje_rango`) | |
| monto_fijo | Numeric(12,2), nullable | | Alternativa a porcentaje (no usada actualmente en el cálculo) |
| requisitos | Text, nullable | | |
| cupos_totales | Integer, nullable | | |
| cupos_disponibles | Integer, nullable | | |

## `postulaciones_beca` — `models/financiero.py`

**Para qué sirve:** Solicitud de un alumno a una beca del catálogo, con flujo de revisión por comité.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id | |
| beca_id | Integer | FK → becas_catalogo.id | |
| estado | String(20) | CHECK IN ('pendiente','en_revision','aprobada','rechazada') (`ck_postulacion_estado`) | |
| fecha_postulacion | DateTime(tz) | server_default now() | |
| documentos_storage_keys | JSON, nullable | | Keys en R2 de documentos adjuntos |
| motivo_rechazo | Text, nullable | | |
| revisado_por | Integer, nullable | FK → users.id | |
| revisado_en | DateTime(tz), nullable | | |

## `becas_activas` — `models/financiero.py`

**Para qué sirve:** Beca efectivamente otorgada a un alumno (tras aprobar postulación), con vigencia y seguimiento de rendimiento académico para renovación.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id | |
| beca_id | Integer | FK → becas_catalogo.id | |
| fuente_id | Integer | FK → fuentes_beca.id | Denormalizado para reportes de rendición |
| periodo_inicio | String(10) | | |
| periodo_fin | String(10), nullable | | |
| promedio_minimo_requerido | Numeric(5,2), nullable | | |
| promedio_actual | Numeric(5,2), nullable | | |
| estado_renovacion | String(30) | default `vigente`, CHECK IN ('vigente','en_riesgo','suspendida','finalizada') (`ck_beca_activa_estado`) | Solo `vigente` cuenta para el cálculo de descuento |
| otorgado_por | Integer, nullable | FK → users.id | |
| otorgado_en | DateTime(tz) | server_default now() | |

**Decisión de diseño — multi-beca:** un alumno puede tener varias `BecaActiva` vigentes simultáneamente. `calcular_descuento_beca()` (`app/services/financiero.py`) aplica el **mayor** porcentaje entre todas las vigentes (`max()`, no suma) — evita que acumular becas supere el 100% del arancel. `Cuota.beca_aplicada_id` referencia una sola `BecaActiva` (la ganadora), no una lista.

## `conceptos_arancel` — `models/financiero.py`

**Para qué sirve:** Catálogo de conceptos facturables (ej. "Cuota Mensual Ingeniería").

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| nombre | String(200) | | |
| carrera_id | Integer, nullable | FK → carreras.id | Null = aplica a cualquier carrera |
| monto_base | Numeric(12,2) | | |
| periodicidad | String(80) | default `mensual` | mensual / semestral / anual / unica |
| activo | Boolean | default true | |

## `cuotas` — `models/financiero.py`

**Para qué sirve:** Cuota generada para un alumno a partir de un concepto, con el descuento de beca ya aplicado.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id | |
| concepto_id | Integer | FK → conceptos_arancel.id | |
| periodo | String(10) | | |
| monto | Numeric(12,2) | | Monto original del concepto |
| monto_descuento | Numeric(12,2) | default 0 | Calculado con `calcular_descuento_beca()` al generar |
| fecha_vencimiento | Date | | |
| estado | String(20) | default `pendiente`, CHECK IN ('pendiente','pagada','vencida','anulada') (`ck_cuota_estado`) | |
| beca_aplicada_id | Integer, nullable | FK → becas_activas.id | La beca ganadora (mayor %) al momento de generar |
| generado_en | DateTime(tz) | server_default now() | |
| generado_por | Integer, nullable | FK → users.id | |

`monto_a_pagar` (`monto - monto_descuento`) se calcula en `cuota_to_out()`, no persiste como columna.

## `pagos` — `models/financiero.py`

**Para qué sirve:** Registro de un pago sobre una cuota. **Inmutable** — no existe endpoint PUT/DELETE; correcciones se hacen con un pago nuevo `es_ajuste=True` referenciando el original.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| cuota_id | Integer | FK → cuotas.id | |
| monto_pagado | Numeric(12,2) | | |
| fecha_pago | DateTime(tz) | server_default now() | |
| metodo | String(50) | | transferencia / efectivo / cheque / tarjeta / deposito |
| referencia | String(200), nullable | | |
| registrado_por | Integer | FK → users.id | |
| pago_ajuste_ref_id | Integer, nullable | FK → pagos.id | Apunta al pago original que corrige |
| es_ajuste | Boolean | default false | |
| nota_ajuste | Text, nullable | | |

Un pago que cubre el saldo (`monto - monto_descuento`) marca la `Cuota.estado` como `pagada` (`registrar_pago()` en `app/services/financiero.py`); soporta pagos parciales.

## `comprobantes` — `models/financiero.py`

**Para qué sirve:** Referencia al comprobante fiscal (factura electrónica) de un pago. Fase 4 creó la tabla mínima; **Fase 4B** (migración `t7u8v9w0x1y2`) la extendió con el ciclo de vida completo de emisión vía guarani.app.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| pago_id | Integer | FK → pagos.id, UNIQUE | Un comprobante por pago |
| tipo | String(20) | default `factura` | factura / nota_credito / nota_debito / remision (solo `factura` implementado) |
| numero_comprobante | String(50), nullable | | Devuelto por guarani.app |
| cdc | String(44), nullable | | Código de Control DNIT (44 dígitos exactos) |
| timbrado | String(20), nullable | agregado Fase 4B | |
| url_pdf | String(500), nullable | agregado Fase 4B | URL del PDF servido por guarani.app — UCA V2 no almacena el archivo |
| storage_key | String(500), nullable | | Vestigial de Fase 4 — sin uso; el PDF vive en guarani.app, no en R2 |
| estado_emision | String(20) | agregado Fase 4B, default `pendiente`, CHECK IN ('pendiente','emitido','error','reintentando') (`ck_comprobante_estado_emision`) | |
| intentos | Integer | agregado Fase 4B, default 0 | Incrementado en cada intento de emisión; tope 5 (`MAX_INTENTOS` en `facturacion_electronica.py`) |
| ultimo_error | Text, nullable | agregado Fase 4B | Mensaje de la última excepción, visible en panel admin |
| fecha_emision | DateTime(tz), nullable | Fase 4B cambió a nullable (antes se seteaba al crear; ahora solo al emitir con éxito) | |

**Decisión de diseño — degradación con gracia:** un fallo de guarani.app (timeout, HTTP error, credenciales faltantes) nunca revierte ni bloquea el `Pago` — el comprobante queda en `error` y se reintenta (endpoint manual o job cada 10 min, máx. 5 intentos). Ver `ARQUITECTURA.md`.

## `auditoria_override_mora` — `models/financiero.py`

**Para qué sirve:** Registro de auditoría cuando un admin usa `override_mora=true` para inscribir a un alumno bloqueado por mora.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id | |
| admin_id | Integer | FK → users.id | |
| oferta_materia_id | Integer, nullable | FK → ofertas_materia.id | |
| motivo | Text, nullable | | |
| registrado_en | DateTime(tz) | server_default now() | |

## `tipos_tramite` — `models/tramites.py`

**Para qué sirve:** Catálogo fijo de trámites disponibles. Sembrado con 4 filas en la migración `u8v9w0x1y2z3`.

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| nombre | String(200) | UNIQUE | Usado como clave de dispatch para el generador de PDF automático (ver Decisión de diseño) |
| descripcion | Text, nullable | | |
| requiere_aprobacion | Boolean | default false | `false` = intenta generación automática al solicitar; `true` = queda `pendiente` para resolución manual del admin |
| dias_estimados | Integer, nullable | | Informativo, no aplica lógica sobre plazos |

**Decisión de diseño:** no hay columna `codigo`/slug — el servicio (`app/services/tramites.py`, dict `_GENERADORES_AUTO`) hace *dispatch* del generador de PDF por `nombre` exacto. Catálogo fijo sembrado por migración, sin endpoint de edición; si se agrega un endpoint para editar `nombre` en el futuro, este dispatch se rompe silenciosamente — revisar `_GENERADORES_AUTO` primero.

## `solicitudes` — `models/tramites.py`

**Para qué sirve:** Solicitud de un alumno para un trámite del catálogo, con su ciclo de resolución (automática o manual).

| Columna | Tipo | Constraint | Para qué sirve |
|---|---|---|---|
| id | Integer | PK | |
| alumno_id | Integer | FK → users.id | |
| tipo_tramite_id | Integer | FK → tipos_tramite.id | |
| estado | String(20) | default `pendiente`, CHECK IN ('pendiente','en_proceso','resuelta','rechazada') (`ck_solicitud_estado`) | |
| fecha_solicitud | DateTime(tz) | default now() | |
| fecha_resolucion | DateTime(tz), nullable | | Seteada tanto en auto-resolución como en resolución manual |
| resuelto_por | Integer, nullable | FK → users.id | `null` si la solicitud se auto-resolvió (nadie la resolvió manualmente) |
| storage_key_resultado | String(500), nullable | | Key en R2 (prefix `tramite`) del PDF resultante |
| motivo_rechazo | Text, nullable | | Solo poblado si `estado='rechazada'` |

**Decisión de diseño:** trámites automáticos (`tipos_tramite.requiere_aprobacion=false` y con generador en `_GENERADORES_AUTO`) se resuelven de forma **síncrona** dentro de `POST /tramites/solicitudes` — no hay llamada externa de por medio (a diferencia de Fase 4B/guarani.app), así que no hace falta background task ni job de reintentos. Si el alumno no está en estado `activo` (`calcular_regularidad()` de Fase 3), la solicitud automática se rechaza con `ValueError` (422) en vez de crearse en `pendiente`.

## Diagrama de dependencias (FK, alto nivel)

```
carreras ← materias ← ofertas_materia ← inscripciones
                    ↖                 ↖ puntajes
                     ↖                ↖ asistencias
                      pensum_materias ← avance_alumno_pensum
                      correlatividades (auto-referencia a materias)
                      ofertas_materia ← expediente_materias
users ← refresh_tokens, recordatorios_docente, foro_hilos, foro_mensajes, apuntes,
        expediente_materias, expediente_semestres, regularidad_alumno

fuentes_beca ← becas_catalogo ← postulaciones_beca
                              ← becas_activas → cuotas.beca_aplicada_id
carreras ← conceptos_arancel ← cuotas ← pagos ← comprobantes
users ← becas_activas, cuotas, pagos, comprobantes (vía pagos), auditoria_override_mora
```

## Nota de integridad (drift histórico, ya resuelto)

`materias` y varias tablas de Fase 0 fueron creadas originalmente vía `Base.metadata.create_all()`, no por Alembic — causó un drift real entre el constraint del modelo (`uq_materia_nombre_carrera`) y el schema de Postgres (`materias_nombre_key`, solo sobre `nombre`). Corregido en migración `o2p3q4r5s6t7`. Toda tabla desde entonces se crea exclusivamente vía revisión Alembic.
