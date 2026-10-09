import { queryAll, queryOne, runExecute, runStatement } from "../database/query";
import { withPersist } from "./store";

export type Trainer = {
  id: number;
  name: string;
  phone: string | null;
  photo_path: string | null;
  gender: "male" | "female";
  training_category: "men" | "women" | "both";
  status: "active" | "inactive";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateTrainerInput = {
  name: string;
  phone?: string;
  photo_path?: string | null;
  gender: "male" | "female";
  training_category: "men" | "women" | "both";
  status?: "active" | "inactive";
  notes?: string;
};

export type UpdateTrainerInput = CreateTrainerInput & { id: number };

function validateTrainer(input: CreateTrainerInput): void {
  if (!input.name.trim()) throw new Error("Trainer name is required.");
  if (!input.gender) throw new Error("Trainer gender is required.");
  if (!input.training_category) throw new Error("Training category is required.");
}

export function listTrainers(activeOnly = false): Trainer[] {
  return withPersist((db) => {
    const sql = activeOnly
      ? `SELECT id, name, phone, photo_path, gender, training_category, status, notes, created_at, updated_at
         FROM trainers WHERE status = 'active' ORDER BY name COLLATE NOCASE`
      : `SELECT id, name, phone, photo_path, gender, training_category, status, notes, created_at, updated_at
         FROM trainers ORDER BY name COLLATE NOCASE`;
    return queryAll(db, sql) as unknown as Trainer[];
  });
}

export function listTrainersForMember(gender: "male" | "female"): Trainer[] {
  return withPersist((db) => {
    const categoryFilter =
      gender === "male" ? `training_category IN ('men', 'both')` : `training_category IN ('women', 'both')`;
    return queryAll(
      db,
      `SELECT id, name, phone, photo_path, gender, training_category, status, notes, created_at, updated_at
       FROM trainers WHERE status = 'active' AND ${categoryFilter} ORDER BY name COLLATE NOCASE`,
    ) as unknown as Trainer[];
  });
}

export function createTrainer(input: CreateTrainerInput): Trainer {
  validateTrainer(input);
  return withPersist((db) => {
    const id = runStatement(
      db,
      `INSERT INTO trainers (name, phone, photo_path, gender, training_category, status, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        input.name.trim(),
        input.phone?.trim() ?? null,
        input.photo_path?.trim() || null,
        input.gender,
        input.training_category,
        input.status ?? "active",
        input.notes?.trim() ?? null,
      ],
    );
    return queryOne(db, `SELECT id, name, phone, photo_path, gender, training_category, status, notes, created_at, updated_at FROM trainers WHERE id = ?`, [id]) as unknown as Trainer;
  });
}

export function updateTrainer(input: UpdateTrainerInput): Trainer {
  validateTrainer(input);
  return withPersist((db) => {
    runExecute(
      db,
      `UPDATE trainers SET name = ?, phone = ?, photo_path = ?, gender = ?, training_category = ?, status = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        input.name.trim(),
        input.phone?.trim() ?? null,
        input.photo_path?.trim() || null,
        input.gender,
        input.training_category,
        input.status ?? "active",
        input.notes?.trim() ?? null,
        input.id,
      ],
    );
    return queryOne(db, `SELECT id, name, phone, photo_path, gender, training_category, status, notes, created_at, updated_at FROM trainers WHERE id = ?`, [input.id]) as unknown as Trainer;
  });
}

export function updateTrainerStatus(id: number, status: "active" | "inactive"): Trainer {
  return withPersist((db) => {
    runExecute(
      db,
      `UPDATE trainers SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      [status, id],
    );
    return queryOne(db, `SELECT id, name, phone, photo_path, gender, training_category, status, notes, created_at, updated_at FROM trainers WHERE id = ?`, [id]) as unknown as Trainer;
  });
}

export function assertTrainerMatchesMember(
  trainerId: number,
  memberGender: "male" | "female",
): void {
  withPersist((db) => {
    const trainer = queryOne(db, `SELECT training_category, status FROM trainers WHERE id = ?`, [trainerId]);
    if (!trainer) throw new Error("Selected trainer was not found.");
    if (String(trainer.status) !== "active") throw new Error("Selected trainer is inactive.");
    const category = String(trainer.training_category);
    const valid =
      category === "both" ||
      (memberGender === "male" && category === "men") ||
      (memberGender === "female" && category === "women");
    if (!valid) {
      throw new Error("This trainer cannot be assigned to the selected member gender.");
    }
  });
}
