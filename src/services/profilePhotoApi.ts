import { ipcInvoke } from "@/services/ipc";

export type PhotoFolder = "members" | "trainers" | "products" | "admin" | "gym";

export type PickPhotoResult =
  | { cancelled: true }
  | { cancelled: false; error: string }
  | { cancelled: false; relativePath: string; previewUrl: string };

export function pickProfilePhoto(folder: PhotoFolder, title?: string) {
  return ipcInvoke<PickPhotoResult>("photos:pick", { folder, title });
}

export function saveCapturedProfilePhoto(folder: PhotoFolder, dataUrl: string) {
  return ipcInvoke<
    | { ok: true; relativePath: string; previewUrl: string }
    | { ok: false; error: string }
  >("photos:saveCaptured", { folder, dataUrl });
}

export function resolveProfilePhotoUrl(relativePath: string | null | undefined) {
  return ipcInvoke<{ url: string | null }>("photos:getUrl", {
    relativePath: relativePath ?? null,
  });
}

export function deletePendingProfilePhoto(relativePath: string | null | undefined) {
  if (!relativePath) return Promise.resolve({ ok: true });
  return ipcInvoke<{ ok: boolean }>("photos:deletePending", { relativePath });
}
