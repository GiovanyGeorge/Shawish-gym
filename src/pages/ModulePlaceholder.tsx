import { Plus } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ROUTE_TITLES } from "@/constants/navigation";

type ModulePlaceholderProps = {
  path: string;
  actionLabel?: string;
};

export function ModulePlaceholder({ path, actionLabel }: ModulePlaceholderProps) {
  const meta = ROUTE_TITLES[path];

  return (
    <div>
      <PageHeader title={meta?.title ?? "Module"} subtitle={meta?.subtitle} />
      <EmptyState
        title={`${meta?.title ?? "Module"} coming in the next phase`}
        description="Navigation, layout, and database foundation are ready. Feature screens will be implemented according to the SHAWISH specification."
        action={
          actionLabel ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-shawish bg-shawish-orange px-4 py-2 text-sm font-medium text-white opacity-80"
              disabled
            >
              <Plus className="size-4" />
              {actionLabel}
            </button>
          ) : undefined
        }
      />
    </div>
  );
}
