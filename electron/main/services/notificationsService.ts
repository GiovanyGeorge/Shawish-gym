import { queryAll, queryOne, runExecute, runStatement } from "../database/query";
import { localTodayIso } from "../utils/localDate";
import { addDaysIso } from "../utils/dates";
import { readAppSettingsFromDb } from "./settingsService";
import { withPersist, withPersistTransaction } from "./store";
import type { Database } from "sql.js";

export type NotificationRow = {
  id: number;
  category: string;
  type: string | null;
  title: string;
  body: string | null;
  related_path: string | null;
  reference_key: string | null;
  is_read: number;
  created_at: string;
};

export function insertNotification(
  db: Database,
  input: {
    category: string;
    type: string;
    title: string;
    body?: string | null;
    related_path?: string | null;
    reference_key?: string | null;
  },
): void {
  if (input.reference_key) {
    const existing = queryOne(db, `SELECT id FROM notifications WHERE reference_key = ?`, [
      input.reference_key,
    ]);
    if (existing) return;
  }
  runStatement(
    db,
    `INSERT INTO notifications (category, type, title, body, related_path, reference_key, is_read)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [
      input.category,
      input.type,
      input.title,
      input.body ?? null,
      input.related_path ?? null,
      input.reference_key ?? null,
    ],
  );
}

export function createNotification(input: Parameters<typeof insertNotification>[1]): void {
  withPersist((db) => insertNotification(db, input));
}

export function listNotifications(filter: "all" | "unread" = "all"): NotificationRow[] {
  return withPersist((db) =>
    queryAll(
      db,
      `SELECT * FROM notifications
       ${filter === "unread" ? "WHERE is_read = 0" : ""}
       ORDER BY created_at DESC, id DESC
       LIMIT 200`,
    ).map(mapNotification),
  );
}

export function unreadCount(): number {
  return withPersist((db) => Number(queryOne(db, `SELECT COUNT(*) AS c FROM notifications WHERE is_read = 0`)?.c ?? 0));
}

export function markRead(id: number): void {
  withPersist((db) => runExecute(db, `UPDATE notifications SET is_read = 1 WHERE id = ?`, [id]));
}

export function markAllRead(): void {
  withPersist((db) => runExecute(db, `UPDATE notifications SET is_read = 1 WHERE is_read = 0`));
}

export function deleteNotification(id: number): void {
  withPersist((db) => runExecute(db, `DELETE FROM notifications WHERE id = ?`, [id]));
}

function mapNotification(row: Record<string, unknown>): NotificationRow {
  return {
    id: Number(row.id),
    category: String(row.category),
    type: row.type != null ? String(row.type) : null,
    title: String(row.title),
    body: row.body != null ? String(row.body) : null,
    related_path: row.related_path != null ? String(row.related_path) : null,
    reference_key: row.reference_key != null ? String(row.reference_key) : null,
    is_read: Number(row.is_read),
    created_at: String(row.created_at),
  };
}

export function scanOperationalAlerts(): void {
  withPersistTransaction((db) => {
    const settings = readAppSettingsFromDb(db);
    const today = localTodayIso();
    const warnUntil = addDaysIso(today, settings.expiry_warning_days);

    if (settings.notify_subscriptions) {
      const expiring = queryAll(
        db,
        `SELECT m.id, m.name, ms.end_date
         FROM members m
         JOIN member_subscriptions ms ON ms.id = (
           SELECT id FROM member_subscriptions WHERE member_id = m.id ORDER BY start_date DESC, id DESC LIMIT 1
         )
         WHERE m.status != 'paused'
           AND date(ms.end_date) >= date(?)
           AND date(ms.end_date) <= date(?)`,
        [today, warnUntil],
      );
      for (const row of expiring) {
        const name = String(row.name);
        const end = String(row.end_date);
        const id = Number(row.id);
        insertNotification(db, {
          category: "Members",
          type: "subscription_expiring",
          title: `${name}'s subscription expires soon.`,
          body: `Expires on ${end}.`,
          related_path: `/members/${id}`,
          reference_key: `expire_soon:${id}:${end}`,
        });
      }

      const expired = queryAll(
        db,
        `SELECT m.id, m.name, ms.end_date
         FROM members m
         JOIN member_subscriptions ms ON ms.id = (
           SELECT id FROM member_subscriptions WHERE member_id = m.id ORDER BY start_date DESC, id DESC LIMIT 1
         )
         WHERE m.status != 'paused' AND date(ms.end_date) < date(?)`,
        [today],
      );
      for (const row of expired) {
        const name = String(row.name);
        const end = String(row.end_date);
        const id = Number(row.id);
        insertNotification(db, {
          category: "Members",
          type: "subscription_expired",
          title: `${name}'s subscription has expired.`,
          body: `Ended on ${end}.`,
          related_path: `/members/${id}`,
          reference_key: `expired:${id}:${end}`,
        });
      }
    }

    if (settings.notify_low_stock) {
      const low = queryAll(
        db,
        `SELECT id, name, quantity, minimum_stock FROM products
         WHERE is_archived = 0 AND quantity > 0 AND quantity <= minimum_stock`,
      );
      for (const row of low) {
        insertNotification(db, {
          category: "Sales",
          type: "low_stock",
          title: `${String(row.name)} is low in stock.`,
          body: `${Number(row.quantity)} left (minimum ${Number(row.minimum_stock)}).`,
          related_path: "/store?tab=inventory",
          reference_key: `low_stock:${Number(row.id)}:${Number(row.quantity)}`,
        });
      }
    }

    if (settings.notify_out_of_stock) {
      const out = queryAll(
        db,
        `SELECT id, name FROM products WHERE is_archived = 0 AND quantity <= 0`,
      );
      for (const row of out) {
        insertNotification(db, {
          category: "Sales",
          type: "out_of_stock",
          title: `${String(row.name)} is out of stock.`,
          related_path: "/store?tab=inventory",
          reference_key: `out_stock:${Number(row.id)}`,
        });
      }
    }
  });
}
