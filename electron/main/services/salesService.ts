import { queryAll, queryOne, runExecute, runStatement } from "../database/query";
import { localTodayIso } from "../utils/localDate";
import { recordStockMovement } from "./inventoryService";
import { withPersist, withPersistTransaction } from "./store";
import type { Database } from "sql.js";

export type SaleStatus = "completed" | "cancelled";
export type PaymentMethod = "cash" | "other";

export type SaleLineInput = {
  product_id: number;
  quantity: number;
};

export type CreateSaleInput = {
  member_id?: number | null;
  items: SaleLineInput[];
  discount?: number;
  payment_method?: PaymentMethod;
  notes?: string;
};

export type SaleListItem = {
  id: number;
  invoice_number: string;
  sold_at: string;
  member_id: number | null;
  member_name: string | null;
  item_count: number;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  status: SaleStatus;
  profit: number;
};

export type SaleItemDetail = {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number | null;
  line_total: number;
  line_profit: number;
};

export type SaleDetail = {
  id: number;
  invoice_number: string;
  sold_at: string;
  member_id: number | null;
  member_name: string | null;
  member_code: string | null;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  status: SaleStatus;
  notes: string | null;
  items: SaleItemDetail[];
  profit: number;
};

function nextInvoiceNumber(db: Database): string {
  const row = queryOne(
    db,
    `SELECT invoice_number FROM sales
     WHERE invoice_number LIKE 'INV-%'
     ORDER BY CAST(SUBSTR(invoice_number, 5) AS INTEGER) DESC
     LIMIT 1`,
  );
  const last = row?.invoice_number ? Number(String(row.invoice_number).replace(/^INV-/i, "")) : 0;
  const next = (Number.isFinite(last) ? last : 0) + 1;
  return `INV-${String(next).padStart(6, "0")}`;
}

export type MemberPurchaseRow = {
  sale_id: number;
  sold_at: string;
  product_name: string;
  quantity: number;
  line_total: number;
  sale_total: number;
  status: SaleStatus;
};

export type TodayStoreStats = {
  sales_total: number;
  profit_total: number;
  transaction_count: number;
};

export type ListSalesFilter = {
  search?: string;
  status?: SaleStatus | "all";
  period?: "today" | "week" | "month" | "all";
  date_from?: string;
  date_to?: string;
};

function todayBounds(): { start: string; end: string } {
  const d = localTodayIso();
  return { start: `${d} 00:00:00`, end: `${d} 23:59:59` };
}

function allocateDiscount(lineTotals: number[], discount: number): number[] {
  if (discount <= 0) return lineTotals.map(() => 0);
  const subtotal = lineTotals.reduce((a, b) => a + b, 0);
  if (subtotal <= 0) return lineTotals.map(() => 0);
  const allocations = lineTotals.map((line) => (line / subtotal) * discount);
  const sum = allocations.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - discount) > 0.01 && allocations.length > 0) {
    allocations[allocations.length - 1]! += discount - sum;
  }
  return allocations;
}

export function getTodayStoreStats(): TodayStoreStats {
  const { start, end } = todayBounds();
  return withPersist((db) => {
    const row = queryOne(
      db,
      `SELECT
        COALESCE(SUM(total), 0) AS sales_total,
        COUNT(*) AS transaction_count
       FROM sales
       WHERE status = 'completed' AND sold_at >= ? AND sold_at <= ?`,
      [start, end],
    );
    const profitRow = queryOne(
      db,
      `SELECT COALESCE(SUM(
        (si.unit_price - COALESCE(si.unit_cost, 0)) * si.quantity
        - (s.discount * (si.line_total / NULLIF(s.subtotal, 0)))
      ), 0) AS profit
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.status = 'completed' AND s.sold_at >= ? AND s.sold_at <= ?`,
      [start, end],
    );
    return {
      sales_total: Number(row?.sales_total ?? 0),
      profit_total: Number(profitRow?.profit ?? 0),
      transaction_count: Number(row?.transaction_count ?? 0),
    };
  });
}

export function listSales(filter: ListSalesFilter = {}): SaleListItem[] {
  return withPersist((db) => {
    const clauses: string[] = [];
    const params: (string | number)[] = [];

    if (filter.status && filter.status !== "all") {
      clauses.push(`s.status = ?`);
      params.push(filter.status);
    }
    if (filter.period === "today") {
      const { start, end } = todayBounds();
      clauses.push(`s.sold_at >= ? AND s.sold_at <= ?`);
      params.push(start, end);
    } else if (filter.period === "week") {
      clauses.push(`date(s.sold_at) >= date('now', '-6 days')`);
    } else if (filter.period === "month") {
      clauses.push(`strftime('%Y-%m', s.sold_at) = strftime('%Y-%m', 'now')`);
    }
    if (filter.date_from) {
      clauses.push(`date(s.sold_at) >= date(?)`);
      params.push(filter.date_from);
    }
    if (filter.date_to) {
      clauses.push(`date(s.sold_at) <= date(?)`);
      params.push(filter.date_to);
    }
    if (filter.search?.trim()) {
      const q = `%${filter.search.trim()}%`;
      clauses.push(`(CAST(s.id AS TEXT) LIKE ? OR COALESCE(s.invoice_number,'') LIKE ? OR m.name LIKE ?)`);
      params.push(q, q, q);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return queryAll(
      db,
      `SELECT s.id, s.invoice_number, s.sold_at, s.member_id, m.name AS member_name,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) AS item_count,
        s.subtotal, s.discount, s.total, s.payment_method, s.status,
        COALESCE((
          SELECT SUM((si.unit_price - COALESCE(si.unit_cost, 0)) * si.quantity
            - (s.discount * (si.line_total / NULLIF(s.subtotal, 0))))
          FROM sale_items si WHERE si.sale_id = s.id
        ), 0) AS profit
       FROM sales s
       LEFT JOIN members m ON m.id = s.member_id
       ${where}
       ORDER BY s.sold_at DESC, s.id DESC`,
      params,
    ).map((row) => ({
      id: Number(row.id),
      invoice_number: String(row.invoice_number ?? `INV-${String(row.id).padStart(6, "0")}`),
      sold_at: String(row.sold_at),
      member_id: row.member_id != null ? Number(row.member_id) : null,
      member_name: row.member_name != null ? String(row.member_name) : null,
      item_count: Number(row.item_count),
      subtotal: Number(row.subtotal),
      discount: Number(row.discount),
      total: Number(row.total),
      payment_method: String(row.payment_method ?? "cash"),
      status: String(row.status ?? "completed") as SaleStatus,
      profit: Number(row.profit ?? 0),
    }));
  });
}

export function getSale(id: number): SaleDetail | null {
  return withPersist((db) => getSaleInTx(db, id));
}

function getSaleInTx(db: Database, id: number): SaleDetail | null {
  const sale = queryOne(
    db,
    `SELECT s.*, m.name AS member_name, m.member_code
     FROM sales s
     LEFT JOIN members m ON m.id = s.member_id
     WHERE s.id = ?`,
    [id],
  );
  if (!sale) return null;

  const items = queryAll(
    db,
    `SELECT si.*, COALESCE(si.product_name, p.name) AS display_name
     FROM sale_items si
     LEFT JOIN products p ON p.id = si.product_id
     WHERE si.sale_id = ?
     ORDER BY si.id`,
    [id],
  );

  const subtotal = Number(sale.subtotal);
  const discount = Number(sale.discount);
  const lineTotals = items.map((i) => Number(i.line_total));
  const discountParts = allocateDiscount(lineTotals, discount);

  const itemDetails: SaleItemDetail[] = items.map((row, index) => {
    const unitPrice = Number(row.unit_price);
    const unitCost = row.unit_cost != null ? Number(row.unit_cost) : null;
    const qty = Number(row.quantity);
    const grossProfit = (unitPrice - (unitCost ?? 0)) * qty;
    const lineProfit = grossProfit - (discountParts[index] ?? 0);
    return {
      id: Number(row.id),
      product_id: Number(row.product_id),
      product_name: String(row.display_name),
      quantity: qty,
      unit_price: unitPrice,
      unit_cost: unitCost,
      line_total: Number(row.line_total),
      line_profit: lineProfit,
    };
  });

  const profit = itemDetails.reduce((sum, i) => sum + i.line_profit, 0);

  return {
    id: Number(sale.id),
    invoice_number: String(sale.invoice_number ?? `INV-${String(sale.id).padStart(6, "0")}`),
    sold_at: String(sale.sold_at),
    member_id: sale.member_id != null ? Number(sale.member_id) : null,
    member_name: sale.member_name != null ? String(sale.member_name) : null,
    member_code: sale.member_code != null ? String(sale.member_code) : null,
    subtotal,
    discount,
    total: Number(sale.total),
    payment_method: String(sale.payment_method ?? "cash"),
    status: String(sale.status ?? "completed") as SaleStatus,
    notes: sale.notes != null ? String(sale.notes) : null,
    items: itemDetails,
    profit,
  };
}

export function createSale(input: CreateSaleInput): SaleDetail {
  if (!input.items.length) throw new Error("Add at least one product to the sale.");
  const discount = input.discount ?? 0;
  if (discount < 0) throw new Error("Discount cannot be negative.");

  return withPersistTransaction((db) => {
    const lines: {
      product_id: number;
      name: string;
      quantity: number;
      unit_price: number;
      unit_cost: number;
      line_total: number;
    }[] = [];

    for (const item of input.items) {
      if (item.quantity <= 0) throw new Error("Sale quantity must be greater than zero.");
      const product = queryOne(
        db,
        `SELECT id, name, quantity, selling_price, purchase_price, is_archived, is_active
         FROM products WHERE id = ?`,
        [item.product_id],
      );
      if (!product) throw new Error("Product not found.");
      if (Number(product.is_archived) === 1 || Number(product.is_active) === 0) {
        throw new Error(`"${String(product.name)}" is not available for sale.`);
      }
      const available = Number(product.quantity);
      if (item.quantity > available) {
        throw new Error(`Insufficient stock for "${String(product.name)}".`);
      }
      const unitPrice = Number(product.selling_price);
      const unitCost = Number(product.purchase_price ?? 0);
      lines.push({
        product_id: Number(product.id),
        name: String(product.name),
        quantity: item.quantity,
        unit_price: unitPrice,
        unit_cost: unitCost,
        line_total: unitPrice * item.quantity,
      });
    }

    const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0);
    if (discount > subtotal) throw new Error("Discount cannot exceed subtotal.");
    const total = subtotal - discount;
    const paymentMethod = input.payment_method ?? "cash";

    const invoiceNumber = nextInvoiceNumber(db);
    const saleId = runStatement(
      db,
      `INSERT INTO sales (member_id, subtotal, discount, total, notes, payment_method, status, sold_at, invoice_number)
       VALUES (?, ?, ?, ?, ?, ?, 'completed', datetime('now'), ?)`,
      [
        input.member_id ?? null,
        subtotal,
        discount,
        total,
        input.notes?.trim() || null,
        paymentMethod,
        invoiceNumber,
      ],
    );

    for (const line of lines) {
      runStatement(
        db,
        `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, unit_cost, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          line.product_id,
          line.name,
          line.quantity,
          line.unit_price,
          line.unit_cost,
          line.line_total,
        ],
      );
      recordStockMovement(db, {
        product_id: line.product_id,
        transaction_type: "sale",
        quantity: line.quantity,
        unit_cost: line.unit_cost,
        reference_type: "sale",
        reference_id: saleId,
        reason: "Sale",
        update_product_quantity: true,
      });
      if (input.member_id) {
        runStatement(
          db,
          `INSERT INTO member_purchases (member_id, sale_id, product_id, quantity, unit_price, line_total, purchased_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            input.member_id,
            saleId,
            line.product_id,
            line.quantity,
            line.unit_price,
            line.line_total,
          ],
        );
      }
    }

    const detail = getSaleInTx(db, saleId);
    if (!detail) throw new Error("Sale was not saved.");
    return detail;
  });
}

export function cancelSale(saleId: number): SaleDetail {
  return withPersistTransaction((db) => {
    const sale = queryOne(db, `SELECT id, status FROM sales WHERE id = ?`, [saleId]);
    if (!sale) throw new Error("Sale not found.");
    if (String(sale.status) === "cancelled") throw new Error("Sale is already cancelled.");

    const items = queryAll(
      db,
      `SELECT product_id, quantity, unit_cost FROM sale_items WHERE sale_id = ?`,
      [saleId],
    );

    for (const item of items) {
      recordStockMovement(db, {
        product_id: Number(item.product_id),
        transaction_type: "stock_in",
        quantity: Number(item.quantity),
        unit_cost: item.unit_cost != null ? Number(item.unit_cost) : null,
        reference_type: "return",
        reference_id: saleId,
        reason: "Sale cancelled",
        update_product_quantity: true,
      });
    }

    runExecute(db, `UPDATE sales SET status = 'cancelled' WHERE id = ?`, [saleId]);

    const detail = getSaleInTx(db, saleId);
    if (!detail) throw new Error("Sale not found.");
    return detail;
  });
}

export function listMemberPurchases(memberId: number): MemberPurchaseRow[] {
  return withPersist((db) =>
    queryAll(
      db,
      `SELECT si.sale_id, s.sold_at, COALESCE(si.product_name, p.name) AS product_name,
        si.quantity, si.line_total, s.total AS sale_total, s.status
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       LEFT JOIN products p ON p.id = si.product_id
       WHERE s.member_id = ? AND s.status = 'completed'
       ORDER BY s.sold_at DESC, si.id DESC`,
      [memberId],
    ).map((row) => ({
      sale_id: Number(row.sale_id),
      sold_at: String(row.sold_at),
      product_name: String(row.product_name),
      quantity: Number(row.quantity),
      line_total: Number(row.line_total),
      sale_total: Number(row.sale_total),
      status: String(row.status ?? "completed") as SaleStatus,
    })),
  );
}

export function listMemberPurchaseSales(filter?: { search?: string }): {
  sale_id: number;
  sold_at: string;
  member_id: number;
  member_name: string;
  member_code: string;
  total: number;
  item_count: number;
}[] {
  return withPersist((db) => {
    const clauses = [`s.member_id IS NOT NULL`, `s.status = 'completed'`];
    const params: string[] = [];
    if (filter?.search?.trim()) {
      clauses.push(`(m.name LIKE ? OR m.member_code LIKE ? OR m.phone LIKE ?)`);
      const q = `%${filter.search.trim()}%`;
      params.push(q, q, q);
    }
    const where = `WHERE ${clauses.join(" AND ")}`;
    return queryAll(
      db,
      `SELECT s.id AS sale_id, s.sold_at, s.member_id, m.name AS member_name, m.member_code,
        s.total,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) AS item_count
       FROM sales s
       JOIN members m ON m.id = s.member_id
       ${where}
       GROUP BY s.id
       ORDER BY s.sold_at DESC`,
      params,
    ).map((row) => ({
      sale_id: Number(row.sale_id),
      sold_at: String(row.sold_at),
      member_id: Number(row.member_id),
      member_name: String(row.member_name),
      member_code: String(row.member_code),
      total: Number(row.total),
      item_count: Number(row.item_count),
    }));
  });
}
