-- Phase 4: training schedule, session lifecycle, plan vs actual snapshots

ALTER TABLE workout_program_days ADD COLUMN weekday INTEGER;

ALTER TABLE workout_sessions ADD COLUMN status TEXT NOT NULL DEFAULT 'scheduled';
ALTER TABLE workout_sessions ADD COLUMN started_at TEXT;
ALTER TABLE workout_sessions ADD COLUMN updated_at TEXT;

UPDATE workout_sessions
SET status = CASE
  WHEN completed_at IS NOT NULL THEN 'completed'
  ELSE 'scheduled'
END
WHERE status IS NULL OR status = 'scheduled';

ALTER TABLE workout_session_exercises ADD COLUMN exercise_name TEXT;
ALTER TABLE workout_session_exercises ADD COLUMN planned_sets INTEGER;
ALTER TABLE workout_session_exercises ADD COLUMN planned_reps TEXT;
ALTER TABLE workout_session_exercises ADD COLUMN planned_weight REAL;

ALTER TABLE workout_sets ADD COLUMN planned_reps TEXT;
ALTER TABLE workout_sets ADD COLUMN planned_weight REAL;
ALTER TABLE workout_sets ADD COLUMN rest_seconds INTEGER;
ALTER TABLE workout_sets ADD COLUMN notes TEXT;
ALTER TABLE workout_sets ADD COLUMN updated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_workout_sessions_date_status ON workout_sessions(session_date, status);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_trainer_date ON workout_sessions(trainer_id, session_date);
CREATE INDEX IF NOT EXISTS idx_workout_session_exercises_session ON workout_session_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_session_exercise ON workout_sets(session_exercise_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_sessions_active_member_date
ON workout_sessions(member_id, session_date)
WHERE status IN ('scheduled', 'in_progress');
