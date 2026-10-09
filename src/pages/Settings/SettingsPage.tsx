import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { HardDrive, Plus, Save } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Field, inputClassName } from "@/components/common/Field";
import { Modal } from "@/components/common/Modal";
import { ProfilePhotoPicker } from "@/components/common/ProfilePhotoPicker";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  chooseBackupFolder,
  createBackup,
  deleteBackup,
  fetchBackups,
  restoreBackup,
  type BackupRecord,
} from "@/services/backupApi";
import {
  createSubscriptionPrice,
  fetchAllSubscriptionPrices,
  setSubscriptionPriceActive,
  updateSubscriptionPrice,
} from "@/services/pricesApi";
import { fetchAppSettings, saveAppSettings, type AppSettingsMap } from "@/services/settingsApi";
import { useAppSettingsStore } from "@/stores/appSettingsStore";
import type { SubscriptionPrice } from "@/types/domain";
import { cn } from "@/utils/cn";

const NAV = [
  ["profile", "Profile"],
  ["prices", "Subscription Prices"],
  ["notifications", "Notifications"],
  ["backup", "Backup & Restore"],
  ["store", "Store"],
  ["general", "General"],
] as const;

type Tab = (typeof NAV)[number][0];

export function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (NAV.some(([id]) => id === params.get("tab")) ? params.get("tab") : "profile") as Tab;

  return (
    <div className="flex min-h-0 flex-col gap-4 lg:flex-row">
      <nav className="w-full shrink-0 rounded-shawish-lg border border-shawish-border bg-shawish-surface p-2 lg:w-52">
        <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-shawish-muted">Settings</p>
        {NAV.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setParams({ tab: id }, { replace: true })}
            className={cn(
              "mb-0.5 w-full rounded-shawish px-3 py-2 text-left text-sm",
              tab === id ? "bg-shawish-orange text-white" : "text-shawish-muted hover:bg-shawish-bg",
            )}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1">
        {tab === "profile" ? <ProfileTab /> : null}
        {tab === "prices" ? <PricesTab /> : null}
        {tab === "notifications" || tab === "backup" || tab === "general" || tab === "store" ? (
          <AppSettingsTabs tab={tab} />
        ) : null}
      </div>
    </div>
  );
}

function ProfileTab() {
  const setStore = useAppSettingsStore((s) => s.setSettings);
  const [settings, setSettings] = useState<AppSettingsMap | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savedPhotoPath, setSavedPhotoPath] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchAppSettings().then((s) => {
      setSettings(s);
      setPhotoPath(s.admin_photo || null);
      setSavedPhotoPath(s.admin_photo || null);
    });
  }, []);

  async function save(patch: Partial<AppSettingsMap>) {
    if (!settings) return;
    const saved = await saveAppSettings(patch);
    setSettings(saved);
    setStore(saved);
    setMessage("Profile saved.");
    setSavedPhotoPath(saved.admin_photo || null);
  }

  if (!settings) return <p className="text-sm text-shawish-muted">Loading profile...</p>;

  return (
    <section className="max-w-xl space-y-4 rounded-shawish-lg border border-shawish-border bg-shawish-surface p-5">
      <h2 className="text-lg font-semibold">Admin Profile</h2>
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <ProfilePhotoPicker
        label="Admin photo"
        folder="admin"
        name={settings.admin_name || "Admin"}
        photoPath={photoPath}
        previewUrl={previewUrl}
        savedPhotoPath={savedPhotoPath}
        onChange={({ photoPath: next, previewUrl: nextPreview }) => {
          setPhotoPath(next);
          setPreviewUrl(nextPreview);
        }}
        onError={setError}
      />
      <Field label="Admin name">
        <input
          className={inputClassName()}
          value={settings.admin_name}
          onChange={(e) => setSettings({ ...settings, admin_name: e.target.value })}
        />
      </Field>
      <Field label="Phone">
        <input
          className={inputClassName()}
          value={settings.admin_phone}
          onChange={(e) => setSettings({ ...settings, admin_phone: e.target.value })}
        />
      </Field>
      <Field label="Role">
        <input className={inputClassName()} value={settings.admin_role} disabled />
      </Field>
      <Button
        onClick={() =>
          void save({
            admin_name: settings.admin_name.trim() || "Admin",
            admin_phone: settings.admin_phone.trim(),
            admin_photo: photoPath ?? "",
            admin_role: "Administrator",
          })
        }
      >
        <Save className="size-4" />
        Save profile
      </Button>
    </section>
  );
}

function PricesTab() {
  const [prices, setPrices] = useState<SubscriptionPrice[]>([]);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newDuration, setNewDuration] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchAllSubscriptionPrices();
      setPrices(rows);
      setDraft(Object.fromEntries(rows.map((p) => [p.duration_months, String(p.price)])));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function savePrice(durationMonths: number) {
    const value = Number(draft[durationMonths]);
    if (!Number.isFinite(value) || value < 0) {
      setError("Enter a valid price (zero or greater).");
      return;
    }
    setSavingId(durationMonths);
    setMessage(null);
    setError(null);
    try {
      await updateSubscriptionPrice(durationMonths, value);
      setMessage("Price saved. Historical subscriptions keep their original paid price.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save price.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Subscription Prices</h2>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add duration
        </Button>
      </div>
      <p className="mb-4 text-xs text-shawish-muted">
        Active prices appear when adding or renewing members. Old subscriptions keep the price paid at the time.
      </p>
      {loading ? (
        <p className="text-sm text-shawish-muted">Loading prices...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {prices.map((price) => (
            <article key={price.id} className="rounded-shawish-lg border border-shawish-border bg-shawish-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">{price.label}</h3>
                <StatusBadge variant={price.is_active ? "success" : "neutral"}>
                  {price.is_active ? "ACTIVE" : "Inactive"}
                </StatusBadge>
              </div>
              <Field label="Price (EGP)">
                <input
                  className={inputClassName()}
                  type="number"
                  min={0}
                  disabled={!price.is_active}
                  value={draft[price.duration_months] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [price.duration_months]: e.target.value }))}
                />
              </Field>
              <div className="mt-3 flex gap-2">
                <Button
                  className="flex-1"
                  loading={savingId === price.duration_months}
                  disabled={!price.is_active}
                  onClick={() => void savePrice(price.duration_months)}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void setSubscriptionPriceActive(price.duration_months, !price.is_active).then(load)}
                >
                  {price.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {message ? <p className="mt-4 text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      <Modal
        open={addOpen}
        title="Add subscription duration"
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              loading={adding}
              onClick={() =>
                void (async () => {
                  setAdding(true);
                  try {
                    await createSubscriptionPrice(Number(newDuration), Number(newPrice));
                    setAddOpen(false);
                    await load();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Unable to add duration.");
                  } finally {
                    setAdding(false);
                  }
                })()
              }
            >
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Duration (months)">
            <input type="number" className={inputClassName()} value={newDuration} onChange={(e) => setNewDuration(e.target.value)} />
          </Field>
          <Field label="Price (EGP)">
            <input type="number" className={inputClassName()} value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function AppSettingsTabs({ tab }: { tab: Tab }) {
  const setStore = useAppSettingsStore((s) => s.setSettings);
  const [settings, setSettings] = useState<AppSettingsMap | null>(null);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [restorePath, setRestorePath] = useState<string | null>(null);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [savedLogo, setSavedLogo] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = await fetchAppSettings();
    setSettings(s);
    setStore(s);
    setLogoPath(s.gym_logo || null);
    setSavedLogo(s.gym_logo || null);
    setBackups(await fetchBackups());
  }, [setStore]);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Unable to load settings."));
  }, [load]);

  async function patch(next: Partial<AppSettingsMap>) {
    const saved = await saveAppSettings(next);
    setSettings(saved);
    setStore(saved);
    setMessage("Settings saved.");
  }

  if (!settings) return <p className="text-sm text-shawish-muted">Loading...</p>;

  return (
    <div className="max-w-3xl space-y-4">
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {tab === "notifications" ? (
        <section className="space-y-3 rounded-shawish-lg border border-shawish-border bg-shawish-surface p-6">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <Field label="Subscription expiry warning (days)">
            <input
              type="number"
              min={1}
              className={inputClassName("max-w-xs")}
              value={settings.expiry_warning_days}
              onChange={(e) => void patch({ expiry_warning_days: Number(e.target.value) || 7 })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.notify_subscriptions} onChange={(e) => void patch({ notify_subscriptions: e.target.checked })} />
            Subscription notifications
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.notify_low_stock} onChange={(e) => void patch({ notify_low_stock: e.target.checked })} />
            Low-stock notifications
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.notify_out_of_stock} onChange={(e) => void patch({ notify_out_of_stock: e.target.checked })} />
            Out-of-stock notifications
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.notify_backup} onChange={(e) => void patch({ notify_backup: e.target.checked })} />
            Backup notifications
          </label>
        </section>
      ) : null}

      {tab === "store" ? (
        <section className="space-y-3 rounded-shawish-lg border border-shawish-border bg-shawish-surface p-6">
          <h2 className="text-lg font-semibold">Store</h2>
          <p className="text-sm text-shawish-muted">
            Product codes (SUP-000001) and barcodes are generated automatically and never change after a product is created.
            Add stock and backups from Inventory and Backup settings.
          </p>
          <Field label="Currency">
            <input
              className={inputClassName("max-w-xs")}
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              onBlur={() => void patch({ currency: settings.currency || "EGP" })}
            />
          </Field>
        </section>
      ) : null}

      {tab === "general" ? (
        <section className="space-y-3 rounded-shawish-lg border border-shawish-border bg-shawish-surface p-6">
          <h2 className="text-lg font-semibold">General</h2>
          <ProfilePhotoPicker
            label="Gym logo"
            folder="gym"
            name={settings.gym_name || "SHAWISH"}
            photoPath={logoPath}
            previewUrl={logoPreview}
            savedPhotoPath={savedLogo}
            onChange={({ photoPath: next, previewUrl: nextPreview }) => {
              setLogoPath(next);
              setLogoPreview(nextPreview);
            }}
            onError={setError}
          />
          <Button variant="secondary" onClick={() => void patch({ gym_logo: logoPath ?? "" })}>
            Save logo
          </Button>
          <Field label="Gym name">
            <input
              className={inputClassName()}
              value={settings.gym_name}
              onChange={(e) => setSettings({ ...settings, gym_name: e.target.value })}
              onBlur={() => void patch({ gym_name: settings.gym_name || "SHAWISH Gym" })}
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputClassName()}
              value={settings.gym_phone}
              onChange={(e) => setSettings({ ...settings, gym_phone: e.target.value })}
              onBlur={() => void patch({ gym_phone: settings.gym_phone })}
            />
          </Field>
          <Field label="Address">
            <input
              className={inputClassName()}
              value={settings.gym_address}
              onChange={(e) => setSettings({ ...settings, gym_address: e.target.value })}
              onBlur={() => void patch({ gym_address: settings.gym_address })}
            />
          </Field>
          <Field label="Currency">
            <input
              className={inputClassName("max-w-xs")}
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              onBlur={() => void patch({ currency: settings.currency || "EGP" })}
            />
          </Field>
        </section>
      ) : null}

      {tab === "backup" ? (
        <section className="space-y-4 rounded-shawish-lg border border-shawish-border bg-shawish-surface p-6">
          <h2 className="text-lg font-semibold">Backup & Restore</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.auto_backup_enabled} onChange={(e) => void patch({ auto_backup_enabled: e.target.checked })} />
            Automatic backup
          </label>
          <Field label="Frequency">
            <select
              className={inputClassName("max-w-xs")}
              value={settings.auto_backup_frequency}
              onChange={(e) => void patch({ auto_backup_frequency: e.target.value as "daily" | "weekly" })}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </Field>
          <Field label="Retention (number of backups)">
            <input
              type="number"
              min={1}
              className={inputClassName("max-w-xs")}
              value={settings.backup_retention}
              onChange={(e) => void patch({ backup_retention: Number(e.target.value) || 7 })}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                void chooseBackupFolder().then((folder) => {
                  if (folder) return patch({ backup_location: folder });
                })
              }
            >
              Choose backup folder
            </Button>
            <Button
              loading={busy}
              onClick={() =>
                void (async () => {
                  setBusy(true);
                  try {
                    await createBackup();
                    await load();
                    setMessage("Backup created.");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Backup failed.");
                  } finally {
                    setBusy(false);
                  }
                })()
              }
            >
              <HardDrive className="size-4" />
              Create Backup
            </Button>
          </div>
          <p className="text-xs text-shawish-muted">Location: {settings.backup_location || "Default local backups folder"}</p>
          <h4 className="pt-2 text-sm font-semibold">Backup history</h4>
          {backups.length === 0 ? (
            <p className="text-sm text-shawish-muted">No backups yet.</p>
          ) : (
            <ul className="space-y-2">
              {backups.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-shawish border border-shawish-border px-3 py-2 text-sm">
                  <span>
                    {b.folder_name} · {b.status}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="secondary" className="!py-1" onClick={() => setRestorePath(b.folder_path)}>
                      Restore
                    </Button>
                    <Button variant="ghost" className="!py-1" onClick={() => void deleteBackup(b.id).then(load)}>
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <Modal
        open={Boolean(restorePath)}
        title="Restore backup?"
        onClose={() => setRestorePath(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRestorePath(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() =>
                void (async () => {
                  if (!restorePath) return;
                  setBusy(true);
                  try {
                    await restoreBackup(restorePath);
                    setRestorePath(null);
                    setMessage("Backup restored. Restart SHAWISH if screens look stale.");
                    await load();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Restore failed.");
                  } finally {
                    setBusy(false);
                  }
                })()
              }
            >
              Replace current data
            </Button>
          </>
        }
      >
        <p className="text-sm text-shawish-muted">
          Restoring a backup will replace current application data. This cannot be undone except by restoring another backup.
        </p>
      </Modal>
    </div>
  );
}
