import { useCallback, useEffect, useRef } from "react";
import { Dimensions, Platform, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";

const { width: W, height: H } = Dimensions.get("window");

const VIDEO_TIMEOUT_MS = 12000;
const NATIVE_SPLASH_GRACE_MS = 1200;

interface SplashAnimatedProps {
  onReady?: () => void;
  onFinish: () => void;
  authReady: boolean;
}

export function SplashAnimated({ onReady, onFinish, authReady }: SplashAnimatedProps) {
  const finishedRef = useRef(false);
  const readyFiredRef = useRef(false);
  const videoEndedRef = useRef(false);
  const player = useVideoPlayer(require("../assets/splash-video.mp4"), (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });

  const videoOpacity = useSharedValue(1);

  const videoStyle = useAnimatedStyle(() => ({
    opacity: videoOpacity.value,
  }));

  const fireReady = useCallback(() => {
    if (readyFiredRef.current) return;
    readyFiredRef.current = true;
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    const t = setTimeout(fireReady, NATIVE_SPLASH_GRACE_MS);
    return () => clearTimeout(t);
  }, [fireReady]);

  const handleFinish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    console.log("[SplashAnimated] video ended or timeout — fading out");
    videoOpacity.value = withTiming(0, { duration: 400 });
    setTimeout(() => onFinish(), 450);
  }, [onFinish, videoOpacity]);

  useEventListener(player, "playToEnd", () => {
    console.log("[SplashAnimated] playToEnd received");
    videoEndedRef.current = true;
    if (authReady) {
      handleFinish();
    }
  });

  useEffect(() => {
    if (authReady && videoEndedRef.current && !finishedRef.current) {
      console.log("[SplashAnimated] authReady after video ended — finishing");
      handleFinish();
    }
  }, [authReady, handleFinish]);

  useEventListener(player, "statusChange", ({ status, error }) => {
    console.log("[SplashAnimated] status:", status, error ? "error:" + error : "");
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("[SplashAnimated] timeout fallback — finishing");
      handleFinish();
    }, VIDEO_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [handleFinish]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#132852", "#1a3569", "#0d1b33"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.videoWrapper, videoStyle]}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          nativeControls={false}
          contentFit="cover"
          surfaceType={Platform.OS === "android" ? "textureView" : undefined}
          onFirstFrameRender={() => {
            console.log("[SplashAnimated] onFirstFrameRender");
            fireReady();
          }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  videoWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: W,
    height: H,
  },
  particle: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
});
