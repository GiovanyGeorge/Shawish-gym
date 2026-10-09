import type { MemberFilter, MemberListItem } from "@/types/domain";
import { ipcInvoke } from "@/services/ipc";

export type CreateMemberInput = {
  name: string;
  phone: string;
  photo_path?: string | null;
  gender: "male" | "female";
  trainer_id: number;
  program_id: number;
  goals_notes?: string;
  duration_months: number;
  start_date: string;
  end_date: string;
  price: number;
};

export type MemberForEdit = {
  id: number;
  member_code: string;
  name: string;
  phone: string;
  photo_path: string | null;
  gender: "male" | "female";
  trainer_id: number | null;
  workout_program_id: number | null;
  workout_program_start_date: string | null;
  goals_notes: string | null;
  goals: MemberGoalRow[];
  current_subscription: {
    duration_months: number;
    start_date: string;
    end_date: string;
    price: number;
    label: string | null;
  } | null;
};

export type MemberGoalRow = {
  id: number;
  goal: string;
  notes: string | null;
  status: string;
  created_at: string;
};

export type UpdateMemberInput = {
  id: number;
  name: string;
  phone: string;
  photo_path?: string | null;
  gender: "male" | "female";
  trainer_id: number;
  program_id: number;
  workout_program_start_date: string;
  goals_notes?: string;
};

export function fetchMembers(filter: MemberFilter = "all") {
  return ipcInvoke<MemberListItem[]>("members:list", { filter });
}

export function fetchMemberForEdit(id: number) {
  return ipcInvoke<MemberForEdit | null>("members:getForEdit", { id });
}

export function createMember(input: CreateMemberInput) {
  return ipcInvoke<MemberListItem>("members:create", input);
}

export function updateMember(input: UpdateMemberInput) {
  return ipcInvoke<MemberForEdit>("members:update", input);
}

export function addMemberGoal(memberId: number, goal: string, notes?: string) {
  return ipcInvoke<MemberGoalRow>("members:addGoal", { member_id: memberId, goal, notes });
}

export function updateMemberGoal(id: number, goal: string, notes?: string) {
  return ipcInvoke<MemberGoalRow>("members:updateGoal", { id, goal, notes });
}

export function deleteMemberGoal(id: number) {
  return ipcInvoke<{ ok: boolean }>("members:deleteGoal", { id });
}
