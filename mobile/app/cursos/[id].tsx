import { colors } from "../../constants/design";
import { useTheme } from "../../hooks/useTheme";
import { useEffect, useState, useCallback } from "react";
import {
  Pressable, ScrollView, Text, View, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Path, Circle } from "react-native-svg";
import { DonutChart } from "../../components/ui/DonutChart";
import { fontFamily, fontSize, spacing } from "../../constants/design";
import { fetchMateriaDetalle, PUNTAJE_POR_TIPO, type MateriaDetalle } from "../../services/notasService";

// ─── Datos dummy ──────────────────────────────────────────────────────────────

const DUMMY_MATERIAS: Record<number, MateriaDetalle> = {
  1: {
    materiaId: 1, nombre: "Programación I", profesor: "Ing. Pérez", semestre: 1,
    asistenciaPct: 92, totalClases: 40, presentes: 37,
    desglose: [
      { tipo: "parcial1", label: "Parcial 1", peso: 0.25, nota: 9, puntajeActividad: 100, puntajeLogrado: 88, fecha: "2026-04-15", hora: "17:00", profesor: "Ing. Pérez" },
      { tipo: "parcial2", label: "Parcial 2", peso: 0.25, nota: 8, puntajeActividad: 100, puntajeLogrado: 80, fecha: "2026-06-10", hora: "17:00", profesor: "Ing. Pérez" },
      { tipo: "practico", label: "Trabajo Práctico", peso: 0.2, nota: 10, puntajeActividad: 50, puntajeLogrado: 48, fecha: "2026-05-20", hora: null, profesor: "Ing. Pérez" },
      { tipo: "final1", label: "Final — 1.ª Oportunidad", peso: 0.3, nota: 7.5, puntajeActividad: null, puntajeLogrado: null, fecha: null, hora: null, profesor: null },
    ],
  },
  2: {
    materiaId: 2, nombre: "Matemática I", profesor: "Lic. González", semestre: 1,
    asistenciaPct: 78, totalClases: 40, presentes: 31,
    desglose: [
      { tipo: "parcial1", label: "Parcial 1", peso: 0.25, nota: 5, puntajeActividad: 100, puntajeLogrado: 52, fecha: "2026-04-16", hora: "17:00", profesor: "Lic. González" },
      { tipo: "parcial2", label: "Parcial 2", peso: 0.25, nota: 7, puntajeActividad: 100, puntajeLogrado: 70, fecha: "2026-06-11", hora: "17:00", profesor: "Lic. González" },
      { tipo: "practico", label: "Trabajo Práctico", peso: 0.2, nota: 6, puntajeActividad: 50, puntajeLogrado: 30, fecha: "2026-05-21", hora: null, profesor: "Lic. González" },
      { tipo: "final1", label: "Final — 1.ª Oportunidad", peso: 0.3, nota: 6.5, puntajeActividad: null, puntajeLogrado: null, fecha: null, hora: null, profesor: null },
    ],
  },
  3: {
    materiaId: 3, nombre: "Inglés Técnico", profesor: "Prof. Martínez", semestre: 1,
    asistenciaPct: 95, totalClases: 30, presentes: 28,
    desglose: [
      { tipo: "parcial1", label: "Parcial 1", peso: 0.25, nota: 9, puntajeActividad: 100, puntajeLogrado: 92, fecha: "2026-04-14", hora: "15:00", profesor: "Prof. Martínez" },
      { tipo: "parcial2", label: "Parcial 2", peso: 0.25, nota: 9, puntajeActividad: 100, puntajeLogrado: 90, fecha: "2026-06-09", hora: "15:00", profesor: "Prof. Martínez" },
      { tipo: "practico", label: "Trabajo Práctico", peso: 0.2, nota: 9, puntajeActividad: 40, puntajeLogrado: 36, fecha: "2026-05-19", hora: null, profesor: "Prof. Martínez" },
      { tipo: "final1", label: "Final — 1.ª Oportunidad", peso: 0.3, nota: 9, puntajeActividad: null, puntajeLogrado: null, fecha: null, hora: null, profesor: null },
    ],
  },
  4: {
    materiaId: 4, nombre: "Base de Datos", profesor: "Ing. López", semestre: 2,
    asistenciaPct: 85, totalClases: 36, presentes: 30,
    desglose: [
      { tipo: "parcial1", label: "Parcial 1", peso: 0.25, nota: 7, puntajeActividad: 100, puntajeLogrado: 72, fecha: "2026-04-10", hora: "17:00", profesor: "Ing. López" },
      { tipo: "parcial2", label: "Parcial 2", peso: 0.25, nota: 6, puntajeActividad: 100, puntajeLogrado: 60, fecha: "2026-06-12", hora: "17:00", profesor: "Ing. López" },
      { tipo: "practico", label: "Trabajo Práctico", peso: 0.2, nota: 8, puntajeActividad: 60, puntajeLogrado: 48, fecha: "2026-05-22", hora: null, profesor: "Ing. López" },
      { tipo: "final1", label: "Final — 1.ª Oportunidad", peso: 0.3, nota: 7, puntajeActividad: null, puntajeLogrado: null, fecha: null, hora: null, profesor: null },
    ],
  },
  5: {
    materiaId: 5, nombre: "Álgebra Lineal", profesor: "Lic. Fernández", semestre: 2,
    asistenciaPct: 65, totalClases: 40, presentes: 26,
    desglose: [
      { tipo: "parcial1", label: "Parcial 1", peso: 0.25, nota: 4, puntajeActividad: 100, puntajeLogrado: 40, fecha: "2026-04-17", hora: "17:00", profesor: "Lic. Fernández" },
      { tipo: "parcial2", label: "Parcial 2", peso: 0.25, nota: 5, puntajeActividad: 100, puntajeLogrado: 50, fecha: "2026-06-13", hora: "17:00", profesor: "Lic. Fernández" },
      { tipo: "practico", label: "Trabajo Práctico", peso: 0.2, nota: 6, puntajeActividad: 40, puntajeLogrado: 24, fecha: "2026-05-23", hora: null, profesor: "Lic. Fernández" },
      { tipo: "final1", label: "Final — 1.ª Oportunidad", peso: 0.3, nota: null, puntajeActividad: null, puntajeLogrado: null, fecha: null, hora: null, profesor: null },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function donutColor(pct: number): string {
  if (pct >= 90) return "#22c55e";
  if (pct >= 75) return "#13D6FF";
  if (pct >= 60) return "#f59e0b";
  return "#ef4444";
}

const ORDEN_TIPO = ["parcial1", "parcial2", "practico", "final1", "final2", "final3"];

const TIPO_META: Record<string, { label: string; eyebrow: string; color: string }> = {
  parcial1:  { label: "Primer Parcial",            eyebrow: "EVALUACIÓN 1",    color: "#13D6FF" },
  parcial2:  { label: "Segundo Parcial",           eyebrow: "EVALUACIÓN 2",    color: "#13D6FF" },
  practico:  { label: "Trabajo Práctico",          eyebrow: "PRÁCTICA",        color: "#a78bfa" },
  final1:    { label: "Final — 1.ª Oportunidad",   eyebrow: "EXAMEN FINAL",    color: "#f59e0b" },
  final2:    { label: "Final — 2.ª Oportunidad",   eyebrow: "EXAMEN FINAL",    color: "#f59e0b" },
  final3:    { label: "Final — 3.ª Oportunidad",   eyebrow: "EXAMEN FINAL",    color: "#f59e0b" },
};

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MateriaDetalleScreen() {
  const { colors } = useTheme();
const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [detalle, setDetalle] = useState<MateriaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const d = await fetchMateriaDetalle(Number(id));
      setDetalle(d);
    } catch {
      const dummy = DUMMY_MATERIAS[Number(id)];
      if (dummy) {
        setDetalle(dummy);
      } else {
        setError("No se pudo cargar el detalle.");
      }
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <ActivityIndicator color={colors.cyan} size="large" />
      </SafeAreaView>
    );
  }

  if (error || !detalle) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
        <View style={{ padding: spacing.xl }}>
          <Text style={{ color: colors.error, fontFamily: fontFamily.interSemibold }}>{error ?? "Sin datos"}</Text>
          <Pressable onPress={load} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.cyan }}>Reintentar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const pct = detalle.asistenciaPct ?? 0;
  const color = donutColor(pct);

  const desgloseOrdenado = [...detalle.desglose].sort(
    (a, b) => {
      const ia = ORDEN_TIPO.indexOf(a.tipo);
      const ib = ORDEN_TIPO.indexOf(b.tipo);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    }
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
          gap: spacing.md,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={16}
          style={({ pressed }) => ({
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: colors.glassBg,
            borderWidth: 1, borderColor: colors.border,
            alignItems: "center", justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <BackArrow />
        </Pressable>
        <Text
          style={{
            flex: 1,
            color: colors.textPrimary,
            fontFamily: fontFamily.interSemibold,
            fontSize: fontSize.headline,
          }}
          numberOfLines={2}
        >
          {detalle.nombre}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing["3xl"],
          gap: spacing.lg,
        }}
      >
        {/* ── Bloque asistencia — unificado ── */}
        <Animated.View entering={FadeInDown.delay(0).duration(300)}>
          <View
            style={{
              backgroundColor: "#13151A",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 4,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: color,
                  fontFamily: fontFamily.interSemibold,
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                Asistencia
              </Text>
            </View>

            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <DonutChart
                value={pct}
                max={100}
                size={150}
                strokeWidth={14}
                color={color}
              />
            </View>

            <View style={{ alignItems: "center", paddingBottom: 4 }}>
              <Text
                style={{
                  color: colors.cyan,
                  fontFamily: fontFamily.interMedium,
                  fontSize: 14,
                  letterSpacing: 0.3,
                }}
              >
                Requerida: 75.00 %
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: colors.border, marginTop: 16 }} />

            <View
              style={{
                flexDirection: "row",
                paddingHorizontal: 20,
                paddingVertical: 16,
              }}
            >
              {[
                { label: "Clases", value: detalle.totalClases, color: colors.textSecondary },
                { label: "Presentes", value: detalle.presentes, color: "#22c55e" },
                {
                  label: "Ausentes",
                  value: detalle.totalClases - detalle.presentes,
                  color: "#ef4444",
                },
              ].map((s, i, arr) => (
                <View
                  key={s.label}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    borderRightWidth: i < arr.length - 1 ? 1 : 0,
                    borderRightColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: s.color,
                      fontFamily: fontFamily.interSemibold,
                      fontSize: 22,
                      letterSpacing: -0.5,
                    }}
                  >
                    {s.value}
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontFamily: fontFamily.inter,
                      fontSize: 10,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      marginTop: 2,
                    }}
                  >
                    {s.label}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ height: 1, backgroundColor: colors.border }} />

            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/cursos/[id]/asistencia",
                  params: { id: String(detalle.materiaId) },
                })
              }
              hitSlop={8}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingVertical: 14,
                backgroundColor: pressed ? "rgba(255,255,255,0.04)" : "transparent",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: "rgba(0,180,216,0.1)",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <IconClipboardCheck color={colors.cyan} size={16} />
                </View>
                <View>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontFamily: fontFamily.interSemibold,
                      fontSize: 14,
                    }}
                  >
                    Ver Asistencia Detallada
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontFamily: fontFamily.inter,
                      fontSize: 11,
                      marginTop: 1,
                    }}
                  >
                    Clases, presentes y ausencias
                  </Text>
                </View>
              </View>
              <ChevronRight />
            </Pressable>
          </View>
        </Animated.View>

        {/* ── Evaluaciones en orden correcto ── */}
        {desgloseOrdenado.map((d, i) => {
          const meta = TIPO_META[d.tipo] ?? { label: d.tipo, eyebrow: "EVALUACIÓN", color: colors.cyan };
          const maxPts = d.puntajeActividad ?? PUNTAJE_POR_TIPO[d.tipo] ?? 0;
          const tieneNota = d.puntajeLogrado != null;
          const aprobado = tieneNota && maxPts > 0 && d.puntajeLogrado! >= maxPts * 0.6;

          return (
            <Animated.View
              key={d.tipo}
              entering={FadeInDown.delay(i * 70 + 120).duration(350).springify().damping(22).stiffness(130)}
            >
              <View
                style={{
                  backgroundColor: "#13151A",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 3,
                    backgroundColor: meta.color + "80",
                    width: "100%",
                  }}
                />

                <View style={{ padding: 18, gap: 14 }}>
                  <View style={{ alignItems: "center", gap: 4 }}>
                    <Text
                      style={{
                        color: meta.color,
                        fontFamily: fontFamily.interSemibold,
                        fontSize: 10,
                        letterSpacing: 2,
                        textTransform: "uppercase",
                      }}
                    >
                      {meta.eyebrow}
                    </Text>
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontFamily: fontFamily.interSemibold,
                        fontSize: 16,
                        textAlign: "center",
                      }}
                    >
                      {meta.label}
                    </Text>
                    {d.fecha && (
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontFamily: fontFamily.inter,
                          fontSize: 12,
                        }}
                      >
                        {formatFecha(d.fecha)}
                        {d.hora ? ` · ${d.hora.slice(0, 5)}` : ""}
                      </Text>
                    )}
                  </View>

                  {d.profesor && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        backgroundColor: colors.glassBg,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        alignSelf: "center",
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <IconUser color={colors.textSecondary} size={12} />
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontFamily: fontFamily.interMedium,
                          fontSize: 12,
                        }}
                      >
                        {d.profesor}
                      </Text>
                    </View>
                  )}

                  <View style={{ height: 1, backgroundColor: colors.border }} />

                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
                      <Text
                        style={{
                          color: colors.textPrimary,
                          fontFamily: fontFamily.interSemibold,
                          fontSize: 32,
                          letterSpacing: -1,
                          lineHeight: 36,
                        }}
                      >
                        {maxPts > 0 ? maxPts : "—"}
                      </Text>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontFamily: fontFamily.inter,
                          fontSize: 10,
                          letterSpacing: 0.8,
                          textTransform: "uppercase",
                        }}
                      >
                        Máximo
                      </Text>
                    </View>

                    <View style={{ alignItems: "center", gap: 6 }}>
                      <View style={{ width: 1, height: 28, backgroundColor: colors.border }} />
                      {tieneNota && maxPts > 0 && (
                        <View
                          style={{
                            width: 36, height: 4,
                            borderRadius: 2,
                            backgroundColor: colors.border,
                            overflow: "hidden",
                          }}
                        >
                          <View
                            style={{
                              width: `${Math.min(100, (d.puntajeLogrado! / maxPts) * 100)}%`,
                              height: "100%",
                              backgroundColor: aprobado ? "#22c55e" : "#ef4444",
                              borderRadius: 2,
                            }}
                          />
                        </View>
                      )}
                      <View style={{ width: 1, height: 28, backgroundColor: colors.border }} />
                    </View>

                    <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
                      {tieneNota ? (
                        <Text
                          style={{
                            color: aprobado ? "#22c55e" : "#ef4444",
                            fontFamily: fontFamily.interSemibold,
                            fontSize: 32,
                            letterSpacing: -1,
                            lineHeight: 36,
                          }}
                        >
                          {d.puntajeLogrado}
                        </Text>
                      ) : (
                        <Text
                          style={{
                            color: colors.textSecondary,
                            fontFamily: fontFamily.interMedium,
                            fontSize: 14,
                            lineHeight: 36,
                          }}
                        >
                          Sin puntaje
                        </Text>
                      )}
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontFamily: fontFamily.inter,
                          fontSize: 10,
                          letterSpacing: 0.8,
                          textTransform: "uppercase",
                        }}
                      >
                        Realizado
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function BackArrow() {
  const { colors } = useTheme();

  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={colors.cyan}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconClipboardCheck({ color = colors.cyan, size = 16 }: { color?: string; size?: number }) {
  const { colors } = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
      <Path d="M6 6h12a1 1 0 011 1v12a1 1 0 01-1 1H6a1 1 0 01-1-1V7a1 1 0 011-1z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
      <Path d="M9 13l2 2 4-4" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconUser({ color = colors.textSecondary, size = 12 }: { color?: string; size?: number }) {
  const { colors } = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="3.6" stroke={color} strokeWidth={1.7} />
      <Path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

function ChevronRight() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: colors.glassBg,
        borderWidth: 1, borderColor: colors.border,
        alignItems: "center", justifyContent: "center",
      }}
    >
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path
          d="M9 18l6-6-6-6"
          stroke={colors.cyan}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
