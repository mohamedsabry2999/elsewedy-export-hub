import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

export interface BrandInfo {
  company_name: string;
  company_name_ar?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  tax_id?: string | null;
  invoice_footer?: string | null;
}

let cache: BrandInfo | null = null;
export async function getBrandInfo(): Promise<BrandInfo> {
  if (cache) return cache;
  const { data } = await supabase.from("system_settings").select("*").eq("id", "default").maybeSingle();
  cache = (data as BrandInfo) ?? { company_name: "Elsewedy Export Hub" };
  return cache;
}

function hexToRgb(hex?: string | null): [number, number, number] {
  if (!hex) return [193, 39, 45];
  const h = hex.replace("#", "");
  const b = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(b.slice(0, 2), 16), parseInt(b.slice(2, 4), 16), parseInt(b.slice(4, 6), 16)];
}

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

export interface DocLine {
  name: string; qty: number; unit?: string | null;
  price: number; discount?: number | null; total: number;
}

export interface BrandedDocOpts {
  title: string;
  docNumber: string;
  meta: Array<[string, string]>;
  lines: DocLine[];
  totals: { subtotal: number; discount: number; tax: number; total: number; currency: string };
  notes?: string | null;
  filename: string;
}

export async function generateBrandedPdf(opts: BrandedDocOpts) {
  const brand = await getBrandInfo();
  const doc = new jsPDF();
  const rgb = hexToRgb(brand.primary_color);
  const pw = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(0, 0, pw, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text(brand.company_name || "Elsewedy Export Hub", 14, 12);
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(opts.title, 14, 20);

  // Logo (right side)
  if (brand.logo_url) {
    const dataUrl = await loadImageDataUrl(brand.logo_url);
    if (dataUrl) {
      try { doc.addImage(dataUrl, "PNG", pw - 40, 4, 32, 18, undefined, "FAST"); } catch { /* ignore */ }
    }
  }

  // Company contact strip
  doc.setTextColor(60, 60, 60); doc.setFontSize(8);
  const contact = [brand.address, brand.phone, brand.email, brand.website, brand.tax_id ? `TAX: ${brand.tax_id}` : null]
    .filter(Boolean).join("  |  ");
  if (contact) doc.text(contact, 14, 32);

  // Doc info block
  doc.setTextColor(20, 20, 20); doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text(`${opts.title} #: ${opts.docNumber}`, 14, 42);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  let y = 48;
  opts.meta.forEach(([k, v], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    doc.text(`${k}: ${v}`, 14 + col * 90, y + row * 6);
  });
  const metaHeight = Math.ceil(opts.meta.length / 2) * 6;

  autoTable(doc, {
    startY: y + metaHeight + 4,
    head: [["#", "Item", "Qty", "Unit", "Price", "Disc%", "Total"]],
    body: opts.lines.map((it, i) => [
      i + 1, it.name, it.qty, it.unit ?? "", it.price.toFixed(2),
      (it.discount ?? 0).toFixed(1), it.total.toFixed(2),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: rgb, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 248] },
  });

  const endY = (doc as any).lastAutoTable.finalY + 6;
  doc.setFontSize(10);
  const rightX = pw - 70;
  doc.text(`Subtotal: ${opts.totals.subtotal.toFixed(2)}`, rightX, endY);
  doc.text(`Discount: ${opts.totals.discount.toFixed(2)}`, rightX, endY + 6);
  doc.text(`Tax: ${opts.totals.tax.toFixed(2)}`, rightX, endY + 12);
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(rightX - 4, endY + 16, 68, 10, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text(`TOTAL: ${opts.totals.total.toFixed(2)} ${opts.totals.currency}`, rightX, endY + 23);
  doc.setTextColor(20, 20, 20); doc.setFont("helvetica", "normal");

  if (opts.notes) {
    doc.setFontSize(9);
    const wrapped = doc.splitTextToSize(opts.notes, pw - 28);
    doc.text("Notes:", 14, endY);
    doc.text(wrapped, 14, endY + 5);
  }

  // Footer
  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(0, ph - 12, pw, 12, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(8);
  const footer = brand.invoice_footer || `${brand.company_name} — ${new Date().toLocaleDateString("en-GB")}`;
  doc.text(footer, 14, ph - 4);

  doc.save(opts.filename);
}

export function clearBrandCache() { cache = null; }
