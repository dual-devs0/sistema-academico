import { Stack, useRouter, useSegments } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { BackHandler, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
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
  const { status } = useAuth();

  useEffect(() => {
    const onBack = () => {
      if (!router.canGoBack()) {
        if (activeTabIndex > 0) {
          goToFirstTab?.();
          return true;
        }
        BackHandler.exitApp();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, [router, status]);

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

  // Show animated splash while animation or auth is still loading
  if (!animDone || status === "loading") {
    return <SplashAnimated onFinish={() => setAnimDone(true)} />;
  }

  // If fonts aren't ready yet, show plain background
  if (!fontsReady) {
    return <View style={{ flex: 1, backgroundColor: "#1a3569" }} />;
  }

  return (
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
        <Stack.Screen name="cursos/[id]" />
      </Stack>
    </AuthGate>
  );
}

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

  // Hide the native splash screen IMMEDIATELY so our Lottie animation
  // takes over without the native splash flashing
  const hideSplash = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Hide native splash as soon as this component mounts
  // Font loading happens in background — title/subtitle fonts use system font
  useEffect(() => {
    hideSplash();
  }, [hideSplash]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#1a3569" }}>
      <ThemeProvider>
        <AuthProvider>
          <ThemeStatusBar />
          <AppGate fontsReady={fontsLoaded || !!fontError} />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
