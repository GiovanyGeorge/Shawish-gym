import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

type Accent = "orange" | "yellow" | "green" | "red" | "neutral";

const accentClass: Record<Accent, string> = {
  orange: "bg-shawish-orange-muted text-shawish-orange",
  yellow: "bg-amber-500/15 text-amber-300",
  green: "bg-emerald-500/15 text-emerald-400",
  red: "bg-red-500/15 text-red-400",
  neutral: "bg-white/5 text-shawish-muted",
};

type StatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  className?: string;
  accent?: Accent;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  className,
  accent = "orange",
}: StatCardProps) {
  return (
    <article
      className={cn(
        "rounded-shawish-lg border border-shawish-border bg-shawish-surface p-4 transition-colors duration-200 hover:border-shawish-orange/25",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-shawish-muted">{label}</p>
          <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight">{value}</p>
          {hint ? <p className="mt-1 text-xs text-shawish-muted">{hint}</p> : null}
        </div>
        <div className={cn("rounded-shawish p-2", accentClass[accent])}>
          <Icon className="size-4" strokeWidth={1.75} />
        </div>
      </div>
    </article>
  );
}
