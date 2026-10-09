export function isElectron(): boolean {
  return typeof window !== "undefined" && window.shawish != null;
}
