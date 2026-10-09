import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterTabs } from "@/components/common/FilterTabs";
import { MemberAvatar } from "@/components/members/MemberAvatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { fetchTrainers } from "@/services/trainersApi";
import {
  fetchTodayTraining,
  fetchTodayTrainingSummary,
  startTrainingSession,
} from "@/services/trainingApi";
import type { Trainer } from "@/types/domain";
import type { TodayDisplayStatus, TodayTrainingRow } from "@/types/training";
import { formatDate } from "@/utils/dates";

const STATUS_FILTERS: { id: TodayDisplayStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];

function statusVariant(status: TodayDisplayStatus): "neutral" | "warning" | "success" | "danger" {
  if (status === "in_progress") return "warning";
  if (status === "completed") return "success";
  if (status === "cancelled") return "danger";
  return "neutral";
}

function statusLabel(status: TodayDisplayStatus): string {
  if (status === "in_progress") return "In Progress";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return "Pending";
}

export function TodaysTrainingTab() {
  const navigate = useNavigate();
  const todayLabel = useMemo(() => formatDate(new Date().toISOString().slice(0, 10)), []);

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [rows, setRows] = useState<TodayTrainingRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, in_progress: 0, completed: 0 });
  const [trainerFilter, setTrainerFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<TodayDisplayStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [trainerRows, trainingRows, trainingSummary] = await Promise.all([
        fetchTrainers(true),
        fetchTodayTraining({
          trainer_id: trainerFilter ? Number(trainerFilter) : undefined,
          status: statusFilter,
        }),
        fetchTodayTrainingSummary(),
      ]);
      setTrainers(trainerRows);
      setRows(trainingRows);
      setSummary(trainingSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load today's training.");
    } finally {
      setLoading(false);
    }
  }, [trainerFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleStart(row: TodayTrainingRow) {
    setStartingId(row.member_id);
    try {
      let sessionId = row.session_id;
      if (!sessionId || row.display_status === "pending") {
        const session = await startTrainingSession(row.member_id, row.scheduled_date);
        sessionId = session.id;
      }
      navigate(`/private-training/session/${sessionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start training.");
    } finally {
      setStartingId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Today&apos;s Training</h3>
          <p className="text-sm text-shawish-muted">{todayLabel}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>
            Members: <strong>{summary.total}</strong>
          </span>
          <span className="text-shawish-muted">
            Pending {summary.pending} · In progress {summary.in_progress} · Completed {summary.completed}
          </span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterTabs items={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
        <select
          className="rounded-shawish border border-shawish-border bg-shawish-surface px-3 py-2 text-sm"
          value={trainerFilter}
          onChange={(e) => setTrainerFilter(e.target.value)}
        >
          <option value="">All trainers</option>
          {trainers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <Button variant="ghost" className="!px-2" onClick={() => void load()}>
          <RotateCcw className="size-4" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-shawish-muted">Loading today&apos;s training...</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No training scheduled for today"
          description="Members with an active subscription, assigned program, and a matching training day will appear here."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.member_id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-shawish-lg border border-shawish-border bg-shawish-surface p-4"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <MemberAvatar name={row.member_name} photoPath={row.photo_path} size="md" />
                <div className="min-w-0">
                  <p className="font-medium">{row.member_name}</p>
                  <p className="text-xs text-shawish-muted">{row.member_code}</p>
                  <p className="mt-1 text-sm text-shawish-muted">
                    Trainer: {row.trainer_name ?? "—"} · Program: {row.program_name}
                  </p>
                  <p className="text-sm">
                    Today: <span className="text-shawish-orange">{row.program_day_name}</span> ·{" "}
                    {row.exercise_count} exercises
                  </p>
                  {row.attendance_status === "absent" ? (
                    <p className="mt-1 text-xs text-red-400">Marked absent today</p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge variant={statusVariant(row.display_status)}>
                  {statusLabel(row.display_status)}
                </StatusBadge>
                {row.display_status === "completed" && row.session_id ? (
                  <Button variant="secondary" onClick={() => navigate(`/private-training/session/${row.session_id}`)}>
                    View Session
                  </Button>
                ) : (
                  <Button
                    loading={startingId === row.member_id}
                    onClick={() => void handleStart(row)}
                  >
                    <Play className="size-4" />
                    {row.display_status === "in_progress" ? "Resume Training" : "Start Training"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
