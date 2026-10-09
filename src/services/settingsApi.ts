import { ipcInvoke } from "@/services/ipc";

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

export function fetchAppSettings() {
  return ipcInvoke<AppSettingsMap>("settings:get");
}

export function saveAppSettings(patch: Partial<AppSettingsMap>) {
  return ipcInvoke<AppSettingsMap>("settings:save", patch);
}
