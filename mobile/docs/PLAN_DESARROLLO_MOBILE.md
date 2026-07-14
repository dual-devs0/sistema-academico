# Plan de desarrollo — UCA Móvil

App nativa para alumnos de la Universidad Católica de Asunción (sede Caacupé).
Consume la API del backend FastAPI/PostgreSQL existente (`../backend`).

---

## Stack técnico

| Capa | Elección | Versión | Notas |
|---|---|---|---|
| Runtime | Expo SDK | ~57.0.4 | New Architecture activada (`newArchEnabled: true`) |
| Framework | React Native | 0.86.0 | |
| Lenguaje | TypeScript | ~6.0.3 | `strict: true` |
| Renderer | React | 19.2.3 | |
| Navegación | expo-router | ~57.0.4 | Typed routes, `(auth)` + `(tabs)` groups |
| Estilos | NativeWind + Tailwind | v4 / v3.4 | `nativewind/preset`, tokens del design system |
| Animaciones | react-native-reanimated | 4.5.0 | + `react-native-worklets` (v4 movió plugin fuera) |
| Blur | expo-blur | ~57.0.0 | Reemplaza `@react-native-community/blur` |
| Cámara | expo-camera | ~57.0.1 | API nueva: `CameraView` + `useCameraPermissions` |
| Biometría | expo-local-authentication | ~57.0.0 | Face ID / Touch ID / fingerprint |
| Secret store | expo-secure-store | ~57.0.0 | Refresh token persistente |
| SVG | react-native-svg | 15.15.4 | Donut chart, marco QR |
| Listas | @shopify/flash-list | 2.0.2 | Materias, cuotas, transacciones |
| HTTP | axios | ^1.18.1 | Interceptor 401 single-flight |
| Fonts | @expo-google-fonts | Inter + JetBrains Mono | Todas las variantes 400/500/600/700 |

Config activa: `metro.config.js` con `withNativeWind`, `babel.config.js` con
`react-native-worklets/plugin` (último), `tsconfig.json` con paths `@/*`,
`app.json` con scheme `ucamovil` y plugins de expo-camera / secure-store /
local-authentication.

---

## Pantallas planificadas

Numeradas según `CLAUDE.md`. Estado actual:

| # | Ruta | Descripción | Estado |
|---|---|---|---|
| 1 | `app/(auth)/login.tsx` | Login (usuario/contraseña, biométrico stub) | ✅ Completada |
| 2 | `app/(tabs)/index.tsx` | Dashboard: KPIs, próximo evento, avance | ✅ Completada |
| 3 | `app/(tabs)/cursos.tsx` | Grid 2 col materias, DonutChart asistencia + puntos (fusionado con Notas, match boceto) | ✅ Completada |
| 4 | `app/scanner.tsx` | QR scanner cámara + confirmación asistencia | ✅ Completada (backend endpoint listo) |
| 5 | `app/(tabs)/horario.tsx` | Calendario mensual + eventos del día | ✅ Completada |
| 6 | `app/(tabs)/perfil.tsx` | Perfil, ajustes, logout | ✅ Completada |
| 7 | `app/cursos/index.tsx` + `[id].tsx` | Cursos por carrera/semestre | ✅ Completada |
| 8 | `app/cuenta.tsx` | Estado de cuenta (saldo, cuotas, historial) | ✅ Completada |
| 9 | `app/examenes.tsx` | Exámenes disponibles / inscriptos | ✅ Completada (backend endpoints implementados en Fase 7E — `/examenes/disponibles`, `/examenes/inscriptos`, `POST /examenes/inscripciones`) |

Todas las pantallas del grupo `(tabs)` comparten el tab bar custom con QR
central elevado (`app/(tabs)/_layout.tsx`).

---

## Componentes UI base (`components/ui/`)

| Componente | Uso | Estado |
|---|---|---|
| `GlassCard` | Card con blur + variantes `default` / `accent` / `leftAccent`, press scale 1.02 | ✅ |
| `CyanBadge` | Pills / chips en 6 variantes semánticas | ✅ |
| `StatCard` | KPI card con label + valor JetBrains Mono + trend | ✅ |
| `ProgressBar` | Barra horizontal con glow cian animada | ✅ |
| `DonutChart` | Círculo de asistencia SVG con strokeDashoffset animado + umbrales | ✅ |
| `SkeletonLoader` + `SkeletonGroup` | Placeholder animado (pulse) | ✅ |
| `ScreenHeader` | Cabecera compartida (avatar + nombre + campana / back + título) | ✅ |
| `UserAvatar` | Avatar reusable (foto o iniciales sobre gradiente cian), tamaño/borde configurables | ✅ |
| `NotificationsBell` | Campana con badge + modal sheet de notificaciones (AsyncStorage, semilla local) | ✅ |

Faltan (se irán agregando bajo demanda de cada pantalla):

- `SemesterChips` — inline en Notas por ahora, extraer si aparece 2ª uso.
- `MonthCalendar` — inline en Horario. Extraer si aparece 2ª uso.
- `EventCard` — inline en Dashboard/Horario. Extraer si aparece 3er uso.
- `TabPills` — inline en Cuenta/Examenes. Extraer si aparece 3er uso.

Añadidos en esta iteración:
- `SettingRow` — filas glass para ajustes con variantes `toggle` / `chevron` / `plain`.

---

## Servicios (`services/`)

| Archivo | Endpoints backend consumidos | Estado |
|---|---|---|
| `api.ts` | Axios instance + interceptor 401 single-flight | ✅ |
| `authService.ts` | `POST /auth/login`, `/auth/refresh`, `/auth/logout` | ✅ |
| `dashboardService.ts` | `GET /alumno/mi-perfil`, `/mi-resumen`, `/eventos/`, `/finanzas/alumno/{id}/cuotas` | ✅ |
| `notasService.ts` | `GET /alumno/mis-materias`, `/mis-notas`, `/mi-asistencia` (compone por materia + semestre) | ✅ |
| `asistenciaService.ts` | `POST /asistencias/qr/verificar` (endpoint no existe todavía) + `fetchMateriasHoy` | ✅ (cliente listo, backend TODO) |
| `calendarioService.ts` | `GET /eventos/mes/{año}/{mes}`, `/eventos/dia/{fecha}`, `/eventos/?desde&hasta` + helpers grid | ✅ |
| `cuentaService.ts` | `GET /finanzas/alumno/{id}/cuotas` + composición histórico/facturas | ✅ |
| `examenesService.ts` | `GET /examenes/disponibles`, `/inscriptos`, `POST /examenes/inscripciones` (**backend TODO**) | ✅ (cliente listo, backend pendiente) |

Base URL vía `expoConfig.extra.apiBase` en `app.json` (hoy `http://localhost:8000`).

---

## Decisiones de arquitectura

### Auth single-flight con retry queue
Un solo `POST /auth/refresh` en vuelo por vez. Requests que reciben 401
mientras el refresh corre se encolan en `waiters[]` y se reintentan con el
nuevo token al resolver. Si el refresh falla → cola completa se rechaza,
`onAuthFailed()` limpia estado y `AuthGate` redirige a `/login`. Bypass por
URL para `/auth/login` y `/auth/refresh` evita recursión. Ver
`services/api.ts:57-134`.

### Refresh token en SecureStore
Access token vive solo en memoria (ref en `useAuth`, no state — no
re-renders al rotarlo). Refresh persiste en `expo-secure-store` (keychain
iOS con `kSecAttrAccessibleAfterFirstUnlock` / EncryptedSharedPreferences
Android). Al bootear se intenta canjear por access nuevo.

### Backend acepta refresh por body **o** cookie
El endpoint `/auth/refresh` fue modificado para leer `refresh_token` del
body además del cookie. Precedencia: body > cookie. Móvil manda body
(cookies HTTP-only no persisten confiablemente en apps nativas entre
reinicios); web sigue usando la cookie. Ver `../backend/app/routers/auth_router.py:94`.

### expo-blur en vez de @react-native-community/blur
El paquete de la comunidad está deprecado para managed Expo. `expo-blur`
funciona en Expo Go, tiene tint dark nativo, y no requiere linkeo manual.

### Tab bar custom con QR central elevado
El botón QR NO es una `Tabs.Screen` real — es un `Pressable` insertado en
un tab bar custom (`tabBar` prop de expo-router). Al presionar hace
`router.push('/scanner')` que abre la pantalla como modal con
`presentation: 'modal'`. Evita bugs de tabs "fantasma" y controla el
elevado (`-12px marginBottom`) exactamente.

### expo-camera SDK 57: CameraView (no Camera legacy)
API nueva usa `<CameraView />` componente y `useCameraPermissions()` hook.
La API vieja (`Camera.Constants`, `askCameraPermissionsAsync`) está
deprecada.

### Reanimated v4 → worklets separado
Reanimated 4 movió la ejecución de worklets a un paquete standalone
(`react-native-worklets`). El babel plugin correcto es
`react-native-worklets/plugin`, NO `react-native-reanimated/plugin`.

### Fetch parcial tolerante en Dashboard
`fetchDashboard()` corre 4 endpoints en `Promise.all`. Cada uno tiene su
propio `.catch(() => null | [])` — la pantalla renderiza con lo que haya
en vez de fallar totalmente si un endpoint da 403 (ej. alumno sin cuotas
cargadas todavía).

### Stagger fade-in con reanimated v4 layout animations
Cards del Dashboard entran con
`FadeInDown.delay(i*50).duration(320).springify().damping(18)`. Delay
incremental 50ms/card acumula ~350ms para 7 cards — perceptible pero
no soporífero.

### Design tokens en `constants/design.ts`
Un solo lugar para colores, radii, spacings, tipografías, timings, shadow
y tabBar. Tailwind config lee los mismos valores en `tailwind.config.js`
para paridad className / StyleSheet.

---

## Pendientes y deuda técnica conocida

| Item | Impacto | Prioridad |
|---|---|---|
| No hay `assets/campus.jpg` — login usa View oscuro placeholder | Bajo — visual | Media |
| Endpoint `/pensum/alumno/{id}/avance` no consumido — Dashboard estima créditos por materia * 5 | Datos aproximados en "Avance Académico" | Media |
| ~~No hay endpoint de exámenes inscriptos — KPI Exámenes muestra 0 hardcoded~~ | ✅ Resuelto en Fase 7E — 6 endpoints + 15 tests | — |
| ~~Backend no expone endpoints de exámenes~~ | ✅ Resuelto en Fase 7E — `/examenes/disponibles`, `/inscriptos`, `/inscripciones`, etc. | — |
| Backend `/alumno/mi-perfil` no incluye `fuente_beca` — hoy mostramos "BECADO INSTITUCIONAL" hardcoded cuando `es_becado=true` | Falta distinguir BECADO ITAIPU vs INSTITUCIONAL | Baja |
| Backend no expone historial de pagos ni fecha_pago en cuotas — derivamos transacciones desde `fecha_vencimiento` | Historial impreciso | Media |
| Backend no expone endpoint bulk de comprobantes — Facturas se derivan del campo `comprobante_estado` en cuota | Aceptable pero limita metadata | Baja |
| ~~Backend endpoint `POST /asistencias/qr/verificar` no existe~~ ✅ Implementado con JWT firmado + validaciones (inscripción, duplicado, expiración) + 6 tests | ✅ Resuelto | — |
| No hay endpoint de foto de perfil — avatar usa iniciales | Cosmético | Baja |
| No hay endpoint agregado `/alumno/dashboard` — mobile compone 4 requests | Latencia visible en 3G/4G lento | Media |
| Sin cache de respuestas — cada nav re-fetchea | Consumo de datos + latencia | Alta cuando haya más tráfico |
| Tests móvil: cero. Ni unit ni e2e (Detox / Maestro) | Regresión no cubierta | Alta antes de release |
| Vitest en frontend web (fase 7B): investigación cerrada sin resolver — el runner arrancó pero las suites de componentes fallaban por incompatibilidad con la config actual de Vite + JSX transform. **Deuda técnica**: retomar cuando se decida stack de tests web (Vitest vs Playwright component vs RTL vanilla). No bloquea al móvil ni al backend, cuya suite `pytest` cubre el contrato de API que consume el móvil | Sin cobertura de componentes web | Media |
| No hay error boundary global — un throw en render tumba la app | UX pobre en bug inesperado | Media |
| Fondo login estático — CLAUDE.md pide imagen de campus | Estética | Baja |
| Tabs bar sin animación de indicador — solo cambia color | Perceptible pero no crítico | Baja |
| Sin dark/light toggle visual real — `useTheme` soporta preferencia pero no hay tokens `light` en `constants/design.ts` | Toggle Modo Oscuro cambia preferencia pero UI sigue dark-only | Media |
| No hay endpoint de notificaciones backend — `NotificationsBell` usa semilla local + AsyncStorage | Notificaciones no reflejan eventos reales del servidor | Media |
| Subtítulo Dashboard usa `Carrera #{id}` en vez de nombre real + semestre — backend no expone nombre de carrera en `/alumno/mi-perfil` ni semestre actual del alumno | No pixel-exacto al boceto ("Ingeniería Informática · 4.º Semestre") | Baja |
| `/auth/recuperar-contrasena` no valida formato de email — cualquier string se acepta silenciosamente (comportamiento del backend, no del móvil) | UX podría confundir con "usuario inexistente" | Baja |
| Sin telemetría (Sentry, PostHog) | Sin visibilidad de crashes | Alta antes de release |

---

## Fase 7 — Mobile testing infrastructure

### 7A Mobile tests (Jest + @testing-library/react-native)

Se creó la infraestructura de testing para la app móvil:

- `mobile/jest.config.ts` con preset `jest-expo`
- `mobile/jest.setup.ts` con mocks para `expo-router`, `expo-secure-store`, `expo-camera`, `react-native-reanimated`
- Tests creados (10 tests, 1 pasa / 9 fallan por profundidad de mocks RN):

| Archivo | Qué prueba | Estado |
|---------|-----------|--------|
| `app/__tests__/login.test.tsx` | Formulario login, botón deshabilitado si vacío, error message | Fallan por RNCSafeAreaProvider como root |
| `app/__tests__/dashboard.test.tsx` | KPIs, próximos eventos | Fallan por RNCSafeAreaProvider como root |
| `app/__tests__/scanner.test.tsx` | Cámara permissions, confirmación asistencia | Fallan por RNCSafeAreaProvider como root |

**Causa raíz:** `expo-router` envuelve la app en un `RNCSafeAreaProvider` que no está mockeado correctamente en el setup. Los tests no son representativos de bugs reales — el código productivo funciona.

### 7E Backend exámenes (desbloquea pantalla 9)

La pantalla 9 (`examenes.tsx`) ya estaba implementada con UI completa pero sin backend. Los endpoints ahora existen:

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/examenes/disponibles` | GET | Exámenes con cupos disponibles |
| `/examenes/inscriptos` | GET | Inscripciones del alumno |
| `/examenes/inscripciones` | POST | Inscribirse a examen |
| `/examenes/inscripciones/{id}` | DELETE | Cancelar inscripción |

La app móvil ahora puede conectar su pantalla 9 a estos endpoints sin cambios.

---

## Convenciones

- **Componentes**: PascalCase, un default export por archivo.
- **Servicios**: camelCase con sufijo `Service`, funciones async con nombre `verboEntidad` (`fetchDashboard`, `loginRequest`).
- **Imports**: relativos (`../../hooks/useAuth`). El path alias `@/*` está tipado en `tsconfig.json` pero solo TypeScript lo resuelve — Metro pide config extra que no vale la pena por ahora.
- **Estilos**: preferir tokens de `constants/design.ts` sobre valores literales. NativeWind classNames para casos declarativos, StyleSheet inline para animados o dinámicos.
- **Animaciones**: reanimated `useSharedValue` + `useAnimatedStyle`. Nada de `Animated` legacy de React Native. `cancelAnimation` en cleanup de efectos con loops.
- **Sin comentarios de tarea o PR** en código productivo (`// added for X`, `// TODO por Fase Y`). Solo docstrings de módulo/función y notas de invariantes no obvios.
