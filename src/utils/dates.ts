export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function addMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  const day = copy.getDate();
  copy.setMonth(copy.getMonth() + months);
  if (copy.getDate() !== day) {
    copy.setDate(0);
  }
  return copy;
}

/** Month-based subscription end date from ISO start (YYYY-MM-DD). */
export function addMonthsIso(startIso: string, months: number): string {
  const start = new Date(`${startIso}T00:00:00`);
  return toIsoDate(addMonths(start, months));
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Inclusive period: 1 Oct + 1 month → 31 Oct. */
export function subscriptionEndIso(startIso: string, months: number): string {
  return addDaysIso(addMonthsIso(startIso, months), -1);
}
