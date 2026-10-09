import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import type { Database } from "sql.js";
import { queryAll, queryOne } from "../database/query";
import { runInTransaction } from "../database/transaction";
import { getSettingValue, setSettingValue } from "./settingsService";

export const EXERCISE_SEED_VERSION = "1";

type SeedExercise = {
  id: string;
  name: string;
  muscle_group: string;
  secondary_muscles?: string | null;
  equipment: string;
  category: string;
  difficulty: string;
  instructions?: string | null;
};

type SeedFile = {
  version: number;
  exercises: SeedExercise[];
};

export type ExerciseSeedResult = {
  already_applied: boolean;
  inserted: number;
  skipped_existing: number;
  total_in_seed: number;
};

function seedFilePath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "seeds", "exercises.v1.json");
  }
  const appRoot = process.env.APP_ROOT ?? app.getAppPath();
  return path.join(appRoot, "electron/main/database/seeds/exercises.v1.json");
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function seedExerciseLibrary(db: Database): ExerciseSeedResult {
  const current = getSettingValue(db, "exercise_seed_version", "0");
  if (current === EXERCISE_SEED_VERSION) {
    return { already_applied: true, inserted: 0, skipped_existing: 0, total_in_seed: 0 };
  }

  const file = seedFilePath();
  if (!fs.existsSync(file)) {
    throw new Error(`Exercise seed file was not found: ${file}`);
  }

  const payload = JSON.parse(fs.readFileSync(file, "utf8")) as SeedFile;
  const rows = payload.exercises ?? [];

  return runInTransaction(db, () => {
    const existing = queryAll(db, `SELECT name, source, external_id FROM exercises`);
    const names = new Set(existing.map((r) => normalizeName(String(r.name ?? ""))));
    const keys = new Set(
      existing
        .filter((r) => r.external_id)
        .map((r) => `${String(r.source)}::${String(r.external_id)}`),
    );

    let inserted = 0;
    let skipped = 0;
    const stmt = db.prepare(
      `INSERT INTO exercises (
         name, muscle_group, secondary_muscles, equipment, category, difficulty,
         instructions, image_path, source, external_id, is_archived, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'system', ?, 0, datetime('now'))`,
    );

    try {
      for (const row of rows) {
        const ext = String(row.id || "").trim();
        const name = String(row.name || "").trim();
        if (!ext || !name) {
          skipped += 1;
          continue;
        }
        const key = `system::${ext}`;
        const nname = normalizeName(name);
        if (keys.has(key) || names.has(nname)) {
          skipped += 1;
          continue;
        }
        stmt.run([
          name,
          row.muscle_group,
          row.secondary_muscles ?? null,
          row.equipment,
          row.category,
          row.difficulty,
          row.instructions ?? null,
          ext,
        ]);
        keys.add(key);
        names.add(nname);
        inserted += 1;
      }
    } finally {
      stmt.free();
    }

    setSettingValue(db, "exercise_seed_version", EXERCISE_SEED_VERSION);
    return {
      already_applied: false,
      inserted,
      skipped_existing: skipped,
      total_in_seed: rows.length,
    };
  });
}

export function getExerciseSeedStatus(db: Database): { version: string; exercise_count: number } {
  return {
    version: getSettingValue(db, "exercise_seed_version", "0"),
    exercise_count: Number(queryOne(db, `SELECT COUNT(*) AS c FROM exercises`)?.c ?? 0),
  };
}
