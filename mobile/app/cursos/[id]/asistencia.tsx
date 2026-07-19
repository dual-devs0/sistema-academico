import { colors } from "../../../constants/design";
import { useTheme } from "../../../hooks/useTheme";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ActivityIndicator, Pressable, SectionList, Text, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { fontFamily, fontSize, radius, spacing } from "../../../constants/design";
import { fetchAsistenciaDetalle, type AsistenciaRegistro } from "../../../services/notasService";

// ─── Datos dummy ──────────────────────────────────────────────────────────────

const DUMMY_ASISTENCIA: Record<number, { nombre: string; registros: AsistenciaRegistro[] }> = {
  1: {
    nombre: "Programación I",
    registros: [
      { fecha: "2026-03-02", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-03-05", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-03-09", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-03-12", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Ausente" },
      { fecha: "2026-03-16", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-03-19", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Justificado" },
      { fecha: "2026-03-23", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-03-26", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-03-30", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Feriado" },
      { fecha: "2026-04-02", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-04-06", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-04-09", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Ausente" },
      { fecha: "2026-04-13", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-04-16", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Ausente" },
      { fecha: "2026-04-20", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Feriado" },
      { fecha: "2026-04-23", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-04-27", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-04-30", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Ausente" },
      { fecha: "2026-05-04", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-05-07", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-05-11", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-05-14", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-05-18", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Ausente" },
      { fecha: "2026-05-21", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Justificado" },
      { fecha: "2026-05-25", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-05-28", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-06-01", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Feriado" },
      { fecha: "2026-06-04", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-06-08", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-06-11", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-06-15", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Ausente" },
      { fecha: "2026-06-18", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-06-22", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-06-25", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
      { fecha: "2026-06-29", tipoClase: "P", horasCatedra: 4, asistenciaCargada: "Presente" },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function estadoColor(estado: string): string {
  const e = estado.toLowerCase();
  if (e === "presente" || e === "4") return "#22c55e";
  if (e.includes("feriado")) return "#f59e0b";
  if (e.includes("justificado")) return "#8b5cf6";
  return "#ef4444";
}

function estadoLabel(estado: string): string {
  const e = estado.toLowerCase();
  if (e === "4" || e === "presente") return "Presente";
  if (e.includes("feriado")) return "Feriado";
  if (e.includes("justificado")) return "Justificado";
  return estado;
}

function parseFecha(iso: string) {
  const { colors } = useTheme();

  const d = new Date(iso + "T00:00:00");
  return {
    dia: d.getDate(),
    mes: d.getMonth(),
    anio: d.getFullYear(),
    diaSemana: DIAS[d.getDay()],
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AsistenciaDetalleScreen() {
  const { colors } = useTheme();
const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [registros, setRegistros] = useState<AsistenciaRegistro[]>([]);
  const [materiaNombre, setMateriaNombre] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const res = await fetchAsistenciaDetalle(Number(id));
      setRegistros(res.registros);
      setMateriaNombre(res.nombre);
    } catch {
      const dummy = DUMMY_ASISTENCIA[Number(id)];
      if (dummy) {
  const { colors } = useTheme();
        setRegistros(dummy.registros);
        setMateriaNombre(dummy.nombre);
      } else {
        setError("No se pudo cargar la asistencia.");
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

  const sections = useMemo(() => {
    const map = new Map<string, AsistenciaRegistro[]>();
    for (const r of registros) {
      const { mes, anio } = parseFecha(r.fecha);
      const key = `${MESES[mes]} ${anio}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
  }, [registros]);

  const stats = useMemo(() => {
    const total = registros.length;
    const presentes = registros.filter(
      (r) => r.asistenciaCargada?.toLowerCase() === "presente" || r.asistenciaCargada === "4"
    ).length;
    const ausentes = registros.filter(
      (r) => {
        const e = r.asistenciaCargada?.toLowerCase() ?? "";
        return e !== "presente" && e !== "4" && !e.includes("feriado") && !e.includes("justificado");
      }
    ).length;
    const feriados = registros.filter((r) =>
      r.asistenciaCargada?.toLowerCase().includes("feriado")
    ).length;
    return { total, presentes, ausentes, feriados };
  }, [registros]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <ActivityIndicator color={colors.cyan} size="large" />
      </SafeAreaView>
    );
  }

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
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
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
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textSecondary, fontFamily: fontFamily.inter, fontSize: 11 }}>
            Asistencia Detallada
          </Text>
          <Text
            style={{ color: colors.textPrimary, fontFamily: fontFamily.interSemibold, fontSize: fontSize.body }}
            numberOfLines={1}
          >
            {materiaNombre}
          </Text>
        </View>
      </View>

      {/* Stats resumen */}
      <View
        style={{
          flexDirection: "row",
          marginHorizontal: spacing.xl,
          marginVertical: spacing.md,
          gap: spacing.sm,
        }}
      >
        {[
          { label: "Total", value: stats.total, color: colors.textSecondary },
          { label: "Presentes", value: stats.presentes, color: "#22c55e" },
          { label: "Ausentes", value: stats.ausentes, color: "#ef4444" },
          { label: "Feriados", value: stats.feriados, color: "#f59e0b" },
        ].map((s) => (
          <View
            key={s.label}
            style={{
              flex: 1,
              backgroundColor: colors.glassBg,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.sm,
              alignItems: "center",
              gap: 2,
            }}
          >
            <Text style={{ color: s.color, fontFamily: fontFamily.interSemibold, fontSize: 18 }}>
              {s.value}
            </Text>
            <Text style={{ color: colors.textSecondary, fontFamily: fontFamily.inter, fontSize: 9, letterSpacing: 0.5 }}>
              {s.label.toUpperCase()}
            </Text>
          </View>
        ))}
      </View>

      {/* Lista agrupada por mes */}
      <SectionList
        sections={sections}
        keyExtractor={(item, i) => `${item.fecha}-${i}`}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing["3xl"],
        }}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => (
          <View
            style={{
              backgroundColor: colors.background,
              paddingVertical: spacing.sm,
              marginTop: spacing.md,
            }}
          >
            <Text
              style={{
                color: colors.cyan,
                fontFamily: fontFamily.interSemibold,
                fontSize: fontSize.body,
                letterSpacing: 0.5,
              }}
            >
              {section.title}
            </Text>
            <View
              style={{
                flexDirection: "row",
                marginTop: spacing.xs,
                paddingHorizontal: spacing.xs,
              }}
            >
              {["Fecha", "Tipo", "Hs. Cát.", "Estado"].map((h, i) => (
                <Text
                  key={h}
                  style={{
                    flex: i === 3 ? 1.5 : 1,
                    color: colors.textSecondary,
                    fontFamily: fontFamily.interMedium,
                    fontSize: 10,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    textAlign: i === 3 ? "right" : "left",
                  }}
                >
                  {h}
                </Text>
              ))}
            </View>
          </View>
        )}
        renderItem={({ item, index }) => {
          const { dia, diaSemana } = parseFecha(item.fecha);
          const estado = item.asistenciaCargada ?? "—";
          const color = estadoColor(estado);
          const label = estadoLabel(estado);
          const esFeriado = label === "Feriado";
          const esAusente = label !== "Presente" && label !== "Feriado" && label !== "Justificado";

          return (
            <Animated.View
              entering={FadeInDown.delay(index * 20).duration(200)}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                  paddingHorizontal: spacing.xs,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border + "66",
                  backgroundColor: esAusente
                    ? "#ef444410"
                    : esFeriado
                    ? "#f59e0b08"
                    : "transparent",
                }}
              >
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontFamily: fontFamily.monoMedium,
                      fontSize: 13,
                    }}
                  >
                    {String(dia).padStart(2, "0")}
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontFamily: fontFamily.inter,
                      fontSize: 10,
                    }}
                  >
                    {diaSemana}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    backgroundColor: colors.glassBg,
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    alignSelf: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontFamily: fontFamily.monoMedium,
                      fontSize: 11,
                    }}
                  >
                    {item.tipoClase ?? "P"}
                  </Text>
                </View>

                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontFamily: fontFamily.mono,
                      fontSize: 13,
                    }}
                  >
                    {item.horasCatedra ?? "—"}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1.5,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 5,
                  }}
                >
                  <View
                    style={{
                      width: 6, height: 6,
                      borderRadius: 3,
                      backgroundColor: color,
                    }}
                  />
                  <Text
                    style={{
                      color: color,
                      fontFamily: fontFamily.interMedium,
                      fontSize: 12,
                    }}
                  >
                    {label}
                  </Text>
                </View>
              </View>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <View style={{ padding: spacing.xl, alignItems: "center" }}>
            <Text style={{ color: colors.textSecondary, fontFamily: fontFamily.inter }}>
              No hay registros de asistencia.
            </Text>
          </View>
        }
      />
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
