export type SessionStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type TodayDisplayStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type TodayTrainingRow = {
  member_id: number;
  member_name: string;
  member_code: string;
  photo_path: string | null;
  trainer_id: number | null;
  trainer_name: string | null;
  program_id: number;
  program_name: string;
  program_day_id: number;
  program_day_name: string;
  scheduled_date: string;
  exercise_count: number;
  session_id: number | null;
  session_status: SessionStatus | null;
  display_status: TodayDisplayStatus;
  attendance_status: string | null;
};

export type TodayTrainingSummary = {
  scheduled_date: string;
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
};

export type WorkoutSetRow = {
  id: number;
  set_number: number;
  planned_reps: string | null;
  planned_weight: number | null;
  actual_reps: number | null;
  actual_weight: number | null;
  rest_seconds: number | null;
  notes: string | null;
  is_completed: number;
};

export type SessionExerciseRow = {
  id: number;
  exercise_id: number;
  exercise_name: string;
  sort_order: number;
  planned_sets: number | null;
  planned_reps: string | null;
  planned_weight: number | null;
  notes: string | null;
  sets: WorkoutSetRow[];
};

export type WorkoutSessionDetail = {
  id: number;
  member_id: number;
  member_name: string;
  trainer_id: number | null;
  trainer_name: string | null;
  program_id: number | null;
  program_name: string | null;
  program_day_id: number | null;
  program_day_name: string | null;
  workout_type_label: string | null;
  session_date: string;
  status: SessionStatus;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  exercises: SessionExerciseRow[];
};

export type PreviousPerformance = {
  session_date: string;
  sets: { set_number: number; actual_weight: number | null; actual_reps: number | null }[];
} | null;

export type MemberSessionHistoryItem = {
  id: number;
  session_date: string;
  program_day_name: string | null;
  trainer_name: string | null;
  status: SessionStatus;
  started_at: string | null;
  completed_at: string | null;
  duration_minutes: number | null;
};

export type ProgressPoint = {
  session_date: string;
  best_weight: number;
  best_reps: number;
  total_volume: number;
};
