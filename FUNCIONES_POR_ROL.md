# Sistema Académico UCA V2 — Funciones por Rol

Explica qué es el sistema y qué puede hacer cada rol. Para arquitectura técnica y
estado del rediseño ver [DOCUMENTACION_REDISENO.md](DOCUMENTACION_REDISENO.md).

## Qué es

Plataforma de gestión académica para la Universidad Católica "Nuestra Señora de la
Asunción" — Unidad Pedagógica Caacupé. Tres roles con accesos distintos: **Alumno**,
**Profesor**, **Administrador**. Login de alumno/profesor en `/login`, login de
administrador separado en `/admin`.

---

## Alumno

Login: `/login`, pestaña Alumno.

| Página | Ruta | Qué hace |
|---|---|---|
| Dashboard | `/dashboard` | Resumen personal: promedio general, % asistencia, materias en curso, TPs pendientes, tabla de materias semestrales, timeline de eventos de hoy. |
| Cursos | `/programa` | Temario de cada materia: clases, bibliografía, progreso del programa. |
| Expediente | `/puntajes` | Sus propias calificaciones por materia (parciales, práctico, final), promedio ponderado, proyección semestral, detalle por materia. |
| Inscripción | `/inscripciones` | Inscribirse a materias disponibles: ve cupos y ocupación reales, créditos por materia, arma su selección y confirma la inscripción. |
| Asistencia | `/asistencia` | Su propio control de asistencia: % total, clases totales, inasistencias, alerta si está cerca del límite (80%), cumplimiento por materia, bitácora de sesiones. Botón para escanear QR. |
| Escanear QR | `/asistencia/scan` | Pantalla de cámara para escanear el QR que genera el profesor y registrar presencia; también lista sus materias con % de asistencia. |
| Biblioteca | `/biblioteca` | Explora y descarga apuntes subidos por alumnos/profesores; puede dar like y buscar por texto. |
| Calendario | `/calendario` | Ve eventos (parciales, finales, feriados, entregas, clases) del semestre; puede agendar sus propios recordatorios. |
| Boleta | `/boleta` | Boleta de calificaciones con promedio ponderado, créditos obtenidos, estatus académico; descarga PDF. |
| Foro | `/foro` | Preguntas y respuestas por materia (hilos y mensajes). |
| Ajustes/Perfil | `/perfil` | Edita su nombre, teléfono, contraseña, foto de perfil; ve sus propias stats (promedio, asistencia, créditos). |

**Exclusivo de alumno**: Inscripción (inscribirse), Boleta (descarga PDF), Escanear QR, vista "Cursos" = temario/programa.

---

## Profesor

Login: `/login`, pestaña Profesor.

| Página | Ruta | Qué hace |
|---|---|---|
| Dashboard | `/dashboard` | Resumen de su actividad: materias dictadas, promedio de clase, próxima clase, lista de cursos activos, agenda del día. |
| Cursos | `/miscursos` | Vista general de cursos asignados. |
| Mis Materias | `/mismaterias` | Cátedras propias agrupadas por carrera, con alumnos inscriptos y % de asistencia promedio real por materia. |
| Calificaciones | `/puntajes` | Carga y edita notas de sus alumnos por materia (parcial 1, parcial 2, práctico, final); exporta CSV/PDF; el sistema envía email al alumno cuando se carga una nota nueva. |
| Asistencia | `/asistencia` | Genera QR de asistencia por materia (panel en tiempo real con countdown), ve historial mensual, mapa de calor de asistencia, marca presente/ausente manualmente. |
| Estadísticas | `/estadisticas` | KPIs de sus cursos: promedio del grupo, distribución de notas, alertas de riesgo. |
| Calendario | `/calendario` | Ve y crea eventos (parciales, entregas, feriados); puede cargar el calendario del semestre en PDF (Gemini extrae los eventos automáticamente). |
| Biblioteca | `/biblioteca` | Igual que alumno: explorar, subir, descargar apuntes. |
| Foro | `/foro` | Participa en hilos de sus materias. |
| Ajustes/Perfil | `/perfil` | Perfil académico: cursos vigentes, líneas de investigación, publicaciones, foto de perfil, seguridad. |

**Exclusivo de profesor**: Mis Cursos, Mis Materias, generación de QR de asistencia.

---

## Administrador

Login: `/admin` (pantalla separada, estilo panel corporativo).

| Página | Ruta | Qué hace |
|---|---|---|
| Dashboard | `/dashboard` | Resumen global del sistema: usuarios activos, reportes pendientes, uptime, estado de microservicios, logs de seguridad recientes. |
| Usuarios & Roles | `/usuarios` | CRUD completo de usuarios: crear, editar, eliminar, asignar rol (alumno/profesor/admin), resetear contraseña (envía email). |
| Asignaciones | `/gestion-asignaciones` | Ve la estructura académica por carrera y reasigna el profesor de cualquier materia con un click. |
| Inscripciones | `/inscripciones` | Gestiona inscripciones de alumnos a materias (alta/baja) por materia. |
| Calificaciones | `/puntajes` | Consulta las notas de cualquier alumno en cualquier materia. |
| Reportes | `/reportes` | Reportes del sistema (resumen general, por carrera, becados). |
| Estadísticas | `/estadisticas` | KPIs institucionales: tasa de deserción, uso del sistema, rendimiento académico, retención histórica, alertas de deserción crítica. |
| Calendario | `/calendario` | Crea eventos globales o por carrera/materia; carga de PDF del calendario académico. |
| Foro | `/foro` | Modera/participa en hilos de cualquier materia. |
| Ajustes Globales | `/perfil` | Su propio perfil administrativo. |

**Exclusivo de admin**: Usuarios & Roles, Reportes, Asignaciones (reasignar profesor), gestión de inscripciones de terceros.

---

## Compartido por los tres roles

Dashboard, Calificaciones/Puntajes (con distinto alcance de datos según rol), Asistencia
(distinta vista), Calendario, Biblioteca, Foro, Perfil.

## Funciones transversales (Layout)

- **Notificaciones** (campanita): próximos eventos del calendario en tiempo real.
- **Aplicaciones** (grid de 9 puntos): acceso rápido a las páginas del menú del rol.
- **Centro de Ayuda**: contacto de soporte (WhatsApp, teléfono, email), accesible desde
  el sidebar y desde el botón "+" del dashboard del alumno.
- **Foto de perfil**: cualquier usuario puede subir su propia foto (PNG/JPG/WEBP,
  máx. 3MB) desde `/perfil`; se refleja en sidebar y topbar al instante.
- **Accent visual por rol**: alumno cyan, profesor violeta, admin azul.
