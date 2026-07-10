import { forwardRef } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { colors, radius } from "../../constants/design";

/**
 * GlassCard — card con blur + borde translúcido.
 *
 * Variantes:
 * - `default`: borde neutro (rgba blanco 8%).
 * - `accent`: borde cian (para cards con foco, ej. próximo evento).
 * - `leftAccent`: barra vertical cian en el borde izquierdo (para eventos
 *   del calendario y estado de cuenta).
 *
 * Interactivo:
 * - Si se pasa `onPress`, wrap en Pressable con scale 1.02 → 1.0 al soltar
 *   (spec del sistema; timing 150ms `Easing.out(quad)` — sensación snappy
 *   sin over-shoot, sin animar layout).
 */

type Variant = "default" | "accent" | "leftAccent";

interface Props extends Omit<PressableProps, "style"> {
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Si es true, no wrappea en Pressable aunque `onPress` esté definido. */
  noPress?: boolean;
  blurIntensity?: number;
  children: React.ReactNode;
}

const BORDER_ACCENT = "rgba(0,180,216,0.3)";

export const GlassCard = forwardRef<View, Props>(function GlassCard(
  {
    variant = "default",
    style,
    contentStyle,
    noPress,
    blurIntensity = 30,
    onPress,
    children,
    ...pressableRest
  },
  ref,
) {
  const borderColor =
    variant === "accent" || variant === "leftAccent"
      ? BORDER_ACCENT
      : colors.border;

  const cardStyle: ViewStyle = {
    borderRadius: radius.glass,
    borderWidth: 1,
    borderColor,
    borderLeftWidth: variant === "leftAccent" ? 3 : 1,
    borderLeftColor: variant === "leftAccent" ? colors.cyan : borderColor,
    overflow: "hidden",
    backgroundColor: colors.glassBg,
  };

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const content = (
    <BlurView
      intensity={blurIntensity}
      tint="dark"
      style={[StyleSheet.absoluteFill, { borderRadius: radius.glass }]}
    />
  );

  const inner = (
    <>
      {content}
      <View style={contentStyle}>{children}</View>
    </>
  );

  if (onPress && !noPress) {
    return (
      <Animated.View style={[cardStyle, animatedStyle, style]}>
        <Pressable
          ref={ref}
          onPress={onPress}
          onPressIn={() => {
            scale.value = withTiming(1.02, {
              duration: 120,
              easing: Easing.out(Easing.quad),
            });
          }}
          onPressOut={() => {
            scale.value = withTiming(1, {
              duration: 150,
              easing: Easing.out(Easing.quad),
            });
          }}
          {...pressableRest}
        >
          {inner}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View ref={ref} style={[cardStyle, style]}>
      {inner}
    </View>
  );
});
