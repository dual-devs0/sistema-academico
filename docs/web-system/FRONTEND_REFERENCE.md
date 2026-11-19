# Referencia de Pantallas — Frontend Web y Mobile

> Generado leyendo cada página real en `frontend/src/pages/*.tsx` y cada pantalla en `mobile/app/`. La mayoría de los archivos de página empiezan con un comentario de una línea `// Rol(es). Descripción. Depende de: /endpoints`; cuando existe, se usó como base y se verificó/completó contra los `services/*` importados y las llamadas `api.get/post/put/patch/delete(...)` reales del archivo. `[rol1, rol2]` = `rolesPermitidos` en `frontend/src/App.tsx` (rutas sin entrada ahí son públicas o solo exigen sesión). No se lee línea por línea el JSX — el objetivo es "qué hace y con qué API habla".

---

## Frontend web (`frontend/src/pages/`)

### AcademicoLogin.tsx — ruta `/login`
Login público para alumno/profesor (paleta propia, distinta de `/admin`). Envía `POST /auth/login`, guarda el access token en memoria y setea cookies `refresh_token`/`csrf_token`; además ofrece "olvidé mi contraseña" (`POST /auth/recuperar-contrasena`) y `GET /users/me` para resolver la sesión activa.
Rol: público (sin entrada en `rolesPermitidos`).

### AdminLogin.tsx — ruta `/admin`
Login público específico del rol admin (mismo flujo `POST /auth/login` + `GET /users/me`, UI separada).
Rol: público.

### AjustesGlobales.tsx — ruta `/ajustes-globales`
Edición de `GlobalSetting` organizada en 5 tabs por categoría (académico/financiero/sistema/notificaciones/auditoría) + export/import de configuración. Consume `services/settingsService.ts` (`getSettings`, `getAuditLog`, `updateSetting`, `exportSettings`, `importSettings`) → `/admin/settings/*`.
Rol: `[admin]`.

### Asistencia.tsx — ruta `/asistencia`
Vista dual por rol: alumno consulta su % de asistencia; profesor carga/edita asistencia de su materia (individual, por lote, QR). Llama directo a `api` (sin service dedicado): `GET /asistencias/profesor/carreras`, `GET /asistencias/profesor/materias`, `GET /asistencias/profesor/alumnos`, `GET /asistencias/qr/{materiaId}`, `POST /asistencias/profesor/marcar`, `PUT /asistencias/profesor/toggle/{id}`, `DELETE /asistencias/{id}`, `GET /reportes/asistencia-por-materia`.
Rol: `[admin, profesor, alumno]`.

### AsistenciaScan.tsx — ruta `/asistencia/scan`
Pantalla de escaneo de QR para que el alumno registre su propia presencia. Llama `POST /asistencias/qr/verificar` y `GET /alumno/mi-asistencia`.
Rol: `[alumno]`.

### BecasAlumno.tsx — ruta `/mis-becas`
Catálogo de becas, mis postulaciones y becas activas (3 tabs). Llama `GET /becas/mis-postulaciones` y el resto de `/becas/*` <!-- TODO: verificar — solo se confirmó ese endpoint por grep directo; el resto surge del comentario de cabecera del archivo -->.
Rol: `[alumno]`.

### Biblioteca.tsx — ruta `/biblioteca`
Apuntes/biblioteca digital por materia: listado, subida y descarga, con storage en R2 (`services/storage.py` en el backend). Llama `GET /apuntes/`, `GET /materias/`, `POST /apuntes/`, `POST /apuntes/validar`, `PATCH /apuntes/{id}/descargar`, `PATCH /apuntes/{id}/like`.
Rol: `[admin, profesor, alumno]`.

### BoneCapture.tsx — ruta `/bone-capture`
Página interna de desarrollo: catálogo de estados de carga (`Skeleton` de `boneyard-js/react`) para varias pantallas (boleta, inscripciones, malla-alumno, mis-cuotas, graduación-alumno, equivalencias, pasantías-admin, ajustes-globales) con datos de relleno estáticos. No llama a ningún endpoint — no tiene lógica de negocio.
Rol: sin entrada en `rolesPermitidos` (accesible a cualquier sesión autenticada, sin restricción de rol).

### Calendario.tsx — ruta `/calendario`
Calendario académico: eventos globales o por materia (parciales, feriados, entregas), con carga de PDF de calendario (parseo vía Gemini en el backend). Llama `GET /eventos/`, `GET /profesor/materias`, `POST /eventos/`, `POST /eventos/cargar-pdf`.
Rol: `[admin, profesor, alumno]`.

### Dashboard.tsx — ruta `/dashboard`
Vista principal post-login, contenido condicional por rol: KPIs, próximas clases/vencimientos, calificaciones por materia. Alumno usa `GET /alumno/dashboard`, `/alumno/mi-asistencia`, `/alumno/mis-materias`, `/alumno/mis-notas` directo por `api`; además consume `services/pensumService.ts` (`obtenerCreditosAlumno`), `services/graduacionService.ts` (`getCondicionEgreso`), `services/adminService.ts` (`obtenerDashboardAdmin`) y `services/profesorService.ts` (`obtenerDashboardProfesor`) según el rol de la sesión.
Rol: `[admin, profesor, alumno]`.

### EquivalenciasAdmin.tsx — ruta `/equivalencias-admin`
Resolución de solicitudes de equivalencia (examen de suficiencia o reválida) por parte del admin. Consume `services/equivalenciasService.ts` (`getTodasSolicitudes`, `getMateriasEquivalencia`) y llama directo `POST /equivalencias/examenes-suficiencia`, `PUT /equivalencias/{id}/resolver`.
Rol: `[admin]`.

### EquivalenciasAlumno.tsx — ruta `/mis-equivalencias`
El alumno solicita equivalencias de materias cursadas en otra institución y ve el estado de sus solicitudes (polling cada 30s). Consume `services/equivalenciasService.ts` (`crearSolicitudEquivalencia`, `getEquivalenciasAlumno`) → `/equivalencias/*`.
Rol: `[alumno]`.

### Estadisticas.tsx — ruta `/estadisticas`
Estadísticas agregadas de cursos/carrera, contenido distinto para profesor vs admin. Llama `api.get` directo contra endpoints de `/reportes/*` (dashboard/estadísticas) y `GET /asistencias/materia/{id}/alumnos` para el detalle por materia.
Rol: `[admin, profesor]`.

### Expediente.tsx — ruta `/expediente`
Wrapper sin lógica propia: según `useRole()` renderiza `ExpedienteAdmin` (rol admin) o `ExpedienteAlumno` (cualquier otro rol permitido en la ruta).
Rol: `[admin, alumno]` (heredado de la ruta; el wrapper en sí no llama a la API).

### ExpedienteAdmin.tsx
Búsqueda de expediente por alumno y cierre de materia, para el admin. Llama `GET /carreras/`, `GET /inscripciones/?alumno_id=`, `GET /materias/?carrera_id=`, `GET /users/?...` (búsqueda de alumno) más el resto de `/expediente/*` referenciado en su comentario de cabecera.
Rol: renderizada solo para `admin` (vía `Expediente.tsx`).

### ExpedienteAlumno.tsx
PPA, regularidad y historial académico propio del alumno, con polling cada 30s. Consume `services/expedienteService.ts` (`obtenerPPA`, `obtenerExpediente`, `obtenerRegularidad`) → `/expediente/alumno/{id}/*`.
Rol: renderizada para roles no-admin (típicamente `alumno`) vía `Expediente.tsx`.

### Finanzas.tsx — ruta `/finanzas`
Cuotas, pagos, comprobantes de facturación electrónica y rendición Excel de becas, para el admin. Montos siempre tratados como `Numeric` — el comentario de cabecera aclara no redondear en el cliente. Llama `GET /users/?role=alumno&q=...` (buscador de alumno) más el resto de `/finanzas/*`.
Rol: `[admin]`.

### GestionAsignaciones.tsx — ruta `/gestion-asignaciones`
Asignación profesor↔materia por período (ofertas). Consume `services/asignacionesService.ts` (`obtenerStatsMaterias`, `listarMaterias`, `listarProfesores`, `asignarProfesor`, `crearOferta`) → `/materias/*`.
Rol: `[admin]`.

### GraduacionAdmin.tsx — ruta `/graduacion-admin`
Candidatos a graduación, procesos, tutores, etapas de tesis. Llama `GET /carreras/` (filtro) más el resto de `/graduacion/*` (listado de candidatos, iniciar proceso, asignar tutor, actualizar etapa — ver `SERVICIOS.md::graduacion.py`).
Rol: `[admin]`.

### GraduacionAlumno.tsx — ruta `/mi-graduacion`
Condición de egreso propia (créditos + PPA + pasantía) y estado del proceso de tesis. Consume `services/graduacionService.ts` (`getCondicionEgreso`) → `/graduacion/alumno/{id}/*`.
Rol: `[alumno]`.

### Inscripciones.tsx — ruta `/inscripciones`
Inscripción a ofertas de materia. El bloqueo real por correlatividades/cupo/mora se aplica server-side (`services/pensum.py`, `services/financiero.py`); esta vista solo refleja el resultado. Llama `GET /carreras/`, `GET /inscripciones/`, `GET /inscripciones/carrera/{id}`, `GET /inscripciones/stats`, `GET /materias/`, `GET /materias/stats`, `GET /users/`, `GET /users/me`, `POST /inscripciones/`, `DELETE /inscripciones/{id}`.
Rol: `[admin, alumno]`.

### Malla.tsx — ruta `/malla`
Wrapper sin lógica propia: según `useRole()` renderiza `MallaAdmin` (rol admin) o `MallaAlumno` (resto).
Rol: `[admin, alumno]` (heredado de la ruta).

### MallaAdmin.tsx
Edición de la malla curricular por carrera (`pensum_materias`, correlatividades). Llama `GET /carreras/`, `GET /materias/?carrera_id=`, `POST /carreras/`, `POST /materias/`, más el resto de `/pensum/*`.
Rol: renderizada solo para `admin` (vía `Malla.tsx`).

### MallaAlumno.tsx
Visualización del avance del alumno en la malla curricular (5 estados de color: aprobada/cursando/reprobada/bloqueada/pendiente — mismo criterio que `services/pensum.py::_calcular_estado_cached`). Consume `services/pensumService.ts` (`obtenerAvanceAlumno`, `obtenerCreditosAlumno`) → `/pensum/avance/*`.
Rol: renderizada para roles no-admin vía `Malla.tsx`.

### MisCuotas.tsx — ruta `/mis-cuotas`
Cuotas propias del alumno, pago online vía Stripe, comprobantes de facturación electrónica. Consume `services/finanzasService.ts` (`getCuotasAlumno`, `getBecasActivas`, `initPagoOnline`, `formatGs`) → `/finanzas/alumno/{id}/cuotas`, `/finanzas/pagos/*`.
Rol: `[alumno]`.

### MisMaterias.tsx — ruta `/mis-materias`
Cátedras activas/histórico/agenda del profesor, unificados en tabs. Consume `services/historicoService.ts` (`obtenerMiHistorico`) y `services/agendaService.ts` (`obtenerMiAgenda`, `crearRecordatorio`, `actualizarRecordatorio`, `eliminarRecordatorio`); también llama directo `GET /asistencias/materia/{id}/alumnos`, `GET /profesor/dashboard`, `GET /profesor/materias`.
Rol: `[profesor]`.

### NotFound.tsx — ruta `*`
Fallback de ruta no encontrada. Sin llamadas a la API ni lógica de negocio.
Rol: público.

### PasantiasAdmin.tsx — ruta `/pasantias-admin`
Aprobación de solicitudes de pasantía, gestión de empresas receptoras, control de horas, para el admin. Llama `GET /pasantias/solicitudes`, `PUT /pasantias/{id}/rechazar`, más el resto de `/pasantias/*` (aprobar, finalizar, informes — ver `SERVICIOS.md::pasantia.py`).
Rol: `[admin]`.

### PasantiasAlumno.tsx — ruta `/mis-pasantias`
Solicitud de pasantía propia, historial completo (incluye rechazadas con motivo), informes, con polling cada 30s. Consume `services/pasantiasService.ts` (`solicitarPasantia`, `getEmpresas`, `getMisPasantias`) → `/pasantias/*`.
Rol: `[alumno, profesor]`.

### Perfil.tsx — ruta `/perfil`
Datos personales, cambio de contraseña, condición de beca (si es alumno), suscripción a notificaciones push. Consume `services/finanzasService.ts` (`getBecasActivas`), `services/graduacionService.ts` (`getCondicionEgreso`), `services/historicoService.ts` (`obtenerMiHistorico`); llama directo `GET /users/me`, `PATCH /users/{id}`, `PATCH /alumno/mi-perfil`, `POST /auth/cambiar-contrasena`, `GET/POST/DELETE /notificaciones/subscribe`, `GET /notificaciones/vapid-public-key`, `GET /alumno/mi-asistencia`, `GET /alumno/mis-notas`.
Rol: `[admin, profesor, alumno]`.

### Programa.tsx — ruta `/programa`
"Cursos unificado" para alumno/profesor: Temario + Asistencia + Calificaciones en tabs sobre una misma materia. Llama `GET /programas/`, `GET /programas/{id}`, `PUT /programas/materia/{id}/bulk`, `GET /materias/`, `GET /pensum/alumno/{id}/creditos`, `GET /alumno/mis-notas`, `GET /alumno/reporte-notas`.
Rol: `[admin, profesor, alumno]`.

### Puntajes.tsx — ruta `/puntajes`
Vista dual: alumno ve sus calificaciones; profesor carga notas por puntos configurables (`PesoEvaluacion`). Consume `services/pensumService.ts` (`obtenerCreditosAlumno`); llama directo `GET /puntajes/?materia_id=`, `GET /puntajes/pesos/{id}`, `POST /puntajes/`, `PUT /puntajes/{id}`, `PUT /puntajes/pesos/{id}`, `GET /materias/`, `GET /materias/stats`, `GET /inscripciones/materia/{id}`, `GET /carreras/`, `GET /users/`, `GET /alumno/mis-notas`.
Rol: `[admin, profesor, alumno]`.

### Reportes.tsx — ruta `/reportes`
Reportes exportables para el admin (estadísticas, formato RUE-ES/MEC). Llama `GET /reportes/becados`, `GET /reportes/dashboard`, `GET /reportes/por-carrera`, `GET /reportes/resumen`.
Rol: `[admin]`.

### ResetPassword.tsx — ruta `/reset-password`
Público, sin login: lee `?token=` de la URL y muestra formulario de nueva contraseña. Llama `POST /auth/reset-password`.
Rol: público.

### SolicitudesTramites.tsx — ruta `/tramites`
Vista dual alumno/admin: constancias e historiales oficiales, trámites automáticos y manuales. Consume `services/tramitesService.ts` (`getTiposTramite`, `crearSolicitud`, `getMisSolicitudes`, `getDescargaUrl`, `resolverSolicitud`, `getStatsTramites`) → `/tramites/*`.
Rol: `[admin, alumno]`.

### Usuarios.tsx — ruta `/usuarios`
CRUD de usuarios (admin), listado paginado server-side, búsqueda. Consume `services/usersService.ts` (`listarUsuarios`, `crearUsuario`, `actualizarUsuario`, `eliminarUsuario`, `obtenerStatsUsuarios`, `listarCarreras`) → `/users/*`.
Rol: `[admin]`.

### Boleta/BoletaPage.tsx — ruta `/boleta`
Boleta de calificaciones del alumno (o de un alumno puntual visto por admin/profesor), con sello digital verificable (QR + código) y descarga de PDF por scope (`global`/`anio`/`semestre_actual` — ver `SERVICIOS.md::boleta_pdf.py`). Usa los hooks propios `hooks/useBoletaData` y `hooks/usePdfExport`, y llama directo `GET /alumno/dashboard`, `GET /boleta/{id}/sello`, `GET /profesor/lista-alumnos`, además de `/boleta/resumen`, `/boleta/pdf`, `/boleta/verificar/{codigo}` (declarados en el comentario de cabecera del archivo).
Rol: `[admin, alumno]` (más profesor viendo un alumno puntual, según el comentario de cabecera <!-- TODO: verificar — `/boleta` en `rolesPermitidos` solo lista `admin`/`alumno`, no `profesor`; confirmar si el acceso de profesor pasa por otra ruta o el comentario está desactualizado -->).

---

## Mobile (`mobile/app/`)

> Cada pantalla consume `services/api.ts` (cliente axios base) más un service dedicado. Roles según el comentario de cabecera de cada archivo — el proyecto mobile no tiene un mapa de roles centralizado equivalente a `App.tsx` del frontend web.

### (auth)/login.tsx
Login público: JWT + `SecureStore` + biometría opcional. Consume `services/authService.ts` (`loginRequest`, `recuperarContrasenaRequest`, `registroRequest`, `resetPasswordRequest` → `POST /auth/login`, `/auth/recuperar-contrasena`, `/auth/registro`, `/auth/reset-password`), `services/api.ts` (`warmUpBackend`) y `services/dashboardService.ts` (`fetchPerfil` → `GET /alumno/mi-perfil`).
Rol: público.

### (tabs)/index.tsx — tab Dashboard
KPIs, progreso, próximo evento. Consume `services/dashboardService.ts`: `fetchPerfil` (`GET /alumno/mi-perfil`), `fetchResumen` (`GET /alumno/mi-resumen`), `fetchStudentSummary` (`GET /alumno/summary`), `fetchEventosProximos` (`GET /eventos/`), `fetchCuotasAlumno` (`GET /finanzas/alumno/{id}/cuotas`).
Rol: `[alumno, profesor]`.

### (tabs)/cursos.tsx — tab Cursos
Lista de materias del alumno/profesor, entrada al detalle (`app/cursos/[id].tsx`). Consume `services/notasService.ts` (materias/notas/asistencia resumidas → `GET /alumno/mis-materias`, `GET /alumno/mis-notas`, `GET /alumno/mi-asistencia`), `services/dashboardService.ts` (`fetchPerfil`) y `services/boletaService.ts` (descarga de boleta PDF → `GET /boleta/pdf`).
Rol: `[alumno, profesor]`.

### (tabs)/horario.tsx — tab Horario
Calendario semanal de clases. Consume `services/calendarioService.ts` (`GET /eventos/mes/{anio}/{mes}`, `GET /eventos/dia/{fecha}`, `GET /eventos/`) y `services/api.ts` directo.
Rol: `[alumno, profesor]`.

### (tabs)/perfil.tsx — tab Perfil
Datos personales, tema, ajustes, chequeo de actualización de la app. Consume `services/dashboardService.ts` (perfil/foto — `GET /alumno/mi-perfil`, `POST /users/me/foto`) y `services/updateService.ts` (`checkForUpdate` → `GET /version`, misma respuesta que `main.py::version()` en el backend).
Rol: `[alumno, profesor]`.

### cambiar-contrasena.tsx
Cambiar contraseña. Consume `services/authService.ts` (`cambiarContrasenaRequest` → `POST /auth/cambiar-contrasena`).
Rol: `[alumno, profesor]`.

### cuenta.tsx
Estado de cuenta del alumno (cuotas). Consume `services/cuentaService.ts` (`fetchCuenta`, que primero llama `fetchPerfil()` y luego `GET /finanzas/alumno/{id}/cuotas`).
Rol: `[alumno]` (según comentario de cabecera).

### cursos/[id].tsx
Detalle de una materia: notas y asistencia. Consume `services/notasService.ts` (`fetchMateriaDetalle` → `GET /notas/materia/{id}/detalle`).
Rol: `[alumno, profesor]`.

### cursos/[id]/asistencia.tsx
Detalle de asistencia de una materia, tarjetas circulares por sesión. Consume `services/notasService.ts` (`fetchAsistenciaDetalle` → `GET /notas/materia/{id}/asistencia`).
Rol: `[alumno, profesor]`.

### examenes.tsx
Exámenes — pantalla marcada "en desarrollo" en el propio comentario de cabecera (ver `RESUMEN_TECNICO_COMPLETO.md` <!-- TODO: verificar — archivo no confirmado en este documento, referenciado tal cual aparece en el código -->). Consume `services/examenesService.ts`: `GET /examenes/disponibles`, `GET /examenes/inscriptos`, `POST /examenes/inscripciones`, `DELETE /examenes/inscripciones/{id}`.
Rol: `[alumno]`.

### scanner.tsx
Scanner de QR para registrar asistencia (alumno escanea el QR generado por el profesor en la vista web). Consume `services/asistenciaService.ts`: `POST /asistencias/qr/verificar`, `GET /alumno/mis-materias-hoy`, `GET /alumno/mi-asistencia`.
Rol: `[alumno, profesor]` (el comentario de cabecera incluye profesor, aunque el flujo de verificación de QR en el backend — `routers/asistencias_router.py` — exige rol `alumno` a nivel servidor desde 2026-08-07; ver `SERVICIOS.md`/`API_REFERENCE.md`) <!-- TODO: verificar — posible mismatch entre el comentario de cabecera de la pantalla y la restricción real de rol en el backend -->.
