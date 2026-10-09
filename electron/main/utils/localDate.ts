/** Local calendar date YYYY-MM-DD (not UTC). */
export function localTodayIso(): string {
  const d = new Date();
  return toLocalIsoDate(d);
}

export function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 0 = Sunday … 6 = Saturday (matches JavaScript Date.getDay()). */
export function localWeekdayFromIso(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function diffLocalDays(startIso: string, endIso: string): number {
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}
