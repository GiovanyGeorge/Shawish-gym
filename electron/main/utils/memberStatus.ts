import { localTodayIso } from "./localDate";
import { diffLocalDays } from "./localDate";

export type MemberDisplayStatus = "active" | "expiring" | "paused" | "expired";

export function computeMemberDisplayStatus(
  memberStatus: string,
  endDate: string | null,
  warningDays = 7,
  todayIso = localTodayIso(),
): MemberDisplayStatus {
  if (memberStatus === "paused") return "paused";
  if (!endDate) return "active";
  if (endDate < todayIso) return "expired";
  const daysLeft = diffLocalDays(todayIso, endDate);
  if (daysLeft <= warningDays) return "expiring";
  return "active";
}

export function isSubscriptionActiveForOperations(
  memberStatus: string,
  endDate: string | null,
  todayIso = localTodayIso(),
): boolean {
  if (memberStatus === "paused") return false;
  if (!endDate) return false;
  return endDate >= todayIso;
}
