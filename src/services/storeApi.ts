import { ipcInvoke } from "@/services/ipc";
import type {
  InventoryListItem,
  InventorySummary,
  MemberPurchaseRow,
  ProductCategory,
  ProductDetail,
  ProductListItem,
  SaleDetail,
  SaleListItem,
  StockTransactionRow,
  TodayStoreStats,
} from "@/types/store";

export function fetchProductCategories(activeOnly = true) {
  return ipcInvoke<ProductCategory[]>("store:categories:list", { activeOnly });
}

export function createProductCategory(name: string) {
  return ipcInvoke<ProductCategory>("store:categories:create", { name });
}

export function fetchProducts(params?: {
  search?: string;
  category_id?: number;
  stock_status?: ProductListItem["stock_status"] | "all";
  include_archived?: boolean;
}) {
  return ipcInvoke<ProductListItem[]>("store:products:list", params ?? {});
}

export function fetchProduct(id: number) {
  return ipcInvoke<ProductDetail | null>("store:products:get", { id });
}

export function findProductByCode(code: string) {
  return ipcInvoke<ProductListItem | null>("store:products:find", { code });
}

export function createProduct(input: {
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
}) {
  return ipcInvoke<ProductDetail>("store:products:create", input);
}

export function updateProduct(input: {
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
}) {
  return ipcInvoke<ProductDetail>("store:products:update", input);
}

export function archiveProduct(id: number) {
  return ipcInvoke<{ ok: boolean }>("store:products:archive", { id });
}

export function fetchProductStockHistory(productId: number) {
  return ipcInvoke<StockTransactionRow[]>("store:products:stockHistory", { product_id: productId });
}

export function fetchProductSalesHistory(productId: number) {
  return ipcInvoke<
    { sale_id: number; sold_at: string; quantity: number; unit_price: number; line_total: number; status: string }[]
  >("store:products:salesHistory", { product_id: productId });
}

export function fetchInventory(params?: Parameters<typeof fetchProducts>[0]) {
  return ipcInvoke<InventoryListItem[]>("store:inventory:list", params ?? {});
}

export function addStock(input: {
  product_id: number;
  quantity: number;
  unit_cost: number;
  reference_type?: "purchase" | "initial_stock";
  notes?: string;
}) {
  return ipcInvoke<InventoryListItem>("store:inventory:addStock", input);
}

export function adjustStock(input: {
  product_id: number;
  quantity_delta: number;
  reason: string;
  notes?: string;
}) {
  return ipcInvoke<InventoryListItem>("store:inventory:adjust", input);
}

export function fetchInventorySummary() {
  return ipcInvoke<InventorySummary>("store:inventory:summary", {});
}

export function fetchSales(params?: {
  search?: string;
  status?: "completed" | "cancelled" | "all";
  period?: "today" | "week" | "month" | "all";
  date_from?: string;
  date_to?: string;
}) {
  return ipcInvoke<SaleListItem[]>("store:sales:list", params ?? {});
}

export function fetchSale(id: number) {
  return ipcInvoke<SaleDetail | null>("store:sales:get", { id });
}

export function createSale(input: {
  member_id?: number | null;
  items: { product_id: number; quantity: number }[];
  discount?: number;
  payment_method?: "cash" | "other";
  notes?: string;
}) {
  return ipcInvoke<SaleDetail>("store:sales:create", input);
}

export function cancelSale(id: number) {
  return ipcInvoke<SaleDetail>("store:sales:cancel", { id });
}

export function fetchTodayStoreStats() {
  return ipcInvoke<TodayStoreStats>("store:sales:todayStats", {});
}

export function fetchMemberPurchaseSales(search?: string) {
  return ipcInvoke<
    {
      sale_id: number;
      sold_at: string;
      member_id: number;
      member_name: string;
      member_code: string;
      total: number;
      item_count: number;
    }[]
  >("store:memberPurchases:list", { search });
}

export function fetchMemberPurchases(memberId: number) {
  return ipcInvoke<MemberPurchaseRow[]>("store:memberPurchases:forMember", { member_id: memberId });
}
