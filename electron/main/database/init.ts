import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database } from "sql.js";
import { app } from "electron";
import type { DataPaths } from "./paths";
import { seedExerciseLibrary } from "../services/exerciseSeedService";

const MIGRATIONS_TABLE = `_shawish_migrations`;

function migrationsDirectory(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "migrations");
  }
  const appRoot = process.env.APP_ROOT ?? app.getAppPath();
  return path.join(appRoot, "electron/main/database/migrations");
}

function resolveWasmBinary(): Uint8Array {
  const candidates = [
    path.join(app.getAppPath(), "node_modules", "sql.js", "dist", "sql-wasm.wasm"),
    path.join(process.resourcesPath, "sql-wasm.wasm"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return new Uint8Array(fs.readFileSync(candidate));
    }
  }

  throw new Error(
    "Unable to locate sql.js WASM binary. Reinstall dependencies or rebuild the app.",
  );
}

function persistDatabase(db: Database, databasePath: string): void {
  const data = db.export();
  fs.writeFileSync(databasePath, Buffer.from(data));
}

function runPendingMigrations(db: Database, migrationsDir: string): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      name TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set<string>();
  const result = db.exec(`SELECT name FROM ${MIGRATIONS_TABLE};`);
  if (result[0]?.values) {
    for (const row of result[0].values) {
      applied.add(String(row[0]));
    }
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    db.exec(sql);
    db.run(`INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?);`, [file]);
  }
}

export type ShawishDatabase = {
  db: Database;
  paths: DataPaths;
  persist: () => void;
  close: () => void;
};

export async function initializeDatabase(paths: DataPaths): Promise<ShawishDatabase> {
  const SQL = await initSqlJs({ wasmBinary: resolveWasmBinary() });

  let db: Database;
  if (fs.existsSync(paths.database_path)) {
    db = new SQL.Database(fs.readFileSync(paths.database_path));
  } else {
    db = new SQL.Database();
  }

  db.run("PRAGMA foreign_keys = ON;");

  runPendingMigrations(db, migrationsDirectory());
  try {
    seedExerciseLibrary(db);
  } catch (error) {
    console.error("Exercise library seed failed:", error);
  }
  persistDatabase(db, paths.database_path);

  return {
    db,
    paths,
    persist: () => persistDatabase(db, paths.database_path),
    close: () => db.close(),
  };
}
