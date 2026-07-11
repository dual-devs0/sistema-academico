import { useEffect } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G } from "react-native-svg";
import { colors, fontFamily } from "../../constants/design";

/**
 * DonutChart — círculo de asistencia SVG.
 *
 * - Track de fondo con `bgColor`.
 * - Arco de progreso con `strokeDashoffset` animado (Easing.out(cubic) @ 700ms).
 * - Etiqueta central opcional (porcentaje en JetBrains Mono).
 * - Se colorea por umbral (verde/naranja/rojo) si `thresholdColor=true`,
 *   o color fijo si se pasa `color`.
 * - Rotación -90° para que el arco arranque en las 12hs (norte).
 */

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  /** Valor 0–1 (o 0–100 con max=100). */
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  /** Si true, ignora `color` y usa umbrales (>=0.75 verde, >=0.5 naranja, resto rojo). */
  thresholdColor?: boolean;
  showLabel?: boolean;
  labelSuffix?: string;
  style?: StyleProp<ViewStyle>;
}

function pickThresholdColor(v: number): string {
  if (v >= 0.75) return colors.success;
  if (v >= 0.5) return colors.warning;
  return colors.error;
}

export function DonutChart({
  value,
  max = 1,
  size = 72,
  strokeWidth = 6,
  color,
  bgColor = "rgba(255,255,255,0.08)",
  thresholdColor = false,
  showLabel = true,
  labelSuffix = "%",
  style,
}: Props) {
  const clamped = Math.max(0, Math.min(1, value / max));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(clamped, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - progress.value),
  }));

  const strokeColor = thresholdColor ? pickThresholdColor(clamped) : color ?? colors.cyan;

  return (
    <View
      style={[
        { width: size, height: size, alignItems: "center", justifyContent: "center" },
        style,
      ]}
    >
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={bgColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${c}, ${c}`}
            fill="none"
            animatedProps={animatedProps}
          />
        </G>
      </Svg>
      {showLabel ? (
        <View
          style={{
            position: "absolute",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: fontFamily.monoBold,
              fontSize: Math.max(10, size * 0.28),
              lineHeight: Math.max(12, size * 0.32),
            }}
          >
            {`${Math.round(clamped * 100)}${labelSuffix}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
