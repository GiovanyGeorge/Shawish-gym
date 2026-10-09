import { queryAll, queryOne, runExecute, runStatement } from "../database/query";
import { withPersist, withPersistTransaction } from "./store";
import { recordStockMovement } from "./inventoryService";
import type { Database } from "sql.js";

export type StockStatus = "normal" | "low" | "out";

export type ProductListItem = {
  id: number;
  product_code: string;
  barcode: string | null;
  name: string;
  category_id: number | null;
  category_name: string | null;
  image_path: string | null;
  description: string | null;
  quantity: number;
  minimum_stock: number;
  purchase_price: number | null;
  selling_price: number;
  is_active: number;
  is_archived: number;
  stock_status: StockStatus;
  created_at: string;
  updated_at: string;
};

export type ProductDetail = ProductListItem & {
  last_movement_at: string | null;
};

export type ListProductsFilter = {
  search?: string;
  category_id?: number;
  stock_status?: StockStatus | "all";
  include_archived?: boolean;
};

export type CreateProductInput = {
  name: string;
  product_code?: string;
  barcode?: string | null;
  category_id: number;
  image_path?: string | null;
  description?: string;
  quantity: number;
  minimum_stock: number;
  purchase_price: number;
  selling_price: number;
};

export type UpdateProductInput = {
  id: number;
  name: string;
  product_code?: string;
  barcode?: string | null;
  category_id: number;
  image_path?: string | null;
  description?: string;
  minimum_stock: number;
  purchase_price: number;
  selling_price: number;
};

function computeStockStatus(quantity: number, minimumStock: number): StockStatus {
  if (quantity <= 0) return "out";
  if (quantity <= minimumStock) return "low";
  return "normal";
}

function nextProductCode(db: Database): string {
  const row = queryOne(
    db,
    `SELECT product_code FROM products
     WHERE product_code LIKE 'SUP-%'
     ORDER BY CAST(SUBSTR(product_code, 5) AS INTEGER) DESC
     LIMIT 1`,
  );
  const last = row?.product_code ? Number(String(row.product_code).replace(/^SUP-/i, "")) : 0;
  const next = (Number.isFinite(last) ? last : 0) + 1;
  return `SUP-${String(next).padStart(6, "0")}`;
}

function generateBarcode(db: Database): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = `2${String(Date.now()).slice(-11)}${String(Math.floor(Math.random() * 100)).padStart(2, "0")}`;
    const exists = queryOne(db, `SELECT id FROM products WHERE barcode = ?`, [candidate]);
    if (!exists) return candidate;
  }
  throw new Error("Unable to generate a unique barcode.");
}

function assertUniqueCode(db: Database, code: string, excludeId?: number) {
  const row = queryOne(
    db,
    excludeId != null
      ? `SELECT id FROM products WHERE product_code = ? AND id != ?`
      : `SELECT id FROM products WHERE product_code = ?`,
    excludeId != null ? [code, excludeId] : [code],
  );
  if (row) throw new Error("Product code already exists.");
}

function assertUniqueBarcode(db: Database, barcode: string | null | undefined, excludeId?: number) {
  if (!barcode?.trim()) return;
  const row = queryOne(
    db,
    excludeId != null
      ? `SELECT id FROM products WHERE barcode = ? AND id != ?`
      : `SELECT id FROM products WHERE barcode = ?`,
    excludeId != null ? [barcode.trim(), excludeId] : [barcode.trim()],
  );
  if (row) throw new Error("Barcode already exists.");
}

function validatePrices(purchase: number, selling: number) {
  if (purchase < 0 || selling < 0) throw new Error("Prices must be zero or greater.");
}

function validateQuantities(quantity: number, minimumStock: number) {
  if (quantity < 0 || minimumStock < 0) throw new Error("Quantity and minimum stock must be zero or greater.");
}

function mapProductRow(row: Record<string, unknown>): ProductListItem {
  const quantity = Number(row.quantity);
  const minimumStock = Number(row.minimum_stock);
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
    stock_status: computeStockStatus(quantity, minimumStock),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

const PRODUCT_SELECT = `
  SELECT p.*, c.name AS category_name
  FROM products p
  LEFT JOIN product_categories c ON c.id = p.category_id
`;

export function listProducts(filter: ListProductsFilter = {}): ProductListItem[] {
  return withPersist((db) => {
    const clauses: string[] = [];
    const params: (string | number)[] = [];

    if (!filter.include_archived) {
      clauses.push(`p.is_archived = 0`);
    }
    if (filter.category_id) {
      clauses.push(`p.category_id = ?`);
      params.push(filter.category_id);
    }
    if (filter.search?.trim()) {
      const q = `%${filter.search.trim()}%`;
      clauses.push(`(p.name LIKE ? OR p.product_code LIKE ? OR p.barcode LIKE ?)`);
      params.push(q, q, q);
    }
    if (filter.stock_status === "out") {
      clauses.push(`p.quantity <= 0`);
    } else if (filter.stock_status === "low") {
      clauses.push(`p.quantity > 0 AND p.quantity <= p.minimum_stock`);
    } else if (filter.stock_status === "normal") {
      clauses.push(`p.quantity > p.minimum_stock`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return queryAll(
      db,
      `${PRODUCT_SELECT} ${where} ORDER BY p.name COLLATE NOCASE`,
      params,
    ).map((row) => mapProductRow(row));
  });
}

export function getProduct(id: number): ProductDetail | null {
  return withPersist((db) => {
    const row = queryOne(db, `${PRODUCT_SELECT} WHERE p.id = ?`, [id]);
    if (!row) return null;
    const last = queryOne(
      db,
      `SELECT MAX(created_at) AS last_at FROM product_stock_transactions WHERE product_id = ?`,
      [id],
    );
    return {
      ...mapProductRow(row),
      last_movement_at: last?.last_at != null ? String(last.last_at) : null,
    };
  });
}

export function findProductByCodeOrBarcode(codeOrBarcode: string): ProductListItem | null {
  const term = codeOrBarcode.trim();
  if (!term) return null;
  return withPersist((db) => {
    const row = queryOne(
      db,
      `${PRODUCT_SELECT} WHERE p.product_code = ? OR p.barcode = ? LIMIT 1`,
      [term, term],
    );
    return row ? mapProductRow(row) : null;
  });
}

export function createProduct(input: CreateProductInput): ProductDetail {
  const name = input.name.trim();
  if (!name) throw new Error("Product name is required.");
  validateQuantities(input.quantity, input.minimum_stock);
  validatePrices(input.purchase_price, input.selling_price);

  return withPersistTransaction((db) => {
    const code = input.product_code?.trim() || nextProductCode(db);
    assertUniqueCode(db, code);
    const barcode = input.barcode?.trim() || generateBarcode(db);
    assertUniqueBarcode(db, barcode);

    const id = runStatement(
      db,
      `INSERT INTO products (
        name, product_code, barcode, category_id, image_path, description,
        quantity, minimum_stock, purchase_price, selling_price, is_active, is_archived
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
      [
        name,
        code,
        barcode,
        input.category_id,
        input.image_path ?? null,
        input.description?.trim() || null,
        0,
        input.minimum_stock,
        input.purchase_price,
        input.selling_price,
      ],
    );

    if (input.quantity > 0) {
      recordStockMovement(db, {
        product_id: id,
        transaction_type: "stock_in",
        quantity: input.quantity,
        unit_cost: input.purchase_price,
        reference_type: "initial_stock",
        reason: "Initial stock",
        update_product_quantity: true,
        update_purchase_price: input.purchase_price,
      });
    }

    const detail = getProductInTx(db, id);
    if (!detail) throw new Error("Failed to create product.");
    return detail;
  });
}

function getProductInTx(db: Database, id: number): ProductDetail | null {
  const row = queryOne(db, `${PRODUCT_SELECT} WHERE p.id = ?`, [id]);
  if (!row) return null;
  const last = queryOne(
    db,
    `SELECT MAX(created_at) AS last_at FROM product_stock_transactions WHERE product_id = ?`,
    [id],
  );
  return {
    ...mapProductRow(row),
    last_movement_at: last?.last_at != null ? String(last.last_at) : null,
  };
}

export function updateProduct(input: UpdateProductInput): ProductDetail {
  const name = input.name.trim();
  if (!name) throw new Error("Product name is required.");
  validatePrices(input.purchase_price, input.selling_price);
  if (input.minimum_stock < 0) throw new Error("Minimum stock must be zero or greater.");

  return withPersistTransaction((db) => {
    const existing = queryOne(
      db,
      `SELECT id, is_archived, product_code, barcode FROM products WHERE id = ?`,
      [input.id],
    );
    if (!existing) throw new Error("Product not found.");
    if (Number(existing.is_archived) === 1) throw new Error("Archived products cannot be edited.");

    const barcode = input.barcode?.trim() || String(existing.barcode ?? "") || generateBarcode(db);
    assertUniqueBarcode(db, barcode, input.id);

    runExecute(
      db,
      `UPDATE products SET
        name = ?, barcode = COALESCE(barcode, ?),
        category_id = ?, image_path = ?, description = ?,
        minimum_stock = ?, purchase_price = ?, selling_price = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        name,
        barcode,
        input.category_id,
        input.image_path ?? null,
        input.description?.trim() || null,
        input.minimum_stock,
        input.purchase_price,
        input.selling_price,
        input.id,
      ],
    );

    const detail = getProductInTx(db, input.id);
    if (!detail) throw new Error("Product not found.");
    return detail;
  });
}

export function archiveProduct(id: number): void {
  withPersistTransaction((db) => {
    const row = queryOne(db, `SELECT id FROM products WHERE id = ?`, [id]);
    if (!row) throw new Error("Product not found.");
    runExecute(db, `UPDATE products SET is_archived = 1, is_active = 0, updated_at = datetime('now') WHERE id = ?`, [
      id,
    ]);
  });
}

export function countProductsByStockStatus(): { low: number; out: number; total_active: number; inventory_value: number } {
  return withPersist((db) => {
    const low = Number(
      queryOne(
        db,
        `SELECT COUNT(*) AS c FROM products WHERE is_archived = 0 AND quantity > 0 AND quantity <= minimum_stock`,
      )?.c ?? 0,
    );
    const out = Number(
      queryOne(db, `SELECT COUNT(*) AS c FROM products WHERE is_archived = 0 AND quantity <= 0`)?.c ?? 0,
    );
    const totalActive = Number(
      queryOne(db, `SELECT COUNT(*) AS c FROM products WHERE is_archived = 0`)?.c ?? 0,
    );
    const inventoryValue = Number(
      queryOne(
        db,
        `SELECT COALESCE(SUM(quantity * COALESCE(purchase_price, 0)), 0) AS v FROM products WHERE is_archived = 0`,
      )?.v ?? 0,
    );
    return { low, out, total_active: totalActive, inventory_value: inventoryValue };
  });
}

export function listLowStockProducts(limit = 10): ProductListItem[] {
  return withPersist((db) =>
    queryAll(
      db,
      `${PRODUCT_SELECT}
       WHERE p.is_archived = 0 AND p.quantity <= p.minimum_stock
       ORDER BY p.quantity ASC, p.name COLLATE NOCASE
       LIMIT ?`,
      [limit],
    ).map((row) => mapProductRow(row)),
  );
}
