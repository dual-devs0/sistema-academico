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
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Path, Circle } from "react-native-svg";
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

type Tab = "disponibles" | "inscriptos";

function IconClipboardCheck({ color = "#00b4d8", size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M6 6h12a1 1 0 011 1v12a1 1 0 01-1 1H6a1 1 0 01-1-1V7a1 1 0 011-1z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M9 13l2 2 4-4" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconCalendar({ color = "#00b4d8", size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9h18M9 3v4m6-4v4M7 13h2m4 0h2m-8 4h2m4 0h2" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M4 5h16a1 1 0 011 1v13a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

export default function ExamenesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("disponibles");
  const [periodo, setPeriodo] = useState<Turno>(() => currentTurnoKey());
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
        showsVerticalScrollIndicator={false}
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
// TabPills — mismo patrón cursos/cuenta
// ---------------------------------------------------------------------------

function TabPills({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        marginHorizontal: spacing.xl,
        marginBottom: spacing.lg,
        backgroundColor: colors.glassBg,
        borderRadius: radius.pill,
        padding: 4,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {(["disponibles", "inscriptos"] as const).map((t) => {
        const active = t === tab;
        return (
          <Pressable key={t} onPress={() => onChange(t)} style={{ flex: 1 }}>
            {active ? (
              <LinearGradient
                colors={["#06b6d4", "#0ea5e9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: radius.pill,
                  paddingVertical: spacing.sm,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#0a0e17",
                    fontFamily: fontFamily.interSemibold,
                    fontSize: fontSize.caption,
                    letterSpacing: 0.5,
                    textTransform: "capitalize",
                  }}
                >
                  {t}
                </Text>
              </LinearGradient>
            ) : (
              <View
                style={{
                  borderRadius: radius.pill,
                  paddingVertical: spacing.sm,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: fontFamily.interMedium,
                    fontSize: fontSize.caption,
                    letterSpacing: 0.5,
                    textTransform: "capitalize",
                  }}
                >
                  {t}
                </Text>
              </View>
            )}
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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
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
          Turno
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {periodos.map((t) => {
            const active = t.key === periodoActual;
            return (
              <Pressable key={t.key} onPress={() => onPeriodoChange(t.key)} style={{ flex: undefined }}>
                {active ? (
                  <LinearGradient
                    colors={["#06b6d4", "#0ea5e9"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      borderRadius: radius.pill,
                      paddingHorizontal: spacing.lg,
                      paddingVertical: spacing.sm,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#0a0e17",
                        fontFamily: fontFamily.interSemibold,
                        fontSize: fontSize.caption,
                        letterSpacing: 1,
                      }}
                    >
                      {t.label}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View
                    style={{
                      paddingHorizontal: spacing.lg,
                      paddingVertical: spacing.sm,
                      borderRadius: radius.pill,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontFamily: fontFamily.interMedium,
                        fontSize: fontSize.caption,
                        letterSpacing: 1,
                      }}
                    >
                      {t.label}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {examenes.length === 0 ? (
        <GlassCard contentStyle={{ padding: spacing.xl, alignItems: "center" }}>
          <IconCalendar color={colors.textSecondary} size={40} />
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.inter,
              fontSize: fontSize.body,
              textAlign: "center",
              marginTop: spacing.md,
            }}
          >
            No hay exámenes disponibles para este periodo.
          </Text>
        </GlassCard>
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
  const badgeLabel = examen.ya_inscripto ? "INSCRIPTO" : cuposLlenos ? "SIN CUPOS" : "HABILITADO";
  const badgeVariant = examen.ya_inscripto ? "success" : cuposLlenos ? "error" : "outline";

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
        <CyanBadge label={badgeLabel} variant={badgeVariant} size="sm" />
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: spacing.lg,
          marginTop: spacing.md,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Field label="FECHA" value={examen.fecha} />
        <Field label="HORA / AULA" value={`${examen.hora_inicio ?? "—"} · ${examen.aula ?? "—"}`} />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: spacing.md,
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
            CUPOS
          </Text>
          <Text
            style={{
              color: examen.cupos_disponibles !== null && examen.cupos_disponibles <= 3
                ? colors.warning : colors.textPrimary,
              fontFamily: fontFamily.monoBold,
              fontSize: fontSize.body,
              marginTop: 2,
            }}
          >
            {examen.cupos_disponibles !== null
              ? `${examen.cupos_disponibles} disp.`
              : "Sin límite"}
          </Text>
        </View>

        <Pressable
          onPress={onInscribirse}
          disabled={!puedeInscribirse}
          style={({ pressed }) => ({
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <LinearGradient
            colors={puedeInscribirse ? ["#06b6d4", "#0ea5e9"] : ["#2a3744", "#232f3a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 999,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
              alignItems: "center",
              shadowColor: puedeInscribirse ? "#0ea5e9" : "transparent",
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 12,
              shadowOpacity: 0.3,
              elevation: puedeInscribirse ? 4 : 0,
            }}
          >
            <Text
              style={{
                color: puedeInscribirse ? "#0a0e17" : colors.textSecondary,
                fontFamily: fontFamily.interSemibold,
                fontSize: fontSize.caption,
              }}
            >
              {examen.ya_inscripto ? "Ya inscripto" : cuposLlenos ? "Sin cupos" : "Inscribirse"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </GlassCard>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1 }}>
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
          fontFamily: fontFamily.monoBold,
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
        <GlassCard contentStyle={{ padding: spacing.xl, alignItems: "center" }}>
          <IconClipboardCheck color={colors.textSecondary} size={40} />
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.inter,
              fontSize: fontSize.body,
              textAlign: "center",
              marginTop: spacing.md,
            }}
          >
            No estás inscripto en ningún examen.
          </Text>
        </GlassCard>
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
  const bordeColor = esActivo ? colors.cyan : colors.textSecondary;
  const estadoTexto = esActivo ? "Confirmado" : "Cancelado";
  const estadoColor = esActivo ? colors.cyan : colors.textSecondary;

  return (
    <View
      style={{
        borderLeftWidth: 4,
        borderLeftColor: bordeColor,
        borderRadius: radius.md,
        overflow: "hidden",
      }}
    >
      <GlassCard contentStyle={{ padding: spacing.lg }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: spacing.xs,
          }}
        >
          <View>
            <Text
              style={{
                color: estadoColor,
                fontFamily: fontFamily.interSemibold,
                fontSize: fontSize.caption,
                letterSpacing: 2,
              }}
            >
              {estadoTexto}
            </Text>
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: fontFamily.interSemibold,
                fontSize: fontSize.body,
                marginTop: spacing.xs,
              }}
              numberOfLines={2}
            >
              {examen.materia_nombre}
            </Text>
          </View>
          {esActivo && <IconClipboardCheck color={colors.cyan} size={22} />}
        </View>

        <View
          style={{
            flexDirection: "row",
            gap: spacing.lg,
            marginTop: spacing.md,
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Field label="FECHA" value={examen.fecha} />
          <Field label="HORA" value={examen.hora_inicio ?? "—"} />
        </View>

        {esActivo && (
          <Pressable
            onPress={onCancelar}
            style={({ pressed }) => ({
              marginTop: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.md,
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

// ---------------------------------------------------------------------------
// Placeholder / loading
// ---------------------------------------------------------------------------

