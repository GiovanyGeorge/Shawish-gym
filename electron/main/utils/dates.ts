export function diffDaysInclusive(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

export function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Month-based subscription end date (inclusive start, end on same day-of-month when possible). */
export function addMonthsIso(startIso: string, months: number): string {
  const [y, m, d] = startIso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const targetMonth = date.getMonth() + months;
  date.setMonth(targetMonth);
  // If month rolled over (e.g. Jan 31 + 1 month), clamp to last day of target month
  if (date.getDate() !== d) {
    date.setDate(0);
  }
  return toIsoDate(date);
}
