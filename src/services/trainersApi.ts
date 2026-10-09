import type { Trainer } from "@/types/domain";
import { ipcInvoke } from "@/services/ipc";

export type CreateTrainerInput = {
  name: string;
  phone?: string;
  photo_path?: string | null;
  gender: "male" | "female";
  training_category: "men" | "women" | "both";
  notes?: string;
};

export type UpdateTrainerInput = CreateTrainerInput & { id: number; status?: "active" | "inactive" };

export function fetchTrainers(activeOnly = false) {
  return ipcInvoke<Trainer[]>("trainers:list", { activeOnly });
}

export function fetchTrainersForMember(gender: "male" | "female") {
  return ipcInvoke<Trainer[]>("trainers:listForMember", { gender });
}

export function createTrainer(input: CreateTrainerInput) {
  return ipcInvoke<Trainer>("trainers:create", input);
}

export function updateTrainer(input: UpdateTrainerInput) {
  return ipcInvoke<Trainer>("trainers:update", input);
}

export function setTrainerStatus(id: number, status: "active" | "inactive") {
  return ipcInvoke<Trainer>("trainers:setStatus", { id, status });
}
