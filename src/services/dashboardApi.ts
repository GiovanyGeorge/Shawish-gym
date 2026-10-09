import type { DashboardStats } from "@/types/domain";
import { ipcInvoke } from "@/services/ipc";

export function fetchDashboardStats() {
  return ipcInvoke<DashboardStats>("dashboard:stats");
}
