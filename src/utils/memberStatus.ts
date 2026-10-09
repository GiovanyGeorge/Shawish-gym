import type { MemberListItem } from "@/types/domain";
import type { BadgeVariant } from "@/components/common/StatusBadge";

export function memberStatusVariant(
  status: MemberListItem["display_status"],
): BadgeVariant {
  switch (status) {
    case "active":
      return "success";
    case "expiring":
      return "warning";
    case "expired":
      return "danger";
    case "paused":
      return "neutral";
    default:
      return "neutral";
  }
}

export function memberStatusLabel(status: MemberListItem["display_status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
