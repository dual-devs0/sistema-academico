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
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { GlassCard } from "../../components/ui/GlassCard";
import { StatCard } from "../../components/ui/StatCard";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { CyanBadge } from "../../components/ui/CyanBadge";
import { SkeletonLoader, SkeletonGroup } from "../../components/ui/SkeletonLoader";
import {
  colors,
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

/**
 * Dashboard móvil — pantalla home post-login.
 *
 * Animación:
 * - Stagger fade-in de cards, 50ms de delay entre cada una (spec CLAUDE.md).
 *   Reanimated 4 layout animation: `FadeInDown.delay(i*50).duration(320)
 *   .easing(Easing.out(cubic))` — vertical push suave de 8px, no invasivo.
 *
 * Estados:
 * - loading: skeletons con misma altura que el contenido final para evitar
 *   layout shift.
 * - error: card glass con mensaje + botón "Reintentar".
 * - éxito con vacíos parciales: cada card renderiza su propio fallback
 *   ("Sin eventos programados", "Sin cuotas cargadas", etc.).
 */

// Créditos por semestre — aproximación. El backend todavía no expone
// avance real. TODO: reemplazar por endpoint de pensum cuando esté.
const CREDITOS_TOTALES = 240;

export default function DashboardScreen() {
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
    } catch {
      setError("No se pudo cargar el dashboard. Revisá tu conexión.");
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

  const nombre = data?.user?.nombre ?? data?.user?.username ?? "";
  const primerNombre = nombre.split(" ")[0] ?? "";
  const initials = nombre
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  const promedio = data?.resumen?.promedio_general;
  const creditosAvanzados = Math.min(
    CREDITOS_TOTALES,
    Math.round((data?.resumen?.cantidad_materias ?? 0) * 5),
  );
  const avancePct = creditosAvanzados / CREDITOS_TOTALES;

  const proximo = data?.proximoEvento ?? null;

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
              >
                {data?.user?.carrera_id != null
                  ? `Carrera #${data.user.carrera_id}`
                  : "Portal Académico · UCA"}
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
  proximo: DashboardData["proximoEvento"];
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
  proximo,
  onOpenCuenta,
  onOpenExamenes,
  onOpenScanner,
  onOpenAgenda,
}: BodyProps) {
  const cuentaLabel =
    data.cuentaSaldoVencido > 0
      ? "Con vencidos"
      : data.cuentaSaldoPendiente > 0
        ? "Pendiente"
        : data.cuentaHayCuotas
          ? "Al día"
          : "Sin cuotas";

  const cuentaValue =
    data.cuentaSaldoVencido > 0
      ? formatGuaranies(data.cuentaSaldoVencido)
      : data.cuentaSaldoPendiente > 0
        ? formatGuaranies(data.cuentaSaldoPendiente)
        : data.cuentaHayCuotas
          ? "OK"
          : "—";

  const cuentaColor =
    data.cuentaSaldoVencido > 0
      ? colors.error
      : data.cuentaSaldoPendiente > 0
        ? colors.warning
        : colors.success;

  const examenesInscriptos: number = 0; // TODO: endpoint de exámenes inscriptos

  const asistencias = data.resumen?.asistencia ?? [];
  const asistenciaTotal =
    asistencias.length > 0
      ? asistencias.reduce((acc, a) => acc + (a.porcentaje ?? 0), 0) / asistencias.length
      : null;

  return (
    <View style={{ paddingHorizontal: spacing.xl, gap: spacing["2xl"] }}>
      {/* Sección KPIs: grid 2x2 — gap interno 12px entre cards, la sección
          completa se separa 24px de la siguiente (gap del container padre). */}
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <StaggerCard index={0} style={{ flex: 1 }}>
            <QuickLinkCard
              glyph="💳"
              label="Estado de Cuenta"
              status={cuentaLabel}
              statusColor={cuentaColor}
              onPress={onOpenCuenta}
            />
          </StaggerCard>
          <StaggerCard index={1} style={{ flex: 1 }}>
            <QuickLinkCard
              glyph="📝"
              label="Exámenes"
              status={`${examenesInscriptos} inscripto${examenesInscriptos === 1 ? "" : "s"}`}
              statusColor={colors.cyan}
              onPress={onOpenExamenes}
            />
          </StaggerCard>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <StaggerCard index={2} style={{ flex: 1 }}>
            <StatCard
              label="PROMEDIO GRAL"
              value={promedio != null ? promedio.toFixed(2) : "—"}
              footer={
                data.resumen?.cantidad_materias
                  ? `${data.resumen.cantidad_materias} materias`
                  : "sin datos"
              }
            />
          </StaggerCard>
          <StaggerCard index={3} style={{ flex: 1 }}>
            <StatCard
              label="ASISTENCIA TOTAL"
              value={asistenciaTotal != null ? `${Math.round(asistenciaTotal)}%` : "—"}
              valueColor={
                asistenciaTotal == null
                  ? undefined
                  : asistenciaTotal >= 75
                    ? colors.textAccent
                    : colors.warning
              }
              footer={data.regularidadActiva ? "Regularidad OK" : "revisar asistencia"}
            />
          </StaggerCard>
        </View>
      </View>

      {/* Próximo Evento */}
      <StaggerCard index={4}>
        <ProximoEventoCard evento={proximo} onVerAgenda={onOpenAgenda} />
      </StaggerCard>

      {/* Asistencia rápida */}
      <StaggerCard index={5}>
        <AsistenciaRapidaCard onPress={onOpenScanner} />
      </StaggerCard>

      {/* Avance Académico */}
      <StaggerCard index={6}>
        <AvanceAcademicoCard
          creditosAvanzados={creditosAvanzados}
          creditosTotales={CREDITOS_TOTALES}
          pct={avancePct}
        />
      </StaggerCard>
    </View>
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
  style?: any;
  children: React.ReactNode;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(320).springify().damping(18)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

function QuickLinkCard({
  glyph,
  label,
  status,
  statusColor,
  onPress,
}: {
  glyph: string;
  label: string;
  status: string;
  statusColor: string;
  onPress: () => void;
}) {
  return (
    <GlassCard
      onPress={onPress}
      contentStyle={{ padding: spacing.lg, alignItems: "center" }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "rgba(0,180,216,0.12)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.sm,
        }}
      >
        <Text style={{ fontSize: fontSize.headline }}>{glyph}</Text>
      </View>
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: fontFamily.interSemibold,
          fontSize: fontSize.body,
          textAlign: "center",
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={{
          color: statusColor,
          fontFamily: fontFamily.monoMedium,
          fontSize: fontSize.caption,
          marginTop: 2,
        }}
        numberOfLines={1}
      >
        {status}
      </Text>
    </GlassCard>
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
        : dias <= 3
          ? `EN ${dias} DÍAS`
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
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: fontFamily.inter,
                  fontSize: fontSize.caption,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {evento.descripcion}
              </Text>
            ) : null}
          </View>
        </View>
      </GlassCard>
    </View>
  );
}

function ProximoEventoHeader({ onVerAgenda }: { onVerAgenda: () => void }) {
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

function AsistenciaRapidaCard({ onPress }: { onPress: () => void }) {
  return (
    <GlassCard contentStyle={{ padding: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.interMedium,
              fontSize: fontSize.caption,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            Asistencia Rápida
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: fontFamily.interSemibold,
              fontSize: fontSize.body,
              marginTop: spacing.xs,
            }}
          >
            Escaneá el QR del aula.
          </Text>
        </View>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => ({
            backgroundColor: colors.cyan,
            borderRadius: radius.md,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              color: "#0a0e17",
              fontFamily: fontFamily.interSemibold,
              fontSize: fontSize.caption,
              letterSpacing: 0.5,
            }}
          >
            Abrir Escáner
          </Text>
        </Pressable>
      </View>
    </GlassCard>
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
  return (
    <GlassCard contentStyle={{ padding: spacing.lg }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
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
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: fontFamily.mono,
            fontSize: fontSize.caption,
          }}
        >
          {Math.round(pct * 100)}% ({creditosAvanzados}/{creditosTotales} créditos)
        </Text>
      </View>
      <ProgressBar value={pct} height={8} glow breathe />
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
