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
import { configureApi } from "../services/api";
import {
  loginRequest,
  logoutRequest,
  refreshRequest,
  type LoginPayload,
} from "../services/authService";

type Status = "loading" | "auth" | "anon";

interface AuthState {
  status: Status;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (access: string, csrf?: string) => void;
  confirmAuth: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const accessRef = useRef<string | null>(null);
  const csrfRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    configureApi({
      getAccess: () => accessRef.current,
      setAccess: (token) => {
        accessRef.current = token;
      },
      refresh: async () => {
        const res = await refreshRequest(csrfRef.current);
        accessRef.current = res.access_token;
        if (res.csrf_token) {
          csrfRef.current = res.csrf_token;
        }
        return res.access_token;
      },
      onAuthFailed: () => {
        accessRef.current = null;
        csrfRef.current = null;
        if (mounted) setStatus("anon");
      },
    });

    if (mounted) setStatus("anon");

    return () => {
      mounted = false;
    };
  }, []);

  const auth = useMemo<AuthState>(
    () => ({
      status,
      login: async (payload) => {
        const res = await loginRequest(payload);
        accessRef.current = res.access_token;
        if (res.csrf_token) {
          csrfRef.current = res.csrf_token;
        }
        setStatus("auth");
      },
      logout: async () => {
        try {
          await logoutRequest();
        } catch {
          // sesión ya inválida en server
        }
        accessRef.current = null;
        csrfRef.current = null;
        setStatus("anon");
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
