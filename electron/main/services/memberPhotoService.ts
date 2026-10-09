import type { BrowserWindow } from "electron";
import type { DataPaths } from "../database/paths";
import {
  deleteProfilePhotoFile,
  importPhotoFromPath,
  pickPhotoFromDialog,
  replaceProfilePhoto,
  resolveProfilePhotoUrl,
  type PickPhotoResult,
} from "./profilePhotoService";

export type PickMemberPhotoResult = PickPhotoResult;

export function importMemberPhoto(paths: DataPaths, sourcePath: string): string {
  return importPhotoFromPath(paths, "members", sourcePath);
}

export async function pickMemberPhoto(
  win: BrowserWindow | null,
  paths: DataPaths,
): Promise<PickMemberPhotoResult> {
  return pickPhotoFromDialog(win, paths, "members", "Choose member photo");
}

export function resolveMemberPhotoUrl(
  paths: DataPaths,
  relativePath: string | null | undefined,
): string | null {
  return resolveProfilePhotoUrl(paths, relativePath);
}

export function deleteMemberPhotoFile(
  paths: DataPaths,
  relativePath: string | null | undefined,
): void {
  deleteProfilePhotoFile(paths, relativePath);
}

export function replaceMemberPhoto(
  paths: DataPaths,
  previousRelative: string | null | undefined,
  nextRelative: string | null | undefined,
): void {
  replaceProfilePhoto(paths, previousRelative, nextRelative);
}
