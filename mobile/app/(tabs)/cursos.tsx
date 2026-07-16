import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, FadeIn, SlideInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { GlassCard } from "../../components/ui/GlassCard";
import { DonutChart } from "../../components/ui/DonutChart";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import {
  colors, fontFamily, fontSize, radius, spacing,
} from "../../constants/design";
import {
  fetchNotasCompleto,
  PUNTAJE_POR_TIPO,
  type MateriaCard,
  type NotasCompleto,
} from "../../services/notasService";
import { fetchPerfil, type UserInfo } from "../../services/dashboardService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function puntajeTotalMateria(m: MateriaCard): number {
  return m.desglose.reduce((acc, d) => {
    if (d.tipo === "final" || d.tipo.startsWith("final")) return acc;
    return acc + (d.puntajeLogrado ?? 0);
  }, 0);
}

function puntajeMaximoMateria(m: MateriaCard): number {
  return m.desglose.reduce((acc, d) => {
    if (d.tipo === "final" || d.tipo.startsWith("final")) return acc;
    return acc + (d.puntajeActividad ?? PUNTAJE_POR_TIPO[d.tipo] ?? 0);
  }, 0);
}

function donutColor(pct: number): string {
  if (pct >= 90) return "#22c55e";
  if (pct >= 75) return "#13D6FF";
  if (pct >= 60) return "#f59e0b";
  return "#ef4444";
}

function ordinalSem(n: number): string {
  const map: Record<number, string> = { 1: "1.er", 2: "2.º", 3: "3.er" };
  return `${map[n] ?? `${n}.º`} Semestre`;
}

// ─── Datos dummy ──────────────────────────────────────────────────────────────

const DUMMY_DATA: NotasCompleto = {
  semestresDisponibles: [1, 2],
  promedioAnual: 7.8,
  materias: [
    {
      materiaId: 1,
      nombre: "Programación I",
      profesor: "Ing. Pérez",
      anio: 2026,
      semestre: 1,
      promedio: 8.5,
      asistenciaPct: 92,
      totalClases: 40,
      presentes: 37,
      desglose: [
        { tipo: "parcial1", label: "Parcial 1", peso: 0.25, nota: 9, puntajeActividad: 100, puntajeLogrado: 88, fecha: "2026-04-15", hora: "17:00", profesor: "Ing. Pérez" },
        { tipo: "parcial2", label: "Parcial 2", peso: 0.25, nota: 8, puntajeActividad: 100, puntajeLogrado: 80, fecha: "2026-06-10", hora: "17:00", profesor: "Ing. Pérez" },
        { tipo: "practico", label: "Trabajo Práctico", peso: 0.2, nota: 10, puntajeActividad: 50, puntajeLogrado: 48, fecha: "2026-05-20", hora: null, profesor: "Ing. Pérez" },
        { tipo: "final", label: "Final", peso: 0.3, nota: 7.5, puntajeActividad: null, puntajeLogrado: null, fecha: null, hora: null, profesor: null },
      ],
    },
    {
      materiaId: 2, nombre: "Matemática I", profesor: "Lic. González",
      anio: 2026, semestre: 1, promedio: 6.2, asistenciaPct: 78,
      totalClases: 40, presentes: 31,
      desglose: [
        { tipo: "parcial1", label: "Parcial 1", peso: 0.25, nota: 5, puntajeActividad: 100, puntajeLogrado: 52, fecha: "2026-04-16", hora: "17:00", profesor: "Lic. González" },
        { tipo: "parcial2", label: "Parcial 2", peso: 0.25, nota: 7, puntajeActividad: 100, puntajeLogrado: 70, fecha: "2026-06-11", hora: "17:00", profesor: "Lic. González" },
        { tipo: "practico", label: "Trabajo Práctico", peso: 0.2, nota: 6, puntajeActividad: 50, puntajeLogrado: 30, fecha: "2026-05-21", hora: null, profesor: "Lic. González" },
        { tipo: "final", label: "Final", peso: 0.3, nota: 6.5, puntajeActividad: null, puntajeLogrado: null, fecha: null, hora: null, profesor: null },
      ],
    },
    {
      materiaId: 3, nombre: "Inglés Técnico", profesor: "Prof. Martínez",
      anio: 2026, semestre: 1, promedio: 9.0, asistenciaPct: 95,
      totalClases: 30, presentes: 28,
      desglose: [
        { tipo: "parcial1", label: "Parcial 1", peso: 0.25, nota: 9, puntajeActividad: 100, puntajeLogrado: 92, fecha: "2026-04-14", hora: "15:00", profesor: "Prof. Martínez" },
        { tipo: "parcial2", label: "Parcial 2", peso: 0.25, nota: 9, puntajeActividad: 100, puntajeLogrado: 90, fecha: "2026-06-09", hora: "15:00", profesor: "Prof. Martínez" },
        { tipo: "practico", label: "Trabajo Práctico", peso: 0.2, nota: 9, puntajeActividad: 40, puntajeLogrado: 36, fecha: "2026-05-19", hora: null, profesor: "Prof. Martínez" },
        { tipo: "final", label: "Final", peso: 0.3, nota: 9, puntajeActividad: null, puntajeLogrado: null, fecha: null, hora: null, profesor: null },
      ],
    },
    {
      materiaId: 4, nombre: "Base de Datos", profesor: "Ing. López",
      anio: 2026, semestre: 2, promedio: 7.0, asistenciaPct: 85,
      totalClases: 36, presentes: 30,
      desglose: [
        { tipo: "parcial1", label: "Parcial 1", peso: 0.25, nota: 7, puntajeActividad: 100, puntajeLogrado: 72, fecha: "2026-04-10", hora: "17:00", profesor: "Ing. López" },
        { tipo: "parcial2", label: "Parcial 2", peso: 0.25, nota: 6, puntajeActividad: 100, puntajeLogrado: 60, fecha: "2026-06-12", hora: "17:00", profesor: "Ing. López" },
        { tipo: "practico", label: "Trabajo Práctico", peso: 0.2, nota: 8, puntajeActividad: 60, puntajeLogrado: 48, fecha: "2026-05-22", hora: null, profesor: "Ing. López" },
        { tipo: "final", label: "Final", peso: 0.3, nota: 7, puntajeActividad: null, puntajeLogrado: null, fecha: null, hora: null, profesor: null },
      ],
    },
    {
      materiaId: 5, nombre: "Álgebra Lineal", profesor: "Lic. Fernández",
      anio: 2026, semestre: 2, promedio: 5.2, asistenciaPct: 65,
      totalClases: 40, presentes: 26,
      desglose: [
        { tipo: "parcial1", label: "Parcial 1", peso: 0.25, nota: 4, puntajeActividad: 100, puntajeLogrado: 40, fecha: "2026-04-17", hora: "17:00", profesor: "Lic. Fernández" },
        { tipo: "parcial2", label: "Parcial 2", peso: 0.25, nota: 5, puntajeActividad: 100, puntajeLogrado: 50, fecha: "2026-06-13", hora: "17:00", profesor: "Lic. Fernández" },
        { tipo: "practico", label: "Trabajo Práctico", peso: 0.2, nota: 6, puntajeActividad: 40, puntajeLogrado: 24, fecha: "2026-05-23", hora: null, profesor: "Lic. Fernández" },
        { tipo: "final", label: "Final", peso: 0.3, nota: null, puntajeActividad: null, puntajeLogrado: null, fecha: null, hora: null, profesor: null },
      ],
    },
  ],
};

// ─── Tipo de vista ─────────────────────────────────────────────────────────────
type Vista = "asistencia" | "calificaciones";

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CursosTab() {
  const router = useRouter();
  const [data, setData] = useState<NotasCompleto | null>(DUMMY_DATA);
  const [user, setUser] = useState<UserInfo | null>({ nombre: "Estudiante UCA", username: "estudiante", id: 0, role: "alumno", email: null, carrera_id: null, es_becado: null, foto_url: null });
  const [semestre, setSemestre] = useState<number | null>(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [vista, setVista] = useState<Vista>("asistencia");

  const load = useCallback(async () => {
    try {
      const [n, u] = await Promise.all([
        fetchNotasCompleto(),
        fetchPerfil().catch(() => null),
      ]);
      if (n.materias.length > 0) {
        setData(n);
        if (n.semestresDisponibles.length > 0) {
          setSemestre(n.semestresDisponibles[n.semestresDisponibles.length - 1]);
        }
      }
      if (u) setUser(u);
    } catch {
      // dummy data ya está en estado
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

  const semestreActual = data?.semestresDisponibles?.length
    ? data.semestresDisponibles[data.semestresDisponibles.length - 1]
    : null;

  const materias = useMemo(() => {
    if (!data) return [];
    return data.materias.filter((m) =>
      semestre === null ? true : m.semestre === semestre
    );
  }, [data, semestre]);

  const nombre = user?.nombre ?? user?.username;
  const carreraNombre = "Ingeniería Informática";

  const promediosPorSemestre = useMemo(() => {
    if (!data) return new Map();
    const map = new Map<number, { anio: number; promedio: number | null }>();

    for (const sem of data.semestresDisponibles) {
      const materiasSem = data.materias.filter((m) => m.semestre === sem);
      const conNota = materiasSem.filter((m) =>
        m.desglose.some((d) => d.puntajeLogrado != null)
      );
      const promedio =
        conNota.length > 0
          ? conNota.reduce((acc, m) => {
            const pts = m.desglose.reduce(
              (a, d) => a + (d.puntajeLogrado ?? 0), 0
            );
            const max = m.desglose.reduce(
              (a, d) => a + (d.puntajeActividad ?? 0), 0
            );
            return acc + (max > 0 ? (pts / max) * 10 : 0);
          }, 0) / conNota.length
          : null;

      const primerAnio = materiasSem[0]?.anio ?? new Date().getFullYear();
      map.set(sem, { anio: primerAnio, promedio });
    }
    return map;
  }, [data]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScreenHeader title="Cursos" name={nombre} hideAvatar />

      {loading ? (
        <LoadingBody />
      ) : error ? (
        <ErrorBody message={error} onRetry={load} />
      ) : (
        <>
          {/* ── Carrera centrada ── */}
          <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.md }}>
            <View
              style={{
                backgroundColor: colors.glassBg,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.lg,
                paddingVertical: spacing.md,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: fontFamily.interSemibold,
                  fontSize: fontSize.body,
                  letterSpacing: 0.3,
                }}
              >
                {carreraNombre}
              </Text>
            </View>
          </View>

          {/* ── Toggle Asistencia / Calificaciones ── */}
          <VistaToggle vista={vista} onChange={setVista} />

          {/* ── Trigger row: Visualizando + botón semestres ──
              Portado del boceto (semestre_sheet_final.html .trigger-row):
              una sola línea "Visualizando: N.º Semestre (Actual)" + borde
              inferior sutil, en vez del bloque de 2 líneas anterior. */}
          <TriggerRow
            semestre={semestre}
            esActual={semestre === semestreActual}
            onPress={() => setModalVisible(true)}
          />

          {/* ── Contenido según vista ── */}
          {vista === "asistencia" ? (
            <AsistenciaGrid
              materias={materias}
              semestre={semestre}
              refreshing={refreshing}
              onRefresh={onRefresh}
              onPressMateriaId={(id) =>
                router.push({ pathname: "/cursos/[id]", params: { id: String(id) } })
              }
            />
          ) : (
            <CalificacionesView
              materias={materias}
              semestre={semestre}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          )}

          {/* ── Bottom Sheet selector semestres ── */}
          <SemestreSheet
            visible={modalVisible}
            disponibles={data?.semestresDisponibles ?? []}
            promediosPorSemestre={promediosPorSemestre}
            actual={semestreActual}
            selected={semestre}
            onSelect={(s) => {
              setSemestre(s);
              setModalVisible(false);
            }}
            onClose={() => setModalVisible(false)}
          />
        </>
      )}
    </SafeAreaView>
  );
}

// ─── Trigger row (boceto: .trigger-row) ────────────────────────────────────────

function TriggerRow({
  semestre,
  esActual,
  onPress,
}: {
  semestre: number | null;
  esActual: boolean;
  onPress: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: "#1e2128",
        marginTop: spacing.sm,
      }}
    >
      <Text
        style={{
          color: "#13D6FF",
          fontFamily: fontFamily.interMedium,
          fontSize: 13,
        }}
        numberOfLines={1}
      >
        Visualizando:{" "}
        <Text style={{ color: "#e2e4ec", fontFamily: fontFamily.interSemibold }}>
          {semestre != null ? `${ordinalSem(semestre)}` : "—"}
          {esActual ? " (Actual)" : ""}
        </Text>
      </Text>

      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 7,
          backgroundColor: "#13151c",
          borderWidth: 1,
          borderColor: pressed ? "#13D6FF44" : "#2a2d35",
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 7,
          flexShrink: 0,
        })}
      >
        <View style={{ gap: 2.5 }}>
          <View style={{ width: 14, height: 1.5, borderRadius: 1, backgroundColor: "#8ab4be" }} />
          <View style={{ width: 10, height: 1.5, borderRadius: 1, backgroundColor: "#8ab4be" }} />
          <View style={{ width: 14, height: 1.5, borderRadius: 1, backgroundColor: "#8ab4be" }} />
        </View>
        <Text
          style={{
            color: "#13D6FF",
            fontFamily: fontFamily.monoMedium,
            fontSize: 11,
            fontWeight: "600",
            letterSpacing: 0.8,
          }}
        >
          SEM {semestre ?? "—"}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Card materia ─────────────────────────────────────────────────────────────

function MateriaCard({
  materia,
  onPress,
}: {
  materia: MateriaCard;
  onPress: () => void;
}) {
  const pct = materia.asistenciaPct ?? 0;
  const color = donutColor(pct);
  const logrado = puntajeTotalMateria(materia);
  const maximo = puntajeMaximoMateria(materia);

  return (
    <GlassCard
      onPress={onPress}
      contentStyle={{
        padding: spacing.md,
        alignItems: "center",
        gap: spacing.xs,
      }}
    >
      <Text
        style={{
          color: colors.cyan,
          fontFamily: fontFamily.interSemibold,
          fontSize: 12,
          letterSpacing: 0.3,
          textAlign: "center",
          minHeight: 34,
        }}
        numberOfLines={2}
      >
        {materia.nombre}
      </Text>

      <DonutChart
        value={pct}
        max={100}
        size={88}
        strokeWidth={8}
        color={color}
        style={{ marginVertical: spacing.xs }}
      />

      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: fontFamily.interSemibold,
          fontSize: fontSize.body,
          marginTop: 2,
        }}
      >
        {`${Math.round(pct)}%`}
      </Text>

      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: fontFamily.inter,
          fontSize: 10,
          textAlign: "center",
        }}
      >
        {materia.presentes}/{materia.totalClases} clases
      </Text>
    </GlassCard>
  );
}

// ─── Bottom Sheet semestres — portado de semestre_sheet_final.html ───────────
//
// CAMBIOS respecto a la versión anterior:
// - num-chip: 36→34px, mismos colores por estado, pero ahora con
//   `flexShrink: 0` explícito para que nunca se comprima ni se estire.
// - badge (ACTUAL/APROBADO/FUTURO): antes tenía height:22 + paddingHorizontal:10
//   + fontSize:11 SIN flexShrink — eso es lo que probablemente causaba que
//   se viera como una barra de ancho completo en vez de píldora. Ahora:
//   paddingVertical:3, paddingHorizontal:8, fontSize:9, letterSpacing:0.9,
//   y `flexShrink: 0` + `alignSelf: "flex-start"` para que SIEMPRE quede
//   del tamaño de su texto, sin importar cuán largo sea el nombre del
//   semestre al lado.
// - check: 22→18px, ahora con ✓ chico centrado (antes 22px con texto
//   blanco más grande, desalineado con el resto).
// - sh-heading: 28→17px (el boceto usa un heading mucho más discreto).
// - close-btn: 32→28px.
// - Fila activa/seleccionada: fondo #0e1e26 en reposo, #13202a al
//   presionar (antes era #062B36 fijo) — igual que el boceto.

function SemestreSheet({
  visible,
  disponibles,
  promediosPorSemestre,
  actual,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  disponibles: number[];
  promediosPorSemestre?: Map<number, { anio: number; promedio: number | null }>;
  actual: number | null;
  selected: number | null;
  onSelect: (s: number) => void;
  onClose: () => void;
}) {
  if (!visible) return null;

  const ordenados = [...disponibles].sort((a, b) => b - a);

  function estadoSem(s: number): "actual" | "aprobado" | "futuro" {
    if (s === actual) return "actual";
    if (actual !== null && s < actual) return "aprobado";
    return "futuro";
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" }}
      >
        <Pressable style={{ position: "absolute", inset: 0 }} onPress={onClose} />

        <Animated.View
          entering={SlideInDown.duration(280)}
          style={{
            backgroundColor: "#13151c",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderTopWidth: 1,
            borderColor: "#23262f",
            paddingBottom: 20,
          }}
        >
          <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 4 }}>
            <View style={{ width: 34, height: 4, borderRadius: 2, backgroundColor: "#2a2d35" }} />
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 14,
              paddingBottom: 12,
            }}
          >
            <View>
              <Text
                style={{
                  color: "#5a6070",
                  fontFamily: fontFamily.interMedium,
                  fontSize: 11,
                  letterSpacing: 1.2,
                  marginBottom: 3,
                }}
              >
                PERÍODO ACADÉMICO
              </Text>
              <Text
                style={{
                  color: "#e2e4ec",
                  fontFamily: fontFamily.interSemibold,
                  fontSize: 17,
                }}
              >
                Seleccionar semestre
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: "#1e2128",
                borderWidth: 1,
                borderColor: "#2a2d35",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 2,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text style={{ color: "#5a6070", fontSize: 13 }}>✕</Text>
            </Pressable>
          </View>

          <View style={{ height: 1, backgroundColor: "#1e2128", marginHorizontal: 20 }} />

          <ScrollView
            style={{ maxHeight: 340 }}
            contentContainerStyle={{ paddingVertical: 6, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {ordenados.map((s, i) => {
              const estado = estadoSem(s);
              const isSelected = s === selected;
              const info = promediosPorSemestre?.get(s);
              const anio = info?.anio;
              const promedio = info?.promedio;

              const chipBg =
                estado === "actual" ? "#13D6FF" : estado === "aprobado" ? "#0e2a1a" : "#1a1d26";
              const chipTextColor =
                estado === "actual" ? "#0a0e17" : estado === "aprobado" ? "#22c55e" : "#3a4050";
              const chipBorderColor = estado === "aprobado" ? "#22c55e33" : "#23262f";

              const subColor =
                estado === "actual" ? "#00D1FF" : estado === "aprobado" ? "#22c55e" : "#5a6070";
              const subText =
                estado === "actual"
                  ? `En curso · ${anio ?? new Date().getFullYear()}`
                  : estado === "aprobado" && promedio != null
                    ? `Promedio: ${promedio.toFixed(1)} · ${anio ?? ""}`
                    : anio
                      ? `${anio}`
                      : "Próximo";

              const badgeLabel =
                estado === "actual" ? "ACTUAL" : estado === "aprobado" ? "APROBADO" : "FUTURO";
              const badgeBg =
                estado === "actual"
                  ? "rgba(19,214,255,0.10)"
                  : estado === "aprobado"
                    ? "rgba(34,197,94,0.09)"
                    : "#1a1d26";
              const badgeBorder =
                estado === "actual"
                  ? "rgba(19,214,255,0.2)"
                  : estado === "aprobado"
                    ? "rgba(34,197,94,0.16)"
                    : "#23262f";
              const badgeTextColor =
                estado === "actual" ? "#13D6FF" : estado === "aprobado" ? "#22c55e" : "#3a4050";

              return (
                <Animated.View key={s} entering={FadeInDown.delay(i * 45).duration(220)}>
                  <Pressable
                    onPress={() => onSelect(s)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      gap: 12,
                      backgroundColor:
                        estado === "actual"
                          ? pressed
                            ? "#13202a"
                            : "#0e1e26"
                          : pressed
                            ? "#13202a"
                            : "transparent",
                    })}
                  >
                    {/* num-chip — 34x34, flexShrink:0 para que nunca se
                        deforme */}
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: chipBg,
                        borderWidth: estado !== "actual" ? 1 : 0,
                        borderColor: chipBorderColor,
                        flexShrink: 0,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fontFamily.interBold,
                          fontSize: 13,
                          color: chipTextColor,
                        }}
                      >
                        {s}
                      </Text>
                    </View>

                    {/* sem-info — único elemento flexible de la fila */}
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text
                          style={{
                            color: "#e2e4ec",
                            fontFamily: fontFamily.interSemibold,
                            fontSize: 13,
                          }}
                          numberOfLines={1}
                        >
                          {ordinalSem(s)}
                        </Text>
                        {/* badge — inline junto al nombre */}
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 10,
                            backgroundColor: badgeBg,
                            borderWidth: 1,
                            borderColor: badgeBorder,
                            flexShrink: 0,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9,
                              fontFamily: fontFamily.interBold,
                              letterSpacing: 0.9,
                              color: badgeTextColor,
                            }}
                            numberOfLines={1}
                          >
                            {badgeLabel}
                          </Text>
                        </View>
                        {/* check — inline junto al badge, solo si está seleccionado */}
                        {isSelected && (
                          <View
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 9,
                              backgroundColor: "#13D6FF",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Svg width={10} height={8} viewBox="0 0 10 8" fill="none">
                              <Path
                                d="M1 4L3.5 6.5L9 1"
                                stroke="#0a0e17"
                                strokeWidth={1.8}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </Svg>
                          </View>
                        )}
                      </View>
                      <Text
                        style={{ fontSize: 11, fontFamily: fontFamily.inter, color: subColor }}
                        numberOfLines={1}
                      >
                        {subText}
                      </Text>
                    </View>
                  </Pressable>

                  {i < ordenados.length - 1 && (
                    <View style={{ height: 1, backgroundColor: "#1a1d24", marginLeft: 66 }} />
                  )}
                </Animated.View>
              );
            })}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Toggle pill ───────────────────────────────────────────────────────────────

function VistaToggle({
  vista,
  onChange,
}: {
  vista: Vista;
  onChange: (v: Vista) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        marginHorizontal: spacing.xl,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        backgroundColor: colors.glassBg,
        borderRadius: radius.pill,
        padding: 4,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {(["asistencia", "calificaciones"] as Vista[]).map((v) => {
        const active = vista === v;
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            style={{ flex: 1 }}
          >
            {active ? (
              <LinearGradient
                colors={["#06b6d4", "#0ea5e9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: radius.pill,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#0a0e17",
                    fontFamily: fontFamily.interSemibold,
                    fontSize: fontSize.caption,
                    letterSpacing: 0.5,
                  }}
                >
                  {v === "asistencia" ? "Asistencia" : "Calificaciones"}
                </Text>
              </LinearGradient>
            ) : (
              <View
                style={{
                  borderRadius: radius.pill,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: fontFamily.interMedium,
                    fontSize: fontSize.caption,
                    letterSpacing: 0.5,
                  }}
                >
                  {v === "asistencia" ? "Asistencia" : "Calificaciones"}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Vista Asistencia — grid 2 col ────────────────────────────────────────────

function AsistenciaGrid({
  materias,
  semestre,
  refreshing,
  onRefresh,
  onPressMateriaId,
}: {
  materias: MateriaCard[];
  semestre: number | null;
  refreshing: boolean;
  onRefresh: () => void;
  onPressMateriaId: (id: number) => void;
}) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: spacing.md,
        paddingBottom: spacing["3xl"],
        gap: spacing.sm,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.cyan}
        />
      }
    >
      {materias.length === 0 ? (
        <EmptyBody semestre={semestre} />
      ) : (
        chunk(materias, 2).map((row, ri) => (
          <View key={ri} style={{ flexDirection: "row", gap: spacing.sm }}>
            {row.map((item, i) => (
              <Animated.View
                key={item.materiaId}
                style={{ flex: 1 }}
                entering={FadeInDown.delay((ri * 2 + i) * 50).duration(280)}
              >
                <MateriaCard
                  materia={item}
                  onPress={() => onPressMateriaId(item.materiaId)}
                />
              </Animated.View>
            ))}
            {row.length === 1 && <View style={{ flex: 1 }} />}
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ─── Vista Calificaciones — lista expandible ──────────────────────────────────

function CalificacionesView({
  materias,
  semestre,
  refreshing,
  onRefresh,
}: {
  materias: MateriaCard[];
  semestre: number | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing["3xl"],
        gap: spacing.sm,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.cyan}
        />
      }
    >
      {materias.length === 0 ? (
        <EmptyBody semestre={semestre} />
      ) : (
        materias.map((m, i) => {
          const isOpen = expanded === m.materiaId;
          const total = m.desglose.reduce((a, d) => a + (d.nota != null ? d.nota * d.peso : 0), 0);

          return (
            <Animated.View
              key={m.materiaId}
              entering={FadeInDown.delay(i * 40).duration(280)}
            >
              <Pressable
                onPress={() => setExpanded(isOpen ? null : m.materiaId)}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <GlassCard contentStyle={{ padding: spacing.md }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={{
                          color: colors.textPrimary,
                          fontFamily: fontFamily.interSemibold,
                          fontSize: fontSize.body,
                        }}
                        numberOfLines={1}
                      >
                        {m.nombre}
                      </Text>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontFamily: fontFamily.inter,
                          fontSize: fontSize.caption,
                        }}
                      >
                        Asistencia: {m.asistenciaPct?.toFixed(0) ?? "—"}%
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                      <Text
                        style={{
                          color: colors.cyan,
                          fontFamily: fontFamily.interSemibold,
                          fontSize: 20,
                          letterSpacing: -0.5,
                        }}
                      >
                        {total > 0 ? total.toFixed(1) : "—"}
                      </Text>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 16,
                          transform: [{ rotate: isOpen ? "90deg" : "0deg" }],
                        }}
                      >
                        ›
                      </Text>
                    </View>
                  </View>

                  {isOpen && m.desglose.length > 0 && (
                    <View
                      style={{
                        marginTop: spacing.md,
                        paddingTop: spacing.md,
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                        gap: spacing.sm,
                      }}
                    >
                      {m.desglose.map((d, di) => (
                        <View
                          key={di}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: colors.textSecondary,
                              fontFamily: fontFamily.inter,
                              fontSize: fontSize.caption,
                              flex: 1,
                            }}
                          >
                            {d.label}
                          </Text>
                          <View style={{ flexDirection: "row", gap: spacing.lg }}>
                            <Text
                              style={{
                                color: colors.textSecondary,
                                fontFamily: fontFamily.mono,
                                fontSize: fontSize.caption,
                              }}
                            >
                              ×{(d.peso * 100).toFixed(0)}%
                            </Text>
                            <Text
                              style={{
                                color:
                                  d.nota == null
                                    ? colors.textSecondary
                                    : d.nota >= 6
                                      ? colors.cyan
                                      : colors.error,
                                fontFamily: fontFamily.monoMedium,
                                fontSize: fontSize.caption,
                                minWidth: 32,
                                textAlign: "right",
                              }}
                            >
                              {d.nota != null ? d.nota.toFixed(1) : "—"}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </GlassCard>
              </Pressable>
            </Animated.View>
          );
        })
      )}
    </ScrollView>
  );
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

function EmptyBody({ semestre }: { semestre: number | null }) {
  return (
    <View style={{ padding: spacing.xl }}>
      <GlassCard contentStyle={{ padding: spacing.lg, alignItems: "center" }}>
        <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.inter, fontSize: fontSize.body, textAlign: "center" }}>
          {semestre != null ? `No hay materias en el semestre ${semestre}.` : "No hay materias registradas."}
        </Text>
      </GlassCard>
    </View>
  );
}

function LoadingBody() {
  return (
    <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md, marginTop: spacing.md }}>
      <SkeletonLoader height={48} radius={12} />
      <SkeletonLoader height={20} width="70%" radius={8} />
      {[0, 1, 2].map((row) => (
        <View key={row} style={{ flexDirection: "row", gap: spacing.md }}>
          <SkeletonLoader height={200} style={{ flex: 1 }} />
          <SkeletonLoader height={200} style={{ flex: 1 }} />
        </View>
      ))}
    </View>
  );
}

function ErrorBody({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
      <GlassCard variant="accent" contentStyle={{ padding: spacing.lg }}>
        <Text style={{ color: colors.error, fontFamily: fontFamily.interSemibold, fontSize: fontSize.caption, letterSpacing: 1.5, textTransform: "uppercase" }}>Error</Text>
        <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.inter, fontSize: fontSize.body, marginTop: spacing.sm, marginBottom: spacing.lg }}>{message}</Text>
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => ({
            alignSelf: "flex-start", backgroundColor: colors.cyan, borderRadius: radius.md,
            paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: "#0a0e17", fontFamily: fontFamily.interSemibold, fontSize: fontSize.caption }}>Reintentar</Text>
        </Pressable>
      </GlassCard>
    </View>
  );
}
