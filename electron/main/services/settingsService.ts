import { queryOne, runExecute } from "../database/query";
import { getDatabase, withPersist } from "./store";
import type { Database } from "sql.js";

export type AppSettingsMap = {
  expiry_warning_days: number;
  notify_low_stock: boolean;
  notify_out_of_stock: boolean;
  notify_backup: boolean;
  notify_subscriptions: boolean;
  auto_backup_enabled: boolean;
  auto_backup_frequency: "daily" | "weekly";
  backup_location: string;
  backup_retention: number;
  last_auto_backup_at: string;
  gym_name: string;
  gym_logo: string;
  gym_phone: string;
  gym_address: string;
  currency: string;
  admin_name: string;
  admin_photo: string;
  admin_phone: string;
  admin_role: string;
};

const DEFAULTS: AppSettingsMap = {
  expiry_warning_days: 7,
  notify_low_stock: true,
  notify_out_of_stock: true,
  notify_backup: true,
  notify_subscriptions: true,
  auto_backup_enabled: false,
  auto_backup_frequency: "daily",
  backup_location: "",
  backup_retention: 7,
  last_auto_backup_at: "",
  gym_name: "SHAWISH Gym",
  gym_logo: "",
  gym_phone: "",
  gym_address: "",
  currency: "EGP",
  admin_name: "Admin",
  admin_photo: "",
  admin_phone: "",
  admin_role: "Administrator",
};

export function getSettingValue(db: Database, key: string, fallback = ""): string {
  const row = queryOne(db, `SELECT value FROM app_settings WHERE key = ?`, [key]);
  return row?.value != null ? String(row.value) : fallback;
}

export function setSettingValue(db: Database, key: string, value: string): void {
  runExecute(
    db,
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [key, value],
  );
}

function parseBool(value: string): boolean {
  return value === "1" || value.toLowerCase() === "true";
}

export function readAppSettingsFromDb(db: Database): AppSettingsMap {
  const num = (key: string, fallback: number) => {
    const n = Number(getSettingValue(db, key, String(fallback)));
    return Number.isFinite(n) ? n : fallback;
  };
  const freq = getSettingValue(db, "auto_backup_frequency", "daily");
  return {
    expiry_warning_days: Math.max(1, num("expiry_warning_days", 7)),
    notify_low_stock: parseBool(getSettingValue(db, "notify_low_stock", "1")),
    notify_out_of_stock: parseBool(getSettingValue(db, "notify_out_of_stock", "1")),
    notify_backup: parseBool(getSettingValue(db, "notify_backup", "1")),
    notify_subscriptions: parseBool(getSettingValue(db, "notify_subscriptions", "1")),
    auto_backup_enabled: parseBool(getSettingValue(db, "auto_backup_enabled", "0")),
    auto_backup_frequency: freq === "weekly" ? "weekly" : "daily",
    backup_location: getSettingValue(db, "backup_location", ""),
    backup_retention: Math.max(1, num("backup_retention", 7)),
    last_auto_backup_at: getSettingValue(db, "last_auto_backup_at", ""),
    gym_name: getSettingValue(db, "gym_name", DEFAULTS.gym_name) || DEFAULTS.gym_name,
    gym_logo: getSettingValue(db, "gym_logo", DEFAULTS.gym_logo),
    gym_phone: getSettingValue(db, "gym_phone", DEFAULTS.gym_phone),
    gym_address: getSettingValue(db, "gym_address", DEFAULTS.gym_address),
    currency: getSettingValue(db, "currency", DEFAULTS.currency) || DEFAULTS.currency,
    admin_name: getSettingValue(db, "admin_name", DEFAULTS.admin_name) || DEFAULTS.admin_name,
    admin_photo: getSettingValue(db, "admin_photo", DEFAULTS.admin_photo),
    admin_phone: getSettingValue(db, "admin_phone", DEFAULTS.admin_phone),
    admin_role: getSettingValue(db, "admin_role", DEFAULTS.admin_role) || DEFAULTS.admin_role,
  };
}

export function getAppSettings(): AppSettingsMap {
  return withPersist((db) => readAppSettingsFromDb(db));
}

export function saveAppSettings(patch: Partial<AppSettingsMap>): AppSettingsMap {
  return withPersist((db) => {
    const current = readAppSettingsFromDb(db);
    const next = { ...current, ...patch };
    setSettingValue(db, "expiry_warning_days", String(next.expiry_warning_days));
    setSettingValue(db, "notify_low_stock", next.notify_low_stock ? "1" : "0");
    setSettingValue(db, "notify_out_of_stock", next.notify_out_of_stock ? "1" : "0");
    setSettingValue(db, "notify_backup", next.notify_backup ? "1" : "0");
    setSettingValue(db, "notify_subscriptions", next.notify_subscriptions ? "1" : "0");
    setSettingValue(db, "auto_backup_enabled", next.auto_backup_enabled ? "1" : "0");
    setSettingValue(db, "auto_backup_frequency", next.auto_backup_frequency);
    setSettingValue(db, "backup_location", next.backup_location);
    setSettingValue(db, "backup_retention", String(next.backup_retention));
    setSettingValue(db, "last_auto_backup_at", next.last_auto_backup_at);
    setSettingValue(db, "gym_name", next.gym_name);
    setSettingValue(db, "gym_logo", next.gym_logo);
    setSettingValue(db, "gym_phone", next.gym_phone);
    setSettingValue(db, "gym_address", next.gym_address);
    setSettingValue(db, "currency", next.currency);
    setSettingValue(db, "admin_name", next.admin_name);
    setSettingValue(db, "admin_photo", next.admin_photo);
    setSettingValue(db, "admin_phone", next.admin_phone);
    setSettingValue(db, "admin_role", next.admin_role);
    return next;
  });
}

export function getExpiryWarningDays(): number {
  const store = getDatabase();
  const n = Number(getSettingValue(store.db, "expiry_warning_days", "7"));
  return Number.isFinite(n) && n >= 1 ? n : 7;
}
