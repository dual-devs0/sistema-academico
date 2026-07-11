import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import { configureApi } from "../services/api";
import {
  loginRequest,
  logoutRequest,
  refreshRequest,
  type LoginPayload,
} from "../services/authService";

/**
 * Estado global de autenticación.
 *
 * - `accessToken` vive solo en memoria (ref, no state — evita re-renders al
 *   rotarlo). Se inyecta en cada request vía interceptor de api.ts.
 * - `refresh_token` se persiste en SecureStore (kSecAttrAccessibleAfterFirstUnlock
 *   en iOS; EncryptedSharedPreferences en Android).
 * - Al bootear la app, si hay refresh guardado se intenta canjear por access
 *   nuevo. Si falla → sesión anónima.
 */

type Status = "loading" | "auth" | "anon";

const REFRESH_KEY = "uca.refresh_token";

interface AuthState {
  status: Status;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function secureDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // silenciar — SecureStore lanza si la clave no existe en algunas versiones
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // silenciar — no bloquear login por falla del keychain
  }
}

async function secureGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const accessRef = useRef<string | null>(null);
  const refreshRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    configureApi({
      getAccess: () => accessRef.current,
      setAccess: (token) => {
        accessRef.current = token;
      },
      refresh: async () => {
        const stored = refreshRef.current;
        const res = await refreshRequest(stored);
        accessRef.current = res.access_token;
        if (res.refresh_token) {
          refreshRef.current = res.refresh_token;
          await secureSet(REFRESH_KEY, res.refresh_token);
        }
        return res.access_token;
      },
      onAuthFailed: () => {
        accessRef.current = null;
        refreshRef.current = null;
        void secureDelete(REFRESH_KEY);
        if (mounted) setStatus("anon");
      },
    });

    (async () => {
      const stored = await secureGet(REFRESH_KEY);
      if (!stored) {
        if (mounted) setStatus("anon");
        return;
      }
      refreshRef.current = stored;
      try {
        const res = await refreshRequest(stored);
        accessRef.current = res.access_token;
        if (res.refresh_token) {
          refreshRef.current = res.refresh_token;
          await secureSet(REFRESH_KEY, res.refresh_token);
        }
        if (mounted) setStatus("auth");
      } catch {
        accessRef.current = null;
        refreshRef.current = null;
        await secureDelete(REFRESH_KEY);
        if (mounted) setStatus("anon");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      status,
      login: async (payload) => {
        const res = await loginRequest(payload);
        accessRef.current = res.access_token;
        if (res.refresh_token) {
          refreshRef.current = res.refresh_token;
          await secureSet(REFRESH_KEY, res.refresh_token);
        }
        setStatus("auth");
      },
      logout: async () => {
        try {
          await logoutRequest();
        } catch {
          // sesión ya inválida en server — seguimos limpiando local
        }
        accessRef.current = null;
        refreshRef.current = null;
        await secureDelete(REFRESH_KEY);
        setStatus("anon");
      },
    }),
    [status],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
