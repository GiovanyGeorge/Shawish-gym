import fs from "node:fs";
import path from "node:path";
import { dialog } from "electron";
import type { BrowserWindow } from "electron";
import { queryAll, runExecute, runStatement } from "../database/query";
import type { DataPaths } from "../database/paths";
import { getDatabase, setDatabase, withPersist } from "./store";
import { initializeDatabase } from "../database/init";
import { insertNotification } from "./notificationsService";
import { readAppSettingsFromDb, setSettingValue } from "./settingsService";
import { localTodayIso } from "../utils/localDate";
import { addDaysIso } from "../utils/dates";

export type BackupRecord = {
  id: number;
  folder_name: string;
  folder_path: string;
  created_at: string;
  status: string;
  notes: string | null;
};

function stampName(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `Shawish_Backup_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

function resolveBackupRoot(paths: DataPaths, configured: string): string {
  const root = configured.trim() || paths.backups_dir;
  fs.mkdirSync(root, { recursive: true });
  return root;
}

function copyDir(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, dest, { recursive: true });
}

export function listBackups(): BackupRecord[] {
  return withPersist((db) =>
    queryAll(db, `SELECT * FROM backup_history ORDER BY created_at DESC, id DESC`).map((row) => ({
      id: Number(row.id),
      folder_name: String(row.folder_name),
      folder_path: String(row.folder_path),
      created_at: String(row.created_at),
      status: String(row.status),
      notes: row.notes != null ? String(row.notes) : null,
    })),
  );
}

export function createBackup(paths: DataPaths): BackupRecord {
  const store = getDatabase();
  store.persist();

  const settings = withPersist((db) => readAppSettingsFromDb(db));
  const root = resolveBackupRoot(paths, settings.backup_location);
  const name = stampName();
  const dest = path.join(root, name);

  try {
    fs.mkdirSync(dest, { recursive: true });
    fs.copyFileSync(paths.database_path, path.join(dest, "shawish.db"));
    copyDir(paths.uploads_dir, path.join(dest, "uploads"));
    fs.writeFileSync(
      path.join(dest, "manifest.json"),
      JSON.stringify(
        {
          created_at: new Date().toISOString(),
          includes: ["shawish.db", "uploads"],
          product: "SHAWISH",
        },
        null,
        2,
      ),
    );

    const record = withPersist((db) => {
      const id = runStatement(
        db,
        `INSERT INTO backup_history (folder_name, folder_path, status, notes) VALUES (?, ?, 'completed', NULL)`,
        [name, dest],
      );
      if (settings.notify_backup) {
        insertNotification(db, {
          category: "System",
          type: "backup_completed",
          title: "Backup completed successfully.",
          body: name,
          related_path: "/settings?tab=backup",
          reference_key: `backup_ok:${id}`,
        });
      }
      pruneOldBackups(db, root, settings.backup_retention);
      return listBackups().find((b) => b.id === id)!;
    });
    store.persist();
    return record;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed.";
    withPersist((db) => {
      runStatement(
        db,
        `INSERT INTO backup_history (folder_name, folder_path, status, notes) VALUES (?, ?, 'failed', ?)`,
        [name, dest, message],
      );
      if (settings.notify_backup) {
        insertNotification(db, {
          category: "System",
          type: "backup_failed",
          title: "Backup failed.",
          body: message,
          related_path: "/settings?tab=backup",
          reference_key: `backup_fail:${Date.now()}`,
        });
      }
    });
    throw new Error(message);
  }
}

function pruneOldBackups(db: import("sql.js").Database, root: string, retention: number) {
  const rows = queryAll(
    db,
    `SELECT id, folder_path FROM backup_history WHERE status = 'completed' ORDER BY created_at DESC`,
  );
  const extra = rows.slice(Math.max(0, retention));
  for (const row of extra) {
    const folder = String(row.folder_path);
    if (folder.startsWith(root) && fs.existsSync(folder)) {
      fs.rmSync(folder, { recursive: true, force: true });
    }
    runExecute(db, `DELETE FROM backup_history WHERE id = ?`, [Number(row.id)]);
  }
}

export function deleteBackup(id: number): void {
  withPersist((db) => {
    const row = queryAll(db, `SELECT folder_path FROM backup_history WHERE id = ?`, [id])[0];
    if (!row) return;
    const folder = String(row.folder_path);
    if (fs.existsSync(folder)) fs.rmSync(folder, { recursive: true, force: true });
    runExecute(db, `DELETE FROM backup_history WHERE id = ?`, [id]);
  });
}

export async function restoreBackup(paths: DataPaths, folderPath: string): Promise<void> {
  const dbFile = path.join(folderPath, "shawish.db");
  if (!fs.existsSync(dbFile)) throw new Error("Backup folder is missing shawish.db.");
  const store = getDatabase();
  store.persist();
  store.close();

  fs.copyFileSync(dbFile, paths.database_path);
  const uploadsBackup = path.join(folderPath, "uploads");
  if (fs.existsSync(uploadsBackup)) {
    fs.rmSync(paths.uploads_dir, { recursive: true, force: true });
    copyDir(uploadsBackup, paths.uploads_dir);
  }

  const next = await initializeDatabase(paths);
  setDatabase(next);
}

export async function chooseBackupFolder(win: BrowserWindow | null): Promise<string | null> {
  const result = await dialog.showOpenDialog(win ?? undefined, {
    title: "Choose backup folder",
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
}

export function maybeRunAutoBackup(paths: DataPaths): void {
  const settings = withPersist((db) => readAppSettingsFromDb(db));
  if (!settings.auto_backup_enabled) return;
  const today = localTodayIso();
  const last = settings.last_auto_backup_at.slice(0, 10);
  if (last === today) return;
  if (settings.auto_backup_frequency === "weekly" && last) {
    if (last > addDaysIso(today, -7)) return;
  }
  try {
    createBackup(paths);
    withPersist((db) => setSettingValue(db, "last_auto_backup_at", today));
  } catch {
    // recorded as failed backup + notification
  }
}
