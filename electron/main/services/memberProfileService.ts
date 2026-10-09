import { queryAll, queryOne } from "../database/query";
import { computeMemberDisplayStatus } from "../utils/memberStatus";
import { getExpiryWarningDays } from "./settingsService";
import { withPersist } from "./store";
import type { MemberListItem } from "./membersService";

function computeDisplayStatus(
  memberStatus: string,
  endDate: string | null,
): MemberListItem["display_status"] {
  return computeMemberDisplayStatus(memberStatus, endDate, getExpiryWarningDays());
}

export type MemberSubscriptionRow = {
  id: number;
  duration_months: number;
  label: string | null;
  start_date: string;
  end_date: string;
  price: number;
  status: string;
  created_at: string;
};

export type MemberPauseRow = {
  id: number;
  start_date: string;
  end_date: string;
  pause_days: number;
  reason: string | null;
  previous_end_date: string;
  new_end_date: string;
  created_at: string;
};

export type MemberGoalRow = {
  id: number;
  title: string;
  notes: string | null;
  status: string;
  created_at: string;
};

export type MemberProfile = {
  id: number;
  member_code: string;
  name: string;
  phone: string;
  gender: "male" | "female";
  photo_path: string | null;
  goals_notes: string | null;
  member_status: string;
  trainer_id: number | null;
  trainer_name: string | null;
  program_id: number | null;
  program_name: string | null;
  display_status: MemberListItem["display_status"];
  current_subscription: MemberSubscriptionRow | null;
  attendance_summary: {
    present: number;
    absent: number;
    paused_days: number;
    rate: number;
  };
};

export function getMemberProfile(memberId: number): MemberProfile | null {
  return withPersist((db) => {
    const row = queryOne(
      db,
      `SELECT m.*, t.name AS trainer_name,
              wp.id AS program_id, wp.name AS program_name
       FROM members m
       LEFT JOIN trainers t ON t.id = m.trainer_id
       LEFT JOIN member_workout_programs mwp ON mwp.id = (
         SELECT id FROM member_workout_programs
         WHERE member_id = m.id AND is_active = 1
         ORDER BY start_date DESC, id DESC LIMIT 1
       )
       LEFT JOIN workout_programs wp ON wp.id = mwp.program_id
       WHERE m.id = ?`,
      [memberId],
    );
    if (!row) return null;

    const sub = queryOne(
      db,
      `SELECT ms.*, sp.label
       FROM member_subscriptions ms
       LEFT JOIN subscription_prices sp ON sp.duration_months = ms.duration_months
       WHERE ms.member_id = ?
       ORDER BY ms.start_date DESC, ms.id DESC LIMIT 1`,
      [memberId],
    );

    const attendance = queryOne(
      db,
      `SELECT
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent,
         SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) AS paused_days
       FROM attendance WHERE member_id = ?`,
      [memberId],
    );

    const present = Number(attendance?.present ?? 0);
    const absent = Number(attendance?.absent ?? 0);
    const pausedDays = Number(attendance?.paused_days ?? 0);
    const total = present + absent;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    const endDate = sub?.end_date ? String(sub.end_date) : null;
    const memberStatus = String(row.status ?? "active");

    return {
      id: Number(row.id),
      member_code: String(row.member_code),
      name: String(row.name),
      phone: String(row.phone),
      gender: row.gender as "male" | "female",
      photo_path: row.photo_path ? String(row.photo_path) : null,
      goals_notes: row.goals_notes ? String(row.goals_notes) : null,
      member_status: memberStatus,
      trainer_id: row.trainer_id != null ? Number(row.trainer_id) : null,
      trainer_name: row.trainer_name ? String(row.trainer_name) : null,
      program_id: row.program_id != null ? Number(row.program_id) : null,
      program_name: row.program_name ? String(row.program_name) : null,
      display_status: computeDisplayStatus(memberStatus, endDate),
      current_subscription: sub
        ? {
            id: Number(sub.id),
            duration_months: Number(sub.duration_months),
            label: sub.label ? String(sub.label) : null,
            start_date: String(sub.start_date),
            end_date: String(sub.end_date),
            price: Number(sub.price),
            status: String(sub.status),
            created_at: String(sub.created_at),
          }
        : null,
      attendance_summary: {
        present,
        absent,
        paused_days: pausedDays,
        rate,
      },
    };
  });
}

export function listSubscriptionHistory(memberId: number): MemberSubscriptionRow[] {
  return withPersist((db) =>
    queryAll(
      db,
      `SELECT ms.*, sp.label
       FROM member_subscriptions ms
       LEFT JOIN subscription_prices sp ON sp.duration_months = ms.duration_months
       WHERE ms.member_id = ?
       ORDER BY ms.start_date DESC, ms.id DESC`,
      [memberId],
    ).map((row) => ({
      id: Number(row.id),
      duration_months: Number(row.duration_months),
      label: row.label ? String(row.label) : null,
      start_date: String(row.start_date),
      end_date: String(row.end_date),
      price: Number(row.price),
      status: String(row.status),
      created_at: String(row.created_at),
    })),
  );
}

export function listPauseHistory(memberId: number): MemberPauseRow[] {
  return withPersist((db) =>
    queryAll(
      db,
      `SELECT sp.*
       FROM subscription_pauses sp
       JOIN member_subscriptions ms ON ms.id = sp.member_subscription_id
       WHERE ms.member_id = ?
       ORDER BY sp.created_at DESC`,
      [memberId],
    ).map((row) => ({
      id: Number(row.id),
      start_date: String(row.start_date),
      end_date: String(row.end_date),
      pause_days: Number(row.actual_pause_days ?? row.pause_days),
      reason: row.reason ? String(row.reason) : null,
      previous_end_date: String(row.previous_end_date),
      new_end_date: String(row.new_end_date),
      created_at: String(row.created_at),
    })),
  );
}

export function listMemberGoals(memberId: number): MemberGoalRow[] {
  return withPersist((db) =>
    queryAll(
      db,
      `SELECT * FROM member_goals WHERE member_id = ? ORDER BY created_at DESC`,
      [memberId],
    ).map((row) => ({
      id: Number(row.id),
      title: String(row.title),
      notes: row.notes ? String(row.notes) : null,
      status: String(row.status),
      created_at: String(row.created_at),
    })),
  );
}
