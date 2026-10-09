import { useCallback, useEffect, useState } from "react";
import { Archive, Eye, Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { inputClassName } from "@/components/common/Field";
import { Modal } from "@/components/common/Modal";
import { ProductThumbnail } from "@/components/store/ProductThumbnail";
import { StockStatusBadge } from "@/components/store/StockStatusBadge";
import { ProductFormModal } from "@/pages/Store/ProductFormModal";
import {
  archiveProduct,
  fetchProduct,
  fetchProductCategories,
  fetchProductSalesHistory,
  fetchProductStockHistory,
  fetchProducts,
} from "@/services/storeApi";
import type { ProductCategory, ProductDetail, ProductListItem } from "@/types/store";
import { formatMoney } from "@/utils/money";
import { formatDate } from "@/utils/dates";

export function ProductsTab() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [rows, setRows] = useState<ProductListItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | ProductListItem["stock_status"]>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDetail | null>(null);
  const [viewProduct, setViewProduct] = useState<ProductDetail | null>(null);
  const [stockHistory, setStockHistory] = useState<Awaited<ReturnType<typeof fetchProductStockHistory>>>([]);
  const [salesHistory, setSalesHistory] = useState<Awaited<ReturnType<typeof fetchProductSalesHistory>>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, products] = await Promise.all([
        fetchProductCategories(),
        fetchProducts({
          search: search || undefined,
          category_id: categoryId ? Number(categoryId) : undefined,
          stock_status: stockFilter === "all" ? undefined : stockFilter,
          include_archived: showArchived,
        }),
      ]);
      setCategories(cats);
      setRows(products);
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, stockFilter, showArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openView(id: number) {
    const product = await fetchProduct(id);
    if (!product) return;
    setViewProduct(product);
    const [stock, sales] = await Promise.all([
      fetchProductStockHistory(id),
      fetchProductSalesHistory(id),
    ]);
    setStockHistory(stock);
    setSalesHistory(sales);
  }

  async function openEdit(id: number) {
    const product = await fetchProduct(id);
    if (!product) return;
    setEditing(product);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-shawish border border-shawish-border bg-shawish-surface px-3 py-2">
          <Search className="size-4 text-shawish-muted" />
          <input
            className="w-full bg-transparent text-sm focus:outline-none"
            placeholder="Search name, code, barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="size-4" />
          Add Product
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select className={inputClassName("w-auto")} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className={inputClassName("w-auto")} value={stockFilter} onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}>
          <option value="all">All stock</option>
          <option value="normal">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-shawish-muted">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-shawish-muted">Loading products...</p>
      ) : rows.length === 0 ? (
        <EmptyState title="No products added yet." description="Create your first supplement or store product." action={<Button onClick={() => setFormOpen(true)}>Add Product</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-shawish-lg border border-shawish-border">
          <table className="min-w-full text-sm">
            <thead className="bg-shawish-surface-elevated text-left text-xs uppercase text-shawish-muted">
              <tr>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Code</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Stock</th>
                <th className="px-3 py-3">Prices</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-shawish-border">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <ProductThumbnail name={row.name} imagePath={row.image_path} />
                      <div>
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-shawish-muted">{row.barcode ?? "No barcode"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">{row.product_code}</td>
                  <td className="px-3 py-3">{row.category_name ?? "—"}</td>
                  <td className="px-3 py-3">
                    {row.quantity} <span className="text-shawish-muted">/ min {row.minimum_stock}</span>
                  </td>
                  <td className="px-3 py-3">
                    <p>{formatMoney(row.selling_price)}</p>
                    <p className="text-xs text-shawish-muted">Cost {formatMoney(row.purchase_price ?? 0)}</p>
                  </td>
                  <td className="px-3 py-3">
                    {row.is_archived ? <span className="text-xs text-shawish-muted">Archived</span> : <StockStatusBadge status={row.stock_status} />}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" className="!px-2" onClick={() => void openView(row.id)}><Eye className="size-4" /></Button>
                      {!row.is_archived ? (
                        <>
                          <Button variant="ghost" className="!px-2" onClick={() => void openEdit(row.id)}><Pencil className="size-4" /></Button>
                          <Button variant="ghost" className="!px-2" onClick={() => void archiveProduct(row.id).then(load)}><Archive className="size-4" /></Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProductFormModal open={formOpen} categories={categories} editing={editing} onClose={() => setFormOpen(false)} onSaved={() => void load()} />

      <Modal open={Boolean(viewProduct)} title={viewProduct?.name ?? "Product"} onClose={() => setViewProduct(null)} footer={<Button variant="secondary" onClick={() => setViewProduct(null)}>Close</Button>}>
        {viewProduct ? (
          <div className="space-y-4 text-sm">
            <p className="text-shawish-muted">{viewProduct.product_code} · {viewProduct.category_name}</p>
            <p>Stock: {viewProduct.quantity} (min {viewProduct.minimum_stock})</p>
            {viewProduct.description ? <p>{viewProduct.description}</p> : null}
            <div>
              <p className="mb-2 font-medium">Stock history</p>
              {stockHistory.length === 0 ? <p className="text-shawish-muted">No movements yet.</p> : (
                <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                  {stockHistory.map((tx) => (
                    <li key={tx.id}>{formatDate(tx.created_at.slice(0, 10))} · {tx.transaction_type} · {tx.quantity} {tx.reason ? `· ${tx.reason}` : ""}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-2 font-medium">Sales history</p>
              {salesHistory.length === 0 ? <p className="text-shawish-muted">No sales yet.</p> : (
                <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                  {salesHistory.map((s, i) => (
                    <li key={`${s.sale_id}-${i}`}>{formatDate(s.sold_at.slice(0, 10))} · Sale #{s.sale_id} · {s.quantity} × {formatMoney(s.unit_price)}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
