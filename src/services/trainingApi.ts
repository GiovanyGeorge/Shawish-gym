import { ipcInvoke } from "@/services/ipc";
import type {
  MemberSessionHistoryItem,
  PreviousPerformance,
  ProgressPoint,
  TodayTrainingRow,
  TodayTrainingSummary,
  WorkoutSessionDetail,
  WorkoutSetRow,
} from "@/types/training";

export function fetchTodayTraining(params?: {
  date?: string;
  trainer_id?: number;
  status?: TodayTrainingRow["display_status"] | "all";
}) {
  return ipcInvoke<TodayTrainingRow[]>("training:today", params ?? {});
}

export function fetchTodayTrainingSummary(date?: string) {
  return ipcInvoke<TodayTrainingSummary>("training:todaySummary", { date });
}

export function startTrainingSession(memberId: number, scheduledDate?: string) {
  return ipcInvoke<WorkoutSessionDetail>("training:startSession", {
    member_id: memberId,
    scheduled_date: scheduledDate,
  });
}

export function fetchWorkoutSession(sessionId: number) {
  return ipcInvoke<WorkoutSessionDetail | null>("training:getSession", { id: sessionId });
}

export function saveWorkoutSet(input: {
  set_id: number;
  actual_reps?: number | null;
  actual_weight?: number | null;
  rest_seconds?: number | null;
  notes?: string | null;
  is_completed?: boolean;
}) {
  return ipcInvoke<WorkoutSetRow>("training:updateSet", input);
}

export function addWorkoutSet(sessionExerciseId: number) {
  return ipcInvoke<WorkoutSetRow>("training:addSet", { session_exercise_id: sessionExerciseId });
}

export function removeWorkoutSet(setId: number) {
  return ipcInvoke<{ ok: boolean }>("training:removeSet", { set_id: setId });
}

export function saveExerciseNotes(sessionExerciseId: number, notes: string) {
  return ipcInvoke<{ ok: boolean }>("training:updateExerciseNotes", {
    session_exercise_id: sessionExerciseId,
    notes,
  });
}

export function saveSessionNotes(sessionId: number, notes: string) {
  return ipcInvoke<{ ok: boolean }>("training:updateSessionNotes", { session_id: sessionId, notes });
}

export function completeTrainingSession(sessionId: number, force = false) {
  return ipcInvoke<WorkoutSessionDetail>("training:completeSession", { session_id: sessionId, force });
}

export function cancelTrainingSession(sessionId: number) {
  return ipcInvoke<WorkoutSessionDetail>("training:cancelSession", { session_id: sessionId });
}

export function fetchPreviousPerformance(
  memberId: number,
  exerciseId: number,
  beforeSessionId?: number,
) {
  return ipcInvoke<PreviousPerformance>("training:previousPerformance", {
    member_id: memberId,
    exercise_id: exerciseId,
    before_session_id: beforeSessionId,
  });
}

export function fetchMemberWorkoutHistory(memberId: number) {
  return ipcInvoke<MemberSessionHistoryItem[]>("training:memberHistory", { member_id: memberId });
}

export function fetchExerciseProgress(memberId: number, exerciseId: number) {
  return ipcInvoke<ProgressPoint[]>("training:exerciseProgress", { member_id: memberId, exercise_id: exerciseId });
}

export function fetchMemberTrainedExercises(memberId: number) {
  return ipcInvoke<{ exercise_id: number; exercise_name: string }[]>("training:memberExercises", {
    member_id: memberId,
  });
}
