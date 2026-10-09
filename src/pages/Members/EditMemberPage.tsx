import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/common/Button";
import { Field, inputClassName } from "@/components/common/Field";
import { Modal } from "@/components/common/Modal";
import { MemberPhotoField } from "@/components/members/MemberPhotoField";
import { deletePendingProfilePhoto } from "@/services/profilePhotoApi";
import {
  addMemberGoal,
  deleteMemberGoal,
  fetchMemberForEdit,
  updateMember,
  updateMemberGoal,
  type MemberForEdit,
  type MemberGoalRow,
} from "@/services/membersApi";
import { fetchPrograms } from "@/services/programsApi";
import { fetchTrainersForMember } from "@/services/trainersApi";
import type { Trainer, WorkoutProgramSummary } from "@/types/domain";
import { formatDate, toIsoDate } from "@/utils/dates";

export function EditMemberPage() {
  const { id } = useParams<{ id: string }>();
  const memberId = Number(id);
  const navigate = useNavigate();

  const [member, setMember] = useState<MemberForEdit | null>(null);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [programs, setPrograms] = useState<WorkoutProgramSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    gender: "male" as "male" | "female",
    trainer_id: "",
    program_id: "",
    program_start_date: toIsoDate(new Date()),
    goals_notes: "",
  });

  const [savedPhotoPath, setSavedPhotoPath] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const [newGoal, setNewGoal] = useState("");
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [editingGoalText, setEditingGoalText] = useState("");

  useEffect(() => {
    if (!Number.isFinite(memberId)) return;
    void (async () => {
      setLoading(true);
      try {
        const [data, programRows] = await Promise.all([
          fetchMemberForEdit(memberId),
          fetchPrograms(),
        ]);
        if (!data) {
          setError("Member not found.");
          return;
        }
        setMember(data);
        setPrograms(programRows);
        setSavedPhotoPath(data.photo_path);
        setPhotoPath(data.photo_path);
        setPhotoPreviewUrl(null);
        setForm({
          name: data.name,
          phone: data.phone,
          gender: data.gender,
          trainer_id: data.trainer_id ? String(data.trainer_id) : "",
          program_id: data.workout_program_id ? String(data.workout_program_id) : "",
          program_start_date: data.workout_program_start_date ?? toIsoDate(new Date()),
          goals_notes: data.goals_notes ?? "",
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load member.");
      } finally {
        setLoading(false);
      }
    })();
  }, [memberId]);

  useEffect(() => {
    void fetchTrainersForMember(form.gender).then(setTrainers);
  }, [form.gender]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.trainer_id || !form.program_id) {
      setError("Please complete all required fields.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMember({
        id: memberId,
        name: form.name,
        phone: form.phone,
        photo_path: photoPath,
        gender: form.gender,
        trainer_id: Number(form.trainer_id),
        program_id: Number(form.program_id),
        workout_program_start_date: form.program_start_date,
        goals_notes: form.goals_notes,
      });
      setMember(updated);
      navigate("/members");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save member.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddGoal() {
    if (!newGoal.trim() || !member) return;
    const row = await addMemberGoal(memberId, newGoal.trim());
    setMember({ ...member, goals: [row, ...member.goals] });
    setNewGoal("");
  }

  async function saveGoalEdit(goal: MemberGoalRow) {
    const row = await updateMemberGoal(goal.id, editingGoalText.trim(), goal.notes ?? undefined);
    if (!member) return;
    setMember({
      ...member,
      goals: member.goals.map((g) => (g.id === row.id ? row : g)),
    });
    setEditingGoalId(null);
  }

  async function removeGoal(goalId: number) {
    await deleteMemberGoal(goalId);
    if (!member) return;
    setMember({ ...member, goals: member.goals.filter((g) => g.id !== goalId) });
  }

  async function handleClose() {
    if (photoPath && photoPath !== savedPhotoPath) {
      await deletePendingProfilePhoto(photoPath);
    }
    navigate("/members");
  }

  if (loading) {
    return <p className="text-sm text-shawish-muted">Loading member...</p>;
  }

  if (!member) {
    return (
      <div>
        <p className="text-sm text-red-400">{error ?? "Member not found."}</p>
        <Link to="/members" className="mt-4 inline-block text-sm text-shawish-orange">
          Back to members
        </Link>
      </div>
    );
  }

  return (
    <Modal
      open
      title={`Edit Member · ${member.member_code}`}
      onClose={() => void handleClose()}
      className="max-w-3xl"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={() => void handleClose()}>
            Cancel
          </Button>
          <Button type="submit" form="edit-member-form" loading={saving}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="edit-member-form" className="space-y-6" onSubmit={(e) => void handleSave(e)}>
            <MemberPhotoField
              name={form.name}
              photoPath={photoPath}
              previewUrl={photoPreviewUrl}
              savedPhotoPath={savedPhotoPath}
              onChange={({ photoPath: nextPath, previewUrl }) => {
                setPhotoPath(nextPath);
                setPhotoPreviewUrl(previewUrl);
              }}
              onError={(message) => setError(message)}
            />

            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-shawish-orange">Personal Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name *">
              <input
                className={inputClassName()}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field label="Phone *">
              <input
                className={inputClassName()}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </Field>
            <Field label="Gender *">
              <select
                className={inputClassName()}
                value={form.gender}
                onChange={(e) =>
                  setForm((f) => ({ ...f, gender: e.target.value as "male" | "female", trainer_id: "" }))
                }
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-shawish-orange">Trainer & Program</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Trainer *">
              <select
                className={inputClassName()}
                value={form.trainer_id}
                onChange={(e) => setForm((f) => ({ ...f, trainer_id: e.target.value }))}
              >
                <option value="">Select trainer</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Workout program *">
              <select
                className={inputClassName()}
                value={form.program_id}
                onChange={(e) => setForm((f) => ({ ...f, program_id: e.target.value }))}
              >
                <option value="">Select program</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Program start date *">
              <input
                type="date"
                className={inputClassName()}
                value={form.program_start_date}
                onChange={(e) => setForm((f) => ({ ...f, program_start_date: e.target.value }))}
              />
            </Field>
          </div>
        </section>

        {member.current_subscription ? (
          <section className="rounded-shawish border border-shawish-border bg-shawish-bg/40 p-4 text-sm">
            <h3 className="mb-2 font-semibold text-shawish-orange">Current subscription</h3>
            <p>
              {member.current_subscription.label ?? `${member.current_subscription.duration_months} month(s)`}{" "}
              — {member.current_subscription.price} EGP
            </p>
            <p className="text-shawish-muted">
              {formatDate(member.current_subscription.start_date)} →{" "}
              {formatDate(member.current_subscription.end_date)}
            </p>
            <p className="mt-1 text-xs text-shawish-muted">
              Price and dates are historical; renewals are managed in a later phase.
            </p>
          </section>
        ) : null}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-shawish-orange">Goals</h3>
          <Field label="Summary notes">
            <textarea
              className={inputClassName("min-h-16 resize-y")}
              value={form.goals_notes}
              onChange={(e) => setForm((f) => ({ ...f, goals_notes: e.target.value }))}
            />
          </Field>
          <div className="flex gap-2">
            <input
              className={inputClassName("flex-1")}
              placeholder="Add a goal..."
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
            />
            <Button type="button" variant="secondary" onClick={() => void handleAddGoal()}>
              Add goal
            </Button>
          </div>
          <ul className="space-y-2">
            {member.goals.map((goal) => (
              <li
                key={goal.id}
                className="flex flex-wrap items-center gap-2 rounded-shawish border border-shawish-border px-3 py-2 text-sm"
              >
                {editingGoalId === goal.id ? (
                  <>
                    <input
                      className={inputClassName("flex-1")}
                      value={editingGoalText}
                      onChange={(e) => setEditingGoalText(e.target.value)}
                    />
                    <Button type="button" className="!py-1 !text-xs" onClick={() => void saveGoalEdit(goal)}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="!py-1 !text-xs"
                      onClick={() => setEditingGoalId(null)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1">{goal.goal}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      className="!py-1 !text-xs"
                      onClick={() => {
                        setEditingGoalId(goal.id);
                        setEditingGoalText(goal.goal);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="!py-1 !text-xs text-red-400"
                      onClick={() => void removeGoal(goal.id)}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>
    </Modal>
  );
}
