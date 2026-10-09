import { Outlet, useLocation } from "react-router-dom";
import { useCallback, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TitleBar } from "@/components/layout/TitleBar";
import { Topbar } from "@/components/layout/Topbar";
import { NotificationsPanel } from "@/components/layout/NotificationsPanel";
import { fetchUnreadCount, scanNotifications } from "@/services/notificationsApi";
import { useAppSettingsStore } from "@/stores/appSettingsStore";
import { useUiStore } from "@/stores/uiStore";
import { isElectron } from "@/utils/electron";

export function AppShell() {
  const location = useLocation();
  const { notificationsOpen, setNotificationsOpen, unsavedChanges, setUnreadCount } =
    useUiStore();
  const loadSettings = useAppSettingsStore((s) => s.loadSettings);

  const refreshUnread = useCallback(() => {
    if (!isElectron()) return;
    void fetchUnreadCount().then(setUnreadCount).catch(() => setUnreadCount(0));
  }, [setUnreadCount]);

  useEffect(() => {
    setNotificationsOpen(false);
  }, [location.pathname, setNotificationsOpen]);

  useEffect(() => {
    if (!isElectron()) return;
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!isElectron()) return;
    void scanNotifications().finally(refreshUnread);
    const t = window.setInterval(refreshUnread, 60000);
    return () => window.clearInterval(t);
  }, [refreshUnread]);

  useEffect(() => {
    if (!isElectron()) return;

    return window.shawish!.onCloseRequested(async () => {
      if (!unsavedChanges) return true;
      return window.confirm(
        "You have unsaved changes.\nAre you sure you want to close SHAWISH?",
      );
    });
  }, [unsavedChanges]);

  return (
    <div className="flex h-full flex-col bg-shawish-bg">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="shawish-scrollbar relative z-0 min-h-0 flex-1 overflow-y-auto p-6">
            <div key={location.pathname} className="page-enter mx-auto max-w-[1600px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <NotificationsPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onChanged={refreshUnread}
      />
    </div>
  );
}
