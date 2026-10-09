import { cn } from "@/utils/cn";

type ScrollableFormPanelProps = {
  children: React.ReactNode;
  footer: React.ReactNode;
  className?: string;
};

/** Page-level form shell: scrollable body + sticky footer within the app viewport. */
export function ScrollableFormPanel({ children, footer, className }: ScrollableFormPanelProps) {
  return (
    <div
      className={cn(
        "flex max-h-[min(calc(100dvh-10rem),900px)] min-h-0 w-full max-w-3xl flex-col overflow-hidden rounded-shawish-lg border border-shawish-border bg-shawish-surface",
        className,
      )}
    >
      <div className="shawish-scrollbar min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
      <div className="flex shrink-0 gap-2 border-t border-shawish-border bg-shawish-surface px-6 py-4">
        {footer}
      </div>
    </div>
  );
}
