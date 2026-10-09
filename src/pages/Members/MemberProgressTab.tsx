import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/common/EmptyState";
import { Field, inputClassName } from "@/components/common/Field";
import { fetchExerciseProgress, fetchMemberTrainedExercises } from "@/services/trainingApi";
import type { ProgressPoint } from "@/types/training";
import { formatDate } from "@/utils/dates";

export function MemberProgressTab({ memberId }: { memberId: number }) {
  const [exercises, setExercises] = useState<{ exercise_id: number; exercise_name: string }[]>([]);
  const [exerciseId, setExerciseId] = useState<string>("");
  const [points, setPoints] = useState<ProgressPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void fetchMemberTrainedExercises(memberId)
      .then((list) => {
        setExercises(list);
        if (list.length > 0) setExerciseId(String(list[0].exercise_id));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load exercises."))
      .finally(() => setLoading(false));
  }, [memberId]);

  useEffect(() => {
    if (!exerciseId) {
      setPoints([]);
      return;
    }
    setLoadingChart(true);
    void fetchExerciseProgress(memberId, Number(exerciseId))
      .then(setPoints)
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load progress."))
      .finally(() => setLoadingChart(false));
  }, [memberId, exerciseId]);

  const chartData = useMemo(
    () =>
      points.map((p) => ({
        date: formatDate(p.session_date),
        best_weight: p.best_weight,
        total_volume: p.total_volume,
      })),
    [points],
  );

  if (loading) return <p className="text-sm text-shawish-muted">Loading progress...</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (exercises.length === 0) {
    return (
      <EmptyState
        title="No progress data"
        description="Complete at least one workout with logged sets to see charts here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Field label="Exercise">
        <select
          className={inputClassName("max-w-md")}
          value={exerciseId}
          onChange={(e) => setExerciseId(e.target.value)}
        >
          {exercises.map((ex) => (
            <option key={ex.exercise_id} value={ex.exercise_id}>
              {ex.exercise_name}
            </option>
          ))}
        </select>
      </Field>

      {loadingChart ? (
        <p className="text-sm text-shawish-muted">Loading chart...</p>
      ) : chartData.length === 0 ? (
        <EmptyState title="No data for this exercise" description="Log weights and reps during workouts." />
      ) : (
        <div className="h-72 rounded-shawish-lg border border-shawish-border bg-shawish-surface p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="weight" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="volume" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="weight"
                type="monotone"
                dataKey="best_weight"
                name="Best weight (kg)"
                stroke="#f97316"
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="volume"
                type="monotone"
                dataKey="total_volume"
                name="Volume (kg×reps)"
                stroke="#38bdf8"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
