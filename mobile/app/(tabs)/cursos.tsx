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
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { GlassCard } from "../../components/ui/GlassCard";
import { DonutChart } from "../../components/ui/DonutChart";
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
  type MateriaCard,
  type NotasCompleto,
} from "../../services/notasService";
import { fetchPerfil, type UserInfo } from "../../services/dashboardService";

/**
 * Pantalla Cursos (2.º tab) — grid 2 columnas de materias del alumno.
 *
 * Reemplaza la vieja pantalla "Notas" (lista) por el diseño del boceto:
 * grid 2 col con DonutChart de asistencia + puntos acumulados por card.
 * El detalle (desglose de notas, asistencia grande) vive en
 * `app/cursos/[id].tsx` — ruta top-level fuera del grupo de tabs,
 * llega vía `router.push`.
 *
 * - Selector carrera (pill glass): hoy solo se muestra la del alumno
 *   (backend no expone múltiples carreras por alumno) — pill informativa.
 * - Selector de semestre: horizontal scroll de chips.
 */
export default function CursosTab() {
  const router = useRouter();
  const [data, setData] = useState<NotasCompleto | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [semestre, setSemestre] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [n, u] = await Promise.all([
        fetchNotasCompleto(),
        fetchPerfil().catch(() => null),
      ]);
      setData(n);
      setUser(u);
      if (n.semestresDisponibles.length > 0 && semestre == null) {
        setSemestre(n.semestresDisponibles[n.semestresDisponibles.length - 1]);
      }
    } catch {
      setError("No se pudieron cargar los cursos.");
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

  const materias = useMemo(
    () => (data ? filterBySemestre(data.materias, semestre) : []),
    [data, semestre],
  );

  const nombre = user?.nombre ?? user?.username;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScreenHeader title="Cursos" name={nombre} />

      {loading ? (
        <LoadingBody />
      ) : error ? (
        <ErrorBody message={error} onRetry={load} />
      ) : (
        <>
          <CarreraPill carreraId={user?.carrera_id ?? null} />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: spacing.xl,
              marginTop: spacing.lg,
              marginBottom: spacing.md,
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
              numberOfLines={1}
            >
              Visualizando: {semestre != null ? `${semestre}º Semestre` : "—"}
              {semestre != null &&
              data?.semestresDisponibles[data.semestresDisponibles.length - 1] === semestre
                ? " (Actual)"
                : ""}
            </Text>
          </View>

          <SemestreChips
            disponibles={data?.semestresDisponibles ?? []}
            selected={semestre}
            onSelect={setSemestre}
          />

          <View style={{ flex: 1, paddingHorizontal: spacing.md }}>
            <FlashList
              data={materias}
              numColumns={2}
              keyExtractor={(m) => String(m.materiaId)}
              renderItem={({ item, index }: ListRenderItemInfo<MateriaCard>) => (
                <View style={{ flex: 1, padding: spacing.xs }}>
                  <Animated.View entering={FadeInDown.delay(index * 40).duration(280)}>
                    <MateriaGridCard
                      materia={item}
                      onPress={() =>
                        router.push({ pathname: "/cursos/[id]", params: { id: String(item.materiaId) } })
                      }
                    />
                  </Animated.View>
                </View>
              )}
              ListEmptyComponent={<EmptyBody semestre={semestre} />}
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
// Carrera pill
// ---------------------------------------------------------------------------

function CarreraPill({ carreraId }: { carreraId: number | null }) {
  return (
    <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.md }}>
      <View
        style={{
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          backgroundColor: colors.glassBg,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        }}
      >
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.cyan,
          }}
        />
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.interSemibold,
            fontSize: fontSize.caption,
            letterSpacing: 0.5,
          }}
        >
          {carreraId != null ? `Carrera #${carreraId}` : "Sin carrera asignada"}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: fontSize.body,
          }}
        >
          ›
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Chips semestre
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
        paddingBottom: spacing.md,
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
// Grid card
// ---------------------------------------------------------------------------

function MateriaGridCard({
  materia,
  onPress,
}: {
  materia: MateriaCard;
  onPress: () => void;
}) {
  const puntos = materia.desglose.reduce(
    (acc, d) => acc + (d.nota != null ? d.nota * d.peso : 0),
    0,
  );

  return (
    <GlassCard
      onPress={onPress}
      contentStyle={{ padding: spacing.md, alignItems: "center", minHeight: 190 }}
    >
      <Text
        style={{
          color: colors.cyan,
          fontFamily: fontFamily.interSemibold,
          fontSize: fontSize.caption,
          letterSpacing: 0.5,
          minHeight: 32,
          textAlign: "center",
        }}
        numberOfLines={2}
      >
        {materia.nombre}
      </Text>
      <DonutChart
        value={materia.asistenciaPct ?? 0}
        max={100}
        size={84}
        strokeWidth={7}
        thresholdColor
        style={{ marginTop: spacing.sm }}
      />
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: fontFamily.mono,
          fontSize: fontSize.caption,
          marginTop: spacing.sm,
        }}
      >
        {puntos > 0 ? `${puntos.toFixed(1)} puntos` : "Sin puntaje"}
      </Text>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Empty / loading / error
// ---------------------------------------------------------------------------

function EmptyBody({ semestre }: { semestre: number | null }) {
  return (
    <View style={{ padding: spacing.xl }}>
      <GlassCard contentStyle={{ padding: spacing.lg, alignItems: "center" }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.inter,
            fontSize: fontSize.body,
            textAlign: "center",
          }}
        >
          {semestre != null
            ? `No hay materias en el semestre ${semestre}.`
            : "No hay materias registradas todavía."}
        </Text>
      </GlassCard>
    </View>
  );
}

function LoadingBody() {
  return (
    <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md, marginTop: spacing.md }}>
      <SkeletonLoader height={36} width="60%" radius={18} />
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {[0, 1, 2, 3].map((i) => (
          <SkeletonLoader key={i} width={64} height={30} radius={16} />
        ))}
      </View>
      {[0, 1].map((row) => (
        <View key={row} style={{ flexDirection: "row", gap: spacing.md }}>
          <SkeletonLoader height={190} style={{ flex: 1 }} />
          <SkeletonLoader height={190} style={{ flex: 1 }} />
        </View>
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
