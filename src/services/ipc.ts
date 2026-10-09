import { isElectron } from "@/utils/electron";

export async function ipcInvoke<T>(channel: string, payload?: unknown): Promise<T> {
  if (!isElectron() || !window.shawish?.api) {
    throw new Error("SHAWISH desktop API is unavailable.");
  }
  return window.shawish.api.invoke<T>(channel, payload);
}
