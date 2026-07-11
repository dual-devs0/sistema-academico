import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { GlassCard } from "../../components/ui/GlassCard";
import { CyanBadge } from "../../components/ui/CyanBadge";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import {
  colors,
  fontFamily,
  fontSize,
  radius,
  spacing,
} from "../../constants/design";
import {
  fetchNotasCompleto,
  filterBySemestre,
  computePromedioSemestre,
  type MateriaCard,
  type NotasCompleto,
} from "../../services/notasService";

/**
 * Pantalla Notas (Calificaciones).
 *
 * Estructura:
 *   ┌────────────────────────────────────────┐
 *   │ Header ScreenHeader (avatar+bell)      │
 *   │ Título "Mis Calificaciones" + Badge    │
 *   │ Chips 1 SEM · 2 SEM · 3 SEM · 4 SEM    │
 *   │ FlashList<MateriaRow>                  │
 *   │   ▶ Materia · asistencia · nota → tap  │
 *   │       (expand) Parcial 1 · 2 · TP · F  │
 *   │ Footer: PROMEDIO ANUAL                 │
 *   └────────────────────────────────────────┘
 */
export default function NotasScreen() {
  const [data, setData] = useState<NotasCompleto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [semestre, setSemestre] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await fetchNotasCompleto();
      setData(d);
      // Auto-seleccionar el último semestre disponible al primer load.
      if (d.semestresDisponibles.length > 0 && semestre == null) {
        setSemestre(d.semestresDisponibles[d.semestresDisponibles.length - 1]);
      }
    } catch {
      setError("No se pudieron cargar las calificaciones.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const materiasFiltradas = useMemo(
    () => (data ? filterBySemestre(data.materias, semestre) : []),
    [data, semestre],
  );
  const promSemestre = useMemo(
    () => (data ? computePromedioSemestre(data.materias, semestre) : null),
    [data, semestre],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScreenHeader
        greeting="MIS DATOS ACADÉMICOS"
        name="Alumno"
        avatarInitials="AL"
      />

      <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.md }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: fontFamily.interBold,
              fontSize: fontSize.headlineLg,
            }}
            numberOfLines={1}
          >
            Mis Calificaciones
          </Text>
          <CyanBadge label={`${new Date().getFullYear()}`} variant="outline" size="sm" />
        </View>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: fontFamily.inter,
            fontSize: fontSize.caption,
            marginTop: spacing.xs,
          }}
        >
          Semestre {semestre ?? "—"} · Año {new Date().getFullYear()}
        </Text>
      </View>

      {loading ? (
        <LoadingBody />
      ) : error ? (
        <ErrorBody message={error} onRetry={load} />
      ) : (
        <>
          <SemestreChips
            disponibles={data?.semestresDisponibles ?? []}
            selected={semestre}
            onSelect={setSemestre}
          />

          <View style={{ flex: 1, paddingHorizontal: spacing.xl }}>
            <FlashList
              data={materiasFiltradas}
              extraData={expanded}
              keyExtractor={(m) => String(m.materiaId)}
              renderItem={({ item }: ListRenderItemInfo<MateriaCard>) => (
                <MateriaRow
                  materia={item}
                  expanded={expanded === item.materiaId}
                  onToggle={() =>
                    setExpanded((prev) => (prev === item.materiaId ? null : item.materiaId))
                  }
                />
              )}
              ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
              ListEmptyComponent={<EmptyBody semestre={semestre} />}
              ListFooterComponent={
                materiasFiltradas.length > 0 ? (
                  <PromedioFooter
                    promedio={promSemestre}
                    materias={materiasFiltradas.length}
                    promedioAnual={data?.promedioAnual ?? null}
                  />
                ) : null
              }
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.cyan}
                />
              }
              contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Semestre chips
// ---------------------------------------------------------------------------

function SemestreChips({
  disponibles,
  selected,
  onSelect,
}: {
  disponibles: number[];
  selected: number | null;
  onSelect: (s: number) => void;
}) {
  if (disponibles.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        gap: spacing.sm,
      }}
    >
      {disponibles.map((s) => {
        const active = s === selected;
        return (
          <Pressable
            key={s}
            onPress={() => onSelect(s)}
            style={({ pressed }) => ({
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
              borderRadius: radius.pill,
              backgroundColor: active ? colors.cyan : colors.glassBg,
              borderWidth: 1,
              borderColor: active ? colors.cyan : colors.border,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text
              style={{
                color: active ? "#0a0e17" : colors.textPrimary,
                fontFamily: active ? fontFamily.interSemibold : fontFamily.interMedium,
                fontSize: fontSize.caption,
                letterSpacing: 1,
              }}
            >
              {`${s} SEM`}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Materia row
// ---------------------------------------------------------------------------

function MateriaRow({
  materia,
  expanded,
  onToggle,
}: {
  materia: MateriaCard;
  expanded: boolean;
  onToggle: () => void;
}) {
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withTiming(expanded ? 90 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, rotation]);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const notaColor =
    materia.promedio == null
      ? colors.textSecondary
      : materia.promedio >= 3.5
        ? colors.cyan
        : materia.promedio >= 2.5
          ? colors.warning
          : colors.error;

  const asisColor =
    materia.asistenciaPct == null
      ? colors.textSecondary
      : materia.asistenciaPct >= 75
        ? colors.success
        : materia.asistenciaPct >= 50
          ? colors.warning
          : colors.error;

  return (
    <GlassCard onPress={onToggle} contentStyle={{ padding: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: fontFamily.interSemibold,
              fontSize: fontSize.body,
            }}
            numberOfLines={2}
          >
            {materia.nombre}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              marginTop: 2,
            }}
          >
            <Text
              style={{
                color: asisColor,
                fontFamily: fontFamily.monoMedium,
                fontSize: fontSize.caption,
              }}
            >
              {materia.asistenciaPct != null
                ? `Asistencia ${materia.asistenciaPct.toFixed(0)}%`
                : "Sin registros"}
            </Text>
            {materia.profesor ? (
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: fontFamily.inter,
                  fontSize: fontSize.caption,
                }}
                numberOfLines={1}
              >
                · {materia.profesor}
              </Text>
            ) : null}
          </View>
        </View>

        <Text
          style={{
            color: notaColor,
            fontFamily: fontFamily.monoBold,
            fontSize: fontSize.numeric,
            lineHeight: fontSize.numeric + 2,
            minWidth: 72,
            textAlign: "right",
          }}
        >
          {materia.promedio != null ? materia.promedio.toFixed(1) : "—"}
        </Text>

        <Animated.View style={chevronStyle}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.headline,
            }}
          >
            ›
          </Text>
        </Animated.View>
      </View>

      {expanded ? (
        <Animated.View
          entering={FadeInDown.duration(240).easing(Easing.out(Easing.cubic))}
          style={{
            marginTop: spacing.lg,
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            gap: spacing.sm,
          }}
        >
          {materia.desglose.map((d) => (
            <View
              key={d.tipo}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
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
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
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
          ))}
        </Animated.View>
      ) : null}
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function PromedioFooter({
  promedio,
  materias,
  promedioAnual,
}: {
  promedio: number | null;
  materias: number;
  promedioAnual: number | null;
}) {
  return (
    <View style={{ marginTop: spacing.xl }}>
      <GlassCard variant="accent" contentStyle={{ padding: spacing.xl, alignItems: "center" }}>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: fontFamily.interMedium,
            fontSize: fontSize.caption,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          Promedio del semestre
        </Text>
        <Text
          style={{
            color: colors.cyan,
            fontFamily: fontFamily.monoBold,
            fontSize: fontSize.numericLg,
            lineHeight: fontSize.numericLg + 2,
            marginTop: spacing.sm,
          }}
        >
          {promedio != null ? promedio.toFixed(2) : "—"}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: fontFamily.inter,
            fontSize: fontSize.caption,
            marginTop: spacing.xs,
          }}
        >
          {`Calculado sobre ${materias} materia${materias === 1 ? "" : "s"}`}
        </Text>

        {promedioAnual != null ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              marginTop: spacing.lg,
              paddingTop: spacing.md,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              width: "100%",
              justifyContent: "center",
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
              Anual
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: fontFamily.monoBold,
                fontSize: fontSize.headline,
              }}
            >
              {promedioAnual.toFixed(2)}
            </Text>
          </View>
        ) : null}
      </GlassCard>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Loading / error / empty
// ---------------------------------------------------------------------------

function LoadingBody() {
  return (
    <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
      <View style={{ flexDirection: "row", gap: spacing.sm, marginVertical: spacing.md }}>
        <SkeletonLoader width={64} height={30} radius={16} />
        <SkeletonLoader width={64} height={30} radius={16} />
        <SkeletonLoader width={64} height={30} radius={16} />
        <SkeletonLoader width={64} height={30} radius={16} />
      </View>
      {[0, 1, 2, 3].map((i) => (
        <SkeletonLoader key={i} height={72} />
      ))}
    </View>
  );
}

function ErrorBody({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
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

function EmptyBody({ semestre }: { semestre: number | null }) {
  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <GlassCard contentStyle={{ padding: spacing["2xl"], alignItems: "center" }}>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: fontFamily.interMedium,
            fontSize: fontSize.caption,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginBottom: spacing.sm,
          }}
        >
          Sin materias
        </Text>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.inter,
            fontSize: fontSize.body,
            textAlign: "center",
          }}
        >
          {semestre != null
            ? `No hay materias registradas en el semestre ${semestre}.`
            : "No hay materias registradas todavía."}
        </Text>
      </GlassCard>
    </Animated.View>
  );
}
