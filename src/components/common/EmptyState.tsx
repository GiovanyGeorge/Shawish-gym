import { cn } from "@/utils/cn";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-shawish-lg border border-dashed border-shawish-border bg-shawish-surface/50 px-8 py-16 text-center",
        className,
      )}
    >
      <h3 className="text-base font-semibold text-shawish-text">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-shawish-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
