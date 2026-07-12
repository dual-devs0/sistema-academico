import { api } from "./api";

/**
 * Servicio de Exámenes.
 *
 * ⚠️ Los endpoints de exámenes NO existen todavía en el backend. Este
 * servicio los llama por su nombre tentativo; si devuelven 404 el
 * frontend mostrará estado vacío + banner "próximamente".
 *
 * BACKEND TODO:
 *   GET /examenes/disponibles?turno={turno}
 *   response: list[ExamenDisponibleOut]
 *
 *   GET /examenes/inscriptos
 *   response: list[ExamenInscriptoOut]
 *
 *   POST /examenes/inscripciones
 *   body: { examen_id: number }
 *   response: ExamenInscriptoOut
 *
 *   DELETE /examenes/inscripciones/{inscripcion_id}
 *
 * Los turnos siguen la nomenclatura del backend (feb/may/ago/nov + año).
 */

export type Turno = string; // ej "may-2024", "ago-2024"

export type EstadoInscripcion = "confirmado" | "pendiente_pago" | "finalizado";

export interface ExamenDisponible {
  id: number;
  materia_id: number;
  materia_nombre: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  aula: string | null;
  habilitado: boolean;
  cierre_inscripcion: string; // YYYY-MM-DD
  turno: Turno;
}

export interface ExamenInscripto {
  inscripcion_id: number;
  examen_id: number;
  materia_id: number;
  materia_nombre: string;
  fecha: string;
  hora: string;
  aula: string | null;
  estado: EstadoInscripcion;
  nota: number | null;
}

// ---------------------------------------------------------------------------
// Fetchers (tolerantes)
// ---------------------------------------------------------------------------

export async function fetchExamenesDisponibles(
  turno: Turno,
): Promise<ExamenDisponible[]> {
  try {
    const { data } = await api.get<ExamenDisponible[]>("/examenes/disponibles", {
      params: { turno },
    });
    return data;
  } catch {
    return [];
  }
}

export async function fetchExamenesInscriptos(): Promise<ExamenInscripto[]> {
  try {
    const { data } = await api.get<ExamenInscripto[]>("/examenes/inscriptos");
    return data;
  } catch {
    return [];
  }
}

export async function inscribirseAExamen(
  examenId: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await api.post("/examenes/inscripciones", { examen_id: examenId });
    return { ok: true };
  } catch (err) {
    const anyErr = err as {
      response?: { status?: number; data?: { detail?: string } };
    };
    return {
      ok: false,
      error:
        anyErr.response?.data?.detail ??
        (anyErr.response?.status === 404
          ? "Servicio de exámenes no disponible todavía."
          : "No se pudo completar la inscripción."),
    };
  }
}

// ---------------------------------------------------------------------------
// Turnos disponibles (helper — hardcoded hoy)
// ---------------------------------------------------------------------------

const MESES_TURNO = ["FEB", "MAY", "AGO", "NOV"];

export function turnosDelAnio(anio: number): { key: Turno; label: string }[] {
  return MESES_TURNO.map((m) => ({
    key: `${m.toLowerCase()}-${anio}`,
    label: `${m} ${anio}`,
  }));
}

export function currentTurnoKey(): Turno {
  const now = new Date();
  const anio = now.getFullYear();
  const mes = now.getMonth() + 1;
  const bucket =
    mes <= 3 ? "feb" : mes <= 6 ? "may" : mes <= 9 ? "ago" : "nov";
  return `${bucket}-${anio}`;
}

// ---------------------------------------------------------------------------
// Días hasta cierre
// ---------------------------------------------------------------------------

export function daysUntil(iso: string): number {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  const target = new Date(y, (m || 1) - 1, d || 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
