export type StockStatus = "normal" | "low" | "out";

export type ProductCategory = {
  id: number;
  name: string;
  sort_order: number;
  is_active: number;
};

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

export type InventoryListItem = ProductListItem & {
  last_movement_at: string | null;
  stock_value: number;
};

export type StockTransactionRow = {
  id: number;
  product_id: number;
  transaction_type: string;
  quantity: number;
  unit_cost: number | null;
  reference_type: string | null;
  reference_id: number | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
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
  status: "completed" | "cancelled";
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
  status: "completed" | "cancelled";
  notes: string | null;
  items: SaleItemDetail[];
  profit: number;
};

export type MemberPurchaseRow = {
  sale_id: number;
  sold_at: string;
  product_name: string;
  quantity: number;
  line_total: number;
  sale_total: number;
  status: "completed" | "cancelled";
};

export type TodayStoreStats = {
  sales_total: number;
  profit_total: number;
  transaction_count: number;
};

export type InventorySummary = {
  low: number;
  out: number;
  total_active: number;
  inventory_value: number;
};
