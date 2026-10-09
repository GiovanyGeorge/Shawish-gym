import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { Field, inputClassName } from "@/components/common/Field";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { fetchSales, fetchTodayStoreStats } from "@/services/storeApi";
import type { SaleListItem } from "@/types/store";
import { formatMoney } from "@/utils/money";
import { formatDate } from "@/utils/dates";
import { Receipt, TrendingUp } from "lucide-react";

export function SalesTab() {
  const [rows, setRows] = useState<SaleListItem[]>([]);
  const [stats, setStats] = useState({ sales_total: 0, profit_total: 0, transaction_count: 0 });
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("today");
  const [status, setStatus] = useState<"all" | "completed" | "cancelled">("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sales, today] = await Promise.all([
        fetchSales({ search: search || undefined, period, status }),
        fetchTodayStoreStats(),
      ]);
      setRows(sales);
      setStats(today);
    } finally {
      setLoading(false);
    }
  }, [search, period, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Today's Sales" value={formatMoney(stats.sales_total)} icon={Receipt} />
        <StatCard label="Today's Profit" value={formatMoney(stats.profit_total)} icon={TrendingUp} />
        <StatCard label="Today's Transactions" value={stats.transaction_count} icon={Receipt} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select className={inputClassName("w-auto")} value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="all">All</option>
          </select>
          <select className={inputClassName("w-auto")} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="all">All status</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Field label="">
            <input className={inputClassName("w-48")} placeholder="Sale ID or member" value={search} onChange={(e) => setSearch(e.target.value)} />
          </Field>
        </div>
        <Link to="/store/sales/new">
          <Button><Plus className="size-4" />New Sale</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-shawish-muted">Loading sales...</p>
      ) : rows.length === 0 ? (
        <EmptyState title="No sales recorded yet." action={<Link to="/store/sales/new"><Button>New Sale</Button></Link>} />
      ) : (
        <div className="overflow-x-auto rounded-shawish-lg border border-shawish-border">
          <table className="min-w-full text-sm">
            <thead className="bg-shawish-surface-elevated text-xs uppercase text-shawish-muted">
              <tr>
                <th className="px-3 py-3 text-left">Invoice</th>
                <th className="px-3 py-3 text-left">Date</th>
                <th className="px-3 py-3 text-left">Customer</th>
                <th className="px-3 py-3 text-left">Items</th>
                <th className="px-3 py-3 text-left">Total</th>
                <th className="px-3 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-shawish-border">
                  <td className="px-3 py-3"><Link className="text-shawish-orange hover:underline" to={`/store/sales/${row.id}`}>{row.invoice_number || `#${row.id}`}</Link></td>
                  <td className="px-3 py-3">{formatDate(row.sold_at.slice(0, 10))}</td>
                  <td className="px-3 py-3">{row.member_name ?? "Walk-in"}</td>
                  <td className="px-3 py-3">{row.item_count}</td>
                  <td className="px-3 py-3">{formatMoney(row.total)}</td>
                  <td className="px-3 py-3">
                    <StatusBadge variant={row.status === "cancelled" ? "danger" : "success"}>{row.status}</StatusBadge>
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
