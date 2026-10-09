import type { Database } from "sql.js";
import { queryAll, queryOne, runExecute, runStatement } from "../database/query";
import { withPersist, withPersistTransaction } from "./store";

export type WorkoutProgramSummary = {
  id: number;
  name: string;
  description: string | null;
  is_archived: number;
  day_count: number;
  created_at: string;
};

export type ProgramDayExercise = {
  id: number;
  exercise_id: number;
  exercise_name: string;
  muscle_group: string;
  planned_sets: number;
  target_reps: string;
  target_weight: number | null;
  notes: string | null;
  sort_order: number;
};

export type ProgramDay = {
  id: number;
  day_name: string;
  description: string | null;
  weekday: number | null;
  sort_order: number;
  exercises: ProgramDayExercise[];
};

export type WorkoutProgramDetail = {
  id: number;
  name: string;
  description: string | null;
  is_archived: number;
  days: ProgramDay[];
};

export type ProgramDayInput = {
  day_name: string;
  description?: string;
  weekday?: number | null;
  sort_order: number;
  exercises: {
    exercise_id: number;
    planned_sets: number;
    target_reps: string;
    target_weight?: number | null;
    notes?: string;
    sort_order: number;
  }[];
};

export type SaveProgramInput = {
  name: string;
  description?: string;
  days: ProgramDayInput[];
};

function validateProgramInput(input: SaveProgramInput): void {
  if (!input.name.trim()) throw new Error("Program name is required.");
  if (!input.days.length) throw new Error("Add at least one training day.");
  for (const day of input.days) {
    if (!day.day_name.trim()) throw new Error("Each training day must have a name.");
    for (const exercise of day.exercises) {
      if (!exercise.exercise_id) throw new Error("Each program exercise must reference an exercise.");
      if (exercise.planned_sets <= 0) throw new Error("Planned sets must be greater than zero.");
      const reps = Number.parseInt(exercise.target_reps, 10);
      if (!exercise.target_reps.trim() || Number.isNaN(reps) || reps <= 0) {
        throw new Error("Planned reps must be greater than zero.");
      }
    }
  }
}

function insertProgramTree(db: Database, programId: number, days: ProgramDayInput[]): void {
  for (const day of days) {
    const dayId = runStatement(
      db,
      `INSERT INTO workout_program_days (program_id, day_name, description, weekday, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [
        programId,
        day.day_name.trim(),
        day.description?.trim() ?? null,
        day.weekday ?? null,
        day.sort_order,
      ],
    );

    for (const exercise of day.exercises) {
      runStatement(
        db,
        `INSERT INTO workout_program_exercises
         (program_day_id, exercise_id, planned_sets, target_reps, target_weight, notes, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          dayId,
          exercise.exercise_id,
          exercise.planned_sets,
          exercise.target_reps.trim(),
          exercise.target_weight ?? null,
          exercise.notes?.trim() ?? null,
          exercise.sort_order,
        ],
      );
    }
  }
}

export function listWorkoutPrograms(includeArchived = false): WorkoutProgramSummary[] {
  return withPersist((db) =>
    queryAll(
      db,
      `SELECT p.id, p.name, p.description, p.is_archived, p.created_at,
              COUNT(DISTINCT d.id) AS day_count
       FROM workout_programs p
       LEFT JOIN workout_program_days d ON d.program_id = p.id
       WHERE ${includeArchived ? "1=1" : "p.is_archived = 0"}
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
    ) as unknown as WorkoutProgramSummary[],
  );
}

function getWorkoutProgramFromDb(db: Database, id: number): WorkoutProgramDetail | null {
  const program = queryOne(
    db,
    `SELECT id, name, description, is_archived FROM workout_programs WHERE id = ?`,
    [id],
  );
  if (!program) return null;

  const days = queryAll(
    db,
    `SELECT id, day_name, description, weekday, sort_order FROM workout_program_days
     WHERE program_id = ? ORDER BY sort_order, id`,
    [id],
  ) as { id: number; day_name: string; description: string | null; weekday: number | null; sort_order: number }[];

  const dayDetails: ProgramDay[] = days.map((day) => {
    const exercises = queryAll(
      db,
      `SELECT pe.id, pe.exercise_id, e.name AS exercise_name, e.muscle_group,
              pe.planned_sets, pe.target_reps, pe.target_weight, pe.notes, pe.sort_order
       FROM workout_program_exercises pe
       JOIN exercises e ON e.id = pe.exercise_id
       WHERE pe.program_day_id = ?
       ORDER BY pe.sort_order, pe.id`,
      [day.id],
    ) as unknown as ProgramDayExercise[];

    return {
      ...day,
      weekday: day.weekday != null ? Number(day.weekday) : null,
      exercises,
    };
  });

  return {
    id: Number(program.id),
    name: String(program.name),
    description: program.description ? String(program.description) : null,
    is_archived: Number(program.is_archived),
    days: dayDetails,
  };
}

export function getWorkoutProgram(id: number): WorkoutProgramDetail | null {
  return withPersist((db) => getWorkoutProgramFromDb(db, id));
}

export function createWorkoutProgram(input: SaveProgramInput): WorkoutProgramDetail {
  validateProgramInput(input);
  return withPersistTransaction((db) => {
    const programId = runStatement(
      db,
      `INSERT INTO workout_programs (name, description, program_type, updated_at)
       VALUES (?, ?, 'custom', datetime('now'))`,
      [input.name.trim(), input.description?.trim() ?? null],
    );
    insertProgramTree(db, programId, input.days);
    return getWorkoutProgramFromDb(db, programId)!;
  });
}

export function updateWorkoutProgram(id: number, input: SaveProgramInput): WorkoutProgramDetail {
  validateProgramInput(input);
  return withPersistTransaction((db) => {
    const existing = queryOne(db, `SELECT id FROM workout_programs WHERE id = ?`, [id]);
    if (!existing) throw new Error("Workout program not found.");

    runExecute(
      db,
      `UPDATE workout_programs SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?`,
      [input.name.trim(), input.description?.trim() ?? null, id],
    );

    runExecute(db, `DELETE FROM workout_program_days WHERE program_id = ?`, [id]);
    insertProgramTree(db, id, input.days);
    return getWorkoutProgramFromDb(db, id)!;
  });
}

export function archiveWorkoutProgram(id: number): void {
  withPersist((db) => {
    runExecute(
      db,
      `UPDATE workout_programs SET is_archived = 1, updated_at = datetime('now') WHERE id = ?`,
      [id],
    );
  });
}
