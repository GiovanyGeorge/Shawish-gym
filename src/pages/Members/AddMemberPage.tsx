import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/common/Button";
import { Field, inputClassName } from "@/components/common/Field";
import { Modal } from "@/components/common/Modal";
import { MemberPhotoField } from "@/components/members/MemberPhotoField";
import { deletePendingProfilePhoto } from "@/services/profilePhotoApi";
import { createMember } from "@/services/membersApi";
import { fetchPrograms } from "@/services/programsApi";
import { fetchSubscriptionPrices } from "@/services/pricesApi";
import { fetchTrainersForMember } from "@/services/trainersApi";
import type { SubscriptionPrice, Trainer, WorkoutProgramSummary } from "@/types/domain";
import { addMonthsIso, toIsoDate } from "@/utils/dates";

export function AddMemberPage() {
  const navigate = useNavigate();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [programs, setPrograms] = useState<WorkoutProgramSummary[]>([]);
  const [prices, setPrices] = useState<SubscriptionPrice[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    gender: "male" as "male" | "female",
    trainer_id: "",
    program_id: "",
    duration_months: "",
    start_date: toIsoDate(new Date()),
    goals_notes: "",
  });

  useEffect(() => {
    void (async () => {
      const [priceRows, programRows] = await Promise.all([
        fetchSubscriptionPrices(),
        fetchPrograms(),
      ]);
      setPrices(priceRows);
      setPrograms(programRows);
      if (priceRows[0]) {
        setForm((f) => ({ ...f, duration_months: String(priceRows[0].duration_months) }));
      }
    })();
  }, []);

  useEffect(() => {
    void fetchTrainersForMember(form.gender).then(setTrainers);
  }, [form.gender]);

  const selectedPrice = useMemo(
    () => prices.find((p) => p.duration_months === Number(form.duration_months)),
    [prices, form.duration_months],
  );

  const endDate = useMemo(() => {
    if (!form.start_date || !form.duration_months) return "";
    return addMonthsIso(form.start_date, Number(form.duration_months));
  }, [form.start_date, form.duration_months]);

  async function handleClose() {
    if (photoPath) {
      await deletePendingProfilePhoto(photoPath);
    }
    navigate("/members");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.trainer_id || !form.program_id) {
      setError("Please complete all required fields.");
      return;
    }
    if (!selectedPrice) {
      setError("Select a valid subscription duration.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createMember({
        name: form.name,
        phone: form.phone,
        photo_path: photoPath,
        gender: form.gender,
        trainer_id: Number(form.trainer_id),
        program_id: Number(form.program_id),
        goals_notes: form.goals_notes,
        duration_months: selectedPrice.duration_months,
        start_date: form.start_date,
        end_date: endDate,
        price: selectedPrice.price,
      });
      navigate("/members");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save member.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title="Add Member"
      onClose={() => void handleClose()}
      className="max-w-3xl"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={() => void handleClose()}>
            Cancel
          </Button>
          <Button type="submit" form="add-member-form" loading={saving}>
            Save Member
          </Button>
        </>
      }
    >
      <form id="add-member-form" className="space-y-6" onSubmit={(e) => void handleSubmit(e)}>
        <MemberPhotoField
          name={form.name}
          photoPath={photoPath}
          previewUrl={photoPreviewUrl}
          savedPhotoPath={null}
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
          </div>
          <Field label="Gender">
            <select
              className={inputClassName()}
              value={form.gender}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  gender: e.target.value as "male" | "female",
                  trainer_id: "",
                }))
              }
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>
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
            <Field label="Workout Program *">
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
          </div>
          <Field label="Goals / Notes">
            <textarea
              className={inputClassName("min-h-20 resize-y")}
              value={form.goals_notes}
              onChange={(e) => setForm((f) => ({ ...f, goals_notes: e.target.value }))}
            />
          </Field>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-shawish-orange">Subscription</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Duration *">
              <select
                className={inputClassName()}
                value={form.duration_months}
                onChange={(e) => setForm((f) => ({ ...f, duration_months: e.target.value }))}
              >
                {prices.map((price) => (
                  <option key={price.id} value={price.duration_months}>
                    {price.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Start date *">
              <input
                type="date"
                className={inputClassName()}
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              />
            </Field>
            <Field label="End date">
              <input className={inputClassName()} value={endDate} readOnly />
            </Field>
          </div>
          <div className="rounded-shawish border border-shawish-border bg-shawish-bg px-4 py-3 text-sm">
            Price:{" "}
            <span className="font-semibold text-shawish-orange">
              EGP {selectedPrice?.price.toLocaleString() ?? "—"}
            </span>
          </div>
        </section>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>
    </Modal>
  );
}
