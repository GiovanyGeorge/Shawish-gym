import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type DataPaths = {
  data_dir: string;
  database_path: string;
  backups_dir: string;
  uploads_dir: string;
  logs_dir: string;
};

export function resolveDataPaths(): DataPaths {
  const base = path.join(
    process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"),
    "Shawish",
  );

  return {
    data_dir: base,
    database_path: path.join(base, "shawish.db"),
    backups_dir: path.join(base, "backups"),
    uploads_dir: path.join(base, "uploads"),
    logs_dir: path.join(base, "logs"),
  };
}

export function ensureDataDirectories(paths: DataPaths): void {
  for (const dir of [
    paths.data_dir,
    paths.backups_dir,
    paths.uploads_dir,
    path.join(paths.uploads_dir, "members"),
    path.join(paths.uploads_dir, "trainers"),
    path.join(paths.uploads_dir, "products"),
    paths.logs_dir,
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
