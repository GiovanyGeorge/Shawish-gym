import type { AppInfo, AppPaths } from "@/types/system";
import { isElectron } from "@/utils/electron";

export async function getAppPaths(): Promise<AppPaths> {
  if (!isElectron() || !window.shawish) {
    throw new Error("SHAWISH desktop API is unavailable.");
  }
  return window.shawish.system.getAppPaths();
}

export async function getAppInfo(): Promise<AppInfo> {
  if (!isElectron() || !window.shawish) {
    throw new Error("SHAWISH desktop API is unavailable.");
  }
  return window.shawish.system.getAppInfo();
}
