import { useEffect } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
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
 * - `breathe`: el glow respira opacity 0.3↔0.6 en loop de 2000ms
 *   (`Easing.inOut(quad)`) — reservado para barras destacadas (ej. avance
 *   académico), no para listas donde muchas barras respirando a la vez
 *   sería ruido visual.
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
  /** Si true (implica glow), el shadow respira 0.3↔0.6 opacity en loop. */
  breathe?: boolean;
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
  breathe = false,
}: Props) {
  const clamped = Math.max(0, Math.min(1, value / max));
  const width = useSharedValue(animated ? 0 : clamped);
  const shadowOpacity = useSharedValue(breathe ? 0.3 : 0.6);

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

  useEffect(() => {
    if (breathe) {
      shadowOpacity.value = withRepeat(
        withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    }
    return () => {
      cancelAnimation(shadowOpacity);
    };
  }, [breathe, shadowOpacity]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
    shadowOpacity: glow ? shadowOpacity.value : 0,
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
