import { queryAll, queryOne, runExecute, runStatement } from "../database/query";
import { withPersist } from "./store";

export type Exercise = {
  id: number;
  name: string;
  muscle_group: string;
  secondary_muscles: string | null;
  equipment: string | null;
  category: string | null;
  difficulty: string | null;
  image_path: string | null;
  instructions: string | null;
  source: "system" | "custom";
  external_id: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
};

export type CreateExerciseInput = {
  name: string;
  muscle_group: string;
  secondary_muscles?: string;
  equipment?: string;
  category?: string;
  difficulty?: string;
  instructions?: string;
};

export type UpdateExerciseInput = CreateExerciseInput & { id: number };

export type ListExercisesFilter = {
  search?: string;
  muscle_group?: string;
  equipment?: string;
  category?: string;
  difficulty?: string;
  include_archived?: boolean;
  archived_only?: boolean;
  limit?: number;
  offset?: number;
};

export type ExerciseFilterOptions = {
  muscle_groups: string[];
  equipment: string[];
  categories: string[];
  difficulties: string[];
};

function mapExercise(row: Record<string, unknown>): Exercise {
  return {
    id: Number(row.id),
    name: String(row.name),
    muscle_group: String(row.muscle_group),
    secondary_muscles: row.secondary_muscles != null ? String(row.secondary_muscles) : null,
    equipment: row.equipment != null ? String(row.equipment) : null,
    category: row.category != null ? String(row.category) : null,
    difficulty: row.difficulty != null ? String(row.difficulty) : null,
    image_path: row.image_path != null ? String(row.image_path) : null,
    instructions: row.instructions != null ? String(row.instructions) : null,
    source: String(row.source ?? "custom") === "system" ? "system" : "custom",
    external_id: row.external_id != null ? String(row.external_id) : null,
    is_archived: Number(row.is_archived ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function buildWhere(filter: ListExercisesFilter): { sql: string; params: (string | number)[] } {
  const clauses = ["1=1"];
  const params: (string | number)[] = [];
  if (filter.archived_only) {
    clauses.push("is_archived = 1");
  } else if (!filter.include_archived) {
    clauses.push("is_archived = 0");
  }
  if (filter.muscle_group) {
    clauses.push("muscle_group = ?");
    params.push(filter.muscle_group);
  }
  if (filter.equipment) {
    clauses.push("equipment = ?");
    params.push(filter.equipment);
  }
  if (filter.category) {
    clauses.push("category = ?");
    params.push(filter.category);
  }
  if (filter.difficulty) {
    clauses.push("difficulty = ?");
    params.push(filter.difficulty);
  }
  if (filter.search?.trim()) {
    clauses.push("(name LIKE ? OR muscle_group LIKE ? OR equipment LIKE ? OR IFNULL(secondary_muscles,'') LIKE ?)");
    const q = `%${filter.search.trim()}%`;
    params.push(q, q, q, q);
  }
  return { sql: clauses.join(" AND "), params };
}

export function listExercises(filter: ListExercisesFilter = {}): Exercise[] {
  return withPersist((db) => {
    const { sql, params } = buildWhere(filter);
    const limit = filter.limit && filter.limit > 0 ? Math.min(filter.limit, 500) : null;
    const offset = filter.offset && filter.offset > 0 ? filter.offset : 0;
    const paging = limit != null ? ` LIMIT ? OFFSET ?` : "";
    const pageParams = limit != null ? [...params, limit, offset] : params;
    return queryAll(
      db,
      `SELECT * FROM exercises WHERE ${sql} ORDER BY name COLLATE NOCASE${paging}`,
      pageParams,
    ).map((row) => mapExercise(row as Record<string, unknown>));
  });
}

export function countExercises(filter: ListExercisesFilter = {}): number {
  return withPersist((db) => {
    const { sql, params } = buildWhere(filter);
    return Number(queryOne(db, `SELECT COUNT(*) AS c FROM exercises WHERE ${sql}`, params)?.c ?? 0);
  });
}

export function listExerciseFilterOptions(): ExerciseFilterOptions {
  return withPersist((db) => {
    const distinct = (column: string) =>
      queryAll(
        db,
        `SELECT DISTINCT ${column} AS v FROM exercises WHERE ${column} IS NOT NULL AND TRIM(${column}) != '' ORDER BY v COLLATE NOCASE`,
      ).map((r) => String(r.v));
    return {
      muscle_groups: distinct("muscle_group"),
      equipment: distinct("equipment"),
      categories: distinct("category"),
      difficulties: distinct("difficulty"),
    };
  });
}

export function listActiveExercisesForPicker(): Exercise[] {
  return listExercises({ include_archived: false });
}

export function createExercise(input: CreateExerciseInput): Exercise {
  if (!input.name.trim()) throw new Error("Exercise name is required.");
  if (!input.muscle_group.trim()) throw new Error("Muscle group is required.");

  return withPersist((db) => {
    const id = runStatement(
      db,
      `INSERT INTO exercises (
         name, muscle_group, secondary_muscles, equipment, category, difficulty,
         instructions, source, is_archived, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'custom', 0, datetime('now'))`,
      [
        input.name.trim(),
        input.muscle_group.trim(),
        input.secondary_muscles?.trim() || null,
        input.equipment?.trim() || null,
        input.category?.trim() || "Strength",
        input.difficulty?.trim() || "Beginner",
        input.instructions?.trim() || null,
      ],
    );
    return mapExercise(queryOne(db, `SELECT * FROM exercises WHERE id = ?`, [id]) as Record<string, unknown>);
  });
}

export function updateExercise(input: UpdateExerciseInput): Exercise {
  if (!input.name.trim()) throw new Error("Exercise name is required.");
  if (!input.muscle_group.trim()) throw new Error("Muscle group is required.");

  return withPersist((db) => {
    const existing = queryOne(db, `SELECT id FROM exercises WHERE id = ?`, [input.id]);
    if (!existing) throw new Error("Exercise not found.");
    runExecute(
      db,
      `UPDATE exercises SET
         name = ?, muscle_group = ?, secondary_muscles = ?, equipment = ?,
         category = ?, difficulty = ?, instructions = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        input.name.trim(),
        input.muscle_group.trim(),
        input.secondary_muscles?.trim() || null,
        input.equipment?.trim() || null,
        input.category?.trim() || null,
        input.difficulty?.trim() || null,
        input.instructions?.trim() || null,
        input.id,
      ],
    );
    return mapExercise(queryOne(db, `SELECT * FROM exercises WHERE id = ?`, [input.id]) as Record<string, unknown>);
  });
}

export function archiveExercise(id: number): Exercise {
  return withPersist((db) => {
    const existing = queryOne(db, `SELECT id FROM exercises WHERE id = ?`, [id]);
    if (!existing) throw new Error("Exercise not found.");
    runExecute(db, `UPDATE exercises SET is_archived = 1, updated_at = datetime('now') WHERE id = ?`, [id]);
    return mapExercise(queryOne(db, `SELECT * FROM exercises WHERE id = ?`, [id]) as Record<string, unknown>);
  });
}
