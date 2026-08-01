// Fuente unica de verdad para el breakpoint mobile del shell (sidebar/topbar de
// Layout.tsx) y el padding del "content shell" que reimplementan las paginas
// standalone (Programa, Reportes, Estadisticas). Antes cada archivo hardcodeaba
// estos mismos valores por separado.

export const MOBILE_BREAKPOINT = 768

export const SHELL_PADDING = {
  contentDesktop: '20px 24px',
  contentMobile: '14px',
  topbarMobile: '0 14px',
} as const
