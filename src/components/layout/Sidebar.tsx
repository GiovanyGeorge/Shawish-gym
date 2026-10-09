import { NavLink } from "react-router-dom";
import { Dumbbell } from "lucide-react";
import { MAIN_NAV } from "@/constants/navigation";
import { useAppSettingsStore } from "@/stores/appSettingsStore";
import { useMemberPhotoUrl } from "@/hooks/useMemberPhotoUrl";
import { cn } from "@/utils/cn";

export function Sidebar() {
  const settings = useAppSettingsStore((s) => s.settings);
  const gymName = settings?.gym_name || "SHAWISH";
  const logoUrl = useMemberPhotoUrl(settings?.gym_logo || null);

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-shawish-border bg-shawish-surface">
      <div className="border-b border-shawish-border px-4 py-4">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="size-10 rounded-shawish object-cover" />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-shawish bg-shawish-orange-muted">
              <Dumbbell className="size-5 text-shawish-orange" strokeWidth={2} />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-wide">{gymName.toUpperCase()}</p>
            <p className="text-[11px] text-shawish-muted">Gym & Fitness</p>
          </div>
        </div>
      </div>

      <nav className="shawish-scrollbar flex-1 space-y-1 overflow-y-auto p-3">
        {MAIN_NAV.map(({ id, label, path, icon: Icon }) => (
          <NavLink
            key={id}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-shawish px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-shawish-orange text-white shadow-sm shadow-shawish-orange/20"
                  : "text-shawish-muted hover:bg-shawish-surface-elevated hover:text-shawish-text",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    "size-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105",
                    isActive ? "text-white" : "text-shawish-muted group-hover:text-shawish-orange",
                  )}
                  strokeWidth={1.75}
                />
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-shawish-border px-4 py-3">
        <p className="text-center text-[10px] font-semibold tracking-[0.14em] text-shawish-muted">
          STRONGER EVERY DAY.
        </p>
        <p className="mt-1 text-center text-[9px] tracking-wide text-shawish-muted/70">
          SHAWISH GYM MANAGEMENT
        </p>
      </div>
    </aside>
  );
}
