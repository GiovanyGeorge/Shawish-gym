import type { SubscriptionPrice } from "@/types/domain";
import { ipcInvoke } from "@/services/ipc";

export function fetchSubscriptionPrices() {
  return ipcInvoke<SubscriptionPrice[]>("prices:list");
}

export function fetchAllSubscriptionPrices() {
  return ipcInvoke<SubscriptionPrice[]>("prices:listAll");
}

export function createSubscriptionPrice(durationMonths: number, price: number) {
  return ipcInvoke<SubscriptionPrice>("prices:create", {
    duration_months: durationMonths,
    price,
  });
}

export function updateSubscriptionPrice(durationMonths: number, price: number) {
  return ipcInvoke<SubscriptionPrice>("prices:update", {
    duration_months: durationMonths,
    price,
  });
}

export function setSubscriptionPriceActive(durationMonths: number, isActive: boolean) {
  return ipcInvoke<SubscriptionPrice>("prices:setActive", {
    duration_months: durationMonths,
    is_active: isActive,
  });
}
