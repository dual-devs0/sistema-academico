import { api } from "./api";

/**
 * Servicio de Notas móvil.
 *
 * Compone datos de tres endpoints existentes del backend:
 * - GET /alumno/mis-materias  → { id, nombre, profesor, anio, semestre }
 * - GET /alumno/mis-notas     → { materia_id, materia_nombre, parcial1,
 *                                 parcial2, practico, final, promedio }
 * - GET /alumno/mi-asistencia → { materia_id, materia_nombre, total_clases,
 *                                 presentes, porcentaje }
 *
 * `fetchNotasCompleto()` los une por `materia_id` y expone el semestre
 * (para el chip selector) + desglose ponderado.
 *
 * Pesos oficiales del backend (auth-router:133):
 *   parcial1: 25%, parcial2: 25%, práctico: 20%, final: 30%.
 */

export interface MateriaResumen {
  id: number;
  nombre: string;
  profesor: string | null;
  anio: number | null;
  semestre: number | null;
}

export interface NotaBackend {
  materia_id: number;
  materia_nombre: string;
  parcial1: number | null;
  parcial2: number | null;
  practico: number | null;
  final: number | null;
  promedio: number | null;
}

export interface AsistenciaBackend {
  materia_id: number;
  materia_nombre: string;
  total_clases: number;
  presentes: number;
  porcentaje: number;
}

// ---------------------------------------------------------------------------
// DTO compuesto (consumido por la vista)
// ---------------------------------------------------------------------------

export type NotaTipo = "parcial1" | "parcial2" | "practico" | "final";

export interface DesgloseItem {
  tipo: string;
  label: string;
  peso: number;
  nota: number | null;
  puntajeActividad: number | null;
  puntajeLogrado: number | null;
  fecha: string | null;
  hora: string | null;
  profesor: string | null;
}

export interface MateriaCard {
  materiaId: number;
  nombre: string;
  profesor: string | null;
  anio: number | null;
  semestre: number | null;
  promedio: number | null;
  asistenciaPct: number | null;
  totalClases: number;
  presentes: number;
  desglose: DesgloseItem[];
}

export interface NotasCompleto {
  materias: MateriaCard[];
  semestresDisponibles: number[];
  promedioAnual: number | null;
}

export const PUNTAJE_POR_TIPO: Record<string, number> = {
  parcial1: 100,
  parcial2: 100,
  practico: 60,
  final1: 50,
  final2: 50,
  final3: 50,
};

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function fetchMisMaterias(): Promise<MateriaResumen[]> {
  const { data } = await api.get<MateriaResumen[]>("/alumno/mis-materias");
  return data;
}

async function fetchMisNotas(): Promise<NotaBackend[]> {
  const { data } = await api.get<NotaBackend[]>("/alumno/mis-notas");
  return data;
}

async function fetchMiAsistencia(): Promise<AsistenciaBackend[]> {
  const { data } = await api.get<AsistenciaBackend[]>("/alumno/mi-asistencia");
  return data;
}

// ---------------------------------------------------------------------------
// Composición
// ---------------------------------------------------------------------------

const PESO: Record<NotaTipo, number> = {
  parcial1: 0.25,
  parcial2: 0.25,
  practico: 0.2,
  final: 0.3,
};

const LABEL: Record<NotaTipo, string> = {
  parcial1: "Parcial 1",
  parcial2: "Parcial 2",
  practico: "Trabajo Práctico",
  final: "Final",
};

function buildDesglose(nota: NotaBackend | undefined): DesgloseItem[] {
  const tipos: NotaTipo[] = ["parcial1", "parcial2", "practico", "final"];
  return tipos.map((t) => ({
    tipo: t,
    label: LABEL[t],
    peso: PESO[t],
    nota: nota?.[t] ?? null,
    puntajeActividad: null,
    puntajeLogrado: null,
    fecha: null,
    hora: null,
    profesor: null,
  }));
}

export async function fetchNotasCompleto(): Promise<NotasCompleto> {
  const [materias, notas, asistencia] = await Promise.all([
    fetchMisMaterias().catch<MateriaResumen[]>(() => []),
    fetchMisNotas().catch<NotaBackend[]>(() => []),
    fetchMiAsistencia().catch<AsistenciaBackend[]>(() => []),
  ]);

  const notaByMat = new Map<number, NotaBackend>();
  for (const n of notas) notaByMat.set(n.materia_id, n);

  const asisByMat = new Map<number, AsistenciaBackend>();
  for (const a of asistencia) asisByMat.set(a.materia_id, a);

  const cards: MateriaCard[] = materias.map((m) => {
    const n = notaByMat.get(m.id);
    const a = asisByMat.get(m.id);
    return {
      materiaId: m.id,
      nombre: m.nombre,
      profesor: m.profesor,
      anio: m.anio,
      semestre: m.semestre,
      promedio: n?.promedio ?? null,
      asistenciaPct: a?.porcentaje ?? null,
      totalClases: a?.total_clases ?? 0,
      presentes: a?.presentes ?? 0,
      desglose: buildDesglose(n),
    };
  });

  const semSet = new Set<number>();
  for (const c of cards) if (c.semestre != null) semSet.add(c.semestre);
  const semestresDisponibles = Array.from(semSet).sort((x, y) => x - y);

  const promedios = cards
    .map((c) => c.promedio)
    .filter((p): p is number => p != null);
  const promedioAnual =
    promedios.length > 0
      ? Math.round((promedios.reduce((a, b) => a + b, 0) / promedios.length) * 100) / 100
      : null;

  return { materias: cards, semestresDisponibles, promedioAnual };
}

// ---------------------------------------------------------------------------
// Helpers de vista
// ---------------------------------------------------------------------------

export function filterBySemestre(
  materias: MateriaCard[],
  semestre: number | null,
): MateriaCard[] {
  if (semestre == null) return materias;
  return materias.filter((m) => m.semestre === semestre);
}

export function computePromedioSemestre(
  materias: MateriaCard[],
  semestre: number | null,
): number | null {
  const filtradas = filterBySemestre(materias, semestre);
  const promedios = filtradas
    .map((m) => m.promedio)
    .filter((p): p is number => p != null);
  if (promedios.length === 0) return null;
  return Math.round((promedios.reduce((a, b) => a + b, 0) / promedios.length) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Tipos para detalle de materia
// ---------------------------------------------------------------------------

export type MateriaDetalle = {
  materiaId: number;
  nombre: string;
  profesor: string | null;
  semestre: number;
  asistenciaPct: number | null;
  totalClases: number;
  presentes: number;
  desglose: DesgloseItem[];
};

export type AsistenciaRegistro = {
  fecha: string;
  tipoClase: string;
  horasCatedra: number;
  asistenciaCargada: string;
};

export type AsistenciaDetalleResponse = {
  nombre: string;
  registros: AsistenciaRegistro[];
};

// ---------------------------------------------------------------------------
// Fetchers de detalle
// ---------------------------------------------------------------------------

export async function fetchMateriaDetalle(id: number): Promise<MateriaDetalle> {
  const { data } = await api.get<MateriaDetalle>(`/notas/materia/${id}/detalle`);
  return data;
}

export async function fetchAsistenciaDetalle(id: number): Promise<AsistenciaDetalleResponse> {
  const { data } = await api.get<AsistenciaDetalleResponse>(`/notas/materia/${id}/asistencia`);
  return data;
}
