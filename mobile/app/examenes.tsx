import { colors } from "../constants/design";
import { useTheme } from "../hooks/useTheme";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { GlassCard } from "../components/ui/GlassCard";
import { CyanBadge } from "../components/ui/CyanBadge";
import { SkeletonLoader } from "../components/ui/SkeletonLoader";
import {
  fontFamily,
  fontSize,
  radius,
  spacing,
} from "../constants/design";
import {
  fetchExamenesDisponibles,
  fetchExamenesInscriptos,
  inscribirseAExamen,
  cancelarInscripcion,
  turnosDelAnio,
  currentTurnoKey,
  type ExamenDisponible,
  type ExamenInscripto,
  type Turno,
} from "../services/examenesService";

/**
 * Pantalla Exámenes.
 *
 * Tabs Disponibles / Inscriptos.
 * - Disponibles: selector de periodo + cards con cupos + botón Inscribirse.
 * - Inscriptos: cards con opción de cancelar inscripción.
 */

type Tab = "disponibles" | "inscriptos";

export default function ExamenesScreen() {
  const { colors } = useTheme();
const router = useRouter();
  const [tab, setTab] = useState<Tab>("disponibles");
  const [periodo, setPeriodo] = useState<Turno>(currentTurnoKey());
  const [disponibles, setDisponibles] = useState<ExamenDisponible[]>([]);
  const [inscriptos, setInscriptos] = useState<ExamenInscripto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [d, i] = await Promise.all([
      fetchExamenesDisponibles(periodo),
      fetchExamenesInscriptos(),
    ]);
    setDisponibles(d);
    setInscriptos(i);
  }, [periodo]);

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

  const handleInscribirse = useCallback(async (examenId: number) => {
    const res = await inscribirseAExamen(examenId);
    if (res.ok) {
      Alert.alert("Inscripción confirmada", "Recibirás un email con los datos.");
      await load();
    } else {
      Alert.alert("No se pudo inscribir", res.error ?? "Intentá de nuevo más tarde.");
    }
  }, [load]);

  const handleCancelarInscripcion = useCallback(async (inscripcionId: number) => {
    Alert.alert(
      "Cancelar inscripción",
      "¿Estás seguro de que querés cancelar la inscripción a este examen?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Sí, cancelar",
          style: "destructive",
          onPress: async () => {
            const res = await cancelarInscripcion(inscripcionId);
            if (res.ok) {
              Alert.alert("Inscripción cancelada", "Se ha cancelado tu inscripción.");
              await load();
            } else {
              Alert.alert("Error", res.error ?? "No se pudo cancelar la inscripción.");
            }
          },
        },
      ],
    );
  }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScreenHeader
        showBack
        onBackPress={() => router.back()}
        title="Exámenes"
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
        ) : tab === "disponibles" ? (
          <DisponiblesTab
            examenes={disponibles}
            periodoActual={periodo}
            onPeriodoChange={setPeriodo}
            onInscribirse={handleInscribirse}
          />
        ) : (
          <InscriptosTab
            examenes={inscriptos}
            onCancelar={handleCancelarInscripcion}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Tabs / Chips
// ---------------------------------------------------------------------------

function TabPills({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: spacing.sm,
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.lg,
      }}
    >
      {(["disponibles", "inscriptos"] as const).map((t) => {
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
// Disponibles
// ---------------------------------------------------------------------------

function DisponiblesTab({
  examenes,
  periodoActual,
  onPeriodoChange,
  onInscribirse,
}: {
  examenes: ExamenDisponible[];
  periodoActual: Turno;
  onPeriodoChange: (t: Turno) => void;
  onInscribirse: (id: number) => void;
}) {
  const { colors } = useTheme();
  const anio = new Date().getFullYear();
  const periodos = turnosDelAnio(anio);

  return (
    <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: fontFamily.interMedium,
          fontSize: fontSize.caption,
          letterSpacing: 1.5,
          textTransform: "uppercase",
        }}
      >
        Periodo
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {periodos.map((t) => {
            const active = t.key === periodoActual;
            return (
              <Pressable
                key={t.key}
                onPress={() => onPeriodoChange(t.key)}
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
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {examenes.length === 0 ? (
        <SoonPlaceholder message="No hay exámenes disponibles para este periodo." />
      ) : (
        <Animated.View entering={FadeIn.duration(220)} style={{ gap: spacing.md }}>
          {examenes.map((e) => (
            <ExamenDisponibleCard
              key={e.id}
              examen={e}
              onInscribirse={() => onInscribirse(e.id)}
            />
          ))}
        </Animated.View>
      )}
    </View>
  );
}

function ExamenDisponibleCard({
  examen,
  onInscribirse,
}: {
  examen: ExamenDisponible;
  onInscribirse: () => void;
}) {
  const { colors } = useTheme();
  const cuposLlenos = examen.cupos_disponibles !== null && examen.cupos_disponibles <= 0;
  const puedeInscribirse = !examen.ya_inscripto && !cuposLlenos;

  return (
    <GlassCard contentStyle={{ padding: spacing.lg }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: spacing.sm,
        }}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.interSemibold,
            fontSize: fontSize.body,
            flex: 1,
            paddingRight: spacing.md,
          }}
          numberOfLines={2}
        >
          {examen.materia_nombre}
        </Text>
        <CyanBadge
          label={examen.ya_inscripto ? "INSCRIPTO" : cuposLlenos ? "SIN CUPOS" : "DISPONIBLE"}
          variant={examen.ya_inscripto ? "success" : cuposLlenos ? "error" : "outline"}
          size="sm"
        />
      </View>

      {examen.profesor_nombre && (
        <Text style={{
          color: colors.textSecondary,
          fontFamily: fontFamily.inter,
          fontSize: fontSize.caption,
          marginBottom: spacing.sm,
        }}>
          Prof. {examen.profesor_nombre}
        </Text>
      )}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: spacing.md,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Field label="FECHA" value={examen.fecha} />
        <Field label="HORA" value={examen.hora_inicio ?? "—"} />
        <Field label="AULA" value={examen.aula ?? "—"} />
      </View>

      {examen.cupos_disponibles !== null && (
        <Text
          style={{
            color: examen.cupos_disponibles <= 3 ? colors.warning : colors.textSecondary,
            fontFamily: fontFamily.interSemibold,
            fontSize: fontSize.caption,
            letterSpacing: 1.2,
            marginTop: spacing.md,
          }}
        >
          {examen.cupos_disponibles} cupo{examen.cupos_disponibles !== 1 ? "s" : ""} disponible{examen.cupos_disponibles !== 1 ? "s" : ""}
        </Text>
      )}

      <Pressable
        onPress={onInscribirse}
        disabled={!puedeInscribirse}
        style={({ pressed }) => ({
          marginTop: spacing.md,
          paddingVertical: spacing.md,
          borderRadius: radius.md,
          backgroundColor: puedeInscribirse ? colors.cyan : "rgba(255,255,255,0.08)",
          alignItems: "center",
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text
          style={{
            color: puedeInscribirse ? "#0a0e17" : colors.textSecondary,
            fontFamily: fontFamily.interSemibold,
            fontSize: fontSize.body,
          }}
        >
          {examen.ya_inscripto ? "Ya inscripto" : cuposLlenos ? "Sin cupos" : "Inscribirse"}
        </Text>
      </Pressable>
    </GlassCard>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <View>
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
          color: colors.textPrimary,
          fontFamily: fontFamily.mono,
          fontSize: fontSize.body,
          marginTop: 2,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Inscriptos
// ---------------------------------------------------------------------------

function InscriptosTab({
  examenes,
  onCancelar,
}: {
  examenes: ExamenInscripto[];
  onCancelar: (id: number) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
      {examenes.length === 0 ? (
        <SoonPlaceholder message="No estás inscripto en ningún examen." />
      ) : (
        <Animated.View entering={FadeIn.duration(220)} style={{ gap: spacing.md }}>
          {examenes.map((e) => (
            <ExamenInscriptoCard
              key={e.id}
              examen={e}
              onCancelar={() => onCancelar(e.id)}
            />
          ))}
        </Animated.View>
      )}
    </View>
  );
}

function ExamenInscriptoCard({
  examen,
  onCancelar,
}: {
  examen: ExamenInscripto;
  onCancelar: () => void;
}) {
  const { colors } = useTheme();

  const esActivo = examen.estado === "inscripto";
  return (
    <View
      style={{
        borderLeftWidth: 3,
        borderLeftColor: esActivo ? colors.success : colors.textSecondary,
        borderRadius: radius.md,
        overflow: "hidden",
      }}
    >
      <GlassCard contentStyle={{ padding: spacing.lg }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            marginBottom: spacing.xs,
          }}
        >
          <Text
            style={{
              color: esActivo ? colors.success : colors.textSecondary,
              fontFamily: fontFamily.interSemibold,
              fontSize: fontSize.caption,
              letterSpacing: 1.5,
            }}
          >
            {esActivo ? "INSCRIPTO" : "CANCELADO"}
          </Text>
        </View>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.interSemibold,
            fontSize: fontSize.body,
          }}
          numberOfLines={2}
        >
          {examen.materia_nombre}
        </Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: spacing.md,
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Field label="FECHA" value={examen.fecha} />
          <Field label="HORA" value={examen.hora_inicio ?? "—"} />
          <Field label="AULA" value={examen.aula ?? "—"} />
        </View>

        {esActivo && (
          <Pressable
            onPress={onCancelar}
            style={({ pressed }) => ({
              marginTop: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: "rgba(239,68,68,0.15)",
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.3)",
              alignItems: "center",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text
              style={{
                color: "#fca5a5",
                fontFamily: fontFamily.interSemibold,
                fontSize: fontSize.caption,
              }}
            >
              Cancelar inscripción
            </Text>
          </Pressable>
        )}
      </GlassCard>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Placeholder / loading
// ---------------------------------------------------------------------------

function SoonPlaceholder({ message }: { message: string }) {
  const { colors } = useTheme();

  return (
    <GlassCard contentStyle={{ padding: spacing.xl, alignItems: "center" }}>
      <Text style={{ fontSize: 40, marginBottom: spacing.md }}>📝</Text>
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: fontFamily.interSemibold,
          fontSize: fontSize.body,
          textAlign: "center",
          marginBottom: spacing.xs,
        }}
      >
        {message}
      </Text>
    </GlassCard>
  );
}

function LoadingBody() {
  const { colors } = useTheme();

  return (
    <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {[0, 1, 2, 3].map((i) => (
          <SkeletonLoader key={i} width={72} height={30} radius={16} />
        ))}
      </View>
      {[0, 1, 2].map((i) => (
        <SkeletonLoader key={i} height={140} />
      ))}
    </View>
  );
}