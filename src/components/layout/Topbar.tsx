import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { MemberAvatar } from "@/components/members/MemberAvatar";
import { ROUTE_TITLES } from "@/constants/navigation";
import { useAppSettingsStore } from "@/stores/appSettingsStore";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/utils/cn";

export function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const meta = resolveTitle(location.pathname);
  const { notificationsOpen, setNotificationsOpen, unreadCount } = useUiStore();
  const settings = useAppSettingsStore((s) => s.settings);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const adminName = settings?.admin_name || "Admin";
  const adminRole = settings?.admin_role || "Administrator";

  return (
    <header className="relative z-20 flex h-12 shrink-0 items-center gap-4 border-b border-shawish-border bg-shawish-bg px-5">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold">{meta.title}</h2>
        {meta.subtitle ? (
          <p className="truncate text-[11px] text-shawish-muted">{meta.subtitle}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setNotificationsOpen(!notificationsOpen)}
          className={cn(
            "relative rounded-shawish p-2 text-shawish-muted transition-colors hover:bg-shawish-surface hover:text-shawish-text",
            notificationsOpen && "bg-shawish-surface text-shawish-orange",
          )}
          title="Notifications"
        >
          <Bell className="size-[18px]" />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-shawish-danger text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          ) : null}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex max-h-10 items-center gap-2 rounded-shawish-lg border border-shawish-border bg-shawish-surface py-1 pl-1 pr-2"
          >
            <MemberAvatar name={adminName} photoPath={settings?.admin_photo || null} size="sm" />
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold leading-none">{adminName}</p>
              <p className="mt-0.5 text-[10px] text-shawish-muted">{adminRole}</p>
            </div>
            <ChevronDown className="size-3.5 text-shawish-muted" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-shawish border border-shawish-border bg-shawish-surface py-1 shadow-lg">
              <MenuItem
                icon={UserRound}
                label="Profile"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/settings?tab=profile");
                }}
              />
              <MenuItem
                icon={Settings}
                label="Settings"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/settings");
                }}
              />
              <MenuItem
                icon={UserRound}
                label="Change Profile"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/settings?tab=profile");
                }}
              />
              <MenuItem
                icon={LogOut}
                label="Logout"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/");
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function resolveTitle(pathname: string): { title: string; subtitle?: string } {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]!;
  if (pathname.startsWith("/members")) return ROUTE_TITLES["/members"]!;
  if (pathname.startsWith("/store")) return ROUTE_TITLES["/store"]!;
  if (pathname.startsWith("/private-training")) return ROUTE_TITLES["/private-training"]!;
  return { title: "SHAWISH" };
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof UserRound;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-shawish-surface-elevated"
      onClick={onClick}
    >
      <Icon className="size-4 text-shawish-muted" />
      {label}
    </button>
  );
}
