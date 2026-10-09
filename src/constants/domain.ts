export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Quadriceps",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Abs",
  "Core",
  "Full Body",
  "Cardio",
  "Other",
] as const;

export const EXERCISE_EQUIPMENT = [
  "Barbell",
  "Dumbbell",
  "Cable",
  "Machine",
  "Smith Machine",
  "Kettlebell",
  "Resistance Band",
  "Bodyweight",
  "EZ Bar",
  "Trap Bar",
  "Bench",
  "Cardio Machine",
  "Other",
] as const;

export const EXERCISE_CATEGORIES = [
  "Strength",
  "Cardio",
  "Conditioning",
  "Stretching",
] as const;

export const EXERCISE_DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;

export const MEMBER_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "expiring", label: "Expiring" },
  { id: "paused", label: "Paused" },
  { id: "expired", label: "Expired" },
] as const;
