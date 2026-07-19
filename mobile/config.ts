/**
 * Configuración centralizada de la app móvil.
 *
 * La URL base de la API se resuelve con esta precedencia:
 * 1. Variable de entorno EXPO_PUBLIC_API_URL (si está disponible en build-time)
 * 2. app.json → extra.apiBase (configurable por entorno)
 * 3. http://localhost:8000 (fallback para desarrollo local)
 *
 * Para cambiar la IP en desarrollo sin editar app.json,
 * crear un archivo .env en la raíz del proyecto mobile con:
 *   EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
 *
 * O editar directamente mobile/app.json → extra.apiBase.
 */

import Constants from "expo-constants";

// En Expo, las variables de entorno se pasan mediante app.json extra o
// mediante dotenv. Para compatibilidad, intentamos ambas fuentes.
let envApiUrl: string | undefined;

// process.env en Expo sólo funciona con plugins como expo-constants o
// babel-plugin-inline-dotenv. Lo intentamos por si existe.
try {
  if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL) {
    envApiUrl = process.env.EXPO_PUBLIC_API_URL;
  }
} catch {
  // Ignorar — process.env puede no estar definido en algunos entornos Expo
}

const extra = (
  Constants.expoConfig?.extra ?? {}
) as Record<string, unknown>;

export const API_BASE: string =
  envApiUrl ??
  (extra.apiBase as string | undefined) ??
  "http://localhost:8000";

export const APP_NAME = "UCA Móvil";
export const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";
