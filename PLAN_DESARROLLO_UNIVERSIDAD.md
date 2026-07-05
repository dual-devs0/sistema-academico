# PLAN DE DESARROLLO
## Sistema Académico UCA V2 — Universidad

**Versión actualizada** — incluye facturación electrónica, becas diferenciadas (ITAIPU / institución) y mejoras del portal docente

**Universidad Católica "Nuestra Señora de la Asunción" — Sede Caacupé**

- **Duración total:** ≈ 28-30 semanas (7-7.5 meses)
- **Fases:** 6 (incluye nueva Fase de Facturación Electrónica)
- **Alcance:** exclusivamente universidad — el modo colegio se detalla en un documento separado

**Novedades en esta versión:** Facturación electrónica (guarani.app) • Becas ITAIPU vs. institucionales diferenciadas • Portal docente mejorado: Mis Cursos, Histórico y Agenda

---

## Índice

1. Resumen ejecutivo y novedades de esta versión
2. Principios técnicos transversales
3. Fase 0 — Deuda técnica crítica
4. Fase 1 — Quick wins + mejora del portal docente
5. Fase 2 — Pensum y malla curricular
6. Fase 3 — Expediente académico consolidado
7. Fase 4 — Módulo financiero, aranceles y becas diferenciadas
8. Fase 4B — Facturación electrónica (guarani.app)
9. Fase 5 — Solicitudes, graduación, pasantías, equivalencias
10. Cronograma consolidado
11. Plan de pruebas y control de calidad
12. Riesgos técnicos y mitigación

---

## 1. Resumen ejecutivo y novedades de esta versión

Este documento actualiza el plan de desarrollo de UCA V2 incorporando tres requerimientos nuevos sobre la base ya aprobada: facturación electrónica, diferenciación de becas por origen, y mejoras al portal del profesor. El alcance sigue siendo exclusivamente universitario; el modo colegio se entrega como documento separado.

### 1.1 Los tres agregados de esta versión

| Agregado | Dónde se integra | Motivo |
|---|---|---|
| Facturación electrónica | Nueva Fase 4B, integrada al módulo financiero (Fase 4) | Cumplimiento normativo DNIT — todo cobro de arancel debe emitir comprobante legal |
| Becas ITAIPU vs. institución | Fase 4 — extiende el modelo de becas del plan original | La mayoría de los becados de la UCA Caacupé son de ITAIPU; el sistema debe distinguir origen, cupo y reglas de renovación distintas |
| Mejora del portal docente | Fase 1 — extiende el quick win de Mis Cursos/Mis Materias | Mis Cursos necesita histórico de cátedras dictadas y una agenda propia del profesor, no solo la lista de materias activas |

### 1.2 Estado actual (línea base — sin cambios respecto al plan aprobado)

| Área | Estado | Observación |
|---|---|---|
| Autenticación y seguridad | Sólido | JWT HS256, RBAC, rate limiting, 49 tests |
| Calificaciones | Correcto | Promedio ponderado 25/25/20/30, actas por materia |
| Asistencia QR | Diferenciador | JWT propio + countdown, BarcodeDetector API |
| Horarios / inscripciones | Correcto | Anti-solapamiento y control de cupos |
| Base de datos | Riesgo | SQLite no soporta escritura concurrente |
| Storage de archivos | Riesgo | Sin persistencia real (fotos, apuntes) |
| Pensum / malla curricular | Inexistente | Bloqueante para uso universitario real |
| Expediente académico | Inexistente | La boleta actual no reemplaza el historial |
| Módulo financiero | Inexistente | Solo existe el booleano es_becado |
| Facturación electrónica | Inexistente (nuevo) | Ningún cobro emite comprobante legal DNIT |
| Becas por origen | Inexistente (nuevo) | es_becado no distingue ITAIPU de institucional |

### 1.3 Los 9 módulos nuevos de esta versión

- Pensum y malla curricular (correlatividades, bloqueo de inscripción)
- Expediente académico consolidado (historial + PPA acumulado)
- Módulo financiero (cuotas, pagos, bloqueo por deuda)
- Becas diferenciadas por origen — ITAIPU / institucional (nuevo en esta versión)
- Facturación electrónica — integración guarani.app (nuevo en esta versión)
- Solicitudes y trámites formales (constancias, historiales oficiales)
- Proceso de graduación y tesis (egreso, tutor, defensa)
- Pasantías y prácticas profesionales (empresas, horas, informes)
- Equivalencias y convalidaciones (traslados, cambios de plan)

### 1.4 Duración total estimada

| Fase | Contenido | Duración |
|---|---|---|
| Fase 0 | Deuda técnica crítica | 1 semana |
| Fase 1 | Quick wins + portal docente mejorado | 2 semanas |
| Fase 2 | Pensum y malla curricular | 3-4 semanas |
| Fase 3 | Expediente académico consolidado | 2-3 semanas |
| Fase 4 | Módulo financiero + becas diferenciadas | 4-5 semanas |
| Fase 4B | Facturación electrónica (guarani.app) | 1.5-2 semanas |
| Fase 5 | Solicitudes, graduación, pasantías, equivalencias | 8-10 semanas |

**Total: ≈ 28-30 semanas (7-7.5 meses)** — equipo de 1-2 desarrolladores full-stack

---

## 2. Principios técnicos transversales

Se mantienen íntegros los principios del plan aprobado. Se agregan dos principios específicos para facturación electrónica y para el manejo de fuentes de beca.

### 2.1 Backend (FastAPI + SQLAlchemy) — sin cambios

- Cada módulo nuevo vive en su propio router y su propio archivo de modelos, siguiendo el patrón de puntajes.py y asistencia.py
- Toda tabla nueva incluye id, created_at y updated_at (server_default=func.now())
- Toda relación con alumno usa alumno_id como FK a users.id — nunca duplicar datos del usuario
- Los montos monetarios se guardan como Numeric(12,2), nunca float
- Cada endpoint requiere JWT + verificación de rol explícita con Depends()
- Toda migración de esquema se hace con Alembic — nunca create_all() en producción
- Los endpoints de listado exponen paginación server-side (limit/offset) desde el día uno

### 2.2 Frontend (React + TypeScript) — sin cambios

- Mantener paleta y tema oscuro existente: fondo #0b0f14, acento cian #00b4d8
- Cada módulo expone un servicio TypeScript en src/services/<modulo>.ts
- Formularios complejos usan react-hook-form + zod para validación
- Las vistas de administración reutilizan el componente de tabla paginada (TablaPaginada) construido en Fase 1

### 2.3 Nuevo — Manejo de fuentes de financiamiento (becas)

**Principio clave:** Una beca siempre tiene una fuente (ITAIPU, institucional, BECAL, otra) y esa fuente determina las reglas de renovación, el flujo de aprobación y quién reporta el uso de fondos

- El campo fuente_financiamiento nunca es opcional en el catálogo de becas — se define en el momento de crear la beca, no al aprobar la postulación
- Las becas de fuente externa (ITAIPU, BECAL) no permiten al comité modificar el porcentaje de descuento manualmente — viene definido por convenio y es de solo lectura en el frontend
- Las becas institucionales sí permiten ajuste de porcentaje caso por caso, con registro de quién lo autorizó

### 2.4 Nuevo — Integración con proveedor externo de facturación electrónica

**Principio clave:** UCA V2 no reimplementa lógica de facturación electrónica — delega en guarani.app vía API y solo guarda la referencia del comprobante emitido

- Ningún dato fiscal (CDC, timbrado, XML firmado) se genera ni se valida dentro del backend de UCA V2 — se consume la respuesta de la API de guarani.app y se persiste solo el identificador y la URL del comprobante
- Las credenciales de la API de guarani.app se guardan como secreto de entorno, nunca en el repositorio
- Todo fallo de la API externa debe degradar con gracia: el pago queda registrado igual en UCA V2 con estado 'comprobante_pendiente', reintentable, sin bloquear la operación académica del alumno

### 2.5 Base de datos y migraciones — sin cambios

- Toda nueva tabla se crea con una migración Alembic versionada
- Las migraciones de cada fase se prueban primero contra staging antes de producción
- Ninguna migración elimina columnas existentes en la misma fase que introduce su reemplazo

### 2.6 Testing — sin cambios

- Cada módulo nuevo requiere tests unitarios de los cálculos críticos (PPA, promedio, mora, avance de malla, monto de descuento por beca)
- Tests de integración de los endpoints principales, incluyendo casos de error 403/404/422
- Tests de restricción de rol específicos para becas (un profesor no puede aprobar becas, un comité no puede editar el % de una beca ITAIPU)

---

## FASE 0 — Deuda técnica crítica
**BLOQUEANTE — 1 semana**

Sin cambios respecto al plan aprobado. Se resume aquí para mantener continuidad; el detalle completo de tareas ya fue validado y no se repite en extenso.

### 0.1 Migración de SQLite a PostgreSQL

- Levantar PostgreSQL 16 (Docker en dev; Railway/Render/RDS en producción)
- Cambiar DATABASE_URL a postgresql+psycopg2://usuario:password@host:5432/uca_v2
- Auditar tipos de columna incompatibles (Boolean, DateTime con timezone, JSON)
- Instalar y configurar Alembic con baseline_schema
- Migrar datos de desarrollo con script SQLite → PostgreSQL respetando orden de FKs
- pool_size=10, max_overflow=20, pool_pre_ping=True en el engine
- Correr los 49 tests existentes contra PostgreSQL antes de cerrar la fase

**Criterio de aceptación:** Los 49 tests pasan contra PostgreSQL; 10 inscripciones simultáneas no producen bloqueo

### 0.2 Storage real de archivos (Cloudflare R2)

- Crear bucket uca-v2-storage con credenciales S3-compatibles
- app/services/storage.py con subir_archivo(), obtener_url_firmada(), eliminar_archivo()
- Guardar solo la key del objeto en BD, no URL absoluta — servir con URL firmada de expiración corta
- Límites por endpoint: fotos de perfil 2 MB jpg/png, apuntes 20 MB pdf/docx/pptx

**Criterio de aceptación:** Un archivo subido persiste tras reinicio del servidor y es accesible desde otra sesión

### 0.3 SMTP funcional (Resend)

- Cuenta en Resend (3000 correos/mes gratis) o SMTP Gmail con contraseña de aplicación
- Verificar dominio de envío (notificaciones@uca-sistema.edu.py) para evitar spam
- Cola de reintentos simple (3 intentos con backoff)

**Criterio de aceptación:** Reset de contraseña y notificación de nota llegan a un correo real en menos de 1 minuto

### 0.4 Autenticación: cookie httpOnly + refresh token

- Access token 15 min (body) + refresh token 7 días (cookie httpOnly, Secure, SameSite=Lax)
- Tabla refresh_tokens (id, usuario_id, token_hash, expira_en, revocado)
- Endpoint POST /auth/refresh — valida cookie, verifica no revocado, emite nuevo access token
- Interceptor de Axios: ante 401, llama a /auth/refresh y reintenta una vez
- Logout revoca el refresh token en BD, no solo limpia el cliente
- Retrocompatibilidad temporal con tokens del esquema anterior hasta expiración natural

**Criterio de aceptación:** Un alumno que cierra el navegador permanece autenticado hasta 7 días sin volver a loguearse

---

## FASE 1 — Quick wins + portal docente mejorado
**PRIORIDAD ALTA — 2 semanas**

Incluye los quick wins ya aprobados y agrega el rediseño solicitado de la experiencia del profesor: Mis Cursos con histórico de cátedras, y una Agenda propia.

### 1.1 Conectar Estadisticas.tsx al endpoint real

- Revisar el contrato de respuesta de GET /puntajes/materia/{id}/estadisticas
- Crear src/services/estadisticasService.ts con obtenerEstadisticasMateria(materiaId)
- Reemplazar datos hardcodeados por la llamada real, usando Recharts para la distribución
- Agregar estado de carga y manejo de error (materia sin notas cargadas)

### 1.2 Completar UI del foro

- Botones 'Fijar' y 'Cerrar' hilo visibles solo para profesor/admin, conectados a PUT existente
- Edición de mensajes propios con ventana de 15 minutos (agregar endpoint si no existe)
- Paginación de mensajes (20 por página) con el mismo patrón limit/offset del estándar
- Estado visual de 'cerrado' (input deshabilitado) y 'fijado' (ícono + orden prioritario)

### 1.3 Paginación server-side en Usuarios.tsx

- Backend: parámetros limit/offset en GET /users/ + total de registros en la respuesta
- Backend: filtro de búsqueda por nombre/email/rol
- Frontend: componente reutilizable TablaPaginada en src/components/common/ — se reutiliza en financiero, becas, solicitudes
- Reemplazar la tabla actual de Usuarios.tsx por el componente nuevo

### 1.4 Rediseño del portal docente — Mis Cursos, Histórico y Agenda

**Contexto:** MisCursos.tsx y MisMaterias.tsx se fusionan (como ya estaba planeado) pero el resultado necesita 3 pestañas claras: cátedras activas, histórico de cátedras dictadas, y agenda personal del profesor

#### 1.4.1 Fusión base (ya prevista en el plan original)

- Auditar MisCursos.tsx y MisMaterias.tsx para listar funciones y solapamiento real
- Consolidar en una sola vista 'Mis Materias' con pestañas: Activas / Histórico / Agenda
- Redirigir rutas antiguas para no romper enlaces guardados
- Eliminar componente y ruta redundante tras validar la vista unificada

#### 1.4.2 Pestaña 'Activas' (cátedras del período en curso)

- Lista de materias asignadas al profesor en el período académico activo
- Por cada materia: cantidad de alumnos inscriptos, % de asistencia promedio, próxima clase según horario
- Acceso directo desde cada card a: carga de notas, asistencia QR, programa/temario
- Reutiliza los datos ya expuestos por /asistencias/materia/{id}/alumnos (existente)

#### 1.4.3 Pestaña 'Histórico' (cátedras dictadas en períodos anteriores) — NUEVO

Actualmente el sistema no tiene forma de que un profesor vea qué dictó en semestres pasados. Esto es necesario para su propio historial docente, informes a la institución, y continuidad pedagógica entre cohortes.

**Modelo de datos — extensión mínima, sin tabla nueva:**

```python
# La tabla materias ya tiene anio y semestre.
# Solo se necesita el campo 'periodo' consistente (ej. '2024-1')
# y NO borrar materias de períodos pasados — solo marcarlas.
class Materia(Base):
    # ...campos existentes...
    periodo = Column(String(10), nullable=False)  # '2024-1', '2024-2', '2025-1'
    activa = Column(Boolean, default=True)  # False cuando el período cierra
```

**Endpoint nuevo:**

```
GET /profesor/mi-historico
# Rol: profesor propio / admin
# Devuelve, agrupado por periodo (más reciente primero):
# - materia, carrera, cantidad de alumnos que tuvo
# - promedio general del grupo en esa cátedra
# - % de aprobación de esa cátedra
# - link a las estadísticas de esa materia/período específico
```

**Frontend — pestaña Histórico:**

- Lista agrupada por período académico, orden descendente (más reciente arriba)
- Por cada cátedra histórica: nombre, carrera, cantidad de alumnos, promedio del grupo, % aprobación
- Click en una cátedra histórica abre las estadísticas de esa materia en modo solo lectura
- Filtro por año y por carrera para profesores con muchos períodos dictados
- Este histórico es la base de datos que luego alimenta el CV/legajo docente si se requiere en el futuro

#### 1.4.4 Pestaña 'Agenda' (agenda personal del profesor) — NUEVO

El Calendario existente muestra eventos institucionales y de materia. La Agenda es distinta: es la vista consolidada y personal del profesor de todo lo que tiene esta semana, cruzando horarios de clase, eventos de calendario y tareas propias.

**Diferencia clave con el Calendario existente:**

| Calendario (existente) | Agenda (nueva) |
|---|---|
| Eventos institucionales y por materia, compartido con alumnos | Vista personal, solo del profesor, cruzando todas sus materias |
| Vista mensual/diaria de eventos | Vista semanal tipo 'planificador', con horarios de clase incluidos |
| No distingue entre clases regulares y eventos especiales | Combina horario fijo de clases + eventos + recordatorios propios |

**Nueva tabla — recordatorios propios del profesor:**

```python
class RecordatorioDocente(Base):
    __tablename__ = 'recordatorios_docente'
    id = Column(Integer, primary_key=True)
    profesor_id = Column(Integer, ForeignKey('users.id'))
    titulo = Column(String(200))
    descripcion = Column(Text, nullable=True)
    fecha = Column(DateTime)
    materia_id = Column(Integer, ForeignKey('materias.id'), nullable=True)
    completado = Column(Boolean, default=False)
```

**Endpoint — agenda_router.py:**

```
GET /profesor/mi-agenda?desde=&hasta=
# Combina en una sola respuesta:
# - horarios.* de las materias activas del profesor (clases fijas de la semana)
# - eventos_calendario.* donde el profesor es creador o está en una de sus materias
# - recordatorios_docente.* propios
# Devuelve todo normalizado por día/hora para renderizar en una sola grilla semanal

POST /profesor/recordatorios         # crear recordatorio propio
PATCH /profesor/recordatorios/{id}   # marcar completado / editar
DELETE /profesor/recordatorios/{id}  # eliminar
```

**Frontend — pestaña Agenda:**

- Vista semanal tipo grilla (días en columnas, horas en filas), similar a Google Calendar simplificado
- Bloques de clase fija en color por materia (usa el mismo acento violeta del rol profesor)
- Eventos institucionales superpuestos con ícono distinto a las clases regulares
- Recordatorios propios con checkbox para marcar completado, sin afectar a otros roles
- Botón rápido '+ Recordatorio' desde cualquier celda de la grilla
- Vista compacta de 'hoy' en el Dashboard del profesor, reutilizando este mismo endpoint filtrado al día actual

---

## FASE 2 — Pensum y malla curricular
**IMPACTO ALTO — 3-4 semanas**

Sin cambios respecto al plan aprobado. Módulo de mayor impacto académico: sin esto, el sistema no valida avance de carrera ni bloquea inscripciones por prerrequisito faltante.

### 2.1 Modelo de datos

| Tabla | Campos clave | Notas |
|---|---|---|
| carreras | id, nombre, codigo, duracion_semestres, creditos_totales | Extender si falta duracion_semestres/creditos_totales |
| pensum_materias | id, carrera_id, materia_id, semestre, creditos, es_electiva | Ubicación de la materia dentro de la malla |
| correlatividades | id, materia_id, prerrequisito_id, tipo | tipo: aprobada / cursando |
| avance_alumno_pensum | id, alumno_id, pensum_materia_id, estado, fecha_actualizacion | Se recalcula automáticamente, no se edita a mano |

### 2.2 Algoritmo de validación de prerrequisitos

- Obtener prerrequisitos de la materia desde correlatividades
- Para cada prerrequisito, consultar el estado de notas del alumno
- Si un prerrequisito tipo 'aprobada' no tiene nota final aprobatoria, rechazar con HTTP 422 listando materias pendientes
- Si un prerrequisito tipo 'cursando' no tiene inscripción activa/histórica, rechazar igual
- Implementar como función pura validar_correlatividades(alumno_id, materia_id, db), testeable de forma aislada

### 2.3 Endpoints nuevos

```
POST /pensum/carreras/{id}/materias      # admin: agrega materia a la malla
POST /pensum/correlatividades            # admin: define prerrequisito
DELETE /pensum/correlatividades/{id}     # admin: elimina prerrequisito
GET /pensum/carreras/{id}                # malla completa de la carrera
GET /pensum/alumno/{id}/avance           # estado por materia para el alumno
GET /pensum/alumno/{id}/creditos         # créditos acumulados vs. totales
```

### 2.4 Frontend

- MallaAdmin.tsx: grilla editable por semestre, selector de materias y correlatividades
- MallaAlumno.tsx: visualización tipo árbol/grilla por semestre — verde=aprobada, cian=disponible, gris=bloqueada, ámbar=cursando
- Tooltip en materia bloqueada mostrando prerrequisitos faltantes
- Error de correlatividad claro en el flujo de inscripción, listando materias pendientes en lenguaje natural
- Barra de progreso de avance de carrera en el Dashboard del alumno

### 2.5 Plan de tareas y estimación

| Tarea | Estimación |
|---|---|
| Modelos, migraciones y seed inicial de carrera piloto | 3 días |
| Algoritmo de validación de correlatividades + tests | 3 días |
| Endpoints CRUD de pensum y correlatividades | 3 días |
| Integración de validación en el flujo de inscripción | 2 días |
| Frontend: administración de malla | 4 días |
| Frontend: visualización de malla del alumno + progreso | 4 días |
| Carga de datos reales de todas las carreras + validación académica | 3 días |
| QA, ajustes y tests de integración | 2 días |

---

## FASE 3 — Expediente académico consolidado
**IMPACTO ALTO — 2-3 semanas**

Sin cambios respecto al plan aprobado. Depende de Fase 2. La boleta actual muestra una materia puntual; el expediente es la vista histórica completa con PPA acumulativo.

### 3.1 Modelo de datos

| Tabla | Campos clave | Notas |
|---|---|---|
| expediente_semestres | id, alumno_id, carrera_id, numero_semestre, anio, periodo | Agrupador temporal |
| expediente_materias | id, expediente_semestre_id, materia_id, nota_final, condicion, ppa_semestral_parcial | Se genera automáticamente al cerrar cada materia |
| regularidad_alumno | id, alumno_id, estado, motivo, fecha_calculo | Recalculado por job periódico y ante eventos |

### 3.2 Cálculo del PPA acumulativo

```
PPA = Σ(nota_final × créditos) / Σ(créditos) — solo materias 'aprobada'
```

- Función calcular_ppa(alumno_id, db) en app/services/expediente.py con tests: sin materias aprobadas (PPA nulo, no cero), distintos créditos, recálculo tras rectificación
- Recálculo síncrono al registrar nota final definitiva — reutiliza el evento que ya dispara la boleta
- PPA expuesto también por semestre, no solo acumulado

### 3.3 Lógica de estado de regularidad (job diario)

- **En riesgo:** PPA bajo el umbral de la carrera (ej. 2.5/5) o asistencia <75% en alguna materia cursando
- **Irregular:** materias reprobadas pendientes de recursar fuera del plazo esperado
- **Activo:** no cumple condición de riesgo/irregularidad y tiene inscripción vigente
- **De baja:** sin inscripciones en los últimos N períodos consecutivos (configurable)

### 3.4 Endpoints nuevos

```
GET /expediente/alumno/{id}                # historial completo por semestre + PPA
GET /expediente/alumno/{id}/regularidad     # estado de regularidad actual
GET /expediente/alumno/{id}/pdf             # historial académico oficial en PDF
POST /expediente/recalcular/{alumno_id}     # admin: recálculo manual
```

### 3.5 Frontend

- ExpedienteAlumno.tsx: semestres colapsables con materias, nota final, condición, PPA del semestre
- Encabezado fijo con PPA acumulado y badge de regularidad (verde/ámbar/rojo)
- Botón de descarga del historial oficial en PDF (mismo patrón ReportLab de la boleta)
- Vista de búsqueda para profesor/admin reutilizando la tabla paginada de Fase 1

### 3.6 Plan de tareas y estimación

| Tarea | Estimación |
|---|---|
| Modelos, migraciones y función de cálculo de PPA + tests | 3 días |
| Job de estado de regularidad + configuración por carrera | 3 días |
| Endpoints de expediente y regularidad | 2 días |
| Plantilla PDF de historial oficial | 2 días |
| Frontend: vista de expediente del alumno | 3 días |
| Frontend: vista de búsqueda para profesor/admin | 2 días |
| QA y tests de integración end-to-end | 2 días |

---

## FASE 4 — Módulo financiero, aranceles y becas diferenciadas
**IMPACTO ALTO — 4-5 semanas**

Extiende el módulo financiero del plan aprobado incorporando la diferenciación explícita entre becas ITAIPU y becas institucionales, requerida porque ambas fuentes tienen reglas, cupos y reportes distintos.

### 4.1 Objetivo funcional

- Generación de cuotas por alumno según período académico (mensual o semestral, configurable por carrera)
- Registro de pagos con estado (pagado/pendiente/vencido/parcial) y método (efectivo/transferencia/tarjeta)
- Bloqueo académico automático por mora, con umbral configurable por carrera
- Emisión de recibos/comprobantes — en esta versión, vía facturación electrónica real (Fase 4B)
- Catálogo de becas con fuente de financiamiento explícita y reglas propias por fuente

### 4.2 Modelo de datos — financiero

| Tabla | Campos clave | Notas |
|---|---|---|
| conceptos_arancel | id, nombre, carrera_id (nullable), monto_base, periodicidad | Ej. 'Cuota mensual Ingeniería' |
| cuotas | id, alumno_id, concepto_id, periodo, monto, monto_descuento, fecha_vencimiento, estado | monto en Numeric(12,2) |
| pagos | id, cuota_id, monto_pagado, fecha_pago, metodo, referencia, registrado_por | Un pago puede ser parcial |
| comprobantes | id, pago_id, numero_comprobante, cdc, storage_key, fecha_emision | cdc = Código de Control DNIT — se agrega en Fase 4B |

### 4.3 Modelo de datos — becas diferenciadas (NUEVO en esta versión)

**Requerimiento explícito:** El sistema debe distinguir, en todo momento y desde el rol alumno, si la beca es de ITAIPU o de la institución — son fuentes con reglas, cupos y reportes distintos

| Tabla | Campos clave | Notas |
|---|---|---|
| fuentes_beca | id, nombre, tipo, es_externa, requiere_reporte_externo, editable_porcentaje | Catálogo fijo: ITAIPU, Institucional, BECAL, Fundasep, Otra |
| becas_catalogo | id, nombre, fuente_id (FK), porcentaje_descuento, monto_fijo, requisitos, cupos_totales, cupos_disponibles | fuente_id determina reglas de edición |
| postulaciones_beca | id, alumno_id, beca_id, estado, fecha_postulacion, documentos_storage_keys | estado: pendiente/en_revision/aprobada/rechazada |
| becas_activas | id, alumno_id, beca_id, fuente_id (denormalizado), periodo_inicio, periodo_fin, promedio_minimo_requerido, estado_renovacion | fuente_id denormalizado para reportes rápidos y para el badge visible del alumno |

**Seed inicial de fuentes_beca (datos fijos del sistema):**

```python
fuentes = [
    {'nombre': 'ITAIPU', 'tipo': 'externa', 'es_externa': True,
     'requiere_reporte_externo': True, 'editable_porcentaje': False},
    {'nombre': 'Institucional UCA', 'tipo': 'interna', 'es_externa': False,
     'requiere_reporte_externo': False, 'editable_porcentaje': True},
    {'nombre': 'BECAL', 'tipo': 'externa', 'es_externa': True,
     'requiere_reporte_externo': True, 'editable_porcentaje': False},
    {'nombre': 'Fundasep', 'tipo': 'externa', 'es_externa': True,
     'requiere_reporte_externo': True, 'editable_porcentaje': False},
]
```

### 4.4 Diferencias de reglas por fuente

| Aspecto | Beca ITAIPU (u otra externa) | Beca institucional |
|---|---|---|
| Quién define el % de descuento | Fijo por convenio, de solo lectura en el frontend | Editable por el comité caso a caso |
| Aprobación | El comité valida elegibilidad pero no puede alterar el beneficio | El comité define y aprueba el beneficio completo |
| Reporte periódico | Obligatorio — exportable para rendición a ITAIPU/entidad externa | Uso interno, sin obligación de reporte externo |
| Renovación | Sujeta también a criterios del convenio externo (cupos anuales) | Sujeta solo a criterios académicos internos (promedio, créditos) |
| Badge visible al alumno | "Becado ITAIPU" en violeta distintivo | "Becado Institucional" en cian, color del rol alumno |

### 4.5 Visualización en el rol alumno (requerimiento explícito)

**Requerimiento:** El alumno debe poder ver claramente de qué es becado — no un simple booleano 'es becado sí/no'

**Cambios en Perfil.tsx y Dashboard del alumno:**

- Badge visible junto al nombre del alumno: 'Becado ITAIPU' (violeta) o 'Becado Institucional' (cian) — solo si tiene una beca activa
- Card informativa en Perfil.tsx con: nombre de la beca, fuente, % de descuento aplicado, período de vigencia, promedio mínimo requerido y promedio actual
- Si el alumno tiene más de una beca activa (posible en combinaciones institucional + externa), listar todas con su fuente respectiva
- En MisCuotas.tsx, el descuento aplicado a cada cuota indica de qué beca proviene, para trazabilidad total del alumno

**Endpoint que expone esta información:**

```
GET /becas/alumno/{id}/activas
# Devuelve lista (no un solo objeto, por si hay más de una beca vigente):
# [
#   {
#     'beca_nombre': 'Beca ITAIPU 2026',
#     'fuente': 'ITAIPU',
#     'es_externa': true,
#     'porcentaje_descuento': 100,
#     'periodo_inicio': '2026-01', 'periodo_fin': '2026-12',
#     'promedio_minimo_requerido': 3.0, 'promedio_actual': 3.8,
#     'estado_renovacion': 'vigente'
#   }
# ]
```

### 4.6 Vista de administración diferenciada

- Panel del comité: filtro obligatorio por fuente antes de listar postulaciones — evita mezclar flujos de aprobación distintos
- Al crear una beca en el catálogo, el formulario oculta el campo de % de descuento si la fuente tiene editable_porcentaje=False, mostrando el valor fijo del convenio como texto informativo
- Reporte exclusivo 'Rendición ITAIPU': exportable en Excel/CSV con alumno, cédula, carrera, monto becado, período — formato preparado para envío a la entidad externa
- Reporte separado de becas institucionales para uso interno de rectorado

### 4.7 Generación de cuotas y aplicación de descuento

- Job mensual/semestral genera cuotas pendientes para alumnos con inscripción activa
- El monto se calcula desde conceptos_arancel, aplicando automáticamente el descuento de la beca activa (si tiene más de una, se aplica la de mayor porcentaje, o se suman si la configuración de la carrera lo permite — a definir con administración)
- Generación manual desde el panel de administración para casos excepcionales

### 4.8 Lógica de bloqueo académico por deuda

- Umbral de mora configurable por carrera (ej. máximo 1 cuota vencida)
- Al inscribir, verificar cuotas 'vencida'; si supera el umbral, rechazar con HTTP 422 indicando monto adeudado y cuota más antigua
- Los alumnos becados al 100% (ITAIPU típicamente) no generan cuota con saldo — el sistema debe validar esto explícitamente antes de bloquear, para no bloquear por error a un becado total
- Administradores pueden forzar excepción de inscripción (override) con registro de auditoría

### 4.9 Endpoints nuevos — financiero y becas

```
POST /finanzas/conceptos                          # admin: crea concepto de arancel
POST /finanzas/cuotas/generar                      # admin: genera cuotas del período
GET /finanzas/alumno/{id}/cuotas                   # alumno propio / admin
POST /finanzas/pagos                                # admin: registra pago
GET /finanzas/pagos/{id}/comprobante                # alumno propio / admin
GET /finanzas/reportes/mora                         # admin: mora por carrera
GET /finanzas/alumno/{id}/estado-deuda              # interno — usado por flujo de inscripción
GET /becas/catalogo                                 # becas disponibles con fuente y requisitos
POST /becas/postulaciones                           # alumno: postula con documentos
PUT /becas/postulaciones/{id}/revisar               # comité: aprueba/rechaza
GET /becas/alumno/{id}/activas                      # alumno propio / admin — todas sus becas vigentes
GET /becas/reportes/renovaciones-en-riesgo          # admin: seguimiento del comité
GET /becas/reportes/rendicion?fuente=ITAIPU         # admin: exportable para entidad externa
```

### 4.10 Consideraciones de seguridad e integridad financiera

- Toda operación de pago se ejecuta en una transacción atómica (session.begin())
- Nunca se edita/elimina un pago registrado — correcciones vía pago de ajuste con referencia al original
- Montos siempre en guaraníes como Numeric(12,2), nunca float
- Las becas de fuente externa son de solo lectura para el % de descuento — verificado también en backend, no solo ocultado en frontend

### 4.11 Plan de tareas y estimación

| Tarea | Estimación |
|---|---|
| Modelos financieros, migraciones y transacciones de pago + tests | 4 días |
| Modelos de becas con fuentes diferenciadas + seed de fuentes_beca | 2 días |
| Job de generación automática de cuotas con aplicación de descuento por fuente | 2 días |
| Lógica de bloqueo por deuda integrada al flujo de inscripción | 2 días |
| Endpoints de conceptos, cuotas, pagos y reportes | 4 días |
| Endpoints de becas con reglas por fuente + reporte de rendición ITAIPU | 3 días |
| Frontend: MisCuotas.tsx + badge de beca en Perfil/Dashboard alumno | 4 días |
| Frontend: administración de pagos, catálogo de becas y panel del comité | 5 días |
| QA, pruebas de concurrencia en pagos y tests de integración | 3 días |

---

## FASE 4B — Facturación electrónica — integración guarani.app
**NUEVO — CUMPLIMIENTO NORMATIVO — 1.5-2 semanas**

Todo cobro de arancel, cuota o servicio debe emitir un comprobante legal ante la DNIT. Este módulo integra UCA V2 con guarani.app, proveedor especializado en facturación electrónica, sin reimplementar lógica fiscal dentro del sistema académico.

### 4B.1 Por qué un proveedor externo y no desarrollo propio

**Decisión técnica:** Facturación electrónica es un dominio regulatorio con cambios frecuentes de la DNIT — mantenerlo dentro de UCA V2 significa que cada cambio normativo requiere una actualización del sistema académico. Delegarlo en un especialista reduce superficie de riesgo y mantenimiento.

- guarani.app está desarrollado exclusivamente para facturación electrónica, con actualizaciones ante cambios de la DNIT sin costo adicional para el cliente
- Ofrece Factura Electrónica, Nota de Crédito, Nota de Débito y Remisión Electrónica
- Expone una API de integración documentada en docs.guarani.app, pensada para sistemas de terceros — exactamente el caso de uso de UCA V2
- El almacenamiento de comprobantes (5 GB por punto de emisión) corre por cuenta de guarani.app, sin consumir el bucket R2 propio del sistema académico

### 4B.2 Costos de referencia (tabla de precios 2026 del proveedor)

| Concepto | Precio | Detalle |
|---|---|---|
| Punto de emisión | 241.000 Gs. / mensual | Incluye 5 GB de almacenamiento (~250 mil facturas) |
| Punto de emisión adicional | 241.000 Gs. / mensual | Por cada punto adicional, incluye 5 GB adicionales |
| Puesta en marcha | Sin costo | No se cobra implementación |
| Ampliación de almacenamiento | 20.000 Gs. / GB / mensual | Adicional a los 5 GB incluidos |
| Asesoramiento técnico de integración | A presupuestar | Servicio opcional |

**Nota sobre condiciones comerciales:** Valores referenciados al salario mínimo vigente con reajuste anual automático • Pago mensual por débito automático (tarjeta) o pago anual por QR bancario • Un solo punto de emisión (241.000 Gs./mes) es suficiente para el volumen inicial de la UCA Caacupé — 250 mil facturas incluidas excede largamente la cantidad de cuotas mensuales emitidas

### 4B.3 Arquitectura de integración

UCA V2 nunca genera ni firma XML fiscal. El backend académico solo llama a la API de guarani.app al confirmar un pago, y guarda la referencia (CDC, número de comprobante, URL del PDF) en su propia base de datos.

```
┌─────────────────┐        ┌──────────────────┐        ┌─────────────┐
│  UCA V2 Backend  │ ──────▶│  API guarani.app │ ──────▶│    DNIT     │
│    (FastAPI)     │        │  (facturación e.) │        │ (validación)│
└─────────────────┘        └──────────────────┘        └─────────────┘
        │                           │
        │  guarda: cdc,             │  guarda: XML firmado,
        │  numero_comprobante,      │  timbrado, 5GB storage
        │  url_pdf                  │
        ▼
  tabla comprobantes (UCA V2)
```

### 4B.4 Modelo de datos — extensión de la tabla comprobantes (Fase 4)

```python
class Comprobante(Base):
    __tablename__ = 'comprobantes'
    id = Column(Integer, primary_key=True)
    pago_id = Column(Integer, ForeignKey('pagos.id'))
    tipo = Column(String(20))  # factura / nota_credito / nota_debito / remision
    numero_comprobante = Column(String(50))  # devuelto por guarani.app
    cdc = Column(String(50), nullable=True)  # Código de Control DNIT
    timbrado = Column(String(20), nullable=True)
    url_pdf = Column(String(500))  # URL del comprobante en guarani.app
    estado_emision = Column(String(20), default='pendiente')
    # pendiente / emitido / error / reintentando
    intentos = Column(Integer, default=0)
    ultimo_error = Column(Text, nullable=True)
    fecha_emision = Column(DateTime, nullable=True)
```

### 4B.5 Servicio de integración

**app/services/facturacion_electronica.py:**

```python
import httpx, os

GUARANI_API_BASE = 'https://api.guarani.app/v1'
GUARANI_API_KEY = os.getenv('GUARANI_APP_API_KEY')

async def emitir_factura(pago, alumno, concepto) -> dict:
    payload = {
        'tipo_documento': 'factura_electronica',
        'cliente': {
            'nombre': alumno.nombre,
            'documento': alumno.cedula,
            'email': alumno.email,
        },
        'items': [{
            'descripcion': concepto.nombre,
            'cantidad': 1,
            'precio_unitario': float(pago.monto_pagado),
        }],
        'referencia_externa': f'uca-pago-{pago.id}',
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f'{GUARANI_API_BASE}/facturas',
            json=payload,
            headers={'Authorization': f'Bearer {GUARANI_API_KEY}'}
        )
        resp.raise_for_status()
        return resp.json()  # { numero_comprobante, cdc, timbrado, url_pdf }
```

### 4B.6 Manejo de fallos — principio de degradación con gracia

**Regla no negociable:** Un fallo de la API de guarani.app NUNCA bloquea el pago académico del alumno. El pago se registra igual; el comprobante queda en estado 'pendiente' y se reintenta.

```python
# pagos_router.py — al registrar un pago
@router.post('/pagos')
async def registrar_pago(body: PagoCreate, ...):
    with db.begin():
        pago = Pago(**body.dict())
        db.add(pago)
        cuota.estado = 'pagada' if pago.monto_pagado >= cuota.saldo else 'parcial'
        db.flush()
        # Fuera de la transacción académica — la emisión fiscal es un paso aparte
        comprobante = Comprobante(pago_id=pago.id, tipo='factura',
                                   estado_emision='pendiente')
        db.add(comprobante)
        db.commit()

    try:
        resultado = await emitir_factura(pago, pago.alumno, pago.cuota.concepto)
        comprobante.numero_comprobante = resultado['numero_comprobante']
        comprobante.cdc = resultado['cdc']
        comprobante.url_pdf = resultado['url_pdf']
        comprobante.estado_emision = 'emitido'
    except Exception as e:
        comprobante.estado_emision = 'error'
        comprobante.ultimo_error = str(e)
        # se reintenta con el job de reintentos, el pago ya quedó registrado

    db.commit()
    return pago
```

**Job de reintentos (cada 10 minutos, hasta 5 intentos):**

```python
# jobs/reintento_facturacion.py
async def reintentar_comprobantes_pendientes(db):
    pendientes = db.query(Comprobante).filter(
        Comprobante.estado_emision.in_(['pendiente', 'error']),
        Comprobante.intentos < 5
    ).all()
    for c in pendientes:
        c.intentos += 1
        # ... reintentar emitir_factura() ...
```

### 4B.7 Endpoints nuevos

```
GET /finanzas/pagos/{id}/comprobante                     # devuelve estado + url_pdf si está emitido
POST /finanzas/pagos/{id}/comprobante/reintentar          # admin: fuerza reintento manual
GET /finanzas/comprobantes/pendientes                     # admin: monitoreo de comprobantes en error
```

### 4B.8 Frontend

- MisCuotas.tsx: botón 'Descargar comprobante' habilitado solo cuando estado_emision='emitido'; si está 'pendiente', mostrar 'Comprobante en proceso, disponible en breve'
- Panel de administración: sección 'Comprobantes pendientes' con lista de errores y botón de reintento manual
- Notificación por email (SMTP de Fase 0) al alumno cuando el comprobante queda disponible, si el pago se hizo presencialmente y el comprobante tardó en emitirse

### 4B.9 Variables de entorno a agregar

```
GUARANI_APP_API_KEY=<clave entregada por el proveedor>
GUARANI_APP_PUNTO_EMISION=1
GUARANI_APP_BASE_URL=https://api.guarani.app/v1
```

### 4B.10 Plan de tareas y estimación

| Tarea | Estimación |
|---|---|
| Alta de cuenta en guarani.app, punto de emisión y credenciales de API | 1 día (gestión, no desarrollo) |
| Revisión de la documentación de la API en docs.guarani.app y mapeo de payloads | 1 día |
| app/services/facturacion_electronica.py + extensión de tabla comprobantes | 2 días |
| Integración en el flujo de registro de pago con manejo de fallos | 2 días |
| Job de reintentos automáticos | 1 día |
| Endpoints de consulta y reintento manual | 1 día |
| Frontend: estado del comprobante en MisCuotas y panel de administración | 2 días |
| Pruebas con la API real en modo sandbox/pruebas del proveedor + QA | 2 días |

**Criterio de aceptación:** Un pago registrado en UCA V2 genera una factura electrónica válida y descargable desde MisCuotas dentro de la sesión del alumno, sin intervención manual

---

## FASE 5 — Solicitudes, graduación, pasantías, equivalencias
**LARGO PLAZO — 8-10 semanas**

Sin cambios de fondo respecto al plan aprobado — se resumen aquí manteniendo el detalle completo ya validado. La gestión de becas se trasladó a la Fase 4 en esta versión por su relación directa con el módulo financiero.

### 5A. Solicitudes y trámites formales — 1.5-2 semanas

| Tabla | Campos clave |
|---|---|
| tipos_tramite | id, nombre, descripcion, requiere_aprobacion, dias_estimados |
| solicitudes | id, alumno_id, tipo_tramite_id, estado, fecha_solicitud, fecha_resolucion, resuelto_por, storage_key_resultado |

```
GET /tramites/tipos                          # catálogo de trámites disponibles
POST /tramites/solicitudes                   # alumno: crea solicitud
GET /tramites/solicitudes/mias               # alumno: lista propias con estado
PUT /tramites/solicitudes/{id}/resolver      # admin: cambia estado, adjunta documento
GET /tramites/solicitudes/{id}/descargar     # descarga el documento final
```

- Constancia de alumno regular e historial oficial: generación automática reutilizando la plantilla PDF de Fase 3
- Carta de presentación y constancia de egreso: revisión manual, dependen de Fases 5C y 5D

### 5B. Proceso de graduación y tesis — 2.5-3 semanas

| Tabla | Campos clave |
|---|---|
| procesos_graduacion | id, alumno_id, fecha_inicio, estado, tutor_id |
| etapas_tesis | id, proceso_id, nombre_etapa, fecha_limite, estado, observaciones |
| verificacion_solvencia | id, proceso_id, solvencia_financiera, solvencia_biblioteca, fecha_verificacion |

Función verificar_condicion_egreso(alumno_id, db) consulta: 100% créditos de la malla aprobados (Fase 2), PPA mínimo institucional (Fase 3), cumplimiento de pasantía si la carrera lo exige (Fase 5C).

```
GET /graduacion/alumno/{id}/condicion                # verifica requisitos de egreso
POST /graduacion/procesos                             # alumno: inicia proceso (si cumple)
PUT /graduacion/procesos/{id}/tutor                   # admin: asigna director de tesis
PUT /graduacion/procesos/{id}/etapas/{eid}            # tutor/admin: actualiza etapa
GET /graduacion/procesos/{id}/solvencia               # admin: verifica solvencia
GET /graduacion/procesos/{id}/documentos-cones        # admin: genera paquete para CONES
```

### 5C. Pasantías y prácticas profesionales — 2-2.5 semanas

| Tabla | Campos clave |
|---|---|
| empresas_receptoras | id, nombre, rubro, contacto, telefono, email, convenio_activo |
| pasantias | id, alumno_id, empresa_id, tutor_academico_id, fecha_inicio, fecha_fin, horas_requeridas, horas_completadas, estado |
| informes_pasantia | id, pasantia_id, tipo, storage_key, fecha_entrega |

```
POST /pasantias/empresas               # admin: registra empresa receptora
POST /pasantias/solicitudes            # alumno: solicita pasantía
PUT /pasantias/{id}/aprobar            # admin: aprueba y asigna tutor académico
PUT /pasantias/{id}/horas              # tutor/admin: registra horas completadas
POST /pasantias/{id}/informes          # tutor/admin: sube informe de seguimiento
PUT /pasantias/{id}/finalizar          # admin: finaliza y genera certificado
```

El certificado de culminación se integra a verificar_condicion_egreso(): si la carrera exige pasantía, valida que exista una con estado 'finalizada'.

### 5D. Equivalencias y convalidaciones — 2 semanas

| Tabla | Campos clave |
|---|---|
| solicitudes_equivalencia | id, alumno_id, tipo, universidad_origen, estado |
| equivalencias_materia | id, solicitud_id, materia_origen_nombre, materia_destino_id, programa_analitico_storage_key, resolucion |
| examenes_suficiencia | id, alumno_id, materia_id, fecha, resultado |

```
POST /equivalencias/solicitudes                       # alumno: solicita con programas adjuntos
PUT /equivalencias/{id}/materias/{mid}/resolver        # jefe depto: aprueba/rechaza
POST /equivalencias/examenes-suficiencia               # admin: registra resultado
GET /equivalencias/alumno/{id}                         # estado de solicitudes del alumno
```

Al aprobar, crea automáticamente el registro en expediente_materias (Fase 3) con condición 'aprobada por equivalencia' y actualiza avance_alumno_pensum (Fase 2).

---

## 10. Cronograma consolidado y dependencias

| Fase | Semanas | Depende de | Puede paralelizarse con |
|---|---|---|---|
| Fase 0 — Deuda técnica crítica | 1 | — | — |
| Fase 1 — Quick wins + portal docente | 2 | Fase 0 (parcial) | Fase 0 |
| Fase 2 — Pensum y malla curricular | 3-4 | Fase 0 | — |
| Fase 3 — Expediente académico | 2-3 | Fase 2 | — |
| Fase 4 — Financiero + becas diferenciadas | 4-5 | Fase 0 | Fase 2 y 3 (backend independiente) |
| Fase 4B — Facturación electrónica | 1.5-2 | Fase 4 | — |
| Fase 5A — Solicitudes y trámites | 1.5-2 | Fase 3 | 5B, 5C, 5D |
| Fase 5B — Graduación y tesis | 2.5-3 | Fases 2, 3, 4 | 5C, 5D |
| Fase 5C — Pasantías | 2-2.5 | Fase 5B (recomendado) | 5A, 5D |
| Fase 5D — Equivalencias | 2 | Fase 2 | 5A, 5B, 5C |

### 10.1 Ruta crítica (equipo de 1-2 desarrolladores, secuencial)

| Semana | Actividad |
|---|---|
| 1 | Fase 0 — PostgreSQL, storage, SMTP, autenticación |
| 2-3 | Fase 1 — Quick wins + portal docente (Mis Cursos/Histórico/Agenda) |
| 4-7 | Fase 2 — Pensum y malla curricular |
| 8-10 | Fase 3 — Expediente académico consolidado |
| 11-15 | Fase 4 — Financiero + becas diferenciadas ITAIPU/institucional |
| 16-17 | Fase 4B — Facturación electrónica (guarani.app) |
| 18-19 | Fase 5A — Solicitudes y trámites |
| 20-22 | Fase 5B — Graduación y tesis |
| 23-25 | Fase 5C — Pasantías |
| 26-27 | Fase 5D — Equivalencias |

**Total: ≈ 27-28 semanas (secuencial estricto)**

Con dos desarrolladores dividiendo backend/frontend por fase, el total puede reducirse a 21-23 semanas

---

## 11. Plan de pruebas y control de calidad

Se extiende la práctica ya establecida (49 tests actuales) a cada módulo nuevo, incluyendo cobertura específica para becas diferenciadas y facturación electrónica.

| Módulo | Tests unitarios críticos | Tests de integración clave |
|---|---|---|
| Pensum y malla | Validación de correlatividades en todos los casos | Inscripción rechazada/aceptada por correlatividad |
| Expediente académico | Cálculo de PPA con distintos créditos | Recálculo tras cambio de nota; generación de PDF |
| Financiero | Cálculo de mora; aplicación de descuento por beca | Pago atómico; bloqueo por deuda; concurrencia |
| Becas diferenciadas | % no editable en fuentes externas; cálculo de renovación por fuente | Postulación → aprobación → aplicación de descuento con fuente correcta |
| Facturación electrónica | Manejo de fallo de API sin bloquear el pago | Emisión completa; reintento tras error simulado |
| Solicitudes | Transición de estados de una solicitud | Generación automática de constancia vía expediente |
| Graduación | Verificación de condición de egreso con distintos escenarios | Flujo completo hasta documentos CONES |
| Pasantías | Cálculo de horas completadas vs. requeridas | Certificado reflejado en verificación de egreso |
| Equivalencias | — | Aprobación reflejada en expediente y pensum |

### 11.1 Pruebas de regresión

- Suite completa (existente + nuevos) en cada pull request vía integración continua, antes de merge
- Ambiente de staging con copia anonimizada de datos reales para pruebas manuales de cada fase
- Smoke test post-despliegue: login, inscripción, carga de nota, y flujo principal del módulo desplegado

### 11.2 Validación funcional con usuarios reales

- Antes de activar el bloqueo de inscripción por correlatividad (Fase 2) o por deuda (Fase 4): validar con coordinación académica y administrativa
- Antes de activar facturación electrónica en producción: emitir comprobantes de prueba en el ambiente sandbox de guarani.app y validar el formato con administración/tesorería
- Antes de activar el reporte de rendición ITAIPU: validar el formato exacto exigido por la entidad con el área de becas de la institución

---

## 12. Riesgos técnicos y mitigación

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Migración a PostgreSQL introduce incompatibilidades no detectadas | Alto | Suite completa de tests contra PostgreSQL antes de cualquier despliegue; migrar primero en staging |
| Carga inicial de mallas curriculares con datos incorrectos bloquea inscripciones válidas | Alto | Validación conjunta con coordinación académica; período de 'solo advertencia' sin bloqueo las primeras 2 semanas |
| Errores en cálculo de cuotas o pagos generan reclamos de alumnos | Alto | Transacciones atómicas, tests de concurrencia, ajuste auditable sin edición directa de pagos |
| Falla de la API de guarani.app bloquea el registro de pagos | Alto | Principio de degradación con gracia (sección 4B.6): el pago se registra igual, el comprobante se reintenta aparte |
| Se aplica el % de descuento incorrecto a una beca externa (ITAIPU) por error manual | Alto | Campo editable_porcentaje bloqueado a nivel de backend, no solo de frontend, para fuentes externas |
| Job de renovación de becas mal configurado afecta a becados en masa | Medio | Ejecutar el job en modo 'dry-run' (solo reporte) durante la primera semana de la Fase 4 |
| Dependencia entre fases retrasa el cronograma si una se extiende | Medio | Backend de Fase 4 diseñado para avanzar en paralelo a Fases 2 y 3 (sección 10) |
| Pérdida de sesión masiva al desplegar el nuevo esquema de autenticación | Medio | Retrocompatibilidad con tokens del esquema anterior hasta su expiración natural |
| Storage mal configurado expone documentos sensibles (comprobantes, historiales) | Alto | URLs firmadas de expiración corta; bucket privado por defecto; revisión de permisos antes de cada despliegue |

### 12.1 Fuera de alcance de este plan

Los siguientes elementos corresponden a la línea de producto 'colegio' (documento separado) o a integraciones de largo plazo a evaluar una vez consolidada la base universitaria:

- Modo colegio como feature flag de tenant (portal de padres, boletines, disciplina, tareas del aula, matrícula por grado, ficha médica, actividades extracurriculares) — ver documento separado
- Integración con Bancard para cobro electrónico en línea (el módulo financiero de este plan queda preparado para incorporarla sin cambios estructurales)
- Reportes específicos para ANEAES
- Alertas de deserción mediante modelos de machine learning
- Aplicación móvil nativa

---

*Sistema Académico UCA V2 | Plan Universidad — Versión Actualizada | WebPy Studio | Julio 2026*