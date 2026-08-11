import { Stack, useRouter, useSegments } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import { AuthProvider, useAuth } from "../hooks/useAuth";
import { ThemeProvider, useTheme } from "../hooks/useTheme";
import { SplashAnimated } from "../components/SplashAnimated";
import { activeTabIndex, goToFirstTab } from "../utils/currentTab";

import "../global.css";

// Prevent native splash from auto-hiding — we control it programmatically
SplashScreen.preventAutoHideAsync().catch(() => {});

function BackExitGuard() {
  const router = useRouter();
  const { status, logout } = useAuth();

  useEffect(() => {
    const onBack = () => {
      if (!router.canGoBack()) {
        if (activeTabIndex > 0) {
          goToFirstTab?.();
          return true;
        }
        // Salir de la app cerrando la sesión (seguridad: no guardar sesiones
        // al cierre). La limpieza local es async y no bloquea la salida: se
        // dispara y luego se mata el proceso.
        void logout().finally(() => BackHandler.exitApp());
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, [router, status, logout]);

  return null;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";
    if (status === "anon" && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (status === "auth" && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [status, segments, router]);

  return (
    <>
      <BackExitGuard />
      {children}
    </>
  );
}

function AppGate({ fontsReady }: { fontsReady: boolean }) {
  const { colors } = useTheme();
  const { status } = useAuth();
  const [animDone, setAnimDone] = useState(false);
  const splashHiddenRef = useRef(false);
  const overlayOpacity = useSharedValue(1);

  const hideNativeSplash = useCallback(() => {
    if (splashHiddenRef.current) return;
    splashHiddenRef.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const authReady = status !== "loading";
  const uiReady = authReady && fontsReady;

  useEffect(() => {
    if (animDone && uiReady) {
      overlayOpacity.value = withTiming(0, { duration: 400 });
    }
  }, [animDone, uiReady, overlayOpacity]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {uiReady && (
        <AuthGate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: "fade",
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="scanner"
              options={{
                presentation: "modal",
                animation: "fade",
              }}
            />
            <Stack.Screen name="cuenta" />
            <Stack.Screen name="examenes" />
            <Stack.Screen name="cambiar-contrasena" />
            <Stack.Screen name="cursos/[id]" />
          </Stack>
        </AuthGate>
      )}
      <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]} pointerEvents={animDone && uiReady ? "none" : "auto"}>
        <SplashAnimated
          onReady={hideNativeSplash}
          onFinish={() => setAnimDone(true)}
          authReady={authReady}
        />
      </Animated.View>
    </View>
  );
}

// AUDIT-FIX M-1: función duplicada eliminada post-merge
function ThemeStatusBar() {
  const { effective } = useTheme();
  return <StatusBar style={effective === "dark" ? "light" : "dark"} />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#083D74" }}>
      <ThemeProvider>
        <AuthProvider>
          <ThemeStatusBar />
          <AppGate fontsReady={fontsLoaded || !!fontError} />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
