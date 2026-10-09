import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { Field, inputClassName } from "@/components/common/Field";
import { Modal } from "@/components/common/Modal";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  addWorkoutSet,
  cancelTrainingSession,
  completeTrainingSession,
  fetchPreviousPerformance,
  fetchWorkoutSession,
  removeWorkoutSet,
  saveExerciseNotes,
  saveSessionNotes,
  saveWorkoutSet,
} from "@/services/trainingApi";
import type {
  PreviousPerformance,
  SessionExerciseRow,
  WorkoutSessionDetail,
  WorkoutSetRow,
} from "@/types/training";
import { formatDate } from "@/utils/dates";

function sessionStatusVariant(
  status: WorkoutSessionDetail["status"],
): "neutral" | "warning" | "success" | "danger" {
  if (status === "in_progress") return "warning";
  if (status === "completed") return "success";
  if (status === "cancelled") return "danger";
  return "neutral";
}

function elapsedLabel(startedAt: string | null): string {
  if (!startedAt) return "—";
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) return "—";
  const mins = Math.max(0, Math.floor((Date.now() - start) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function WorkoutSessionPage() {
  const { id } = useParams();
  const sessionId = Number(id);
  const navigate = useNavigate();

  const [session, setSession] = useState<WorkoutSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prevByExercise, setPrevByExercise] = useState<Record<number, PreviousPerformance>>({});
  const [sessionNotes, setSessionNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [incompleteOpen, setIncompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [, setTick] = useState(0);

  const readOnly = session?.status === "completed" || session?.status === "cancelled";

  const load = useCallback(async () => {
    if (!Number.isFinite(sessionId)) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchWorkoutSession(sessionId);
      if (!detail) {
        setSession(null);
        setError("Session not found.");
        return;
      }
      setSession(detail);
      setSessionNotes(detail.notes ?? "");
      const prevEntries = await Promise.all(
        detail.exercises.map(async (ex) => {
          const prev = await fetchPreviousPerformance(detail.member_id, ex.exercise_id, detail.id);
          return [ex.exercise_id, prev] as const;
        }),
      );
      setPrevByExercise(Object.fromEntries(prevEntries));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load session.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!session || session.status !== "in_progress") return;
    const t = window.setInterval(() => setTick((n) => n + 1), 60000);
    return () => window.clearInterval(t);
  }, [session]);

  const incompleteCount = useMemo(() => {
    if (!session) return 0;
    return session.exercises.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => !s.is_completed).length,
      0,
    );
  }, [session]);

  function patchSet(exerciseId: number, setId: number, updated: WorkoutSetRow) {
    setSession((s) => {
      if (!s) return s;
      return {
        ...s,
        exercises: s.exercises.map((ex) =>
          ex.id !== exerciseId
            ? ex
            : { ...ex, sets: ex.sets.map((row) => (row.id === setId ? updated : row)) },
        ),
      };
    });
  }

  async function handleSetChange(
    exercise: SessionExerciseRow,
    set: WorkoutSetRow,
    patch: Partial<{
      actual_reps: number | null;
      actual_weight: number | null;
      rest_seconds: number | null;
      notes: string | null;
      is_completed: boolean;
    }>,
  ) {
    if (readOnly) return;
    try {
      const updated = await saveWorkoutSet({
        set_id: set.id,
        actual_reps: patch.actual_reps !== undefined ? patch.actual_reps : set.actual_reps,
        actual_weight:
          patch.actual_weight !== undefined ? patch.actual_weight : set.actual_weight,
        rest_seconds: patch.rest_seconds !== undefined ? patch.rest_seconds : set.rest_seconds,
        notes: patch.notes !== undefined ? patch.notes : set.notes,
        is_completed: patch.is_completed !== undefined ? patch.is_completed : Boolean(set.is_completed),
      });
      patchSet(exercise.id, set.id, updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save set.");
    }
  }

  async function handleAddSet(exercise: SessionExerciseRow) {
    if (readOnly) return;
    try {
      const row = await addWorkoutSet(exercise.id);
      setSession((s) => {
        if (!s) return s;
        return {
          ...s,
          exercises: s.exercises.map((ex) =>
            ex.id === exercise.id ? { ...ex, sets: [...ex.sets, row] } : ex,
          ),
        };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add set.");
    }
  }

  async function handleRemoveSet(exercise: SessionExerciseRow, setId: number) {
    if (readOnly) return;
    try {
      await removeWorkoutSet(setId);
      setSession((s) => {
        if (!s) return s;
        return {
          ...s,
          exercises: s.exercises.map((ex) =>
            ex.id === exercise.id ? { ...ex, sets: ex.sets.filter((row) => row.id !== setId) } : ex,
          ),
        };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to remove set.");
    }
  }

  async function handleExerciseNotes(exercise: SessionExerciseRow, notes: string) {
    if (readOnly) return;
    try {
      await saveExerciseNotes(exercise.id, notes);
      setSession((s) => {
        if (!s) return s;
        return {
          ...s,
          exercises: s.exercises.map((ex) => (ex.id === exercise.id ? { ...ex, notes } : ex)),
        };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save notes.");
    }
  }

  async function persistSessionNotes() {
    if (!session || readOnly) return;
    setSavingNotes(true);
    try {
      await saveSessionNotes(session.id, sessionNotes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save session notes.");
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleComplete(force = false) {
    if (!session) return;
    setCompleting(true);
    setError(null);
    try {
      const updated = await completeTrainingSession(session.id, force);
      setSession(updated);
      setIncompleteOpen(false);
      navigate("/private-training");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("INCOMPLETE_SETS")) {
        setIncompleteOpen(true);
      } else {
        setError(msg || "Unable to complete session.");
      }
    } finally {
      setCompleting(false);
    }
  }

  async function handleCancel() {
    if (!session) return;
    setCompleting(true);
    try {
      await cancelTrainingSession(session.id);
      setCancelOpen(false);
      navigate("/private-training");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to cancel session.");
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-shawish-muted">Loading workout session...</p>;
  }

  if (!session) {
    return (
      <EmptyState
        title="Session not found"
        description={error ?? "This workout session may have been removed."}
        action={
          <Link to="/private-training" className="text-shawish-orange hover:underline">
            Back to Private Training
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/private-training"
            className="mb-2 inline-flex items-center gap-1 text-sm text-shawish-muted hover:text-shawish-text"
          >
            <ArrowLeft className="size-4" />
            Private Training
          </Link>
          <h2 className="text-xl font-semibold">{session.member_name}</h2>
          <p className="text-sm text-shawish-muted">
            {formatDate(session.session_date)} · {session.program_day_name ?? session.workout_type_label ?? "Workout"}
          </p>
          <p className="text-sm text-shawish-muted">
            Trainer: {session.trainer_name ?? "—"} · Program: {session.program_name ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant={sessionStatusVariant(session.status)}>{session.status.replace("_", " ")}</StatusBadge>
          {session.status === "in_progress" ? (
            <span className="text-sm text-shawish-muted">Elapsed: {elapsedLabel(session.started_at)}</span>
          ) : null}
          {!readOnly ? (
            <>
              <Button variant="secondary" onClick={() => setCancelOpen(true)}>
                Cancel
              </Button>
              <Button loading={completing} onClick={() => void handleComplete(false)}>
                <Check className="size-4" />
                Complete Workout
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

      <div className="mb-6">
        <Field label="Session notes">
          <textarea
            className={inputClassName("min-h-16 resize-y")}
            value={sessionNotes}
            disabled={readOnly}
            onChange={(e) => setSessionNotes(e.target.value)}
            onBlur={() => void persistSessionNotes()}
          />
        </Field>
        {savingNotes ? <p className="mt-1 text-xs text-shawish-muted">Saving notes...</p> : null}
      </div>

      <div className="space-y-6">
        {session.exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            previous={prevByExercise[exercise.exercise_id] ?? null}
            readOnly={readOnly}
            onSetChange={(set, patch) => void handleSetChange(exercise, set, patch)}
            onAddSet={() => void handleAddSet(exercise)}
            onRemoveSet={(setId) => void handleRemoveSet(exercise, setId)}
            onNotesChange={(notes) => void handleExerciseNotes(exercise, notes)}
          />
        ))}
      </div>

      <Modal
        open={incompleteOpen}
        title="Incomplete sets"
        onClose={() => setIncompleteOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIncompleteOpen(false)}>
              Go back
            </Button>
            <Button variant="danger" loading={completing} onClick={() => void handleComplete(true)}>
              Complete anyway ({incompleteCount} incomplete)
            </Button>
          </>
        }
      >
        <p className="text-sm text-shawish-muted">
          Some sets are not marked complete. Finish logging or complete the workout anyway.
        </p>
      </Modal>

      <Modal
        open={cancelOpen}
        title="Cancel workout?"
        onClose={() => setCancelOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Keep training
            </Button>
            <Button variant="danger" loading={completing} onClick={() => void handleCancel()}>
              Cancel session
            </Button>
          </>
        }
      >
        <p className="text-sm text-shawish-muted">This will mark today&apos;s session as cancelled. Progress on sets is kept.</p>
      </Modal>
    </div>
  );
}

function ExerciseCard({
  exercise,
  previous,
  readOnly,
  onSetChange,
  onAddSet,
  onRemoveSet,
  onNotesChange,
}: {
  exercise: SessionExerciseRow;
  previous: PreviousPerformance | null;
  readOnly: boolean;
  onSetChange: (
    set: WorkoutSetRow,
    patch: Partial<{
      actual_reps: number | null;
      actual_weight: number | null;
      rest_seconds: number | null;
      notes: string | null;
      is_completed: boolean;
    }>,
  ) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: number) => void;
  onNotesChange: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(exercise.notes ?? "");

  useEffect(() => {
    setNotes(exercise.notes ?? "");
  }, [exercise.notes]);

  return (
    <div className="rounded-shawish-lg border border-shawish-border bg-shawish-surface p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{exercise.exercise_name}</h3>
          <p className="text-xs text-shawish-muted">
            Plan: {exercise.planned_sets ?? "—"} sets · {exercise.planned_reps ?? "—"} reps
            {exercise.planned_weight != null ? ` · ${exercise.planned_weight} kg` : ""}
          </p>
        </div>
        {!readOnly ? (
          <Button variant="secondary" className="!py-1 !text-xs" onClick={onAddSet}>
            <Plus className="size-3" />
            Add set
          </Button>
        ) : null}
      </div>

      {previous ? (
        <p className="mb-3 text-xs text-shawish-muted">
          Last time ({formatDate(previous.session_date)}):{" "}
          {previous.sets
            .map((s) => `${s.actual_weight ?? "—"}kg × ${s.actual_reps ?? "—"}`)
            .join(" · ")}
        </p>
      ) : (
        <p className="mb-3 text-xs text-shawish-muted">No previous performance recorded.</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-shawish-border text-xs uppercase text-shawish-muted">
              <th className="py-2 pr-2">Set</th>
              <th className="py-2 pr-2">Plan</th>
              <th className="py-2 pr-2">Weight (kg)</th>
              <th className="py-2 pr-2">Reps</th>
              <th className="py-2 pr-2">Rest (s)</th>
              <th className="py-2 pr-2">Done</th>
              {!readOnly ? <th className="py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {exercise.sets.map((set) => (
              <tr key={set.id} className="border-b border-shawish-border/50">
                <td className="py-2 pr-2">{set.set_number}</td>
                <td className="py-2 pr-2 text-shawish-muted">
                  {set.planned_weight ?? exercise.planned_weight ?? "—"} × {set.planned_reps ?? exercise.planned_reps ?? "—"}
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    className={inputClassName("!w-20 !py-1")}
                    disabled={readOnly}
                    value={set.actual_weight ?? ""}
                    onChange={(e) =>
                      onSetChange(set, {
                        actual_weight: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    onBlur={(e) =>
                      onSetChange(set, {
                        actual_weight: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    className={inputClassName("!w-16 !py-1")}
                    disabled={readOnly}
                    value={set.actual_reps ?? ""}
                    onChange={(e) =>
                      onSetChange(set, {
                        actual_reps: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    onBlur={(e) =>
                      onSetChange(set, {
                        actual_reps: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    className={inputClassName("!w-16 !py-1")}
                    disabled={readOnly}
                    value={set.rest_seconds ?? ""}
                    onChange={(e) =>
                      onSetChange(set, {
                        rest_seconds: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    onBlur={(e) =>
                      onSetChange(set, {
                        rest_seconds: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={Boolean(set.is_completed)}
                    onChange={(e) => onSetChange(set, { is_completed: e.target.checked })}
                  />
                </td>
                {!readOnly ? (
                  <td className="py-2">
                    <button
                      type="button"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => onRemoveSet(set.id)}
                      aria-label="Remove set"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3">
        <Field label="Exercise notes">
          <input
            className={inputClassName()}
            disabled={readOnly}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onNotesChange(notes)}
          />
        </Field>
      </div>
    </div>
  );
}
