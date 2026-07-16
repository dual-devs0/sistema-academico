import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Path, Circle, Polyline, Line } from "react-native-svg";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { GlassCard } from "../components/ui/GlassCard";
import { CyanBadge } from "../components/ui/CyanBadge";

// ─── SVG Iconos ───────────────────────────────────────────────────────────────

function IconReceipt({ color = "#3b82f6", size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5 4 2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="8" y1="8" x2="16" y2="8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="8" y1="12" x2="12" y2="12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IconHistory({ color = "#f43f5e", size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
      <Polyline points="12 6 12 12 16 14" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconClipboardList({ color = colors.textSecondary, size = 32 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M6 6h12a1 1 0 011 1v12a1 1 0 01-1 1H6a1 1 0 01-1-1V7a1 1 0 011-1z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Line x1="8.5" y1="11" x2="15.5" y2="11" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1="8.5" y1="14.5" x2="15.5" y2="14.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1="8.5" y1="18" x2="12.5" y2="18" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function IconDocumentStack({ color = colors.textSecondary, size = 32 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M14 3v4a1 1 0 001 1h4" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Line x1="8.5" y1="12" x2="15.5" y2="12" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1="8.5" y1="15.5" x2="15.5" y2="15.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function IconInvoice({ color = colors.textSecondary, size = 32 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 2v20l2-1.4L10 22l2-1.4L14 22l2-1.4L18 22V2l-2 1.4L14 2l-2 1.4L10 2 8 3.4 6 2z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Line x1="8.5" y1="8" x2="15.5" y2="8" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1="8.5" y1="12" x2="13" y2="12" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}
import { SkeletonLoader } from "../components/ui/SkeletonLoader";
import {
  colors,
  fontFamily,
  fontSize,
  radius,
  spacing,
} from "../constants/design";
import {
  fetchCuenta,
  formatGuaranies,
  type CuentaData,
  type CuotaCard,
  type Factura,
  type Transaccion,
} from "../services/cuentaService";

/**
 * Pantalla Estado de Cuenta.
 *
 * CAMBIOS respecto a la versión anterior (rediseño 2026-07):
 * 1. Animación: se sacó el FadeInDown por-fila en cuotas/facturas (cada
 *    item entraba individualmente con delay acumulado, sensación de
 *    "cascada" larga). Ahora cada lista completa entra una sola vez con
 *    FadeIn simple; las filas ya no animan individualmente.
 * 2. Botón "Pagar Ahora": en el boceto de referencia es un botón sólido
 *    (fondo claro, texto oscuro), igual que "Abrir Escáner" en el
 *    dashboard. Antes tenía fondo translúcido + borde cian, que se veía
 *    como estado "deshabilitado". Ahora es sólido cian, consistente con
 *    el resto de la app.
 *
 * Tabs Resumen / Facturas (glass pills).
 * - Resumen: saldo pendiente grande + KPIs pagado/vencido + botón Pagar Ahora
 *   + lista cuotas + historial reciente.
 * - Facturas: lista de comprobantes con estado emisión + link descarga si
 *   existe URL.
 */

// ─── Datos dummy ──────────────────────────────────────────────────────────────

const DUMMY_CUENTA: CuentaData = {
  saldoPendiente: 450000,
  saldoVencido: 150000,
  pagado: 900000,
  cuotas: [
    { id: 1, concepto: "Cuota 2026-01", numeroCuota: "1/10", periodo: "2026-01", monto: 300000, fechaVencimiento: "2026-02-15", estado: "pagado", pagoId: 101, comprobanteEstado: "emitido", comprobanteUrl: null },
    { id: 2, concepto: "Cuota 2026-02", numeroCuota: "2/10", periodo: "2026-02", monto: 300000, fechaVencimiento: "2026-03-15", estado: "pagado", pagoId: 102, comprobanteEstado: "emitido", comprobanteUrl: null },
    { id: 3, concepto: "Cuota 2026-03", numeroCuota: "3/10", periodo: "2026-03", monto: 300000, fechaVencimiento: "2026-04-15", estado: "pagado", pagoId: 103, comprobanteEstado: "emitido", comprobanteUrl: null },
    { id: 4, concepto: "Cuota 2026-04", numeroCuota: "4/10", periodo: "2026-04", monto: 300000, fechaVencimiento: "2026-05-15", estado: "vencido", pagoId: null, comprobanteEstado: null, comprobanteUrl: null },
    { id: 5, concepto: "Cuota 2026-05", numeroCuota: "5/10", periodo: "2026-05", monto: 300000, fechaVencimiento: "2026-06-15", estado: "pendiente", pagoId: null, comprobanteEstado: null, comprobanteUrl: null },
    { id: 6, concepto: "Cuota 2026-06", numeroCuota: "6/10", periodo: "2026-06", monto: 150000, fechaVencimiento: "2026-07-15", estado: "pendiente", pagoId: null, comprobanteEstado: null, comprobanteUrl: null },
  ],
  transacciones: [
    { id: 201, descripcion: "Cuota 2026-01", monto: 300000, fecha: "2026-02-15", tipo: "cargo" },
    { id: 202, descripcion: "Pago — Cuota 2026-01", monto: 300000, fecha: "2026-02-10", tipo: "pago" },
    { id: 203, descripcion: "Cuota 2026-02", monto: 300000, fecha: "2026-03-15", tipo: "cargo" },
    { id: 204, descripcion: "Pago — Cuota 2026-02", monto: 300000, fecha: "2026-03-12", tipo: "pago" },
    { id: 205, descripcion: "Cuota 2026-03", monto: 300000, fecha: "2026-04-15", tipo: "cargo" },
    { id: 206, descripcion: "Pago — Cuota 2026-03", monto: 300000, fecha: "2026-04-10", tipo: "pago" },
    { id: 207, descripcion: "Cuota 2026-04", monto: 300000, fecha: "2026-05-15", tipo: "cargo" },
    { id: 208, descripcion: "Cuota 2026-05", monto: 300000, fecha: "2026-06-15", tipo: "cargo" },
    { id: 209, descripcion: "Cuota 2026-06", monto: 150000, fecha: "2026-07-15", tipo: "cargo" },
  ],
  facturas: [
    { id: 101, numero: "#000101", monto: 300000, fecha: "2026-02-15", estado: "emitido", urlPdf: null },
    { id: 102, numero: "#000102", monto: 300000, fecha: "2026-03-15", estado: "emitido", urlPdf: null },
    { id: 103, numero: "#000103", monto: 300000, fecha: "2026-04-15", estado: "emitido", urlPdf: null },
  ],
};

type Tab = "resumen" | "facturas";

export default function CuentaScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("resumen");
  const [data, setData] = useState<CuentaData | null>(DUMMY_CUENTA);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await fetchCuenta();
      setData(d);
    } catch {
      // dummy data ya está en estado
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScreenHeader
        showBack
        onBackPress={() => router.back()}
        title="Estado de Cuenta"
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.cyan}
          />
        }
      >
        <TabPills tab={tab} onChange={setTab} />

        {loading ? (
          <LoadingBody />
        ) : error ? (
          <ErrorBody message={error} onRetry={load} />
        ) : data ? (
          tab === "resumen" ? (
            <ResumenTab data={data} />
          ) : (
            <FacturasTab facturas={data.facturas} />
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function TabPills({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: spacing.sm,
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.lg,
      }}
    >
      {(["resumen", "facturas"] as const).map((t) => {
        const active = t === tab;
        return (
          <Pressable
            key={t}
            onPress={() => onChange(t)}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: spacing.md,
              borderRadius: radius.pill,
              backgroundColor: active ? colors.cyan : colors.glassBg,
              borderWidth: 1,
              borderColor: active ? colors.cyan : colors.border,
              alignItems: "center",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text
              style={{
                color: active ? "#0a0e17" : colors.textPrimary,
                fontFamily: active ? fontFamily.interSemibold : fontFamily.interMedium,
                fontSize: fontSize.body,
                letterSpacing: 0.5,
                textTransform: "capitalize",
              }}
            >
              {t}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------

function ResumenTab({ data }: { data: CuentaData }) {
  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}
    >
      <SaldoCard
        saldoPendiente={data.saldoPendiente}
        saldoVencido={data.saldoVencido}
        pagado={data.pagado}
      />

      <SectionLabel text="Cuotas del ciclo" />
      {data.cuotas.length === 0 ? (
        <GlassCard contentStyle={{ padding: spacing.xl, alignItems: "center" }}>
          <View style={{ marginBottom: spacing.sm }}>
            <IconClipboardList />
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.inter,
              fontSize: fontSize.body,
              textAlign: "center",
            }}
          >
            Sin cuotas cargadas todavía.
          </Text>
        </GlassCard>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {data.cuotas.map((c) => (
            <CuotaRow key={c.id} cuota={c} />
          ))}
        </View>
      )}

      <SectionLabel text="Historial reciente" />
      {data.transacciones.length === 0 ? (
        <GlassCard contentStyle={{ padding: spacing.xl, alignItems: "center" }}>
          <View style={{ marginBottom: spacing.sm }}>
            <IconDocumentStack />
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.inter,
              fontSize: fontSize.body,
              textAlign: "center",
            }}
          >
            Sin movimientos registrados.
          </Text>
        </GlassCard>
      ) : (
        <GlassCard contentStyle={{ padding: spacing.md }}>
          {data.transacciones.map((t, i) => (
            <TransaccionRow
              key={t.id}
              tx={t}
              last={i === data.transacciones.length - 1}
            />
          ))}
        </GlassCard>
      )}
    </Animated.View>
  );
}

function SaldoCard({
  saldoPendiente,
  saldoVencido,
  pagado,
}: {
  saldoPendiente: number;
  saldoVencido: number;
  pagado: number;
}) {
  const saldo = saldoPendiente + saldoVencido;
  return (
    <GlassCard variant="accent" contentStyle={{ padding: spacing.xl }}>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: fontFamily.interMedium,
          fontSize: fontSize.caption,
          letterSpacing: 1.5,
          textTransform: "uppercase",
        }}
      >
        Saldo pendiente
      </Text>
      <Text
        style={{
          color: colors.cyan,
          fontFamily: fontFamily.monoBold,
          fontSize: fontSize.numericLg,
          lineHeight: fontSize.numericLg + 4,
          marginTop: spacing.sm,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatGuaranies(saldo)}
      </Text>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: spacing.lg,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <View>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.interMedium,
              fontSize: fontSize.caption,
              letterSpacing: 1.5,
            }}
          >
            PAGADO
          </Text>
          <Text
            style={{
              color: colors.success,
              fontFamily: fontFamily.monoBold,
              fontSize: fontSize.body,
              marginTop: 2,
            }}
          >
            {formatGuaranies(pagado)}
          </Text>
        </View>
        <View>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.interMedium,
              fontSize: fontSize.caption,
              letterSpacing: 1.5,
            }}
          >
            VENCIDO
          </Text>
          <Text
            style={{
              color: saldoVencido > 0 ? colors.error : colors.textPrimary,
              fontFamily: fontFamily.monoBold,
              fontSize: fontSize.body,
              marginTop: 2,
            }}
          >
            {formatGuaranies(saldoVencido)}
          </Text>
        </View>
      </View>

      {/* Antes: fondo translúcido rgba(0,180,216,0.15) + borde cian —
          se veía "apagado". Ahora sólido, igual criterio que
          "Abrir Escáner" en el dashboard. */}
      <Pressable
        onPress={() => { }}
        style={({ pressed }) => ({
          marginTop: spacing.lg,
          paddingVertical: spacing.md,
          borderRadius: radius.md,
          backgroundColor: colors.cyan,
          alignItems: "center",
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text
          style={{
            color: "#0a0e17",
            fontFamily: fontFamily.interSemibold,
            fontSize: fontSize.body,
          }}
        >
          Pagar Ahora
        </Text>
      </Pressable>
    </GlassCard>
  );
}

function CuotaRow({ cuota }: { cuota: CuotaCard }) {
  const variant =
    cuota.estado === "vencido"
      ? "error"
      : cuota.estado === "pagado"
        ? "success"
        : "warning";
  const label =
    cuota.estado === "vencido"
      ? "VENCIDO"
      : cuota.estado === "pagado"
        ? "PAGADO"
        : "PENDIENTE";
  return (
    <GlassCard contentStyle={{ padding: spacing.md }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: "rgba(59,130,246,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconReceipt color="#3b82f6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: fontFamily.interSemibold,
              fontSize: fontSize.body,
            }}
            numberOfLines={1}
          >
            {cuota.concepto}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.mono,
              fontSize: fontSize.caption,
              marginTop: 2,
            }}
          >
            Vence {cuota.fechaVencimiento}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: spacing.xs }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: fontFamily.monoBold,
              fontSize: fontSize.body,
            }}
          >
            {formatGuaranies(cuota.monto)}
          </Text>
          <CyanBadge label={label} variant={variant} size="sm" />
        </View>
      </View>
    </GlassCard>
  );
}

function TransaccionRow({ tx, last }: { tx: Transaccion; last: boolean }) {
  const color = tx.tipo === "pago" ? colors.success : colors.textPrimary;
  return (      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          paddingVertical: spacing.md,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.border,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: "rgba(244,63,94,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconHistory color="#f43f5e" />
        </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.interMedium,
            fontSize: fontSize.caption,
          }}
          numberOfLines={1}
        >
          {tx.descripcion}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: fontFamily.mono,
            fontSize: fontSize.caption,
          }}
        >
          {tx.fecha}
        </Text>
      </View>
      <Text
        style={{
          color,
          fontFamily: fontFamily.monoBold,
          fontSize: fontSize.caption,
        }}
      >
        {tx.tipo === "pago" ? "-" : "+"} {formatGuaranies(tx.monto)}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Facturas
// ---------------------------------------------------------------------------

function FacturasTab({ facturas }: { facturas: Factura[] }) {
  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}
    >
      {facturas.length === 0 ? (
        <GlassCard contentStyle={{ padding: spacing.xl, alignItems: "center" }}>
          <View style={{ marginBottom: spacing.sm }}>
            <IconInvoice />
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.inter,
              fontSize: fontSize.body,
              textAlign: "center",
            }}
          >
            Todavía no tenés facturas emitidas.
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.inter,
              fontSize: fontSize.caption,
              textAlign: "center",
              marginTop: spacing.sm,
            }}
          >
            Cuando se generen tus cuotas aparecerán aquí.
          </Text>
        </GlassCard>
      ) : (
        facturas.map((f) => <FacturaCard key={f.id} factura={f} />)
      )}
    </Animated.View>
  );
}

function FacturaCard({ factura }: { factura: Factura }) {
  const emitida = factura.estado === "emitido";
  const badgeVariant = emitida
    ? "success"
    : factura.estado === "error"
      ? "error"
      : "warning";
  return (
    <GlassCard contentStyle={{ padding: spacing.lg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing.sm,
        }}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.monoBold,
            fontSize: fontSize.body,
          }}
        >
          {factura.numero}
        </Text>
        <CyanBadge label={factura.estado.toUpperCase()} variant={badgeVariant} size="sm" />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: fontFamily.mono,
            fontSize: fontSize.caption,
          }}
        >
          {factura.fecha}
        </Text>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.monoBold,
            fontSize: fontSize.body,
          }}
        >
          {formatGuaranies(factura.monto)}
        </Text>
      </View>
      {emitida && factura.urlPdf ? (
        <Pressable
          onPress={() => { }}
          style={({ pressed }) => ({
            marginTop: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: colors.glassBg,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              color: colors.cyan,
              fontFamily: fontFamily.interSemibold,
              fontSize: fontSize.caption,
            }}
          >
            Descargar PDF
          </Text>
        </Pressable>
      ) : null}
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Section / loading / error
// ---------------------------------------------------------------------------

function SectionLabel({ text }: { text: string }) {
  return (
    <Text
      style={{
        color: colors.textSecondary,
        fontFamily: fontFamily.interMedium,
        fontSize: fontSize.caption,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        marginTop: spacing.md,
      }}
    >
      {text}
    </Text>
  );
}

function LoadingBody() {
  return (
    <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
      <SkeletonLoader height={180} />
      <SkeletonLoader height={30} width="40%" />
      {[0, 1, 2].map((i) => (
        <SkeletonLoader key={i} height={68} />
      ))}
    </View>
  );
}

function ErrorBody({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{ paddingHorizontal: spacing.xl }}>
      <GlassCard variant="accent" contentStyle={{ padding: spacing.lg }}>
        <Text
          style={{
            color: colors.error,
            fontFamily: fontFamily.interSemibold,
            fontSize: fontSize.caption,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          Error
        </Text>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.inter,
            fontSize: fontSize.body,
            marginTop: spacing.sm,
            marginBottom: spacing.lg,
          }}
        >
          {message}
        </Text>
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => ({
            alignSelf: "flex-start",
            backgroundColor: colors.cyan,
            borderRadius: radius.md,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              color: "#0a0e17",
              fontFamily: fontFamily.interSemibold,
              fontSize: fontSize.caption,
            }}
          >
            Reintentar
          </Text>
        </Pressable>
      </GlassCard>
    </View>
  );
}
