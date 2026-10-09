import { queryAll, queryOne, runExecute, runStatement } from "../database/query";
import { withPersist } from "./store";

export type MemberGoalRow = {
  id: number;
  goal: string;
  notes: string | null;
  status: string;
  created_at: string;
};

export type AddMemberGoalInput = {
  member_id: number;
  goal: string;
  notes?: string;
};

export type UpdateMemberGoalInput = {
  id: number;
  goal: string;
  notes?: string;
};

function mapGoalRow(row: Record<string, unknown>): MemberGoalRow {
  const goalText = row.goal ? String(row.goal) : String(row.title ?? "");
  return {
    id: Number(row.id),
    goal: goalText,
    notes: row.notes ? String(row.notes) : null,
    status: String(row.status),
    created_at: String(row.created_at),
  };
}

export function listMemberGoalsForEdit(memberId: number): MemberGoalRow[] {
  return withPersist((db) => {
    const rows = queryAll(
      db,
      `SELECT * FROM member_goals WHERE member_id = ? AND status != 'archived' ORDER BY created_at DESC`,
      [memberId],
    ) as Record<string, unknown>[];
    return rows.map(mapGoalRow);
  });
}

export function addMemberGoal(input: AddMemberGoalInput): MemberGoalRow {
  if (!input.goal.trim()) throw new Error("Goal text is required.");

  return withPersist((db) => {
    const id = runStatement(
      db,
      `INSERT INTO member_goals (member_id, title, goal, notes, status, updated_at)
       VALUES (?, ?, ?, ?, 'active', datetime('now'))`,
      [input.member_id, input.goal.trim(), input.goal.trim(), input.notes?.trim() ?? null],
    );
    const row = queryOne(db, `SELECT * FROM member_goals WHERE id = ?`, [id]) as Record<string, unknown>;
    return mapGoalRow(row);
  });
}

export function updateMemberGoal(input: UpdateMemberGoalInput): MemberGoalRow {
  if (!input.goal.trim()) throw new Error("Goal text is required.");

  return withPersist((db) => {
    runExecute(
      db,
      `UPDATE member_goals SET title = ?, goal = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`,
      [input.goal.trim(), input.goal.trim(), input.notes?.trim() ?? null, input.id],
    );
    const row = queryOne(db, `SELECT * FROM member_goals WHERE id = ?`, [input.id]) as Record<string, unknown>;
    if (!row) throw new Error("Goal not found.");
    return mapGoalRow(row);
  });
}

export function deleteMemberGoal(goalId: number): void {
  withPersist((db) => {
    runExecute(
      db,
      `UPDATE member_goals SET status = 'archived', updated_at = datetime('now') WHERE id = ?`,
      [goalId],
    );
  });
}

/** @deprecated Phase 3 profile — maps goal column for display */
export function addMemberGoalLegacy(input: { member_id: number; title: string; notes?: string }): MemberGoalRow {
  return addMemberGoal({ member_id: input.member_id, goal: input.title, notes: input.notes });
}

export function setMemberGoalStatus(goalId: number, status: "active" | "completed" | "archived"): void {
  withPersist((db) => {
    runExecute(
      db,
      `UPDATE member_goals SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      [status, goalId],
    );
  });
}
