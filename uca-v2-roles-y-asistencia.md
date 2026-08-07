# UCA V2 — Roles, autenticación y configuración de asistencia

Documento de referencia para entender cómo se conectan los roles del sistema, cómo fluye la información, y cómo configurar un curso puntual (ejemplo: Informática — 3° año, 6° semestre) para que funcione la asistencia por QR.

---

## 1. Arquitectura general

- **Stack**: FastAPI (backend) + React/TypeScript (web) + PostgreSQL en Neon (base de datos)
- **App móvil**: React Native + Expo
- **Almacenamiento de archivos**: Cloudflare R2
- **Envío de correos**: Gmail SMTP
- **Autenticación**: JWT en cookie httpOnly

**Flujo de alto nivel:**

![Arquitectura general del sistema](diagramas/01-arquitectura-general.svg)

---

## 2. Cómo se conecta y valida el rol

![Flujo de autenticación y asignación de rol](diagramas/02-flujo-autenticacion-rol.svg)

1. **Login**: el usuario (alumno, profesor o admin) ingresa sus credenciales.
2. **Backend valida**: verifica usuario y contraseña contra la base.
3. **Emite JWT**: el token incluye el rol del usuario, se guarda como cookie httpOnly.
4. **Frontend enruta**: según el rol recibido, muestra la vista correspondiente (panel alumno / profesor / admin).

**Puntos clave:**

- El JWT viaja en cada request posterior (cookie httpOnly).
- Cada endpoint del backend **revalida el rol en el servidor** — no confía en lo que decide mostrar el frontend. Es decir, ocultar un botón en la UI no es lo mismo que bloquear el acceso al dato; el bloqueo real pasa por el backend.

---

## 3. Qué ve y gestiona cada rol

![Módulos accesibles por rol](diagramas/03-modulos-por-rol.svg)

| Rol | Módulos habilitados |
|---|---|
| **Alumno** | Boleta, Asistencia (escaneo QR), Materias y calendario |
| **Profesor** | Asistencia (generación QR), Calificaciones, Reportes de curso |
| **Admin** | Usuarios, Reportes globales, Configuración |

Cada rol tiene credenciales propias (usuario/contraseña independientes) y solo accede a los endpoints habilitados para ese rol.

---

## 4. Configuración de un curso puntual (ejemplo: Informática — 3° año, 6° semestre)

Caso: 7–8 alumnos cursando 5 materias.

![Configuración del curso](diagramas/04-setup-curso.svg)

Pasos que haría el admin:

1. **Crear las 5 materias** correspondientes a ese semestre.
2. **Cargar los profesores** (usuario con rol profesor) — uno asignado a cada materia, cada uno con sus propias credenciales.
3. **Cargar los 7–8 alumnos** (usuario con rol alumno), matriculados en el curso — quedan automáticamente inscriptos en las 5 materias.
4. **Configurar el horario de cada materia**: día, hora de inicio/fin y aula.
   - Este paso es crítico: si una materia no tiene horario cargado, el sistema no tiene con qué comparar cuando un alumno intenta escanear el QR de asistencia. No es un paso opcional.

---

## 5. Flujo diario de asistencia (QR)

![Flujo diario de asistencia](diagramas/05-flujo-asistencia.svg)

**Notas:**

- La validación del backend chequea dos cosas: que el alumno esté matriculado en esa materia, y que el escaneo ocurra dentro del horario configurado. Si falla cualquiera de las dos, el registro se rechaza — sin importar lo que muestre la interfaz.
- Con 7–8 alumnos y 5 materias es un volumen chico, por lo que no debería presentar los problemas de rendimiento que sí aparecen en el dashboard admin con cursos de 4000+ alumnos.

---

## 6. Pendiente / a definir

- Confirmar que el módulo de Calendario ya soporta cargar horario por materia (día, hora, aula) para este caso de uso puntual.
- Definir el flujo concreto de pantallas/endpoints en el panel admin para cargar Usuarios → Materias → Calendario en orden.
