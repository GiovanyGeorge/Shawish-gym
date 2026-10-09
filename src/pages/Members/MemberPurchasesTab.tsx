import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { fetchMemberPurchases } from "@/services/storeApi";
import type { MemberPurchaseRow } from "@/types/store";
import { formatDate } from "@/utils/dates";
import { formatMoney } from "@/utils/money";

export function MemberPurchasesTab({ memberId }: { memberId: number }) {
  const [rows, setRows] = useState<MemberPurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void fetchMemberPurchases(memberId)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load purchases."))
      .finally(() => setLoading(false));
  }, [memberId]);

  if (loading) return <p className="text-sm text-shawish-muted">Loading purchases...</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No purchases found for this member."
        description="Walk-in sales are not listed here. Member-linked store sales appear after checkout."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((row, index) => (
        <li
          key={`${row.sale_id}-${index}`}
          className="flex flex-wrap items-center justify-between gap-3 rounded-shawish border border-shawish-border px-4 py-3"
        >
          <div>
            <p className="font-medium">{row.product_name}</p>
            <p className="text-sm text-shawish-muted">
              {formatDate(row.sold_at.slice(0, 10))} · {row.quantity} × {formatMoney(row.line_total / Math.max(row.quantity, 1))}
            </p>
          </div>
          <div className="text-right text-sm">
            <p>{formatMoney(row.line_total)}</p>
            <Link to={`/store/sales/${row.sale_id}`} className="text-shawish-orange hover:underline">
              View Sale #{row.sale_id}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
