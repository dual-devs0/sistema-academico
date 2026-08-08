// Hook de autenticación — login/logout/refresh, csrfRef (no refreshRef, ver ISSUE-1 en CHANGELOG_FIXES.md). Consumido por: pantallas autenticadas.
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

type Status = "loading" | "auth" | "anon";

const SESSION_KEY = "uca.session_tokens";

interface StoredSession {
  access_token: string;
  refresh_token: string;
  csrf_token: string;
}

interface AuthState {
  status: Status;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (access: string, csrf?: string) => void;
  confirmAuth: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

async function saveSession(tokens: StoredSession): Promise<void> {
  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(tokens));
  } catch { /* silent */ }
}

async function loadSession(): Promise<StoredSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch { /* silent */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const accessRef = useRef<string | null>(null);
  const csrfRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let cancelled = false;

    configureApi({
      getAccess: () => accessRef.current,
      setAccess: (token) => {
        accessRef.current = token;
      },
      refresh: async () => {
        const rt = refreshTokenRef.current;
        if (rt) {
          const res = await refreshRequest(csrfRef.current, rt);
          accessRef.current = res.access_token;
          if (res.csrf_token) csrfRef.current = res.csrf_token;
          if (res.refresh_token) {
            refreshTokenRef.current = res.refresh_token;
            saveSession({
              access_token: res.access_token,
              refresh_token: res.refresh_token,
              csrf_token: res.csrf_token ?? "",
            });
          }
          return res.access_token;
        }
        const res = await refreshRequest(csrfRef.current);
        accessRef.current = res.access_token;
        if (res.csrf_token) csrfRef.current = res.csrf_token;
        if (res.refresh_token) {
          refreshTokenRef.current = res.refresh_token;
        }
        return res.access_token;
      },
      onAuthFailed: () => {
        accessRef.current = null;
        csrfRef.current = null;
        refreshTokenRef.current = null;
        clearSession();
        if (mounted) setStatus("anon");
      },
    });

    (async () => {
      const saved = await loadSession();
      if (saved && !cancelled) {
        accessRef.current = saved.access_token;
        csrfRef.current = saved.csrf_token;
        refreshTokenRef.current = saved.refresh_token;
        if (mounted) setStatus("auth");
        return;
      }
      if (mounted) setStatus("anon");
    })();

    return () => {
      mounted = false;
      cancelled = true;
    };
  }, []);

  const auth = useMemo<AuthState>(
    () => ({
      status,
      login: async (payload) => {
        const res = await loginRequest(payload);
        accessRef.current = res.access_token;
        if (res.csrf_token) csrfRef.current = res.csrf_token;
        if (res.refresh_token) refreshTokenRef.current = res.refresh_token;
        saveSession({
          access_token: res.access_token,
          refresh_token: res.refresh_token ?? "",
          csrf_token: res.csrf_token ?? "",
        });
        setStatus("auth");
      },
      logout: async () => {
        // Limpieza local inmediata: la próxima apertura exige login sí o sí,
        // incluso si la llamada de red falla (seguridad).
        accessRef.current = null;
        csrfRef.current = null;
        refreshTokenRef.current = null;
        await clearSession();
        setStatus("anon");
        // Revocación en el servidor best-effort (no bloquea la salida).
        logoutRequest().catch(() => {});
      },
      setTokens: (access, csrf) => {
        accessRef.current = access;
        if (csrf) csrfRef.current = csrf;
      },
      confirmAuth: () => {
        setStatus("auth");
      },
    }),
    [status],
  );

  return createElement(AuthContext.Provider, { value: auth }, children);
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
