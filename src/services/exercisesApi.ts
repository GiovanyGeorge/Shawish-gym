import type { Exercise } from "@/types/domain";
import { ipcInvoke } from "@/services/ipc";

export type ExerciseListParams = {
  search?: string;
  muscle_group?: string;
  equipment?: string;
  category?: string;
  difficulty?: string;
  include_archived?: boolean;
  archived_only?: boolean;
  limit?: number;
  offset?: number;
};

export type ExerciseFilterOptions = {
  muscle_groups: string[];
  equipment: string[];
  categories: string[];
  difficulties: string[];
};

export function fetchExercises(params?: ExerciseListParams) {
  return ipcInvoke<Exercise[]>("exercises:list", params ?? {});
}

export function countExercises(params?: ExerciseListParams) {
  return ipcInvoke<number>("exercises:count", params ?? {});
}

export function fetchExerciseFilterOptions() {
  return ipcInvoke<ExerciseFilterOptions>("exercises:filterOptions");
}

export function fetchExercisePicker() {
  return ipcInvoke<Exercise[]>("exercises:picker");
}

export function createExercise(input: {
  name: string;
  muscle_group: string;
  secondary_muscles?: string;
  equipment?: string;
  category?: string;
  difficulty?: string;
  instructions?: string;
}) {
  return ipcInvoke<Exercise>("exercises:create", input);
}

export function updateExercise(input: {
  id: number;
  name: string;
  muscle_group: string;
  secondary_muscles?: string;
  equipment?: string;
  category?: string;
  difficulty?: string;
  instructions?: string;
}) {
  return ipcInvoke<Exercise>("exercises:update", input);
}

export function archiveExercise(id: number) {
  return ipcInvoke<Exercise>("exercises:archive", { id });
}
