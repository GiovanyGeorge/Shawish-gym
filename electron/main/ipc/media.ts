import { BrowserWindow, ipcMain } from "electron";
import type { DataPaths } from "../database/paths";
import {
  deleteProfilePhotoFile,
  importPhotoFromBase64,
  pickPhotoFromDialog,
  resolveProfilePhotoUrl,
  type PhotoFolder,
} from "../services/profilePhotoService";

export function registerMediaIpc(getPaths: () => DataPaths): void {
  ipcMain.handle("photos:pick", async (event, payload: unknown) => {
    const { folder, title } = (payload ?? {}) as { folder: PhotoFolder; title?: string };
    const win = BrowserWindow.fromWebContents(event.sender);
    return pickPhotoFromDialog(
      win,
      getPaths(),
      folder,
      title ?? "Choose photo",
    );
  });

  ipcMain.handle("photos:saveCaptured", (_event, payload: unknown) => {
    const { folder, dataUrl } = (payload ?? {}) as { folder: PhotoFolder; dataUrl: string };
    try {
      const relativePath = importPhotoFromBase64(getPaths(), folder, dataUrl);
      const previewUrl = resolveProfilePhotoUrl(getPaths(), relativePath);
      if (!previewUrl) {
        return { ok: false, error: "Unable to preview captured image." };
      }
      return { ok: true, relativePath, previewUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save captured image.";
      return { ok: false, error: message };
    }
  });

  ipcMain.handle("photos:getUrl", (_event, payload: unknown) => {
    const { relativePath } = (payload ?? {}) as { relativePath?: string | null };
    return {
      url: resolveProfilePhotoUrl(getPaths(), relativePath ?? null),
    };
  });

  ipcMain.handle("photos:deletePending", (_event, payload: unknown) => {
    const { relativePath } = (payload ?? {}) as { relativePath?: string | null };
    deleteProfilePhotoFile(getPaths(), relativePath ?? null);
    return { ok: true };
  });

  // Legacy channels
  ipcMain.handle("members:pickPhoto", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return pickPhotoFromDialog(win, getPaths(), "members", "Choose member photo");
  });

  ipcMain.handle("members:getPhotoUrl", (_event, payload: unknown) => {
    const { relativePath } = (payload ?? {}) as { relativePath?: string | null };
    return { url: resolveProfilePhotoUrl(getPaths(), relativePath ?? null) };
  });

  ipcMain.handle("members:deletePendingPhoto", (_event, payload: unknown) => {
    const { relativePath } = (payload ?? {}) as { relativePath?: string | null };
    deleteProfilePhotoFile(getPaths(), relativePath ?? null);
    return { ok: true };
  });
}
