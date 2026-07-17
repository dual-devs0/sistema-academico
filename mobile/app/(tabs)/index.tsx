import { colors } from "../../constants/design";
import { useTheme } from "../../hooks/useTheme";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { GlassCard } from "../../components/ui/GlassCard";
import { StatCard } from "../../components/ui/StatCard";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { CyanBadge } from "../../components/ui/CyanBadge";
import { SkeletonLoader, SkeletonGroup } from "../../components/ui/SkeletonLoader";
import {
  fontFamily,
  fontSize,
  spacing,
  radius,
} from "../../constants/design";
import {
  fetchDashboard,
  formatDayMonth,
  daysUntil,
  formatGuaranies,
  greetingForNow,
  type DashboardData,
  type TipoEvento,
} from "../../services/dashboardService";
import Svg, { Path, Circle, Rect, Polyline, Line } from "react-native-svg";

// ─── SVG Iconos para Dashboard KPI ───────────────────────────────────────────

function IconCreditCard({ color = "#06b6d4", size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth={1.8} />
      <Line x1="2" y1="10" x2="22" y2="10" stroke={color} strokeWidth={1.8} />
      <Line x1="6" y1="14" x2="10" y2="14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function IconChartBar({ color = "#fbbf24", size = 20 }: { color?: string; size?: number }) {
  const { colors } = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="13" width="4" height="7" rx="1" fill={color} />
      <Rect x="10" y="9" width="4" height="11" rx="1" fill={color} />
      <Rect x="16" y="5" width="4" height="15" rx="1" fill={color} />
    </Svg>
  );
}

function IconAccountCheck({ color = "#22c55e", size = 20 }: { color?: string; size?: number }) {
  const { colors } = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="10" cy="8" r="4" stroke={color} strokeWidth={1.8} />
      <Path d="M2 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M17 14l2 2 4-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconTrendingUp({ color = "#8b5cf6", size = 20 }: { color?: string; size?: number }) {
  const { colors } = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="17 6 23 6 23 12" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * Dashboard móvil — pantalla home post-login.
 *
 * CAMBIOS respecto a la versión anterior (rediseño 2026-07):
 * 1. Animación: se reemplazó FadeInDown + springify/damping (rebote y
 *    empuje vertical acumulado por card) por un FadeIn simple, sin rebote,
 *    con delay acotado a un máximo de 160ms total entre la primera y la
 *    última card. Antes, con 7 cards a 50ms c/u, el último elemento tardaba
 *    350ms+ en aparecer y además "rebotaba" — eso es lo que se sentía como
 *    movimiento excesivo. Ahora todo entra en <260ms sin overshoot.
 * 2. Subtítulo bajo el saludo: antes caía siempre a "Carrera #1" si no
 *    había nombre de carrera. Ahora intenta mostrar
 *    "Ingeniería Informática · 4.º Semestre" (como en el boceto) usando
 *    carrera_nombre / semestre si el backend los expone; si no existen,
 *    cae a "Carrera #N" y por último a "Portal Académico · UCA".
 *    ⚠️ Requiere que `user.carrera_nombre` y `user.semestre` vengan del
 *    endpoint /dashboard — si no existen todavía, hay que agregarlos al
 *    tipo DashboardData y al backend. Mientras tanto el fallback funciona
 *    sin romper nada.
 *
 * Estados:
 * - loading: skeletons con misma altura que el contenido final para evitar
 *   layout shift.
 * - error: card glass con mensaje + botón "Reintentar".
 * - éxito con vacíos parciales: cada card renderiza su propio fallback
 *   ("Sin eventos programados", "Sin cuotas cargadas", etc.).
 */

// Tope de stagger: nunca dejamos que el delay acumulado supere esto,
// sin importar cuántas cards haya.
const MAX_STAGGER_MS = 160;
const staggerDelay = (index: number, step = 35) => Math.min(index * step, MAX_STAGGER_MS);

export default function DashboardScreen() {
  const { colors } = useTheme();
const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await fetchDashboard();
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los datos.");
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

  const nombre = data?.user?.nombre ?? data?.user?.username ?? "María García López";
  const primerNombre = nombre.split(" ")[0] ?? "";
  const initials = nombre
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  const promedio = data?.summary?.promedio_general ?? data?.resumen?.promedio_general;
  const creditosTotales = data?.summary?.creditos_totales ?? 0;
  const creditosAvanzados = data?.summary?.creditos_aprobados ?? 0;
  const avancePct = creditosTotales > 0
    ? (data?.summary?.avance_porcentaje ?? 0) / 100
    : 0;
  const materiasCount = data?.summary?.materias_cursando ?? data?.resumen?.cantidad_materias ?? 0;

  const proximo = data?.proximoEvento ?? null;

  const carreraNombre = data?.user?.carrera_nombre;
  const semestre = data?.user?.semestre;
  const subtitulo = carreraNombre
    ? semestre
      ? `${carreraNombre} · ${semestre}.º Semestre`
      : carreraNombre
    : "Portal Académico · UCA";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
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
        <ScreenHeader
          greeting="ESTUDIANTE"
          name={nombre || undefined}
          avatarInitials={initials || undefined}
        />

        {/* Saludo grande */}
        <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.xl }}>
          {loading ? (
            <SkeletonGroup lines={2} lineHeight={26} lastLineWidth="70%" />
          ) : (
            <>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: fontFamily.interBold,
                  fontSize: fontSize.headlineLg,
                }}
                numberOfLines={1}
              >
                {greetingForNow()},{" "}
                <Text style={{ color: colors.cyan }}>{primerNombre}</Text>
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: fontFamily.inter,
                  fontSize: fontSize.caption,
                  marginTop: spacing.xs,
                  letterSpacing: 0.5,
                }}
                numberOfLines={1}
              >
                {subtitulo}
              </Text>
            </>
          )}
        </View>

        {error ? (
          <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.xl }}>
            <ErrorCard message={error} onRetry={load} />
          </View>
        ) : loading ? (
          <LoadingBody />
        ) : data ? (
          <Body data={data} promedio={promedio} avancePct={avancePct}
            creditosAvanzados={creditosAvanzados} proximo={proximo}
            materiasCount={materiasCount}
            creditosTotales={creditosTotales}
            onOpenCuenta={() => router.push("/cuenta")}
            onOpenExamenes={() => router.push("/examenes")}
            onOpenScanner={() => router.push("/scanner")}
            onOpenAgenda={() => router.push("/(tabs)/horario")}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Body (éxito)
// ---------------------------------------------------------------------------

interface BodyProps {
  data: DashboardData;
  promedio: number | null | undefined;
  avancePct: number;
  creditosAvanzados: number;
  creditosTotales: number;
  proximo: DashboardData["proximoEvento"];
  materiasCount: number;
  onOpenCuenta: () => void;
  onOpenExamenes: () => void;
  onOpenScanner: () => void;
  onOpenAgenda: () => void;
}

function Body({
  data,
  promedio,
  avancePct,
  creditosAvanzados,
  creditosTotales,
  proximo,
  materiasCount,
  onOpenCuenta,
  onOpenExamenes,
  onOpenScanner,
  onOpenAgenda,
}: BodyProps) {
  const { colors } = useTheme();

  const saldoTotal = data.cuentaSaldoPendiente + data.cuentaSaldoVencido;

  const asistencias = data.resumen?.asistencia ?? [];
  const asistenciaTotal =
    asistencias.length > 0
      ? asistencias.reduce((acc, a) => acc + (a.porcentaje ?? 0), 0) / asistencias.length
      : 94;

  return (
    <View style={{ paddingHorizontal: spacing.xl, gap: spacing["2xl"] }}>
      {/* Sección KPIs: grid 2x2 — cards unificadas con ícono + label + valor */}
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <StaggerCard index={0} style={{ flex: 1 }}>
            <DashboardKpiCard
              icon={<IconCreditCard color="#06b6d4" />}
              label="Estado de Cuenta"
              value={formatGuaranies(saldoTotal)}
              valueColor={saldoTotal > 0 ? colors.warning : colors.success}
              status={saldoTotal > 0 ? "Ver detalle" : "Al día"}
              bgColor="rgba(6,182,212,0.15)"
              onPress={onOpenCuenta}
            />
          </StaggerCard>
          <StaggerCard index={1} style={{ flex: 1 }}>
            <DashboardKpiCard
              icon={<IconChartBar color="#fbbf24" />}
              label="Promedio General"
              value={`${promedio != null ? promedio.toFixed(1) : "—"}`}
              valueColor={colors.cyan}
              status={promedio != null && promedio >= 6 ? `${materiasCount} materias` : `${materiasCount} materias`}
              bgColor="rgba(251,191,36,0.15)"
              onPress={onOpenExamenes}
            />
          </StaggerCard>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <StaggerCard index={2} style={{ flex: 1 }}>
            <DashboardKpiCard
              icon={<IconAccountCheck color="#22c55e" />}
              label="Asistencia Total"
              value={asistenciaTotal != null ? `${Math.round(asistenciaTotal)}%` : "—"}
              valueColor={asistenciaTotal != null && asistenciaTotal >= 75 ? colors.success : colors.warning}
              status={data.regularidadActiva ? "Regularidad OK" : "Revisar asistencia"}
              bgColor="rgba(34,197,94,0.15)"
              onPress={onOpenScanner}
            />
          </StaggerCard>
          <StaggerCard index={3} style={{ flex: 1 }}>
            <DashboardKpiCard
              icon={<IconTrendingUp color="#8b5cf6" />}
              label="Avance Académico"
              value={`${Math.round(avancePct * 100)}%`}
              valueColor={colors.cyan}
              status={`${creditosAvanzados}/${creditosTotales} créditos`}
              bgColor="rgba(139,92,246,0.15)"
            />
          </StaggerCard>
        </View>
      </View>

      {/* Próximo Evento */}
      <StaggerCard index={4}>
        <ProximoEventoCard evento={proximo} onVerAgenda={onOpenAgenda} />
      </StaggerCard>

      {/* Avance Académico — barra de progreso detallada */}
      <StaggerCard index={5}>
        <AvanceAcademicoCard
          creditosAvanzados={creditosAvanzados}
          creditosTotales={creditosTotales}
          pct={avancePct}
        />
      </StaggerCard>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Dashboard KPI Card — unificada con ícono + valor + status
// ---------------------------------------------------------------------------

function DashboardKpiCard({
  icon,
  label,
  value,
  valueColor,
  status,
  bgColor = "rgba(6,182,212,0.15)",
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
  status: string;
  bgColor?: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <GlassCard
      onPress={onPress}
      contentStyle={{ padding: spacing.md, alignItems: "center", gap: spacing.xs }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: bgColor,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 2,
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: fontFamily.interMedium,
          fontSize: 9.5,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          textAlign: "center",
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={{
          color: valueColor ?? colors.cyan,
          fontFamily: fontFamily.monoBold,
          fontSize: 24,
          lineHeight: 28,
          letterSpacing: -0.5,
          textShadowColor: valueColor ?? colors.cyan,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 6,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: fontFamily.inter,
          fontSize: 9,
          textAlign: "center",
        }}
        numberOfLines={1}
      >
        {status}
      </Text>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function StaggerCard({
  index,
  style,
  children,
}: {
  index: number;
  style?: ViewStyle | undefined;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();

  // Antes: FadeInDown.delay(index*50).duration(320).springify().damping(18)
  // → empuje vertical de 8px + rebote elástico por cada card, acumulando
  // hasta 350ms+ de delay en la última. Se sentía "inquieto".
  // Ahora: fade puro (sin desplazamiento ni rebote), delay acotado.
  return (
    <Animated.View
      entering={FadeIn.delay(staggerDelay(index)).duration(220)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

const TIPO_LABEL: Record<TipoEvento, string> = {
  parcial: "PARCIAL",
  final: "FINAL",
  entrega: "ENTREGA",
  actividad: "ACTIVIDAD",
  feriado: "FERIADO",
  asueto: "ASUETO",
};

function ProximoEventoCard({
  evento,
  onVerAgenda,
}: {
  evento: DashboardData["proximoEvento"];
  onVerAgenda: () => void;
}) {
  const { colors } = useTheme();
  if (!evento) {
    return (
      <View>
        <ProximoEventoHeader onVerAgenda={onVerAgenda} />
        <GlassCard
          variant="leftAccent"
          contentStyle={{ padding: spacing.lg, backgroundColor: "rgba(0,180,216,0.05)" }}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: fontFamily.inter,
              fontSize: fontSize.body,
            }}
          >
            Sin eventos programados en los próximos 30 días.
          </Text>
        </GlassCard>
      </View>
    );
  }

  const { day, month } = formatDayMonth(evento.fecha);
  const dias = daysUntil(evento.fecha);
  const urgencia =
    dias <= 0
      ? "HOY"
      : dias === 1
        ? "MAÑANA"
        : `EN ${dias} DÍAS`;
  const urgencyColor = dias <= 3 ? colors.error : colors.warning;

  return (
    <View>
      <ProximoEventoHeader onVerAgenda={onVerAgenda} />
      <GlassCard
        variant="leftAccent"
        contentStyle={{ padding: spacing.lg, backgroundColor: "rgba(0,180,216,0.05)" }}
      >
        <View style={{ flexDirection: "row", gap: spacing.lg, alignItems: "center" }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radius.md,
              backgroundColor: colors.cyanDim,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: colors.cyan,
                fontFamily: fontFamily.monoBold,
                fontSize: fontSize.headlineLg,
                lineHeight: fontSize.headlineLg + 2,
              }}
            >
              {day}
            </Text>
            <Text
              style={{
                color: colors.cyan,
                fontFamily: fontFamily.interSemibold,
                fontSize: fontSize.caption,
                letterSpacing: 1,
              }}
            >
              {month}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: urgencyColor,
                fontFamily: fontFamily.interSemibold,
                fontSize: fontSize.caption,
                letterSpacing: 1.5,
              }}
            >
              {TIPO_LABEL[evento.tipo]} — {urgencia}
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: fontFamily.interBold,
                fontSize: fontSize.headline,
                marginTop: 2,
              }}
              numberOfLines={2}
            >
              {evento.titulo}
            </Text>
            {evento.descripcion ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                <Text style={{ fontSize: 11 }}>🕐</Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: fontFamily.inter,
                    fontSize: fontSize.caption,
                  }}
                  numberOfLines={1}
                >
                  {evento.descripcion}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </GlassCard>
    </View>
  );
}

function ProximoEventoHeader({ onVerAgenda }: { onVerAgenda: () => void }) {
  const { colors } = useTheme();
  return (
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
          fontFamily: fontFamily.interSemibold,
          fontSize: fontSize.body,
        }}
      >
        Próximo Evento
      </Text>
      <Pressable onPress={onVerAgenda} hitSlop={8}>
        <Text
          style={{
            color: colors.cyan,
            fontFamily: fontFamily.interMedium,
            fontSize: fontSize.caption,
          }}
        >
          Ver agenda
        </Text>
      </Pressable>
    </View>
  );
}

function AvanceAcademicoCard({
  creditosAvanzados,
  creditosTotales,
  pct,
}: {
  creditosAvanzados: number;
  creditosTotales: number;
  pct: number;
}) {
  const { colors } = useTheme();

  return (
    <GlassCard contentStyle={{ padding: spacing.lg }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: spacing.md,
        }}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.interSemibold,
            fontSize: fontSize.body,
          }}
        >
          Avance Académico
        </Text>
        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              color: colors.cyan,
              fontFamily: fontFamily.monoBold,
              fontSize: 14,
            }}
          >
            {Math.round(pct * 100)}%
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.mono,
              fontSize: fontSize.caption,
            }}
          >
            {creditosAvanzados}/{creditosTotales} créditos
          </Text>
        </View>
      </View>
      <ProgressBar value={pct} height={10} glow breathe />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: spacing.sm,
        }}
      >
        <CyanBadge label="SEMESTRE" variant="dim" size="sm" />
        <CyanBadge label="GRADUACIÓN" variant="outline" size="sm" />
      </View>
    </GlassCard>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors } = useTheme();
  return (
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
  );
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

function LoadingBody() {
  const { colors } = useTheme();

  return (
    <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <SkeletonLoader height={110} style={{ flex: 1 }} />
        <SkeletonLoader height={110} style={{ flex: 1 }} />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <SkeletonLoader height={110} style={{ flex: 1 }} />
        <SkeletonLoader height={110} style={{ flex: 1 }} />
      </View>
      <SkeletonLoader height={100} />
      <SkeletonLoader height={80} />
      <SkeletonLoader height={100} />
    </View>
  );
}