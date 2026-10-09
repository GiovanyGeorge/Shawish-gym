-- SHAWISH initial schema (local SQLite)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscription_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    duration_months INTEGER NOT NULL UNIQUE,
    label TEXT NOT NULL,
    price REAL NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trainers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    photo_path TEXT,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    training_category TEXT NOT NULL CHECK (training_category IN ('men', 'women', 'both')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    photo_path TEXT,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    trainer_id INTEGER REFERENCES trainers(id),
    goals_notes TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS member_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS member_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    duration_months INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    price REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscription_pauses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_subscription_id INTEGER NOT NULL REFERENCES member_subscriptions(id) ON DELETE CASCADE,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    pause_days INTEGER NOT NULL,
    reason TEXT,
    previous_end_date TEXT NOT NULL,
    new_end_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    attendance_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'paused')),
    check_in_time TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (member_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    equipment TEXT,
    image_path TEXT,
    instructions TEXT,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workout_programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    program_type TEXT NOT NULL,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workout_program_days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
    day_name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workout_program_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_day_id INTEGER NOT NULL REFERENCES workout_program_days(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    planned_sets INTEGER NOT NULL,
    target_reps TEXT NOT NULL,
    target_weight REAL,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS member_workout_programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    program_id INTEGER NOT NULL REFERENCES workout_programs(id),
    trainer_id INTEGER REFERENCES trainers(id),
    start_date TEXT NOT NULL,
    end_date TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workout_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id),
    program_id INTEGER REFERENCES workout_programs(id),
    program_day_id INTEGER REFERENCES workout_program_days(id),
    trainer_id INTEGER REFERENCES trainers(id),
    session_date TEXT NOT NULL,
    workout_type_label TEXT,
    notes TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workout_session_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS workout_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_exercise_id INTEGER NOT NULL REFERENCES workout_session_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    weight_kg REAL,
    reps INTEGER,
    is_completed INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    product_code TEXT NOT NULL UNIQUE,
    barcode TEXT UNIQUE,
    category TEXT,
    image_path TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER NOT NULL DEFAULT 0,
    purchase_price REAL,
    selling_price REAL NOT NULL,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_stock_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('stock_in', 'stock_out', 'sale', 'adjustment')),
    quantity INTEGER NOT NULL,
    unit_cost REAL,
    supplier TEXT,
    notes TEXT,
    reference_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER REFERENCES members(id),
    subtotal REAL NOT NULL,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL,
    notes TEXT,
    sold_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    unit_cost REAL,
    line_total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS member_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id),
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    line_total REAL NOT NULL,
    purchased_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_members_trainer ON members(trainer_id);
CREATE INDEX IF NOT EXISTS idx_member_subscriptions_member ON member_subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_member_date ON workout_sessions(member_id, session_date);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read, created_at);
