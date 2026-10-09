import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal } from "@/components/common/Modal";
import { StatusBadge } from "@/components/common/StatusBadge";
import { cancelSale, fetchSale } from "@/services/storeApi";
import type { SaleDetail } from "@/types/store";
import { formatMoney } from "@/utils/money";
import { formatDate } from "@/utils/dates";
import { printSaleInvoice } from "@/utils/printInvoice";
import { useAppSettingsStore } from "@/stores/appSettingsStore";

export function SaleDetailPage() {
  const { id } = useParams();
  const saleId = Number(id);
  const gymName = useAppSettingsStore((s) => s.settings?.gym_name ?? "SHAWISH");
  const currency = useAppSettingsStore((s) => s.settings?.currency ?? "EGP");
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(saleId)) return;
    setLoading(true);
    void fetchSale(saleId)
      .then(setSale)
      .finally(() => setLoading(false));
  }, [saleId]);

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    try {
      const updated = await cancelSale(saleId);
      setSale(updated);
      setCancelOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to cancel sale.");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <p className="text-sm text-shawish-muted">Loading sale...</p>;
  if (!sale) {
    return <EmptyState title="Sale not found" action={<Link to="/store">Back to Store</Link>} />;
  }

  return (
    <div>
      <Link to="/store" className="mb-4 inline-flex items-center gap-1 text-sm text-shawish-muted hover:text-shawish-text">
        <ArrowLeft className="size-4" />Store
      </Link>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{sale.invoice_number}</h2>
          <p className="text-sm text-shawish-muted">{formatDate(sale.sold_at.slice(0, 10))} · {sale.payment_method}</p>
          <p className="text-sm">Customer: {sale.member_name ?? "Walk-in Customer"}{sale.member_code ? ` · ${sale.member_code}` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => printSaleInvoice({ sale, gymName, currency })}>
            <Printer className="size-4" />
            Print Invoice
          </Button>
          <StatusBadge variant={sale.status === "cancelled" ? "danger" : "success"}>{sale.status}</StatusBadge>
          {sale.status === "completed" ? (
            <Button variant="danger" onClick={() => setCancelOpen(true)}>Cancel Sale</Button>
          ) : null}
        </div>
      </div>
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

      <div className="overflow-hidden rounded-shawish-lg border border-shawish-border">
        <table className="min-w-full text-sm">
          <thead className="bg-shawish-surface-elevated text-xs uppercase text-shawish-muted">
            <tr>
              <th className="px-3 py-3 text-left">Product</th>
              <th className="px-3 py-3 text-left">Qty</th>
              <th className="px-3 py-3 text-left">Unit price</th>
              <th className="px-3 py-3 text-left">Subtotal</th>
              <th className="px-3 py-3 text-left">Profit</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id} className="border-t border-shawish-border">
                <td className="px-3 py-3">{item.product_name}</td>
                <td className="px-3 py-3">{item.quantity}</td>
                <td className="px-3 py-3">{formatMoney(item.unit_price)}</td>
                <td className="px-3 py-3">{formatMoney(item.line_total)}</td>
                <td className="px-3 py-3">{formatMoney(item.line_profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 max-w-sm space-y-1 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(sale.subtotal)}</span></div>
        <div className="flex justify-between"><span>Discount</span><span>{formatMoney(sale.discount)}</span></div>
        <div className="flex justify-between font-semibold"><span>Total</span><span>{formatMoney(sale.total)}</span></div>
        <div className="flex justify-between text-shawish-muted"><span>Profit (after discount allocation)</span><span>{formatMoney(sale.profit)}</span></div>
      </div>

      <Modal open={cancelOpen} title="Cancel this sale?" onClose={() => setCancelOpen(false)} footer={
        <>
          <Button variant="secondary" onClick={() => setCancelOpen(false)}>Keep sale</Button>
          <Button variant="danger" loading={cancelling} onClick={() => void handleCancel()}>Cancel & restore stock</Button>
        </>
      }>
        <p className="text-sm text-shawish-muted">The sale will remain in history as cancelled and stock will be restored.</p>
      </Modal>
    </div>
  );
}
