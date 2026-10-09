import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "@/services/notificationsApi";
import { cn } from "@/utils/cn";

const FILTERS = ["All", "Members", "Attendance", "Sales", "System"] as const;

type NotificationsPanelProps = {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
};

export function NotificationsPanel({ open, onClose, onChanged }: NotificationsPanelProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [rows, setRows] = useState<NotificationRow[]>([]);

  async function load() {
    setRows(await fetchNotifications("all"));
  }

  useEffect(() => {
    if (!open) return;
    void load().catch(() => setRows([]));
  }, [open]);

  const visible = useMemo(() => {
    if (filter === "All") return rows;
    return rows.filter((r) => r.category === filter);
  }, [rows, filter]);

  if (!open) return null;

  async function handleRead(row: NotificationRow) {
    if (!row.is_read) await markNotificationRead(row.id);
    onChanged?.();
    await load();
    if (row.related_path) {
      navigate(row.related_path);
      onClose();
    }
  }

  return (
    <>
      <button type="button" aria-label="Close notifications" className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <aside className="fixed right-0 top-10 z-50 flex h-[calc(100%-2.5rem)] w-[380px] flex-col border-l border-shawish-border bg-shawish-surface shadow-2xl page-enter">
        <div className="flex items-center justify-between border-b border-shawish-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-shawish-orange" />
            <h2 className="text-sm font-semibold">Notifications</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-shawish p-2 text-shawish-muted hover:bg-shawish-surface-elevated hover:text-shawish-text"
              title="Mark all as read"
              onClick={() => void markAllNotificationsRead().then(() => { onChanged?.(); return load(); })}
            >
              <CheckCheck className="size-4" />
            </button>
            <button type="button" onClick={onClose} className="rounded-shawish p-2 text-shawish-muted hover:bg-shawish-surface-elevated hover:text-shawish-text" title="Close">
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-shawish-border px-4 py-3">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === item ? "bg-shawish-orange text-white" : "bg-shawish-surface-elevated text-shawish-muted hover:text-shawish-text",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="shawish-scrollbar flex-1 overflow-y-auto p-4">
          {visible.length === 0 ? (
            <div className="rounded-shawish-lg border border-dashed border-shawish-border px-4 py-10 text-center">
              <StatusBadge variant="neutral" className="mb-3">No alerts yet</StatusBadge>
              <p className="text-sm text-shawish-muted">Membership, stock, attendance, and system events will appear here.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {visible.map((row) => (
                <li key={row.id} className={cn("rounded-shawish border border-shawish-border p-3", !row.is_read && "border-shawish-orange/40")}>
                  <button type="button" className="w-full text-left" onClick={() => void handleRead(row)}>
                    <p className="text-sm font-medium">{row.title}</p>
                    {row.body ? <p className="mt-1 text-xs text-shawish-muted">{row.body}</p> : null}
                    <p className="mt-1 text-[10px] text-shawish-muted">{row.created_at.replace("T", " ").slice(0, 16)}</p>
                  </button>
                  <button
                    type="button"
                    className="mt-2 text-xs text-red-400"
                    onClick={() => void deleteNotification(row.id).then(() => { onChanged?.(); return load(); })}
                  >
                    <Trash2 className="mr-1 inline size-3" />
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
