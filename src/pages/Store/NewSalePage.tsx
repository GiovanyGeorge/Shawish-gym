import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Minus, Plus, Printer, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Field, inputClassName } from "@/components/common/Field";
import { Modal } from "@/components/common/Modal";
import { MemberAvatar } from "@/components/members/MemberAvatar";
import { ProductThumbnail } from "@/components/store/ProductThumbnail";
import { createSale, fetchProducts, findProductByCode } from "@/services/storeApi";
import { fetchMembers } from "@/services/membersApi";
import { useAppSettingsStore } from "@/stores/appSettingsStore";
import type { MemberListItem } from "@/types/domain";
import type { ProductListItem, SaleDetail } from "@/types/store";
import { formatMoney } from "@/utils/money";
import { printSaleInvoice } from "@/utils/printInvoice";
import { cn } from "@/utils/cn";

type CartLine = {
  product_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  max_qty: number;
};

export function NewSalePage() {
  const navigate = useNavigate();
  const gymName = useAppSettingsStore((s) => s.settings?.gym_name ?? "SHAWISH");
  const currency = useAppSettingsStore((s) => s.settings?.currency ?? "EGP");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "other">("cash");
  const [memberId, setMemberId] = useState<number | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [changingCustomer, setChangingCustomer] = useState(false);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<SaleDetail | null>(null);

  const loadProducts = useCallback(async () => {
    setProducts(
      await fetchProducts({
        search: search || undefined,
        stock_status: undefined,
        include_archived: false,
      }),
    );
  }, [search]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    void fetchMembers("active").then(setMembers).catch(() => setMembers([]));
  }, []);

  const selectedMember = members.find((m) => m.id === memberId) ?? null;

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    const list = q
      ? members.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.member_code.toLowerCase().includes(q) ||
            m.phone.includes(q),
        )
      : members;
    return list.slice(0, 8);
  }, [members, memberSearch]);

  const subtotal = cart.reduce((sum, line) => sum + line.unit_price * line.quantity, 0);
  const discountValue = Math.max(0, Number(discount) || 0);
  const total = Math.max(0, subtotal - discountValue);
  const today = new Date();
  const dateLabel = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  function addToCart(product: ProductListItem) {
    if (product.is_archived) {
      setError("Archived products cannot be sold.");
      return;
    }
    if (product.quantity <= 0) {
      setError("Product is out of stock.");
      return;
    }
    setError(null);
    setCart((prev) => {
      const existing = prev.find((l) => l.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          setError("Insufficient stock.");
          return prev;
        }
        return prev.map((l) =>
          l.product_id === product.id ? { ...l, quantity: l.quantity + 1, max_qty: product.quantity } : l,
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          quantity: 1,
          unit_price: product.selling_price,
          max_qty: product.quantity,
        },
      ];
    });
  }

  async function handleBarcodeEnter() {
    const term = search.trim();
    if (!term) return;
    const found = await findProductByCode(term);
    if (found) {
      addToCart(found);
      setSearch("");
    }
  }

  async function completeSale() {
    if (cart.length === 0) {
      setError("Add at least one product.");
      return;
    }
    if (discountValue > subtotal) {
      setError("Discount cannot exceed subtotal.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const sale = await createSale({
        member_id: memberId,
        items: cart.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
        discount: discountValue,
        payment_method: paymentMethod,
      });
      setCompleted(sale);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete sale.");
    } finally {
      setSaving(false);
    }
  }

  function resetSale() {
    setCart([]);
    setDiscount("");
    setMemberId(null);
    setMemberSearch("");
    setChangingCustomer(false);
    setCompleted(null);
    setError(null);
    void loadProducts();
  }

  const sellableProducts = products.filter((p) => p.is_archived === 0 && p.quantity > 0);

  return (
    <div className="flex min-h-0 flex-col">
      <Link to="/store" className="mb-3 inline-flex items-center gap-1 text-sm text-shawish-muted hover:text-shawish-text">
        <ArrowLeft className="size-4" />Back to Store
      </Link>
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

      <div className="grid min-h-0 gap-4 lg:grid-cols-[1fr_minmax(320px,420px)]">
        <section className="min-w-0 rounded-shawish-lg border border-shawish-border bg-shawish-surface p-4">
          <Field label="Product search">
            <div className="flex items-center gap-2 rounded-shawish border border-shawish-border bg-shawish-bg px-3 py-2">
              <Search className="size-4 text-shawish-muted" />
              <input
                className="w-full bg-transparent text-sm focus:outline-none"
                placeholder="Name, product code, or barcode"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleBarcodeEnter()}
              />
            </div>
          </Field>
          <ul className="mt-3 max-h-[calc(100vh-16rem)] space-y-2 overflow-y-auto">
            {sellableProducts.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-shawish border border-shawish-border px-3 py-2"
              >
                <ProductThumbnail name={p.name} imagePath={p.image_path} className="size-12" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-shawish-muted">
                    {p.product_code}
                    {p.barcode ? ` · ${p.barcode}` : ""}
                  </p>
                  <p className="text-xs text-shawish-muted">
                    {formatMoney(p.selling_price, currency)} · {p.quantity} available
                  </p>
                </div>
                <Button variant="secondary" className="!py-1" onClick={() => addToCart(p)}>
                  <Plus className="size-3" />
                  Add
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex min-h-0 flex-col rounded-shawish-lg border border-shawish-border bg-shawish-surface p-4">
          <div className="mb-3 border-b border-shawish-border pb-3">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-shawish-orange">{gymName.toUpperCase()}</p>
            <p className="text-xs text-shawish-muted">GYM & FITNESS</p>
            <div className="mt-2 flex justify-between text-xs text-shawish-muted">
              <span>Invoice Number: assigned on complete</span>
              <span>Date: {dateLabel}</span>
            </div>
          </div>

          {selectedMember && !changingCustomer ? (
            <div className="mb-3 flex items-center gap-3 rounded-shawish border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
              <MemberAvatar name={selectedMember.name} photoPath={selectedMember.photo_path} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{selectedMember.name}</p>
                <p className="text-xs text-shawish-muted">{selectedMember.member_code}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-400">
                  <Check className="size-3" /> Selected
                </p>
              </div>
              <Button variant="ghost" className="!py-1" onClick={() => setChangingCustomer(true)}>
                Change Customer
              </Button>
            </div>
          ) : (
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{selectedMember ? "Change customer" : "Walk-in Customer"}</p>
                {selectedMember ? (
                  <button type="button" className="text-xs text-shawish-muted" onClick={() => setChangingCustomer(false)}>
                    Cancel
                  </button>
                ) : null}
              </div>
              <input
                className={inputClassName()}
                placeholder="Search member..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
              <ul className="max-h-28 space-y-1 overflow-y-auto">
                <li>
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded px-2 py-1.5 text-left text-sm hover:bg-shawish-surface-elevated",
                      memberId === null && "border border-shawish-orange/40",
                    )}
                    onClick={() => {
                      setMemberId(null);
                      setChangingCustomer(false);
                    }}
                  >
                    Walk-in Customer
                  </button>
                </li>
                {filteredMembers.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-shawish-surface-elevated"
                      onClick={() => {
                        setMemberId(m.id);
                        setChangingCustomer(false);
                        setMemberSearch("");
                      }}
                    >
                      <MemberAvatar name={m.name} photoPath={m.photo_path} size="sm" />
                      {m.name} · {m.member_code}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="shawish-scrollbar min-h-0 flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-sm text-shawish-muted">No items yet.</p>
            ) : (
              <ul className="space-y-2">
                {cart.map((line) => (
                  <li key={line.product_id} className="flex items-center gap-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{line.name}</p>
                      <p className="text-xs text-shawish-muted">{formatMoney(line.unit_price, currency)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="rounded p-1 hover:bg-shawish-bg"
                        onClick={() =>
                          setCart((c) =>
                            c
                              .map((l) =>
                                l.product_id === line.product_id && l.quantity > 1
                                  ? { ...l, quantity: l.quantity - 1 }
                                  : l,
                              )
                              .filter((l) => l.product_id !== line.product_id || l.quantity > 0),
                          )
                        }
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-6 text-center">{line.quantity}</span>
                      <button
                        type="button"
                        className="rounded p-1 hover:bg-shawish-bg"
                        onClick={() =>
                          setCart((c) =>
                            c.map((l) => {
                              if (l.product_id !== line.product_id) return l;
                              if (l.quantity >= l.max_qty) {
                                setError("Insufficient stock.");
                                return l;
                              }
                              return { ...l, quantity: l.quantity + 1 };
                            }),
                          )
                        }
                      >
                        <Plus className="size-3" />
                      </button>
                      <button type="button" className="ml-1 text-red-400" onClick={() => setCart((c) => c.filter((l) => l.product_id !== line.product_id))}>
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <span className="w-24 text-right">{formatMoney(line.unit_price * line.quantity, currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-3 space-y-2 border-t border-shawish-border pt-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(subtotal, currency)}</span></div>
            <Field label="Discount">
              <input type="number" min={0} className={inputClassName()} value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </Field>
            <div className="flex justify-between text-xl font-semibold">
              <span>TOTAL</span>
              <span>{formatMoney(total, currency)}</span>
            </div>
            <Field label="Payment">
              <select className={inputClassName()} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "cash" | "other")}>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>

          <div className="mt-3 flex gap-2">
            <Link to="/store" className="flex-1">
              <Button variant="secondary" className="w-full">Cancel</Button>
            </Link>
            <Button className="flex-1" loading={saving} onClick={() => void completeSale()}>
              Complete Sale
            </Button>
          </div>
        </section>
      </div>

      <Modal
        open={Boolean(completed)}
        title="Sale completed"
        onClose={() => completed && navigate(`/store/sales/${completed.id}`)}
        footer={
          <>
            <Button variant="secondary" onClick={() => completed && printSaleInvoice({ sale: completed, gymName, currency })}>
              <Printer className="size-4" />
              Print Invoice
            </Button>
            <Button variant="secondary" onClick={resetSale}>
              New Sale
            </Button>
            <Button onClick={() => completed && navigate(`/store/sales/${completed.id}`)}>
              Close
            </Button>
          </>
        }
      >
        {completed ? (
          <div className="space-y-2 text-center">
            <p className="text-lg font-semibold text-emerald-400">SALE COMPLETED ✓</p>
            <p>Invoice: {completed.invoice_number}</p>
            <p>
              Customer: {completed.member_name ?? "Walk-in Customer"}
              {completed.member_code ? ` · ${completed.member_code}` : ""}
            </p>
            <p className="text-2xl font-semibold">{formatMoney(completed.total, currency)}</p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
