// CSV utilities for import/export

export function toCSV(rows: Record<string, any>[], columns?: string[]): string {
  if (!rows.length) return "";
  const cols = columns ?? Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") v = JSON.stringify(v);
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.join(",");
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n");
  // BOM for Excel Arabic support
  return "\uFEFF" + header + "\n" + body;
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseCSV(text: string): Record<string, string>[] {
  // strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* ignore */ }
      else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  if (!rows.length) return [];
  const header = rows.shift()!.map((h) => h.trim());
  return rows
    .filter((r) => r.some((v) => v && v.length))
    .map((r) => {
      const o: Record<string, string> = {};
      header.forEach((h, i) => (o[h] = r[i] ?? ""));
      return o;
    });
}
