import { queryAll, queryOne, runExecute, runStatement } from "../database/query";
import { withPersist } from "./store";

export type SubscriptionPrice = {
  id: number;
  duration_months: number;
  label: string;
  price: number;
  is_active: number;
  created_at: string;
  updated_at: string;
};

function formatDurationLabel(months: number): string {
  if (months === 12) return "1 Year";
  if (months === 1) return "1 Month";
  return `${months} Months`;
}

export function listSubscriptionPrices(): SubscriptionPrice[] {
  return withPersist((db) =>
    queryAll(
      db,
      `SELECT * FROM subscription_prices WHERE is_active = 1 ORDER BY duration_months ASC`,
    ) as unknown as SubscriptionPrice[],
  );
}

export function listAllSubscriptionPrices(): SubscriptionPrice[] {
  return withPersist((db) =>
    queryAll(
      db,
      `SELECT * FROM subscription_prices ORDER BY duration_months ASC`,
    ) as unknown as SubscriptionPrice[],
  );
}

export function createSubscriptionPrice(durationMonths: number, price: number): SubscriptionPrice {
  if (!Number.isFinite(durationMonths) || durationMonths <= 0) {
    throw new Error("Duration must be greater than zero.");
  }
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Price must be zero or greater.");
  }

  return withPersist((db) => {
    const existing = queryOne(db, `SELECT id FROM subscription_prices WHERE duration_months = ?`, [
      durationMonths,
    ]);
    if (existing) throw new Error("A price for this duration already exists.");

    const id = runStatement(
      db,
      `INSERT INTO subscription_prices (duration_months, label, price, is_active, updated_at)
       VALUES (?, ?, ?, 1, datetime('now'))`,
      [durationMonths, formatDurationLabel(durationMonths), price],
    );
    return queryOne(db, `SELECT * FROM subscription_prices WHERE id = ?`, [id]) as unknown as SubscriptionPrice;
  });
}

export function updateSubscriptionPrice(
  durationMonths: number,
  price: number,
): SubscriptionPrice {
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Price must be zero or greater.");
  }

  return withPersist((db) => {
    const row = queryOne(db, `SELECT id FROM subscription_prices WHERE duration_months = ?`, [
      durationMonths,
    ]);
    if (!row) throw new Error("Subscription price not found.");

    runExecute(
      db,
      `UPDATE subscription_prices SET price = ?, updated_at = datetime('now') WHERE duration_months = ?`,
      [price, durationMonths],
    );
    return queryOne(db, `SELECT * FROM subscription_prices WHERE duration_months = ?`, [
      durationMonths,
    ]) as unknown as SubscriptionPrice;
  });
}

export function setSubscriptionPriceActive(durationMonths: number, isActive: boolean): SubscriptionPrice {
  return withPersist((db) => {
    const row = queryOne(db, `SELECT id FROM subscription_prices WHERE duration_months = ?`, [
      durationMonths,
    ]);
    if (!row) throw new Error("Subscription price not found.");

    runExecute(
      db,
      `UPDATE subscription_prices SET is_active = ?, updated_at = datetime('now') WHERE duration_months = ?`,
      [isActive ? 1 : 0, durationMonths],
    );
    return queryOne(db, `SELECT * FROM subscription_prices WHERE duration_months = ?`, [
      durationMonths,
    ]) as unknown as SubscriptionPrice;
  });
}

export function getActiveSubscriptionPrice(durationMonths: number): SubscriptionPrice | null {
  return withPersist((db) =>
    queryOne(
      db,
      `SELECT * FROM subscription_prices WHERE duration_months = ? AND is_active = 1`,
      [durationMonths],
    ) as SubscriptionPrice | null,
  );
}
