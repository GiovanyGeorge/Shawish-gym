import { useEffect, useState } from "react";
import { Button } from "@/components/common/Button";
import { Field, inputClassName } from "@/components/common/Field";
import { Modal } from "@/components/common/Modal";
import { ProfilePhotoPicker } from "@/components/common/ProfilePhotoPicker";
import { createProduct, updateProduct } from "@/services/storeApi";
import type { ProductCategory, ProductDetail } from "@/types/store";

type Props = {
  open: boolean;
  categories: ProductCategory[];
  editing: ProductDetail | null;
  onClose: () => void;
  onSaved: () => void;
};

export function ProductFormModal({ open, categories, editing, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: "",
    product_code: "",
    barcode: "",
    category_id: "",
    description: "",
    quantity: "0",
    minimum_stock: "0",
    purchase_price: "",
    selling_price: "",
  });
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savedPhotoPath, setSavedPhotoPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        product_code: editing.product_code,
        barcode: editing.barcode ?? "",
        category_id: String(editing.category_id ?? categories[0]?.id ?? ""),
        description: editing.description ?? "",
        quantity: String(editing.quantity),
        minimum_stock: String(editing.minimum_stock),
        purchase_price: String(editing.purchase_price ?? ""),
        selling_price: String(editing.selling_price),
      });
      setPhotoPath(editing.image_path);
      setSavedPhotoPath(editing.image_path);
      setPreviewUrl(null);
    } else {
      setForm({
        name: "",
        product_code: "",
        barcode: "",
        category_id: String(categories[0]?.id ?? ""),
        description: "",
        quantity: "0",
        minimum_stock: "0",
        purchase_price: "",
        selling_price: "",
      });
      setPhotoPath(null);
      setSavedPhotoPath(null);
      setPreviewUrl(null);
    }
    setError(null);
    // Intentionally omit `categories` so a list refresh cannot wipe a captured photo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }
    const categoryId = Number(form.category_id);
    if (!Number.isFinite(categoryId)) {
      setError("Category is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        product_code: form.product_code.trim() || undefined,
        barcode: form.barcode.trim() || null,
        category_id: categoryId,
        image_path: photoPath,
        description: form.description.trim(),
        minimum_stock: Number(form.minimum_stock) || 0,
        purchase_price: Number(form.purchase_price) || 0,
        selling_price: Number(form.selling_price) || 0,
      };
      if (editing) {
        await updateProduct({ id: editing.id, ...payload });
      } else {
        await createProduct({
          ...payload,
          quantity: Number(form.quantity) || 0,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={editing ? "Edit Product" : "Add Product"}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={() => void handleSave()}>
            Save Product
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <ProfilePhotoPicker
          label="Product image"
          folder="products"
          name={form.name || "Product"}
          photoPath={photoPath}
          previewUrl={previewUrl}
          savedPhotoPath={savedPhotoPath}
          onChange={({ photoPath: nextPath, previewUrl: nextPreview }) => {
            setPhotoPath(nextPath);
            setPreviewUrl(nextPreview);
          }}
          onError={setError}
        />
        <Field label="Product name *">
          <input className={inputClassName()} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Category *">
          <select className={inputClassName()} value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Product code">
            <input
              className={inputClassName()}
              placeholder="Auto-generated if empty"
              value={form.product_code}
              onChange={(e) => setForm((f) => ({ ...f, product_code: e.target.value }))}
              disabled={Boolean(editing)}
            />
          </Field>
          <Field label="Barcode">
            <input
              className={inputClassName()}
              placeholder="Auto-generated if empty"
              value={form.barcode}
              onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
              disabled={Boolean(editing?.barcode)}
            />
          </Field>
        </div>
        {!editing ? (
          <Field label="Initial quantity">
            <input type="number" min={0} className={inputClassName()} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
          </Field>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Minimum stock">
            <input type="number" min={0} className={inputClassName()} value={form.minimum_stock} onChange={(e) => setForm((f) => ({ ...f, minimum_stock: e.target.value }))} />
          </Field>
          <Field label="Purchase price">
            <input type="number" min={0} className={inputClassName()} value={form.purchase_price} onChange={(e) => setForm((f) => ({ ...f, purchase_price: e.target.value }))} />
          </Field>
        </div>
        <Field label="Selling price">
          <input type="number" min={0} className={inputClassName()} value={form.selling_price} onChange={(e) => setForm((f) => ({ ...f, selling_price: e.target.value }))} />
        </Field>
        <Field label="Description">
          <textarea className={inputClassName("min-h-20 resize-y")} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </Field>
      </div>
    </Modal>
  );
}
