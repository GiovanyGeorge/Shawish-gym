import type { DailyAttendanceRow } from "@/types/domain";
import { ipcInvoke } from "@/services/ipc";

export function fetchDailyAttendance(date: string, search?: string) {
  return ipcInvoke<DailyAttendanceRow[]>("attendance:daily", { date, search });
}

export function setDailyAttendance(input: {
  member_id: number;
  attendance_date: string;
  status: "present" | "absent";
}) {
  return ipcInvoke<{ ok: true }>("attendance:set", input);
}
