-- Exercise library metadata for the offline gym seed

ALTER TABLE exercises ADD COLUMN secondary_muscles TEXT;
ALTER TABLE exercises ADD COLUMN category TEXT;
ALTER TABLE exercises ADD COLUMN difficulty TEXT;
ALTER TABLE exercises ADD COLUMN source TEXT NOT NULL DEFAULT 'custom';
ALTER TABLE exercises ADD COLUMN external_id TEXT;

UPDATE exercises SET source = 'custom' WHERE source IS NULL OR TRIM(source) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_source_external
  ON exercises(source, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON exercises(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises(difficulty);
CREATE INDEX IF NOT EXISTS idx_exercises_archived ON exercises(is_archived);
CREATE INDEX IF NOT EXISTS idx_exercises_source ON exercises(source);

INSERT OR IGNORE INTO app_settings (key, value, updated_at)
VALUES ('exercise_seed_version', '0', datetime('now'));
