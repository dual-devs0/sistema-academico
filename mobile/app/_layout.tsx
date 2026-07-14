import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
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
import { SplashAnimated } from "../components/SplashAnimated";
import { colors } from "../constants/design";
import "../global.css";

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Auth guard basado en segmentos de expo-router.
 * - status=anon + fuera de (auth) → manda a /login.
 * - status=auth + dentro de (auth) → manda a home tabs.
 * Solo se monta cuando el status ya está resuelto (ver AppGate) — no
 * hace falta chequear 'loading' acá.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
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

  return <>{children}</>;
}

/**
 * Orquesta la splash animada contra el auth check.
 * - Muestra `SplashAnimated` hasta que se cumplan AMBAS condiciones:
 *   1. la animación terminó su secuencia propia (onFinish, ~2000ms)
 *   2. `useAuth().status` ya no es 'loading' (SecureStore + refresh resueltos)
 * - Si el auth check demora más de 2s, la splash queda en su frame final
 *   (todos los valores animados ya asentados) hasta que status resuelva —
 *   no vuelve a disparar la secuencia.
 */
function AppGate() {
  const { status } = useAuth();
  const [animDone, setAnimDone] = useState(false);

  if (!animDone || status === "loading") {
    return <SplashAnimated onFinish={() => setAnimDone(true)} />;
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
      // Ocultar el splash nativo apenas las fuentes están listas — a
      // partir de acá la SplashAnimated (JS) toma el control visual.
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
          <AppGate />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
