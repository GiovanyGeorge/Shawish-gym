import { Dumbbell, Minus, Square, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { isElectron } from "@/utils/electron";

async function minimize() {
  if (!isElectron()) return;
  await window.shawish!.window.minimize();
}

async function toggleMaximize() {
  if (!isElectron()) return;
  await window.shawish!.window.toggleMaximize();
}

async function closeWindow() {
  if (!isElectron()) return;
  await window.shawish!.window.close();
}

type TitleBarProps = {
  className?: string;
};

export function TitleBar({ className }: TitleBarProps) {
  return (
    <div
      className={cn(
        "flex h-10 shrink-0 items-center justify-between border-b border-shawish-border bg-shawish-bg",
        className,
      )}
    >
      <div className="app-drag flex h-full flex-1 items-center gap-2 px-3 select-none">
        <Dumbbell className="size-4 text-shawish-orange" strokeWidth={2} />
        <span className="text-xs font-semibold tracking-[0.2em] text-shawish-text">
          SHAWISH
        </span>
      </div>
      <div className="app-no-drag flex h-full items-stretch">
        <WindowControl label="Minimize" onClick={minimize}>
          <Minus className="size-3.5" />
        </WindowControl>
        <WindowControl label="Maximize" onClick={toggleMaximize}>
          <Square className="size-3" />
        </WindowControl>
        <WindowControl label="Close" onClick={closeWindow} danger>
          <X className="size-3.5" />
        </WindowControl>
      </div>
    </div>
  );
}

type WindowControlProps = {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
};

function WindowControl({ children, label, onClick, danger }: WindowControlProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex w-11 items-center justify-center text-shawish-muted transition-colors duration-150 hover:bg-shawish-surface-elevated hover:text-shawish-text",
        danger && "hover:bg-red-600 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
