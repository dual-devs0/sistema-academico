# App Móvil UCA Caacupé — React Native + Expo

## Uso de Ultrathink

Usá Ultrathink **solo** para:
- Decisiones de arquitectura de navegación
- Diseño del sistema de auth móvil
- Cuando algo no funciona después de 2 intentos

Para implementación normal de componentes: respuesta directa sin Ultrathink.

## Stack
- React Native con Expo SDK 51+
- expo-router para navegación
- NativeWind v4 (Tailwind para RN)
- react-native-reanimated para animaciones
- expo-camera para QR scanner
- expo-local-authentication para biometría
- @shopify/flash-list para listas
- react-native-svg para gráficos/círculos

## Design System — OBLIGATORIO seguir exactamente

### Colores
```
background:        #0a0e17            // base más oscura
surface:           #111827            // cards y containers
surface-elevated:  #1a2235            // cards elevadas
border:            rgba(255,255,255,0.08)
border-accent:     #00b4d8            // cian UCA

// Acento alumno
cyan:              #00b4d8
cyan-dim:          rgba(0,180,216,0.15)
cyan-glow:         rgba(0,180,216,0.25)

// Semánticos
success:           #22c55e
warning:           #f59e0b
error:             #ef4444
text-primary:      #e5e2e2
text-secondary:    #9ca3af
text-accent:       #00b4d8
```

### Tipografía
- Headings y UI: **Inter** (`expo-google-fonts/inter`)
- Números y datos: **JetBrains Mono** (`expo-google-fonts/jetbrains-mono`)
- Notas, promedios, créditos: **siempre** JetBrains Mono

### Glassmorphism
```javascript
const glassCard = {
  backgroundColor: 'rgba(17,24,39,0.8)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)',
  borderRadius: 16,
  overflow: 'hidden',
  // BackdropBlur via @react-native-community/blur
}
const glassCardAccent = {
  ...glassCard,
  borderColor: 'rgba(0,180,216,0.3)',
}
```

## Estructura de navegación

```
app/
  (auth)/
    login.tsx              // pantalla de login
  (tabs)/
    _layout.tsx            // tab bar con QR central
    index.tsx              // Dashboard/Inicio
    notas.tsx              // Calificaciones
    horario.tsx            // Calendario
    perfil.tsx             // Perfil + ajustes
  scanner.tsx              // QR fullscreen (modal)
  cursos/
    index.tsx              // lista de materias
    [id].tsx               // detalle de materia
  cuenta.tsx               // Estado de cuenta
  examenes.tsx             // Exámenes disponibles/inscriptos
```

## Tab Bar
5 tabs: **Inicio / Notas / [QR central elevado] / Horario / Perfil**

Tab QR:
- Botón circular elevado, fondo cian `#00b4d8`
- Radio 32px, sube 12px sobre el tab bar
- Icono QR blanco adentro
- Abre scanner como modal fullscreen

## PANTALLA 1 — Login

Fondo: imagen de campus universitario nocturno (`require('../assets/campus.jpg')`).
Overlay: `rgba(10,14,23,0.75)`.

Contenido centrado:
- Logo UCA: cuadrado 56×56, border-radius 12, fondo surface, borde cian, texto "UCA" Inter 700
- "Portal Académico" headline-lg blanco
- "Universidad Católica" caption cyan

Card glassmorphism con:
- Label "DOCUMENTO" uppercase caption
- Input: Nro. de documento (`keyboardType="numeric"`)
- Label "CONTRASEÑA"
- Input: contraseña con toggle ojo
- Botón "Ingresar": fondo cian, radius 12, Inter 600, con glow animation (breathing 0.15 opacity)

Fila de accesos rápidos (3 iconos):
- Biométrico (huella), Olvidé mi clave, Doc. extranjero
- Texto caption debajo de cada icono

## PANTALLA 2 — Dashboard (`index.tsx`)

Header:
- Avatar circular 40px con borde cian izquierda
- "BIENVENIDO / ESTUDIANTE" caption secondary
- Nombre completo texto blanco
- Icono campana derecha

Saludo:
- "Buenas tardes, {nombre}" headline-lg, donde `{nombre}` va en cian
- "Ingeniería Informática · 4.º Semestre" caption

Grid 2×2 de accesos rápidos (cards glass):
- Estado de Cuenta (con estado "Al día" o monto)
- Exámenes (con "N inscriptos")

KPIs en grid 2×2:
- **PROMEDIO GRAL**: número grande JetBrains Mono cian + tendencia "+0.3 este sem." en verde
- **REGULARIDAD**: "● ACTIVA" en verde o estado actual

Próximo Evento (card glass con borde cian izquierdo):
- Badge fecha: fondo `cyan-dim`, día+mes grandes
- "PARCIAL 1 — EN 3 DÍAS" label caption rojo/naranja
- Nombre del evento headline bold
- Hora y aula caption con iconos

Asistencia Rápida (card glass):
- Texto izquierda + botón "Abrir Escáner" cian derecha

Avance Académico (card glass):
- "Avance Académico" + "20% (48/240 créditos)" derecha
- Barra de progreso cian con glow
- Labels "SEMESTRE 4" y "GRADUACIÓN"

## PANTALLA 3 — Notas (`notas.tsx`)

Header igual al dashboard.
Título "Mis Calificaciones".
Subtitle "Semestre Actual · Año 2024" + badge AÑO.

Selector de semestre: chips horizontales `1 SEM, 2 SEM, 3 SEM, 4 SEM`.
- Activo: fondo cian, texto oscuro
- Inactivo: glass border

Lista de materias (`FlashList`). Cada item:
- Nombre materia (Inter 600 blanco)
- "Asistencia: XX%" caption secondary
- Nota grande derecha (JetBrains Mono cian)
- Chevron para expandir detalle
- Separador sutil

Al expandir (`Animated.View`):
- 4 filas: Parcial 1 (25%), Parcial 2 (25%), TP (20%), Final (30%)
- Cada fila: label + peso + nota JetBrains Mono

Footer card:
- "PROMEDIO ANUAL / Calculado sobre N materias"
- Número grande JetBrains Mono cian

## PANTALLA 4 — QR Scanner (`scanner.tsx`)

Modal fullscreen, fondo negro puro. Cámara a pantalla completa vía `expo-camera`.

Overlay:
- Marco de esquinas cian (solo las 4 esquinas, `strokeWidth: 3`, largo 24px)
- Línea animada de scan (Animated, top→bottom, loop), color cian, opacity 0.7
- Texto "Posiciona el código QR dentro del marco" caption blanco abajo del marco

Debajo del marco:
- "Mis Materias de Hoy" bold + fecha derecha
- Lista de materias del día con:
  - Punto de color (verde = OK, rojo = riesgo)
  - Nombre + horario + aula
  - Círculo de asistencia % (SVG donut pequeño)

Al escanear exitosamente:
- Transición con reanimated (fade + scale)
- Pantalla de confirmación:
  - "¡Asistencia Confirmada!" headline-xl blanco
  - Subtexto sincronización
  - Card con materia + hora sincronizada
  - Stats: PRESENTES (número) / AUSENTES (número)
  - Botón "Volver al Inicio" ghost glass

## PANTALLA 5 — Horario/Calendario (`horario.tsx`)

Header con avatar + título "Calendario".

Calendario mensual (implementar sin librería externa, grid manual 7 columnas):
- Nombre mes + año + navegación `< >`
- Días de la semana: DOM LUN MAR MIE JUE VIE SAB
- Día actual: círculo cian
- Días con eventos: punto cian debajo del número
- Día seleccionado: círculo glass con borde cian

Sección día seleccionado:
- "Lunes, 8 de Julio" bold + badge "Hoy" cian
- Lista de eventos del día:
  - Card glass con borde izquierdo cian
  - Hora (JetBrains Mono) + título + ubicación

Próximos Eventos:
- "Próximos Eventos" + "Ver todos" cian derecha
- Scroll horizontal de cards pequeñas:
  - Ícono tipo evento + fecha + título

## PANTALLA 6 — Perfil (`perfil.tsx`)

Header: "Perfil" título.

Avatar circular 80px con borde cian 2px.
Nombre completo Inter 700 blanco.
Carrera Inter 400 cian.
"LEGAJO: XXXX-XXXX" JetBrains Mono label pill glass.
Badge "BECADO ITAIPU" pill con ícono candado cian (o "BECADO INSTITUCIONAL" según fuente).

Sección "RESUMEN ACADÉMICO":
- Grid 2 cards glass:
  - Promedio: número JetBrains Mono cian grande
  - Regularidad: "● Activa" verde o estado

Sección "AJUSTES DE LA APP":
- Row glass: ícono luna + "Modo Oscuro" + Toggle cian
- Row glass: ícono huella + "Biometría" + Toggle cian

Sección "CENTRO DE SOPORTE":
- Row glass: "Ayuda y Preguntas" + chevron
- Row glass: "Términos y Privacidad" + chevron

Botón "Cerrar Sesión":
- Fondo rojo oscuro `rgba(127,29,29,0.5)`
- Borde rojo `rgba(239,68,68,0.3)`
- Texto rojo claro + ícono logout

## PANTALLA 7 — Cursos (`cursos/index.tsx`)

Header con back arrow + "Cursos".
Selector de carrera: pill glass con nombre carrera.
"Visualizando: 4.º Semestre (Actual)" + selector sem.

Grid 2 columnas de materias (`FlashList`). Cada card glass:
- Nombre materia cian (Inter 600)
- Porcentaje asistencia grande JetBrains Mono blanco
- "XX puntos" caption secondary

Al tocar → navega a `cursos/[id].tsx` con detalle.

## PANTALLA 8 — Estado de Cuenta (`cuenta.tsx`)

Header: avatar + "UCA V2" + campana.
Título "Estado de Cuenta". Subtitle "Nombre · Carrera".

Tabs: **Resumen / Facturas** (glass pills).

Tab Resumen:
- Card glass con borde cian:
  - "SALDO PENDIENTE" label + monto JetBrains Mono grande
  - Grid: PAGADO / VENCIDO con montos
  - Botón "Pagar Ahora" glass border
- "CUOTAS DEL CICLO" section label
- Lista cuotas:
  - Número cuota + nombre + monto
  - Badge PENDIENTE (naranja) o PAGADO (verde)
- "HISTORIAL RECIENTE" section label
- Lista transacciones con punto + descripción + fecha

Tab Facturas: lista de comprobantes con estado.

## PANTALLA 9 — Exámenes (`examenes.tsx`)

Header con ícono + "Exámenes" + campana.

Tabs: **Disponibles / Inscriptos**.

Tab Disponibles:
- Filtro "Turno: Mayo 2024" + selector cuatrimestre
- Cards glass por examen:
  - Nombre materia Inter 600
  - Badge "HABILITADO" pill outline cian
  - Grid: FECHA / HORA+AULA en JetBrains Mono
  - "CIERRE DE INSCRIPCIÓN: En N días" rojo si urgente
  - Botón "Inscribirse" cian

Tab Inscriptos:
- Filtros: Todos / Confirmados / Pendientes (pills)
- Cards con borde izquierdo de color según estado:
  - Verde = CONFIRMADO + check icon
  - Naranja = PENDIENTE DE PAGO + warning
  - Cian = FINALIZADO + nota JetBrains Mono

## Servicios (reutilizar del backend existente)

Crear `src/services/` con:
- `authService.ts` — login, logout, refresh token
- `dashboardService.ts` — `GET /alumno/dashboard`
- `notasService.ts` — `GET /puntajes/`, expediente
- `asistenciaService.ts` — `GET /asistencias/`
- `calendarioService.ts` — `GET /eventos/`
- `cuentaService.ts` — `GET /finanzas/alumno/{id}/cuotas`
- `examenesService.ts` — `GET /pensum/alumno/{id}/avance`
- `qrService.ts` — `POST /asistencias/qr/verificar`

Base URL configurable vía `expo-constants` o `.env`.

## API Auth
- JWT access token en memoria
- Refresh token en SecureStore (`expo-secure-store`)
- Interceptor axios: ante 401 → refresh → retry

## Animaciones requeridas

- **Login**: breathing glow en botón Ingresar
- **Dashboard**: stagger fade-in de cards (0.05s delay)
- **Cards**: scale 1.02 en press (`react-native-reanimated`)
- **QR**: línea de scan animated loop
- **Scanner confirm**: fade + scale en transición
- **Tab bar**: spring animation en cambio de tab
- Skeleton loaders en lugar de spinners

## Estructura de carpetas

```
mobile/
├── app/
│   ├── (auth)/login.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── notas.tsx
│   │   ├── horario.tsx
│   │   └── perfil.tsx
│   ├── scanner.tsx
│   ├── cursos/
│   ├── cuenta.tsx
│   └── examenes.tsx
├── components/
│   ├── ui/
│   │   ├── GlassCard.tsx
│   │   ├── CyanBadge.tsx
│   │   ├── StatCard.tsx
│   │   ├── DonutChart.tsx
│   │   ├── ProgressBar.tsx
│   │   └── SkeletonLoader.tsx
│   └── screens/
├── services/
├── hooks/
│   ├── useAuth.ts
│   └── useTheme.ts
├── constants/
│   └── design.ts    // tokens del design system
├── assets/
└── app.json
```

## Configuración inicial requerida

```bash
npx create-expo-app mobile --template blank-typescript
cd mobile
npx expo install expo-router expo-camera \
  expo-local-authentication expo-secure-store \
  expo-font @expo-google-fonts/inter \
  @expo-google-fonts/jetbrains-mono \
  react-native-reanimated nativewind \
  @shopify/flash-list react-native-svg \
  @react-native-community/blur axios
```

## Criterio de aceptación

- [ ] Login funciona contra backend real (`POST /auth/login` con `username`+`password`)
- [ ] Dashboard carga datos reales del alumno
- [ ] QR scanner abre cámara y detecta QR
- [ ] Todas las pantallas respetan el design system (colores, tipografía, glassmorphism)
- [ ] Dark/light mode vía `useColorScheme`
- [ ] Sin errores TypeScript (`tsc --noEmit`)
- [ ] Funciona en Android (expo go) y iOS simulator

## Referencia de diseño

Sigue exactamente el sistema de Stitch UCA Academic V2:
- Base: `#0a0e17` (navy profundo)
- Glass: `rgba(17,24,39,0.8)` con blur
- Acento alumno: `#00b4d8` (cian)
- Datos numéricos: JetBrains Mono siempre
- Cards con borde izquierdo cian para eventos
- Badge BECADO con ícono y color por fuente

**Modo Plan primero** — antes de escribir código, mostrá la estructura completa de archivos y confirmá que el stack está disponible. Ultrathink en las decisiones de arquitectura de navegación y en el sistema de auth móvil.

## Skills activas en este proyecto

- `/full-output-enforcement`: **SIEMPRE activo**. Nunca truncar código con `...` o comentarios tipo `// resto del componente igual`
- `/caveman`: activo para prosa, no para código
- `/emil-design-eng`: al implementar cualquier animación (login glow, stagger, tab spring, QR scan line)
- `/animate`: al implementar QR scanner overlay y transiciones entre pantallas
- `/adapt`: al implementar safe areas, notch handling, diferencias Android/iOS
- `/polish`: al terminar cada pantalla antes de pasar a la siguiente
