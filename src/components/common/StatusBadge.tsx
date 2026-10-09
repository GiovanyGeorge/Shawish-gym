import { cn } from "@/utils/cn";

export type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "orange" | "info";

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  danger: "bg-red-500/15 text-red-400 border-red-500/30",
  neutral: "bg-shawish-surface-elevated text-shawish-muted border-shawish-border",
  orange: "bg-shawish-orange-muted text-shawish-orange border-shawish-orange/30",
  info: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

type StatusBadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

export function StatusBadge({
  children,
  variant = "neutral",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
