import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkColors, lightColors } from "../constants/design";

/**
 * Preferencia de tema con persistencia.
 *
 * Semántica:
 * - `preference`: lo que el usuario eligió — `"system" | "dark" | "light"`.
 * - `effective`: el tema aplicado hoy (resuelve `system` contra `useColorScheme`).
 *
 * La app está diseñada exclusivamente dark por ahora — el toggle "Modo Oscuro"
 * de Perfil impide activar light hasta que existan tokens light. Igual dejamos
 * el hook completo por si más adelante habilitamos light.
 */

type Preference = "system" | "dark" | "light";
type Effective = "dark" | "light";

const STORAGE_KEY = "uca.theme_preference";

interface ThemeState {
  preference: Preference;
  effective: Effective;
  setPreference: (p: Preference) => Promise<void>;
  toggleDark: () => Promise<void>;
  colors: typeof darkColors | typeof lightColors;
}

const ThemeContext = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<Preference>("dark");

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "system" || stored === "dark" || stored === "light") {
          setPreferenceState(stored);
        }
      } catch {
        // silenciar
      }
    })();
  }, []);

  const effective: Effective = useMemo(() => {
    if (preference === "system") return systemScheme === "light" ? "light" : "dark";
    return preference;
  }, [preference, systemScheme]);

  const setPreference = useCallback(async (p: Preference) => {
    setPreferenceState(p);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, p);
    } catch {
      // silenciar
    }
  }, []);

  const toggleDark = useCallback(async () => {
    const next: Preference = effective === "dark" ? "light" : "dark";
    await setPreference(next);
  }, [effective, setPreference]);

  const value = useMemo<ThemeState>(
    () => ({
      preference,
      effective,
      setPreference,
      toggleDark,
      colors: effective === "dark" ? darkColors : lightColors,
    }),
    [preference, effective, setPreference, toggleDark],
  );

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}
