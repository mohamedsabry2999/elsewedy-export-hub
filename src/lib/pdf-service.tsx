// Polyfill Buffer for @react-pdf/renderer (fontkit uses Buffer internally).
import { Buffer as BufferPolyfill } from "buffer";
if (typeof globalThis !== "undefined" && !(globalThis as any).Buffer) {
  (globalThis as any).Buffer = BufferPolyfill;
}

import { Document, Page, Text, View, StyleSheet, Font, Image, pdf } from "@react-pdf/renderer";
import cairoRegular from "@/assets/cairo-regular.ttf.asset.json";
import cairoBold from "@/assets/cairo-bold.ttf.asset.json";
import logoFullFallback from "@/assets/elsewedy-logo.png.asset.json";
import type { BrandInfo } from "@/components/BrandingProvider";

// Register Arabic-capable font once (idempotent) and fully preload the TTF
// bytes before the first render so react-pdf's layout has font metrics ready.
// Cairo covers Arabic + Latin + numerals and works cleanly with fontkit's
// OpenType layout (unlike Noto Naskh Arabic, which crashes in bidi reorder).
let fontPromise: Promise<void> | null = null;
async function ensureFont() {
  if (fontPromise) return fontPromise;
  fontPromise = (async () => {
    const loadOne = async (url: string): Promise<string> => {
      try {
        const res = await fetch(url);
        if (res.ok) return URL.createObjectURL(await res.blob());
      } catch { /* noop */ }
      return url;
    };
    const [regSrc, boldSrc] = await Promise.all([
      loadOne(cairoRegular.url),
      loadOne(cairoBold.url),
    ]);
    Font.register({
      family: "AppArabic",
      fonts: [
        { src: regSrc, fontWeight: 400 },
        { src: boldSrc, fontWeight: 700 },
      ],
    });
    Font.registerHyphenationCallback((word) => [word]);
  })();
  return fontPromise;
}

/** Strip characters unlikely to be in NotoNaskhArabic-Regular to keep the
 *  bidi engine from failing on missing glyphs. */
function safeText(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/[•·]/g, "-")
    .replace(/[—–]/g, "-");
}

/** Try to load logo as data URL; fall back to bundled logo; null if all fail. */
async function resolvePdfLogo(url: string | null | undefined): Promise<string | null> {
  const candidates = [url, logoFullFallback.url].filter(Boolean) as string[];
  for (const c of candidates) {
    try {
      const res = await fetch(c);
      if (!res.ok) continue;
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    } catch {
      // try next
    }
  }
  return null;
}

export interface PdfLine {
  name: string;
  qty: number;
  unit?: string | null;
  price: number;
  discount?: number | null;
  total: number;
  specs?: string | null;
}

export interface PdfDocOptions {
  brand: BrandInfo;
  titleAr: string;
  titleEn: string;
  docNumber: string;
  meta: Array<{ labelAr: string; labelEn: string; value: string }>;
  lines: PdfLine[];
  totals: { subtotal: number; discount: number; tax: number; total: number; currency: string };
  notes?: string | null;
  filename: string;
}

function hexToRgb(hex?: string | null): string {
  return hex && /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#C1272D";
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "AppArabic",
    fontSize: 9,
    paddingTop: 100,
    paddingBottom: 60,
    paddingHorizontal: 30,
    color: "#1a1a1a",
  },
  header: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    padding: 16,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    color: "white",
  },
  brandBlock: { flexDirection: "column", alignItems: "flex-end" },
  brandName: { fontSize: 14, fontWeight: 700 },
  brandTitle: { fontSize: 10, marginTop: 3 },
  logo: { width: 70, height: 45, objectFit: "contain", backgroundColor: "white", padding: 4, borderRadius: 4 },
  contactStrip: {
    fontSize: 7,
    textAlign: "right",
    color: "#555",
    marginBottom: 12,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderColor: "#ccc",
  },
  docInfo: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  docNumber: { fontSize: 12, fontWeight: 700 },
  metaBox: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: "#f7f7f7",
    borderRadius: 4,
  },
  metaRow: { flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 3 },
  metaLabel: { fontWeight: 700, fontSize: 8, color: "#555" },
  metaVal: { fontSize: 9 },
  table: { marginTop: 6, borderWidth: 0.5, borderColor: "#ccc", borderRadius: 3 },
  tHead: { flexDirection: "row-reverse", color: "white", paddingVertical: 5, paddingHorizontal: 4, fontSize: 8, fontWeight: 700 },
  tRow: { flexDirection: "row-reverse", paddingVertical: 4, paddingHorizontal: 4, borderTopWidth: 0.3, borderColor: "#e5e5e5" },
  tRowAlt: { backgroundColor: "#fafafa" },
  cIdx: { width: "5%", textAlign: "center" },
  cName: { width: "40%", textAlign: "right", paddingHorizontal: 3 },
  cQty: { width: "10%", textAlign: "center" },
  cUnit: { width: "10%", textAlign: "center" },
  cPrice: { width: "12%", textAlign: "center" },
  cDisc: { width: "8%", textAlign: "center" },
  cTotal: { width: "15%", textAlign: "center", fontWeight: 700 },
  totalsBlock: { marginTop: 10, alignSelf: "flex-start", width: 200 },
  totalRow: { flexDirection: "row-reverse", justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 6, fontSize: 9 },
  grandTotal: { color: "white", fontSize: 11, fontWeight: 700, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 3, marginTop: 4 },
  notesBox: { marginTop: 14, padding: 8, backgroundColor: "#fff8f0", borderRightWidth: 3, borderColor: "#C1272D" },
  notesTitle: { fontWeight: 700, marginBottom: 3, fontSize: 9 },
  notes: { fontSize: 8, lineHeight: 1.6 },
  footer: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    padding: 10,
    color: "white",
    fontSize: 7,
    textAlign: "center",
  },
  pageNo: { position: "absolute", bottom: 8, right: 20, color: "white", fontSize: 7 },
});

function BrandedDoc({
  brand, titleAr, titleEn, docNumber, meta, lines, totals, notes,
}: Omit<PdfDocOptions, "filename">) {
  const primary = hexToRgb(brand.primary_color);
  const nameAr = safeText(brand.company_name_ar || brand.company_name);
  const nameEn = safeText(brand.company_name);
  const contact = safeText(
    [brand.address, brand.phone, brand.email, brand.website, brand.tax_id ? `الرقم الضريبي: ${brand.tax_id}` : null]
      .filter(Boolean).join("   -   ")
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[styles.header, { backgroundColor: primary }]} fixed>
          <View style={styles.brandBlock}>
            <Text style={styles.brandName}>{nameAr}</Text>
            <Text style={styles.brandTitle}>{nameEn}</Text>
            <Text style={{ fontSize: 9, marginTop: 4 }}>{safeText(titleAr)}  /  {safeText(titleEn)}</Text>
          </View>
          {brand.logo_url && (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={brand.logo_url} style={styles.logo} />
          )}
        </View>

        {contact ? <Text style={styles.contactStrip}>{contact}</Text> : null}

        <View style={styles.docInfo}>
          <Text style={styles.docNumber}>#{safeText(docNumber)}</Text>
          <Text style={{ fontSize: 9, color: "#555" }}>
            {new Date().toLocaleDateString("ar-EG")}
          </Text>
        </View>

        <View style={styles.metaBox}>
          {meta.map((m, i) => (
            <View key={i} style={styles.metaRow}>
              <Text style={styles.metaLabel}>{safeText(m.labelAr)} / {safeText(m.labelEn)}</Text>
              <Text style={styles.metaVal}>{safeText(m.value) || "-"}</Text>
            </View>
          ))}
        </View>

        <View style={styles.table}>
          <View style={[styles.tHead, { backgroundColor: primary }]} fixed>
            <Text style={styles.cIdx}>#</Text>
            <Text style={styles.cName}>الصنف / Item</Text>
            <Text style={styles.cQty}>الكمية</Text>
            <Text style={styles.cUnit}>الوحدة</Text>
            <Text style={styles.cPrice}>السعر</Text>
            <Text style={styles.cDisc}>خصم%</Text>
            <Text style={styles.cTotal}>الإجمالي</Text>
          </View>
          {lines.map((it, i) => (
            <View key={i} style={[styles.tRow, i % 2 ? styles.tRowAlt : {}]} wrap={false}>
              <Text style={styles.cIdx}>{i + 1}</Text>
              <View style={styles.cName}>
                <Text>{safeText(it.name)}</Text>
                {it.specs ? <Text style={{ fontSize: 7, color: "#666", marginTop: 2 }}>{safeText(it.specs)}</Text> : null}
              </View>
              <Text style={styles.cQty}>{it.qty}</Text>
              <Text style={styles.cUnit}>{safeText(it.unit) || "-"}</Text>
              <Text style={styles.cPrice}>{Number(it.price || 0).toFixed(2)}</Text>
              <Text style={styles.cDisc}>{Number(it.discount ?? 0).toFixed(1)}</Text>
              <Text style={styles.cTotal}>{Number(it.total || 0).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text>Subtotal / الإجمالي الفرعي</Text>
            <Text>{totals.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Discount / خصم</Text>
            <Text>{totals.discount.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Tax / ضريبة</Text>
            <Text>{totals.tax.toFixed(2)}</Text>
          </View>
          <View style={[styles.grandTotal, { backgroundColor: primary, flexDirection: "row-reverse", justifyContent: "space-between" }]}>
            <Text>الإجمالي / TOTAL</Text>
            <Text>{totals.total.toFixed(2)} {totals.currency}</Text>
          </View>
        </View>

        {notes ? (
          <View style={styles.notesBox} wrap={false}>
            <Text style={styles.notesTitle}>ملاحظات / Notes</Text>
            <Text style={styles.notes}>{notes}</Text>
          </View>
        ) : null}

        <View style={[styles.footer, { backgroundColor: primary }]} fixed>
          <Text>{brand.invoice_footer || `${nameAr} — ${nameEn}`}</Text>
        </View>
        <Text style={styles.pageNo} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}

export async function generatePdfBlob(opts: PdfDocOptions): Promise<Blob> {
  await ensureFont();
  // Pre-resolve logo to data URL so react-pdf doesn't fail on network/CORS.
  const logoDataUrl = await resolvePdfLogo(opts.brand.logo_url);
  const brand: BrandInfo = { ...opts.brand, logo_url: logoDataUrl };
  const { filename: _f, ...rest } = opts;
  const docProps = { ...rest, brand };
  const blob = await pdf(<BrandedDoc {...docProps} />).toBlob();
  if (!blob || blob.size === 0) throw new Error("Generated PDF is empty");
  return blob;
}

export async function downloadBrandedPdf(opts: PdfDocOptions) {
  const blob = await generatePdfBlob(opts);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

