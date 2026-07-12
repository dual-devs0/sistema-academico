import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
  cancelAnimation,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { DonutChart } from "../components/ui/DonutChart";
import { GlassCard } from "../components/ui/GlassCard";
import { colors, fontFamily, fontSize, radius, spacing } from "../constants/design";
import {
  fetchMateriasHoy,
  verifyQrToken,
  type MateriaHoy,
  type QrVerifyResponse,
  type QrVerifyResult,
} from "../services/asistenciaService";

/**
 * QR Scanner — modal fullscreen.
 *
 * Fases:
 *   1. Permisos → si no dados, prompt.
 *   2. Cámara activa + overlay con marco de esquinas cian + línea de scan
 *      animada (top ↔ bottom loop, 2100ms, `Easing.inOut(quad)`).
 *   3. QR detectado → `verifyQrToken(payload)` → si ok, transición fade+scale
 *      a pantalla de confirmación. Si error, banner rojo por 3s + reintento.
 *   4. Pantalla confirmación: "¡Asistencia Confirmada!", stats presentes/
 *      ausentes, botones "Ver Reporte" y "Volver al Inicio".
 *
 * Consideraciones:
 * - `scanCooldownRef` evita disparar múltiples `verifyQrToken` durante los
 *   ~200ms que la cámara puede repetir el mismo frame decodificado.
 * - Al desmontar el componente, `cancelAnimation` en la línea de scan
 *   evita que la worklet siga corriendo.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const FRAME_SIZE = Math.min(SCREEN_W * 0.68, 300);
const FRAME_TOP = SCREEN_H * 0.16;
const CORNER = 24;
const CORNER_STROKE = 3;

type Phase = "camera" | "confirming" | "confirmed";

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>("camera");
  const [confirmData, setConfirmData] = useState<QrVerifyResponse | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [materiasHoy, setMateriasHoy] = useState<MateriaHoy[]>([]);
  const scanCooldownRef = useRef(false);

  useEffect(() => {
    (async () => {
      const m = await fetchMateriasHoy();
      setMateriasHoy(m);
    })();
  }, []);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    if (!inlineError) return;
    const t = setTimeout(() => setInlineError(null), 3000);
    return () => clearTimeout(t);
  }, [inlineError]);

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (scanCooldownRef.current || phase !== "camera") return;
      scanCooldownRef.current = true;
      setPhase("confirming");

      const result: QrVerifyResult = await verifyQrToken(data);

      if (result.ok && result.data) {
        setConfirmData(result.data);
        setPhase("confirmed");
      } else {
        setInlineError(mapErrorMessage(result));
        setPhase("camera");
        // dejar un pequeño margen antes de permitir otro scan
        setTimeout(() => {
          scanCooldownRef.current = false;
        }, 800);
      }
    },
    [phase],
  );

  const close = useCallback(() => router.back(), [router]);

  if (!permission) {
    return <PermissionSplash message="Preparando cámara…" />;
  }

  if (!permission.granted) {
    return (
      <PermissionSplash
        message="Necesitamos acceso a la cámara para escanear el QR."
        actionLabel={permission.canAskAgain ? "Otorgar acceso" : "Cerrar"}
        onAction={
          permission.canAskAgain
            ? () => {
                void requestPermission();
              }
            : close
        }
        onClose={close}
      />
    );
  }

  if (phase === "confirmed" && confirmData) {
    return (
      <ConfirmedScreen
        data={confirmData}
        onGoHome={close}
        onOpenReport={() => router.replace("/(tabs)/notas")}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        style={{ ...StyleSheetAbs.fill }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={phase === "camera" ? handleBarcodeScanned : undefined}
      />

      {/* Máscara oscura + ventana clara vía View overlays (workaround por
          la falta de un mask nativo simple en RN) */}
      <View pointerEvents="none" style={{ ...StyleSheetAbs.fill }}>
        <View
          style={{
            ...StyleSheetAbs.fill,
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        />
        <View
          style={{
            position: "absolute",
            left: (SCREEN_W - FRAME_SIZE) / 2,
            top: FRAME_TOP,
            width: FRAME_SIZE,
            height: FRAME_SIZE,
            backgroundColor: "transparent",
            borderRadius: radius.md,
            overflow: "hidden",
          }}
        >
          {/* Recorte transparente + esquinas + línea de scan */}
          <CameraView
            style={StyleSheetAbs.fill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />
          <ScanCorners />
          <ScanLine />
        </View>
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.md,
          }}
        >
          <Pressable
            onPress={close}
            hitSlop={12}
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.pill,
              backgroundColor: "rgba(0,0,0,0.4)",
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.textPrimary, fontSize: fontSize.headline }}>×</Text>
          </Pressable>
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: fontFamily.interSemibold,
              fontSize: fontSize.body,
              letterSpacing: 0.5,
            }}
          >
            Escanear QR
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ flex: 1 }} />

        {/* Instrucción debajo del marco */}
        <View style={{ paddingHorizontal: spacing.xl, alignItems: "center" }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: fontFamily.interMedium,
              fontSize: fontSize.caption,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            Posicioná el código QR dentro del marco
          </Text>
          {phase === "confirming" ? (
            <Text
              style={{
                color: colors.cyan,
                fontFamily: fontFamily.mono,
                fontSize: fontSize.caption,
                marginTop: spacing.xs,
              }}
            >
              Verificando…
            </Text>
          ) : null}
        </View>

        {inlineError ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={{
              marginTop: spacing.md,
              marginHorizontal: spacing.xl,
              padding: spacing.md,
              borderRadius: radius.md,
              backgroundColor: "rgba(239,68,68,0.15)",
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.4)",
            }}
          >
            <Text
              style={{
                color: colors.error,
                fontFamily: fontFamily.interMedium,
                fontSize: fontSize.caption,
              }}
            >
              {inlineError}
            </Text>
          </Animated.View>
        ) : null}

        {/* Materias del día */}
        <View
          style={{
            marginTop: spacing.xl,
            paddingHorizontal: spacing.xl,
            paddingBottom: spacing.lg,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "baseline",
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
              Mis materias de hoy
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontFamily: fontFamily.mono,
                fontSize: fontSize.caption,
              }}
            >
              {formatToday()}
            </Text>
          </View>

          <ScrollView
            style={{ maxHeight: 180 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: spacing.sm }}>
              {materiasHoy.length === 0 ? (
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: fontFamily.inter,
                    fontSize: fontSize.caption,
                  }}
                >
                  Sin materias registradas.
                </Text>
              ) : (
                materiasHoy.map((m) => <MateriaHoyRow key={m.materiaId} materia={m} />)
              )}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Overlay: esquinas + línea de scan
// ---------------------------------------------------------------------------

function ScanCorners() {
  const p = CORNER;
  const s = FRAME_SIZE;
  const c = colors.cyan;
  const w = CORNER_STROKE;
  return (
    <Svg
      style={{ ...StyleSheetAbs.fill }}
      width={s}
      height={s}
      pointerEvents="none"
    >
      <Path d={`M 0 ${p} L 0 0 L ${p} 0`} stroke={c} strokeWidth={w} fill="none" />
      <Path
        d={`M ${s - p} 0 L ${s} 0 L ${s} ${p}`}
        stroke={c}
        strokeWidth={w}
        fill="none"
      />
      <Path
        d={`M ${s} ${s - p} L ${s} ${s} L ${s - p} ${s}`}
        stroke={c}
        strokeWidth={w}
        fill="none"
      />
      <Path
        d={`M ${p} ${s} L 0 ${s} L 0 ${s - p}`}
        stroke={c}
        strokeWidth={w}
        fill="none"
      />
    </Svg>
  );
}

function ScanLine() {
  const y = useSharedValue(0);

  useEffect(() => {
    y.value = withRepeat(
      withTiming(FRAME_SIZE - 4, {
        duration: 2100,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(y);
    };
  }, [y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: 8,
          right: 8,
          top: 0,
          height: 2,
          backgroundColor: colors.cyan,
          opacity: 0.7,
          borderRadius: 2,
          shadowColor: colors.cyan,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.7,
          shadowRadius: 8,
          elevation: 6,
        },
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Materia hoy row
// ---------------------------------------------------------------------------

function MateriaHoyRow({ materia }: { materia: MateriaHoy }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: "rgba(0,0,0,0.4)",
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor:
            materia.estado === "ok" ? colors.success : colors.error,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.interSemibold,
            fontSize: fontSize.caption,
          }}
          numberOfLines={1}
        >
          {materia.nombre}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: fontFamily.mono,
            fontSize: fontSize.caption,
          }}
          numberOfLines={1}
        >
          {materia.hora} · {materia.aula ?? "Aula por confirmar"}
        </Text>
      </View>
      <DonutChart
        value={materia.asistenciaPct}
        size={36}
        strokeWidth={3}
        showLabel={false}
        thresholdColor
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Pantalla confirmación
// ---------------------------------------------------------------------------

function ConfirmedScreen({
  data,
  onGoHome,
  onOpenReport,
}: {
  data: QrVerifyResponse;
  onGoHome: () => void;
  onOpenReport: () => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.xl }}>
          <Animated.View
            entering={ZoomIn.duration(320).easing(Easing.out(Easing.cubic))}
            style={{ alignItems: "center", marginTop: spacing["3xl"] }}
          >
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: colors.cyanDim,
                borderWidth: 2,
                borderColor: colors.cyan,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: spacing.xl,
                shadowColor: colors.cyan,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <Text
                style={{
                  color: colors.cyan,
                  fontFamily: fontFamily.interBold,
                  fontSize: 44,
                  lineHeight: 46,
                }}
              >
                ✓
              </Text>
            </View>
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: fontFamily.interBold,
                fontSize: fontSize.headlineXl,
                textAlign: "center",
              }}
            >
              ¡Asistencia Confirmada!
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontFamily: fontFamily.inter,
                fontSize: fontSize.body,
                marginTop: spacing.sm,
                textAlign: "center",
              }}
            >
              Registro sincronizado con el sistema académico.
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(120).duration(320)}
            style={{ marginTop: spacing["3xl"] }}
          >
            <GlassCard variant="accent" contentStyle={{ padding: spacing.lg }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: fontFamily.interMedium,
                  fontSize: fontSize.caption,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                Materia
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: fontFamily.interSemibold,
                  fontSize: fontSize.headline,
                  marginTop: 2,
                }}
                numberOfLines={2}
              >
                {data.materia_nombre}
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
                <StatBlock label="FECHA" value={data.fecha} />
                <StatBlock label="HORA" value={data.hora_registro} />
                <StatBlock label="ESTADO" value="✓ Presente" />
              </View>
            </GlassCard>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(200).duration(320)}
            style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}
          >
            <GlassCard style={{ flex: 1 }} contentStyle={{ padding: spacing.lg, alignItems: "center" }}>
              <Text
                style={{
                  color: colors.success,
                  fontFamily: fontFamily.monoBold,
                  fontSize: fontSize.numeric,
                }}
              >
                {data.presentes}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: fontFamily.interMedium,
                  fontSize: fontSize.caption,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                Presentes
              </Text>
            </GlassCard>
            <GlassCard style={{ flex: 1 }} contentStyle={{ padding: spacing.lg, alignItems: "center" }}>
              <Text
                style={{
                  color: colors.error,
                  fontFamily: fontFamily.monoBold,
                  fontSize: fontSize.numeric,
                }}
              >
                {data.ausentes}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: fontFamily.interMedium,
                  fontSize: fontSize.caption,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                Ausentes
              </Text>
            </GlassCard>
          </Animated.View>

          <View style={{ flex: 1 }} />

          <Animated.View
            entering={FadeInDown.delay(280).duration(320)}
            style={{ gap: spacing.md, marginTop: spacing["3xl"] }}
          >
            <Pressable
              onPress={onOpenReport}
              style={({ pressed }) => ({
                backgroundColor: colors.cyan,
                borderRadius: radius.md,
                paddingVertical: spacing.lg,
                alignItems: "center",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                style={{
                  color: "#0a0e17",
                  fontFamily: fontFamily.interSemibold,
                  fontSize: fontSize.body,
                }}
              >
                Ver Reporte
              </Text>
            </Pressable>
            <Pressable
              onPress={onGoHome}
              style={({ pressed }) => ({
                backgroundColor: colors.glassBg,
                borderRadius: radius.md,
                paddingVertical: spacing.lg,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: fontFamily.interSemibold,
                  fontSize: fontSize.body,
                }}
              >
                Volver al Inicio
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
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
// Permission splash
// ---------------------------------------------------------------------------

function PermissionSplash({
  message,
  actionLabel,
  onAction,
  onClose,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <SafeAreaView style={{ flex: 1, padding: spacing.xl, justifyContent: "space-between" }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: fontFamily.interSemibold,
              fontSize: fontSize.body,
              textAlign: "center",
            }}
          >
            {message}
          </Text>
        </View>
        <View style={{ gap: spacing.md }}>
          {onAction && actionLabel ? (
            <Pressable
              onPress={onAction}
              style={({ pressed }) => ({
                backgroundColor: colors.cyan,
                borderRadius: radius.md,
                paddingVertical: spacing.lg,
                alignItems: "center",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                style={{
                  color: "#0a0e17",
                  fontFamily: fontFamily.interSemibold,
                  fontSize: fontSize.body,
                }}
              >
                {actionLabel}
              </Text>
            </Pressable>
          ) : null}
          {onClose ? (
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                backgroundColor: "transparent",
                borderRadius: radius.md,
                paddingVertical: spacing.lg,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: fontFamily.interSemibold,
                  fontSize: fontSize.body,
                }}
              >
                Cerrar
              </Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DIAS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const MESES = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
];

function formatToday(): string {
  const d = new Date();
  return `${DIAS[d.getDay()]} · ${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()]}`;
}

function mapErrorMessage(res: QrVerifyResult): string {
  switch (res.errorCode) {
    case "invalid":
      return "QR inválido o dañado. Intentá de nuevo.";
    case "expired":
      return "El QR expiró. Pedile al profesor que lo regenere.";
    case "duplicate":
      return "Tu asistencia de hoy ya está registrada.";
    case "not_enrolled":
      return "No estás inscripto en esta materia.";
    case "network":
      return "Sin conexión. Revisá tu internet.";
    default:
      return res.errorMessage ?? "No se pudo verificar el QR.";
  }
}

const StyleSheetAbs = {
  fill: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
};
