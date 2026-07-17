import { api } from "./api";
import { fetchPerfil } from "./dashboardService";

/**
 * Servicio de Estado de Cuenta.
 *
 * Consume:
 * - GET /finanzas/alumno/{alumno_id}/cuotas → List[CuotaOut]
 * - GET /finanzas/pagos/{pago_id}/comprobante → ComprobanteOut (por cuota pagada)
 *
 * BACKEND TODO:
 * - No hay endpoint "historial de pagos" del alumno. Derivamos las
 *   transacciones desde las cuotas con `pago_id != null`.
 * - No hay endpoint bulk para comprobantes por alumno; hay que consultarlos
 *   uno por uno vía `pago_id` de cada cuota pagada. Se resuelven en paralelo
 *   pero con concurrencia limitada para no explotar el server.
 */

// ---------------------------------------------------------------------------
// Tipos backend
// ---------------------------------------------------------------------------

export type EstadoCuota = "pendiente" | "pagado" | "vencido" | "anulado" | string;

export interface CuotaBackend {
  id: number;
  alumno_id: number;
  concepto_id: number;
  periodo: string;
  monto: number | string;
  monto_descuento: number | string;
  monto_a_pagar: number | string;
  fecha_vencimiento: string;
  estado: EstadoCuota;
  beca_nombre: string | null;
  fuente_beca: string | null;
  es_beca_externa: boolean | null;
  pago_id: number | null;
  comprobante_estado: string | null;
  comprobante_url_pdf: string | null;
}

export interface ComprobanteBackend {
  id: number;
  pago_id: number;
  tipo: string;
  numero: string | null;
  estado_emision: string; // "emitido" | "pendiente" | "error" | "anulado"
  url_pdf: string | null;
  fecha_emision: string | null;
}

// ---------------------------------------------------------------------------
// DTO compuesto
// ---------------------------------------------------------------------------

export interface CuotaCard {
  id: number;
  concepto: string;
  numeroCuota: string; // "1/10" etc — derivado si no hay
  periodo: string;
  monto: number;
  fechaVencimiento: string;
  estado: EstadoCuota;
  pagoId: number | null;
  comprobanteEstado: string | null;
  comprobanteUrl: string | null;
}

export interface Transaccion {
  id: number;
  descripcion: string;
  monto: number;
  fecha: string;
  tipo: "cargo" | "pago";
}

export interface Factura {
  id: number;
  numero: string;
  monto: number;
  fecha: string;
  estado: string; // emitido / pendiente / error
  urlPdf: string | null;
}

export interface CuentaData {
  saldoPendiente: number;
  saldoVencido: number;
  pagado: number;
  cuotas: CuotaCard[];
  transacciones: Transaccion[];
  facturas: Factura[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function conceptoLabel(c: CuotaBackend): string {
  // No hay endpoint que resuelva nombre de concepto — usamos "Cuota <periodo>"
  return `Cuota ${c.periodo}`;
}

// ---------------------------------------------------------------------------
// Fetch principal
// ---------------------------------------------------------------------------

export async function fetchCuenta(): Promise<CuentaData> {
  const perfil = await fetchPerfil();
  const { data: cuotas } = await api.get<CuotaBackend[]>(
    `/finanzas/alumno/${perfil.id}/cuotas`,
  );

  // Cuotas ordenadas por vencimiento asc (backend ya lo hace pero por si acaso)
  cuotas.sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento));

  const cuotaCards: CuotaCard[] = cuotas.map((c, i) => ({
    id: c.id,
    concepto: conceptoLabel(c),
    numeroCuota: `${i + 1}/${cuotas.length}`,
    periodo: c.periodo,
    monto: toNumber(c.monto_a_pagar),
    fechaVencimiento: c.fecha_vencimiento,
    estado: c.estado,
    pagoId: c.pago_id,
    comprobanteEstado: c.comprobante_estado,
    comprobanteUrl: c.comprobante_url_pdf,
  }));

  let saldoPendiente = 0;
  let saldoVencido = 0;
  let pagado = 0;
  for (const c of cuotaCards) {
    if (c.estado === "pagado") pagado += c.monto;
    else if (c.estado === "vencido") saldoVencido += c.monto;
    else if (c.estado === "pendiente") saldoPendiente += c.monto;
  }

  // Historial: transacciones inferidas.
  // - Un "cargo" por cada cuota emitida (fecha = fecha_vencimiento).
  // - Un "pago" por cada cuota con estado=pagado (fecha aprox = fecha_vencimiento
  //   — el backend no expone fecha_pago en /cuotas hoy).
  const transacciones: Transaccion[] = [];
  for (const c of cuotaCards) {
    transacciones.push({
      id: c.id * 2,
      descripcion: c.concepto,
      monto: c.monto,
      fecha: c.fechaVencimiento,
      tipo: "cargo",
    });
    if (c.estado === "pagado") {
      transacciones.push({
        id: c.id * 2 + 1,
        descripcion: `Pago — ${c.concepto}`,
        monto: c.monto,
        fecha: c.fechaVencimiento,
        tipo: "pago",
      });
    }
  }
  // Más reciente primero
  transacciones.sort((a, b) => b.fecha.localeCompare(a.fecha));

  // Facturas: derivadas del `comprobante_estado` que ya viene en la cuota.
  const facturas: Factura[] = cuotas
    .filter((c) => c.pago_id != null)
    .map((c, i) => ({
      id: c.pago_id ?? i,
      numero: `#${String(c.pago_id).padStart(6, "0")}`,
      monto: toNumber(c.monto_a_pagar),
      fecha: c.fecha_vencimiento,
      estado: c.comprobante_estado ?? "pendiente",
      urlPdf: c.comprobante_url_pdf,
    }));

  return {
    saldoPendiente,
    saldoVencido,
    pagado,
    cuotas: cuotaCards,
    transacciones: transacciones.slice(0, 15),
    facturas,
  };
}

export async function iniciarPagoOnline(cuotaIds: number[]): Promise<string> {
  const { data } = await api.post<{ gateway_url: string }>("/finanzas/pagos/online/iniciar", {
    cuota_ids: cuotaIds
  });
  return data.gateway_url;
}

// ---------------------------------------------------------------------------
// Formatter
// ---------------------------------------------------------------------------

export function formatGuaranies(n: number): string {
  return `₲ ${Math.round(n).toLocaleString("es-PY")}`;
}
