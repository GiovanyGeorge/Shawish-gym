import { queryAll, queryOne, runExecute, runStatement } from "../database/query";
import { computeMemberDisplayStatus } from "../utils/memberStatus";
import { assertTrainerMatchesMember } from "./trainersService";
import { getActiveSubscriptionPrice } from "./subscriptionPricesService";
import { getExpiryWarningDays } from "./settingsService";
import { withPersist, withPersistTransaction } from "./store";
import type { MemberGoalRow } from "./memberGoalsService";
import type { Database } from "sql.js";

export type MemberListItem = {
  id: number;
  member_code: string;
  name: string;
  phone: string;
  photo_path: string | null;
  gender: "male" | "female";
  trainer_id: number | null;
  trainer_name: string | null;
  subscription_label: string | null;
  subscription_end_date: string | null;
  subscription_status: string | null;
  display_status: "active" | "expiring" | "paused" | "expired";
  member_status: string;
};

export type CreateMemberInput = {
  name: string;
  phone: string;
  photo_path?: string | null;
  gender: "male" | "female";
  trainer_id: number;
  program_id: number;
  goals_notes?: string;
  duration_months: number;
  start_date: string;
  end_date: string;
  price: number;
};

export type MemberForEdit = {
  id: number;
  member_code: string;
  name: string;
  phone: string;
  photo_path: string | null;
  gender: "male" | "female";
  trainer_id: number | null;
  workout_program_id: number | null;
  workout_program_start_date: string | null;
  goals_notes: string | null;
  goals: MemberGoalRow[];
  current_subscription: {
    duration_months: number;
    start_date: string;
    end_date: string;
    price: number;
    label: string | null;
  } | null;
};

export type UpdateMemberInput = {
  id: number;
  name: string;
  phone: string;
  photo_path?: string | null;
  gender: "male" | "female";
  trainer_id: number;
  program_id: number;
  workout_program_start_date: string;
  goals_notes?: string;
};

function nextMemberCode(db: import("sql.js").Database): string {
  const row = queryOne(
    db,
    `SELECT member_code FROM members
     WHERE member_code LIKE 'SHW%'
     ORDER BY CAST(SUBSTR(member_code, 4) AS INTEGER) DESC
     LIMIT 1`,
  );
  const last = row?.member_code ? Number(String(row.member_code).replace(/^SHW/i, "")) : 0;
  const next = (Number.isFinite(last) ? last : 0) + 1;
  return `SHW${String(next).padStart(4, "0")}`;
}

function computeDisplayStatus(
  memberStatus: string,
  endDate: string | null,
): MemberListItem["display_status"] {
  return computeMemberDisplayStatus(memberStatus, endDate, getExpiryWarningDays());
}

function mapListRow(row: Record<string, unknown>): MemberListItem {
  const memberStatus = String(row.member_status ?? "active");
  const endDate = row.subscription_end_date ? String(row.subscription_end_date) : null;
  return {
    id: Number(row.id),
    member_code: String(row.member_code),
    name: String(row.name),
    phone: String(row.phone),
    photo_path: row.photo_path ? String(row.photo_path) : null,
    gender: row.gender as "male" | "female",
    trainer_id: row.trainer_id != null ? Number(row.trainer_id) : null,
    trainer_name: row.trainer_name ? String(row.trainer_name) : null,
    subscription_label: row.subscription_label ? String(row.subscription_label) : null,
    subscription_end_date: endDate,
    subscription_status: row.subscription_status ? String(row.subscription_status) : null,
    member_status: memberStatus,
    display_status: computeDisplayStatus(memberStatus, endDate),
  };
}

const MEMBER_LIST_SQL = `SELECT m.id, m.member_code, m.name, m.phone, m.photo_path, m.gender, m.trainer_id, m.status AS member_status,
              t.name AS trainer_name,
              sp.label AS subscription_label,
              ms.end_date AS subscription_end_date,
              ms.status AS subscription_status
       FROM members m
       LEFT JOIN trainers t ON t.id = m.trainer_id
       LEFT JOIN member_subscriptions ms ON ms.id = (
         SELECT id FROM member_subscriptions
         WHERE member_id = m.id
         ORDER BY start_date DESC, id DESC
         LIMIT 1
       )
       LEFT JOIN subscription_prices sp ON sp.duration_months = ms.duration_months
       ORDER BY m.created_at DESC`;

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

function getMemberForEditFromDb(db: Database, id: number): MemberForEdit | null {
  const row = queryOne(
    db,
    `SELECT m.id, m.member_code, m.name, m.phone, m.photo_path, m.gender, m.trainer_id,
            m.workout_program_id, m.workout_program_start_date, m.goals_notes
     FROM members m WHERE m.id = ?`,
    [id],
  ) as Record<string, unknown> | null;
  if (!row) return null;

  const sub = queryOne(
    db,
    `SELECT ms.duration_months, ms.start_date, ms.end_date, ms.price, sp.label
     FROM member_subscriptions ms
     LEFT JOIN subscription_prices sp ON sp.duration_months = ms.duration_months
     WHERE ms.member_id = ?
     ORDER BY ms.start_date DESC, ms.id DESC LIMIT 1`,
    [id],
  ) as Record<string, unknown> | null;

  const goalRows = queryAll(
    db,
    `SELECT * FROM member_goals WHERE member_id = ? AND status != 'archived' ORDER BY created_at DESC`,
    [id],
  ) as Record<string, unknown>[];

  return {
    id: Number(row.id),
    member_code: String(row.member_code),
    name: String(row.name),
    phone: String(row.phone),
    photo_path: row.photo_path ? String(row.photo_path) : null,
    gender: row.gender as "male" | "female",
    trainer_id: row.trainer_id != null ? Number(row.trainer_id) : null,
    workout_program_id: row.workout_program_id != null ? Number(row.workout_program_id) : null,
    workout_program_start_date: row.workout_program_start_date
      ? String(row.workout_program_start_date)
      : null,
    goals_notes: row.goals_notes ? String(row.goals_notes) : null,
    goals: goalRows.map(mapGoalRow),
    current_subscription: sub
      ? {
          duration_months: Number(sub.duration_months),
          start_date: String(sub.start_date),
          end_date: String(sub.end_date),
          price: Number(sub.price),
          label: sub.label ? String(sub.label) : null,
        }
      : null,
  };
}

function fetchMemberListRow(db: Database, memberId: number): MemberListItem {
  const row = queryOne(
    db,
    `SELECT m.id, m.member_code, m.name, m.phone, m.photo_path, m.gender, m.trainer_id, m.status AS member_status,
            t.name AS trainer_name,
            sp.label AS subscription_label,
            ms.end_date AS subscription_end_date,
            ms.status AS subscription_status
     FROM members m
     LEFT JOIN trainers t ON t.id = m.trainer_id
     LEFT JOIN member_subscriptions ms ON ms.id = (
       SELECT id FROM member_subscriptions WHERE member_id = m.id ORDER BY start_date DESC, id DESC LIMIT 1
     )
     LEFT JOIN subscription_prices sp ON sp.duration_months = ms.duration_months
     WHERE m.id = ?`,
    [memberId],
  ) as Record<string, unknown>;
  return mapListRow(row);
}

function assertActiveProgram(db: Database, programId: number): void {
  const program = queryOne(
    db,
    `SELECT id FROM workout_programs WHERE id = ? AND is_archived = 0`,
    [programId],
  );
  if (!program) throw new Error("Selected workout program is not available.");
}

function syncMemberProgram(
  db: Database,
  memberId: number,
  programId: number,
  trainerId: number,
  startDate: string,
): void {
  runExecute(
    db,
    `UPDATE members SET workout_program_id = ?, workout_program_start_date = ?, updated_at = datetime('now') WHERE id = ?`,
    [programId, startDate, memberId],
  );

  runExecute(
    db,
    `UPDATE member_workout_programs SET is_active = 0 WHERE member_id = ? AND is_active = 1`,
    [memberId],
  );

  runStatement(
    db,
    `INSERT INTO member_workout_programs (member_id, program_id, trainer_id, start_date, is_active)
     VALUES (?, ?, ?, ?, 1)`,
    [memberId, programId, trainerId, startDate],
  );
}

export function listMembers(filter: "all" | "active" | "expiring" | "paused" | "expired" = "all"): MemberListItem[] {
  return withPersist((db) => {
    const rows = queryAll(db, MEMBER_LIST_SQL) as Record<string, unknown>[];
    const mapped = rows.map(mapListRow);
    if (filter === "all") return mapped;
    return mapped.filter((m) => m.display_status === filter);
  });
}

export function getMemberForEdit(id: number): MemberForEdit | null {
  return withPersist((db) => getMemberForEditFromDb(db, id));
}

export function createMember(input: CreateMemberInput): MemberListItem {
  if (!input.name.trim()) throw new Error("Member name is required.");
  if (!input.phone.trim()) throw new Error("Phone is required.");
  if (!input.gender) throw new Error("Gender is required.");

  assertTrainerMatchesMember(input.trainer_id, input.gender);

  const configured = getActiveSubscriptionPrice(input.duration_months);
  if (!configured) {
    throw new Error("Selected subscription duration is not available.");
  }
  if (Math.abs(Number(configured.price) - input.price) > 0.009) {
    throw new Error("Subscription price does not match the configured price.");
  }

  return withPersistTransaction((db) => {
    assertActiveProgram(db, input.program_id);

    const memberCode = nextMemberCode(db);
    const memberId = runStatement(
      db,
      `INSERT INTO members (member_code, name, phone, photo_path, gender, trainer_id, goals_notes,
        workout_program_id, workout_program_start_date, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))`,
      [
        memberCode,
        input.name.trim(),
        input.phone.trim(),
        input.photo_path?.trim() || null,
        input.gender,
        input.trainer_id,
        input.goals_notes?.trim() ?? null,
        input.program_id,
        input.start_date,
      ],
    );

    runStatement(
      db,
      `INSERT INTO member_subscriptions (member_id, duration_months, start_date, end_date, price, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [memberId, input.duration_months, input.start_date, input.end_date, input.price],
    );

    runStatement(
      db,
      `INSERT INTO member_workout_programs (member_id, program_id, trainer_id, start_date, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [memberId, input.program_id, input.trainer_id, input.start_date],
    );

    if (input.goals_notes?.trim()) {
      const goalText = input.goals_notes.trim();
      const hasGoalColumn = queryAll(db, `PRAGMA table_info(member_goals)`).some(
        (col) => String(col.name) === "goal",
      );
      if (hasGoalColumn) {
        runStatement(
          db,
          `INSERT INTO member_goals (member_id, title, goal, notes, status, updated_at)
           VALUES (?, ?, ?, NULL, 'active', datetime('now'))`,
          [memberId, goalText, goalText],
        );
      } else {
        runStatement(
          db,
          `INSERT INTO member_goals (member_id, title, notes, status, updated_at)
           VALUES (?, ?, NULL, 'active', datetime('now'))`,
          [memberId, goalText],
        );
      }
    }

    return fetchMemberListRow(db, memberId);
  });
}

export function updateMember(input: UpdateMemberInput): MemberForEdit {
  if (!input.name.trim()) throw new Error("Member name is required.");
  if (!input.phone.trim()) throw new Error("Phone is required.");

  assertTrainerMatchesMember(input.trainer_id, input.gender);

  return withPersistTransaction((db) => {
    const existing = queryOne(db, `SELECT id FROM members WHERE id = ?`, [input.id]);
    if (!existing) throw new Error("Member not found.");

    assertActiveProgram(db, input.program_id);

    runExecute(
      db,
      `UPDATE members SET name = ?, phone = ?, photo_path = ?, gender = ?, trainer_id = ?, goals_notes = ?,
        workout_program_id = ?, workout_program_start_date = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        input.name.trim(),
        input.phone.trim(),
        input.photo_path?.trim() || null,
        input.gender,
        input.trainer_id,
        input.goals_notes?.trim() ?? null,
        input.program_id,
        input.workout_program_start_date,
        input.id,
      ],
    );

    syncMemberProgram(
      db,
      input.id,
      input.program_id,
      input.trainer_id,
      input.workout_program_start_date,
    );

    const updated = getMemberForEditFromDb(db, input.id);
    if (!updated) throw new Error("Member not found after update.");
    return updated;
  });
}
