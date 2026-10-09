import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Banknote, CalendarCheck, RefreshCw, TrendingUp, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { Field, inputClassName } from "@/components/common/Field";
import { StatCard } from "@/components/common/StatCard";
import { fetchAnalytics, fetchReport, type AnalyticsDashboard, type ReportKind } from "@/services/reportsApi";
import { downloadCsv } from "@/utils/exportCsv";
import { toIsoDate } from "@/utils/dates";
import { formatMoney } from "@/utils/money";
import { useAppSettingsStore } from "@/stores/appSettingsStore";
import { cn } from "@/utils/cn";

type Preset = "today" | "7" | "30" | "month" | "year" | "custom";

function rangeFor(preset: Preset): { from: string; to: string } {
  const to = toIsoDate(new Date());
  const d = new Date();
  if (preset === "today") return { from: to, to };
  if (preset === "7") {
    d.setDate(d.getDate() - 6);
    return { from: toIsoDate(d), to };
  }
  if (preset === "30") {
    d.setDate(d.getDate() - 29);
    return { from: toIsoDate(d), to };
  }
  if (preset === "month") {
    return { from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`, to };
  }
  if (preset === "year") {
    return { from: `${d.getFullYear()}-01-01`, to };
  }
  return { from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`, to };
}

export function ReportsPage() {
  const currency = useAppSettingsStore((s) => s.settings?.currency ?? "EGP");
  const [preset, setPreset] = useState<Preset>("30");
  const initial = rangeFor("30");
  const [dateFrom, setDateFrom] = useState(initial.from);
  const [dateTo, setDateTo] = useState(initial.to);
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsKind, setDetailsKind] = useState<ReportKind | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchAnalytics(dateFrom, dateTo));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const memberDelta = useMemo(() => {
    if (!data) return "";
    const prev = data.kpis.previous_new_members;
    if (!prev) return "new in range";
    const pct = Math.round(((data.kpis.new_members - prev) / prev) * 100);
    return `${pct >= 0 ? "+" : ""}${pct}% vs prior period`;
  }, [data]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-shawish-muted">
            Insights into members, subscriptions, training and revenue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => window.print()}>Print</Button>
          <Button
            variant="secondary"
            onClick={() =>
              void fetchReport({ kind: "financial", date_from: dateFrom, date_to: dateTo }).then((r) =>
                downloadCsv(`shawish-analytics-${dateFrom}-to-${dateTo}.csv`, r.rows),
              )
            }
          >
            Export
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["today", "7", "30", "month", "year", "custom"] as Preset[]).map((id) => (
          <button
            key={id}
            type="button"
            className={cn(
              "rounded-shawish px-3 py-1 text-xs font-medium",
              preset === id ? "bg-shawish-orange text-white" : "bg-shawish-surface text-shawish-muted",
            )}
            onClick={() => {
              setPreset(id);
              if (id !== "custom") {
                const r = rangeFor(id);
                setDateFrom(r.from);
                setDateTo(r.to);
              }
            }}
          >
            {id === "7" ? "7 Days" : id === "30" ? "30 Days" : id === "month" ? "This Month" : id === "year" ? "This Year" : id === "today" ? "Today" : "Custom"}
          </button>
        ))}
        {preset === "custom" ? (
          <>
            <Field label="From">
              <input type="date" className={inputClassName("w-auto")} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <input type="date" className={inputClassName("w-auto")} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </Field>
          </>
        ) : null}
      </div>

      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      {loading && !data ? <p className="text-sm text-shawish-muted">Loading analytics...</p> : null}

      {data ? (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <StatCard label="Total Revenue" value={formatMoney(data.kpis.total_revenue, currency)} icon={Banknote} accent="orange" />
            <StatCard label="New Members" value={data.kpis.new_members} icon={UserPlus} hint={memberDelta} accent="yellow" />
            <StatCard label="Active Members" value={data.kpis.active_members} icon={Users} accent="green" />
            <StatCard label="Renewals" value={data.kpis.renewals} icon={RefreshCw} accent="neutral" />
            <StatCard label="Attendance" value={`${data.kpis.attendance_rate}%`} icon={CalendarCheck} accent="green" />
            <StatCard label="Profit" value={formatMoney(data.kpis.profit, currency)} icon={TrendingUp} accent={data.kpis.profit >= 0 ? "green" : "red"} />
          </section>

          <ChartCard title="Revenue Overview">
            {data.revenue_series.length === 0 ? (
              <EmptyState title="No revenue in this range." />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.revenue_series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a3a3a3" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#a3a3a3" }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="total" stroke="#f97316" fill="#f9731633" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Members Overview">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { label: "New", value: data.members_overview.new_members },
                      { label: "Active", value: data.members_overview.active },
                      { label: "Expired", value: data.members_overview.expired },
                      { label: "Paused", value: data.members_overview.paused },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a3a3a3" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#a3a3a3" }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#eab308" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <ChartCard title="Subscriptions">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { label: "New", value: data.subscriptions.new_subscriptions },
                      { label: "Renewals", value: data.subscriptions.renewals },
                      { label: "Pauses", value: data.subscriptions.pauses },
                      { label: "Expirations", value: data.subscriptions.expirations },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a3a3a3" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#a3a3a3" }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <ChartCard title="Attendance">
            {data.attendance_series.length === 0 ? (
              <EmptyState title="No attendance records in this range." />
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.attendance_series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a3a3a3" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#a3a3a3" }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="present" stroke="#22c55e" fill="#22c55e22" />
                    <Area type="monotone" dataKey="absent" stroke="#ef4444" fill="#ef444422" />
                    <Area type="monotone" dataKey="paused" stroke="#eab308" fill="#eab30822" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Store Performance">
              <p className="mb-3 text-sm text-shawish-muted">
                Sales {formatMoney(data.store.sales, currency)} · Profit {formatMoney(data.store.profit, currency)}
              </p>
              <h4 className="mb-2 text-xs uppercase tracking-wide text-shawish-muted">Top Products</h4>
              {data.store.top_products.length === 0 ? (
                <EmptyState title="No store sales in this range." />
              ) : (
                <ol className="space-y-2 text-sm">
                  {data.store.top_products.map((p, i) => (
                    <li key={p.name} className="flex justify-between gap-3">
                      <span>
                        {i + 1}. {p.name}
                      </span>
                      <span className="text-shawish-muted">
                        {p.qty} · {formatMoney(p.revenue, currency)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {data.store.low_stock.length > 0 ? (
                <div className="mt-4">
                  <h4 className="mb-2 text-xs uppercase tracking-wide text-red-400">Low Stock</h4>
                  <ul className="space-y-1 text-sm">
                    {data.store.low_stock.map((p) => (
                      <li key={p.id} className="flex justify-between">
                        <span>{p.name}</span>
                        <span className="text-red-400">{p.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </ChartCard>
            <ChartCard title="Trainer Performance">
              {data.trainers.length === 0 ? (
                <EmptyState title="No trainer activity." />
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="text-left text-[11px] uppercase text-shawish-muted">
                    <tr>
                      <th className="pb-2">Trainer</th>
                      <th className="pb-2">Members</th>
                      <th className="pb-2">Sessions</th>
                      <th className="pb-2">Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trainers.map((t) => (
                      <tr key={t.name} className="border-t border-shawish-border/70">
                        <td className="py-2">{t.name}</td>
                        <td>{t.members}</td>
                        <td>{t.sessions}</td>
                        <td>{t.completion_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </ChartCard>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["members", "subscriptions", "attendance", "store", "financial"] as ReportKind[]).map((kind) => (
              <Button key={kind} variant="secondary" className="!py-1 capitalize" onClick={() => setDetailsKind(kind)}>
                View details · {kind}
              </Button>
            ))}
          </div>
          {detailsKind ? (
            <DetailsTable kind={detailsKind} from={dateFrom} to={dateTo} onClose={() => setDetailsKind(null)} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-shawish-lg border border-shawish-border bg-shawish-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </article>
  );
}

function DetailsTable({
  kind,
  from,
  to,
  onClose,
}: {
  kind: ReportKind;
  from: string;
  to: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    void fetchReport({ kind, date_from: from, date_to: to }).then((r) => setRows(r.rows));
  }, [kind, from, to]);
  if (!rows.length) {
    return (
      <article className="rounded-shawish-lg border border-shawish-border p-4">
        <div className="mb-2 flex justify-between">
          <h3 className="text-sm font-semibold capitalize">{kind} details</h3>
          <button type="button" className="text-xs text-shawish-muted" onClick={onClose}>Close</button>
        </div>
        <EmptyState title="No detailed rows." />
      </article>
    );
  }
  const keys = Object.keys(rows[0]!);
  return (
    <article className="overflow-x-auto rounded-shawish-lg border border-shawish-border p-4">
      <div className="mb-2 flex justify-between">
        <h3 className="text-sm font-semibold capitalize">{kind} details</h3>
        <button type="button" className="text-xs text-shawish-muted" onClick={onClose}>Close</button>
      </div>
      <table className="min-w-full text-sm">
        <thead className="text-left text-[11px] uppercase text-shawish-muted">
          <tr>
            {keys.map((k) => (
              <th key={k} className="px-2 py-2">{k.replace(/_/g, " ")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-shawish-border">
              {keys.map((k) => (
                <td key={k} className="px-2 py-2">{String(row[k] ?? "—")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
