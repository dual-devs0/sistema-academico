import { api } from "./api";

/**
 * Servicio de Exámenes.
 *
 * Consume los endpoints del backend:
 *   GET  /examenes/disponibles?periodo=may-2026
 *   GET  /examenes/inscriptos
 *   POST /examenes/inscripciones  { examen_id }
 *   DELETE /examenes/inscripciones/{id}
 */

export type Turno = string; // ej "may-2026", "ago-2026"

export type EstadoInscripcion = "inscripto" | "cancelada";

export interface ExamenDisponible {
  id: number;
  materia_id: number;
  materia_nombre: string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  aula: string | null;
  tipo: string;
  periodo: string;
  cupos: number | null;
  cupos_disponibles: number | null;
  ya_inscripto: boolean;
  profesor_nombre: string | null;
  estado: string;
}

export interface ExamenInscripto {
  id: number;
  examen_id: number;
  alumno_id: number;
  estado: string;
  inscripto_en: string;
  materia_nombre: string;
  fecha: string;
  hora_inicio: string | null;
  aula: string | null;
  nota: number | null;
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

export async function fetchExamenesDisponibles(
  periodo: string,
): Promise<ExamenDisponible[]> {
  try {
    const { data } = await api.get<ExamenDisponible[]>("/examenes/disponibles", {
      params: { periodo },
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
        anyErr.response?.data?.detail ?? "No se pudo completar la inscripción.",
    };
  }
}

export async function cancelarInscripcion(
  inscripcionId: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await api.delete(`/examenes/inscripciones/${inscripcionId}`);
    return { ok: true };
  } catch (err) {
    const anyErr = err as {
      response?: { status?: number; data?: { detail?: string } };
    };
    return {
      ok: false,
      error: anyErr.response?.data?.detail ?? "No se pudo cancelar la inscripción.",
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
