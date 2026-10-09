import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { Field, inputClassName } from "@/components/common/Field";
import { Modal } from "@/components/common/Modal";
import { ProfilePhotoPicker } from "@/components/common/ProfilePhotoPicker";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MemberAvatar } from "@/components/members/MemberAvatar";
import { deletePendingProfilePhoto } from "@/services/profilePhotoApi";
import {
  createTrainer,
  fetchTrainers,
  setTrainerStatus,
  updateTrainer,
} from "@/services/trainersApi";
import type { Trainer } from "@/types/domain";

type TrainerForm = {
  name: string;
  phone: string;
  gender: "male" | "female";
  training_category: "men" | "women" | "both";
  notes: string;
};

const emptyForm: TrainerForm = {
  name: "",
  phone: "",
  gender: "male",
  training_category: "men",
  notes: "",
};

export function TrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TrainerForm>(emptyForm);
  const [savedPhotoPath, setSavedPhotoPath] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTrainers(await fetchTrainers());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setSavedPhotoPath(null);
    setPhotoPath(null);
    setPhotoPreviewUrl(null);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(trainer: Trainer) {
    setEditingId(trainer.id);
    setForm({
      name: trainer.name,
      phone: trainer.phone ?? "",
      gender: trainer.gender,
      training_category: trainer.training_category,
      notes: trainer.notes ?? "",
    });
    setSavedPhotoPath(trainer.photo_path);
    setPhotoPath(trainer.photo_path);
    setPhotoPreviewUrl(null);
    setError(null);
    setModalOpen(true);
  }

  async function closeModal() {
    if (photoPath && photoPath !== savedPhotoPath) {
      await deletePendingProfilePhoto(photoPath);
    }
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setSavedPhotoPath(null);
    setPhotoPath(null);
    setPhotoPreviewUrl(null);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const existing = trainers.find((t) => t.id === editingId);
        await updateTrainer({
          id: editingId,
          ...form,
          photo_path: photoPath,
          status: existing?.status ?? "active",
        });
      } else {
        await createTrainer({ ...form, photo_path: photoPath });
      }
      setSavedPhotoPath(photoPath);
      await closeModal();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save trainer.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(trainer: Trainer) {
    const next = trainer.status === "active" ? "inactive" : "active";
    await setTrainerStatus(trainer.id, next);
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Trainers"
        subtitle="Manage trainer roster, categories, and active status."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Trainer
          </Button>
        }
      />

      {loading ? (
        <p className="text-sm text-shawish-muted">Loading trainers...</p>
      ) : trainers.length === 0 ? (
        <EmptyState
          title="No trainers found"
          description="Add your first trainer to assign members during registration."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Add Trainer
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-shawish-lg border border-shawish-border">
          <table className="min-w-full text-sm">
            <thead className="bg-shawish-surface-elevated text-left text-xs uppercase tracking-wide text-shawish-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trainers.map((trainer) => (
                <tr key={trainer.id} className="border-t border-shawish-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <MemberAvatar name={trainer.name} photoPath={trainer.photo_path} size="sm" />
                      <div>
                        <p className="font-medium">{trainer.name}</p>
                        <p className="text-xs capitalize text-shawish-muted">{trainer.gender}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-shawish-muted">{trainer.phone || "—"}</td>
                  <td className="px-4 py-3 capitalize">{trainer.training_category}</td>
                  <td className="px-4 py-3">
                    <StatusBadge variant={trainer.status === "active" ? "success" : "neutral"}>
                      {trainer.status}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" className="!px-2" onClick={() => openEdit(trainer)}>
                        <Pencil className="size-4" />
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        className="!py-1.5 !text-xs"
                        onClick={() => void toggleStatus(trainer)}
                      >
                        {trainer.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editingId ? "Edit Trainer" : "Add Trainer"}
        onClose={() => void closeModal()}
        footer={
          <>
            <Button variant="secondary" onClick={() => void closeModal()}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void handleSave()}>
              Save Trainer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <ProfilePhotoPicker
            label="Trainer photo"
            folder="trainers"
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
          <Field label="Full name *">
            <input
              className={inputClassName()}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputClassName()}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Gender *">
              <select
                className={inputClassName()}
                value={form.gender}
                onChange={(e) =>
                  setForm((f) => ({ ...f, gender: e.target.value as "male" | "female" }))
                }
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
            <Field label="Trains *">
              <select
                className={inputClassName()}
                value={form.training_category}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    training_category: e.target.value as "men" | "women" | "both",
                  }))
                }
              >
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="both">Both</option>
              </select>
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              className={inputClassName("min-h-20 resize-y")}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Field>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>
      </Modal>
    </div>
  );
}
