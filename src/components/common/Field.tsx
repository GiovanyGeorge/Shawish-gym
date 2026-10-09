import { cn } from "@/utils/cn";

type FieldProps = {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
};

export function Field({ label, error, children, className }: FieldProps) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-xs font-medium text-shawish-muted">{label}</span>
      {children}
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </label>
  );
}

export function inputClassName(className?: string) {
  return cn(
    "w-full rounded-shawish border border-shawish-border bg-shawish-bg px-3 py-2 text-sm text-shawish-text placeholder:text-shawish-muted focus:border-shawish-orange focus:outline-none",
    className,
  );
}
