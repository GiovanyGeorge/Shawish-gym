-- Phase 6: notifications, backup history, pause resume tracking, settings defaults

ALTER TABLE notifications ADD COLUMN type TEXT;
ALTER TABLE notifications ADD COLUMN reference_key TEXT;
ALTER TABLE notifications ADD COLUMN related_path TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_reference
  ON notifications(reference_key) WHERE reference_key IS NOT NULL AND reference_key != '';

ALTER TABLE subscription_pauses ADD COLUMN resumed_at TEXT;
ALTER TABLE subscription_pauses ADD COLUMN actual_pause_days INTEGER;
ALTER TABLE subscription_pauses ADD COLUMN actual_end_date TEXT;

CREATE TABLE IF NOT EXISTS backup_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_name TEXT NOT NULL,
    folder_path TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'completed',
    notes TEXT
);

INSERT OR IGNORE INTO app_settings (key, value) VALUES
    ('expiry_warning_days', '7'),
    ('notify_low_stock', '1'),
    ('notify_out_of_stock', '1'),
    ('notify_backup', '1'),
    ('notify_subscriptions', '1'),
    ('auto_backup_enabled', '0'),
    ('auto_backup_frequency', 'daily'),
    ('backup_location', ''),
    ('backup_retention', '7'),
    ('last_auto_backup_at', '');

CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_backup_history_created ON backup_history(created_at);
