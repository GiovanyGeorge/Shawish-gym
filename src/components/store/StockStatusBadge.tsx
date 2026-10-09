import { StatusBadge } from "@/components/common/StatusBadge";
import type { StockStatus } from "@/types/store";

export function StockStatusBadge({ status }: { status: StockStatus }) {
  if (status === "out") {
    return <StatusBadge variant="danger">Out of Stock</StatusBadge>;
  }
  if (status === "low") {
    return <StatusBadge variant="warning">Low Stock</StatusBadge>;
  }
  return <StatusBadge variant="success">In Stock</StatusBadge>;
}
