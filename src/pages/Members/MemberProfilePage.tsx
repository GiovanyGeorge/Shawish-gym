import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pause, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { Field, inputClassName } from "@/components/common/Field";
import { Modal } from "@/components/common/Modal";
import { MemberAvatar } from "@/components/members/MemberAvatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  addMemberGoal,
  fetchMemberAttendanceHistory,
  fetchMemberGoals,
  fetchMemberProfile,
  fetchPauseHistory,
  fetchSubscriptionHistory,
  pauseMemberSubscription,
  renewMemberSubscription,
  resumeMember,
  setMemberGoalStatus,
} from "@/services/memberProfileApi";
import { fetchSubscriptionPrices } from "@/services/pricesApi";
import type {
  MemberAttendanceRow,
  MemberGoalRow,
  MemberPauseRow,
  MemberProfile,
  MemberSubscriptionRow,
  SubscriptionPrice,
} from "@/types/domain";
import { addDaysIso, formatDate, subscriptionEndIso, toIsoDate } from "@/utils/dates";
import { memberStatusLabel, memberStatusVariant } from "@/utils/memberStatus";
import { MemberProgressTab } from "@/pages/Members/MemberProgressTab";
import { MemberPurchasesTab } from "@/pages/Members/MemberPurchasesTab";
import { MemberWorkoutTab } from "@/pages/Members/MemberWorkoutTab";
import { cn } from "@/utils/cn";

const TABS = [
  "overview",
  "subscription",
  "attendance",
  "goals",
  "pause",
  "purchases",
  "workout",
  "progress",
] as const;

type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  subscription: "Subscription",
  attendance: "Attendance",
  goals: "Goals",
  pause: "Pause",
  purchases: "Purchases",
  workout: "Workout",
  progress: "Progress",
};

export function MemberProfilePage() {
  const { id } = useParams();
  const memberId = Number(id);

  const [tab, setTab] = useState<Tab>("overview");
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [subscriptions, setSubscriptions] = useState<MemberSubscriptionRow[]>([]);
  const [pauses, setPauses] = useState<MemberPauseRow[]>([]);
  const [goals, setGoals] = useState<MemberGoalRow[]>([]);
  const [attendance, setAttendance] = useState<MemberAttendanceRow[]>([]);
  const [prices, setPrices] = useState<SubscriptionPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [renewOpen, setRenewOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [renewForm, setRenewForm] = useState({
    duration_months: "",
    start_date: toIsoDate(new Date()),
  });

  const [pauseForm, setPauseForm] = useState({
    start_date: toIsoDate(new Date()),
    end_date: toIsoDate(new Date()),
    reason: "",
  });

  const [goalForm, setGoalForm] = useState({ title: "", notes: "" });

  const load = useCallback(async () => {
    if (!Number.isFinite(memberId)) return;
    setLoading(true);
    setError(null);
    try {
      const p = await fetchMemberProfile(memberId);
      setProfile(p);
      if (p) {
        const [subs, pauseRows, goalRows, attendanceRows] = await Promise.all([
          fetchSubscriptionHistory(memberId),
          fetchPauseHistory(memberId),
          fetchMemberGoals(memberId),
          fetchMemberAttendanceHistory(memberId),
        ]);
        setSubscriptions(subs);
        setPauses(pauseRows);
        setGoals(goalRows);
        setAttendance(attendanceRows);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load member profile.");
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const renewEndDate = useMemo(() => {
    if (!renewForm.start_date || !renewForm.duration_months) return "";
    return subscriptionEndIso(renewForm.start_date, Number(renewForm.duration_months));
  }, [renewForm.start_date, renewForm.duration_months]);

  async function handleRenew() {
    if (!profile || !selectedPrice) return;
    setSaving(true);
    try {
      await renewMemberSubscription({
        member_id: profile.id,
        duration_months: selectedPrice.duration_months,
        start_date: renewForm.start_date,
      });
      setRenewOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to renew subscription.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePause() {
    if (!profile) return;
    setSaving(true);
    try {
      await pauseMemberSubscription({
        member_id: profile.id,
        start_date: pauseForm.start_date,
        end_date: pauseForm.end_date,
        reason: pauseForm.reason,
      });
      setPauseOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to pause subscription.");
    } finally {
      setSaving(false);
    }
  }

  async function handleResume() {
    if (!profile) return;
    setSaving(true);
    try {
      await resumeMember(profile.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to resume member.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddGoal() {
    if (!profile || !goalForm.title.trim()) return;
    setSaving(true);
    try {
      await addMemberGoal({
        member_id: profile.id,
        title: goalForm.title,
        notes: goalForm.notes,
      });
      setGoalForm({ title: "", notes: "" });
      setGoals(await fetchMemberGoals(profile.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add goal.");
    } finally {
      setSaving(false);
    }
  }

  if (!Number.isFinite(memberId)) {
    return <p className="text-sm text-red-400">Invalid member ID.</p>;
  }

  if (loading) {
    return <p className="text-sm text-shawish-muted">Loading member profile...</p>;
  }

  if (!profile) {
    return (
      <EmptyState
        title="Member not found"
        action={
          <Link to="/members">
            <Button variant="secondary">Back to Members</Button>
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
            to="/members"
            className="mb-3 inline-flex items-center gap-2 text-sm text-shawish-muted hover:text-shawish-orange"
          >
            <ArrowLeft className="size-4" />
            Back to Members
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <MemberAvatar name={profile.name} photoPath={profile.photo_path} size="lg" />
            <h1 className="text-2xl font-semibold">{profile.name}</h1>
            <StatusBadge variant={memberStatusVariant(profile.display_status)}>
              {memberStatusLabel(profile.display_status)}
            </StatusBadge>
          </div>
          <p className="mt-1 text-sm text-shawish-muted">
            {profile.member_code} · {profile.phone} · {profile.gender}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              const end = profile.current_subscription?.end_date;
              setRenewForm((f) => ({
                ...f,
                start_date: end ? addDaysIso(end, 1) : toIsoDate(new Date()),
              }));
              setRenewOpen(true);
            }}
          >
            <RefreshCw className="size-4" />
            Renew
          </Button>
          {profile.member_status === "paused" ? (
            <Button variant="secondary" loading={saving} onClick={() => void handleResume()}>
              <Play className="size-4" />
              Resume
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setPauseOpen(true)}>
              <Pause className="size-4" />
              Pause
            </Button>
          )}
        </div>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-shawish-border pb-3">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              tab === item
                ? "bg-shawish-orange text-white"
                : "bg-shawish-surface-elevated text-shawish-muted hover:text-shawish-text",
            )}
          >
            {TAB_LABELS[item]}
          </button>
        ))}
      </nav>

      {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

      {tab === "overview" && <OverviewTab profile={profile} />}
      {tab === "subscription" && (
        <SubscriptionTab
          profile={profile}
          subscriptions={subscriptions}
          onRenew={() => {
            const end = profile.current_subscription?.end_date;
            setRenewForm((f) => ({
              ...f,
              start_date: end ? addDaysIso(end, 1) : toIsoDate(new Date()),
            }));
            setRenewOpen(true);
          }}
        />
      )}
      {tab === "attendance" && <AttendanceTab profile={profile} rows={attendance} />}
      {tab === "goals" && (
        <GoalsTab
          goals={goals}
          goalForm={goalForm}
          setGoalForm={setGoalForm}
          saving={saving}
          onAdd={() => void handleAddGoal()}
          onSetStatus={(goalId, status) =>
            void setMemberGoalStatus(goalId, status).then(() => fetchMemberGoals(profile.id).then(setGoals))
          }
        />
      )}
      {tab === "pause" && <PauseTab pauses={pauses} onPause={() => setPauseOpen(true)} />}
      {tab === "purchases" && <MemberPurchasesTab memberId={profile.id} />}
      {tab === "workout" && <MemberWorkoutTab memberId={profile.id} />}
      {tab === "progress" && <MemberProgressTab memberId={profile.id} />}

      <Modal
        open={renewOpen}
        title="Renew Subscription"
        onClose={() => setRenewOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenewOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void handleRenew()}>
              Confirm Renewal
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Duration">
            <select
              className={inputClassName()}
              value={renewForm.duration_months}
              onChange={(e) => setRenewForm((f) => ({ ...f, duration_months: e.target.value }))}
            >
              {prices.map((p) => (
                <option key={p.id} value={p.duration_months}>
                  {p.label} — EGP {p.price.toLocaleString()}
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
          <Field label="End date">
            <input className={inputClassName()} readOnly value={renewEndDate} />
          </Field>
          <p className="text-xs text-shawish-muted">
            A new subscription record will be created. Previous subscriptions remain in history.
          </p>
        </div>
      </Modal>

      <Modal
        open={pauseOpen}
        title="Pause Subscription"
        onClose={() => setPauseOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPauseOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void handlePause()}>
              Confirm Pause
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Pause start">
            <input
              type="date"
              className={inputClassName()}
              value={pauseForm.start_date}
              onChange={(e) => setPauseForm((f) => ({ ...f, start_date: e.target.value }))}
            />
          </Field>
          <Field label="Pause end">
            <input
              type="date"
              className={inputClassName()}
              value={pauseForm.end_date}
              onChange={(e) => setPauseForm((f) => ({ ...f, end_date: e.target.value }))}
            />
          </Field>
          <Field label="Reason (optional)">
            <textarea
              className={inputClassName("min-h-20 resize-y")}
              value={pauseForm.reason}
              onChange={(e) => setPauseForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </Field>
          <p className="text-xs text-shawish-muted">
            The current subscription end date will extend by the pause duration. Pause history is
            preserved.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function OverviewTab({ profile }: { profile: MemberProfile }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Subscription">
        {profile.current_subscription ? (
          <dl className="space-y-2 text-sm">
            <Row label="Plan" value={profile.current_subscription.label ?? "—"} />
            <Row label="Start" value={formatDate(profile.current_subscription.start_date)} />
            <Row label="End" value={formatDate(profile.current_subscription.end_date)} />
            <Row label="Price" value={`EGP ${profile.current_subscription.price.toLocaleString()}`} />
          </dl>
        ) : (
          <p className="text-sm text-shawish-muted">No active subscription.</p>
        )}
      </Card>
      <Card title="Training">
        <dl className="space-y-2 text-sm">
          <Row label="Trainer" value={profile.trainer_name ?? "—"} />
          <Row label="Program" value={profile.program_name ?? "—"} />
        </dl>
      </Card>
      <Card title="Attendance Rate">
        <p className="text-3xl font-semibold text-shawish-orange">{profile.attendance_summary.rate}%</p>
        <p className="mt-2 text-sm text-shawish-muted">
          Present {profile.attendance_summary.present} · Absent {profile.attendance_summary.absent}
        </p>
      </Card>
      <Card title="Goals Notes">
        <p className="text-sm text-shawish-muted">{profile.goals_notes || "No notes recorded."}</p>
      </Card>
    </div>
  );
}

function SubscriptionTab({
  profile,
  subscriptions,
  onRenew,
}: {
  profile: MemberProfile;
  subscriptions: MemberSubscriptionRow[];
  onRenew: () => void;
}) {
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={onRenew}>Renew Subscription</Button>
      </div>
      {profile.current_subscription ? (
        <Card title="Current Subscription" className="mb-4">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Row label="Plan" value={profile.current_subscription.label ?? "—"} />
            <Row label="Status" value={profile.current_subscription.status} />
            <Row label="Start" value={formatDate(profile.current_subscription.start_date)} />
            <Row label="End" value={formatDate(profile.current_subscription.end_date)} />
          </dl>
        </Card>
      ) : null}
      <Card title="Subscription History">
        {subscriptions.length === 0 ? (
          <p className="text-sm text-shawish-muted">No subscription history.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-shawish-muted">
                  <th className="pb-2 pr-4">Plan</th>
                  <th className="pb-2 pr-4">Start</th>
                  <th className="pb-2 pr-4">End</th>
                  <th className="pb-2 pr-4">Price</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-t border-shawish-border">
                    <td className="py-2 pr-4">{sub.label ?? `${sub.duration_months} mo`}</td>
                    <td className="py-2 pr-4">{formatDate(sub.start_date)}</td>
                    <td className="py-2 pr-4">{formatDate(sub.end_date)}</td>
                    <td className="py-2 pr-4">EGP {sub.price.toLocaleString()}</td>
                    <td className="py-2 capitalize">{sub.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function AttendanceTab({
  profile,
  rows,
}: {
  profile: MemberProfile;
  rows: MemberAttendanceRow[];
}) {
  return (
    <Card title={`Attendance — ${profile.name}`}>
      {rows.length === 0 ? (
        <p className="text-sm text-shawish-muted">No attendance records yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.attendance_date}
              className="flex items-center justify-between rounded-shawish border border-shawish-border px-3 py-2 text-sm"
            >
              <span>{formatDate(row.attendance_date)}</span>
              <div className="flex items-center gap-3">
                {row.check_in_time ? (
                  <span className="text-xs text-shawish-muted">{row.check_in_time}</span>
                ) : null}
                <StatusBadge
                  variant={
                    row.status === "present"
                      ? "success"
                      : row.status === "absent"
                        ? "danger"
                        : "neutral"
                  }
                >
                  {row.status}
                </StatusBadge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function GoalsTab({
  goals,
  goalForm,
  setGoalForm,
  saving,
  onAdd,
  onSetStatus,
}: {
  goals: MemberGoalRow[];
  goalForm: { title: string; notes: string };
  setGoalForm: React.Dispatch<React.SetStateAction<{ title: string; notes: string }>>;
  saving: boolean;
  onAdd: () => void;
  onSetStatus: (goalId: number, status: "active" | "completed" | "archived") => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Add Goal">
        <div className="space-y-3">
          <Field label="Title">
            <input
              className={inputClassName()}
              value={goalForm.title}
              onChange={(e) => setGoalForm((f) => ({ ...f, title: e.target.value }))}
            />
          </Field>
          <Field label="Notes">
            <textarea
              className={inputClassName("min-h-20 resize-y")}
              value={goalForm.notes}
              onChange={(e) => setGoalForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Field>
          <Button loading={saving} onClick={onAdd}>
            Add Goal
          </Button>
        </div>
      </Card>
      <Card title="Goals">
        {goals.length === 0 ? (
          <p className="text-sm text-shawish-muted">No goals yet.</p>
        ) : (
          <ul className="space-y-3">
            {goals.map((goal) => (
              <li key={goal.id} className="rounded-shawish border border-shawish-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{goal.title}</p>
                    {goal.notes ? <p className="mt-1 text-xs text-shawish-muted">{goal.notes}</p> : null}
                  </div>
                  <StatusBadge variant="neutral">{goal.status}</StatusBadge>
                </div>
                {goal.status === "active" ? (
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="ghost"
                      className="!py-1 !text-xs"
                      onClick={() => onSetStatus(goal.id, "completed")}
                    >
                      Mark completed
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function PauseTab({ pauses, onPause }: { pauses: MemberPauseRow[]; onPause: () => void }) {
  return (
    <div>
      <div className="mb-4">
        <Button variant="secondary" onClick={onPause}>
          <Pause className="size-4" />
          New Pause
        </Button>
      </div>
      <Card title="Pause History">
        {pauses.length === 0 ? (
          <p className="text-sm text-shawish-muted">No pause records.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {pauses.map((pause) => (
              <li key={pause.id} className="rounded-shawish border border-shawish-border p-3">
                <p>
                  {formatDate(pause.start_date)} → {formatDate(pause.end_date)} ({pause.pause_days}{" "}
                  days)
                </p>
                <p className="mt-1 text-xs text-shawish-muted">
                  End date extended: {formatDate(pause.previous_end_date)} →{" "}
                  {formatDate(pause.new_end_date)}
                </p>
                {pause.reason ? <p className="mt-1 text-xs">{pause.reason}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "rounded-shawish-lg border border-shawish-border bg-shawish-surface p-5",
        className,
      )}
    >
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-shawish-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
