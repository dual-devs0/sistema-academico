// Descarga de boleta de calificaciones en PDF (alumno). Consume /boleta/pdf
// (backend: routers/boleta_router.py → services/boleta_pdf.py, WeasyPrint).
// Reusa el cliente axios de api.ts para enviar el Bearer token + refresh.
import { api } from "./api";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export type BoletaScope = "global" | "anio" | "semestre_actual";

export interface BoletaDescargaOpciones {
  anio?: number | null;
  semestre?: number | null;
}

export const BOLETA_SCOPES: { scope: BoletaScope; label: string }[] = [
  { scope: "global", label: "Global" },
  { scope: "anio", label: "Por año" },
  { scope: "semestre_actual", label: "Semestre actual" },
];

export async function descargarBoletaPdf(
  scope: BoletaScope,
  opts: BoletaDescargaOpciones = {},
): Promise<void> {
  const params = new URLSearchParams({ scope });
  if (opts.anio != null) params.set("anio", String(opts.anio));
  if (opts.semestre != null) params.set("semestre", String(opts.semestre));

  const res = await api.get<ArrayBuffer>(`/boleta/pdf?${params.toString()}`, {
    responseType: "arraybuffer",
  });

  const bytes = new Uint8Array(res.data);
  const file = new File(Paths.cache, `boleta_${scope}.pdf`);
  file.write(bytes);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/pdf",
      dialogTitle: "Boleta de calificaciones",
      UTI: "com.adobe.pdf",
    });
  } else {
    throw new Error("No se puede compartir archivos en este dispositivo");
  }
}
