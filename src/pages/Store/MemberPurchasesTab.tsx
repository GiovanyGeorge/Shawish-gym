import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { fetchMemberPurchaseSales } from "@/services/storeApi";
import { formatMoney } from "@/utils/money";
import { formatDate } from "@/utils/dates";

export function MemberPurchasesTab() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchMemberPurchaseSales>>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchMemberPurchaseSales(search || undefined));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex min-w-[240px] max-w-md items-center gap-2 rounded-shawish border border-shawish-border bg-shawish-surface px-3 py-2">
        <Search className="size-4 text-shawish-muted" />
        <input className="w-full bg-transparent text-sm focus:outline-none" placeholder="Search member..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <p className="text-sm text-shawish-muted">Loading member purchases...</p>
      ) : rows.length === 0 ? (
        <EmptyState title="No member purchases found." description="Sales linked to a member will appear here." />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.sale_id} className="flex flex-wrap items-center justify-between gap-3 rounded-shawish border border-shawish-border px-4 py-3">
              <div>
                <Link to={`/members/${row.member_id}`} className="font-medium hover:text-shawish-orange">{row.member_name}</Link>
                <p className="text-xs text-shawish-muted">{row.member_code} · {formatDate(row.sold_at.slice(0, 10))}</p>
              </div>
              <div className="text-right text-sm">
                <p>{row.item_count} items · {formatMoney(row.total)}</p>
                <Link to={`/store/sales/${row.sale_id}`} className="text-shawish-orange hover:underline">View sale #{row.sale_id}</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
