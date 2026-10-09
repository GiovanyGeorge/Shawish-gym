-- Permanent codes, invoice numbers, and extra gym settings

ALTER TABLE sales ADD COLUMN invoice_number TEXT;

UPDATE sales
SET invoice_number = 'INV-' || printf('%06d', id)
WHERE invoice_number IS NULL OR TRIM(invoice_number) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales(invoice_number);

UPDATE products
SET barcode = '2' || printf('%012d', id)
WHERE barcode IS NULL OR TRIM(barcode) = '';

INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES
    ('admin_name', 'Admin', datetime('now')),
    ('admin_photo', '', datetime('now')),
    ('admin_phone', '', datetime('now')),
    ('admin_role', 'Administrator', datetime('now')),
    ('gym_logo', '', datetime('now')),
    ('gym_phone', '', datetime('now')),
    ('gym_address', '', datetime('now'));
