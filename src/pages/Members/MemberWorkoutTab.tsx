import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { fetchMemberWorkoutHistory } from "@/services/trainingApi";
import type { MemberSessionHistoryItem } from "@/types/training";
import { formatDate } from "@/utils/dates";

function statusVariant(
  status: MemberSessionHistoryItem["status"],
): "neutral" | "warning" | "success" | "danger" {
  if (status === "in_progress") return "warning";
  if (status === "completed") return "success";
  if (status === "cancelled") return "danger";
  return "neutral";
}

export function MemberWorkoutTab({ memberId }: { memberId: number }) {
  const [rows, setRows] = useState<MemberSessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void fetchMemberWorkoutHistory(memberId)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load history."))
      .finally(() => setLoading(false));
  }, [memberId]);

  if (loading) return <p className="text-sm text-shawish-muted">Loading workout history...</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No workouts yet"
        description="Completed and in-progress private training sessions will appear here."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-shawish border border-shawish-border px-4 py-3"
        >
          <div>
            <p className="font-medium">{formatDate(row.session_date)}</p>
            <p className="text-sm text-shawish-muted">
              {row.program_day_name ?? "Workout"} · {row.trainer_name ?? "No trainer"}
              {row.duration_minutes != null ? ` · ${row.duration_minutes} min` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={statusVariant(row.status)}>{row.status.replace("_", " ")}</StatusBadge>
            <Link
              to={`/private-training/session/${row.id}`}
              className="text-sm text-shawish-orange hover:underline"
            >
              View
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
