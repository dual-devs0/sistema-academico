# Changelog — UCA Móvil

Formato cronológico inverso (nuevo arriba).

---

## 2026-07-11 — Backend endpoint QR asistencia + sync móvil

### Backend
- `backend/app/routers/asistencias_router.py`:
  - Nuevo `POST /asistencias/qr/verificar`:
    body `{ qr_token: str }` → response
    `{ materia_nombre, fecha, hora_registro, presentes, ausentes }`.
  - Validaciones: JWT decode (SECRET_KEY / HS256), `kind ==
    "asistencia_qr"`, exp no vencido, oferta activa coincide con la del
    QR, alumno inscripto en esa oferta, sin registro previo para hoy.
  - Errores: 400 QR inválido/expirado, 403 no inscripto, 409 duplicado.
  - Helper exportado `create_qr_token(materia_id, oferta_id)` con TTL
    15 min — el profesor lo usará cuando exista su UI de emisión.
- `backend/app/schemas/asistencia_schema.py`: `QrVerifyRequest`,
  `QrVerifyResponse`.
- `backend/tests/test_asistencias_qr.py`: 6 tests (éxito, token
  inválido, expirado, kind incorrecto, no inscripto, duplicado).

### Móvil (alineación al contrato final)
- `services/asistenciaService.ts`:
  - Docstring reescrito (ya no marca "BACKEND TODO").
  - `verifyQrToken(qrToken)` ahora manda `{ qr_token }` (no `{ token }`).
  - `QrVerifyResponse` cambió a
    `{ materia_nombre, fecha, hora_registro, presentes, ausentes }`.
  - `errorCode` deriva `"expired"` cuando el detail del 400 contiene
    "expir" — el backend usa un solo 400 para ambos casos, distinguimos
    por texto.
- `app/scanner.tsx`: ConfirmedScreen usa `data.materia_nombre`,
  `data.hora_registro`, `data.presentes`, `data.ausentes`. Reemplazado
  slot AULA por "✓ Presente" (backend no devuelve aula).

### Estado
- `pytest tests/test_asistencias_qr.py` → **6/6 passed**.
- `pytest` completo backend → **221/221 passed**.
- `tsc --noEmit` móvil → limpio.
- Sin cambios en DB.

---

## 2026-07-11 — Cursos (pantalla 7)

### Añadido
- `app/cursos/_layout.tsx`: Stack con `animation: "slide_from_right"`.
- `app/cursos/index.tsx`: grid 2 columnas de materias con
  `FlashList numColumns={2}`. Reusa `fetchNotasCompleto()` de
  `notasService.ts` — evita fetch duplicado y hereda merge de
  notas + asistencia + semestres. Cada card tiene nombre en cian,
  % asistencia en JetBrains Mono coloreada por umbral,
  "N pts" derivado de suma ponderada. Selector carrera pill (informativa
  hoy — backend solo expone `carrera_id`) + chips semestre.
- `app/cursos/[id].tsx`: detalle de materia. Header back + título.
  DonutChart 160px de asistencia con threshold color + label
  "Regularidad OK / En riesgo / Crítica". Card de componentes con
  cada uno de los 4 pesos (25/25/20/30), nota y `ProgressBar` de
  `nota/5`. Card stats total/presentes/ausentes. Reusa la misma
  fuente de datos que la lista.

### Estado
- `tsc --noEmit` limpio.

---

## 2026-07-11 — Horario + Perfil + Cuenta + Examenes (pantallas 5, 6, 8, 9)

### Añadido — pantalla 5 (Horario)
- `services/calendarioService.ts`: consume `/eventos/mes/{año}/{mes}`,
  `/eventos/dia/{fecha}`, `/eventos/?desde&hasta`. Helpers
  `buildMonthGrid` (6×7 con overflow del mes previo/siguiente),
  `formatDiaLargo`, `formatDayMonthShort`, `isSameDay`, `parseIsoDate`.
- `app/(tabs)/horario.tsx`: calendario mensual manual sin librería
  externa (grid 7 col + 6 filas). Día actual con círculo cian sólido,
  día seleccionado con círculo glass borde cian, días con eventos con
  punto cian debajo, días fuera del mes con opacidad. Sección "día
  seleccionado" con cards `variant="leftAccent"` staggered
  (`FadeInDown.delay(i*50).duration(280)`). Scroll horizontal de
  "Próximos Eventos" con mini-cards (fecha + tipo + título).

### Añadido — pantalla 6 (Perfil, reemplaza stub)
- `hooks/useTheme.ts`: `ThemeProvider` + `useTheme` con persistencia en
  AsyncStorage (`uca.theme_preference`). Semántica `"system" | "dark" |
  "light"` con `effective` resolviendo contra `useColorScheme`.
- `hooks/useBiometry.ts`: capacidad + preferencia de biometría.
  `setEnabled(true)` requiere autenticar antes de guardar.
- `components/ui/SettingRow.tsx`: fila glass reusable con variantes
  `toggle` / `chevron` / `plain`.
- `app/(tabs)/perfil.tsx`: reemplaza el stub. Avatar 80px con borde
  cian, nombre + carrera + legajo mono pill + badge BECADO. Grid
  Promedio + Regularidad. Toggles Modo Oscuro (theme) + Biometría
  (biometry). Rows chevron Ayuda + Términos. Botón Cerrar Sesión rojo
  con `Alert` de confirmación.
- Root layout ahora wrapea `ThemeProvider` alrededor de `AuthProvider`.
- Deps: `@react-native-async-storage/async-storage` agregada.

### Añadido — pantalla 8 (Cuenta)
- `services/cuentaService.ts`: consume `/finanzas/alumno/{id}/cuotas`,
  compone `saldoPendiente / saldoVencido / pagado`, deriva transacciones
  desde cuotas (backend no expone historial), facturas desde
  `comprobante_estado` de cada cuota.
- `app/cuenta.tsx`: tabs pill Resumen/Facturas. Card saldo `variant="accent"`
  con monto grande JetBrains Mono cian + KPIs pagado/vencido + botón
  Pagar Ahora. Lista de cuotas con badge estado
  (PENDIENTE naranja / PAGADO verde / VENCIDO rojo). Historial reciente
  como rows dentro de un GlassCard con punto de color. Tab Facturas con
  cards por comprobante + botón Descargar PDF si `estado === "emitido"`.

### Añadido — pantalla 9 (Examenes)
- `services/examenesService.ts`: llama endpoints tentativos
  `/examenes/disponibles`, `/inscriptos`, `POST /examenes/inscripciones`.
  Todos tolerantes: si 404 devuelven arrays vacíos → UI muestra
  "Próximamente" en vez de error. Helpers `turnosDelAnio(anio)`,
  `currentTurnoKey()`, `daysUntil(iso)`.
- `app/examenes.tsx`: tabs Disponibles / Inscriptos. Disponibles con
  selector de turno pill + cards con badge HABILITADO, grid FECHA /
  HORA+AULA, cierre inscripción rojo si ≤3 días, botón Inscribirse.
  Inscriptos con chips filtro Todos / Confirmados / Pendientes /
  Finalizados y cards con borde izquierdo del color del estado (verde /
  naranja / cian) y nota JetBrains Mono cuando `estado==="finalizado"`.

### Backend TODO documentado
- `/examenes/disponibles`, `/examenes/inscriptos`, `POST
  /examenes/inscripciones`, `DELETE /examenes/inscripciones/{id}` — el
  módulo entero.
- `/alumno/mi-perfil.fuente_beca` para distinguir BECADO ITAIPU vs
  INSTITUCIONAL.
- `/finanzas/pagos/historial` o `fecha_pago` en cuotas — hoy derivamos
  transacciones desde `fecha_vencimiento`, impreciso.

### Fixes tsc
- `SettingRow.tsx`: agregado `return inner` (faltaba, tipo inferido a
  `void`).
- `app/(tabs)/_layout.tsx`: reemplazado import de
  `BottomTabBarProps` (mismatch de versión con expo-router) por tipo
  derivado de `React.ComponentProps<typeof Tabs>["tabBar"]`.

### Estado
- `tsc --noEmit` limpio.
- 4 pantallas completas + 3 hooks/componentes nuevos.

---

## 2026-07-11 — QR Scanner completo (pantalla 4)

### Añadido
- `services/asistenciaService.ts`: `verifyQrToken(token)` con mapeo de
  errores a códigos (`invalid` / `expired` / `duplicate` / `not_enrolled` /
  `network` / `unknown`). `fetchMateriasHoy()` compone
  `/alumno/mis-materias` + `/mi-asistencia` con estado (`ok` ≥75%,
  `riesgo` <75%).
- `app/scanner.tsx` completo:
  - `CameraView` de expo-camera + `useCameraPermissions` (SDK 57 API).
  - Splash de permisos con estados granted / can-ask / denied.
  - Marco de esquinas cian SVG (`Path` en las 4 esquinas, no rectángulo
    completo), 24px por lado, stroke 3.
  - Línea de scan animada top ↔ bottom, `Easing.inOut(quad)` @ 2100ms
    con `withRepeat(-1, true)`. `cancelAnimation` en cleanup.
  - Overlay oscuro con ventana clara sobre el frame.
  - `barcodeScannerSettings.barcodeTypes: ["qr"]`.
  - Cooldown de 800ms tras error para evitar re-disparo múltiple del
    mismo frame decodificado.
  - Lista de "Mis materias de hoy" debajo del marco con `DonutChart`
    38px + threshold color (SVG donut ya existente reutilizado).
  - Pantalla de confirmación `ConfirmedScreen` con:
    - `ZoomIn` del checkmark grande cian (glow shadow).
    - `FadeInDown` staggered (0 / 120 / 200 / 280 ms) para card materia,
      stats presentes/ausentes, botones.
    - Card `variant="accent"` con fecha / hora / aula + grid stats
      verdes/rojos.
    - Botones "Ver Reporte" (cian) y "Volver al Inicio" (glass).
  - Banner de error inline por 3s con `FadeIn` / `FadeOut`.

### Backend TODO
- `POST /asistencias/qr/verificar` — endpoint documentado en el docstring
  del service. Body `{ token }`, response `{ ok, materia, fecha, hora,
  aula, asistencia_id, presentes_hoy, ausentes_hoy }`. Códigos de error
  400 / 403 / 409 / 410. Hasta que exista, cualquier scan real fallará
  con 404 y el usuario verá "No se pudo verificar el QR".

### Estado
- `tsc --noEmit` limpio.

---

## 2026-07-11 — Notas (pantalla 3)

### Añadido
- `services/notasService.ts`: compone `/alumno/mis-materias` + `/mis-notas` +
  `/mi-asistencia` en `NotasCompleto { materias, semestresDisponibles,
  promedioAnual }`. Pesos oficiales del backend (`parcial1: 25%`,
  `parcial2: 25%`, `practico: 20%`, `final: 30%`). Helpers
  `filterBySemestre`, `computePromedioSemestre`.
- `app/(tabs)/notas.tsx`: pantalla completa con:
  - Chips horizontales de semestres disponibles (auto-selecciona el último).
  - FlashList de materias con nota grande JetBrains Mono coloreada por
    umbral (≥3.5 cian, ≥2.5 warning, <2.5 error), asistencia %
    coloreada por umbral (≥75% success, ≥50% warning, <50% error).
  - Expand/collapse con chevron rotado (`Easing.out(cubic)` @ 220ms) +
    `FadeInDown` del desglose (Parcial 1/2, TP, Final con pesos).
  - Footer `PromedioFooter` con promedio del semestre + promedio anual.
  - Loading (skeletons), error (con reintento), empty (mensaje por semestre).

### Estado
- `tsc --noEmit` limpio (fix a tipo `ListRenderItemInfo` importado desde
  `@shopify/flash-list`, no `react-native`).

---

## 2026-07-11 — Dashboard (pantalla 2) + docs iniciales

### Añadido
- `components/ui/ScreenHeader.tsx`: cabecera reutilizable con avatar +
  greeting + campana; soporta modo `showBack` para pantallas secundarias.
- `services/dashboardService.ts`: compone datos de 4 endpoints
  (`/alumno/mi-perfil`, `/alumno/mi-resumen`, `/eventos/`,
  `/finanzas/alumno/{id}/cuotas`) en un DTO plano `DashboardData`.
  Fetch tolerante — cada endpoint tiene fallback individual.
  Helpers: `formatDayMonth`, `daysUntil`, `formatGuaranies`, `greetingForNow`.
- `app/(tabs)/index.tsx`: Dashboard completo (KPIs 2×2, próximo evento,
  asistencia rápida, avance académico). Stagger fade-in de cards con
  `FadeInDown.delay(i*50).duration(320).springify().damping(18)`.
  Estados loading (skeletons), error (con reintento), vacío (fallbacks
  por card).
- `docs/PLAN_DESARROLLO_MOBILE.md`, `docs/CHANGELOG_MOBILE.md`.

### Estado
- `tsc --noEmit` limpio (0 errores).
- Backend: sin cambios en esta iteración.

---

## 2026-07-11 — Componentes UI base

### Añadido (`components/ui/`)
- `GlassCard.tsx`: variantes `default` / `accent` / `leftAccent`, BlurView
  expo-blur, press scale 1.02 con `Easing.out(quad)` @ 120/150ms.
- `CyanBadge.tsx`: 6 variantes (`filled`, `outline`, `dim`, `success`,
  `warning`, `error`). Soporta glyph + label uppercase.
- `StatCard.tsx`: KPI card con label caption + valor JetBrains Mono cian +
  trend con dirección y color. `adjustsFontSizeToFit` para números
  grandes.
- `ProgressBar.tsx`: barra con glow cian animada `Easing.out(cubic)` @
  550ms. Prop `animated=false` para skeleton flows.
- `DonutChart.tsx`: SVG donut con `strokeDashoffset` animado
  (`Easing.out(cubic)` @ 700ms), rotación -90°, umbrales verde/naranja/rojo,
  label mono centrada.
- `SkeletonLoader.tsx` + `SkeletonGroup.tsx`: pulso opacity 0.35↔0.7
  `Easing.inOut(quad)` @ 1100ms. Formas rect/circle/line, `cancelAnimation`
  en cleanup.

### Estado
- `tsc --noEmit` limpio.

---

## 2026-07-11 — Backend: soporte móvil en `/auth`

### Añadido en `../backend/app/routers/auth_router.py`
- `POST /auth/login` devuelve `refresh_token` en el body además de setear
  la cookie HttpOnly (compat total con web).
- `POST /auth/refresh` acepta `refresh_token` en body **o** cookie.
  Precedencia body > cookie. Firma: `body: RefreshRequest | None`.
- `POST /auth/refresh` rota y devuelve el nuevo `refresh_token` en body
  también (para clientes que no persisten cookies).

### Añadido en `../backend/app/schemas/users_schemas.py`
- `LoginResponse` (opcional, documenta contrato OpenAPI).
- `RefreshRequest`: `{ refresh_token: str | None = None }`.

### Añadido en `../backend/tests/test_refresh_tokens.py`
6 tests nuevos cubriendo body-flow y precedencia:
- `test_login_devuelve_refresh_token_en_body`
- `test_login_refresh_token_body_coincide_con_cookie`
- `test_refresh_acepta_token_por_body`
- `test_refresh_rechaza_body_invalido`
- `test_refresh_body_tiene_precedencia_sobre_cookie`
- `test_refresh_por_body_tambien_rota`

### Estado
- `pytest tests/test_refresh_tokens.py` → **18/18 passed** (12 viejos + 6 nuevos).
- `pytest` completo → **215/215 passed**.
- Sin migraciones Alembic (no tocó DB).
- Frontend web: sin cambios necesarios.

---

## 2026-07-11 — Spine de navegación + auth

### Scaffold Expo
- `npx create-expo-app . --template blank-typescript` → SDK 57.0.4.
- New Architecture activada (`app.json: newArchEnabled: true`).
- Reemplazo de `App.tsx` + `index.ts` por `expo-router/entry`.
- `app.json`: scheme `ucamovil`, plugins de expo-router / expo-font /
  expo-secure-store / expo-camera / expo-local-authentication /
  expo-splash-screen, permisos Android (CAMERA, USE_BIOMETRIC,
  USE_FINGERPRINT) e iOS (NSCameraUsageDescription, NSFaceIDUsageDescription),
  `experiments.typedRoutes: true`, `extra.apiBase`.
- `tsconfig.json`: paths `@/*`, incluye `nativewind-env.d.ts`.

### Config
- `metro.config.js` con `withNativeWind({ input: "./global.css" })`.
- `babel.config.js`: `babel-preset-expo` con `jsxImportSource: "nativewind"`,
  `nativewind/babel`, plugin `react-native-worklets/plugin` (último — reanimated v4).
- `tailwind.config.js`: preset `nativewind/preset`, tokens del design system
  como `theme.extend.colors` y `fontFamily`.
- `global.css`: directives tailwind.
- `constants/design.ts`: colors, radius, spacing, fontFamily, fontSize,
  glass, timing, shadow, tabBar. Fuente única de tokens.

### Dependencias instaladas
- `expo-router`, `expo-camera`, `expo-local-authentication`,
  `expo-secure-store`, `expo-font`, `expo-blur`, `expo-linking`,
  `expo-constants`, `expo-splash-screen`.
- `react-native-reanimated@4.5.0`, `react-native-worklets`,
  `react-native-safe-area-context`, `react-native-screens`,
  `react-native-gesture-handler`.
- `@expo-google-fonts/inter`, `@expo-google-fonts/jetbrains-mono`.
- `@shopify/flash-list`, `react-native-svg`.
- `nativewind@^4`, `tailwindcss@^3.4`, `react-native-css-interop`.
- `axios`.
- `@react-navigation/bottom-tabs` (para tipar `BottomTabBarProps` en tab bar custom).

### Auth core
- `services/api.ts`: axios instance con interceptor 401 single-flight,
  cola de waiters, retry, `onAuthFailed` desacoplado de React.
- `services/authService.ts`: `loginRequest`, `refreshRequest`, `logoutRequest`.
  Envía `refresh_token` en body.
- `hooks/useAuth.ts`: Context `{ status: 'loading'|'auth'|'anon', login,
  logout }`. Access en `useRef`, refresh en SecureStore
  (`uca.refresh_token`). Registra callbacks al montar via `configureApi()`.

### Root layout + guard
- `app/_layout.tsx`: fonts (Inter 400/500/600/700 + JetBrains Mono
  400/500/700), SplashScreen manual, `AuthProvider`, `AuthGate` con
  redirect basado en segments.
- `Stack.Screen` para `(auth)`, `(tabs)`, `scanner` (modal), `cuenta`,
  `examenes`, `cursos`.

### Login (pantalla 1)
- `app/(auth)/_layout.tsx` + `app/(auth)/login.tsx`.
- Fondo View oscuro (falta `assets/campus.jpg`), overlay,
  glass card con BlurView.
- Inputs con label uppercase, toggle mostrar/ocultar contraseña.
- Botón "Ingresar" con breathing glow (opacity 0.85 ↔ 1.0,
  `Easing.inOut(quad)` @ 1600ms, `withRepeat(-1, true)`).
- Fila de accesos rápidos (Biométrico / Olvidé mi clave / Doc. extranjero).
- Manejo de error inline (leerá `error.response.data.detail`).

### Tab bar custom
- `app/(tabs)/_layout.tsx`: 4 tabs reales (Inicio / Notas / Horario /
  Perfil) + botón QR central elevado.
- QR button: 64×64 círculo cian, `-12px marginBottom`, shadow glow,
  `router.push('/scanner')`.
- Stubs de screens (`index`, `notas`, `horario`, `perfil`, `scanner`)
  para que expo-router compile.

### Estado
- `tsc --noEmit` limpio.

---
