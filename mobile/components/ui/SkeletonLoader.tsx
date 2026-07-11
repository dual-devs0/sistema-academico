import { useEffect } from "react";
import { View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { radius } from "../../constants/design";

/**
 * SkeletonLoader — placeholder animado para estados loading.
 *
 * - Pulso de opacidad 0.35 ↔ 0.7 con `Easing.inOut(quad)` @ 1100ms.
 * - Prefiero pulso a shimmer sweep: bajo overhead (sin gradientes, sin
 *   máscaras), lee bien en dark mode, y no compite con la barra de scan
 *   del QR ni con el glow del botón login.
 * - Formas base: rect (default), circle (avatares), line (texto).
 */

type Shape = "rect" | "circle" | "line";

interface Props {
  shape?: Shape;
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

const BASE_COLOR = "rgba(255,255,255,0.08)";

export function SkeletonLoader({
  shape = "rect",
  width = "100%",
  height,
  radius: r,
  style,
}: Props) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, {
        duration: 1100,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(opacity);
    };
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const resolvedHeight: DimensionValue =
    height ?? (shape === "line" ? 12 : shape === "circle" ? 40 : 20);

  const resolvedWidth: DimensionValue =
    shape === "circle"
      ? typeof resolvedHeight === "number"
        ? resolvedHeight
        : 40
      : width;

  const resolvedRadius =
    r ??
    (shape === "circle"
      ? typeof resolvedHeight === "number"
        ? resolvedHeight / 2
        : 20
      : shape === "line"
        ? 4
        : radius.md);

  return (
    <Animated.View
      style={[
        {
          width: resolvedWidth,
          height: resolvedHeight,
          backgroundColor: BASE_COLOR,
          borderRadius: resolvedRadius,
        },
        animStyle,
        style,
      ]}
    />
  );
}

/**
 * SkeletonGroup — helper para stackear varias líneas con gap uniforme
 * (útil para simular párrafos o filas de una lista).
 */
export function SkeletonGroup({
  lines = 3,
  gap = 8,
  lineHeight = 12,
  lastLineWidth = "60%",
  style,
}: {
  lines?: number;
  gap?: number;
  lineHeight?: number;
  lastLineWidth?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLoader
          key={i}
          shape="line"
          height={lineHeight}
          width={i === lines - 1 ? lastLineWidth : "100%"}
        />
      ))}
    </View>
  );
}
