import { useCallback, useEffect, useRef } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";

const { width: W, height: H } = Dimensions.get("window");

interface SplashAnimatedProps {
  onFinish: () => void;
}

export function SplashAnimated({ onFinish }: SplashAnimatedProps) {
  const finishedRef = useRef(false);

  // Title anims — appear after Lottie plays
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

  // Lottie animation duration is ~3.5s (105 frames @ 30fps)
  // Total splash timing:
  //   0-3.5s   Lottie plays (book rising, opening, star, glow)
  //   3.2s     Title starts fading in (overlapping with end of Lottie)
  //   3.6s     Subtitle fades in
  //   4.5s     Call onFinish
  useEffect(() => {
    // Start title animations after Lottie is mostly done
    titleOpacity.value = withDelay(
      3200,
      withTiming(1, { duration: 700, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
    );
    titleY.value = withDelay(
      3200,
      withTiming(0, { duration: 700, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
    );

    subtitleOpacity.value = withDelay(
      3600,
      withTiming(1, { duration: 700, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
    );
    subtitleY.value = withDelay(
      3600,
      withTiming(0, { duration: 700, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
    );

    // Overall timeout — safety net in case Lottie callback doesn't fire
    const timer = setTimeout(() => handleFinish(), 4800);
    return () => clearTimeout(timer);
  }, [titleOpacity, titleY, subtitleOpacity, subtitleY, handleFinish]);

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={["#132852", "#1a3569", "#0d1b33"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating background particles with subtle Reanimated drift */}
      {[...Array(6)].map((_, i) => (
        <FloatingParticle key={i} index={i} />
      ))}

      {/* Lottie animation — book rising, opening, star, glow */}
      <View style={styles.lottieWrapper}>
        <LottieView
          source={require("../assets/splash-animation.json")}
          autoPlay
          loop={false}
          resizeMode="contain"
          style={styles.lottie}
          onAnimationFinish={handleFinish}
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
  lottieWrapper: {
    width: W * 0.7,
    height: H * 0.55,
    alignItems: "center",
    justifyContent: "center",
  },
  lottie: {
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
