import { api } from "./api";

/**
 * Contrato con el backend (POST /auth/login, /auth/refresh, /auth/logout).
 *
 * Login devuelve `refresh_token` en el body para clientes móviles y setea
 * la cookie HttpOnly para clientes web (auth_router.py:87). Refresh acepta
 * el token por body o por cookie; precedencia body > cookie
 * (auth_router.py:102).
 */

export interface LoginResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
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
  refreshToken: string | null,
): Promise<RefreshResponse> {
  const body = refreshToken ? { refresh_token: refreshToken } : {};
  const { data } = await api.post<RefreshResponse>("/auth/refresh", body);
  return data;
}

export async function logoutRequest(): Promise<void> {
  await api.post("/auth/logout", {});
}
