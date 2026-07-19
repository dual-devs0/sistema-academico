import { api } from "./api";

/**
 * Servicio del Calendario móvil.
 *
 * Consume:
 * - GET /eventos/mes/{anio}/{mes}   → list[EventoOut] filtrado por mes
 * - GET /eventos/dia/{fecha}        → { fecha, eventos: list[EventoOut] }
 * - GET /eventos/?desde&hasta       → list[EventoOut] rango (para próximos)
 *
 * Los tipos coinciden con `backend/app/schemas/evento_schema.py`.
 */

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
  hora: string | null;
  ubicacion: string | null;
  profesor_nombre: string | null;
  carrera_nombre: string | null;
  archivo_pdf: string | null;
  creado_por: number | null;
}

export interface EventoDiaOut {
  fecha: string;
  eventos: EventoOut[];
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

export async function fetchEventosDelMes(
  anio: number,
  mes: number,
): Promise<EventoOut[]> {
  const { data } = await api.get<EventoOut[]>(`/eventos/mes/${anio}/${mes}`);
  return data;
}

export async function fetchEventosDelDia(fechaIso: string): Promise<EventoDiaOut> {
  const { data } = await api.get<EventoDiaOut>(`/eventos/dia/${fechaIso}`);
  return data;
}

export async function fetchProximosEventos(dias = 30): Promise<EventoOut[]> {
  const hoy = new Date();
  const hasta = new Date(hoy);
  hasta.setDate(hasta.getDate() + dias);
  const { data } = await api.get<EventoOut[]>("/eventos/", {
    params: { desde: toIso(hoy), hasta: toIso(hasta) },
  });
  return data;
}

// ---------------------------------------------------------------------------
// Helpers de fecha
// ---------------------------------------------------------------------------

export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

// ---------------------------------------------------------------------------
// Grid del mes
// ---------------------------------------------------------------------------

export interface CalendarCell {
  date: Date;
  inMonth: boolean;
  isoDate: string;
  hasEvents: boolean;
  eventos: EventoOut[];
}

/**
 * Construye el grid 6×7 con celdas dominadas por eventos indexados por
 * `evento.fecha`. Incluye días del mes anterior/siguiente para completar
 * la primera y última semana.
 */
export function buildMonthGrid(
  anio: number,
  mes: number, // 1..12
  eventos: EventoOut[],
): CalendarCell[] {
  const eventosPorDia = new Map<string, EventoOut[]>();
  for (const e of eventos) {
    const arr = eventosPorDia.get(e.fecha) ?? [];
    arr.push(e);
    eventosPorDia.set(e.fecha, arr);
  }

  const firstOfMonth = new Date(anio, mes - 1, 1);
  const startDow = firstOfMonth.getDay(); // 0=DOM
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - startDow);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = toIso(d);
    const dayEvents = eventosPorDia.get(iso) ?? [];
    cells.push({
      date: d,
      inMonth: d.getMonth() === mes - 1,
      isoDate: iso,
      hasEvents: dayEvents.length > 0,
      eventos: dayEvents,
    });
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const MESES_CORTOS = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
];

export const DIAS_CORTOS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

export const DIAS_LARGOS = [
  "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado",
];

export function formatDiaLargo(iso: string): string {
  const d = parseIsoDate(iso);
  return `${DIAS_LARGOS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function formatDayMonthShort(iso: string): { day: string; month: string } {
  const d = parseIsoDate(iso);
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: MESES_CORTOS[d.getMonth()] ?? "",
  };
}
