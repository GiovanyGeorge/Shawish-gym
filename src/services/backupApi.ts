import { ipcInvoke } from "@/services/ipc";

export type BackupRecord = {
  id: number;
  folder_name: string;
  folder_path: string;
  created_at: string;
  status: string;
  notes: string | null;
};

export function fetchBackups() {
  return ipcInvoke<BackupRecord[]>("backup:list");
}

export function createBackup() {
  return ipcInvoke<BackupRecord>("backup:create");
}

export function deleteBackup(id: number) {
  return ipcInvoke<{ ok: true }>("backup:delete", { id });
}

export function chooseBackupFolder() {
  return ipcInvoke<string | null>("backup:chooseFolder");
}

export function restoreBackup(folderPath: string) {
  return ipcInvoke<{ ok: true }>("backup:restore", { folder_path: folderPath });
}
