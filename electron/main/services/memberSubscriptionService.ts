import { queryOne, runExecute, runStatement } from "../database/query";
import { addDaysIso, addMonthsIso, diffDaysInclusive } from "../utils/dates";
import { localTodayIso } from "../utils/localDate";
import { insertNotification } from "./notificationsService";
import { readAppSettingsFromDb } from "./settingsService";
import { withPersistTransaction } from "./store";
import type { Database } from "sql.js";

export type RenewSubscriptionInput = {
  member_id: number;
  duration_months: number;
  start_date?: string;
};

export type PauseSubscriptionInput = {
  member_id: number;
  start_date: string;
  end_date: string;
  reason?: string;
};

/** Inclusive subscription period: 1 Oct + 1 month → 31 Oct. */
export function subscriptionEndIso(startIso: string, months: number): string {
  return addDaysIso(addMonthsIso(startIso, months), -1);
}

function getLatestSubscription(db: Database, memberId: number) {
  const row = queryOne(
    db,
    `SELECT id, start_date, end_date, status, price, duration_months FROM member_subscriptions
     WHERE member_id = ? ORDER BY start_date DESC, id DESC LIMIT 1`,
    [memberId],
  );
  if (!row) throw new Error("No subscription found for this member.");
  return {
    id: Number(row.id),
    start_date: String(row.start_date),
    end_date: String(row.end_date),
    status: String(row.status),
    price: Number(row.price),
    duration_months: Number(row.duration_months),
  };
}

function getMemberName(db: Database, memberId: number): string {
  const row = queryOne(db, `SELECT name, status FROM members WHERE id = ?`, [memberId]);
  if (!row) throw new Error("Member not found.");
  return String(row.name);
}

function priceForDuration(db: Database, durationMonths: number): { price: number; label: string } {
  const row = queryOne(
    db,
    `SELECT price, label FROM subscription_prices WHERE duration_months = ? AND is_active = 1`,
    [durationMonths],
  );
  if (!row) throw new Error("No active price found for this duration in Settings.");
  return { price: Number(row.price), label: String(row.label) };
}

export function renewSubscription(input: RenewSubscriptionInput): void {
  withPersistTransaction((db) => {
    const name = getMemberName(db, input.member_id);
    const latest = getLatestSubscription(db, input.member_id);
    const { price } = priceForDuration(db, input.duration_months);

    const defaultStart = addDaysIso(latest.end_date, 1);
    const start = input.start_date?.trim() || defaultStart;
    const end = subscriptionEndIso(start, input.duration_months);

    runExecute(
      db,
      `UPDATE member_subscriptions SET status = 'expired'
       WHERE member_id = ? AND status IN ('active', 'paused')`,
      [input.member_id],
    );

    const newId = runStatement(
      db,
      `INSERT INTO member_subscriptions (member_id, duration_months, start_date, end_date, price, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [input.member_id, input.duration_months, start, end, price],
    );

    runExecute(
      db,
      `UPDATE members SET status = 'active', updated_at = datetime('now') WHERE id = ?`,
      [input.member_id],
    );

    if (readAppSettingsFromDb(db).notify_subscriptions) {
      insertNotification(db, {
        category: "Members",
        type: "subscription_renewed",
        title: `${name}'s subscription was renewed successfully.`,
        body: `${start} → ${end}.`,
        related_path: `/members/${input.member_id}`,
        reference_key: `renewed:${newId}`,
      });
    }
  });
}

export function pauseSubscription(input: PauseSubscriptionInput): void {
  withPersistTransaction((db) => {
    const member = queryOne(db, `SELECT id, name, status FROM members WHERE id = ?`, [input.member_id]);
    if (!member) throw new Error("Member not found.");
    if (String(member.status) === "paused") throw new Error("This member is already paused.");

    const sub = getLatestSubscription(db, input.member_id);
    const today = localTodayIso();
    if (sub.end_date < today && sub.status !== "paused") {
      throw new Error("Cannot pause an expired subscription.");
    }
    if (input.start_date < sub.start_date) throw new Error("Pause cannot start before the subscription.");
    if (input.start_date > sub.end_date) throw new Error("Pause cannot start after the subscription ends.");

    const pauseDays = diffDaysInclusive(input.start_date, input.end_date);
    if (pauseDays <= 0) throw new Error("Pause end date must be on or after start date.");

    const open = queryOne(
      db,
      `SELECT id FROM subscription_pauses
       WHERE member_subscription_id = ? AND resumed_at IS NULL
         AND NOT (date(end_date) < date(?) OR date(start_date) > date(?))`,
      [sub.id, input.start_date, input.end_date],
    );
    if (open) throw new Error("This pause overlaps an existing pause.");

    const previousEnd = sub.end_date;
    const newEnd = addDaysIso(previousEnd, pauseDays);

    const pauseId = runStatement(
      db,
      `INSERT INTO subscription_pauses
       (member_subscription_id, start_date, end_date, pause_days, reason, previous_end_date, new_end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sub.id,
        input.start_date,
        input.end_date,
        pauseDays,
        input.reason?.trim() || null,
        previousEnd,
        newEnd,
      ],
    );

    runExecute(db, `UPDATE member_subscriptions SET end_date = ?, status = 'paused' WHERE id = ?`, [
      newEnd,
      sub.id,
    ]);
    runExecute(db, `UPDATE members SET status = 'paused', updated_at = datetime('now') WHERE id = ?`, [
      input.member_id,
    ]);

    if (readAppSettingsFromDb(db).notify_subscriptions) {
      insertNotification(db, {
        category: "Members",
        type: "subscription_paused",
        title: `${String(member.name)}'s subscription was paused.`,
        body: `${input.start_date} → ${input.end_date} (${pauseDays} days).`,
        related_path: `/members/${input.member_id}`,
        reference_key: `paused:${pauseId}`,
      });
    }
  });
}

export function resumeMember(input: { member_id: number; resume_date?: string }): void {
  withPersistTransaction((db) => {
    const member = queryOne(db, `SELECT id, name, status FROM members WHERE id = ?`, [input.member_id]);
    if (!member) throw new Error("Member not found.");
    if (String(member.status) !== "paused") {
      runExecute(db, `UPDATE members SET status = 'active', updated_at = datetime('now') WHERE id = ?`, [
        input.member_id,
      ]);
      return;
    }

    const sub = getLatestSubscription(db, input.member_id);
    const pause = queryOne(
      db,
      `SELECT id, start_date, end_date, pause_days, previous_end_date, new_end_date
       FROM subscription_pauses
       WHERE member_subscription_id = ? AND resumed_at IS NULL
       ORDER BY id DESC LIMIT 1`,
      [sub.id],
    );

    const resumeDate = input.resume_date?.trim() || localTodayIso();
    let nextEnd = sub.end_date;

    if (pause) {
      const plannedStart = String(pause.start_date);
      const plannedEnd = String(pause.end_date);
      const plannedDays = Number(pause.pause_days);
      const previousEnd = String(pause.previous_end_date);

      if (resumeDate < plannedStart) throw new Error("Resume date cannot be before the pause start.");

      const actualEnd = resumeDate < plannedEnd ? resumeDate : plannedEnd;
      const actualDays = diffDaysInclusive(plannedStart, actualEnd);
      const unused = Math.max(0, plannedDays - actualDays);
      nextEnd = addDaysIso(String(pause.new_end_date ?? sub.end_date), -unused);
      if (nextEnd < previousEnd) nextEnd = addDaysIso(previousEnd, actualDays);

      runExecute(
        db,
        `UPDATE subscription_pauses
         SET resumed_at = ?, actual_pause_days = ?, actual_end_date = ?, new_end_date = ?
         WHERE id = ?`,
        [resumeDate, actualDays, actualEnd, nextEnd, Number(pause.id)],
      );
    }

    const today = localTodayIso();
    const subStatus = nextEnd >= today ? "active" : "expired";
    runExecute(db, `UPDATE member_subscriptions SET end_date = ?, status = ? WHERE id = ?`, [
      nextEnd,
      subStatus,
      sub.id,
    ]);
    runExecute(
      db,
      `UPDATE members SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      [subStatus === "active" ? "active" : "active", input.member_id],
    );

    if (readAppSettingsFromDb(db).notify_subscriptions) {
      insertNotification(db, {
        category: "Members",
        type: "subscription_resumed",
        title: `${String(member.name)}'s subscription was resumed.`,
        related_path: `/members/${input.member_id}`,
        reference_key: `resumed:${sub.id}:${resumeDate}`,
      });
    }
  });
}
