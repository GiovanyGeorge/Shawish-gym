import type {
  MemberAttendanceRow,
  MemberGoalRow,
  MemberPauseRow,
  MemberProfile,
  MemberSubscriptionRow,
} from "@/types/domain";
import { ipcInvoke } from "@/services/ipc";

export function fetchMemberProfile(id: number) {
  return ipcInvoke<MemberProfile | null>("members:get", { id });
}

export function fetchSubscriptionHistory(memberId: number) {
  return ipcInvoke<MemberSubscriptionRow[]>("members:subscriptionHistory", { member_id: memberId });
}

export function fetchPauseHistory(memberId: number) {
  return ipcInvoke<MemberPauseRow[]>("members:pauseHistory", { member_id: memberId });
}

export function fetchMemberGoals(memberId: number) {
  return ipcInvoke<MemberGoalRow[]>("members:goals", { member_id: memberId });
}

export function addMemberGoal(input: { member_id: number; title: string; notes?: string }) {
  return ipcInvoke<MemberGoalRow>("members:addGoal", input);
}

export function setMemberGoalStatus(
  goalId: number,
  status: "active" | "completed" | "archived",
) {
  return ipcInvoke<{ ok: true }>("members:setGoalStatus", { goal_id: goalId, status });
}

export function renewMemberSubscription(input: {
  member_id: number;
  duration_months: number;
  start_date: string;
}) {
  return ipcInvoke<{ ok: true }>("members:renew", input);
}

export function pauseMemberSubscription(input: {
  member_id: number;
  start_date: string;
  end_date: string;
  reason?: string;
}) {
  return ipcInvoke<{ ok: true }>("members:pause", input);
}

export function resumeMember(memberId: number) {
  return ipcInvoke<{ ok: true }>("members:resume", { member_id: memberId });
}

export function fetchMemberAttendanceHistory(memberId: number) {
  return ipcInvoke<MemberAttendanceRow[]>("members:attendanceHistory", { member_id: memberId });
}
