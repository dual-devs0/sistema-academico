import { useEffect } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors, radius } from "../../constants/design";

/**
 * ProgressBar — barra horizontal con glow cian.
 *
 * Uso: avance académico del dashboard, progreso de cuotas, asistencia.
 *
 * Animación:
 * - Al montar/actualizar el `value`, la barra crece desde su ancho
 *   anterior con `Easing.out(cubic)` @ 550ms — sensación de "aterrizar"
 *   sin snap.
 * - Sin animar en primer render si `animated={false}` (skeleton flows).
 */

interface Props {
  /** Valor 0–1 (o 0–100 si `max=100`). */
  value: number;
  max?: number;
  height?: number;
  color?: string;
  bgColor?: string;
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Si true, aplica shadow glow cian al indicador. */
  glow?: boolean;
}

export function ProgressBar({
  value,
  max = 1,
  height = 6,
  color = colors.cyan,
  bgColor = "rgba(255,255,255,0.06)",
  animated = true,
  style,
  glow = true,
}: Props) {
  const clamped = Math.max(0, Math.min(1, value / max));
  const width = useSharedValue(animated ? 0 : clamped);

  useEffect(() => {
    if (animated) {
      width.value = withTiming(clamped, {
        duration: 550,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      width.value = clamped;
    }
  }, [clamped, animated, width]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View
      style={[
        {
          width: "100%",
          height,
          borderRadius: radius.pill,
          backgroundColor: bgColor,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            height: "100%",
            backgroundColor: color,
            borderRadius: radius.pill,
          },
          glow
            ? {
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 6,
                elevation: 4,
              }
            : null,
          barStyle,
        ]}
      />
    </View>
  );
}
