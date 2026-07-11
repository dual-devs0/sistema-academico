import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { GlassCard } from "../../components/ui/GlassCard";
import { DonutChart } from "../../components/ui/DonutChart";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import { CyanBadge } from "../../components/ui/CyanBadge";
import {
  colors,
  fontFamily,
  fontSize,
  radius,
  spacing,
} from "../../constants/design";
import {
  fetchNotasCompleto,
  type MateriaCard,
} from "../../services/notasService";

/**
 * Detalle de materia.
 *
 * Datos: reuso `fetchNotasCompleto()` y filtro por id — evita agregar un
 * endpoint dedicado (backend no lo expone). Menos latencia en navegación
 * secuencial si React Query se agrega después (cache compartida).
 *
 * Layout:
 * - Header con back arrow + nombre materia.
 * - DonutChart 160px de asistencia.
 * - 4 rows de desglose con peso, nota, y ProgressBar por componente.
 * - Stats: total_clases / presentes / ausentes.
 */
export default function CursoDetalle() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const materiaId = parseInt(String(params.id ?? "0"), 10);

  const [materia, setMateria] = useState<MateriaCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await fetchNotasCompleto();
      const found = d.materias.find((m) => m.materiaId === materiaId) ?? null;
      setMateria(found);
      if (!found) setError("Materia no encontrada.");
    } catch {
      setError("No se pudo cargar la materia.");
    }
  }, [materiaId]);

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
        title={materia?.nombre ?? "Materia"}
        hideBell
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing["3xl"],
          gap: spacing.lg,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.cyan}
          />
        }
      >
        {loading ? (
          <LoadingBody />
        ) : error ? (
          <ErrorBody message={error} onRetry={load} />
        ) : materia ? (
          <>
            <IdentityCard materia={materia} />
            <AsistenciaCard materia={materia} />
            <DesgloseCard materia={materia} />
            <StatsCard materia={materia} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function IdentityCard({ materia }: { materia: MateriaCard }) {
  return (
    <Animated.View entering={FadeInDown.duration(280)}>
      <GlassCard variant="accent" contentStyle={{ padding: spacing.lg }}>
        {materia.profesor ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.interMedium,
              fontSize: fontSize.caption,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            Profesor · {materia.profesor}
          </Text>
        ) : null}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            marginTop: spacing.sm,
            flexWrap: "wrap",
          }}
        >
          {materia.anio != null ? (
            <CyanBadge label={`AÑO ${materia.anio}`} variant="outline" size="sm" />
          ) : null}
          {materia.semestre != null ? (
            <CyanBadge
              label={`${materia.semestre}º SEMESTRE`}
              variant="dim"
              size="sm"
            />
          ) : null}
        </View>
      </GlassCard>
    </Animated.View>
  );
}

function AsistenciaCard({ materia }: { materia: MateriaCard }) {
  const pct = materia.asistenciaPct ?? 0;
  const value = pct / 100;
  const label =
    materia.asistenciaPct == null
      ? "Sin registros"
      : pct >= 75
        ? "Regularidad OK"
        : pct >= 50
          ? "En riesgo"
          : "Crítica";
  const color =
    materia.asistenciaPct == null
      ? colors.textSecondary
      : pct >= 75
        ? colors.success
        : pct >= 50
          ? colors.warning
          : colors.error;

  return (
    <Animated.View entering={FadeInDown.delay(60).duration(280)}>
      <GlassCard contentStyle={{ padding: spacing.lg, alignItems: "center" }}>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: fontFamily.interMedium,
            fontSize: fontSize.caption,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginBottom: spacing.md,
          }}
        >
          Asistencia
        </Text>
        <DonutChart
          value={value}
          size={160}
          strokeWidth={12}
          thresholdColor
          showLabel
        />
        <Text
          style={{
            color,
            fontFamily: fontFamily.interSemibold,
            fontSize: fontSize.body,
            marginTop: spacing.md,
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Text>
      </GlassCard>
    </Animated.View>
  );
}

function DesgloseCard({ materia }: { materia: MateriaCard }) {
  return (
    <Animated.View entering={FadeInDown.delay(120).duration(280)}>
      <GlassCard contentStyle={{ padding: spacing.lg }}>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: fontFamily.interMedium,
            fontSize: fontSize.caption,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginBottom: spacing.md,
          }}
        >
          Componentes de nota
        </Text>
        <View style={{ gap: spacing.md }}>
          {materia.desglose.map((d) => (
            <View key={d.tipo}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: spacing.xs,
                }}
              >
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontFamily: fontFamily.interMedium,
                    fontSize: fontSize.body,
                  }}
                >
                  {d.label}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing.sm }}>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontFamily: fontFamily.mono,
                      fontSize: fontSize.caption,
                    }}
                  >
                    {`${Math.round(d.peso * 100)}%`}
                  </Text>
                  <Text
                    style={{
                      color: d.nota != null ? colors.cyan : colors.textSecondary,
                      fontFamily: fontFamily.monoBold,
                      fontSize: fontSize.bodyLg,
                      minWidth: 44,
                      textAlign: "right",
                    }}
                  >
                    {d.nota != null ? d.nota.toFixed(1) : "—"}
                  </Text>
                </View>
              </View>
              <ProgressBar
                value={d.nota != null ? d.nota / 5 : 0}
                height={4}
                glow={false}
                bgColor="rgba(255,255,255,0.05)"
              />
            </View>
          ))}
        </View>
        {materia.promedio != null ? (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: spacing.lg,
              paddingTop: spacing.md,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.textSecondary,
                fontFamily: fontFamily.interMedium,
                fontSize: fontSize.caption,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              Promedio
            </Text>
            <Text
              style={{
                color: colors.cyan,
                fontFamily: fontFamily.monoBold,
                fontSize: fontSize.headline,
              }}
            >
              {materia.promedio.toFixed(2)}
            </Text>
          </View>
        ) : null}
      </GlassCard>
    </Animated.View>
  );
}

function StatsCard({ materia }: { materia: MateriaCard }) {
  const ausentes = Math.max(0, materia.totalClases - materia.presentes);
  return (
    <Animated.View entering={FadeInDown.delay(180).duration(280)}>
      <GlassCard contentStyle={{ padding: spacing.lg }}>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: fontFamily.interMedium,
            fontSize: fontSize.caption,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginBottom: spacing.md,
          }}
        >
          Estadísticas
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <StatCol label="TOTAL" value={String(materia.totalClases)} color={colors.textPrimary} />
          <StatCol label="PRESENTES" value={String(materia.presentes)} color={colors.success} />
          <StatCol label="AUSENTES" value={String(ausentes)} color={colors.error} />
        </View>
      </GlassCard>
    </Animated.View>
  );
}

function StatCol({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: fontFamily.interMedium,
          fontSize: fontSize.caption,
          letterSpacing: 1.5,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color,
          fontFamily: fontFamily.monoBold,
          fontSize: fontSize.headlineLg,
          marginTop: 2,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Loading / error
// ---------------------------------------------------------------------------

function LoadingBody() {
  return (
    <View style={{ gap: spacing.md }}>
      <SkeletonLoader height={64} />
      <SkeletonLoader height={220} />
      <SkeletonLoader height={220} />
      <SkeletonLoader height={80} />
    </View>
  );
}

function ErrorBody({ message, onRetry }: { message: string; onRetry: () => void }) {
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
