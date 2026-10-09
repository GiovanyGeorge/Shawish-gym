import { cn } from "@/utils/cn";

type FilterTabsProps<T extends string> = {
  items: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function FilterTabs<T extends string>({ items, value, onChange }: FilterTabsProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            value === item.id
              ? "bg-shawish-orange text-white"
              : "bg-shawish-surface-elevated text-shawish-muted hover:text-shawish-text",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
