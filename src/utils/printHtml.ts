export async function printHtml(title: string, body: string): Promise<void> {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; background: #e8e8e8; }
    .toolbar {
      position: sticky; top: 0; display: flex; gap: 8px; justify-content: flex-end;
      padding: 10px 16px; background: #111; color: #fff;
    }
    .toolbar button {
      border: 0; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-weight: 600;
    }
    .print-btn { background: #ea580c; color: #fff; }
    .close-btn { background: #333; color: #fff; }
    .sheet { max-width: 800px; margin: 24px auto; background: #fff; padding: 24px; min-height: 200px; }
    h1, h2, p { margin: 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #ddd; font-size: 12px; }
    th { text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; color: #555; }
    .muted { color: #666; font-size: 12px; }
    .accent { color: #ea580c; }
    @media print {
      body { background: #fff; }
      .toolbar { display: none !important; }
      .sheet { margin: 0; max-width: none; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="print-btn" onclick="window.print()">Print</button>
    <button class="close-btn" onclick="window.close()">Close</button>
  </div>
  <div class="sheet">${body}</div>
</body>
</html>`;

  if (window.shawish?.print?.open) {
    await window.shawish.print.open({ title, html });
    return;
  }

  const popup = window.open("", "_blank", "width=860,height=980");
  if (!popup) return;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
