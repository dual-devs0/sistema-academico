import { colors } from "../constants/design";
import { useTheme } from "../hooks/useTheme";
import { useEffect, useRef } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { fontFamily, fontSize, spacing } from "../constants/design";

/**
 * Splash animada — sustituye el SplashScreen nativo de Expo una vez que
 * los assets JS están listos. Secuencia total ~2.2s, dispara `onFinish()`
 * a los 2000ms (después del delay+duration de cada elemento, con margen).
 *
 * Timeline (ms desde el mount):
 *   0    fondo #0a0e17 sólido
 *   200  logo: FadeIn + scale 0.8→1.0, Easing.out(cubic), 600ms
 *   700  "UCA Académico": FadeInDown, 400ms
 *   800  partícula 1: FadeIn
 *   900  partícula 2: FadeIn + "Universidad Católica · Caacupé": FadeIn, 300ms
 *   1000 partícula 3: FadeIn + línea cian: width 0→120, 400ms
 *   2000 onFinish()
 */
interface SplashAnimatedProps {
  onFinish: () => void;
}

export function SplashAnimated({ onFinish }: SplashAnimatedProps) {
  const { colors } = useTheme();
const logoScale = useSharedValue(0.8);
  const lineWidth = useSharedValue(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    logoScale.value = withDelay(
      200,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
    lineWidth.value = withDelay(
      1000,
      withTiming(120, { duration: 400, easing: Easing.out(Easing.cubic) }),
    );

    const timer = setTimeout(() => {
      if (!finishedRef.current) {
  const { colors } = useTheme();
        finishedRef.current = true;
        onFinish();
      }
    }, 2000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    width: lineWidth.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <View style={styles.logoWrap}>
          <Animated.View
            entering={FadeIn.delay(200).duration(600).easing(Easing.out(Easing.cubic))}
            style={[styles.logoAnimatedWrap, logoStyle]}
          >
            <Image
              source={require("../assets/uc-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          <Particle style={{ top: -8, left: -8 }} delay={800} />
          <Particle style={{ top: -8, right: -8 }} delay={900} />
          <Particle style={{ bottom: -8, left: "50%", marginLeft: -2 }} delay={1000} />
        </View>

        <Animated.Text
          entering={FadeInDown.delay(700).duration(400).easing(Easing.out(Easing.cubic))}
          style={styles.title}
        >
          UCA Académico
        </Animated.Text>

        <Animated.Text
          entering={FadeIn.delay(900).duration(300)}
          style={styles.subtitle}
        >
          Universidad Católica · Caacupé
        </Animated.Text>

        <Animated.View style={[styles.line, lineStyle]} />
      </View>
    </View>
  );
}

function Particle({
  style,
  delay,
}: {
  style: React.ComponentProps<typeof View>["style"];
  delay: number;
}) {
  const { colors } = useTheme();

  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(300)}
      style={[styles.particle, style]}
    />
  );
}

const LOGO_SIZE = 120;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
  },
  logoWrap: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    marginBottom: spacing.xl,
  },
  logoAnimatedWrap: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  particle: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.cyan,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fontFamily.interBold,
    fontSize: fontSize.headlineLg,
  },
  subtitle: {
    color: colors.cyan,
    fontFamily: fontFamily.inter,
    fontSize: fontSize.caption,
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  line: {
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.cyan,
    marginTop: spacing.lg,
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
});
