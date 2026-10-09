import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { InventoryTab } from "@/pages/Store/InventoryTab";
import { MemberPurchasesTab } from "@/pages/Store/MemberPurchasesTab";
import { ProductsTab } from "@/pages/Store/ProductsTab";
import { SalesTab } from "@/pages/Store/SalesTab";
import { cn } from "@/utils/cn";

const TABS = [
  ["products", "Products"],
  ["inventory", "Inventory"],
  ["sales", "Sales"],
  ["purchases", "Member Purchases"],
] as const;

type Tab = (typeof TABS)[number][0];

function tabFromParam(value: string | null): Tab {
  if (value === "inventory" || value === "sales" || value === "purchases") return value;
  return "products";
}

export function StorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => tabFromParam(searchParams.get("tab")));

  function selectTab(next: Tab) {
    setTab(next);
    setSearchParams(next === "products" ? {} : { tab: next }, { replace: true });
  }

  return (
    <div>
      <PageHeader title="Supplements / Store" subtitle="Products, inventory, sales, and member purchases." />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === id ? "bg-shawish-orange text-white" : "bg-shawish-surface-elevated text-shawish-muted hover:text-shawish-text",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "products" ? <ProductsTab /> : null}
      {tab === "inventory" ? <InventoryTab /> : null}
      {tab === "sales" ? <SalesTab /> : null}
      {tab === "purchases" ? <MemberPurchasesTab /> : null}
    </div>
  );
}
