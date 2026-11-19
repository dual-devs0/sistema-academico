# Servicios — Sistema Académico UCA V2

> Generado leyendo cada archivo real en `backend/app/services/`. Por cada función pública (sin prefijo `_`): firma, qué hace, de qué depende y quién la llama (grep sobre `backend/app/routers/*.py`). Las funciones privadas (`_prefijo`) se listan solo si son necesarias para entender el flujo, sin sección propia.

## asistencia_utils.py

> Puntaje de asistencia por sesión de clase (escala 0-5). Regla de negocio real de la facultad (no está en el Reglamento formal): presente → 5, ausente justificado → 3 o 4 (a criterio del profesor), ausente sin justificar → 0. El "% de asistencia" de un alumno es el promedio de estos puntajes escalado a 100, no un simple presentes/total. `puntaje_sesion()` (Python) y `puntaje_asistencia_sql()` (SQL `case()`) son equivalentes y deben mantenerse en sync.

### `puntaje_sesion(presente: bool, motivo: str | None, puntaje_justificacion: int | None) -> int`
Calcula el puntaje (0/3/4/5) de una única sesión de asistencia, fila por fila en Python. Si `presente` es True devuelve 5; si no, usa `puntaje_justificacion` (3 o 4) si está seteado, si no y hay `motivo` cae al default 4 (registros legacy), si no hay nada devuelve 0.
Depende de: nada (función pura).
Llamada por: `routers/alumno_router.py`.

### `porcentaje_desde_puntajes(puntajes: list[int]) -> float`
Promedia una lista de puntajes de sesión y la escala a 0-100 (`avg/5*100`), redondeado a 1 decimal. Devuelve 0.0 si la lista está vacía.
Depende de: nada (función pura).
Llamada por: sin referencias directas en `routers/` <!-- TODO: verificar --> (probablemente usada dentro de otros services o en tests).

### `puntaje_asistencia_sql(Asistencia) -> ColumnElement`
Versión SQLAlchemy `case()` de `puntaje_sesion()`, para usar dentro de `func.sum()`/`func.avg()` en queries agregadas sin traer todas las filas a Python.
Depende de: el modelo `Asistencia` pasado como parámetro (columnas `presente`, `puntaje_justificacion`, `motivo`).
Llamada por: `routers/asistencias_router.py`, `routers/notas_router.py`, `routers/reportes_router.py`, y `services/expediente.py::calcular_regularidad`.

---

## autorizacion.py

> Chequeos de autorización de dominio reusados por varios routers para no duplicar la misma query ("¿este profesor dicta esta materia?", "¿es su alumno?"). Un falso positivo acá permite a un profesor ver/editar datos de una materia o alumno ajeno.

### `es_profesor_de_materia(db: Session, materia_id: int, profesor_id: int) -> bool`
True si `profesor_id` dicta una oferta **activa** de `materia_id` (`OfertaMateria.activa == True`).
Depende de: modelo `OfertaMateria`.
Llamada por: `routers/asistencias_router.py`, `routers/horarios_router.py`, `routers/inscripciones_router.py`, `routers/profesor_router.py`, `routers/programas_router.py`, `routers/puntajes_router.py`.

### `es_profesor_de_alumno(db: Session, profesor_id: int, alumno_id: int) -> bool`
True si el profesor dicta al menos una materia activa en la que el alumno está inscripto (join `Inscripcion` ↔ `OfertaMateria`).
Depende de: modelos `Inscripcion`, `OfertaMateria`.
Llamada por: `routers/asistencias_router.py`, `routers/boleta_router.py`, `routers/puntajes_router.py`.

---

## boleta_data.py

> Reshape de `construir_reporte_notas()` al contrato `BoletaData` que consume el módulo Boleta del frontend (`frontend/src/pages/Boleta/types.ts`). Una sola fuente de datos (`services/reporte_notas.py`) evita que boleta arme su propia vista con llamadas sueltas.

### `construir_boleta_data(db, alumno_id: int) -> dict | None`
Arma el objeto `{resumen, periodos}` que espera la vista de Boleta: resumen global (promedio, materias aprobadas/totales, % de avance de carrera, materias que faltan) y el detalle por semestre (materias con p1/p2/tp/final/promedio/estado). Si la carrera no tiene plan de estudios configurado, cae a un fallback que usa el total de materias con nota vigente como denominador. Devuelve `None` si el alumno no existe.
Depende de: `services/reporte_notas.py::construir_reporte_notas`, `_mejor_final()` (privada, elige la mejor nota entre directa/final1/2/3).
Llamada por: `routers/boleta_router.py`.

---

## boleta_pdf.py

> Genera el PDF de Boleta con WeasyPrint + Jinja2 (`app/templates/boleta_pdf.html`) a partir del reporte SIN filtrar de `reporte_notas.py`. El parámetro `scope` decide qué páginas se arman: `global` (resumen + una página por semestre), `anio` (mini-resumen acotado + semestres de ese año), `semestre_actual` (una sola página de detalle, sin resumen).

### `render_boleta_pdf(reporte: dict, scope: str, anio: int | None = None, semestre: int | None = None) -> bytes`
Punto de entrada único del módulo. Recorta `reporte["semestres"]` según `scope`/`anio`, arma el contexto Jinja2 (logo en base64, KPIs, tabla de evolución, detalle por período) y renderiza `boleta_pdf.html` a bytes de PDF vía WeasyPrint. El `import weasyprint` es lazy (dentro de la función) porque exige librerías de sistema (Pango/GTK) que pueden no estar presentes; el error solo aparece al renderizar, no al importar el módulo.
Depende de: `puntajes_utils.APROBACION_MINIMA`, funciones privadas `_badge_clase`, `_kpi_clase`, `_nota_label`, `_periodo_label`, `_fmt_fecha`, `_logo_data_uri`, `_resumen_ctx`, `_detalle_periodo`; recibe como input el dict de `reporte_notas.py::construir_reporte_notas`.
Llamada por: `routers/boleta_router.py`.

---

## equivalencia.py

> Fase 5D: Equivalencias y suficiencia. Al aprobar una equivalencia, inserta en `expediente_materias` y actualiza `avance_alumno_pensum` (integración con Fase 2/3 de pensum).

### `crear_solicitud(alumno_id: int, tipo: str, universidad_origen: Optional[str], db: Session) -> SolicitudEquivalencia`
Crea una `SolicitudEquivalencia`. Rechaza (`ValueError`) si el alumno ya tiene una solicitud en estado `pendiente` o `en_proceso`.
Depende de: modelo `SolicitudEquivalencia`.
Llamada por: `routers/equivalencias_router.py`.

### `resolver_materia(solicitud_id: int, materia_eq_id: int, resolucion: str, materia_destino_id: Optional[int], db: Session) -> EquivalenciaMateria`
Resuelve (aprueba/rechaza) una materia individual dentro de una solicitud de equivalencia. Sincroniza el estado de la `SolicitudEquivalencia` padre (`resuelta`/`rechazada`/`en_proceso`) según cuántas materias hijas quedan pendientes. Si `resolucion == "aprobada"` y hay `materia_destino_id`: busca/crea una `OfertaMateria` sintética con `periodo="EQUIVALENCIA"`, inserta un `ExpedienteMateria` con `nota_final=6.0` y `condicion="aprobada"`, y actualiza/crea el `AvanceAlumnoPensum` correspondiente a `estado="aprobada"`.
Depende de: modelos `EquivalenciaMateria`, `SolicitudEquivalencia`, `Materia`, `PensumMateria`, `OfertaMateria`, `ExpedienteMateria`, `AvanceAlumnoPensum`.
Llamada por: `routers/equivalencias_router.py`.

### `crear_examen_suficiencia(alumno_id: int, materia_id: int, fecha: date, db: Session) -> ExamenSuficiencia`
Crea un registro de examen de suficiencia para un alumno/materia.
Depende de: modelo `ExamenSuficiencia`.
Llamada por: `routers/equivalencias_router.py`.

### `obtener_equivalencias_alumno(alumno_id: int, db: Session) -> list[SolicitudEquivalencia]`
Lista las solicitudes de equivalencia de un alumno (más recientes primero), enriquecidas en memoria con `s.alumno_nombre` para no exponer solo el ID crudo al admin.
Depende de: modelo `SolicitudEquivalencia` (con `joinedload(alumno)`).
Llamada por: `routers/equivalencias_router.py`.

---

## expediente.py

> Cálculo de PPA (promedio ponderado acumulado) y regularidad académica a partir del expediente cerrado (`ExpedienteMateria`). No depende de nada externo salvo modelos ORM y `puntajes_utils` (redondeo). Recibe el entero 1-5 (Art. 24 Reglamento UCA) ya calculado por `puntajes_utils.calcular_promedio_final` al cerrar cada materia — no recalcula puntos, solo agrega/promedia.

### `asistencia_minima_institucional(db: Session) -> float`
% de asistencia mínimo institucional, leído de `GlobalSetting` (`categoria="academico"`, `key="porcentaje_asistencia_minimo"`), configurable por el admin en Ajustes Globales. Fallback a `ASISTENCIA_UMBRAL_RIESGO` (75%) si el setting aún no existe en la DB.
Depende de: modelo `GlobalSetting`.
Llamada por: `routers/puntajes_router.py`.

### `calcular_ppa(alumno_id: int, db: Session) -> dict`
`PPA = Σ(nota_final × créditos) / Σ(créditos)` sobre `ExpedienteMateria` con `condicion="aprobada"`, redondeado a entero con round-half-up (el PPA institucional es un entero puro en escala 1-5). Devuelve `{"ppa": int|None, "creditos_computados": int}`; `ppa` es `None` (nunca 0) si el alumno no tiene ninguna materia aprobada.
Depende de: modelo `ExpedienteMateria`, `puntajes_utils.redondear_half_up`.
Llamada por: `routers/expediente_router.py`, y usada internamente por `services/graduacion.py` (`verificar_condicion_egreso`, `listar_candidatos`) y `services/tramites.py` (constancia/historial PDF).

### `calcular_regularidad(alumno_id: int, db: Session) -> dict`
Clasifica al alumno en `activo`/`en_riesgo`/`irregular`/`de_baja`. Precedencia (el más severo gana): `de_baja` > `irregular` > `en_riesgo` > `activo`. Reglas: (1) de baja si no tiene inscripciones en los últimos 3 períodos del sistema (se salta si el sistema tiene menos de 3 períodos de historia); (2) irregular si tiene una materia reprobada fuera del plazo de recursado (2 períodos) sin haberla aprobado después; (3) en riesgo si PPA < `APROBACION_MINIMA + 1` o si el % de asistencia global cae bajo el umbral institucional; (4) activo en cualquier otro caso. Devuelve `{"estado": str, "motivo": str|None, "ppa_acumulado": float|None}`.
Depende de: `calcular_ppa` (este mismo módulo), modelos `OfertaMateria`, `Inscripcion`, `ExpedienteMateria`, `Materia`, `Asistencia`; `asistencia_utils.puntaje_asistencia_sql`, `asistencia_minima_institucional`.
Llamada por: `routers/expediente_router.py`, y usada internamente por `services/tramites.py::crear_solicitud` (gate para trámites automáticos).

---

## facturacion_electronica.py

> Integración con guarani.app (Fase 4B) para emitir comprobantes fiscales. Regla no negociable: un fallo del proveedor externo NUNCA bloquea el pago académico — el pago ya quedó registrado por `services/financiero.py` antes de llamar a este módulo; acá solo se intenta emitir el comprobante y, si falla, queda en estado `error` para reintento posterior. UCA V2 no genera ni firma XML fiscal, solo consume la respuesta de la API externa y persiste la referencia (cdc, número de comprobante, timbrado, URL del PDF).

### `emitir_factura(pago: Pago, alumno: User, concepto_nombre: str) -> dict` *(async)*
Llama a `POST {GUARANI_APP_BASE_URL}/facturas` con los datos del pago/alumno y retorna el JSON de respuesta (número de comprobante, cdc, timbrado, url_pdf). Lanza `RuntimeError` si `GUARANI_APP_API_KEY` no está configurada, o propaga la excepción de `httpx` (timeout, HTTP error) si la llamada falla.
Depende de: env vars `GUARANI_APP_BASE_URL`, `GUARANI_APP_API_KEY`, `GUARANI_APP_PUNTO_EMISION`; `httpx`.
Llamada por: sin referencias directas en `routers/` <!-- TODO: verificar --> — se invoca únicamente desde `procesar_facturacion` (mismo módulo).

### `procesar_facturacion(pago_id: int, comprobante_id: int) -> None` *(async)*
Orquesta la emisión (o reintento) de una factura: abre su propia `SessionLocal()` (se llama tanto desde un background task de request como desde un job de reintentos, ninguno con sesión de DB viva propia), llama a `emitir_factura`, y en éxito actualiza el `Comprobante` a `estado_emision="emitido"` + notifica por email al alumno; en fallo lo marca `error` con `ultimo_error` y loguea un warning. Nunca re-lanza excepciones.
Depende de: `emitir_factura` (este módulo), `app.database.SessionLocal`, `app.email_utils._send_with_retry`/`_credentials_configured`, modelos `Comprobante`, `Pago`, `User`.
Llamada por: `routers/finanzas_router.py`.

---

## financiero.py

> Lógica de negocio financiera + becas. Reglas críticas: toda escritura de pagos corre bajo transacción atómica; los pagos son INMUTABLES (ningún endpoint PUT/DELETE expuesto); las correcciones se hacen como un pago nuevo con `es_ajuste=True`; el bloqueo de inscripción por mora compara cuotas vencidas contra el umbral de la carrera, EXCEPTO si el alumno tiene beca 100% (override implícito); con múltiples becas activas se aplica el mayor porcentaje entre las vigentes.

### `calcular_descuento_beca(alumno_id: int, db: Session) -> tuple[Decimal, Optional[BecaActiva]]`
Retorna `(porcentaje_descuento, beca_activa_aplicada)` — el mayor porcentaje entre todas las `BecaActiva` con `estado_renovacion="vigente"` del alumno. `(0, None)` si no tiene becas.
Depende de: modelo `BecaActiva` (vía `_becas_vigentes` privada).
Llamada por: sin referencias directas en `routers/` <!-- TODO: verificar --> — se invoca desde `generar_cuotas_alumno` (mismo módulo).

### `tiene_beca_100(alumno_id: int, db: Session) -> bool`
True si el alumno tiene al menos una beca vigente con `porcentaje_descuento >= 100`.
Depende de: modelo `BecaActiva`.
Llamada por: sin referencias directas en `routers/` <!-- TODO: verificar --> — se invoca desde `verificar_deuda_inscripcion` (mismo módulo).

### `get_becas_activas_out(alumno_id: int, db: Session) -> List[BecaActivaOut]`
Shape exacto para `GET /becas/alumno/{id}/activas`: todas las `BecaActiva` del alumno (no solo vigentes) con nombre de beca/fuente resueltos.
Depende de: modelos `BecaActiva`, schema `BecaActivaOut`.
Llamada por: `routers/becas_router.py`.

### `generar_cuotas_alumno(alumno_id: int, concepto_id: int, periodos: List[str], fecha_vencimiento_base: date, generado_por: int, db: Session) -> List[Cuota]`
Genera una `Cuota` por cada período de la lista (fecha de vencimiento incrementando un mes por índice), descontando el mayor % de beca vigente del alumno. Operación atómica.
Depende de: `calcular_descuento_beca` (este módulo), modelos `ConceptoArancel`, `Cuota`.
Llamada por: `routers/finanzas_router.py`.

### `cuota_to_out(cuota: Cuota) -> CuotaOut`
Convierte una `Cuota` ORM a su schema de salida, resolviendo nombre de beca/fuente aplicada, si es beca externa, y el último pago asociado (con estado/URL del comprobante si existe).
Depende de: schema `CuotaOut`, relaciones `cuota.beca_aplicada`, `cuota.pagos`.
Llamada por: `routers/finanzas_router.py`.

### `registrar_pago(cuota_id: int, monto_pagado: Decimal, metodo: str, registrado_por: int, db: Session, referencia: Optional[str] = None, pago_ajuste_ref_id: Optional[int] = None, nota_ajuste: Optional[str] = None) -> Pago`
Registra un `Pago` de forma atómica. Soporta pagos parciales: la `Cuota` solo pasa a `estado="pagada"` cuando la suma de pagos no-ajuste ≥ monto a pagar. Rechaza (`ValueError`) pagar una cuota `anulada`.
Depende de: modelos `Cuota`, `Pago`.
Llamada por: `routers/finanzas_router.py`.

### `verificar_deuda_inscripcion(alumno_id: int, db: Session, es_admin: bool = False) -> EstadoDeudaOut`
Verifica si el alumno puede inscribirse: cuenta cuotas `pendiente` vencidas y compara contra `Carrera.max_cuotas_mora` (default 1). EXCEPCIÓN CRÍTICA: si `tiene_beca_100`, nunca bloquea. `override_disponible` refleja si el caller es admin.
Depende de: `tiene_beca_100` (este módulo), modelos `User`, `Carrera`, `Cuota`, schema `EstadoDeudaOut`.
Llamada por: `routers/finanzas_router.py`, `routers/inscripciones_router.py` (gate real al inscribir).

### `registrar_override_mora(alumno_id: int, admin_id: int, db: Session, oferta_materia_id: Optional[int] = None, motivo: Optional[str] = None) -> AuditoriaOverrideMora`
Registra en auditoría que un admin omitió el bloqueo por mora al inscribir a un alumno.
Depende de: modelo `AuditoriaOverrideMora`.
Llamada por: `routers/inscripciones_router.py`.

### `export_rendicion_excel(fuente_id: int, periodo: Optional[str], db: Session) -> bytes`
Genera un Excel (openpyxl) con la rendición de becas por fuente externa: Alumno, Cédula, Carrera, Beca, Fuente, % Descuento, Monto Becado, Período. Lanza `RuntimeError` si `openpyxl` no está instalado.
Depende de: `openpyxl`, modelos `BecaActiva`, `User`, `Carrera`, `BecaCatalogo`, `FuenteBeca`, `Cuota`.
Llamada por: `routers/becas_router.py`.

---

## graduacion.py

> Fase 5B: Graduación y tesis. Regla: `verificar_condicion_egreso` es función pura (solo lectura, sin escritura).

### `ppa_minimo_institucional(db: Session) -> int`
PPA mínimo para graduarse, leído de `GlobalSetting` (`key="ppa_minimo"`), configurable por el admin. Fallback a `puntajes_utils.APROBACION_MINIMA` si el setting no existe aún.
Depende de: modelo `GlobalSetting`, `puntajes_utils.redondear_half_up`.
Llamada por: sin referencias directas en `routers/` <!-- TODO: verificar --> — se invoca desde `verificar_condicion_egreso` y `listar_candidatos` (mismo módulo).

### `verificar_condicion_egreso(alumno_id: int, db: Session) -> dict`
Verifica créditos aprobados vs. `Carrera.creditos_totales`, PPA actual vs. mínimo institucional, y pasantía completada (actualmente `pasantia_exigida=False` siempre — hook para extender por carrera). Devuelve un dict detallado por condición individual (nunca solo un booleano agregado) más `puede_graduarse` y `motivo` textual. Si el alumno no existe, devuelve todo en `False`/0 con motivo "Alumno no encontrado".
Depende de: `services/expediente.py::calcular_ppa`, `services/pasantia.py::pasantia_completada_por_alumno`, `ppa_minimo_institucional` (este módulo), modelos `User`, `Carrera`, `PensumMateria`, `AvanceAlumnoPensum`.
Llamada por: `routers/graduacion_router.py`.

### `listar_candidatos(db: Session, carrera_id: Optional[int] = None, q: Optional[str] = None, skip: int = 0, limit: int = 20) -> tuple[list[dict], int]`
Lista paginada de alumnos con su condición de egreso resuelta por fila, calculada con **queries agregadas por lote** (batch de `Carrera`, `ProcesoGraduacion`, `EtapaTesis`, `ExpedienteMateria`, créditos, pasantía) para evitar N+1 en cohortes grandes — no reimplementa `verificar_condicion_egreso` por alumno.
Depende de: modelos `User`, `Carrera`, `ProcesoGraduacion`, `EtapaTesis`, `ExpedienteMateria`, `AvanceAlumnoPensum`, `PensumMateria`, `Pasantia`; `ppa_minimo_institucional` (este módulo).
Llamada por: `routers/graduacion_router.py`.

### `iniciar_proceso(alumno_id: int, db: Session) -> ProcesoGraduacion`
Crea un `ProcesoGraduacion` para el alumno. Rechaza (`ValueError`) si ya tiene un proceso `en_proceso`/`tesis_en_curso` activo, o si `verificar_condicion_egreso` indica que no puede graduarse.
Depende de: `verificar_condicion_egreso` (este módulo), modelo `ProcesoGraduacion`.
Llamada por: `routers/graduacion_router.py`.

### `asignar_tutor(proceso_id: int, tutor_id: int, db: Session) -> ProcesoGraduacion`
Asigna un tutor (debe ser `User` con `role="profesor"`) a un proceso de graduación existente.
Depende de: modelos `ProcesoGraduacion`, `User`.
Llamada por: `routers/graduacion_router.py`.

### `actualizar_etapa(etapa_id: int, estado: str, observaciones: Optional[str], db: Session) -> EtapaTesis`
Actualiza estado/observaciones de una `EtapaTesis` existente.
Depende de: modelo `EtapaTesis`.
Llamada por: `routers/graduacion_router.py`.

---

## notificaciones_push.py

> Notificaciones Web Push (pywebpush + VAPID). Envía a las suscripciones guardadas en `SuscripcionPush`; degrada con gracia si las VAPID keys no están configuradas (genera claves efímeras y loguea warning en vez de fallar).

### `get_vapid_keys() -> tuple[str, str, str]`
Lee `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_CLAIM_EMAIL` de env. Si faltan o `VAPID_PUBLIC_KEY == "BP_placeholder"`, genera un par de claves efímero en memoria vía `_generar_vapid_keys()` (privada) y loguea un warning — las claves generadas no persisten entre reinicios del proceso.
Depende de: env vars `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CLAIM_EMAIL`; `py_vapid.Vapid`.
Llamada por: `routers/notificaciones_router.py`.

### `enviar_notificacion(subscription: SuscripcionPush, titulo: str, cuerpo: str, url: str = "") -> bool`
Envía un push individual vía `pywebpush.webpush()`. Captura `WebPushException` y cualquier excepción inesperada, logueando el error y devolviendo `False` en vez de propagar.
Depende de: `get_vapid_keys` (este módulo), `pywebpush`.
Llamada por: sin referencias directas en `routers/` <!-- TODO: verificar --> — se invoca desde `enviar_notificaciones_masivo` (mismo módulo).

### `enviar_notificaciones_masivo(subscriptions: list[SuscripcionPush], titulo: str, cuerpo: str, url: str = "") -> tuple[int, int]`
Envía la misma notificación a una lista de suscripciones, devolviendo `(exitosos, fallidos)`.
Depende de: `enviar_notificacion` (este módulo).
Llamada por: `routers/notificaciones_router.py`.

---

## pagos_online.py

> Pagos online vía Stripe Checkout Sessions + verificación de webhooks. El monto SIEMPRE es `Decimal` (nunca `float`) hasta el punto de conversión a centavos. Depende de env vars `STRIPE_*` (placeholder mientras no haya cuenta real configurada).

### `init_stripe() -> None`
Setea `stripe.api_key` desde `STRIPE_SECRET_KEY` solo si está configurada y no es el placeholder `sk_test_placeholder`; si no, loguea warning y deja Stripe sin inicializar.
Depende de: env var `STRIPE_SECRET_KEY`, librería `stripe`.
Llamada por: `routers/finanzas_router.py` (probablemente al arrancar el router/app <!-- TODO: verificar -->).

### `crear_checkout_session(cuota_id: int, monto: Decimal, alumno_email: str, success_url: str, cancel_url: str, metadata: Optional[dict] = None) -> stripe.checkout.Session`
Crea una Stripe Checkout Session en modo `payment`, moneda `pyg`, con `unit_amount = int(monto * 100)` (conversión a centavos solo en este punto). Lanza `RuntimeError` si Stripe no está inicializado (`stripe.api_key` vacío).
Depende de: `init_stripe` debe haberse llamado antes; librería `stripe`.
Llamada por: `routers/finanzas_router.py`.

### `confirmar_pago_webhook(payload: bytes, sig_header: str) -> stripe.Event`
Verifica la firma del webhook de Stripe con `STRIPE_WEBHOOK_SECRET`. Si el secret no está configurado o es el placeholder `whsec_placeholder`, **salta la verificación de firma** (loguea warning) y construye el evento directamente con `json.loads(payload)` — sin esta verificación, cualquiera podría falsificar un evento "pago confirmado" contra ese endpoint.
Depende de: env var `STRIPE_WEBHOOK_SECRET`, librería `stripe`.
Llamada por: `routers/finanzas_router.py`.

---

## pasantia.py

> Fase 5C: Pasantías.

### `crear_empresa(nombre, rubro, contacto, telefono, email, convenio_activo: bool, db: Session) -> EmpresaReceptora`
Crea una `EmpresaReceptora`. Rechaza (`ValueError`) si ya existe una empresa con el mismo `nombre`.
Depende de: modelo `EmpresaReceptora`.
Llamada por: `routers/pasantias_router.py`.

### `crear_solicitud_pasantia(alumno_id: int, empresa_id: int, fecha_inicio: date, horas_requeridas: int, db: Session) -> Pasantia`
Crea una `Pasantia` en estado `pendiente`. Rechaza si la empresa no existe.
Depende de: modelos `EmpresaReceptora`, `Pasantia`.
Llamada por: `routers/pasantias_router.py`.

### `aprobar_pasantia(pasantia_id: int, tutor_id: int, db: Session) -> Pasantia`
Pasa la pasantía a `en_curso` y asigna `tutor_academico_id`. Rechaza si la pasantía no existe o si `tutor_id` no corresponde a un `User` con `role="profesor"`.
Depende de: modelos `Pasantia`, `User`.
Llamada por: `routers/pasantias_router.py`.

### `actualizar_horas(pasantia_id: int, horas_completadas: int, db: Session, current_user) -> Pasantia`
Actualiza `horas_completadas`. Autorización: solo `admin` o el tutor académico asignado (`current_user.user_id == pasantia.tutor_academico_id`); si no, lanza `PermissionError`.
Depende de: modelo `Pasantia`.
Llamada por: `routers/pasantias_router.py`.

### `subir_informe(pasantia_id: int, tipo: str, storage_key: Optional[str], db: Session, current_user) -> InformePasantia`
Registra un `InformePasantia` (referencia a un archivo ya subido a storage). Autorización: admin, el alumno dueño de la pasantía, o su tutor académico; si no, `PermissionError`.
Depende de: modelo `InformePasantia`.
Llamada por: `routers/pasantias_router.py`.

### `rechazar_pasantia(pasantia_id: int, db: Session, motivo: str | None = None) -> Pasantia`
Marca la pasantía `rechazada` y opcionalmente guarda `motivo_rechazo`.
Depende de: modelo `Pasantia`.
Llamada por: `routers/pasantias_router.py`.

### `finalizar_pasantia(pasantia_id: int, db: Session, current_user) -> Pasantia`
Marca la pasantía `completada`. Autorización: admin o tutor académico asignado. Rechaza (`ValueError`) si `horas_completadas < horas_requeridas`.
Depende de: modelo `Pasantia`.
Llamada por: `routers/pasantias_router.py`.

### `pasantia_completada_por_alumno(alumno_id: int, db: Session) -> bool`
True si el alumno tiene al menos una `Pasantia` con `estado="completada"`.
Depende de: modelo `Pasantia`.
Llamada por: `services/graduacion.py::verificar_condicion_egreso` (sin referencias directas en `routers/` <!-- TODO: verificar -->).

---

## pensum.py

> Solapamiento de horarios, estado de avance por materia, y validación de correlatividades (bloqueo real de inscripción). Si `validar_correlatividades` falla silenciosamente (retorna válido cuando no debería), un alumno se inscribe sin cumplir prerrequisitos.

### `verificar_solapamiento_inscripcion(db: Session, alumno_id: int, materia_id_nueva: int) -> list[str]`
Compara los horarios de la materia nueva contra los horarios de todas las materias en las que el alumno ya está inscripto; devuelve una lista de descripciones textuales de conflictos (vacía si no hay solapamiento).
Depende de: modelos `Horario`, `Inscripcion`, `Materia` (vía `app.models as m`).
Llamada por: `routers/horarios_router.py`, `routers/inscripciones_router.py`.

### `promedio_y_estado_intento(db: Session, alumno_id: int, materia_id: int) -> tuple[float | None, bool, bool]`
Para una materia: `(mejor nota final entre todas las ofertas, si está inscripto en una oferta ACTIVA, si tiene un intento en oferta ya CERRADA con nota reprobatoria)`.
Depende de: `puntajes_utils.calcular_promedio_final`, `puntajes_utils.get_pesos`, modelos `OfertaMateria`, `Inscripcion`, `Puntaje`.
Llamada por: `routers/pensum_router.py`.

### `validar_correlatividades(alumno_id: int, materia_id: int, db: Session) -> dict`
Evalúa TODOS los prerrequisitos (`Correlatividad`) de `materia_id` para el alumno — no corta en el primero que falla. Tipo `aprobada` exige nota aprobatoria en cualquier oferta del prerrequisito; tipo `cursando` exige inscripción activa en él. Devuelve `{"valido": bool, "pendientes": [{"materia_id", "tipo"}, ...]}`.
Depende de: `_tiene_nota_aprobatoria`/`_tiene_inscripcion` (privadas, este módulo), modelo `Correlatividad`.
Llamada por: `routers/inscripciones_router.py` (gate real de inscripción), `routers/pensum_router.py`.

### `validar_correlatividad_estructural(carrera_id: int, materia_id: int, prerrequisito_id: int, db: Session) -> dict`
Validaciones estructurales al crear una correlatividad (sin considerar alumnos): (1) el prerrequisito debe pertenecer a un semestre **anterior** al de `materia_id` en el mismo pensum; (2) BFS para evitar que la nueva correlatividad cree un ciclo. Devuelve `{"valido": bool, "error": str|None}`.
Depende de: modelos `PensumMateria`, `Correlatividad`.
Llamada por: `routers/pensum_router.py`.

---

## puntajes_utils.py

> Utilidades compartidas para el cálculo de promedios sobre puntos configurables por materia. Motor de notas 0-100 por puntos (parcial1/parcial2/práctico + final, mejor oportunidad entre final1/2/3); el resultado final es un ENTERO 1-5 — escala oficial UCA (Art. 24º Reglamento de Estudiante) — no 0-10. Si `get_pesos()`/`calcular_promedio_final()` calculan mal, el error se propaga directo al PPA y a la boleta oficial del alumno.

### `redondear_half_up(x: float) -> int`
Round-half-up a entero (3.5 → 4, no banker's rounding de Python `round()`). Única función de redondeo del sistema de notas — usada tanto para `porcentaje_a_escalon` como para el PPA.
Depende de: nada (función pura, usa `math.floor`).
Llamada por: `routers/expediente_router.py`; internamente por `porcentaje_a_escalon` (este módulo) y `services/graduacion.py::ppa_minimo_institucional`.

### `porcentaje_a_escalon(pct: float) -> int`
Convierte un porcentaje 0-100 a la nota final entera 1-5 según la tabla oficial Art. 24 (0-59→1, 60-69→2, 70-79→3, 80-90→4, 91-100→5; bandas asimétricas, no repartidas parejo). Redondea round-half-up ANTES de mapear.
Depende de: `redondear_half_up` (este módulo).
Llamada por: sin referencias directas en `routers/` <!-- TODO: verificar --> — se invoca desde `calcular_promedio_final` (mismo módulo).

### `get_pesos(db: Session, materia_id: int | None) -> dict[str, float]`
Puntaje máximo configurado por tipo (parcial1/parcial2/practico/final) para una materia, leído de `PesoEvaluacion`. Sin fila configurada, cae al default `20/20/10/50` (`PESO_DEFAULT`).
Depende de: modelo `PesoEvaluacion`.
Llamada por: `routers/expediente_router.py`, `routers/notas_router.py`, `routers/profesor_router.py`, `routers/puntajes_router.py`, `routers/reportes_router.py`.

### `calcular_promedio_final(notas: dict[str, float | None], pesos: dict[str, float] | None = None) -> int | None`
Nota final entera 1-5 a partir de puntos obtenidos/puntos máximos configurados, convertidos a % y mapeados con `porcentaje_a_escalon`. Si falta algún tipo, calcula proporcional solo con los tipos presentes (materia "en curso"). El final efectivo es el mayor valor no nulo entre `final1/final2/final3`. Si hay nota `directa` (carga simplificada del profesor), se usa tal cual (el profesor decide el escalón 1-5 directamente, sin conversión de %).
Depende de: `porcentaje_a_escalon` (este módulo).
Llamada por: `routers/expediente_router.py`, `routers/notas_router.py`, `routers/profesor_router.py`, `routers/puntajes_router.py`, `routers/reportes_router.py`; y usada internamente por `services/pensum.py`, `services/reporte_notas.py`.

### `promedios_por_alumno(db: Session, user_ids: list[int]) -> dict[int, float]`
Promedio informal por alumno (float, no redondeado a entero) para KPIs de dashboard — promedio simple de las notas finales por materia, cada una ya calculada con `porcentaje_a_escalon`. NO es el PPA oficial (ese es `expediente.py::calcular_ppa`, ponderado por créditos y entero). Reemplaza el `AVG(valor)` crudo, que mezclaría escalas distintas (parcial máx 20 vs final máx 50) sin sentido.
Depende de: `calcular_promedio_final`, `get_pesos` (este módulo), modelo `Puntaje`.
Llamada por: `routers/admin_router.py`, `routers/puntajes_router.py`, `routers/reportes_router.py`.

---

## reporte_notas.py

> Agregación de datos para el reporte de calificaciones del alumno (JSON + PDF). Agrupa notas por semestre usando `OfertaMateria.periodo` (ej. `"2026-1"`). Detecta recursadas: una materia con notas en más de una `OfertaMateria` — el intento del período más reciente es el "vigente". Las métricas de avance usan `PensumMateria` con el mismo criterio de aprobación que `pensum_router::creditos_alumno` (aprobada si CUALQUIER intento, no solo el vigente, dio nota ≥ `APROBACION_MINIMA`).

### `construir_reporte_notas(db: Session, alumno_id: int, semestre: str | None = None) -> dict | None`
Función central del módulo (única pública). Carga todos los `Puntaje` del alumno, los agrupa por oferta/materia, calcula el promedio de cada intento con `calcular_promedio_final`, determina el intento vigente por materia y detecta recursadas. Calcula métricas globales (promedio general, materias aprobadas, avance % contra el pensum de la carrera si existe) y arma la salida por semestre (filtrable por `semestre`). Devuelve `None` si el alumno no existe.
Depende de: `puntajes_utils.calcular_promedio_final`, `puntajes_utils.get_pesos`, `puntajes_utils.APROBACION_MINIMA`, modelos `User`, `Carrera`, `Puntaje`, `OfertaMateria`, `Materia`, `PensumMateria`.
Llamada por: `routers/alumno_router.py`, `routers/boleta_router.py` (vía `boleta_data.py`), `routers/reporte_notas_router.py`.

---

## storage.py

> Storage de archivos (Cloudflare R2 / S3-compatible) — fotos de perfil, apuntes, comprobantes, informes de pasantía. Valida extensión/tamaño antes de subir. Nunca expone la key cruda al cliente.

### `subir_archivo(file_bytes: bytes, filename: str, prefix: str) -> str`
Sube bytes al bucket R2 bajo `{prefix}/{uuid4()}{ext}` y devuelve la storage key. Valida extensión contra `ALLOWED_EXTENSIONS[prefix]` (`foto_perfil`: jpg/jpeg/png, `apunte`: pdf/docx/pptx, `tramite`: pdf, `informes_pasantia`: pdf) y tamaño contra `MAX_SIZE_BYTES[prefix]` (2/20/5/10 MB respectivamente); lanza `ValueError` si no cumple.
Depende de: `boto3` (cliente S3 vía `_get_client()` privada), env vars `R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.
Llamada por: `routers/apuntes_router.py`, `routers/pasantias_router.py`, `routers/tramites_router.py`, `routers/users_router.py`; y usada internamente por `services/tramites.py::crear_solicitud`.

### `obtener_url_firmada(key: str, expires_in: int = 300) -> str`
Genera una URL S3 presignada de descarga (`get_object`) con expiración corta (default 5 min) — mecanismo por el que el cliente nunca ve la key ni las credenciales del bucket directamente.
Depende de: `boto3` (vía `_get_client()`).
Llamada por: `routers/alumno_router.py`, `routers/apuntes_router.py`, `routers/tramites_router.py`, `routers/users_router.py`.

### `eliminar_archivo(key: str) -> None`
Borra un objeto del bucket R2 por su key.
Depende de: `boto3` (vía `_get_client()`).
Llamada por: `routers/apuntes_router.py`.

---

## tramites.py

> Fase 5A: Solicitudes y trámites. Trámites automáticos (`requiere_aprobacion=False` + generador registrado en `_GENERADORES_AUTO`) generan su PDF de forma síncrona al crear la solicitud, sin llamada externa de por medio. Solo se auto-resuelven si el alumno está `activo` según `calcular_regularidad()`; si no, la solicitud se rechaza con el motivo. Trámites manuales quedan `pendiente` hasta que un admin los resuelve vía `PUT .../resolver`.

### `generar_constancia_regular_pdf(alumno: User, regularidad: dict) -> bytes`
Genera un PDF (ReportLab) de "Constancia de Alumno Regular" con el nombre/cédula del alumno y su PPA acumulado si está disponible.
Depende de: `reportlab`.
Llamada por: sin referencias directas en `routers/` <!-- TODO: verificar --> — registrado como generador automático en `_GENERADORES_AUTO` (este módulo, invocado desde `crear_solicitud`).

### `generar_historial_oficial_pdf(alumno: User, db: Session) -> bytes`
Genera un PDF (ReportLab) de "Historial Académico Oficial": tabla con período/materia/nota/condición de todo el `ExpedienteMateria` del alumno, más el PPA acumulado al pie.
Depende de: `services/expediente.py::calcular_ppa`, `reportlab`, modelos `ExpedienteMateria`, `Materia`, `OfertaMateria`.
Llamada por: sin referencias directas en `routers/` <!-- TODO: verificar --> — registrado como generador automático en `_GENERADORES_AUTO` (este módulo, invocado desde `crear_solicitud`).

### `crear_solicitud(alumno_id: int, tipo_tramite_id: int, db: Session) -> Solicitud`
Punto de entrada único del módulo. Si el `TipoTramite` no requiere aprobación y tiene un generador registrado en `_GENERADORES_AUTO` (por nombre exacto del tipo: "Constancia de alumno regular", "Historial académico oficial"): valida que el alumno esté `activo` (`calcular_regularidad`, rechaza con `ValueError` si no), genera el PDF de forma síncrona, lo sube a storage (`prefix="tramite"`) y marca la solicitud `resuelta` en el mismo request. Si no, crea la `Solicitud` en `pendiente` para resolución manual de un admin.
Depende de: `services/expediente.py::calcular_ppa` y `calcular_regularidad`, `services/storage.py::subir_archivo`, `_GENERADORES_AUTO` (este módulo), modelos `Solicitud`, `TipoTramite`, `User`.
Llamada por: `routers/equivalencias_router.py` <!-- TODO: verificar — el grep coincide también con `crear_solicitud` de equivalencia.py, mismo nombre de función en dos módulos distintos -->, `routers/tramites_router.py`.
