import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { dialog } from "electron";
import type { BrowserWindow } from "electron";
import type { DataPaths } from "../database/paths";
import {
  resolveSafeUploadFile,
  toLocalMediaUrl,
} from "../media/localMediaProtocol";

export type PhotoFolder = "members" | "trainers" | "products" | "admin" | "gym";

const ALLOWED_FOLDERS = new Set<PhotoFolder>(["members", "trainers", "products", "admin", "gym"]);

function assertPhotoFolder(folder: string | undefined): asserts folder is PhotoFolder {
  if (!folder || !ALLOWED_FOLDERS.has(folder as PhotoFolder)) {
    throw new Error("Invalid photo folder.");
  }
}

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_BYTES = 15 * 1024 * 1024;

export type PickPhotoResult =
  | { cancelled: true }
  | { cancelled: false; error: string }
  | { cancelled: false; relativePath: string; previewUrl: string };

function uploadDir(uploadsDir: string, folder: PhotoFolder): string {
  const dir = path.join(uploadsDir, folder);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function extensionForFile(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return null;
  return ext === ".jpeg" ? ".jpg" : ext;
}

function validateSourceImage(sourcePath: string): void {
  if (!fs.existsSync(sourcePath)) {
    throw new Error("The selected file no longer exists.");
  }
  const stat = fs.statSync(sourcePath);
  if (!stat.isFile()) {
    throw new Error("Please select a valid image file.");
  }
  if (stat.size > MAX_BYTES) {
    throw new Error("Image is too large. Maximum size is 15 MB.");
  }
  if (!extensionForFile(sourcePath)) {
    throw new Error("Unsupported format. Use JPG, PNG, or WEBP.");
  }
}

export function importPhotoFromPath(
  paths: DataPaths,
  folder: PhotoFolder,
  sourcePath: string,
): string {
  assertPhotoFolder(folder);
  validateSourceImage(sourcePath);
  const ext = extensionForFile(sourcePath)!;
  const destDir = uploadDir(paths.uploads_dir, folder);
  const fileName = `${randomUUID()}${ext}`;
  fs.copyFileSync(sourcePath, path.join(destDir, fileName));
  return path.posix.join(folder, fileName);
}

export function importPhotoFromBase64(
  paths: DataPaths,
  folder: PhotoFolder,
  base64Data: string,
  mimeType = "image/jpeg",
): string {
  assertPhotoFolder(folder);
  if (!base64Data?.trim()) {
    throw new Error("Captured image is empty.");
  }
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i.exec(base64Data);
  const payload = match ? match[2]! : base64Data.replace(/^data:.*?;base64,/, "");
  const mime = match ? match[1]!.toLowerCase() : mimeType.toLowerCase();

  let ext = ".jpg";
  if (mime.includes("png")) ext = ".png";
  else if (mime.includes("webp")) ext = ".webp";

  const buffer = Buffer.from(payload, "base64");
  if (buffer.length > MAX_BYTES) {
    throw new Error("Image is too large. Maximum size is 15 MB.");
  }
  if (buffer.length === 0) {
    throw new Error("Captured image is empty.");
  }

  const destDir = uploadDir(paths.uploads_dir, folder);
  const fileName = `${randomUUID()}${ext}`;
  fs.writeFileSync(path.join(destDir, fileName), buffer);
  return path.posix.join(folder, fileName);
}

export async function pickPhotoFromDialog(
  win: BrowserWindow | null,
  paths: DataPaths,
  folder: PhotoFolder,
  title: string,
): Promise<PickPhotoResult> {
  const { canceled, filePaths } = await dialog.showOpenDialog(win ?? undefined, {
    title,
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp"] }],
  });

  if (canceled || filePaths.length === 0) {
    return { cancelled: true };
  }

  try {
    const relativePath = importPhotoFromPath(paths, folder, filePaths[0]!);
    const previewUrl = toLocalMediaUrl(relativePath);
    if (!previewUrl) {
      return { cancelled: false, error: "Unable to preview the selected image." };
    }
    return { cancelled: false, relativePath, previewUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to use the selected file.";
    return { cancelled: false, error: message };
  }
}

export function resolveProfilePhotoUrl(
  paths: DataPaths,
  relativePath: string | null | undefined,
): string | null {
  if (!relativePath?.trim()) return null;
  const absolute = resolveSafeUploadFile(paths.uploads_dir, relativePath);
  if (!absolute) return null;
  return toLocalMediaUrl(relativePath);
}

export function deleteProfilePhotoFile(
  paths: DataPaths,
  relativePath: string | null | undefined,
): void {
  if (!relativePath?.trim()) return;
  const absolute = resolveSafeUploadFile(paths.uploads_dir, relativePath);
  if (!absolute) return;
  try {
    fs.unlinkSync(absolute);
  } catch {
    // ignore missing file
  }
}

export function replaceProfilePhoto(
  paths: DataPaths,
  previousRelative: string | null | undefined,
  nextRelative: string | null | undefined,
): void {
  if (previousRelative && previousRelative !== nextRelative) {
    deleteProfilePhotoFile(paths, previousRelative);
  }
}
