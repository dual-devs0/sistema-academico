import { api } from "./api";

/**
 * Servicio de Dashboard móvil.
 *
 * El backend NO tiene un endpoint agregado `/alumno/dashboard`, así que
 * este servicio compone los datos desde varios endpoints existentes:
 *
 * - GET /alumno/mi-perfil        → info del usuario logueado
 * - GET /alumno/mi-resumen       → cantidad de materias, promedio general,
 *                                  notas, asistencia por materia
 * - GET /eventos/?desde&hasta    → próximos eventos (parciales, entregas)
 * - GET /finanzas/alumno/{id}/cuotas → cuotas (para saldo pendiente / vencido)
 *
 * `fetchDashboard()` dispara los 4 en paralelo y devuelve un DTO plano
 * listo para la vista. Si alguno falla (ej. finanzas retorna 403 para un
 * alumno sin cuotas cargadas), el campo respectivo queda `null` — la
 * pantalla debe tolerar ausencias parciales.
 */

export interface UserInfo {
  id: number;
  username: string;
  role: string;
  nombre: string | null;
  email: string | null;
  carrera_id: number | null;
  carrera_nombre: string | null;
  semestre: number | null;
  es_becado: boolean;
  fuente_beca?: string | null;
  legajo?: string;
  foto_url: string | null;
}

export interface MateriaNota {
  materia_id: number;
  materia: string;
  promedio: number | null;
}

export interface MateriaAsistencia {
  materia_id: number;
  materia: string;
  porcentaje: number | null;
  total_clases: number;
  presentes: number;
}

export interface MiResumen {
  alumno: {
    id: number;
    nombre: string | null;
    username: string;
    email: string | null;
    es_becado: boolean | null;
  } | null;
  cantidad_materias: number;
  promedio_general: number | null;
  notas: MateriaNota[];
  asistencia: MateriaAsistencia[];
}

export interface StudentSummary {
  creditos_aprobados: number;
  creditos_pendientes: number;
  creditos_totales: number;
  promedio_general: number | null;
  asistencia_promedio: number | null;
  avance_porcentaje: number;
  estado_financiero: string;
  regularidad_activa: boolean;
  materias_cursando: number;
  carrera_nombre: string | null;
  semestre_actual: number | null;
}

export type TipoEvento =
  | "parcial"
  | "final"
  | "feriado"
  | "asueto"
  | "entrega"
  | "actividad";

export interface EventoOut {
  id: number;
  titulo: string;
  tipo: TipoEvento;
  fecha: string; // ISO YYYY-MM-DD
  fecha_fin: string | null;
  materia_id: number | null;
  carrera_id: number | null;
  descripcion: string | null;
  anio: number | null;
  semestre: number | null;
  archivo_pdf: string | null;
  creado_por: number | null;
}

export interface CuotaOut {
  id: number;
  alumno_id: number;
  concepto_id: number;
  periodo: string;
  monto: number | string;
  monto_descuento: number | string;
  monto_a_pagar: number | string;
  fecha_vencimiento: string;
  estado: string; // "pendiente" | "pagado" | "vencido" | "anulado" | ...
  beca_nombre: string | null;
  fuente_beca: string | null;
  es_beca_externa: boolean | null;
  pago_id: number | null;
}

// ---------------------------------------------------------------------------
// DTO agregado consumido por la pantalla
// ---------------------------------------------------------------------------

export interface DashboardData {
  user: UserInfo | null;
  resumen: MiResumen | null;
  summary: StudentSummary | null;
  proximoEvento: EventoOut | null;
  eventosCercanos: EventoOut[];
  cuentaSaldoPendiente: number;
  cuentaSaldoVencido: number;
  cuentaPagado: number;
  cuentaHayCuotas: boolean;
  regularidadActiva: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toNumber(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// Fetchers individuales — separados para permitir re-uso desde otras pantallas
// ---------------------------------------------------------------------------

export async function fetchPerfil(): Promise<UserInfo> {
  const { data } = await api.get<UserInfo>("/alumno/mi-perfil");
  return data;
}

export async function fetchResumen(): Promise<MiResumen> {
  const { data } = await api.get<MiResumen>("/alumno/mi-resumen");
  return data;
}

export async function fetchStudentSummary(): Promise<StudentSummary> {
  const { data } = await api.get<StudentSummary>("/alumno/summary");
  return data;
}

export async function fetchEventosProximos(dias = 30): Promise<EventoOut[]> {
  const hoy = new Date();
  const hasta = new Date(hoy);
  hasta.setDate(hasta.getDate() + dias);
  const { data } = await api.get<EventoOut[]>("/eventos/", {
    params: { desde: toISODate(hoy), hasta: toISODate(hasta) },
  });
  return data;
}

export async function fetchCuotas(alumnoId: number): Promise<CuotaOut[]> {
  const { data } = await api.get<CuotaOut[]>(`/finanzas/alumno/${alumnoId}/cuotas`);
  return data;
}

// ---------------------------------------------------------------------------
// Composición
// ---------------------------------------------------------------------------

export async function fetchDashboard(): Promise<DashboardData> {
  // El perfil es requerido (necesitamos user.id para /finanzas).
  const perfil = await fetchPerfil().catch(() => null);
  const alumnoId = perfil?.id ?? null;

  // Resto en paralelo. Cualquier fallo → null / vacío.
  const [resumen, summary, eventos, cuotas] = await Promise.all([
    fetchResumen().catch(() => null),
    fetchStudentSummary().catch(() => null),
    fetchEventosProximos(30).catch<EventoOut[]>(() => []),
    alumnoId
      ? fetchCuotas(alumnoId).catch<CuotaOut[]>(() => [])
      : Promise.resolve<CuotaOut[]>([]),
  ]);

  // Próximo evento = el de fecha más cercana entre los eventos "importantes"
  // (parciales, finales, entregas). Feriados y asuetos se muestran en el
  // calendario pero no como "próximo evento".
  const eventosRelevantes = eventos
    .filter((e) => e.tipo === "parcial" || e.tipo === "final" || e.tipo === "entrega")
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const proximoEvento = eventosRelevantes[0] ?? eventos[0] ?? null;

  // Cuenta: sumar por estado.
  let cuentaSaldoPendiente = 0;
  let cuentaSaldoVencido = 0;
  let cuentaPagado = 0;
  for (const c of cuotas) {
    const monto = toNumber(c.monto_a_pagar);
    if (c.estado === "pagado") cuentaPagado += monto;
    else if (c.estado === "vencido") cuentaSaldoVencido += monto;
    else if (c.estado === "pendiente") cuentaSaldoPendiente += monto;
  }

  // Regularidad activa: usamos el endpoint summary, o fallamos a true
  const regularidadActiva = summary ? summary.regularidad_activa : true;

  return {
    user: perfil,
    resumen,
    summary,
    proximoEvento,
    eventosCercanos: eventos,
    cuentaSaldoPendiente,
    cuentaSaldoVencido,
    cuentaPagado,
    cuentaHayCuotas: cuotas.length > 0,
    regularidadActiva,
  };
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const MESES_ES = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
];

export function formatDayMonth(iso: string): { day: string; month: string } {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  const date = new Date(y, (m || 1) - 1, d || 1);
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: MESES_ES[date.getMonth()] ?? "",
  };
}

export function daysUntil(iso: string): number {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  const target = new Date(y, (m || 1) - 1, d || 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function formatGuaranies(n: number): string {
  return `₲ ${Math.round(n).toLocaleString("es-PY")}`;
}

export function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}
