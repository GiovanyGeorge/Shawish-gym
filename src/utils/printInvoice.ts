import type { SaleDetail } from "@/types/store";
import { escapeHtml, printHtml } from "@/utils/printHtml";
import { formatMoney } from "@/utils/money";

export function printSaleInvoice(opts: {
  sale: SaleDetail;
  gymName: string;
  gymTagline?: string;
  currency?: string;
}): void {
  const { sale, gymName, gymTagline = "GYM & FITNESS", currency = "EGP" } = opts;
  const when = new Date(sale.sold_at.includes("T") ? sale.sold_at : `${sale.sold_at.replace(" ", "T")}`);
  const dateLabel = Number.isNaN(when.getTime())
    ? sale.sold_at
    : `${when.toLocaleDateString()} ${when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const rows = sale.items
    .map(
      (item) =>
        `<tr>
          <td>${escapeHtml(item.product_name)}</td>
          <td>${item.quantity}</td>
          <td>${escapeHtml(formatMoney(item.unit_price, currency))}</td>
          <td>${escapeHtml(formatMoney(item.line_total, currency))}</td>
        </tr>`,
    )
    .join("");

  printHtml(
    `Invoice ${sale.invoice_number}`,
    `<div style="max-width:720px;margin:0 auto">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div>
          <h1 style="font-size:22px;letter-spacing:.12em">${escapeHtml(gymName.toUpperCase())}</h1>
          <p class="accent" style="margin-top:4px;font-size:12px;letter-spacing:.16em">${escapeHtml(gymTagline)}</p>
        </div>
        <div style="text-align:right">
          <p style="font-size:12px;color:#666">Invoice</p>
          <h2 style="font-size:18px">${escapeHtml(sale.invoice_number)}</h2>
          <p class="muted">${escapeHtml(dateLabel)}</p>
        </div>
      </div>
      <p style="margin-bottom:16px"><strong>Customer:</strong> ${escapeHtml(sale.member_name ?? "Walk-in Customer")}${sale.member_code ? ` · ${escapeHtml(sale.member_code)}` : ""}</p>
      <table>
        <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:16px;width:240px;margin-left:auto;font-size:13px">
        <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${escapeHtml(formatMoney(sale.subtotal, currency))}</span></div>
        <div style="display:flex;justify-content:space-between"><span>Discount</span><span>${escapeHtml(formatMoney(sale.discount, currency))}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:700;margin-top:8px"><span>Total</span><span>${escapeHtml(formatMoney(sale.total, currency))}</span></div>
        <p class="muted" style="margin-top:8px">Payment: ${escapeHtml(sale.payment_method)}</p>
      </div>
      <p style="margin-top:28px;text-align:center;color:#666">Thank you for choosing ${escapeHtml(gymName)}.</p>
    </div>`,
  );
}
