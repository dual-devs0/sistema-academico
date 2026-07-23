import { api } from "./api";

/**
 * Contrato con el backend (POST /auth/login, /auth/refresh, /auth/logout).
 *
 * Login setea refresh_token como httpOnly cookie. Mobile usa
 * `withCredentials: true` para que las cookies se envíen automáticamente.
 * El CSRF token se recibe del body de login/refresh y se reenvía como header
 * en las peticiones mutantes.
 */

export interface LoginResponse {
  access_token: string;
  token_type: string;
  csrf_token?: string;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
  csrf_token?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", payload);
  return data;
}

export async function refreshRequest(
  csrfToken: string | null,
): Promise<RefreshResponse> {
  const headers: Record<string, string> = {};
  if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  const { data } = await api.post<RefreshResponse>(
    "/auth/refresh",
    {},
    { headers },
  );
  return data;
}

export async function logoutRequest(): Promise<void> {
  await api.post("/auth/logout", {});
}

/**
 * Recuperación de contraseña. Endpoint existente en el backend
 * (`POST /auth/recuperar-contrasena`, body `{ username_or_email }`).
 * Por seguridad, el backend responde el mismo mensaje genérico exista o
 * no el usuario — nunca revela si un username/email está registrado.
 */
export async function recuperarContrasenaRequest(
  usernameOrEmail: string,
  matricula?: string
): Promise<string> {
  const { data } = await api.post<{ detail: string }>("/auth/recuperar-contrasena", {
    username_or_email: usernameOrEmail,
    matricula: matricula || undefined,
  });
  return data.detail;
}

export interface RegistroPayload {
  documento: string;
  matricula: string;
}

export async function registroRequest(payload: RegistroPayload): Promise<string> {
  const { data } = await api.post<{ detail: string }>("/auth/registro", payload);
  return data.detail;
}
