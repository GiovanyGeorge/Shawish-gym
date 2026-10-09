import { ipcInvoke } from "@/services/ipc";

export type PickMemberPhotoResult =
  | { cancelled: true }
  | { cancelled: false; error: string }
  | { cancelled: false; relativePath: string; previewUrl: string };

export function pickMemberPhoto() {
  return ipcInvoke<PickMemberPhotoResult>("members:pickPhoto");
}

export function resolveMemberPhotoUrl(relativePath: string | null | undefined) {
  return ipcInvoke<{ url: string | null }>("members:getPhotoUrl", {
    relativePath: relativePath ?? null,
  });
}

export function deletePendingMemberPhoto(relativePath: string | null | undefined) {
  if (!relativePath) return Promise.resolve({ ok: true });
  return ipcInvoke<{ ok: boolean }>("members:deletePendingPhoto", { relativePath });
}
