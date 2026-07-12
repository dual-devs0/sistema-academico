import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
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
import { ThemeProvider } from "../hooks/useTheme";
import { colors } from "../constants/design";
import "../global.css";

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Auth guard basado en segmentos de expo-router.
 * - status=loading → no redirige, splash sigue visible.
 * - status=anon + fuera de (auth) → manda a /login.
 * - status=auth + dentro de (auth) → manda a home tabs.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    const inAuthGroup = segments[0] === "(auth)";
    if (status === "anon" && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (status === "auth" && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [status, segments, router]);

  return <>{children}</>;
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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemeProvider>
      <AuthProvider>
        <StatusBar style="light" />
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
            <Stack.Screen name="cursos" />
          </Stack>
        </AuthGate>
      </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
