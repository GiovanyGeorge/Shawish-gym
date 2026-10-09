import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TodaysTrainingTab } from "@/pages/PrivateTraining/TodaysTrainingTab";
import { Archive, ChevronDown, ChevronUp, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { Field, inputClassName } from "@/components/common/Field";
import { Modal } from "@/components/common/Modal";
import { PageHeader } from "@/components/common/PageHeader";
import {
  EXERCISE_CATEGORIES,
  EXERCISE_DIFFICULTIES,
  EXERCISE_EQUIPMENT,
  MUSCLE_GROUPS,
} from "@/constants/domain";
import {
  archiveExercise,
  countExercises,
  createExercise,
  fetchExerciseFilterOptions,
  fetchExercisePicker,
  fetchExercises,
  updateExercise,
  type ExerciseFilterOptions,
} from "@/services/exercisesApi";
import {
  archiveProgram,
  createProgram,
  fetchProgram,
  fetchPrograms,
  updateProgram,
} from "@/services/programsApi";
import type { Exercise, WorkoutProgramSummary } from "@/types/domain";
import { cn } from "@/utils/cn";

type Tab = "today" | "programs" | "exercises";

const WEEKDAY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Rotation (no fixed weekday)" },
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

type ExerciseRowDraft = {
  exercise_id: string;
  planned_sets: string;
  target_reps: string;
  target_weight: string;
  notes: string;
};

type DayDraft = {
  day_name: string;
  description: string;
  weekday: string;
  exercises: ExerciseRowDraft[];
};

type ProgramFormState = {
  name: string;
  description: string;
  days: DayDraft[];
};

const emptyProgramForm = (): ProgramFormState => ({
  name: "",
  description: "",
  days: [{ day_name: "Day 1", description: "", weekday: "", exercises: [] }],
});

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const next = [...items];
  const target = index + direction;
  if (target < 0 || target >= next.length) return items;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function tabFromParam(value: string | null): Tab {
  if (value === "programs" || value === "exercises") return value;
  return "today";
}

export function PrivateTrainingPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => tabFromParam(searchParams.get("tab")));
  const [programs, setPrograms] = useState<WorkoutProgramSummary[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [pickerExercises, setPickerExercises] = useState<Exercise[]>([]);
  const [exerciseTotal, setExerciseTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");
  const [filterOptions, setFilterOptions] = useState<ExerciseFilterOptions>({
    muscle_groups: [...MUSCLE_GROUPS],
    equipment: [...EXERCISE_EQUIPMENT],
    categories: [...EXERCISE_CATEGORIES],
    difficulties: [...EXERCISE_DIFFICULTIES],
  });
  const PAGE_SIZE = 60;

  const [programModal, setProgramModal] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<number | null>(null);
  const [programForm, setProgramForm] = useState<ProgramFormState>(emptyProgramForm());

  const [exerciseModal, setExerciseModal] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [exerciseForm, setExerciseForm] = useState({
    name: "",
    muscle_group: MUSCLE_GROUPS[0] as string,
    equipment: "",
    category: "Strength",
    difficulty: "Beginner",
    instructions: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrograms = useCallback(async () => {
    setPrograms(await fetchPrograms());
  }, []);

  const exerciseQuery = useCallback(
    () => ({
      search: search || undefined,
      muscle_group: muscleFilter || undefined,
      equipment: equipmentFilter || undefined,
      category: categoryFilter || undefined,
      difficulty: difficultyFilter || undefined,
      include_archived: statusFilter === "all",
      archived_only: statusFilter === "archived",
    }),
    [search, muscleFilter, equipmentFilter, categoryFilter, difficultyFilter, statusFilter],
  );

  const loadExercises = useCallback(async () => {
    const filter = exerciseQuery();
    const [rows, total, options] = await Promise.all([
      fetchExercises({ ...filter, limit: PAGE_SIZE, offset: 0 }),
      countExercises(filter),
      fetchExerciseFilterOptions(),
    ]);
    setExercises(rows);
    setExerciseTotal(total);
    setFilterOptions(options);
  }, [exerciseQuery]);

  const loadMoreExercises = useCallback(async () => {
    const rows = await fetchExercises({
      ...exerciseQuery(),
      limit: PAGE_SIZE,
      offset: exercises.length,
    });
    setExercises((prev) => [...prev, ...rows]);
  }, [exerciseQuery, exercises.length]);

  const load = useCallback(async () => {
    if (tab === "today") return;
    setLoading(true);
    try {
      if (tab === "programs") await loadPrograms();
      else await loadExercises();
    } finally {
      setLoading(false);
    }
  }, [tab, loadPrograms, loadExercises]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreateProgram() {
    setEditingProgramId(null);
    setProgramForm(emptyProgramForm());
    setError(null);
    setProgramModal(true);
    void fetchExercisePicker().then(setPickerExercises);
  }

  async function openEditProgram(id: number) {
    setError(null);
    const detail = await fetchProgram(id);
    if (!detail) {
      setError("Program not found.");
      return;
    }
    setEditingProgramId(id);
    setProgramForm({
      name: detail.name,
      description: detail.description ?? "",
      days: detail.days.map((day) => ({
        day_name: day.day_name,
        description: day.description ?? "",
        weekday: day.weekday != null ? String(day.weekday) : "",
        exercises: day.exercises.map((ex) => ({
          exercise_id: String(ex.exercise_id),
          planned_sets: String(ex.planned_sets),
          target_reps: ex.target_reps,
          target_weight: ex.target_weight != null ? String(ex.target_weight) : "",
          notes: ex.notes ?? "",
        })),
      })),
    });
    setProgramModal(true);
    void fetchExercisePicker().then(setPickerExercises);
  }

  function buildProgramPayload(form: ProgramFormState) {
    return {
      name: form.name,
      description: form.description,
      days: form.days.map((day, dayIndex) => ({
        day_name: day.day_name,
        description: day.description,
        weekday: day.weekday === "" ? null : Number(day.weekday),
        sort_order: dayIndex,
        exercises: day.exercises
          .filter((e) => e.exercise_id)
          .map((e, exIndex) => ({
            exercise_id: Number(e.exercise_id),
            planned_sets: Number(e.planned_sets) || 0,
            target_reps: e.target_reps,
            target_weight: e.target_weight ? Number(e.target_weight) : null,
            notes: e.notes || undefined,
            sort_order: exIndex,
          })),
      })),
    };
  }

  async function handleSaveProgram() {
    if (!programForm.name.trim()) {
      setError("Program name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = buildProgramPayload(programForm);
      if (editingProgramId) {
        await updateProgram(editingProgramId, payload);
      } else {
        await createProgram(payload);
      }
      setProgramModal(false);
      setProgramForm(emptyProgramForm());
      setEditingProgramId(null);
      await loadPrograms();
      setTab("programs");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save program.");
    } finally {
      setSaving(false);
    }
  }

  function openCreateExercise() {
    setEditingExerciseId(null);
    setExerciseForm({
      name: "",
      muscle_group: MUSCLE_GROUPS[0],
      equipment: "",
      category: "Strength",
      difficulty: "Beginner",
      instructions: "",
    });
    setError(null);
    setExerciseModal(true);
  }

  function openEditExercise(exercise: Exercise) {
    setEditingExerciseId(exercise.id);
    setExerciseForm({
      name: exercise.name,
      muscle_group: exercise.muscle_group,
      equipment: exercise.equipment ?? "",
      category: exercise.category ?? "Strength",
      difficulty: exercise.difficulty ?? "Beginner",
      instructions: exercise.instructions ?? "",
    });
    setError(null);
    setExerciseModal(true);
  }

  async function handleSaveExercise() {
    if (!exerciseForm.name.trim()) {
      setError("Exercise name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingExerciseId) {
        await updateExercise({ id: editingExerciseId, ...exerciseForm });
      } else {
        await createExercise(exerciseForm);
      }
      setExerciseModal(false);
      await loadExercises();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save exercise.");
    } finally {
      setSaving(false);
    }
  }

  const equipmentOptions = filterOptions.equipment.length
    ? filterOptions.equipment
    : buildEquipmentOptions(exercises);

  return (
    <div>
      <PageHeader
        title="Private Training"
        subtitle="Today's training sessions, workout programs, and the exercise library."
        actions={
          tab === "today" ? null : tab === "programs" ? (
            <Button onClick={openCreateProgram}>
              <Plus className="size-4" />
              Create Program
            </Button>
          ) : (
            <Button onClick={openCreateExercise}>
              <Plus className="size-4" />
              Add Exercise
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["today", "Today's Training"],
            ["programs", "Workout Programs"],
            ["exercises", "Exercise Library"],
          ] as const
        ).map(([item, label]) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === item
                ? "bg-shawish-orange text-white"
                : "bg-shawish-surface-elevated text-shawish-muted hover:text-shawish-text",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "today" ? <TodaysTrainingTab /> : null}

      {tab === "exercises" ? (
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-shawish border border-shawish-border bg-shawish-surface px-3 py-2">
            <Search className="size-4 text-shawish-muted" />
            <input
              className="w-full bg-transparent text-sm focus:outline-none"
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className={inputClassName("w-auto min-w-[150px]")}
            value={muscleFilter}
            onChange={(e) => setMuscleFilter(e.target.value)}
          >
            <option value="">All muscle groups</option>
            {(filterOptions.muscle_groups.length ? filterOptions.muscle_groups : MUSCLE_GROUPS).map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
          <select
            className={inputClassName("w-auto min-w-[150px]")}
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value)}
          >
            <option value="">All equipment</option>
            {equipmentOptions.map((eq) => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </select>
          <select
            className={inputClassName("w-auto min-w-[140px]")}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All categories</option>
            {(filterOptions.categories.length ? filterOptions.categories : EXERCISE_CATEGORIES).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className={inputClassName("w-auto min-w-[140px]")}
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
          >
            <option value="">All difficulty</option>
            {(filterOptions.difficulties.length ? filterOptions.difficulties : EXERCISE_DIFFICULTIES).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            className={inputClassName("w-auto min-w-[130px]")}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "active" | "archived" | "all")}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>
      ) : null}

      {tab === "today" ? null : loading ? (
        <p className="text-sm text-shawish-muted">Loading...</p>
      ) : tab === "programs" ? (
        programs.length === 0 ? (
          <EmptyState
            title="No workout programs yet"
            description="Create a program with training days and planned exercises for member registration."
            action={
              <Button onClick={openCreateProgram}>
                <Plus className="size-4" />
                Create Program
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-shawish-lg border border-shawish-border">
            <table className="min-w-full text-sm">
              <thead className="bg-shawish-surface-elevated text-left text-xs uppercase tracking-wide text-shawish-muted">
                <tr>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((program) => (
                  <tr key={program.id} className="border-t border-shawish-border">
                    <td className="px-4 py-3">
                      <p className="font-medium">{program.name}</p>
                      {program.description ? (
                        <p className="text-xs text-shawish-muted">{program.description}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{Number(program.day_count) || 0}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          className="!px-2"
                          onClick={() => void openEditProgram(program.id)}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          className="!px-2"
                          onClick={() => void archiveProgram(program.id).then(loadPrograms)}
                        >
                          <Archive className="size-4" />
                          Archive
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : exercises.length === 0 ? (
        <EmptyState
          title="No exercises found"
          description="Build your exercise library before creating workout programs."
          action={
            <Button onClick={openCreateExercise}>
              <Plus className="size-4" />
              Add Exercise
            </Button>
          }
        />
      ) : (
        <div>
          <p className="mb-2 text-xs text-shawish-muted">
            Showing {exercises.length} of {exerciseTotal} exercises
          </p>
          <div className="overflow-hidden rounded-shawish-lg border border-shawish-border">
            <table className="min-w-full text-sm">
              <thead className="bg-shawish-surface-elevated text-left text-xs uppercase tracking-wide text-shawish-muted">
                <tr>
                  <th className="px-4 py-3">Exercise</th>
                  <th className="px-4 py-3">Muscle Group</th>
                  <th className="px-4 py-3">Equipment</th>
                  <th className="hidden px-4 py-3 md:table-cell">Difficulty</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exercises.map((exercise) => (
                  <tr key={exercise.id} className="border-t border-shawish-border">
                    <td className="px-4 py-3">
                      <p className="font-medium">{exercise.name}</p>
                      <p className="text-[11px] text-shawish-muted">
                        {exercise.source === "system" ? "System" : "Custom"}
                        {exercise.category ? ` · ${exercise.category}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">{exercise.muscle_group}</td>
                    <td className="px-4 py-3 text-shawish-muted">{exercise.equipment || "—"}</td>
                    <td className="hidden px-4 py-3 md:table-cell">{exercise.difficulty || "—"}</td>
                    <td className="px-4 py-3">{exercise.is_archived ? "Archived" : "Active"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" className="!px-2" onClick={() => openEditExercise(exercise)}>
                          Edit
                        </Button>
                        {!exercise.is_archived ? (
                          <Button
                            variant="ghost"
                            className="!px-2"
                            onClick={() => void archiveExercise(exercise.id).then(loadExercises)}
                          >
                            Archive
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {exercises.length < exerciseTotal ? (
            <div className="mt-3 flex justify-center">
              <Button variant="secondary" onClick={() => void loadMoreExercises()}>
                Load more
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <Modal
        open={programModal}
        title={editingProgramId ? "Edit Workout Program" : "Create Workout Program"}
        onClose={() => setProgramModal(false)}
        className="max-w-3xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setProgramModal(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void handleSaveProgram()}>
              Save Program
            </Button>
          </>
        }
      >
        <ProgramBuilder
          exercises={pickerExercises.length ? pickerExercises : exercises}
          form={programForm}
          setForm={setProgramForm}
          error={error}
        />
      </Modal>

      <Modal
        open={exerciseModal}
        title={editingExerciseId ? "Edit Exercise" : "Add Exercise"}
        onClose={() => setExerciseModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setExerciseModal(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void handleSaveExercise()}>
              Save Exercise
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name *">
            <input
              className={inputClassName()}
              value={exerciseForm.name}
              onChange={(e) => setExerciseForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Muscle group *">
              <select
                className={inputClassName()}
                value={exerciseForm.muscle_group}
                onChange={(e) => setExerciseForm((f) => ({ ...f, muscle_group: e.target.value }))}
              >
                {MUSCLE_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Equipment">
              <select
                className={inputClassName()}
                value={exerciseForm.equipment}
                onChange={(e) => setExerciseForm((f) => ({ ...f, equipment: e.target.value }))}
              >
                <option value="">Select equipment</option>
                {EXERCISE_EQUIPMENT.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <select
                className={inputClassName()}
                value={exerciseForm.category}
                onChange={(e) => setExerciseForm((f) => ({ ...f, category: e.target.value }))}
              >
                {EXERCISE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Difficulty">
              <select
                className={inputClassName()}
                value={exerciseForm.difficulty}
                onChange={(e) => setExerciseForm((f) => ({ ...f, difficulty: e.target.value }))}
              >
                {EXERCISE_DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Instructions">
            <textarea
              className={inputClassName("min-h-20 resize-y")}
              value={exerciseForm.instructions}
              onChange={(e) => setExerciseForm((f) => ({ ...f, instructions: e.target.value }))}
            />
          </Field>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>
      </Modal>
    </div>
  );
}

function buildEquipmentOptions(exercises: Exercise[]): string[] {
  const set = new Set<string>();
  for (const ex of exercises) {
    if (ex.equipment?.trim()) set.add(ex.equipment.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function ProgramBuilder({
  exercises,
  form,
  setForm,
  error,
}: {
  exercises: Exercise[];
  form: ProgramFormState;
  setForm: React.Dispatch<React.SetStateAction<ProgramFormState>>;
  error: string | null;
}) {
  return (
    <div className="space-y-4">
      <Field label="Program name *">
        <input
          className={inputClassName()}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </Field>
      <Field label="Description">
        <textarea
          className={inputClassName("min-h-20 resize-y")}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </Field>

      {form.days.map((day, dayIndex) => (
        <div
          key={dayIndex}
          className="rounded-shawish border border-shawish-border bg-shawish-bg/40 p-4"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-shawish-muted">
              Training day {dayIndex + 1}
            </p>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                className="!px-2 !py-1"
                disabled={dayIndex === 0}
                onClick={() =>
                  setForm((f) => ({ ...f, days: moveItem(f.days, dayIndex, -1) }))
                }
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="!px-2 !py-1"
                disabled={dayIndex === form.days.length - 1}
                onClick={() =>
                  setForm((f) => ({ ...f, days: moveItem(f.days, dayIndex, 1) }))
                }
              >
                <ChevronDown className="size-4" />
              </Button>
              {form.days.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="!px-2 !py-1 text-red-400"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      days: f.days.filter((_, i) => i !== dayIndex),
                    }))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          </div>
          <Field label="Day name *">
            <input
              className={inputClassName()}
              value={day.day_name}
              onChange={(e) =>
                setForm((f) => {
                  const days = [...f.days];
                  days[dayIndex] = { ...days[dayIndex], day_name: e.target.value };
                  return { ...f, days };
                })
              }
            />
          </Field>
          <Field label="Day description">
            <input
              className={inputClassName()}
              value={day.description}
              onChange={(e) =>
                setForm((f) => {
                  const days = [...f.days];
                  days[dayIndex] = { ...days[dayIndex], description: e.target.value };
                  return { ...f, days };
                })
              }
            />
          </Field>
          <Field label="Weekday schedule">
            <select
              className={inputClassName()}
              value={day.weekday}
              onChange={(e) =>
                setForm((f) => {
                  const days = [...f.days];
                  days[dayIndex] = { ...days[dayIndex], weekday: e.target.value };
                  return { ...f, days };
                })
              }
            >
              {WEEKDAY_OPTIONS.map((opt) => (
                <option key={opt.value || "rotation"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="mt-3 space-y-2">
            {day.exercises.map((row, exIndex) => (
              <div key={exIndex} className="space-y-2 rounded border border-shawish-border/60 p-2">
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="!px-2 !py-1"
                    disabled={exIndex === 0}
                    onClick={() =>
                      setForm((f) => {
                        const days = [...f.days];
                        days[dayIndex] = {
                          ...days[dayIndex],
                          exercises: moveItem(days[dayIndex].exercises, exIndex, -1),
                        };
                        return { ...f, days };
                      })
                    }
                  >
                    <ChevronUp className="size-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="!px-2 !py-1"
                    disabled={exIndex === day.exercises.length - 1}
                    onClick={() =>
                      setForm((f) => {
                        const days = [...f.days];
                        days[dayIndex] = {
                          ...days[dayIndex],
                          exercises: moveItem(days[dayIndex].exercises, exIndex, 1),
                        };
                        return { ...f, days };
                      })
                    }
                  >
                    <ChevronDown className="size-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="!px-2 !py-1 text-red-400"
                    onClick={() =>
                      setForm((f) => {
                        const days = [...f.days];
                        days[dayIndex] = {
                          ...days[dayIndex],
                          exercises: days[dayIndex].exercises.filter((_, i) => i !== exIndex),
                        };
                        return { ...f, days };
                      })
                    }
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
                <select
                  className={inputClassName()}
                  value={row.exercise_id}
                  onChange={(e) =>
                    setForm((f) => {
                      const days = [...f.days];
                      const exercisesRows = [...days[dayIndex].exercises];
                      exercisesRows[exIndex] = { ...exercisesRows[exIndex], exercise_id: e.target.value };
                      days[dayIndex] = { ...days[dayIndex], exercises: exercisesRows };
                      return { ...f, days };
                    })
                  }
                >
                  <option value="">Select exercise</option>
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </select>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    className={inputClassName()}
                    placeholder="Sets"
                    value={row.planned_sets}
                    onChange={(e) =>
                      setForm((f) => {
                        const days = [...f.days];
                        const exercisesRows = [...days[dayIndex].exercises];
                        exercisesRows[exIndex] = { ...exercisesRows[exIndex], planned_sets: e.target.value };
                        days[dayIndex] = { ...days[dayIndex], exercises: exercisesRows };
                        return { ...f, days };
                      })
                    }
                  />
                  <input
                    className={inputClassName()}
                    placeholder="Reps"
                    value={row.target_reps}
                    onChange={(e) =>
                      setForm((f) => {
                        const days = [...f.days];
                        const exercisesRows = [...days[dayIndex].exercises];
                        exercisesRows[exIndex] = { ...exercisesRows[exIndex], target_reps: e.target.value };
                        days[dayIndex] = { ...days[dayIndex], exercises: exercisesRows };
                        return { ...f, days };
                      })
                    }
                  />
                  <input
                    className={inputClassName()}
                    placeholder="Weight (optional)"
                    value={row.target_weight}
                    onChange={(e) =>
                      setForm((f) => {
                        const days = [...f.days];
                        const exercisesRows = [...days[dayIndex].exercises];
                        exercisesRows[exIndex] = { ...exercisesRows[exIndex], target_weight: e.target.value };
                        days[dayIndex] = { ...days[dayIndex], exercises: exercisesRows };
                        return { ...f, days };
                      })
                    }
                  />
                </div>
                <input
                  className={inputClassName()}
                  placeholder="Notes"
                  value={row.notes}
                  onChange={(e) =>
                    setForm((f) => {
                      const days = [...f.days];
                      const exercisesRows = [...days[dayIndex].exercises];
                      exercisesRows[exIndex] = { ...exercisesRows[exIndex], notes: e.target.value };
                      days[dayIndex] = { ...days[dayIndex], exercises: exercisesRows };
                      return { ...f, days };
                    })
                  }
                />
              </div>
            ))}
            <Button
              variant="secondary"
              className="!py-1.5 !text-xs"
              type="button"
              onClick={() =>
                setForm((f) => {
                  const days = [...f.days];
                  days[dayIndex] = {
                    ...days[dayIndex],
                    exercises: [
                      ...days[dayIndex].exercises,
                      {
                        exercise_id: "",
                        planned_sets: "3",
                        target_reps: "10",
                        target_weight: "",
                        notes: "",
                      },
                    ],
                  };
                  return { ...f, days };
                })
              }
            >
              + Add Exercise
            </Button>
          </div>
        </div>
      ))}

      <Button
        variant="secondary"
        type="button"
        onClick={() =>
          setForm((f) => ({
            ...f,
            days: [
              ...f.days,
              { day_name: `Day ${f.days.length + 1}`, description: "", weekday: "", exercises: [] },
            ],
          }))
        }
      >
        + Add Training Day
      </Button>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
