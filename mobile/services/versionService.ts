import { api } from "./api";

export interface VersionInfo {
  latestVersion: string;
  minVersion: string;
  updateUrl: string;
  releaseNotes: string;
}

export async function checkVersion(): Promise<VersionInfo> {
  const { data } = await api.get<VersionInfo>("/version");
  return data;
}

export function compareVersions(current: string, latest: string): "up-to-date" | "update-available" | "major" {
  const cur = current.split(".").map(Number);
  const lat = latest.split(".").map(Number);

  for (let i = 0; i < Math.max(cur.length, lat.length); i++) {
    const c = cur[i] ?? 0;
    const l = lat[i] ?? 0;
    if (l > c) return i === 0 ? "major" : "update-available";
    if (l < c) return "up-to-date";
  }
  return "up-to-date";
}
