import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/common/Button";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** Stack above other modals (e.g. camera capture). */
  layer?: "default" | "top";
};

export function Modal({ open, title, onClose, children, footer, className, layer = "default" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 flex items-start justify-center p-4 sm:items-center",
        layer === "top" ? "z-[220]" : "z-[200]",
      )}
    >
      <button
        type="button"
        aria-label="Close dialog backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shawish-modal-title"
        className={cn(
          "relative z-10 flex w-full max-w-lg min-h-0 max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-shawish-lg border border-shawish-border bg-shawish-surface shadow-2xl",
          className,
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-shawish-border px-5 py-4">
          <h2 id="shawish-modal-title" className="text-base font-semibold">
            {title}
          </h2>
          <Button variant="ghost" className="!px-2 !py-2" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
        <div className="shawish-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>
        {footer ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-shawish-border bg-shawish-surface px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
