import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { MemberAvatar } from "@/components/members/MemberAvatar";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { fetchDailyAttendance, setDailyAttendance } from "@/services/attendanceApi";
import type { DailyAttendanceRow } from "@/types/domain";
import { toIsoDate } from "@/utils/dates";
import { inputClassName } from "@/components/common/Field";

export function AttendancePage() {
  const [date, setDate] = useState(toIsoDate(new Date()));
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<DailyAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchDailyAttendance(date, search || undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load attendance.");
    } finally {
      setLoading(false);
    }
  }, [date, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function mark(memberId: number, status: "present" | "absent") {
    try {
      await setDailyAttendance({ member_id: memberId, attendance_date: date, status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save attendance.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Daily attendance log for active and paused members."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="date"
          className={inputClassName("w-auto")}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-shawish border border-shawish-border bg-shawish-surface px-3 py-2">
          <Search className="size-4 text-shawish-muted" />
          <input
            className="w-full bg-transparent text-sm focus:outline-none"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-shawish-muted">Loading attendance...</p>
      ) : rows.length === 0 ? (
        <EmptyState title="No members to show" description="Add members to track attendance." />
      ) : (
        <div className="overflow-hidden rounded-shawish-lg border border-shawish-border">
          <table className="min-w-full text-sm">
            <thead className="bg-shawish-surface-elevated text-left text-xs uppercase tracking-wide text-shawish-muted">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Check-in</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.member_id} className="border-t border-shawish-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <MemberAvatar name={row.name} photoPath={row.photo_path} size="sm" />
                      <div>
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-shawish-muted">{row.member_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {row.attendance_status === "present" ? (
                      <StatusBadge variant="success">Present</StatusBadge>
                    ) : row.attendance_status === "absent" ? (
                      <StatusBadge variant="danger">Absent</StatusBadge>
                    ) : row.attendance_status === "paused" || row.member_status === "paused" ? (
                      <StatusBadge variant="neutral">Paused</StatusBadge>
                    ) : (
                      <StatusBadge variant="neutral">Not marked</StatusBadge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-shawish-muted">{row.check_in_time || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        className="!py-1.5 !text-xs"
                        disabled={row.member_status === "paused"}
                        onClick={() => void mark(row.member_id, "present")}
                      >
                        Present
                      </Button>
                      <Button
                        variant="ghost"
                        className="!py-1.5 !text-xs"
                        disabled={row.member_status === "paused"}
                        onClick={() => void mark(row.member_id, "absent")}
                      >
                        Absent
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
