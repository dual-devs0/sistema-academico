Análisis completo de la app móvil — UCA v2
Stack
- Expo SDK 57 + React Native 0.86 + React 19
- expo-router (file-based routing)
- NativeWind v4 + Tailwind v3 (global.css)
- Reanimated v4 + Gesture Handler (animaciones)
- Axios (HTTP), expo-secure-store (refresh token), expo-local-authentication (biometría)

Navegación / Routing
_layout.tsx (root)
  ├── (auth)/_layout.tsx
  │   └── login.tsx
  ├── (tabs)/_layout.tsx
  │   ├── index.tsx      → Dashboard
  │   ├── cursos.tsx     → Cursos / Notas
  │   ├── horario.tsx    → Calendario
  │   └── perfil.tsx     → Perfil
  ├── scanner.tsx        → QR Scanner (modal)
  ├── cuenta.tsx         → Estado de Cuenta
  ├── examenes.tsx       → Exámenes
  └── cursos/[id].tsx    → Detalle de Materia
      └── cursos/[id]/asistencia.tsx → Asistencia Detallada

Diagnóstico por pantalla
1. Login (app/(auth)/login.tsx) ✅ Funcional
- Login con documento + contraseña, registro, "olvidé mi contraseña"
- Biometría (Face ID / huella) con credenciales guardadas en SecureStore
- Documento extranjero (campos extra)
- Problemas:
- Endpoint de registro (handleRegister) solo muestra toast — no conectado al backend
- Recuperar contraseña llama a recuperarContrasenaRequest(fpDoc.trim()) pero nunca usa fpMatricula — la matrícula se pide pero no se envía
- loginSuccess overlay lindo pero no hay redirect explícito (lo maneja AuthGate)

2. Dashboard (app/(tabs)/index.tsx) ✅ Funcional
- KPIs: estado de cuenta, promedio, asistencia total, avance académico
- Próximo evento, barra de avance
- Pull-to-refresh, skeletons, fallback a datos dummy si falla el backend
- Problemas:
- CREDITOS_TOTALES = 240 hardcodeado — debería venir del backend
- Datos dummy siempre presentes como fallback, puede ocultar errores reales
- Sin paginación ni lazy loading

3. Cursos / Notas (app/(tabs)/cursos.tsx) ✅ Funcional
- Grid 2 columnas con donut charts de asistencia
- Toggle Asistencia/Calificaciones
- Bottom sheet selector de semestres con indicadores de estado
- Datos dummy como fallback
- Problemas:
- Endpoints pueden no existir — fallback a dummy silencioso
- CalificacionesView calcula promedio pero no discrimina por ponderación real correctamente
- Sin filtro por año

4. Detalle de Materia (app/cursos/[id].tsx) ✅ Funcional
- Donut grande de asistencia, stats (clases/presentes/ausentes)
- Evaluaciones ordenadas con puntaje máximo vs realizado
- Botón "Ver Asistencia Detallada"
- Datos dummy por materia ID
- Problemas:
- Las ruta asistencia.tsx está anidada bajo cursos/[id]/asistencia.tsx pero el link usa router.push({ pathname: "/cursos/[id]/asistencia"... }) — verificar que expo-router resuelva correctamente

5. Asistencia Detallada (app/cursos/[id]/asistencia.tsx) ✅ Funcional
- SectionList agrupada por mes, stats resumen
- Colores por estado (presente/ausente/justificado/feriado)
- Datos dummy por ID
- Problemas: Ninguno grave

6. QR Scanner (app/scanner.tsx) ✅ Funcional
- Cámara con overlay animado, línea de scan, esquinas cian
- Verificación contra backend (verifyQrToken)
- Pantalla de confirmación con stats
- Materias del día
- Problemas:
- fetchMateriasHoy() se llama al montar pero datos no se refrescan
- Sin timeout en la cámara (si no escanea, se queda infinitamente)

7. Horario / Calendario (app/(tabs)/horario.tsx) ✅ Funcional
- Grid calendario mensual manual con dots de eventos
- Navegación entre meses, selección de día
- Eventos del día, próximos eventos horizontal scroll
- Problemas:
- No expone turnos (mañana/tarde/noche) — muestra cuatrimestre que no es estándar UCA
- (evento as any).hora y (evento as any).ubicacion — type cast inseguro, el tipo EventoOut no los incluye

8. Perfil (app/(tabs)/perfil.tsx) ✅ Funcional
- Avatar, nombre, carrera, legajo, badge de beca
- Stats: promedio + regularidad
- Modo oscuro toggle, biometría toggle
- FAQ modal, Términos modal
- Logout con confirmación
- Problemas:
- formatLegajo(user.id) genera legajo del ID numérico — el backend no envía legajo real
- carreraLabel usa carrera_nombre que puede no venir del backend
- La beca siempre muestra "BECADO INSTITUCIONAL" aunque la fuente podría ser diferente
- Modo oscuro: solo permite "dark" o "system" — no hay modo claro completo

9. Estado de Cuenta (app/cuenta.tsx) ✅ Funcional
- Saldo grande, KPIs pagado/vencido, botón "Pagar Ahora"
- Lista de cuotas con badges de estado
- Historial de transacciones
- Pestaña Facturas con descarga PDF
- Problemas:
- "Pagar Ahora" tiene onPress={() => {}} — no implementado
- "Descargar PDF" tiene onPress={() => {}} — no implementado
- Datos dummy como fallback sin indicación al usuario

10. Exámenes (app/examenes.tsx) ⚠️ Parcial
- Tabs Disponibles/Inscriptos con filtros
- Selector de turno, cards de examen con cierre
- Inscripción con alert
- Problemas:
- Falla silenciosa — el código dice explícitamente: "Backend TODO: los endpoints no existen. Al fallar cualquier fetch, mostramos banner 'Próximamente'"
- No hay banner real de "Próximamente" — solo se ve si el fetch falla
- currentTurnoKey() y turnosDelAnio() pueden no coincidir con el backend

Resumen de estado general
Área	Estado	Observación
Login / Auth	✅ Funcional	Biometría OK, registro sin conectar
Dashboard	✅ Funcional	Créditos hardcodeados
Cursos / Notas	✅ Funcional	Dummy fallback silencioso
Detalle Materia	✅ Funcional	Bien implementado
Asistencia Detallada	✅ Funcional	Bien implementado
QR Scanner	✅ Funcional	Sin timeout
Calendario	✅ Funcional	Types inseguros
Perfil	✅ Funcional	Legajo generado artificialmente
Estado Cuenta	✅ Funcional	Pagar/Descargar PDF sin implementar
Exámenes	⚠️ Parcial	Endpoints no existen

Problemas generales / deuda técnica
1. Datos dummy como estrategia de fallback en todas las pantallas — el usuario nunca ve un error real, solo datos de relleno. Esto puede dar falsa sensación de funcionalidad.
2. Sin variables de entorno — IP del backend hardcodeada (192.168.100.14:8000)
3. Sin notificaciones reales — useNotifications.ts existe pero no hay backend de push
4. Sin paginación server-side — listados cargan todo de una vez
5. Sin modo claro — diseño solo dark mode (el useTheme solo permite dark/system)
6. Assets faltantes — campus.jpg no existe (login usa placeholder)
7. Tests limitados — solo 3 tests (login, dashboard, scanner) de 10 pantallas
8. TypeScript: 6 warnings de react-hooks/exhaustive-deps y varios as any casts

Recomendaciones prioritarias
1. Conectar endpoints reales de exámenes
2. Implementar botón "Pagar Ahora" y "Descargar PDF"
3. Eliminar datos dummy o al menos mostrar indicador visual cuando se usen
4. Mover IP a variable de entorno
5. Agregar timeout al QR scanner
6. Corregir recuperarContrasenaRequest para enviar también la matrícula