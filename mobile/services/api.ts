import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from "axios";
import Constants from "expo-constants";

/**
 * Cliente HTTP central.
 *
 * Diseño del refresh (single-flight):
 * - Un solo /auth/refresh en vuelo a la vez.
 * - Requests que reciben 401 mientras hay refresh corriendo se encolan.
 * - Cuando el refresh resuelve, se reinyecta el nuevo access token en cada
 *   request encolado y se reintenta.
 * - Si el refresh falla → se rechaza toda la cola y se dispara onAuthFailed()
 *   para que el AuthProvider limpie estado y redirija a /login.
 * - Requests hacia /auth/login o /auth/refresh nunca disparan el flujo de
 *   refresh (evita recursión infinita).
 */

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  withCredentials: true,
});

type AccessGetter = () => string | null;
type AccessSetter = (token: string | null) => void;
type RefreshFn = () => Promise<string>;
type OnAuthFailed = () => void;

let getAccess: AccessGetter = () => null;
let setAccess: AccessSetter = () => {};
let doRefresh: RefreshFn | null = null;
let onAuthFailed: OnAuthFailed = () => {};

export function configureApi(opts: {
  getAccess: AccessGetter;
  setAccess: AccessSetter;
  refresh: RefreshFn;
  onAuthFailed: OnAuthFailed;
}): void {
  getAccess = opts.getAccess;
  setAccess = opts.setAccess;
  doRefresh = opts.refresh;
  onAuthFailed = opts.onAuthFailed;
}

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

function isAuthEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes("/auth/login") || url.includes("/auth/refresh");
}

api.interceptors.request.use((config) => {
  const token = getAccess();
  if (token && !isAuthEndpoint(config.url)) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;
type QueueItem = {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
};
const waiters: QueueItem[] = [];

function flushQueue(token: string | null, err: unknown): void {
  while (waiters.length > 0) {
    const w = waiters.shift();
    if (!w) continue;
    if (token !== null) w.resolve(token);
    else w.reject(err);
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;

    if (
      !original ||
      error.response?.status !== 401 ||
      original._retry ||
      isAuthEndpoint(original.url) ||
      !doRefresh
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    // Otro refresh ya en vuelo → encolar y esperar.
    if (refreshPromise) {
      return new Promise((resolve, reject) => {
        waiters.push({
          resolve: (newToken) => {
            const headers = AxiosHeaders.from(original.headers);
            headers.set("Authorization", `Bearer ${newToken}`);
            original.headers = headers;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    // Iniciar refresh single-flight.
    const currentRefresh = doRefresh;
    refreshPromise = currentRefresh()
      .then((newToken) => {
        setAccess(newToken);
        flushQueue(newToken, null);
        return newToken;
      })
      .catch((err) => {
        flushQueue(null, err);
        setAccess(null);
        onAuthFailed();
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });

    try {
      const newToken = await refreshPromise;
      const headers = AxiosHeaders.from(original.headers);
      headers.set("Authorization", `Bearer ${newToken}`);
      original.headers = headers;
      return api(original);
    } catch (e) {
      return Promise.reject(e);
    }
  },
);

export function getApiBaseUrl(): string {
  return API_BASE;
}
