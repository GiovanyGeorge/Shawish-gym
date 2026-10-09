import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Package, Plus, Search } from "lucide-react";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { Field, inputClassName } from "@/components/common/Field";
import { Modal } from "@/components/common/Modal";
import { StatCard } from "@/components/common/StatCard";
import { ProductThumbnail } from "@/components/store/ProductThumbnail";
import { StockStatusBadge } from "@/components/store/StockStatusBadge";
import {
  addStock,
  adjustStock,
  createProduct,
  fetchInventory,
  fetchInventorySummary,
  fetchProductCategories,
  findProductByCode,
} from "@/services/storeApi";
import type { InventoryListItem, ProductCategory, ProductListItem } from "@/types/store";
import { formatMoney } from "@/utils/money";

const ADJUST_REASONS = ["Damaged", "Missing", "Correction", "Expired", "Other"];

export function InventoryTab() {
  const [rows, setRows] = useState<InventoryListItem[]>([]);
  const [summary, setSummary] = useState({ low: 0, out: 0, total_active: 0, inventory_value: 0 });
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out" | "normal">("all");
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [lookup, setLookup] = useState("");
  const [found, setFound] = useState<ProductListItem | null>(null);
  const [addQty, setAddQty] = useState("");
  const [addCost, setAddCost] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState(ADJUST_REASONS[0]!);
  const [createNewOpen, setCreateNewOpen] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: "",
    category_id: "",
    quantity: "",
    purchase_price: "",
    selling_price: "",
    minimum_stock: "0",
    barcode: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, sum, cats] = await Promise.all([
        fetchInventory({
          search: search || undefined,
          stock_status: stockFilter === "all" ? undefined : stockFilter,
        }),
        fetchInventorySummary(),
        fetchProductCategories(),
      ]);
      setRows(inv);
      setSummary(sum);
      setCategories(cats);
    } finally {
      setLoading(false);
    }
  }, [search, stockFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleLookup() {
    setError(null);
    const product = await findProductByCode(lookup);
    if (!product) {
      setFound(null);
      setError("Product not found. You can create a new product.");
      return;
    }
    if (product.is_archived) {
      setError("This product is archived.");
      return;
    }
    setFound(product);
    setAddCost(String(product.purchase_price ?? ""));
  }

  async function handleAddStock() {
    if (!found) return;
    setSaving(true);
    setError(null);
    try {
      await addStock({
        product_id: found.id,
        quantity: Number(addQty),
        unit_cost: Number(addCost),
      });
      setAddOpen(false);
      setLookup("");
      setFound(null);
      setAddQty("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add stock.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdjust() {
    if (!found) return;
    setSaving(true);
    setError(null);
    try {
      await adjustStock({
        product_id: found.id,
        quantity_delta: Number(adjustDelta),
        reason: adjustReason,
      });
      setAdjustOpen(false);
      setFound(null);
      setAdjustDelta("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to adjust stock.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateAndStock() {
    setSaving(true);
    setError(null);
    try {
      await createProduct({
        name: newProductForm.name.trim(),
        category_id: Number(newProductForm.category_id),
        barcode: newProductForm.barcode.trim() || null,
        quantity: Number(newProductForm.quantity),
        minimum_stock: Number(newProductForm.minimum_stock) || 0,
        purchase_price: Number(newProductForm.purchase_price) || 0,
        selling_price: Number(newProductForm.selling_price) || 0,
      });
      setCreateNewOpen(false);
      setAddOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Products" value={summary.total_active} icon={Package} />
        <StatCard label="Low Stock" value={summary.low} icon={AlertTriangle} />
        <StatCard label="Out of Stock" value={summary.out} icon={AlertTriangle} />
        <StatCard label="Inventory Value" value={formatMoney(summary.inventory_value)} icon={Package} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={() => { setAddOpen(true); setError(null); setFound(null); }}><Plus className="size-4" />Add Stock</Button>
        <Button variant="secondary" onClick={() => { setAdjustOpen(true); setError(null); setFound(null); }}>Adjust Stock</Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-shawish border border-shawish-border bg-shawish-surface px-3 py-2">
          <Search className="size-4 text-shawish-muted" />
          <input className="w-full bg-transparent text-sm focus:outline-none" placeholder="Search inventory..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={inputClassName("w-auto")} value={stockFilter} onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}>
          <option value="all">All status</option>
          <option value="normal">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-shawish-muted">Loading inventory...</p>
      ) : rows.length === 0 ? (
        <EmptyState title="No inventory items found." />
      ) : (
        <div className="overflow-x-auto rounded-shawish-lg border border-shawish-border">
          <table className="min-w-full text-sm">
            <thead className="bg-shawish-surface-elevated text-xs uppercase text-shawish-muted">
              <tr>
                <th className="px-3 py-3 text-left">Product</th>
                <th className="px-3 py-3 text-left">Stock</th>
                <th className="px-3 py-3 text-left">Value</th>
                <th className="px-3 py-3 text-left">Last movement</th>
                <th className="px-3 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-shawish-border">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <ProductThumbnail name={row.name} imagePath={row.image_path} />
                      <span>{row.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">{row.quantity} / min {row.minimum_stock}</td>
                  <td className="px-3 py-3">{formatMoney(row.stock_value)}</td>
                  <td className="px-3 py-3 text-shawish-muted">{row.last_movement_at?.slice(0, 10) ?? "—"}</td>
                  <td className="px-3 py-3"><StockStatusBadge status={row.stock_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={addOpen} title="Add Stock" onClose={() => setAddOpen(false)} footer={found ? <Button loading={saving} onClick={() => void handleAddStock()}>Save</Button> : null}>
        {error ? <p className="mb-2 text-sm text-red-400">{error}</p> : null}
        <Field label="Product code or barcode">
          <div className="flex gap-2">
            <input className={inputClassName()} value={lookup} onChange={(e) => setLookup(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void handleLookup()} />
            <Button variant="secondary" onClick={() => void handleLookup()}>Find</Button>
          </div>
        </Field>
        {!found && error ? (
          <Button variant="secondary" className="mt-3" onClick={() => { setCreateNewOpen(true); setNewProductForm((f) => ({ ...f, category_id: String(categories[0]?.id ?? "") })); }}>Create New Product</Button>
        ) : null}
        {found ? (
          <div className="mt-4 space-y-3">
            <p className="font-medium">{found.name}</p>
            <p className="text-sm text-shawish-muted">Current stock: {found.quantity}</p>
            <Field label="Quantity to add"><input type="number" min={1} className={inputClassName()} value={addQty} onChange={(e) => setAddQty(e.target.value)} /></Field>
            <Field label="Purchase price (unit cost)"><input type="number" min={0} className={inputClassName()} value={addCost} onChange={(e) => setAddCost(e.target.value)} /></Field>
          </div>
        ) : null}
      </Modal>

      <Modal open={createNewOpen} title="Create product & stock" onClose={() => setCreateNewOpen(false)} footer={<Button loading={saving} onClick={() => void handleCreateAndStock()}>Create</Button>}>
        <div className="space-y-3">
          <Field label="Name"><input className={inputClassName()} value={newProductForm.name} onChange={(e) => setNewProductForm((f) => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Category">
            <select className={inputClassName()} value={newProductForm.category_id} onChange={(e) => setNewProductForm((f) => ({ ...f, category_id: e.target.value }))}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Initial quantity"><input type="number" className={inputClassName()} value={newProductForm.quantity} onChange={(e) => setNewProductForm((f) => ({ ...f, quantity: e.target.value }))} /></Field>
          <Field label="Purchase price"><input type="number" className={inputClassName()} value={newProductForm.purchase_price} onChange={(e) => setNewProductForm((f) => ({ ...f, purchase_price: e.target.value }))} /></Field>
          <Field label="Selling price"><input type="number" className={inputClassName()} value={newProductForm.selling_price} onChange={(e) => setNewProductForm((f) => ({ ...f, selling_price: e.target.value }))} /></Field>
          <Field label="Minimum stock"><input type="number" className={inputClassName()} value={newProductForm.minimum_stock} onChange={(e) => setNewProductForm((f) => ({ ...f, minimum_stock: e.target.value }))} /></Field>
        </div>
      </Modal>

      <Modal open={adjustOpen} title="Adjust Stock" onClose={() => setAdjustOpen(false)} footer={found ? <Button loading={saving} onClick={() => void handleAdjust()}>Apply</Button> : null}>
        <Field label="Product code or barcode">
          <div className="flex gap-2">
            <input className={inputClassName()} value={lookup} onChange={(e) => setLookup(e.target.value)} />
            <Button variant="secondary" onClick={() => void handleLookup()}>Find</Button>
          </div>
        </Field>
        {found ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm">Current stock: {found.quantity}</p>
            <Field label="Adjustment (+/-)"><input type="number" className={inputClassName()} value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} /></Field>
            <Field label="Reason">
              <select className={inputClassName()} value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}>
                {ADJUST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
