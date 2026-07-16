/**
 * Design System — UCA Móvil
 * Tokens sincronizados con tailwind.config.js.
 * Consumir SIEMPRE desde aquí en componentes (colores literales fuera de Tailwind).
 */

export const colors = {
  background: "#0a0e17",
  surface: "#111827",
  surfaceElevated: "#1a2235",
  border: "rgba(255,255,255,0.08)",
  borderAccent: "#00b4d8",

  cyan: "#00b4d8",
  cyanDim: "rgba(0,180,216,0.15)",
  cyanGlow: "rgba(0,180,216,0.25)",

  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",

  textPrimary: "#e5e2e2",
  textSecondary: "#9ca3af",
  textAccent: "#00b4d8",

  logoutBg: "rgba(127,29,29,0.6)",
  logoutBorder: "rgba(239,68,68,0.4)",

  overlayLogin: "rgba(10,14,23,0.75)",
  glassBg: "rgba(17,24,39,0.8)",
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  glass: 16,
  pill: 999,
  qrButton: 32,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
} as const;

export const fontFamily = {
  inter: "Inter_400Regular",
  interMedium: "Inter_500Medium",
  interSemibold: "Inter_600SemiBold",
  interBold: "Inter_700Bold",
  mono: "JetBrainsMono_400Regular",
  monoMedium: "JetBrainsMono_500Medium",
  monoBold: "JetBrainsMono_700Bold",
} as const;

export const fontSize = {
  caption: 11,
  label: 12,
  body: 14,
  bodyLg: 16,
  headline: 18,
  headlineLg: 24,
  headlineXl: 32,
  numeric: 40,
  numericLg: 48,
} as const;

export const glass = {
  card: {
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.glass,
    overflow: "hidden" as const,
  },
  cardAccent: {
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: "rgba(0,180,216,0.3)",
    borderRadius: radius.glass,
    overflow: "hidden" as const,
  },
  blurIntensity: 30,
  blurTint: "dark" as const,
} as const;

export const timing = {
  fast: 150,
  base: 250,
  slow: 400,
  breathe: 1600,
  staggerStep: 50,
} as const;

export const shadow = {
  glow: {
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

export const tabBar = {
  height: 60,
  barBg: "#0f172a",
  active: "#06b6d4",
  inactive: "#6b7280",
  qrButtonSize: 56,
} as const;

export type ColorToken = keyof typeof colors;
export type FontSizeToken = keyof typeof fontSize;
