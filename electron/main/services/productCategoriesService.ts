import { queryAll, runExecute, runStatement } from "../database/query";
import { withPersist } from "./store";

export type ProductCategory = {
  id: number;
  name: string;
  sort_order: number;
  is_active: number;
};

export function listProductCategories(activeOnly = true): ProductCategory[] {
  return withPersist((db) =>
    queryAll(
      db,
      `SELECT id, name, sort_order, is_active FROM product_categories
       ${activeOnly ? "WHERE is_active = 1" : ""}
       ORDER BY sort_order, name COLLATE NOCASE`,
    ).map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      sort_order: Number(row.sort_order),
      is_active: Number(row.is_active),
    })),
  );
}

export function createProductCategory(name: string): ProductCategory {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required.");
  return withPersist((db) => {
    const existing = queryAll(db, `SELECT id FROM product_categories WHERE name = ? COLLATE NOCASE`, [
      trimmed,
    ]);
    if (existing.length > 0) throw new Error("A category with this name already exists.");
    const maxOrder = Number(
      queryAll(db, `SELECT COALESCE(MAX(sort_order), 0) AS m FROM product_categories`)[0]?.m ?? 0,
    );
    const id = runStatement(
      db,
      `INSERT INTO product_categories (name, sort_order) VALUES (?, ?)`,
      [trimmed, maxOrder + 1],
    );
    return listProductCategories(false).find((c) => c.id === id)!;
  });
}

export function renameProductCategory(id: number, name: string): ProductCategory {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required.");
  return withPersist((db) => {
    runExecute(db, `UPDATE product_categories SET name = ? WHERE id = ?`, [trimmed, id]);
    const row = queryAll(db, `SELECT id, name, sort_order, is_active FROM product_categories WHERE id = ?`, [
      id,
    ])[0];
    if (!row) throw new Error("Category not found.");
    return {
      id: Number(row.id),
      name: String(row.name),
      sort_order: Number(row.sort_order),
      is_active: Number(row.is_active),
    };
  });
}
