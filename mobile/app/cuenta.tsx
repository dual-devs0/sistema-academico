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
import Animated, { FadeInDown } from "react-native-reanimated";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { GlassCard } from "../components/ui/GlassCard";
import { CyanBadge } from "../components/ui/CyanBadge";
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
 * Tabs Resumen / Facturas (glass pills).
 * - Resumen: saldo pendiente grande + KPIs pagado/vencido + botón Pagar Ahora
 *   + lista cuotas + historial reciente.
 * - Facturas: lista de comprobantes con estado emisión + link descarga si
 *   existe URL.
 */

type Tab = "resumen" | "facturas";

export default function CuentaScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("resumen");
  const [data, setData] = useState<CuentaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await fetchCuenta();
      setData(d);
    } catch {
      setError("No se pudo cargar el estado de cuenta.");
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
    <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
      <Animated.View entering={FadeInDown.duration(280)}>
        <SaldoCard
          saldoPendiente={data.saldoPendiente}
          saldoVencido={data.saldoVencido}
          pagado={data.pagado}
        />
      </Animated.View>

      <SectionLabel text="Cuotas del ciclo" />
      {data.cuotas.length === 0 ? (
        <GlassCard contentStyle={{ padding: spacing.lg, alignItems: "center" }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.inter,
              fontSize: fontSize.body,
            }}
          >
            Sin cuotas cargadas todavía.
          </Text>
        </GlassCard>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {data.cuotas.map((c, i) => (
            <Animated.View key={c.id} entering={FadeInDown.delay(i * 40).duration(280)}>
              <CuotaRow cuota={c} />
            </Animated.View>
          ))}
        </View>
      )}

      <SectionLabel text="Historial reciente" />
      {data.transacciones.length === 0 ? (
        <GlassCard contentStyle={{ padding: spacing.lg }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.inter,
              fontSize: fontSize.body,
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
    </View>
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

      <Pressable
        onPress={() => {}}
        style={({ pressed }) => ({
          marginTop: spacing.lg,
          paddingVertical: spacing.md,
          borderRadius: radius.md,
          backgroundColor: "rgba(0,180,216,0.15)",
          borderWidth: 1,
          borderColor: colors.cyan,
          alignItems: "center",
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text
          style={{
            color: colors.cyan,
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
            borderRadius: 20,
            backgroundColor: colors.cyanDim,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: colors.cyan,
              fontFamily: fontFamily.monoBold,
              fontSize: fontSize.caption,
            }}
          >
            {cuota.numeroCuota.split("/")[0]}
          </Text>
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
  return (
    <View
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
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: tx.tipo === "pago" ? colors.success : colors.warning,
        }}
      />
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
    <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
      {facturas.length === 0 ? (
        <GlassCard contentStyle={{ padding: spacing.lg, alignItems: "center" }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.inter,
              fontSize: fontSize.body,
            }}
          >
            Todavía no tenés facturas emitidas.
          </Text>
        </GlassCard>
      ) : (
        facturas.map((f, i) => (
          <Animated.View key={f.id} entering={FadeInDown.delay(i * 50).duration(280)}>
            <FacturaCard factura={f} />
          </Animated.View>
        ))
      )}
    </View>
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
          onPress={() => {}}
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
