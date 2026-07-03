# Sistema Académico UCA V2 — Documentación del Rediseño

Universidad Católica "Nuestra Señora de la Asunción" — Unidad Pedagógica Caacupé.
Stack: React 19 + TypeScript + Vite + Tailwind v4 (frontend) · FastAPI + SQLAlchemy + SQLite (backend).

## 1. Objetivo del trabajo

Rediseñar el frontend completo (excepto pantallas de login alumno/profesor/admin) según
capturas de referencia de un nuevo sistema de diseño ("UCA V2"), conservando toda la
lógica de negocio existente y conectando cada pantalla a datos reales del backend.
En paralelo, se mergeó un backend más avanzado (rama `develop`) con módulos nuevos, se
migró el modelo `Materia` con campos reales de oferta académica, y se cerraron brechas
de funcionalidad detectadas durante el proceso (notificaciones, ayuda, foro, carga de
PDF, cupos, asistencia de alumno, asignación de cátedras).

## 2. Sistema de diseño

Definido en `frontend/src/styles/design-tokens.css`, importado desde `index.css`.

- **Tipografía**: Inter (UI general) + JetBrains Mono (labels, badges, valores numéricos).
- **Accent dinámico por rol**, aplicado vía `document.body.setAttribute('data-role', rol)`
  en `Layout.tsx`:
  - `alumno` → cyan `#00b4d8`
  - `profesor` → violeta `#8b5cf6`
  - `admin` → azul `#2563eb`
- **Clases utilitarias reusables**: `.card`, `.card-elevated`, `.btn-primary`, `.btn-ghost`,
  `.badge`, `.input-uca`, `.table-uca`, `.pill-tab`, `.line-tabs`, `.progress-track/.progress-fill`,
  `.kpi-card`, `.mono-label`, `.avatar-initials`, `.fab`.
- Iconografía: Tabler Icons vía CDN (`<i className="ti ti-*">`), cargado en `index.html`.

## 3. Estructura de rutas y roles

`App.tsx` define `rolesPermitidos` por ruta y protege cada una con `RutaProtegida`
(lee el JWT de `sessionStorage`, redirige a `/dashboard` si el rol no matchea).

| Ruta | Alumno | Profesor | Admin |
|---|---|---|---|
| `/dashboard` | ✓ | ✓ | ✓ |
| `/puntajes` (Expediente / Calificaciones) | ✓ | ✓ | ✓ |
| `/asistencia` | ✓ | ✓ | ✓ |
| `/asistencia/scan` | ✓ | — | — |
| `/inscripciones` | ✓ (inscribirse) | — | ✓ (gestionar) |
| `/boleta` | ✓ | ✓ | ✓ |
| `/programa` | ✓ | ✓ | ✓ |
| `/biblioteca` | ✓ | ✓ | ✓ |
| `/calendario` | ✓ | ✓ | ✓ |
| `/foro` | ✓ | ✓ | ✓ |
| `/perfil` | ✓ | ✓ | ✓ |
| `/miscursos` | — | ✓ | — |
| `/mismaterias` | — | ✓ | — |
| `/estadisticas` | — | ✓ | ✓ |
| `/usuarios` | — | — | ✓ |
| `/reportes` | — | — | ✓ |
| `/gestion-asignaciones` | — | — | ✓ |

Login: `/login` (alumno/profesor, tabs), `/admin` (login administrativo separado). No
tocados en ningún momento del rediseño (excepción explícita del pedido original).

## 4. Componentes compartidos

- **`Layout.tsx`**: sidebar (216px desktop / drawer mobile), topbar, bottom-nav mobile
  (5 ítems por rol). Contiene:
  - Dropdown de **notificaciones**: trae próximos eventos reales (`GET /eventos/`),
    click navega a `/calendario`.
  - Dropdown de **aplicaciones** (grid de 9 puntos): quick-launcher con los ítems del
    menú del rol activo.
  - Modal de **Centro de Ayuda**: invocable desde cualquier componente vía
    `emitHelp()` (evento global `uca:help` definido en `lib/api.ts`, igual patrón que
    `emitToast()`). Usado por el botón del sidebar y por el FAB del Dashboard alumno.
- **`GlobalToast.tsx`**: toasts globales (`emitToast(msg, tipo)`).
- **`QRModal.tsx`**: modal de generación de QR de asistencia (profesor), con countdown.
- **`StatCard` / `RoleBadge` / `StatusBadge`**: piezas de UI reutilizadas en dashboards
  y tablas de estado académico.
- **`hooks/useRole.ts`**: helpers `getRole()`, `getUserId()`, `getUsername()` a partir
  del JWT decodificado.

## 5. Páginas — estado y fuente de datos

| Página | Rediseño | Datos |
|---|---|---|
| Dashboard (3 variantes por rol) | Completo | Reales: materias, puntajes, asistencia, eventos, usuarios (admin) |
| Puntajes/Expediente (alumno) / Gestión de Calificaciones (profesor) / vista admin | Completo | Reales, edición en vivo (PUT/POST puntajes) |
| Asistencia — alumno | Rediseño total (esta sesión) | Reales: `/alumno/mi-asistencia`, `/asistencias/?user_id=`, `/users/me`, `/carreras/` |
| Asistencia — profesor | Completo | QR embebido en tiempo real, heatmap, historial mensual |
| Asistencia — admin | Completo | Resumen global por materia |
| AsistenciaScan (alumno, escaneo QR) | Completo | Visor con `BarcodeDetector`, `/alumno/mi-asistencia` para "Mis Materias" |
| Inscripciones — alumno / admin | Completo | Cupos y ocupación reales (`inscritos` contado en backend) |
| Perfil (alumno/admin) / Perfil Profesor | Completo | `/users/me`, `/puntajes`, `/asistencias`, `/materias` |
| Usuarios (admin) | Completo | CRUD real sobre `/users/` |
| Materias / Oferta Académica | **Reemplazada** por `GestionAsignaciones` (admin) + `MisMaterias` (profesor) — ver §6 |
| Calendario | Completo + carga de PDF funcional (esta sesión) | `/eventos/`, `/eventos/cargar-pdf` |
| Biblioteca | Completo | `/apuntes/` con like/descarga/búsqueda |
| Boleta | Completo | `/alumno/mi-resumen`, descarga real de `/boleta/{id}` |
| Estadísticas (profesor/admin) | Completo | KPIs institucionales + alertas de deserción calculadas de datos reales |
| Foro | **Nueva** (esta sesión) | `/foro/hilos`, `/foro/hilos/{id}/mensajes` |
| MisCursos / Programa | Retematizados (paleta nueva), sin rediseño estructural profundo | Reales |

## 6. Cambio de arquitectura: Materias → Gestión de Asignaciones / Mis Materias

Durante el proceso, `Materias.tsx` (CRUD de oferta académica) fue reemplazado por dos
páginas nuevas orientadas a flujo de asignación docente:

- **`GestionAsignaciones.tsx`** (admin, ruta `/gestion-asignaciones`): estructura
  académica agrupada por carrera, selección de una materia, y reasignación de profesor
  con un click (`PATCH /materias/{id}`). Stats reales: materias sin profesor, carga
  promedio, total de profesores.
- **`MisMaterias.tsx`** (profesor, ruta `/mismaterias`): cátedras del profesor logueado
  agrupadas por carrera, con alumnos inscriptos y % de asistencia promedio real por
  materia (`/asistencias/materia/{id}/alumnos`).

Ambas páginas fueron migradas de mockup (arrays hardcodeados) a datos reales en esta
sesión, incluyendo:
- Backend: `PATCH /materias/{id}` nuevo (antes solo existía POST/GET), schema
  `MateriaUpdate`, campo `inscritos` calculado en `_enrich()`.
- Verificado end-to-end: reasignar profesor en `GestionAsignaciones` persiste y se
  refleja en `MisMaterias` del profesor correspondiente.

## 7. Backend — módulos incorporados

Merge de la rama `develop` (módulos 4.2 a 4.6) sobre el backend en uso, preservando los
endpoints propios que develop no tenía (asistencia `/profesor/*`, `PorcentajeGlobalOut`):

- **4.2 Asistencia**: carga en lote, alumnos con % de asistencia por materia, snapshot
  de becado.
- **4.3 Puntajes**: promedio final ponderado (parcial1 25% / parcial2 25% / práctico 20%
  / final 30%), exportación por materia, bugfix en comparación de tipos.
- **4.4 Vista Alumno** (`alumno_router.py`, nuevo): `mi-perfil`, `mis-materias`,
  `mis-notas`, `mi-asistencia`, `mi-resumen`.
- **4.5 Biblioteca avanzada**: likes, descargas, visibilidad, tipo de contenido,
  búsqueda por texto.
- **4.6 Temario con bibliografía** (campo JSON).
- **4.7 Calendario académico**: tipos de evento, eventos globales/por materia, carga
  automática vía PDF → Gemini → JSON de eventos (`POST /eventos/cargar-pdf`).
- **Foro** (v2, por materia): hilos y mensajes.
- Migraciones Alembic correspondientes + fixes de tests + downgrade de `bcrypt` a 4.0.1
  por compatibilidad con `passlib`.

### Modelo `Materia` — campos nuevos
`creditos`, `cupos`, `horario`, `secciones` + migración runtime idempotente en
`main.py` (`ALTER TABLE` solo si la columna no existe, seguro para SQLite en caliente).

## 8. Trabajo de esta sesión (resumen de commits)

1. `2e08c65` — merge backend develop + campos Materia.
2. `e7097d1` — Calendario, Biblioteca, Boleta, Estadísticas, Scan según capturas.
3. `751e898` — notificaciones/apps/ayuda funcionales, rediseño Asistencia alumno, Foro,
   carga PDF, cupos reales.
4. *(pendiente de commit al cierre de esta tarea)* — Gestión de Asignaciones y Mis
   Materias conectadas a datos reales.

## 9. Qué falta — necesario vs. futuro

### Necesario para producción real
- **GEMINI_API_KEY** en `backend/.env` — sin esto, `POST /eventos/cargar-pdf` falla
  (mensaje controlado en frontend, no rompe la app). Conseguir clave gratuita en
  https://aistudio.google.com/apikey e instalar `pip install google-generativeai`.
- **Constraint `profesor_id` NOT NULL en `Materia`**: impide modelar "materia sin
  profesor asignado" de forma nativa. `GestionAsignaciones` resuelve esto como
  *reasignación* en vez de *asignación inicial* — toda materia nace con profesor.
  Si se requiere el flujo real de "materia vacante", hace falta migración para volver
  nullable esa columna + ajustar `MateriaCreate`.
- **Storage de archivos** para foto de perfil real (hoy: avatar = iniciales). Requiere
  decidir backend de almacenamiento (S3, disco local servido por FastAPI, etc.) antes
  de implementar el upload.
- **SMTP** para notificaciones por email al cargar/modificar notas (módulo 4.8,
  backend no implementado). Requiere `SMTP_HOST/USER/PASS` en `.env`.

### Recomendado a futuro (no bloqueante)
- Rediseño estructural profundo de `MisCursos.tsx` y `Programa.tsx` (hoy solo
  retematizados con la paleta nueva, funcionalmente correctos).
- UI para Foro: hoy es funcional pero mínima (sin edición/fijado/cierre de hilos desde
  el frontend, aunque el backend ya soporta `PUT`/`DELETE`).
- Gráfico de distribución de notas y promedio de grupo por materia (endpoint
  `GET /puntajes/materia/{id}/estadisticas` ya existe en backend, sin consumir en
  frontend todavía).
- Asistencia QR v2 mencionaba "escaneo por foro"; foro y QR ya están, integración
  cruzada (ej. notificar en foro cuando se abre asistencia) no implementada.
- Paginación real en `Usuarios.tsx` más allá de la carga completa de `/users/`
  (aceptable a la escala actual de datos de demo).
- Tests automatizados de frontend (hoy solo se verifica con `tsc` + `vite build` +
  smoke manual en preview).

## 10. Cómo levantar el proyecto

```
# Backend
cd backend
./venv/Scripts/python.exe -m uvicorn app.main:app --port 8000

# Frontend
cd frontend
npm run dev   # proxy /api -> http://127.0.0.1:8000
```

Usuarios demo: alumno `12345678` / `Alumno1234!`, profesor `prof@uca.edu.py` /
`Profesor1234!`, admin `admin@uca.edu.py` / `Admin1234!` (login en `/admin`).
