import { useCallback, useEffect, useRef } from "react";
import { Dimensions, Image, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width: W, height: H } = Dimensions.get("window");

interface SplashAnimatedProps {
  onFinish: () => void;
}

export function SplashAnimated({ onFinish }: SplashAnimatedProps) {
  const finishedRef = useRef(false);

  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(16);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleY.value }],
  }));

  const handleFinish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    titleOpacity.value = withDelay(
      1200,
      withTiming(1, { duration: 600, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
    );
    titleY.value = withDelay(
      1200,
      withTiming(0, { duration: 600, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
    );

    subtitleOpacity.value = withDelay(
      1600,
      withTiming(1, { duration: 600, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
    );
    subtitleY.value = withDelay(
      1600,
      withTiming(0, { duration: 600, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
    );

    const timer = setTimeout(() => handleFinish(), 2500);
    return () => clearTimeout(timer);
  }, [titleOpacity, titleY, subtitleOpacity, subtitleY, handleFinish]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#132852", "#1a3569", "#0d1b33"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {[...Array(6)].map((_, i) => (
        <FloatingParticle key={i} index={i} />
      ))}

      <View style={styles.logoWrapper}>
        <Image
          source={require("../assets/splash-icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Title & Subtitle — rendered on top of the Lottie canvas */}
      <View style={styles.textContainer}>
        <Animated.Text style={[styles.title, titleStyle]}>
          Sistema Académico
        </Animated.Text>
        <Animated.Text style={[styles.subtitle, subtitleStyle]}>
          UCA Caacupé
        </Animated.Text>
      </View>
    </View>
  );
}

// ─── Floating Particles ──────────────────────────────────────────────────────

const PARTICLE_POSITIONS: Record<string, string>[] = [
  { top: "12%", left: "18%" },
  { top: "20%", right: "22%" },
  { bottom: "28%", left: "14%" },
  { top: "55%", right: "12%" },
  { bottom: "40%", left: "28%" },
  { bottom: "15%", right: "30%" },
];

function FloatingParticle({ index }: { index: number }) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const op = useSharedValue(0.1);

  useEffect(() => {
    const delay = index * 600;
    x.value = withDelay(delay, withTiming(12, { duration: 4000, easing: Easing.inOut(Easing.sin) }));
    y.value = withDelay(delay, withTiming(-18, { duration: 5000, easing: Easing.inOut(Easing.sin) }));
    op.value = withDelay(delay, withTiming(0.35, { duration: 2500 }));
  }, [index, x, y, op]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
    opacity: op.value,
  }));

  return (
    <Animated.View
      style={[styles.particle, PARTICLE_POSITIONS[index] as Record<string, string>, style]}
    />
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoWrapper: {
    width: W * 0.5,
    height: H * 0.25,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    position: "absolute",
    bottom: H * 0.16,
    alignItems: "center",
    gap: 6,
  },
  title: {
    color: "#ffffff",
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: 0.3,
    textShadowColor: "rgba(255,255,255,0.12)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  subtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    fontWeight: "400",
    letterSpacing: 2,
    textShadowColor: "rgba(255,255,255,0.06)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  particle: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
});
