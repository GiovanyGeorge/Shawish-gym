export function formatMoney(amount: number, currency = "EGP"): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}
