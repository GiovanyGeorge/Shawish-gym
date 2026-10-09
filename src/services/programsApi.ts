import type { WorkoutProgramDetail, WorkoutProgramSummary } from "@/types/domain";
import { ipcInvoke } from "@/services/ipc";

export type ProgramDayPayload = {
  day_name: string;
  description?: string;
  weekday?: number | null;
  sort_order: number;
  exercises: {
    exercise_id: number;
    planned_sets: number;
    target_reps: string;
    target_weight?: number | null;
    notes?: string;
    sort_order: number;
  }[];
};

export type SaveProgramPayload = {
  name: string;
  description?: string;
  days: ProgramDayPayload[];
};

export function fetchPrograms() {
  return ipcInvoke<WorkoutProgramSummary[]>("programs:list", {});
}

export function fetchProgram(id: number) {
  return ipcInvoke<WorkoutProgramDetail | null>("programs:get", { id });
}

export function createProgram(input: SaveProgramPayload) {
  return ipcInvoke<WorkoutProgramDetail>("programs:create", input);
}

export function updateProgram(id: number, input: SaveProgramPayload) {
  return ipcInvoke<WorkoutProgramDetail>("programs:update", { id, ...input });
}

export function archiveProgram(id: number) {
  return ipcInvoke<void>("programs:archive", { id });
}
