import { useCallback, useEffect, useMemo, useState } from "react";
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
  colors,
  fontFamily,
  fontSize,
  radius,
  spacing,
} from "../constants/design";
import {
  fetchExamenesDisponibles,
  fetchExamenesInscriptos,
  inscribirseAExamen,
  turnosDelAnio,
  currentTurnoKey,
  daysUntil,
  type ExamenDisponible,
  type ExamenInscripto,
  type EstadoInscripcion,
  type Turno,
} from "../services/examenesService";

/**
 * Pantalla Exámenes.
 *
 * CAMBIOS respecto a la versión anterior (rediseño 2026-07):
 * 1. Animación: se sacó el FadeInDown por-card en las listas de
 *    disponibles/inscriptos (delay acumulado de 50ms x item, se sentía
 *    largo con listas de 4-5+ exámenes). Ahora cada tab entra una sola
 *    vez con un fade simple; las cards individuales ya no animan.
 *
 * Tabs Disponibles / Inscriptos.
 * - Disponibles: selector de turno + cards con habilitado + fecha/hora/aula
 *   + cierre inscripción (rojo si urgente) + botón Inscribirse.
 * - Inscriptos: chips filtro Todos / Confirmados / Pendientes + cards con
 *   borde izquierdo de color según estado (verde=confirmado, naranja=pend
 *   pago, cian=finalizado) y nota si finalizado.
 *
 * Backend TODO: los endpoints no existen. Al fallar cualquier fetch,
 * mostramos banner "Próximamente" en vez de error crudo.
 */

type Tab = "disponibles" | "inscriptos";
type FiltroInscriptos = "todos" | "confirmados" | "pendientes" | "finalizados";

export default function ExamenesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("disponibles");
  const [turno, setTurno] = useState<Turno>(currentTurnoKey());
  const [filtro, setFiltro] = useState<FiltroInscriptos>("todos");
  const [disponibles, setDisponibles] = useState<ExamenDisponible[]>([]);
  const [inscriptos, setInscriptos] = useState<ExamenInscripto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [d, i] = await Promise.all([
      fetchExamenesDisponibles(turno),
      fetchExamenesInscriptos(),
    ]);
    setDisponibles(d);
    setInscriptos(i);
  }, [turno]);

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

  const inscriptosFiltrados = useMemo(() => {
    if (filtro === "todos") return inscriptos;
    if (filtro === "confirmados") return inscriptos.filter((e) => e.estado === "confirmado");
    if (filtro === "pendientes") return inscriptos.filter((e) => e.estado === "pendiente_pago");
    return inscriptos.filter((e) => e.estado === "finalizado");
  }, [filtro, inscriptos]);

  const handleInscribirse = useCallback(async (examenId: number) => {
    const res = await inscribirseAExamen(examenId);
    if (res.ok) {
      Alert.alert("Inscripción confirmada", "Recibirás un email con los datos.");
      await load();
    } else {
      Alert.alert("No se pudo inscribir", res.error ?? "Intentá de nuevo más tarde.");
    }
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
            turnoActual={turno}
            onTurnoChange={setTurno}
            onInscribirse={handleInscribirse}
          />
        ) : (
          <InscriptosTab
            examenes={inscriptosFiltrados}
            filtro={filtro}
            onFiltroChange={setFiltro}
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
  turnoActual,
  onTurnoChange,
  onInscribirse,
}: {
  examenes: ExamenDisponible[];
  turnoActual: Turno;
  onTurnoChange: (t: Turno) => void;
  onInscribirse: (id: number) => void;
}) {
  const anio = new Date().getFullYear();
  const turnos = turnosDelAnio(anio);

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
        Turno
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {turnos.map((t) => {
            const active = t.key === turnoActual;
            return (
              <Pressable
                key={t.key}
                onPress={() => onTurnoChange(t.key)}
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
        <SoonPlaceholder message="No hay exámenes disponibles para este turno." />
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
  const dias = daysUntil(examen.cierre_inscripcion);
  const urgente = dias <= 3;
  const cierreLabel =
    dias <= 0
      ? "CIERRE HOY"
      : dias === 1
        ? "CIERRA MAÑANA"
        : `CIERRE EN ${dias} DÍAS`;

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
          label={examen.habilitado ? "HABILITADO" : "NO HABILITADO"}
          variant={examen.habilitado ? "outline" : "error"}
          size="sm"
        />
      </View>

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
        <Field label="HORA / AULA" value={`${examen.hora}${examen.aula ? " · " + examen.aula : ""}`} />
      </View>

      <Text
        style={{
          color: urgente ? colors.error : colors.textSecondary,
          fontFamily: fontFamily.interSemibold,
          fontSize: fontSize.caption,
          letterSpacing: 1.2,
          marginTop: spacing.md,
        }}
      >
        {cierreLabel}
      </Text>

      <Pressable
        onPress={onInscribirse}
        disabled={!examen.habilitado || dias <= 0}
        style={({ pressed }) => ({
          marginTop: spacing.md,
          paddingVertical: spacing.md,
          borderRadius: radius.md,
          backgroundColor:
            examen.habilitado && dias > 0 ? colors.cyan : "rgba(255,255,255,0.08)",
          alignItems: "center",
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text
          style={{
            color: examen.habilitado && dias > 0 ? "#0a0e17" : colors.textSecondary,
            fontFamily: fontFamily.interSemibold,
            fontSize: fontSize.body,
          }}
        >
          Inscribirse
        </Text>
      </Pressable>
    </GlassCard>
  );
}

function Field({ label, value }: { label: string; value: string }) {
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
  filtro,
  onFiltroChange,
}: {
  examenes: ExamenInscripto[];
  filtro: FiltroInscriptos;
  onFiltroChange: (f: FiltroInscriptos) => void;
}) {
  const filtros: { key: FiltroInscriptos; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "confirmados", label: "Confirmados" },
    { key: "pendientes", label: "Pendientes" },
    { key: "finalizados", label: "Finalizados" },
  ];

  return (
    <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {filtros.map((f) => {
            const active = f.key === filtro;
            return (
              <Pressable
                key={f.key}
                onPress={() => onFiltroChange(f.key)}
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
                    letterSpacing: 0.5,
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {examenes.length === 0 ? (
        <SoonPlaceholder message="No hay exámenes en este filtro." />
      ) : (
        <Animated.View entering={FadeIn.duration(220)} style={{ gap: spacing.md }}>
          {examenes.map((e) => (
            <ExamenInscriptoCard key={e.inscripcion_id} examen={e} />
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const ESTADO_COLOR: Record<EstadoInscripcion, string> = {
  confirmado: colors.success,
  pendiente_pago: colors.warning,
  finalizado: colors.cyan,
};

const ESTADO_LABEL: Record<EstadoInscripcion, string> = {
  confirmado: "CONFIRMADO",
  pendiente_pago: "PENDIENTE DE PAGO",
  finalizado: "FINALIZADO",
};

const ESTADO_GLYPH: Record<EstadoInscripcion, string> = {
  confirmado: "✓",
  pendiente_pago: "!",
  finalizado: "◆",
};

function ExamenInscriptoCard({ examen }: { examen: ExamenInscripto }) {
  const color = ESTADO_COLOR[examen.estado];
  return (
    <View
      style={{
        borderLeftWidth: 3,
        borderLeftColor: color,
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
          <Text style={{ color, fontFamily: fontFamily.interBold, fontSize: fontSize.body }}>
            {ESTADO_GLYPH[examen.estado]}
          </Text>
          <Text
            style={{
              color,
              fontFamily: fontFamily.interSemibold,
              fontSize: fontSize.caption,
              letterSpacing: 1.5,
            }}
          >
            {ESTADO_LABEL[examen.estado]}
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
          <Field
            label="HORA / AULA"
            value={`${examen.hora}${examen.aula ? " · " + examen.aula : ""}`}
          />
          {examen.estado === "finalizado" && examen.nota != null ? (
            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: fontFamily.interMedium,
                  fontSize: fontSize.caption,
                  letterSpacing: 1.5,
                }}
              >
                NOTA
              </Text>
              <Text
                style={{
                  color: colors.cyan,
                  fontFamily: fontFamily.monoBold,
                  fontSize: fontSize.headline,
                  marginTop: 2,
                }}
              >
                {examen.nota.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>
      </GlassCard>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Placeholder / loading
// ---------------------------------------------------------------------------

function SoonPlaceholder({ message }: { message: string }) {
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
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: fontFamily.inter,
          fontSize: fontSize.caption,
          textAlign: "center",
        }}
      >
        El módulo de exámenes se habilitará en breve.
      </Text>
    </GlassCard>
  );
}

function LoadingBody() {
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