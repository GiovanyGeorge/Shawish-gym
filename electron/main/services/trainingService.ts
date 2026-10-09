import type { Database } from "sql.js";
import { queryAll, queryOne, runExecute, runStatement } from "../database/query";
import { withPersist, withPersistTransaction } from "./store";
import { diffLocalDays, localTodayIso, localWeekdayFromIso } from "../utils/localDate";

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

export type PreviousPerformanceSet = {
  set_number: number;
  actual_weight: number | null;
  actual_reps: number | null;
};

export type PreviousPerformance = {
  session_date: string;
  sets: PreviousPerformanceSet[];
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

type ProgramDayRow = {
  id: number;
  day_name: string;
  sort_order: number;
  weekday: number | null;
};

type ProgramExerciseRow = {
  id: number;
  exercise_id: number;
  exercise_name: string;
  planned_sets: number;
  target_reps: string;
  target_weight: number | null;
  notes: string | null;
  sort_order: number;
};

function parseTargetRepsForPlan(reps: string): string {
  return reps.trim();
}

function isMemberEligibleOnDate(
  db: Database,
  memberId: number,
  dateIso: string,
): { ok: boolean; reason?: string } {
  const member = queryOne(
    db,
    `SELECT m.id, m.status, m.workout_program_id, m.trainer_id
     FROM members m WHERE m.id = ?`,
    [memberId],
  );
  if (!member) return { ok: false, reason: "Member not found." };
  if (String(member.status) === "paused") return { ok: false, reason: "Member is paused." };

  const sub = queryOne(
    db,
    `SELECT status, start_date, end_date FROM member_subscriptions
     WHERE member_id = ? ORDER BY start_date DESC, id DESC LIMIT 1`,
    [memberId],
  );
  if (!sub) return { ok: false, reason: "No subscription." };
  if (String(sub.status) !== "active") return { ok: false, reason: "Subscription inactive." };
  if (dateIso < String(sub.start_date) || dateIso > String(sub.end_date)) {
    return { ok: false, reason: "Subscription not valid for this date." };
  }
  if (!member.workout_program_id) return { ok: false, reason: "No workout program." };
  return { ok: true };
}

function loadProgramDays(db: Database, programId: number): ProgramDayRow[] {
  return queryAll(
    db,
    `SELECT id, day_name, sort_order, weekday FROM workout_program_days
     WHERE program_id = ? ORDER BY sort_order, id`,
    [programId],
  ) as ProgramDayRow[];
}

export function resolveProgramDayForDate(
  db: Database,
  programId: number,
  programStartDate: string | null,
  dateIso: string,
): ProgramDayRow | null {
  const days = loadProgramDays(db, programId);
  if (!days.length) return null;

  const weekday = localWeekdayFromIso(dateIso);
  const withWeekday = days.filter((d) => d.weekday != null);
  if (withWeekday.length > 0) {
    const match = days.find((d) => d.weekday === weekday);
    if (match) return match;
    // If weekdays are set but today is not one of them, still show a rotating day
    // so eligible members appear on Today's Training.
  }

  const anchor = programStartDate ?? dateIso;
  const offset = Math.max(0, diffLocalDays(anchor, dateIso));
  const index = offset % days.length;
  return days[index] ?? null;
}

function loadDayExercises(db: Database, programDayId: number): ProgramExerciseRow[] {
  return queryAll(
    db,
    `SELECT pe.id, pe.exercise_id, e.name AS exercise_name,
            pe.planned_sets, pe.target_reps, pe.target_weight, pe.notes, pe.sort_order
     FROM workout_program_exercises pe
     JOIN exercises e ON e.id = pe.exercise_id
     WHERE pe.program_day_id = ?
     ORDER BY pe.sort_order, pe.id`,
    [programDayId],
  ) as ProgramExerciseRow[];
}

function mapSessionDisplayStatus(
  session: { status: string } | null,
): TodayDisplayStatus {
  if (!session) return "pending";
  const s = String(session.status) as SessionStatus;
  if (s === "in_progress") return "in_progress";
  if (s === "completed") return "completed";
  if (s === "cancelled") return "cancelled";
  return "pending";
}

function buildTodayRow(
  db: Database,
  member: Record<string, unknown>,
  dateIso: string,
  programDay: ProgramDayRow,
): TodayTrainingRow {
  const programId = Number(member.workout_program_id);
  const program = queryOne(db, `SELECT name FROM workout_programs WHERE id = ?`, [programId]);
  const exercises = loadDayExercises(db, programDay.id);
  const session = queryOne(
    db,
    `SELECT id, status FROM workout_sessions
     WHERE member_id = ? AND session_date = ? AND status != 'cancelled'
     ORDER BY id DESC LIMIT 1`,
    [Number(member.id), dateIso],
  );
  const attendance = queryOne(
    db,
    `SELECT status FROM attendance WHERE member_id = ? AND attendance_date = ?`,
    [Number(member.id), dateIso],
  );

  const displayStatus = mapSessionDisplayStatus(session as { status: string } | null);

  return {
    member_id: Number(member.id),
    member_name: String(member.name),
    member_code: String(member.member_code),
    photo_path: member.photo_path ? String(member.photo_path) : null,
    trainer_id: member.trainer_id != null ? Number(member.trainer_id) : null,
    trainer_name: member.trainer_name ? String(member.trainer_name) : null,
    program_id: programId,
    program_name: program ? String(program.name) : "Program",
    program_day_id: programDay.id,
    program_day_name: programDay.day_name,
    scheduled_date: dateIso,
    exercise_count: exercises.length,
    session_id: session ? Number(session.id) : null,
    session_status: session ? (String(session.status) as SessionStatus) : null,
    display_status: displayStatus,
    attendance_status: attendance ? String(attendance.status) : null,
  };
}

export function getTodayTrainingSummary(dateIso = localTodayIso()): TodayTrainingSummary {
  const rows = listTodayTraining({ date: dateIso });
  let pending = 0;
  let in_progress = 0;
  let completed = 0;
  let cancelled = 0;
  for (const row of rows) {
    if (row.display_status === "pending") pending++;
    else if (row.display_status === "in_progress") in_progress++;
    else if (row.display_status === "completed") completed++;
    else if (row.display_status === "cancelled") cancelled++;
  }
  return {
    scheduled_date: dateIso,
    total: rows.length,
    pending,
    in_progress,
    completed,
    cancelled,
  };
}

export function listTodayTraining(filter: {
  date?: string;
  trainer_id?: number;
  status?: TodayDisplayStatus | "all";
}): TodayTrainingRow[] {
  return withPersist((db) => {
    const dateIso = filter.date ?? localTodayIso();
    const members = queryAll(
      db,
      `SELECT m.id, m.member_code, m.name, m.photo_path, m.trainer_id, m.workout_program_id,
              m.workout_program_start_date, m.status, t.name AS trainer_name
       FROM members m
       LEFT JOIN trainers t ON t.id = m.trainer_id
       WHERE m.status = 'active' AND m.workout_program_id IS NOT NULL`,
    ) as Record<string, unknown>[];

    const rows: TodayTrainingRow[] = [];
    for (const member of members) {
      if (filter.trainer_id && Number(member.trainer_id) !== filter.trainer_id) continue;

      const eligibility = isMemberEligibleOnDate(db, Number(member.id), dateIso);
      if (!eligibility.ok) continue;

      const programDay = resolveProgramDayForDate(
        db,
        Number(member.workout_program_id),
        member.workout_program_start_date ? String(member.workout_program_start_date) : null,
        dateIso,
      );
      if (!programDay) continue;

      const row = buildTodayRow(db, member, dateIso, programDay);
      if (filter.status && filter.status !== "all" && row.display_status !== filter.status) {
        continue;
      }
      rows.push(row);
    }

    rows.sort((a, b) => a.member_name.localeCompare(b.member_name));
    return rows;
  });
}

function createSessionFromProgram(
  db: Database,
  memberId: number,
  trainerId: number | null,
  programId: number,
  programDayId: number,
  programDayName: string,
  dateIso: string,
): number {
  const now = new Date().toISOString();
  const sessionId = runStatement(
    db,
    `INSERT INTO workout_sessions
     (member_id, program_id, program_day_id, trainer_id, session_date, workout_type_label,
      status, started_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'in_progress', ?, datetime('now'), datetime('now'))`,
    [memberId, programId, programDayId, trainerId, dateIso, programDayName, now],
  );

  const exercises = loadDayExercises(db, programDayId);
  for (const ex of exercises) {
    const sessionExerciseId = runStatement(
      db,
      `INSERT INTO workout_session_exercises
       (session_id, exercise_id, sort_order, notes, exercise_name, planned_sets, planned_reps, planned_weight)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        ex.exercise_id,
        ex.sort_order,
        ex.notes,
        ex.exercise_name,
        ex.planned_sets,
        parseTargetRepsForPlan(ex.target_reps),
        ex.target_weight,
      ],
    );

    const plannedSets = Math.max(1, ex.planned_sets);
    for (let setNum = 1; setNum <= plannedSets; setNum++) {
      runStatement(
        db,
        `INSERT INTO workout_sets
         (session_exercise_id, set_number, planned_reps, planned_weight, reps, weight_kg,
          is_completed, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, NULL, 0, datetime('now'), datetime('now'))`,
        [
          sessionExerciseId,
          setNum,
          parseTargetRepsForPlan(ex.target_reps),
          ex.target_weight,
        ],
      );
    }
  }

  return sessionId;
}

function loadSessionDetailFromDb(db: Database, sessionId: number): WorkoutSessionDetail | null {
  const session = queryOne(
    db,
    `SELECT ws.*, m.name AS member_name, t.name AS trainer_name,
            wp.name AS program_name, wpd.day_name AS program_day_name
     FROM workout_sessions ws
     JOIN members m ON m.id = ws.member_id
     LEFT JOIN trainers t ON t.id = ws.trainer_id
     LEFT JOIN workout_programs wp ON wp.id = ws.program_id
     LEFT JOIN workout_program_days wpd ON wpd.id = ws.program_day_id
     WHERE ws.id = ?`,
    [sessionId],
  ) as Record<string, unknown> | null;
  if (!session) return null;

  const sessionExercises = queryAll(
    db,
    `SELECT id, exercise_id, exercise_name, sort_order, planned_sets, planned_reps, planned_weight, notes
     FROM workout_session_exercises WHERE session_id = ? ORDER BY sort_order, id`,
    [sessionId],
  ) as Record<string, unknown>[];

  const exercises: SessionExerciseRow[] = sessionExercises.map((se) => {
    const sets = queryAll(
      db,
      `SELECT id, set_number, planned_reps, planned_weight, reps AS actual_reps, weight_kg AS actual_weight,
              rest_seconds, notes, is_completed
       FROM workout_sets WHERE session_exercise_id = ? ORDER BY set_number, id`,
      [Number(se.id)],
    ) as Record<string, unknown>[];

    return {
      id: Number(se.id),
      exercise_id: Number(se.exercise_id),
      exercise_name: String(se.exercise_name ?? "Exercise"),
      sort_order: Number(se.sort_order),
      planned_sets: se.planned_sets != null ? Number(se.planned_sets) : null,
      planned_reps: se.planned_reps ? String(se.planned_reps) : null,
      planned_weight: se.planned_weight != null ? Number(se.planned_weight) : null,
      notes: se.notes ? String(se.notes) : null,
      sets: sets.map((s) => ({
        id: Number(s.id),
        set_number: Number(s.set_number),
        planned_reps: s.planned_reps ? String(s.planned_reps) : null,
        planned_weight: s.planned_weight != null ? Number(s.planned_weight) : null,
        actual_reps: s.actual_reps != null ? Number(s.actual_reps) : null,
        actual_weight: s.actual_weight != null ? Number(s.actual_weight) : null,
        rest_seconds: s.rest_seconds != null ? Number(s.rest_seconds) : null,
        notes: s.notes ? String(s.notes) : null,
        is_completed: Number(s.is_completed),
      })),
    };
  });

  return {
    id: Number(session.id),
    member_id: Number(session.member_id),
    member_name: String(session.member_name),
    trainer_id: session.trainer_id != null ? Number(session.trainer_id) : null,
    trainer_name: session.trainer_name ? String(session.trainer_name) : null,
    program_id: session.program_id != null ? Number(session.program_id) : null,
    program_name: session.program_name ? String(session.program_name) : null,
    program_day_id: session.program_day_id != null ? Number(session.program_day_id) : null,
    program_day_name: session.program_day_name
      ? String(session.program_day_name)
      : session.workout_type_label
        ? String(session.workout_type_label)
        : null,
    workout_type_label: session.workout_type_label ? String(session.workout_type_label) : null,
    session_date: String(session.session_date),
    status: String(session.status) as SessionStatus,
    started_at: session.started_at ? String(session.started_at) : null,
    completed_at: session.completed_at ? String(session.completed_at) : null,
    notes: session.notes ? String(session.notes) : null,
    exercises,
  };
}

export function getWorkoutSession(sessionId: number): WorkoutSessionDetail | null {
  return withPersist((db) => loadSessionDetailFromDb(db, sessionId));
}

export function startWorkoutSession(input: {
  member_id: number;
  scheduled_date?: string;
}): WorkoutSessionDetail {
  const dateIso = input.scheduled_date ?? localTodayIso();
  return withPersistTransaction((db) => {
    const existing = queryOne(
      db,
      `SELECT id FROM workout_sessions
       WHERE member_id = ? AND session_date = ? AND status IN ('scheduled', 'in_progress')
       ORDER BY id DESC LIMIT 1`,
      [input.member_id, dateIso],
    );
    if (existing) {
      const detail = loadSessionDetailFromDb(db, Number(existing.id));
      if (!detail) throw new Error("Session not found.");
      if (detail.status === "scheduled") {
        runExecute(
          db,
          `UPDATE workout_sessions SET status = 'in_progress', started_at = COALESCE(started_at, ?), updated_at = datetime('now') WHERE id = ?`,
          [new Date().toISOString(), detail.id],
        );
      }
      return loadSessionDetailFromDb(db, detail.id)!;
    }

    const eligibility = isMemberEligibleOnDate(db, input.member_id, dateIso);
    if (!eligibility.ok) throw new Error(eligibility.reason ?? "Member cannot train today.");

    const member = queryOne(
      db,
      `SELECT workout_program_id, workout_program_start_date, trainer_id FROM members WHERE id = ?`,
      [input.member_id],
    );
    if (!member?.workout_program_id) throw new Error("No workout program assigned.");

    const programDay = resolveProgramDayForDate(
      db,
      Number(member.workout_program_id),
      member.workout_program_start_date ? String(member.workout_program_start_date) : null,
      dateIso,
    );
    if (!programDay) throw new Error("No training day scheduled for today.");

    const sessionId = createSessionFromProgram(
      db,
      input.member_id,
      member.trainer_id != null ? Number(member.trainer_id) : null,
      Number(member.workout_program_id),
      programDay.id,
      programDay.day_name,
      dateIso,
    );
    return loadSessionDetailFromDb(db, sessionId)!;
  });
}

function validateSetValues(actual_reps: number | null, actual_weight: number | null): void {
  if (actual_reps != null && (!Number.isInteger(actual_reps) || actual_reps < 0)) {
    throw new Error("Reps must be a whole number zero or greater.");
  }
  if (actual_weight != null && (actual_weight < 0 || !Number.isFinite(actual_weight))) {
    throw new Error("Weight must be zero or greater.");
  }
}

export function updateWorkoutSet(input: {
  set_id: number;
  actual_reps?: number | null;
  actual_weight?: number | null;
  rest_seconds?: number | null;
  notes?: string | null;
  is_completed?: boolean;
}): WorkoutSetRow {
  validateSetValues(
    input.actual_reps ?? null,
    input.actual_weight ?? null,
  );

  return withPersist((db) => {
    const row = queryOne(db, `SELECT id FROM workout_sets WHERE id = ?`, [input.set_id]);
    if (!row) throw new Error("Set not found.");

    runExecute(
      db,
      `UPDATE workout_sets SET
         reps = ?,
         weight_kg = ?,
         rest_seconds = ?,
         notes = ?,
         is_completed = ?,
         updated_at = datetime('now')
       WHERE id = ?`,
      [
        input.actual_reps ?? null,
        input.actual_weight ?? null,
        input.rest_seconds ?? null,
        input.notes?.trim() ?? null,
        input.is_completed ? 1 : 0,
        input.set_id,
      ],
    );

    const updated = queryOne(db, `SELECT * FROM workout_sets WHERE id = ?`, [input.set_id]) as Record<
      string,
      unknown
    >;
    return {
      id: Number(updated.id),
      set_number: Number(updated.set_number),
      planned_reps: updated.planned_reps ? String(updated.planned_reps) : null,
      planned_weight: updated.planned_weight != null ? Number(updated.planned_weight) : null,
      actual_reps: updated.reps != null ? Number(updated.reps) : null,
      actual_weight: updated.weight_kg != null ? Number(updated.weight_kg) : null,
      rest_seconds: updated.rest_seconds != null ? Number(updated.rest_seconds) : null,
      notes: updated.notes ? String(updated.notes) : null,
      is_completed: Number(updated.is_completed),
    };
  });
}

export function addWorkoutSet(sessionExerciseId: number): WorkoutSetRow {
  return withPersist((db) => {
    const se = queryOne(
      db,
      `SELECT planned_reps, planned_weight FROM workout_session_exercises WHERE id = ?`,
      [sessionExerciseId],
    );
    if (!se) throw new Error("Session exercise not found.");

    const maxRow = queryOne(
      db,
      `SELECT MAX(set_number) AS max_num FROM workout_sets WHERE session_exercise_id = ?`,
      [sessionExerciseId],
    );
    const nextNum = Number(maxRow?.max_num ?? 0) + 1;

    const id = runStatement(
      db,
      `INSERT INTO workout_sets
       (session_exercise_id, set_number, planned_reps, planned_weight, is_completed, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
      [sessionExerciseId, nextNum, se.planned_reps, se.planned_weight],
    );

    const updated = queryOne(db, `SELECT * FROM workout_sets WHERE id = ?`, [id]) as Record<string, unknown>;
    return {
      id: Number(updated.id),
      set_number: Number(updated.set_number),
      planned_reps: updated.planned_reps ? String(updated.planned_reps) : null,
      planned_weight: updated.planned_weight != null ? Number(updated.planned_weight) : null,
      actual_reps: null,
      actual_weight: null,
      rest_seconds: null,
      notes: null,
      is_completed: 0,
    };
  });
}

export function removeWorkoutSet(setId: number): void {
  withPersist((db) => {
    runExecute(db, `DELETE FROM workout_sets WHERE id = ?`, [setId]);
  });
}

export function updateSessionExerciseNotes(sessionExerciseId: number, notes: string): void {
  withPersist((db) => {
    runExecute(db, `UPDATE workout_session_exercises SET notes = ? WHERE id = ?`, [
      notes.trim() || null,
      sessionExerciseId,
    ]);
  });
}

export function updateSessionNotes(sessionId: number, notes: string): void {
  withPersist((db) => {
    runExecute(
      db,
      `UPDATE workout_sessions SET notes = ?, updated_at = datetime('now') WHERE id = ?`,
      [notes.trim() || null, sessionId],
    );
  });
}

export function completeWorkoutSession(sessionId: number, force = false): WorkoutSessionDetail {
  return withPersistTransaction((db) => {
    const session = loadSessionDetailFromDb(db, sessionId);
    if (!session) throw new Error("Session not found.");
    if (session.status === "completed") return session;
    if (session.status === "cancelled") throw new Error("Cancelled sessions cannot be completed.");

    if (!force) {
      const incomplete = queryOne(
        db,
        `SELECT COUNT(*) AS c FROM workout_sets ws
         JOIN workout_session_exercises se ON se.id = ws.session_exercise_id
         WHERE se.session_id = ? AND ws.is_completed = 0`,
        [sessionId],
      );
      if (Number(incomplete?.c ?? 0) > 0) {
        throw new Error("INCOMPLETE_SETS");
      }
    }

    const now = new Date().toISOString();
    runExecute(
      db,
      `UPDATE workout_sessions SET status = 'completed', completed_at = ?, updated_at = datetime('now') WHERE id = ?`,
      [now, sessionId],
    );
    return loadSessionDetailFromDb(db, sessionId)!;
  });
}

export function cancelWorkoutSession(sessionId: number): WorkoutSessionDetail {
  return withPersistTransaction((db) => {
    const session = loadSessionDetailFromDb(db, sessionId);
    if (!session) throw new Error("Session not found.");
    runExecute(
      db,
      `UPDATE workout_sessions SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`,
      [sessionId],
    );
    return loadSessionDetailFromDb(db, sessionId)!;
  });
}

export function getPreviousPerformance(
  memberId: number,
  exerciseId: number,
  beforeSessionId?: number,
): PreviousPerformance {
  return withPersist((db) => {
    let beforeDate: string | null = null;
    if (beforeSessionId) {
      const s = queryOne(db, `SELECT session_date FROM workout_sessions WHERE id = ?`, [beforeSessionId]);
      beforeDate = s ? String(s.session_date) : null;
    }

    const params: (number | string)[] = [memberId, exerciseId];
    let dateClause = "";
    if (beforeDate) {
      dateClause = `AND ws.session_date < ?`;
      params.push(beforeDate);
    }

    const prevSession = queryOne(
      db,
      `SELECT ws.id, ws.session_date FROM workout_sessions ws
       JOIN workout_session_exercises se ON se.session_id = ws.id
       WHERE ws.member_id = ? AND ws.status = 'completed' AND se.exercise_id = ?
       ${dateClause}
       ORDER BY ws.session_date DESC, ws.id DESC LIMIT 1`,
      params,
    );
    if (!prevSession) return null;

    const se = queryOne(
      db,
      `SELECT id FROM workout_session_exercises
       WHERE session_id = ? AND exercise_id = ? ORDER BY id LIMIT 1`,
      [Number(prevSession.id), exerciseId],
    );
    if (!se) return null;

    const sets = queryAll(
      db,
      `SELECT set_number, weight_kg, reps FROM workout_sets
       WHERE session_exercise_id = ? AND is_completed = 1
       ORDER BY set_number`,
      [Number(se.id)],
    ) as Record<string, unknown>[];

    return {
      session_date: String(prevSession.session_date),
      sets: sets.map((s) => ({
        set_number: Number(s.set_number),
        actual_weight: s.weight_kg != null ? Number(s.weight_kg) : null,
        actual_reps: s.reps != null ? Number(s.reps) : null,
      })),
    };
  });
}

export function listMemberWorkoutHistory(memberId: number): MemberSessionHistoryItem[] {
  return withPersist((db) => {
    const rows = queryAll(
      db,
      `SELECT ws.id, ws.session_date, ws.status, ws.started_at, ws.completed_at,
              ws.workout_type_label, t.name AS trainer_name, wpd.day_name
       FROM workout_sessions ws
       LEFT JOIN trainers t ON t.id = ws.trainer_id
       LEFT JOIN workout_program_days wpd ON wpd.id = ws.program_day_id
       WHERE ws.member_id = ?
       ORDER BY ws.session_date DESC, ws.id DESC
       LIMIT 100`,
      [memberId],
    ) as Record<string, unknown>[];

    return rows.map((row) => {
      let duration: number | null = null;
      if (row.started_at && row.completed_at) {
        const ms =
          new Date(String(row.completed_at)).getTime() - new Date(String(row.started_at)).getTime();
        if (ms > 0) duration = Math.round(ms / 60000);
      }
      return {
        id: Number(row.id),
        session_date: String(row.session_date),
        program_day_name: row.day_name
          ? String(row.day_name)
          : row.workout_type_label
            ? String(row.workout_type_label)
            : null,
        trainer_name: row.trainer_name ? String(row.trainer_name) : null,
        status: String(row.status) as SessionStatus,
        started_at: row.started_at ? String(row.started_at) : null,
        completed_at: row.completed_at ? String(row.completed_at) : null,
        duration_minutes: duration,
      };
    });
  });
}

export function listMemberTrainedExercises(
  memberId: number,
): { exercise_id: number; exercise_name: string }[] {
  return withPersist((db) =>
    queryAll(
      db,
      `SELECT DISTINCT se.exercise_id, se.exercise_name
       FROM workout_session_exercises se
       JOIN workout_sessions ws ON ws.id = se.session_id
       WHERE ws.member_id = ? AND ws.status = 'completed'
       ORDER BY se.exercise_name COLLATE NOCASE`,
      [memberId],
    ).map((row) => ({
      exercise_id: Number(row.exercise_id),
      exercise_name: String(row.exercise_name),
    })),
  );
}

export function getExerciseProgress(memberId: number, exerciseId: number): ProgressPoint[] {
  return withPersist((db) => {
    const sessions = queryAll(
      db,
      `SELECT ws.id, ws.session_date FROM workout_sessions ws
       JOIN workout_session_exercises se ON se.session_id = ws.id
       WHERE ws.member_id = ? AND ws.status = 'completed' AND se.exercise_id = ?
       ORDER BY ws.session_date ASC`,
      [memberId, exerciseId],
    ) as { id: number; session_date: string }[];

    const points: ProgressPoint[] = [];
    for (const session of sessions) {
      const se = queryOne(
        db,
        `SELECT id FROM workout_session_exercises WHERE session_id = ? AND exercise_id = ? LIMIT 1`,
        [session.id, exerciseId],
      );
      if (!se) continue;

      const sets = queryAll(
        db,
        `SELECT weight_kg, reps FROM workout_sets
         WHERE session_exercise_id = ? AND is_completed = 1`,
        [Number(se.id)],
      ) as { weight_kg: number | null; reps: number | null }[];

      let bestWeight = 0;
      let bestReps = 0;
      let volume = 0;
      for (const set of sets) {
        const w = Number(set.weight_kg ?? 0);
        const r = Number(set.reps ?? 0);
        if (w > bestWeight) bestWeight = w;
        if (r > bestReps) bestReps = r;
        volume += w * r;
      }
      points.push({
        session_date: session.session_date,
        best_weight: bestWeight,
        best_reps: bestReps,
        total_volume: volume,
      });
    }
    return points;
  });
}
