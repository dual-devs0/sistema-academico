// Chequeo/aplicación de actualizaciones OTA (expo-updates) + fallback al
// chequeo remoto (GET /version) cuando el build no soporta OTA (dev client).
// Publicación: `npx eas update --branch <branch>`. Ver UPDATES_MOVIL.md.
//
// Nota: NO se importa `expo-updates` directamente. Su módulo JS ejecuta
// `requireNativeModule('ExpoUpdates')` que LANZA cuando el módulo nativo no
// está linkeado (dev client / Expo Go), y ese error no se puede atrapar con
// try/catch. Por eso se accede al módulo nativo vía `expo-modules-core`
// (siempre presente) con `requireOptionalNativeModule`, que no lanza.
import { requireOptionalNativeModule } from "expo-modules-core";
import { api } from "./api";
import { APP_VERSION } from "../config";

type ExpoUpdatesModule = {
  isEnabled: boolean;
  checkForUpdateAsync(): Promise<{ isAvailable: boolean }>;
  fetchUpdateAsync(): Promise<{ isNew: boolean }>;
  reload(): Promise<void>;
};

function getUpdatesModule(): ExpoUpdatesModule | null {
  try {
    const mod = requireOptionalNativeModule("ExpoUpdates");
    return mod && mod.isEnabled ? (mod as ExpoUpdatesModule) : null;
  } catch {
    return null;
  }
}

export type UpdateStatus = {
  otaEnabled: boolean;
  otaAvailable: boolean;
  backendNewer: boolean;
  latestVersion: string | null;
  updateUrl: string | null;
  releaseNotes: string | null;
};

async function fetchRemoteInfo(): Promise<{
  latestVersion: string | null;
  updateUrl: string | null;
  releaseNotes: string | null;
}> {
  try {
    const { data } = await api.get<{
      latestVersion?: string;
      minVersion?: string;
      updateUrl?: string;
      releaseNotes?: string;
    }>("/version");
    return {
      latestVersion: data.latestVersion ?? null,
      updateUrl: data.updateUrl ?? null,
      releaseNotes: data.releaseNotes ?? null,
    };
  } catch {
    return { latestVersion: null, updateUrl: null, releaseNotes: null };
  }
}

function cmp(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

export async function checkForUpdate(): Promise<UpdateStatus> {
  // En builds con updates deshabilitados (dev), checkForUpdateAsync lanza y
  // simplemente informamos según el backend.
  const Updates = getUpdatesModule();
  const otaEnabled = Updates != null;
  let otaAvailable = false;
  if (otaEnabled) {
    try {
      const res = await Updates.checkForUpdateAsync();
      otaAvailable = res.isAvailable;
    } catch {
      otaAvailable = false;
    }
  }

  const remote = await fetchRemoteInfo();
  const backendNewer =
    remote.latestVersion != null && cmp(remote.latestVersion, APP_VERSION) > 0;

  return {
    otaEnabled,
    otaAvailable,
    backendNewer,
    latestVersion: remote.latestVersion,
    updateUrl: remote.updateUrl,
    releaseNotes: remote.releaseNotes,
  };
}

export async function downloadAndReloadUpdate(silent = false) {
  const Updates = getUpdatesModule();
  if (!Updates) {
    return { ok: false, reason: "ota-disabled" };
  }
  try {
    const res = await Updates.fetchUpdateAsync();
    if (res.isNew) {
      if (!silent) {
        await Updates.reload();
      }
      return { ok: true, reloaded: !silent };
    }
    return { ok: false, reason: "no-update" };
  } catch {
    return { ok: false, reason: "error" };
  }
}