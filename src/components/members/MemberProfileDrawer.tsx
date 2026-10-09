import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pause, Pencil, Play, Printer, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Field, inputClassName } from "@/components/common/Field";
import { Modal } from "@/components/common/Modal";
import { QrCode } from "@/components/common/QrCode";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MemberAvatar } from "@/components/members/MemberAvatar";
import {
  fetchMemberProfile,
  pauseMemberSubscription,
  renewMemberSubscription,
  resumeMember,
} from "@/services/memberProfileApi";
import { fetchSubscriptionPrices } from "@/services/pricesApi";
import { resolveProfilePhotoUrl } from "@/services/profilePhotoApi";
import { useAppSettingsStore } from "@/stores/appSettingsStore";
import type { MemberProfile, SubscriptionPrice } from "@/types/domain";
import { formatDate, subscriptionEndIso, toIsoDate } from "@/utils/dates";
import { memberStatusLabel, memberStatusVariant } from "@/utils/memberStatus";
import { printMemberCard } from "@/utils/printMemberCard";

type Props = {
  memberId: number;
  onClose: () => void;
  onChanged: () => void;
};

export function MemberProfileDrawer({ memberId, onClose, onChanged }: Props) {
  const navigate = useNavigate();
  const gymName = useAppSettingsStore((s) => s.settings?.gym_name ?? "SHAWISH");
  const gymLogo = useAppSettingsStore((s) => s.settings?.gym_logo ?? "");
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renewOpen, setRenewOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prices, setPrices] = useState<SubscriptionPrice[]>([]);
  const [renewForm, setRenewForm] = useState({ duration_months: "", start_date: toIsoDate(new Date()) });
  const [pauseForm, setPauseForm] = useState({
    start_date: toIsoDate(new Date()),
    end_date: toIsoDate(new Date()),
    reason: "",
  });

  useEffect(() => {
    let cancelled = false;
    void fetchMemberProfile(memberId)
      .then((row) => {
        if (!cancelled) setProfile(row);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load profile.");
      });
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  useEffect(() => {
    void fetchSubscriptionPrices().then((rows) => {
      setPrices(rows);
      if (rows[0]) setRenewForm((f) => ({ ...f, duration_months: String(rows[0].duration_months) }));
    });
  }, []);

  const selectedPrice = useMemo(
    () => prices.find((p) => p.duration_months === Number(renewForm.duration_months)),
    [prices, renewForm.duration_months],
  );
  const renewEnd = useMemo(() => {
    if (!renewForm.start_date || !renewForm.duration_months) return "";
    return subscriptionEndIso(renewForm.start_date, Number(renewForm.duration_months));
  }, [renewForm]);

  async function reload() {
    const row = await fetchMemberProfile(memberId);
    setProfile(row);
    onChanged();
  }

  async function handlePrint() {
    if (!profile) return;
    const photo = profile.photo_path ? (await resolveProfilePhotoUrl(profile.photo_path)).url : null;
    const logo = gymLogo ? (await resolveProfilePhotoUrl(gymLogo)).url : null;
    printMemberCard({ profile, gymName, photoUrl: photo, logoUrl: logo });
  }

  return (
    <aside className="flex h-full w-[min(380px,42vw)] shrink-0 flex-col overflow-hidden rounded-shawish-lg border border-shawish-border bg-shawish-surface">
      <div className="flex items-center justify-between border-b border-shawish-border px-4 py-3">
        <h3 className="text-sm font-semibold">Member Profile</h3>
        <button type="button" className="rounded-shawish p-1 text-shawish-muted hover:bg-shawish-bg" onClick={onClose}>
          <X className="size-4" />
        </button>
      </div>
      <div className="shawish-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {!profile ? (
          <p className="text-sm text-shawish-muted">Loading profile...</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <MemberAvatar name={profile.name} photoPath={profile.photo_path} size="xl" />
              <p className="mt-3 text-lg font-semibold">{profile.name}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-shawish-muted">Member ID</p>
              <p className="font-mono text-base tracking-wide text-shawish-orange">{profile.member_code}</p>
              <div className="mt-2">
                <StatusBadge variant={memberStatusVariant(profile.display_status)}>
                  {memberStatusLabel(profile.display_status)}
                </StatusBadge>
              </div>
            </div>

            <div className="flex justify-center">
              <QrCode value={profile.member_code} size={132} />
            </div>

            <dl className="space-y-2 text-sm">
              <Row label="Phone" value={profile.phone} />
              <Row label="Gender" value={profile.gender} />
              <Row label="Trainer" value={profile.trainer_name ?? "—"} />
              <Row label="Workout Program" value={profile.program_name ?? "—"} />
              <Row label="Subscription" value={profile.current_subscription?.label ?? "—"} />
              <Row label="Start date" value={formatDate(profile.current_subscription?.start_date)} />
              <Row label="End date" value={formatDate(profile.current_subscription?.end_date)} />
              <Row label="Goals" value={profile.goals_notes?.trim() || "—"} />
              <Row
                label="Attendance"
                value={`${profile.attendance_summary.present} present · ${profile.attendance_summary.rate}%`}
              />
            </dl>

            <div className="grid gap-2">
              <Button variant="secondary" onClick={() => navigate(`/members/${profile.id}/edit`)}>
                <Pencil className="size-4" />
                Edit Member
              </Button>
              <Button variant="secondary" onClick={() => setRenewOpen(true)}>
                <RefreshCw className="size-4" />
                Renew Subscription
              </Button>
              {profile.member_status === "paused" ? (
                <Button variant="secondary" loading={saving} onClick={() => void (async () => {
                  setSaving(true);
                  try {
                    await resumeMember(profile.id);
                    await reload();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Unable to resume.");
                  } finally {
                    setSaving(false);
                  }
                })()}>
                  <Play className="size-4" />
                  Resume Subscription
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setPauseOpen(true)}>
                  <Pause className="size-4" />
                  Pause Subscription
                </Button>
              )}
              <Button onClick={() => void handlePrint()}>
                <Printer className="size-4" />
                Print Member Card
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={renewOpen}
        title="Renew subscription"
        onClose={() => setRenewOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenewOpen(false)}>Cancel</Button>
            <Button
              loading={saving}
              disabled={!selectedPrice}
              onClick={() =>
                void (async () => {
                  if (!selectedPrice) return;
                  setSaving(true);
                  try {
                    await renewMemberSubscription({
                      member_id: memberId,
                      duration_months: selectedPrice.duration_months,
                      start_date: renewForm.start_date,
                    });
                    setRenewOpen(false);
                    await reload();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Unable to renew.");
                  } finally {
                    setSaving(false);
                  }
                })()
              }
            >
              Confirm
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Duration">
            <select
              className={inputClassName()}
              value={renewForm.duration_months}
              onChange={(e) => setRenewForm((f) => ({ ...f, duration_months: e.target.value }))}
            >
              {prices.map((p) => (
                <option key={p.id} value={p.duration_months}>
                  {p.label} · {p.price} EGP
                </option>
              ))}
            </select>
          </Field>
          <Field label="Start date">
            <input
              type="date"
              className={inputClassName()}
              value={renewForm.start_date}
              onChange={(e) => setRenewForm((f) => ({ ...f, start_date: e.target.value }))}
            />
          </Field>
          <p className="text-xs text-shawish-muted">Ends {formatDate(renewEnd)}</p>
        </div>
      </Modal>

      <Modal
        open={pauseOpen}
        title="Pause subscription"
        onClose={() => setPauseOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPauseOpen(false)}>Cancel</Button>
            <Button
              loading={saving}
              onClick={() =>
                void (async () => {
                  setSaving(true);
                  try {
                    await pauseMemberSubscription({
                      member_id: memberId,
                      start_date: pauseForm.start_date,
                      end_date: pauseForm.end_date,
                      reason: pauseForm.reason,
                    });
                    setPauseOpen(false);
                    await reload();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Unable to pause.");
                  } finally {
                    setSaving(false);
                  }
                })()
              }
            >
              Pause
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Start">
            <input type="date" className={inputClassName()} value={pauseForm.start_date} onChange={(e) => setPauseForm((f) => ({ ...f, start_date: e.target.value }))} />
          </Field>
          <Field label="End">
            <input type="date" className={inputClassName()} value={pauseForm.end_date} onChange={(e) => setPauseForm((f) => ({ ...f, end_date: e.target.value }))} />
          </Field>
          <Field label="Reason">
            <input className={inputClassName()} value={pauseForm.reason} onChange={(e) => setPauseForm((f) => ({ ...f, reason: e.target.value }))} />
          </Field>
        </div>
      </Modal>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-shawish-border/60 py-1.5">
      <dt className="text-shawish-muted">{label}</dt>
      <dd className="max-w-[60%] text-right capitalize">{value}</dd>
    </div>
  );
}
