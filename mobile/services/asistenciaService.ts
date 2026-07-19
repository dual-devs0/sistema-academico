import { api } from "./api";

/**
 * Servicio de Asistencia — QR scanner + info del día.
 *
 * Endpoint: `POST /asistencias/qr/verificar`.
 *   body: { qr_token: string }  // JWT firmado por SECRET_KEY, TTL 15 min
 *   auth: alumno (JWT propio en el header Authorization)
 *   response 200: {
 *     materia_nombre: string,
 *     fecha: "YYYY-MM-DD",
 *     hora_registro: "HH:MM",
 *     presentes: number,
 *     ausentes: number,
 *   }
 *   errores:
 *     400 QR inválido o expirado (JWT malformado, TTL vencido, kind incorrecto)
 *     403 alumno no inscripto en la materia
 *     409 asistencia ya registrada hoy
 */

export interface MateriaHoy {
  materiaId: number;
  nombre: string;
  hora: string; // "HH:MM"
  aula: string | null;
  asistenciaPct: number; // 0..1
  estado: "ok" | "riesgo";
}

export interface QrVerifyResponse {
  materia_nombre: string;
  fecha: string;
  hora_registro: string;
  presentes: number;
  ausentes: number;
}

export interface QrVerifyResult {
  ok: boolean;
  data: QrVerifyResponse | null;
  errorCode: "invalid" | "expired" | "duplicate" | "not_enrolled" | "network" | "unknown" | null;
  errorMessage: string | null;
}

// ---------------------------------------------------------------------------
// Verificación del QR
// ---------------------------------------------------------------------------

export async function verifyQrToken(qrToken: string): Promise<QrVerifyResult> {
  try {
    const { data } = await api.post<QrVerifyResponse>("/asistencias/qr/verificar", {
      qr_token: qrToken,
    });
    return { ok: true, data, errorCode: null, errorMessage: null };
  } catch (err) {
    const anyErr = err as {
      response?: { status?: number; data?: { detail?: string } };
      message?: string;
    };
    const status = anyErr.response?.status;
    const detail = anyErr.response?.data?.detail ?? anyErr.message ?? null;
    let code: QrVerifyResult["errorCode"] = "unknown";
    if (status === 400) {
      code = detail && detail.toLowerCase().includes("expir") ? "expired" : "invalid";
    } else if (status === 409) code = "duplicate";
    else if (status === 403) code = "not_enrolled";
    else if (status == null) code = "network";
    return { ok: false, data: null, errorCode: code, errorMessage: detail };
  }
}

// ---------------------------------------------------------------------------
// Materias del día (placeholder: usa /alumno/mis-materias)
//
// TODO backend: /alumno/mis-materias-hoy que filtre por día de la semana +
// horario de la oferta activa. Hoy no existe → devolvemos todas con
// hora/aula null como mejor esfuerzo.
// ---------------------------------------------------------------------------

interface MateriaBackend {
  id: number;
  nombre: string;
  anio: number | null;
  semestre: number | null;
}

interface AsistenciaBackend {
  materia_id: number;
  porcentaje: number;
}

export async function fetchMateriasHoy(): Promise<MateriaHoy[]> {
  try {
    const [materiasRes, asistRes] = await Promise.all([
      api.get<MateriaBackend[]>("/alumno/mis-materias"),
      api.get<AsistenciaBackend[]>("/alumno/mi-asistencia").catch(() => ({ data: [] as AsistenciaBackend[] })),
    ]);
    const asisMap = new Map<number, number>();
    for (const a of asistRes.data) asisMap.set(a.materia_id, a.porcentaje);
    return materiasRes.data.slice(0, 5).map((m) => {
      const pct = (asisMap.get(m.id) ?? 100) / 100;
      return {
        materiaId: m.id,
        nombre: m.nombre,
        hora: "—",
        aula: null,
        asistenciaPct: pct,
        estado: pct >= 0.75 ? ("ok" as const) : ("riesgo" as const),
      };
    });
  } catch {
    return [];
  }
}
