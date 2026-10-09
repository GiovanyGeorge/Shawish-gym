-- Phase 5: Supplements / Store

CREATE TABLE IF NOT EXISTS product_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO product_categories (name, sort_order) VALUES
    ('Protein', 1),
    ('Creatine', 2),
    ('Pre-Workout', 3),
    ('Vitamins', 4),
    ('Amino Acids', 5),
    ('Energy Drinks', 6),
    ('Snacks', 7),
    ('Shakers', 8),
    ('Accessories', 9),
    ('Other', 10);

ALTER TABLE products ADD COLUMN description TEXT;
ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES product_categories(id);

UPDATE products
SET category_id = (
    SELECT id FROM product_categories
    WHERE product_categories.name = products.category
    LIMIT 1
)
WHERE category IS NOT NULL AND category_id IS NULL;

UPDATE products
SET category_id = (SELECT id FROM product_categories WHERE name = 'Other' LIMIT 1)
WHERE category_id IS NULL;

ALTER TABLE products ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
UPDATE products SET is_active = CASE WHEN is_archived = 1 THEN 0 ELSE 1 END;

ALTER TABLE product_stock_transactions ADD COLUMN reference_type TEXT;
ALTER TABLE product_stock_transactions ADD COLUMN reason TEXT;

ALTER TABLE sales ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash';
ALTER TABLE sales ADD COLUMN status TEXT NOT NULL DEFAULT 'completed';

ALTER TABLE sale_items ADD COLUMN product_name TEXT;

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, is_archived);
CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at);
CREATE INDEX IF NOT EXISTS idx_sales_member ON sales(member_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_product ON product_stock_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_created ON product_stock_transactions(created_at);
