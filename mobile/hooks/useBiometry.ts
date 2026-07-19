import { useCallback, useEffect, useState } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Preferencia biométrica del usuario + capacidad del dispositivo.
 *
 * - `available`: hardware presente + al menos un factor enrolado (huella
 *   o Face ID).
 * - `enabled`: preferencia guardada en AsyncStorage.
 * - `setEnabled`: intenta autenticar antes de guardar `true` — no queremos
 *   permitir "prender biometría" sin que el usuario demuestre poseerla.
 */

const STORAGE_KEY = "uca.biometry_enabled";

interface BiometryState {
  available: boolean;
  enabled: boolean;
  loading: boolean;
  setEnabled: (v: boolean) => Promise<{ ok: boolean; error?: string }>;
}

export function useBiometry(): BiometryState {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setAvailable(hasHardware && enrolled);
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        setEnabledState(stored === "true");
      } catch {
        setAvailable(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setEnabled = useCallback<BiometryState["setEnabled"]>(
    async (v) => {
      if (v) {
        try {
          const res = await LocalAuthentication.authenticateAsync({
            promptMessage: "Confirmá con biometría para activarla",
            cancelLabel: "Cancelar",
            disableDeviceFallback: false,
          });
          if (!res.success) {
            return { ok: false, error: "Autenticación cancelada" };
          }
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
      }
      setEnabledState(v);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, v ? "true" : "false");
      } catch {
        // silenciar
      }
      return { ok: true };
    },
    [],
  );

  return { available, enabled, loading, setEnabled };
}
