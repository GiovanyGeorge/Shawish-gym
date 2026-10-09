export type Trainer = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  photo_path: string | null;
  gender: "male" | "female";
  training_category: "men" | "women" | "both";
  status: "active" | "inactive";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Exercise = {
  id: number;
  name: string;
  muscle_group: string;
  secondary_muscles: string | null;
  equipment: string | null;
  category: string | null;
  difficulty: string | null;
  image_path: string | null;
  instructions: string | null;
  source: "system" | "custom";
  external_id: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
};

export type SubscriptionPrice = {
  id: number;
  duration_months: number;
  label: string;
  price: number;
  is_active: number;
};

export type WorkoutProgramSummary = {
  id: number;
  name: string;
  description: string | null;
  is_archived: number;
  day_count: number;
  created_at: string;
};

export type ProgramDayExercise = {
  id: number;
  exercise_id: number;
  exercise_name: string;
  muscle_group: string;
  planned_sets: number;
  target_reps: string;
  target_weight: number | null;
  notes: string | null;
  sort_order: number;
};

export type ProgramDay = {
  id: number;
  day_name: string;
  description: string | null;
  weekday: number | null;
  sort_order: number;
  exercises: ProgramDayExercise[];
};

export type WorkoutProgramDetail = {
  id: number;
  name: string;
  description: string | null;
  is_archived: number;
  days: ProgramDay[];
};

export type MemberListItem = {
  id: number;
  member_code: string;
  name: string;
  phone: string;
  photo_path: string | null;
  gender: "male" | "female";
  trainer_id: number | null;
  trainer_name: string | null;
  subscription_label: string | null;
  subscription_end_date: string | null;
  subscription_status: string | null;
  display_status: "active" | "expiring" | "paused" | "expired";
  member_status: string;
};

export type DashboardStats = {
  total_members: number;
  active_subscriptions: number;
  active_trainers: number;
  workout_programs: number;
  exercises: number;
  today_attendance_present: number;
  today_attendance_total: number;
  today_training_total: number;
  today_training_pending: number;
  today_training_in_progress: number;
  today_training_completed: number;
  members_this_month: number;
  store_today_sales: number;
  store_yesterday_sales: number;
  store_today_profit: number;
  store_low_stock: number;
  store_out_of_stock: number;
  store_low_stock_products: {
    id: number;
    name: string;
    quantity: number;
    minimum_stock: number;
  }[];
  expiring_soon: number;
};

export type MemberProfile = {
  id: number;
  member_code: string;
  name: string;
  phone: string;
  gender: "male" | "female";
  photo_path: string | null;
  goals_notes: string | null;
  member_status: string;
  trainer_id: number | null;
  trainer_name: string | null;
  program_id: number | null;
  program_name: string | null;
  display_status: MemberListItem["display_status"];
  current_subscription: {
    id: number;
    duration_months: number;
    label: string | null;
    start_date: string;
    end_date: string;
    price: number;
    status: string;
    created_at: string;
  } | null;
  attendance_summary: {
    present: number;
    absent: number;
    paused_days: number;
    rate: number;
  };
};

export type MemberSubscriptionRow = {
  id: number;
  duration_months: number;
  label: string | null;
  start_date: string;
  end_date: string;
  price: number;
  status: string;
  created_at: string;
};

export type MemberPauseRow = {
  id: number;
  start_date: string;
  end_date: string;
  pause_days: number;
  reason: string | null;
  previous_end_date: string;
  new_end_date: string;
  created_at: string;
};

export type MemberGoalRow = {
  id: number;
  title: string;
  notes: string | null;
  status: string;
  created_at: string;
};

export type DailyAttendanceRow = {
  member_id: number;
  member_code: string;
  name: string;
  photo_path: string | null;
  phone: string;
  member_status: string;
  attendance_status: "present" | "absent" | "paused" | null;
  check_in_time: string | null;
};

export type MemberAttendanceRow = {
  attendance_date: string;
  status: "present" | "absent" | "paused";
  check_in_time: string | null;
};

export type MemberFilter = "all" | "active" | "expiring" | "paused" | "expired";
