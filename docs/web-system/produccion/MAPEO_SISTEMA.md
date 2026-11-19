# Mapeo del Sistema — UCA V2

> Documento consolidado y verificado contra el código real (no copiado de otros docs sin chequear). Fuentes cruzadas: `docs/web-system/API_REFERENCE.md` (206 endpoints, actualizado 2026-09-03 tras los fixes de IDOR/mass-assignment de los commits `9a6e0bd`/`ca43b80`), `docs/web-system/SERVICIOS.md`, y lectura directa de `backend/app/routers/*.py`, `backend/app/main.py`, `frontend/src/services/*.ts`, `frontend/src/pages/*.tsx`, `mobile/services/*.ts`, `mobile/app/**`. Varios hallazgos de bugs reales se verificaron con `grep`/lectura de código, no se asumieron de la documentación previa (ver notas puntuales).
>
> Fecha de este mapeo: 2026-09-17.

---

## 1. Overview del sistema

Tres aplicaciones comparten un único backend:

- **`backend/`** — FastAPI + SQLAlchemy + PostgreSQL + JWT. 30 archivos de router en `backend/app/routers/`, todos registrados en `backend/app/main.py` (ninguno quedó fuera — ver §2.1). 17 módulos de servicio en `backend/app/services/` con la lógica de negocio (cálculo de notas, PPA, becas, pagos, storage, etc.), que los routers invocan tras validar permisos.
- **`frontend/`** — React 19 + TypeScript + Vite. Cliente HTTP único en `frontend/src/lib/api.ts` (`BASE = '/api'`), con access token en memoria (nunca localStorage), refresh token en cookie httpOnly, CSRF token en header `X-CSRF-Token` para todo lo que no sea GET/HEAD, y reintento automático de un request tras un 401 vía `POST /api/auth/refresh`. Las páginas (`frontend/src/pages/*.tsx`) llaman al backend a través de una capa de servicios (`frontend/src/services/*.ts`, 15 archivos) o, en varios casos, directo con `api.get/post/put/patch/delete` sin pasar por esa capa.
- **`mobile/`** — React Native/Expo. Cliente Axios propio en `mobile/services/api.ts` con el mismo esquema de auth (Bearer + refresh-cookie + CSRF), interceptor de refresh con cola de requests concurrentes. Usa su propia capa de servicios (`mobile/services/*.ts`, 9 archivos) que llama a un subconjunto de los mismos endpoints que usa el frontend web (principalmente los de `/alumno/*`, `/auth/*`, `/eventos/*`, `/examenes/*`, `/finanzas/*`, `/notas/*`, `/boleta/*`) — el mobile es alumno-only, no tiene pantallas de admin/profesor.

Ambos clientes (web y mobile) consumen el mismo contrato REST; no hay una capa GraphQL/BFF intermedia. `GET /version` en `main.py` existe específicamente para que el mobile chequee actualizaciones obligatorias (`MOBILE_MIN_VERSION`).

---

## 2. Backend — routers → servicios → modelos → rol

### 2.1 Routers montados vs. archivos presentes

`backend/app/routers/__init__.py` importa los 30 archivos de router (29 + `test.py`) con alias, y `backend/app/main.py` hace `app.include_router(...)` para los 29 no-test, más `test_router.router` condicionado a `ENV=development` (línea 153-154 de `main.py`). **No hay ningún router "muerto"** — los 30 archivos presentes están todos alcanzables desde `main.py`. Esto contradice la expectativa inicial de la tarea de que pudiera haber un router huérfano; se verificó explícitamente comparando `ls backend/app/routers/*.py` contra los `include_router()` de `main.py` y no hay diferencia.

### 2.2 Tabla completa de endpoints (206 endpoints, 30 routers)

Método | Path | Función | Servicio/Modelo principal | Rol requerido
---|---|---|---|---
**`/admin` — admin_router.py**
GET | /admin/dashboard | admin_dashboard | `puntajes_utils.promedios_por_alumno`; User, Materia, OfertaMateria, Asistencia, Inscripcion, Solicitud | admin
**`/alumno` — alumno_router.py** (self-service, siempre `current_user.user_id`)
GET | /alumno/mi-perfil | mi_perfil | `storage.obtener_url_firmada`; User | autenticado (self)
PATCH | /alumno/mi-perfil | actualizar_mi_perfil | User | autenticado (self)
GET | /alumno/mis-materias | mis_materias | Inscripcion, OfertaMateria, Materia | autenticado (self)
GET | /alumno/mis-materias-hoy | mis_materias_hoy | Inscripcion, OfertaMateria, Horario | autenticado (self)
GET | /alumno/mis-periodos | mis_periodos | Materia, OfertaMateria, Inscripcion | autenticado (self)
GET | /alumno/mis-notas | mis_notas | `reporte_notas.construir_reporte_notas` | autenticado (self)
GET | /alumno/mi-asistencia | mi_asistencia | `asistencia_utils.puntaje_sesion`; Asistencia, Materia | autenticado (self)
GET | /alumno/dashboard | dashboard | `storage.obtener_url_firmada`; User, EventoCalendario, Cuota, Carrera | autenticado (self)
GET | /alumno/mi-resumen | mi_resumen | User (compone mis_notas/mi_asistencia) | autenticado (self)
GET | /alumno/reporte-notas *(reporte_notas_router.py, prefix `/alumno`)* | reporte_notas | `reporte_notas.construir_reporte_notas` | autenticado (self)
**`/apuntes` — apuntes_router.py**
POST | /apuntes/ | create_apunte | Apunte | autenticado; `aprobado` forzado `False` salvo admin (fix mass-assignment, ver §5)
GET | /apuntes/ | list_apuntes | Apunte | autenticado
POST | /apuntes/validar | validate_apunte | Materia (filtro de contenido) | autenticado
GET | /apuntes/{id} | get_apunte | Apunte | autenticado
PUT | /apuntes/{id} | update_apunte | Apunte | admin u owner
PATCH | /apuntes/{id}/aprobar | aprobar_apunte | Apunte | admin exclusivo
PATCH | /apuntes/{id}/like | like_apunte | Apunte | autenticado (sin ownership, sin límite de likes duplicados)
PATCH | /apuntes/{id}/descargar | descargar_apunte | Apunte | autenticado
POST | /apuntes/{id}/archivo | upload_archivo_apunte | `storage.subir_archivo/eliminar_archivo`; Apunte | admin u owner
GET | /apuntes/{id}/url-descarga | get_url_descarga | `storage.obtener_url_firmada`; Apunte | autenticado (sin chequeo de ownership/visibilidad)
DELETE | /apuntes/{id} | delete_apunte | Apunte | admin u owner
**`/asistencias` — asistencias_router.py**
POST | /asistencias/ | create_asistencia | `autorizacion.es_profesor_de_materia`; Asistencia, OfertaMateria, User | admin o profesor titular
GET | /asistencias/ | list_asistencias | `autorizacion.es_profesor_de_alumno`; Asistencia | autenticado, alcance por rol
PUT | /asistencias/{id} | update_asistencia | `autorizacion.es_profesor_de_materia` | admin o profesor titular (`user_id` no reasignable)
DELETE | /asistencias/{id} | delete_asistencia | `autorizacion.es_profesor_de_materia` | admin o profesor titular
POST | /asistencias/lote | cargar_asistencia_lote | `autorizacion.es_profesor_de_materia` | admin o profesor titular
GET | /asistencias/materia/{id}/alumnos | alumnos_asistencia | `asistencia_utils.puntaje_asistencia_sql` | admin o profesor — **sin chequeo de titularidad de esa materia específica**
GET | /asistencias/alumno/{user_id}/porcentaje | porcentaje_asistencia_alumno | función pura | admin o self
GET | /asistencias/{materia_id}/resumen | resumen_asistencia | Asistencia | autenticado — **sin chequeo de rol** (ver §5)
POST | /asistencias/qr/verificar | verificar_qr_asistencia | JWT del QR; Inscripcion, Asistencia | solo alumno
GET | /asistencias/profesor/carreras | profesor_carreras | Carrera | admin o profesor
GET | /asistencias/profesor/materias | profesor_materias | Materia | admin o profesor
GET | /asistencias/profesor/alumnos | profesor_alumnos | Materia, Inscripcion, Asistencia | admin o profesor — sin chequeo de titularidad
GET | /asistencias/qr/{materia_id} | generar_qr | `autorizacion.es_profesor_de_materia` | admin o profesor titular
PUT | /asistencias/profesor/toggle/{id} | profesor_toggle_asistencia | `autorizacion.es_profesor_de_materia` | admin o profesor titular
POST | /asistencias/profesor/marcar | profesor_marcar_asistencia | `autorizacion.es_profesor_de_materia` | admin o profesor titular
**`/auth` — auth_router.py**
POST | /auth/login | login | User, RefreshToken | público
POST | /auth/refresh | refresh | RefreshToken, User | público (cookie/body + CSRF)
POST | /auth/logout | logout | RefreshToken, TokenBlacklist | público
POST | /auth/recuperar-contrasena | recuperar_contrasena | User, PasswordResetToken | público, rate-limited
POST | /auth/reset-password | reset_password | PasswordResetToken, User, RefreshToken | público
POST | /auth/cambiar-contrasena | cambiar_contrasena | User | autenticado (self)
POST | /auth/registro | solicitar_registro | User | público, rate-limited
**`/becas` — becas_router.py**
GET | /becas/fuentes | listar_fuentes | FuenteBeca | autenticado
GET | /becas/catalogo | catalogo_becas | BecaCatalogo | autenticado
POST | /becas/catalogo | crear_beca_catalogo | BecaCatalogo, FuenteBeca | admin
POST | /becas/postulaciones | postular_beca | BecaCatalogo, PostulacionBeca | alumno o admin (self)
GET | /becas/postulaciones | listar_postulaciones | PostulacionBeca, BecaCatalogo | admin
GET | /becas/mis-postulaciones | mis_postulaciones | PostulacionBeca | alumno (self) — **sin caller en frontend ni mobile** (ver §5)
PUT | /becas/postulaciones/{id}/revisar | revisar_postulacion | PostulacionBeca, BecaCatalogo, BecaActiva | admin
GET | /becas/alumno/{id}/activas | becas_activas_alumno | `financiero.get_becas_activas_out` | admin o self
GET | /becas/reportes/rendicion | rendicion_becas | `financiero.export_rendicion_excel` | admin
**`/boleta` — boleta_router.py**
GET | /boleta/verificar/{codigo} | verificar_boleta | User | público (verificación externa de documento impreso/QR)
GET | /boleta/{user_id}/sello | sello_boleta | User | admin, profesor-del-alumno, o self
GET | /boleta/resumen | boleta_resumen | `boleta_data.construir_boleta_data`, `autorizacion.es_profesor_de_alumno` | self por defecto; admin/profesor pueden pasar `alumno_id`
GET | /boleta/pdf | boleta_pdf | `reporte_notas.construir_reporte_notas`, `boleta_pdf.render_boleta_pdf` | igual que /boleta/resumen
**`/carreras` — carreras_router.py**
POST | /carreras/ | create_carrera | Carrera | admin
GET | /carreras/ | list_carreras | Carrera | autenticado
**`/equivalencias` — equivalencias_router.py**
GET | /equivalencias/solicitudes | listar_todas_solicitudes | SolicitudEquivalencia | admin
GET | /equivalencias/materias | listar_materias | Materia | autenticado
POST | /equivalencias/solicitudes | crear_solicitud_endpoint | `equivalencia.crear_solicitud` | alumno (self)
PUT | /equivalencias/{id}/materias/{mid}/resolver | resolver_materia_endpoint | `equivalencia.resolver_materia` | admin
PUT | /equivalencias/{id}/resolver | resolver_solicitud_endpoint | EquivalenciaMateria; `equivalencia.resolver_materia` | admin
POST | /equivalencias/examenes-suficiencia | crear_examen_endpoint | `equivalencia.crear_examen_suficiencia` | admin
GET | /equivalencias/alumno/{id} | listar_equivalencias | `equivalencia.obtener_equivalencias_alumno` | admin o self
**`/eventos` — eventos_router.py**
POST | /eventos/ | create_evento | EventoCalendario | admin o profesor
GET | /eventos/ | list_eventos | EventoCalendario, Inscripcion | autenticado (alumno filtrado a sus materias)
GET | /eventos/{id} | get_evento | EventoCalendario | autenticado — **sin filtro de ownership** (ver §5)
PUT | /eventos/{id} | update_evento | EventoCalendario | admin o profesor — **cualquier profesor, no solo el dueño del evento** (ver §5)
DELETE | /eventos/{id} | delete_evento | EventoCalendario | admin o profesor — mismo gap
POST | /eventos/cargar-pdf | cargar_pdf | EventoCalendario (parseo PDF con Gemini) | admin o profesor
GET | /eventos/mes/{anio}/{mes} | eventos_mes | EventoCalendario, Inscripcion | autenticado (alumno filtrado)
GET | /eventos/dia/{fecha} | eventos_dia | EventoCalendario, Inscripcion | autenticado (alumno filtrado)
**`/examenes` — examenes_router.py**
GET | /examenes/ | listar_examenes | Examen | admin
POST | /examenes/ | crear_examen | Materia, Examen | admin
GET | /examenes/disponibles | examenes_disponibles | Examen, InscripcionExamen, Materia, User | autenticado
GET | /examenes/inscriptos | mis_examenes_inscriptos | InscripcionExamen, Examen, Materia | autenticado (self)
POST | /examenes/inscripciones | inscribirse_examen | Examen, InscripcionExamen | alumno o admin (self)
DELETE | /examenes/inscripciones/{id} | cancelar_inscripcion | InscripcionExamen | admin u owner
**`/expediente` — expediente_router.py**
POST | /expediente/cerrar-materia | cerrar_materia | `puntajes_utils`; User, OfertaMateria, PensumMateria, Puntaje, ExpedienteMateria, Materia | admin
GET | /expediente/alumno/{id}/ppa | ppa_alumno | `expediente.calcular_ppa` | admin o self
GET | /expediente/alumno/{id} | expediente_alumno | ExpedienteMateria, OfertaMateria, Materia, ExpedienteSemestre | admin o self
GET | /expediente/alumno/{id}/regularidad | regularidad_alumno | `expediente.calcular_regularidad`; RegularidadAlumno | admin o self
**`/finanzas` — finanzas_router.py**
POST | /finanzas/conceptos | crear_concepto | ConceptoArancel | admin
GET | /finanzas/conceptos | listar_conceptos | ConceptoArancel | admin
PATCH | /finanzas/conceptos/{id} | actualizar_concepto | ConceptoArancel | admin
POST | /finanzas/cuotas/generar | generar_cuotas | `financiero.generar_cuotas_alumno` | admin
GET | /finanzas/alumno/{id}/cuotas | cuotas_alumno | `financiero.cuota_to_out`; Cuota | admin o self
POST | /finanzas/pagos | crear_pago | `financiero.registrar_pago`, `facturacion_electronica.procesar_facturacion`; Comprobante | admin
GET | /finanzas/pagos/{id}/comprobante | get_comprobante | Pago, Cuota, Comprobante | admin o alumno-owner de la cuota
POST | /finanzas/pagos/{id}/comprobante/reintentar | reintentar_comprobante | `facturacion_electronica.procesar_facturacion` | admin
GET | /finanzas/comprobantes/pendientes | listar_comprobantes_pendientes | Comprobante | admin
GET | /finanzas/alumno/{id}/estado-deuda-inscripcion | estado_deuda_inscripcion | `financiero.verificar_deuda_inscripcion` | admin ("uso interno")
POST | /finanzas/pagos/init | pago_online_init | `pagos_online.crear_checkout_session`; Cuota, PagoOnline | alumno (self)
POST | /finanzas/pagos/webhook | pago_online_webhook | `pagos_online.confirmar_pago_webhook` | público (firmado por Stripe)
POST | /finanzas/pagos/confirm | pago_online_confirm | PagoOnline, Cuota | admin ("solo pruebas")
GET | /finanzas/pagos/online/{id} | pago_online_status | PagoOnline | alumno (self)
GET | /finanzas/resumen | resumen_finanzas | Pago, Cuota, BecaActiva, Comprobante | admin
**`/graduacion` — graduacion_router.py**
GET | /graduacion/candidatos | candidatos_graduacion | `graduacion.listar_candidatos` | admin
GET | /graduacion/procesos/{id}/etapas | listar_etapas | ProcesoGraduacion, EtapaTesis | admin o self
GET | /graduacion/alumno/{id}/condicion | check_condicion_egreso | `graduacion.verificar_condicion_egreso` | admin o self
POST | /graduacion/procesos | crear_proceso | `graduacion.iniciar_proceso` | admin
PUT | /graduacion/procesos/{id}/tutor | asignar_tutor_endpoint | `graduacion.asignar_tutor` | admin
PUT | /graduacion/procesos/{id}/etapas/{eid} | actualizar_etapa_endpoint | `graduacion.actualizar_etapa` | admin
GET | /graduacion/procesos/{id}/solvencia | listar_solvencia | ProcesoGraduacion, VerificacionSolvencia | admin o self — **sin caller confirmado en frontend web** (ver §5)
GET | /graduacion/procesos/{id}/documentos-cones | documentos_cones | ProcesoGraduacion (placeholder) | admin o self
**`/horarios` — horarios_router.py**
POST | /horarios/ | create_horario | `autorizacion.es_profesor_de_materia`; Horario, Materia | admin o profesor titular
GET | /horarios/ | list_horarios | Horario, Materia | autenticado
GET | /horarios/materia/{id} | horarios_por_materia | Horario, Materia | autenticado
DELETE | /horarios/{id} | delete_horario | `autorizacion.es_profesor_de_materia` | admin o profesor titular
GET | /horarios/verificar-solapamiento | verificar_solapamiento | `pensum.verificar_solapamiento_inscripcion` | solo alumno (self)
**`/inscripciones` — inscripciones_router.py**
POST | /inscripciones/ | inscribir | `pensum.validar_correlatividades`, `pensum.verificar_solapamiento_inscripcion`, `financiero.verificar_deuda_inscripcion`, `financiero.registrar_override_mora`; Materia, OfertaMateria, Inscripcion | alumno (self) o admin (cualquiera, con override de mora)
DELETE | /inscripciones/{id} | desinscribir | Inscripcion | admin u owner
GET | /inscripciones/materia/{id} | alumnos_por_materia | `autorizacion.es_profesor_de_materia`; Inscripcion, User | admin o profesor titular
GET | /inscripciones/stats | stats_inscripciones | Inscripcion | autenticado
GET | /inscripciones/ | list_inscripciones | Inscripcion, OfertaMateria | autenticado, alcance por rol
POST | /inscripciones/promocionar | promocionar_grupo | Materia, OfertaMateria, Inscripcion | admin
GET | /inscripciones/carrera/{id} | inscripciones_por_carrera | Materia, OfertaMateria, Inscripcion, User | admin
**`/materias` — materia_router.py**
POST | /materias/ | create_materia | Materia | admin
GET | /materias/ | list_materias | Materia, OfertaMateria, User, Carrera, Inscripcion | autenticado
GET | /materias/stats | materias_stats | Materia, OfertaMateria, Carrera, User | admin
GET | /materias/{id} | get_materia | Materia | autenticado
PATCH | /materias/{id} | patch_materia | Materia, OfertaMateria | admin — **único campo mutable es `profesor_id`**, pese a existir schema `MateriaUpdate` con más campos (ver §5)
POST | /materias/ofertas | crear_oferta | Materia, User, OfertaMateria | admin
**`/notas` — notas_router.py**
GET | /notas/materia/{id}/detalle | materia_detalle | `puntajes_utils`, `asistencia_utils`; Materia, OfertaMateria, User, Puntaje, Asistencia | autenticado (self)
GET | /notas/materia/{id}/asistencia | materia_asistencia | Materia, OfertaMateria, Asistencia | autenticado (self)
**`/notificaciones` — notificaciones_router.py**
GET | /notificaciones/vapid-public-key | get_vapid_public_key | `notificaciones_push.get_vapid_keys` | público
POST | /notificaciones/subscribe | subscribe | SuscripcionPush | autenticado (self)
DELETE | /notificaciones/subscribe | unsubscribe | SuscripcionPush | autenticado (self)
POST | /notificaciones/test | test_notification | `notificaciones_push.enviar_notificaciones_masivo` | autenticado (self)
**`/pasantias` — pasantias_router.py**
GET | /pasantias/empresas | listar_empresas | EmpresaReceptora | autenticado
GET | /pasantias/profesores | listar_profesores | User | autenticado
GET | /pasantias/solicitudes | listar_solicitudes | Pasantia | admin (todas/filtrable) o alumno (self)
POST | /pasantias/empresas | crear_empresa_endpoint | `pasantia.crear_empresa` | admin
POST | /pasantias/solicitudes | crear_solicitud_endpoint | `pasantia.crear_solicitud_pasantia` | alumno (self)
PUT | /pasantias/{id}/aprobar | aprobar_pasantia_endpoint | `pasantia.aprobar_pasantia` | admin o profesor
PUT | /pasantias/{id}/horas | actualizar_horas_endpoint | `pasantia.actualizar_horas` (chequeo de tutor interno) | admin o profesor
POST | /pasantias/{id}/informes | subir_informe_endpoint | `storage.subir_archivo`, `pasantia.subir_informe` | admin, profesor o alumno (ownership fino en el servicio)
PUT | /pasantias/{id}/rechazar | rechazar_pasantia_endpoint | `pasantia.rechazar_pasantia` | admin
PUT | /pasantias/{id}/finalizar | finalizar_pasantia_endpoint | `pasantia.finalizar_pasantia` | admin o profesor
**`/pensum` — pensum_router.py**
POST | /pensum/carreras/{id}/materias | agregar_materia_a_malla | Carrera, Materia, PensumMateria | admin
DELETE | /pensum/carreras/{cid}/materias/{pmid} | quitar_materia_de_malla | PensumMateria | admin
PATCH | /pensum/materias/{id} | actualizar_pensum_materia | PensumMateria | admin
GET | /pensum/correlatividades | listar_correlatividades | Correlatividad, PensumMateria | autenticado
POST | /pensum/correlatividades | crear_correlatividad | `pensum.validar_correlatividad_estructural`; Materia, Correlatividad | admin
DELETE | /pensum/correlatividades/{id} | eliminar_correlatividad | Correlatividad | admin
GET | /pensum/carreras/{id} | obtener_malla_carrera | Carrera, PensumMateria, Materia | autenticado
GET | /pensum/alumno/{id}/avance | avance_alumno | `pensum.validar_correlatividades`; múltiples modelos | admin o self
GET | /pensum/alumno/{id}/creditos | creditos_alumno | User, Carrera, PensumMateria, OfertaMateria, Puntaje, PesoEvaluacion | admin o self
**`/profesor` — profesor_router.py**
GET | /profesor/dashboard | profesor_dashboard | `puntajes_utils`; OfertaMateria, Materia, Inscripcion, Puntaje, Asistencia, Horario, EventoCalendario, RecordatorioDocente, User | admin o profesor (self)
GET | /profesor/materias | mis_materias | OfertaMateria, Materia | admin o profesor (self)
GET | /profesor/mi-historico | mi_historico | `puntajes_utils`; OfertaMateria, Inscripcion, Puntaje | admin o profesor (self)
GET | /profesor/mi-agenda | mi_agenda | OfertaMateria, Horario, EventoCalendario, RecordatorioDocente | admin o profesor (self)
POST | /profesor/recordatorios | crear_recordatorio | RecordatorioDocente | admin o profesor (self)
PATCH | /profesor/recordatorios/{id} | actualizar_recordatorio | RecordatorioDocente | admin o profesor **y** dueño
DELETE | /profesor/recordatorios/{id} | eliminar_recordatorio | RecordatorioDocente | admin o profesor **y** dueño
GET | /profesor/lista-alumnos | lista_alumnos | User, Inscripcion, OfertaMateria | admin (todos) o profesor (sus alumnos)
**`/programas` — programas_router.py**
POST | /programas/ | create_programa | `autorizacion.es_profesor_de_materia`; Programa | admin o profesor titular
GET | /programas/ | list_programas | Programa | autenticado — **sin chequeo de rol/ownership** (ver §5)
GET | /programas/{materia_id} | get_programa_por_materia | Programa | autenticado — mismo gap
PUT | /programas/{id} | update_programa | `autorizacion.es_profesor_de_materia`; Programa | admin o profesor titular (valida materia vieja y nueva)
DELETE | /programas/{id} | delete_programa | `autorizacion.es_profesor_de_materia`; Programa | admin o profesor titular
PUT | /programas/materia/{id}/bulk | bulk_save_programa | `autorizacion.es_profesor_de_materia`; Materia, Programa | admin o profesor titular
**`/puntajes` — puntajes_router.py**
GET | /puntajes/pesos/{id} | obtener_pesos_materia | `puntajes_utils.get_pesos`; PesoEvaluacion | autenticado, sin ownership
PUT | /puntajes/pesos/{id} | actualizar_pesos_materia | `autorizacion.es_profesor_de_materia`; PesoEvaluacion | admin o profesor titular
POST | /puntajes/ | create_puntaje | `autorizacion.es_profesor_de_materia`, `puntajes_utils.get_pesos`, `expediente.asistencia_minima_institucional`; Puntaje | admin o profesor titular (gate de regularidad solo aplica a profesor)
GET | /puntajes/ | list_puntajes | `autorizacion.es_profesor_de_alumno`; Puntaje | autenticado, alcance por rol
PUT | /puntajes/{id} | update_puntaje | `autorizacion.es_profesor_de_materia`, `puntajes_utils.get_pesos` | admin o profesor titular (`user_id` no reasignable)
DELETE | /puntajes/{id} | delete_puntaje | `autorizacion.es_profesor_de_materia` | admin o profesor titular
GET | /puntajes/materia/{id} | puntajes_por_materia | `autorizacion.es_profesor_de_materia`, `puntajes_utils` | admin o profesor titular
GET | /puntajes/alumno/{id}/promedio-final | promedio_final_alumno | `puntajes_utils` | admin o self
GET | /puntajes/materia/{id}/exportar | exportar_materia | `puntajes_utils`; Asistencia | admin o profesor titular
GET | /puntajes/materia/{id}/estadisticas | estadisticas_materia | `puntajes_utils.calcular_promedio_final` | admin o profesor titular — **endpoint sin caller en frontend web** (ver §5)
GET | /puntajes/{user_id}/promedio | promedio_puntajes | `puntajes_utils.promedios_por_alumno` | admin o self
**`/reportes` — reportes_router.py**
GET | /reportes/resumen | resumen | User, Materia | admin
GET | /reportes/por-carrera | por_carrera | `puntajes_utils.promedios_por_alumno`, `asistencia_utils.puntaje_asistencia_sql` | admin
GET | /reportes/dashboard | dashboard | `puntajes_utils` | admin
GET | /reportes/becados | becados | User | admin
GET | /reportes/asistencia-por-materia | asistencia_por_materia | Materia, Asistencia, OfertaMateria | admin — **sin caller en frontend/mobile** (ver §5)
GET | /reportes/rue-es/matricula | exportar_matricula_rue_es | User (+carrera) | admin
GET | /reportes/rue-es/trayecto-academico | exportar_trayecto_academico_rue_es | `puntajes_utils`, `asistencia_utils`; Inscripcion, Puntaje, Asistencia | admin
**`/admin/settings` — settings_router.py**
GET | /admin/settings | list_settings | GlobalSetting | admin
GET | /admin/settings/{key} | get_setting | GlobalSetting | admin
PUT | /admin/settings/{key} | update_setting | GlobalSetting, SettingAuditLog | admin
GET | /admin/settings/audit/list | list_audit_log | SettingAuditLog, User | admin
GET | /admin/settings/export/all | export_settings | GlobalSetting | admin
POST | /admin/settings/import | import_settings | GlobalSetting, SettingAuditLog | admin
**`/test` — test.py** (solo si `ENV=development`)
GET | /test/ | test_endpoint | — | público
GET | /test/auth | test_auth | — | autenticado
**`/tramites` — tramites_router.py**
GET | /tramites/tipos | listar_tipos | TipoTramite | autenticado
POST | /tramites/solicitudes | crear_solicitud_endpoint | `tramites.crear_solicitud` | alumno (self)
GET | /tramites/solicitudes/mias | listar_mis_solicitudes | Solicitud | admin (todas/filtrable) o alumno (self)
PUT | /tramites/solicitudes/{id}/resolver | resolver_solicitud | `storage.subir_archivo`; Solicitud | admin
GET | /tramites/solicitudes/{id}/descargar | descargar_resultado | `storage.obtener_url_firmada`; Solicitud | admin u owner
GET | /tramites/stats | stats_tramites | Solicitud | admin
**`/users` — users_router.py**
GET | /users/stats | users_stats | User | admin
POST | /users/ | create_user | User | admin
GET | /users/me | get_me | `storage.obtener_url_firmada`; User | autenticado (self)
GET | /users/{id} | get_user | User | admin
GET | /users/{id}/materias | get_user_materias | OfertaMateria, Materia, Carrera | admin
GET | /users/ | list_users | User | admin — **bug real de filtro `es_becado`** (ver §5)
GET | /users/secure | secure_endpoint | — | autenticado
POST | /users/me/foto | upload_foto_perfil | `storage.subir_archivo/obtener_url_firmada`; User | autenticado (self)
PATCH | /users/{id} | update_user | User | admin o self (fix mass-assignment, ver §5)
DELETE | /users/{id} | delete_user | cascade sobre RefreshToken, Asistencia, Puntaje, Inscripcion, ForoMensaje, Apunte, User | admin

### 2.3 Módulos de servicio (`backend/app/services/`)

Módulo | Responsabilidad
---|---
`asistencia_utils.py` | Puntaje de asistencia ponderado por sesión (presente=5, justificado=3/4, sin justificar=0); única fuente del % de asistencia.
`autorizacion.py` | `es_profesor_de_materia` / `es_profesor_de_alumno` — chequeos reusados por 6+ routers para no duplicar la query de "¿este profesor dicta esto?".
`boleta_data.py` | Reshape de `reporte_notas.py` al contrato `BoletaData` del frontend.
`boleta_pdf.py` | Genera el PDF de boleta con WeasyPrint+Jinja2.
`equivalencia.py` | Solicitudes de equivalencia/suficiencia; al aprobar, inserta en `ExpedienteMateria` y `AvanceAlumnoPensum`.
`expediente.py` | PPA (promedio ponderado acumulado, entero 1-5) y clasificación de regularidad (activo/en_riesgo/irregular/de_baja).
`facturacion_electronica.py` | Integración con guarani.app; un fallo del proveedor nunca bloquea el pago ya registrado.
`financiero.py` | Motor financiero — pagos inmutables, generación de cuotas, descuento por beca, bloqueo de inscripción por mora (excepto beca 100%).
`graduacion.py` | Condición de egreso, gestión de procesos/etapas de tesis.
`notificaciones_push.py` | Web Push (VAPID) a `SuscripcionPush`.
`pagos_online.py` | Stripe Checkout Sessions + verificación de webhook.
`pasantia.py` | Ciclo de vida de pasantías (empresa, aprobación, horas, informes).
`pensum.py` | Solapamiento de horarios, validación de correlatividades (gate real de inscripción).
`puntajes_utils.py` | Motor de notas: puntos 0-100 configurables por materia → escalón oficial 1-5 (Art. 24 Reglamento).
`reporte_notas.py` | Agregación de notas por semestre para boleta/reporte, con detección de recursadas.
`storage.py` | Cloudflare R2/S3 — subida/descarga firmada/borrado de archivos.
`tramites.py` | Solicitudes de trámite; auto-generación de PDF (constancia, historial) si el alumno está `activo`.

---

## 3. Frontend — página → servicio → endpoint

### 3.1 Cliente base

`frontend/src/lib/api.ts`: `BASE = '/api'`. Access token en memoria, refresh token en cookie httpOnly (`credentials: 'include'` en todo request), CSRF token en `X-CSRF-Token` para no-GET. Interceptor de 401: llama `tryRefresh()` (dedupe de refresh concurrentes) y reintenta una vez. `warmUpBackend()` hace un `GET /api/health` sin auth al montar la pantalla de login (cold-start de Render).

### 3.2 Capa de servicios (`frontend/src/services/*.ts`, 15 archivos)

Servicio | Endpoints (método + path) | Páginas que lo usan
---|---|---
`adminService.ts` | GET /admin/dashboard | Dashboard.tsx, Layout.tsx
`agendaService.ts` | GET /profesor/mi-agenda, POST/PATCH/DELETE /profesor/recordatorios | MisMaterias.tsx
`asignacionesService.ts` | GET /materias/stats, GET /materias/, GET /users/?role=profesor, PATCH /materias/{id}, POST /materias/ofertas, GET/PATCH/DELETE /users/{id}, GET /users/{id}/materias | GestionAsignaciones.tsx, ProfessorDetailModal.tsx
`equivalenciasService.ts` | GET/POST /equivalencias/solicitudes, GET /equivalencias/alumno/{id}, GET /equivalencias/materias | EquivalenciasAdmin.tsx, EquivalenciasAlumno.tsx
`estadisticasService.ts` | GET /puntajes/materia/{id}/estadisticas | **sin caller** — dead code (ver §5)
`expedienteService.ts` | POST /expediente/cerrar-materia, GET /expediente/alumno/{id}(/ppa\|/regularidad) | ExpedienteAdmin.tsx, ExpedienteAlumno.tsx
`finanzasService.ts` | GET/POST /becas/fuentes\|catalogo\|postulaciones, PUT /becas/postulaciones/{id}/revisar, CRUD /finanzas/conceptos, GET /finanzas/alumno/{id}/cuotas, POST /finanzas/cuotas/generar, POST /finanzas/pagos, GET/POST /finanzas/pagos/{id}/comprobante(/reintentar), GET /finanzas/comprobantes/pendientes, GET /finanzas/alumno/{id}/estado-deuda-inscripcion, GET /becas/reportes/rendicion, POST /finanzas/pagos/init, GET /finanzas/pagos/online/{id}, GET /finanzas/resumen | BecasAlumno.tsx, Finanzas.tsx, MisCuotas.tsx, Perfil.tsx
`graduacionService.ts` | GET /graduacion/candidatos, GET /graduacion/alumno/{id}/condicion, POST /graduacion/procesos, PUT tutor/etapas, GET etapas/solvencia | GraduacionAdmin.tsx, GraduacionAlumno.tsx, Dashboard.tsx, Perfil.tsx
`historicoService.ts` | GET /profesor/mi-historico | MisMaterias.tsx, Perfil.tsx
`pasantiasService.ts` | GET empresas/profesores/solicitudes, POST empresas/solicitudes, PUT aprobar/horas/finalizar, POST informes | PasantiasAdmin.tsx, PasantiasAlumno.tsx
`pensumService.ts` | GET/POST/PATCH/DELETE malla y correlatividades, GET avance/creditos de alumno | MallaAdmin.tsx, MallaAlumno.tsx, Dashboard.tsx, Puntajes.tsx
`profesorService.ts` | GET /profesor/dashboard | Dashboard.tsx, Layout.tsx
`settingsService.ts` | GET/PUT /admin/settings, GET audit/export, POST import | AjustesGlobales.tsx
`tramitesService.ts` | GET tipos/mias/stats, POST solicitudes, PUT resolver, GET descargar | SolicitudesTramites.tsx
`usersService.ts` | GET stats/carreras/usuarios, POST/PATCH/DELETE usuarios | Usuarios.tsx

**Duplicación detectada:** `usersService.ts` y `asignacionesService.ts` exportan cada uno su propia `actualizarUsuario`/`eliminarUsuario` apuntando a los mismos endpoints `/users/{id}` — no es un bug funcional, pero es lógica de request duplicada en dos archivos (ver §5).

### 3.3 Llamadas directas desde páginas (sin pasar por `services/`)

Página | Método | Endpoint | Para qué
---|---|---|---
Asistencia.tsx | PUT/POST/DELETE | /asistencias/profesor/toggle/{id}, /asistencias/profesor/marcar, /asistencias/{id} | Marcar/editar/borrar asistencia (vista profesor)
Biblioteca.tsx | PATCH/POST | /apuntes/{id}/like, /apuntes/{id}/descargar, /apuntes/{id}/archivo | Interacción con apuntes
Boleta/hooks/usePdfExport.ts | GET (blob) | /boleta/pdf | Descargar boleta PDF
Calendario.tsx | POST | /eventos/ | Crear evento
EquivalenciasAdmin.tsx | PUT/POST | /equivalencias/{id}/resolver, /equivalencias/examenes-suficiencia | Resolver equivalencia / crear examen
Inscripciones.tsx | POST/DELETE | /inscripciones/ | Inscribir/desinscribir
PasantiasAdmin.tsx | PUT | /pasantias/{id}/rechazar | Rechazar pasantía
Perfil.tsx | PATCH/POST/DELETE | /users/{id}, /alumno/mi-perfil, /auth/cambiar-contrasena, /notificaciones/subscribe | Perfil propio, cambio de contraseña, push
Programa.tsx | PUT | /programas/materia/{id}/bulk | Guardar programa de materia
Puntajes.tsx | PUT | /puntajes/{id}, /puntajes/pesos/{id} | Cargar nota / configurar pesos
**Reportes.tsx** | GET | /reportes/resumen, /reportes/por-carrera, /reportes/becados, /reportes/dashboard, /reportes/rue-es/{matricula\|trayecto-academico} | Dashboard de reportes admin + exportación CSV RUE-ES
ResetPassword.tsx | POST | /auth/reset-password | Reset de contraseña
Layout.tsx | POST | /auth/logout | Logout

(Nota: la primera pasada de este mapeo, hecha por un sub-agente separado, no detectó las 4 llamadas de `Reportes.tsx` a `/reportes/resumen`, `/reportes/por-carrera`, `/reportes/becados`, `/reportes/dashboard` — se verificaron y agregaron manualmente por lectura directa de `frontend/src/pages/Reportes.tsx:407-410`. Esto en sí es una lección: incluso una pasada dedicada por grep puede perder líneas si el patrón de búsqueda no cubre todas las variantes de indentación/contexto.)

---

## 4. Mobile — pantalla → servicio → endpoint

Cliente base: `mobile/services/api.ts` — Axios, `EXPO_PUBLIC_API_BASE` → `app.json extra.apiBase` → fallback `http://localhost:8000`. Bearer token + refresh-cookie + `X-CSRF-Token` en refresh. `mobile/config.ts` duplica esta resolución de base URL con nombres de env var ligeramente distintos, pero solo se usa para mostrar info de versión, no para requests (ver §5).

Servicio | Endpoints | Uso
---|---|---
`services/authService.ts` | POST /auth/login, /auth/refresh, /auth/logout, /auth/cambiar-contrasena, /auth/recuperar-contrasena, /auth/reset-password, /auth/registro | Flujo de auth completo (comparte contrato con web)
`services/dashboardService.ts` | GET /alumno/mi-perfil, /alumno/mi-resumen, /alumno/summary, /eventos/, /finanzas/alumno/{id}/cuotas, /alumno/dashboard; POST /users/me/foto | Pantalla principal — `fetchDashboard` (endpoint agregado) reemplaza la composición legacy de 5 llamadas (`fetchDashboardLegacy`, mantenida como fallback)
`services/asistenciaService.ts` | POST /asistencias/qr/verificar, GET /alumno/mis-materias-hoy, /alumno/mi-asistencia | Escaneo de QR de asistencia (alumno) — mismo endpoint que usa `AsistenciaScan.tsx` en el web
`services/boletaService.ts` | GET (blob) /boleta/pdf | Descarga de boleta
`services/calendarioService.ts` | GET /eventos/mes/{a}/{m}, /eventos/dia/{f}, /eventos/ | Calendario
`services/cuentaService.ts` | GET /finanzas/alumno/{id}/cuotas, POST /finanzas/pagos/online/iniciar | Cuenta/finanzas — **nota:** llama a `/finanzas/pagos/online/iniciar`, mientras que el frontend web llama a `/finanzas/pagos/init` con el mismo propósito (ver §5, posible inconsistencia de contrato)
`services/examenesService.ts` | GET /examenes/disponibles, /examenes/inscriptos; POST /examenes/inscripciones; DELETE /examenes/inscripciones/{id} | Exámenes
`services/notasService.ts` | GET /alumno/mis-materias, /alumno/mis-notas, /alumno/mi-asistencia, /notas/materia/{id}/detalle, /notas/materia/{id}/asistencia | Notas
`services/updateService.ts` | GET /version | Chequeo de actualización obligatoria (`MOBILE_MIN_VERSION`)
`hooks/useNotifications.ts` | GET /notificaciones, POST /notificaciones/subscribe | Notificaciones in-app y push
`app/(tabs)/horario.tsx` | GET /eventos/ (directo, sin pasar por servicio) | Tab de horario — único screen que bypassea la capa de servicios (ver §5)

El mobile es 100% alumno — no hay ninguna pantalla admin/profesor, consistente con que ningún servicio mobile llame a endpoints `require_role("admin")` exclusivos como `/users/`, `/admin/*`, `/reportes/*`, `/finanzas/conceptos`, etc.

**Hallazgo de contrato a verificar:** `cuentaService.ts::iniciarPagoOnline()` llama `POST /finanzas/pagos/online/iniciar`, pero el endpoint real registrado en `finanzas_router.py` (confirmado en §2.2 y en `API_REFERENCE.md`) es `POST /finanzas/pagos/init`. Si el path del mobile es efectivamente `/finanzas/pagos/online/iniciar` y no hay alias/redirect en el backend, **esta llamada del mobile devuelve 404** — requiere confirmación directa contra el código fuente del mobile antes de tratarlo como bug confirmado (no se pudo verificar la línea exacta en esta pasada por límite de tiempo; queda marcado para verificación en el Hallazgos).

---

## 5. Flujos completos trazados

### 5.1 Alumno se inscribe a una materia

1. **Frontend:** `frontend/src/pages/Inscripciones.tsx:165` — `api.post('/inscripciones/', { alumno_id, materia_id, override_mora })` (llamada directa, sin pasar por `services/`).
2. **Backend routing:** `POST /inscripciones/` → `inscribir()` en `backend/app/routers/inscripciones_router.py`.
3. **Autorización:** solo `alumno` o `admin` (chequeo manual `current_user.role not in ("alumno","admin")`); si es alumno, se fuerza `alumno_id = current_user.user_id` — un alumno no puede inscribir a otro pase lo que pase en el body.
4. **Validaciones de servicio, en orden:**
   - `services/pensum.py::validar_correlatividades` — recorre TODOS los prerrequisitos de la materia (no corta en el primero), exige nota aprobatoria o inscripción activa según el tipo de correlatividad.
   - Se busca la oferta activa de la materia (`_oferta_activa_o_404`) — 404 si no hay.
   - `services/financiero.py::verificar_deuda_inscripcion` — cuenta cuotas vencidas contra `Carrera.max_cuotas_mora`; si el alumno tiene beca 100% (`tiene_beca_100`), nunca bloquea. Si hay mora y quien llama es admin con `override_mora=true`, se permite y se registra en `services/financiero.py::registrar_override_mora` → tabla `AuditoriaOverrideMora`.
   - Chequeo de duplicado (`Inscripcion` ya existente para ese alumno+materia).
   - `services/pensum.py::verificar_solapamiento_inscripcion` — compara horarios de la materia nueva contra los horarios de todo lo que el alumno ya cursa.
5. **Persistencia:** se crea la fila `Inscripcion` (modelo `models/inscripcion.py`).
6. **Consumo posterior:** esa inscripción es lo que hace aparecer la materia en `GET /alumno/mis-materias`, `GET /alumno/mis-materias-hoy`, en el cálculo de `pensum.py::promedio_y_estado_intento`, y es lo que permite después cargar asistencia/notas para ese alumno en esa oferta.

### 5.2 Profesor carga asistencia por QR

1. **Generación (profesor), frontend web:** `frontend/src/pages/Asistencia.tsx:151` — `api.get('/asistencias/qr/{materia_id}')` (llamada directa).
2. **Backend:** `GET /asistencias/qr/{materia_id}` → `generar_qr()` en `asistencias_router.py`. Autorización: admin, o profesor validado con `services/autorizacion.py::es_profesor_de_materia`. Genera un JWT (`kind="asistencia_qr"`, TTL 15 min, firmado con `SECRET_KEY`) codificado en un QR PNG base64.
3. **Escaneo (alumno):**
   - Web: `frontend/src/pages/AsistenciaScan.tsx:91` — `api.post('/asistencias/qr/verificar', { qr_token })`.
   - Mobile: `mobile/services/asistenciaService.ts::verifyQrToken()` — mismo endpoint, mismo contrato.
4. **Backend:** `POST /asistencias/qr/verificar` → `verificar_qr_asistencia()`. Exige rol `alumno`. Decodifica y valida el JWT (firma, `kind`, expiración), confirma que la oferta del QR sigue siendo la oferta **activa** actual de la materia (si el profesor generó otro QR después, el anterior queda inválido aunque no haya expirado por tiempo), confirma que el alumno está inscripto en esa oferta, y que no tiene ya una asistencia registrada hoy (409 si la tiene).
5. **Persistencia:** crea `Asistencia` con `presente=True`, tomando un snapshot de `es_becado` del alumno en ese momento.
6. **Efecto secundario:** si el alumno queda marcado ausente en cualquier otro flujo de carga de asistencia (`POST /asistencias/`, `PUT .../toggle`, `POST .../marcar`, `POST .../lote`), se dispara en background un chequeo de alerta de inasistencia crítica (25%) que puede enviar email a alumno/profesor/admins — esto NO aplica al flujo QR porque el QR solo registra presentes.
7. **Consumo posterior:** el registro alimenta `services/asistencia_utils.py::puntaje_asistencia_sql` (usado en asistencias, notas, reportes, y en `services/expediente.py::calcular_regularidad` para decidir si el alumno está `en_riesgo`).

### 5.3 Admin gestiona un trámite

1. **Solicitud (alumno):** `frontend/src/services/tramitesService.ts::crearSolicitud(tipo_tramite_id)` → `POST /tramites/solicitudes`, usado desde `SolicitudesTramites.tsx`.
2. **Backend:** `crear_solicitud_endpoint()` en `tramites_router.py` (rol: alumno, self) delega en `services/tramites.py::crear_solicitud`.
3. **Lógica de servicio:** si el `TipoTramite` NO requiere aprobación y su nombre exacto está en `_GENERADORES_AUTO` (actualmente "Constancia de alumno regular" e "Historial académico oficial"):
   - Valida que el alumno esté `activo` vía `services/expediente.py::calcular_regularidad` — si no, rechaza con motivo (no llega a generarse el trámite).
   - Genera el PDF de forma **síncrona** en el mismo request (`generar_constancia_regular_pdf` o `generar_historial_oficial_pdf`, ambos con ReportLab, usando `services/expediente.py::calcular_ppa`).
   - Sube el PDF a storage (`services/storage.py::subir_archivo`, prefix `"tramite"`).
   - Marca la `Solicitud` como `resuelta` en el mismo request — sin intervención de un admin.
   - Si el tipo no está en `_GENERADORES_AUTO` (ej. certificados que requieren firma humana), la `Solicitud` queda `pendiente`.
4. **Admin resuelve manualmente (solo para los `pendiente`):** `frontend/src/services/tramitesService.ts::resolverSolicitud()` → `PUT /tramites/solicitudes/{id}/resolver` (multipart, puede adjuntar archivo) → `resolver_solicitud()` en el router, rol admin exclusivo, sube el archivo si se adjunta vía `services/storage.py::subir_archivo`.
5. **Descarga:** `GET /tramites/solicitudes/{id}/descargar` — admin o el alumno dueño — devuelve `services/storage.py::obtener_url_firmada` (URL S3 presignada, 5 min de expiración) del archivo resultante, nunca la key cruda.
6. **Consumo:** `GET /tramites/solicitudes/mias` (self o admin filtrable) y `GET /tramites/stats` (admin) leen sobre la misma tabla `Solicitud`.

---

## 6. Hallazgos

Cada ítem fue verificado contra el código real (no copiado sin chequear de docs previos), con archivo:línea cuando fue posible confirmarlo por grep/lectura directa. Estado actualizado tras la pasada de fixes del 2026-09-17 — ver commits correspondientes.

1. **✅ FIJO — Bug real de filtro — `backend/app/routers/users_router.py:177-178`**: en `GET /users/`, el filtro `if es_becado is not None: query = query.filter(User.es_becado.is_(True))` ignoraba el valor real del query param — `?es_becado=false` filtraba igual por `True`. Corregido a `.is_(es_becado)`.

2. **✅ FIJO — `backend/app/routers/asistencias_router.py:535-536` (`GET /asistencias/{materia_id}/resumen`)**: no tenía ningún chequeo de rol más allá de estar autenticado. Se agregó `_verificar_profesor_materia(db, materia_id, current_user)` (mismo helper ya usado en el resto del router) — ahora solo admin o el profesor titular de la materia pueden pedirlo. Verificado: sin caller en frontend web ni mobile, cero riesgo de regresión.

3. **NO ES BUG (verificado, no tocado) — `backend/app/routers/programas_router.py:44-57`**: `GET /programas/` y `GET /programas/{materia_id}` no tienen chequeo de rol, a diferencia de POST/PUT/DELETE. Se verificó el caller real: `frontend/src/pages/Programa.tsx` (usado por Alumno Y Profesor) llama estos GET directamente para mostrar el temario — es lectura pública de contenido de curso (no dato sensible), intencional. Restringirlo rompería la vista de temario del alumno. Dejado como está.

4. **✅ FIJO — `backend/app/routers/eventos_router.py:186-215`**: `PUT/DELETE /eventos/{id}` solo exigía `role in ("admin","profesor")` — cualquier profesor podía editar/borrar el evento de cualquier otro profesor. Se agregó chequeo de ownership: `if current_user.role == "profesor" and evento.creado_por != current_user.user_id: raise 403`. Admin sigue sin restricción.

5. **PENDIENTE (gap de producto, no bug) — `backend/app/routers/materia_router.py`**: `PATCH /materias/{id}` solo permite mutar `profesor_id` (schema inline `MateriaPatchBody`), pese a que existe un schema `MateriaUpdate` con más campos en `schemas/` que no se usa en este endpoint — funcionalidad de edición de materia (nombre, créditos, cupos, etc.) que parece prevista en el schema pero no expuesta por ningún endpoint actual. No es un bug para arreglar sin una decisión de producto (qué campos deberían ser editables y por quién) — no tocado.

6. **✅ Ya estaba fijo (confirmado, no nuevo)** — `backend/app/routers/apuntes_router.py:101-103`: fix de mass-assignment ya presente — `data["aprobado"] = current_user.role == "admin" and data.get("aprobado") is True` fuerza `aprobado=False` para cualquier no-admin sin importar el payload.

7. **NO TOCADO (requiere decisión del equipo, no se borra código a ciegas)** — Endpoints backend sin caller detectado en frontend web ni mobile (posiblemente intencional para uso futuro, o realmente muertos):
   - `GET /becas/mis-postulaciones` (alumno) — `BecasAlumno.tsx` no lo llama; solo usa `getBecasActivas`.
   - `GET /reportes/asistencia-por-materia` (admin) — sin caller en `Reportes.tsx` ni en ningún otro archivo grepeado.
   - `GET /puntajes/materia/{id}/estadisticas` — expuesto en `frontend/src/services/estadisticasService.ts::obtenerEstadisticasMateria`, pero ese servicio no tiene ningún import en `pages/` ni `components/` — código muerto en ambos extremos (front y su consumidor).
   - `GET /graduacion/procesos/{id}/solvencia` (`graduacionService.ts::getSolvencia`) — sin import directo detectado en páginas.
   - `pasantiasService.ts::crearEmpresa`, `actualizarHoras`, `subirInforme` — exportados pero sin import directo detectado en `PasantiasAdmin.tsx`/`PasantiasAlumno.tsx` (podrían usarse dinámicamente o estar realmente sin UI).
   - `settingsService.ts::getSetting` (singular) — sin caller; `AjustesGlobales.tsx` usa `getSettings` (plural/lista).
   - `finanzasService.ts::getComprobante`, `getPagoOnlineStatus` — sin import directo detectado.

8. **✅ FIJO — Duplicación de lógica frontend**: `usersService.ts` y `asignacionesService.ts` cada uno definía su propia `actualizarUsuario`/`eliminarUsuario` apuntando a los mismos endpoints `PATCH`/`DELETE /users/{id}`. Se eliminó la copia de `asignacionesService.ts`, se amplió el tipo de `usersService.ts::actualizarUsuario` para cubrir los campos que usaba la copia (`fecha_ingreso`, `cv`, `activo`), y `ProfessorDetailModal.tsx` ahora importa la versión única de `usersService.ts`.

9. **✅ FIJO Y CONFIRMADO — Bug real de contrato mobile vs. backend**: `mobile/services/cuentaService.ts:196` llamaba `POST /finanzas/pagos/online/iniciar` con `{cuota_ids: number[]}` esperando `{gateway_url}`, mientras el backend real es `POST /finanzas/pagos/init` con `{cuota_id: number}` (uno solo) y responde `{redirect_url}` — path, forma del payload y forma de la respuesta, los 3 distintos. Además el backend no soporta checkout combinado de varias cuotas (un Stripe Checkout = una cuota). Corregido: `iniciarPagoOnline` ahora toma un solo `cuotaId`, pega a `/finanzas/pagos/init`, lee `redirect_url`; el caller (`mobile/app/cuenta.tsx::handlePagarAhora`) ahora paga la cuota pendiente/vencida más antigua primero (no puede pagar todas a la vez porque el backend no lo soporta) y el toast lo aclara cuando hay más de una pendiente.

10. **NO TOCADO (bajo riesgo, cosmético)** — `mobile/config.ts` vs. `mobile/services/api.ts`: ambos resuelven la base URL del backend de forma independiente con nombres de env var ligeramente distintos (`EXPO_PUBLIC_API_URL` vs `EXPO_PUBLIC_API_BASE`). Solo `config.ts` se usa para mostrar info de versión/dispositivo, no para requests reales — bajo riesgo, no se tocó en esta pasada.

11. **NO TOCADO (duplicación menor, sin riesgo)** — `mobile/app/(tabs)/horario.tsx`: único screen mobile que hace `api.get()` directo a `/eventos/` en vez de pasar por `services/calendarioService.ts::fetchProximosEventos` (que pega al mismo endpoint) — duplicación de la misma llamada por dos caminos distintos, sin impacto funcional. No tocado.

12. **✅ FIJO — Gaps de ownership por profesor** (mismo patrón repetido en varios endpoints): `GET /asistencias/materia/{id}/alumnos` y `GET /asistencias/profesor/alumnos` permitían a **cualquier** profesor (no solo el titular de esa materia) consultar datos de asistencia de una materia. Ambos ahora usan `_verificar_profesor_materia()` (mismo helper que ya validaba el resto del router). `GET /puntajes/pesos/{id}` tampoco validaba ownership — se agregó el mismo chequeo con `es_profesor_de_materia()`; confirmado que solo lo consume el flujo de carga de notas del profesor (`Puntajes.tsx`), sin uso de alumno ni mobile.

13. **Ningún router huérfano**: se verificó explícitamente que los 30 archivos en `backend/app/routers/` están todos registrados en `backend/app/main.py` (directamente o vía `__init__.py`) — no hay código de router muerto a nivel de archivo, solo a nivel de endpoints individuales sin caller (ítem 7).
