import { queryAll, queryOne, runExecute, runStatement } from "../database/query";
import { withPersist, withPersistTransaction } from "./store";
import type { Database } from "sql.js";
import type { ListProductsFilter } from "./productsService";

export type StockTransactionType = "stock_in" | "stock_out" | "sale" | "adjustment";

export type StockMovementInput = {
  product_id: number;
  transaction_type: StockTransactionType;
  /** Positive units for stock_in / sale / stock_out; signed delta for adjustment. */
  quantity: number;
  unit_cost?: number | null;
  reference_type?: string | null;
  reference_id?: number | null;
  reason?: string | null;
  notes?: string | null;
  update_product_quantity: boolean;
  update_purchase_price?: number | null;
};

export type StockTransactionRow = {
  id: number;
  product_id: number;
  transaction_type: StockTransactionType;
  quantity: number;
  unit_cost: number | null;
  reference_type: string | null;
  reference_id: number | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
};

export type InventoryListItem = ProductListItem & {
  last_movement_at: string | null;
  stock_value: number;
};

export type AddStockInput = {
  product_id: number;
  quantity: number;
  unit_cost: number;
  reference_type?: "purchase" | "initial_stock";
  notes?: string;
};

export type AdjustStockInput = {
  product_id: number;
  quantity_delta: number;
  reason: string;
  notes?: string;
};

export type CreateProductWithStockInput = {
  name: string;
  barcode?: string | null;
  category_id: number;
  image_path?: string | null;
  description?: string;
  quantity: number;
  minimum_stock: number;
  purchase_price: number;
  selling_price: number;
};

function quantityDelta(type: StockTransactionType, quantity: number): number {
  if (type === "stock_in") return Math.abs(quantity);
  if (type === "sale" || type === "stock_out") return -Math.abs(quantity);
  return quantity;
}

export function recordStockMovement(db: Database, input: StockMovementInput): number {
  const product = queryOne(
    db,
    `SELECT quantity, is_archived, purchase_price FROM products WHERE id = ?`,
    [input.product_id],
  );
  if (!product) throw new Error("Product not found.");
  const isReturn =
    input.reference_type === "return" && input.transaction_type === "stock_in";
  if (
    Number(product.is_archived) === 1 &&
    input.transaction_type !== "adjustment" &&
    !isReturn
  ) {
    throw new Error("Archived products cannot receive stock movements.");
  }

  const delta = quantityDelta(input.transaction_type, input.quantity);
  const currentQty = Number(product.quantity);
  const newQty = currentQty + delta;
  if (newQty < 0) throw new Error("Insufficient stock.");

  const txQty =
    input.transaction_type === "adjustment"
      ? input.quantity
      : Math.abs(input.quantity);

  const txId = runStatement(
    db,
    `INSERT INTO product_stock_transactions (
      product_id, transaction_type, quantity, unit_cost, supplier, notes, reference_id, reference_type, reason
    ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    [
      input.product_id,
      input.transaction_type,
      txQty,
      input.unit_cost ?? null,
      input.notes ?? null,
      input.reference_id ?? null,
      input.reference_type ?? null,
      input.reason ?? null,
    ],
  );

  if (input.update_product_quantity) {
    runExecute(
      db,
      `UPDATE products SET
        quantity = ?,
        purchase_price = COALESCE(?, purchase_price),
        updated_at = datetime('now')
       WHERE id = ?`,
      [newQty, input.update_purchase_price ?? null, input.product_id],
    );
  }

  return txId;
}

export function addStock(input: AddStockInput): InventoryListItem {
  if (input.quantity <= 0) throw new Error("Quantity must be greater than zero.");
  if (input.unit_cost < 0) throw new Error("Purchase price must be zero or greater.");

  return withPersistTransaction((db) => {
    recordStockMovement(db, {
      product_id: input.product_id,
      transaction_type: "stock_in",
      quantity: input.quantity,
      unit_cost: input.unit_cost,
      reference_type: input.reference_type ?? "purchase",
      reason: input.reference_type === "initial_stock" ? "Initial stock" : "Stock purchase",
      notes: input.notes ?? null,
      update_product_quantity: true,
      update_purchase_price: input.unit_cost,
    });
    const item = getInventoryItemInTx(db, input.product_id);
    if (!item) throw new Error("Product not found.");
    return item;
  });
}

export function adjustStock(input: AdjustStockInput): InventoryListItem {
  if (!input.reason.trim()) throw new Error("Adjustment reason is required.");
  if (input.quantity_delta === 0) throw new Error("Adjustment quantity cannot be zero.");

  return withPersistTransaction((db) => {
    recordStockMovement(db, {
      product_id: input.product_id,
      transaction_type: "adjustment",
      quantity: input.quantity_delta,
      reference_type: "adjustment",
      reason: input.reason.trim(),
      notes: input.notes ?? null,
      update_product_quantity: true,
    });
    const item = getInventoryItemInTx(db, input.product_id);
    if (!item) throw new Error("Product not found.");
    return item;
  });
}

function getInventoryItemInTx(db: Database, productId: number): InventoryListItem | null {
  const row = queryOne(
    db,
    `SELECT p.*, c.name AS category_name,
      (SELECT MAX(created_at) FROM product_stock_transactions WHERE product_id = p.id) AS last_movement_at
     FROM products p
     LEFT JOIN product_categories c ON c.id = p.category_id
     WHERE p.id = ?`,
    [productId],
  );
  if (!row) return null;
  const quantity = Number(row.quantity);
  const purchasePrice = row.purchase_price != null ? Number(row.purchase_price) : 0;
  const minimumStock = Number(row.minimum_stock);
  let stock_status: "normal" | "low" | "out" = "normal";
  if (quantity <= 0) stock_status = "out";
  else if (quantity <= minimumStock) stock_status = "low";

  return {
    id: Number(row.id),
    product_code: String(row.product_code),
    barcode: row.barcode != null ? String(row.barcode) : null,
    name: String(row.name),
    category_id: row.category_id != null ? Number(row.category_id) : null,
    category_name: row.category_name != null ? String(row.category_name) : null,
    image_path: row.image_path != null ? String(row.image_path) : null,
    description: row.description != null ? String(row.description) : null,
    quantity,
    minimum_stock: minimumStock,
    purchase_price: row.purchase_price != null ? Number(row.purchase_price) : null,
    selling_price: Number(row.selling_price),
    is_active: Number(row.is_active ?? 1),
    is_archived: Number(row.is_archived ?? 0),
    stock_status,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    last_movement_at: row.last_movement_at != null ? String(row.last_movement_at) : null,
    stock_value: quantity * purchasePrice,
  };
}

export function listInventory(filter: ListProductsFilter = {}): InventoryListItem[] {
  return withPersist((db) => {
    const clauses: string[] = [`p.is_archived = 0`];
    const params: (string | number)[] = [];
    if (filter.category_id) {
      clauses.push(`p.category_id = ?`);
      params.push(filter.category_id);
    }
    if (filter.search?.trim()) {
      const q = `%${filter.search.trim()}%`;
      clauses.push(`(p.name LIKE ? OR p.product_code LIKE ? OR p.barcode LIKE ?)`);
      params.push(q, q, q);
    }
    if (filter.stock_status === "out") clauses.push(`p.quantity <= 0`);
    else if (filter.stock_status === "low") clauses.push(`p.quantity > 0 AND p.quantity <= p.minimum_stock`);
    else if (filter.stock_status === "normal") clauses.push(`p.quantity > p.minimum_stock`);

    return queryAll(
      db,
      `SELECT p.*, c.name AS category_name,
        (SELECT MAX(created_at) FROM product_stock_transactions WHERE product_id = p.id) AS last_movement_at
       FROM products p
       LEFT JOIN product_categories c ON c.id = p.category_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY p.name COLLATE NOCASE`,
      params,
    )
      .map((row) => getInventoryItemInTx(db, Number(row.id)))
      .filter((item): item is InventoryListItem => item != null);
  });
}

export function listProductStockHistory(productId: number): StockTransactionRow[] {
  return withPersist((db) =>
    queryAll(
      db,
      `SELECT id, product_id, transaction_type, quantity, unit_cost, reference_type, reference_id, reason, notes, created_at
       FROM product_stock_transactions
       WHERE product_id = ?
       ORDER BY created_at DESC, id DESC`,
      [productId],
    ).map((row) => ({
      id: Number(row.id),
      product_id: Number(row.product_id),
      transaction_type: String(row.transaction_type) as StockTransactionType,
      quantity: Number(row.quantity),
      unit_cost: row.unit_cost != null ? Number(row.unit_cost) : null,
      reference_type: row.reference_type != null ? String(row.reference_type) : null,
      reference_id: row.reference_id != null ? Number(row.reference_id) : null,
      reason: row.reason != null ? String(row.reason) : null,
      notes: row.notes != null ? String(row.notes) : null,
      created_at: String(row.created_at),
    })),
  );
}

export function listProductSalesHistory(productId: number): {
  sale_id: number;
  sold_at: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  status: string;
}[] {
  return withPersist((db) =>
    queryAll(
      db,
      `SELECT si.sale_id, s.sold_at, si.quantity, si.unit_price, si.line_total, s.status
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE si.product_id = ?
       ORDER BY s.sold_at DESC, si.id DESC`,
      [productId],
    ).map((row) => ({
      sale_id: Number(row.sale_id),
      sold_at: String(row.sold_at),
      quantity: Number(row.quantity),
      unit_price: Number(row.unit_price),
      line_total: Number(row.line_total),
      status: String(row.status ?? "completed"),
    })),
  );
}
