import { cn } from "@/utils/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
};

const variants = {
  primary:
    "bg-shawish-orange text-white hover:bg-shawish-orange-hover disabled:opacity-60",
  secondary:
    "border border-shawish-border bg-shawish-surface text-shawish-text hover:border-shawish-orange/40",
  ghost: "text-shawish-muted hover:bg-shawish-surface-elevated hover:text-shawish-text",
  danger: "bg-red-600 text-white hover:bg-red-500",
};

export function Button({
  className,
  variant = "primary",
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-shawish px-4 py-2 text-sm font-medium transition-colors duration-150",
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Saving..." : children}
    </button>
  );
}
