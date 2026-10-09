export function downloadCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (rows.length === 0) {
    const blob = new Blob(["No rows"], { type: "text/csv;charset=utf-8;" });
    trigger(filename, blob);
    return;
  }
  const headers = Object.keys(rows[0]!);
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];
  trigger(filename, new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }));
}

function trigger(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
