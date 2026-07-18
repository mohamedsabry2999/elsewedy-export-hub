/* eslint-disable jsx-a11y/alt-text */
// Polyfill Buffer for @react-pdf/renderer (fontkit uses Buffer internally).
import { Buffer as BufferPolyfill } from "buffer";
if (typeof globalThis !== "undefined" && !(globalThis as any).Buffer) {
  (globalThis as any).Buffer = BufferPolyfill;
}

import { Document, Page, Text, View, StyleSheet, Font, Image, pdf } from "@react-pdf/renderer";
import notoRegular from "@/assets/noto-naskh-arabic-regular.ttf.asset.json";
import notoBold from "@/assets/noto-naskh-arabic-bold.ttf.asset.json";
import logoFullFallback from "@/assets/elsewedy-logo.png.asset.json";
import type { BrandInfo } from "@/components/BrandingProvider";
import type { QuotationDocData } from "./quotation-document";
import { formatCurrency, formatDate } from "./quotation-document";

// ============ Design Tokens (mirror CSS) ============
const C = {
  primary:      "#0F5D3B",
  primaryDark:  "#0B442C",
  soft:         "#EAF3EE",
  border:       "#D9E2DD",
  text:         "#1F2933",
  muted:        "#66736D",
  white:        "#FFFFFF",
  pageBg:       "#F4F6F5",
  altRow:       "#F8FAF9",
};

// ============ Font registration (idempotent, resilient) ============
let arabicFontReady: Promise<boolean> | null = null;
async function ensureArabicFont(): Promise<boolean> {
  if (arabicFontReady) return arabicFontReady;
  arabicFontReady = (async () => {
    const loadOne = async (url: string): Promise<string | null> => {
      try {
        const r = await fetch(url);
        if (!r.ok) return null;
        return URL.createObjectURL(await r.blob());
      } catch { return null; }
    };
    const [reg, bold] = await Promise.all([loadOne(notoRegular.url), loadOne(notoBold.url)]);
    if (!reg) return false;
    const fonts: any[] = [
      { src: reg, fontWeight: 400, fontStyle: "normal" },
      { src: reg, fontWeight: 400, fontStyle: "italic" },
      { src: bold ?? reg, fontWeight: 700, fontStyle: "normal" },
      { src: bold ?? reg, fontWeight: 700, fontStyle: "italic" },
    ];
    try {
      Font.register({ family: "NotoArabic", fonts });
      Font.registerHyphenationCallback((w) => [w]);
      return true;
    } catch (e) {
      console.error("[quotation-pdf] Arabic font register failed", e);
      return false;
    }
  })();
  return arabicFontReady;
}

function safeText(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s).replace(/[•·]/g, "-").replace(/[—–]/g, "-");
}

async function resolveLogo(url: string | null | undefined): Promise<string | null> {
  const candidates = [url, logoFullFallback.url].filter(Boolean) as string[];
  for (const c of candidates) {
    try {
      const r = await fetch(c);
      if (!r.ok) continue;
      const blob = await r.blob();
      return await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
    } catch { /* try next */ }
  }
  return null;
}

// ============ Styles factory (per direction) ============
function makeStyles(rtl: boolean, family: string) {
  const align = rtl ? "right" : "left";
  const rowDir: any = rtl ? "row-reverse" : "row";
  return StyleSheet.create({
    page: {
      fontFamily: family,
      fontSize: 9,
      paddingTop: 110,
      paddingBottom: 55,
      paddingHorizontal: 32,
      color: C.text,
      backgroundColor: C.white,
    },
    // Header
    header: {
      position: "absolute",
      top: 0, left: 0, right: 0,
      backgroundColor: C.white,
      paddingHorizontal: 32,
      paddingTop: 18,
      paddingBottom: 10,
      borderBottomWidth: 3,
      borderBottomColor: C.primary,
      flexDirection: rowDir,
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    logo: { width: 110, height: 55, objectFit: "contain" },
    companyBlock: { flexDirection: "column", alignItems: rtl ? "flex-end" : "flex-start", maxWidth: 340 },
    companyName: { fontSize: 13, fontWeight: 700, color: C.primaryDark, marginBottom: 2 },
    companySub: { fontSize: 8, color: C.muted, marginBottom: 1, textAlign: align },
    // Title
    docTitle: { fontSize: 22, fontWeight: 700, color: C.primaryDark, textAlign: align, marginBottom: 10, marginTop: 2 },
    // Number box row
    numberRow: { flexDirection: rowDir, justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    numberBox: {
      backgroundColor: C.primary, color: C.white,
      paddingVertical: 10, paddingHorizontal: 16, borderRadius: 4,
      minWidth: 220,
      alignItems: rtl ? "flex-end" : "flex-start",
    },
    numberLabel: { fontSize: 8, color: C.white, opacity: 0.9, marginBottom: 3, letterSpacing: 0.5 },
    numberValue: { fontSize: 14, color: C.white, fontWeight: 700, letterSpacing: 0.5 },
    metaColumn: { flexDirection: "column", alignItems: rtl ? "flex-start" : "flex-end", gap: 3 },
    metaLine: { fontSize: 8.5, color: C.muted },
    metaStrong: { fontSize: 9, color: C.text, fontWeight: 700 },
    // Client
    section: {
      backgroundColor: C.soft, borderWidth: 1, borderColor: C.border, borderRadius: 4,
      padding: 12, marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 10, fontWeight: 700, color: C.primaryDark,
      textAlign: align, marginBottom: 8, letterSpacing: 0.5,
    },
    clientGrid: { flexDirection: rowDir, flexWrap: "wrap" },
    clientCell: { width: "50%", flexDirection: "column", marginBottom: 5, paddingHorizontal: 4 },
    clientLabel: { fontSize: 7.5, color: C.muted, marginBottom: 2, textAlign: align },
    clientValue: { fontSize: 9, color: C.text, fontWeight: 700, textAlign: align },
    // Table
    table: { marginTop: 4, marginBottom: 10, borderWidth: 1, borderColor: C.border, borderRadius: 3, overflow: "hidden" },
    tHead: {
      flexDirection: rowDir, backgroundColor: C.primary,
      paddingVertical: 7, paddingHorizontal: 4, color: C.white,
    },
    tHeadCell: { color: C.white, fontSize: 8.5, fontWeight: 700, textAlign: "center" },
    tRow: {
      flexDirection: rowDir, backgroundColor: C.white,
      paddingVertical: 6, paddingHorizontal: 4,
      borderTopWidth: 0.5, borderColor: C.border,
    },
    tRowAlt: { backgroundColor: C.altRow },
    cIdx:   { width: "5%",  textAlign: "center", fontSize: 9 },
    cName:  { width: "42%", paddingHorizontal: 4, textAlign: align },
    cQty:   { width: "9%",  textAlign: "center", fontSize: 9 },
    cUnit:  { width: "9%",  textAlign: "center", fontSize: 9 },
    cPrice: { width: "12%", textAlign: "center", fontSize: 9 },
    cDisc:  { width: "8%",  textAlign: "center", fontSize: 9 },
    cTotal: { width: "15%", textAlign: "center", fontSize: 9, fontWeight: 700 },
    itemName: { fontSize: 9.5, fontWeight: 700, color: C.text, marginBottom: 2 },
    itemDesc: { fontSize: 8, color: C.muted, marginBottom: 3 },
    specsGrid: { flexDirection: rowDir, flexWrap: "wrap", marginTop: 2 },
    specCell: { width: "50%", flexDirection: rowDir, marginBottom: 1, alignItems: "baseline" },
    specLabel: { fontSize: 7.2, color: C.muted, marginRight: rtl ? 0 : 3, marginLeft: rtl ? 3 : 0 },
    specValue: { fontSize: 7.5, color: C.text, fontWeight: 700 },
    // Totals
    totalsWrap: { flexDirection: rowDir, justifyContent: rtl ? "flex-start" : "flex-end", marginBottom: 12 },
    totalsBox: { width: 260 },
    totalRow: {
      flexDirection: rowDir, justifyContent: "space-between",
      paddingVertical: 5, paddingHorizontal: 10,
      borderBottomWidth: 0.5, borderColor: C.border, backgroundColor: C.white,
    },
    totalLabel: { fontSize: 9, color: C.text },
    totalValue: { fontSize: 9, color: C.text, fontWeight: 700 },
    grandRow: {
      flexDirection: rowDir, justifyContent: "space-between",
      backgroundColor: C.primary, color: C.white,
      paddingVertical: 9, paddingHorizontal: 10, marginTop: 3, borderRadius: 3,
    },
    grandLabel: { fontSize: 11, color: C.white, fontWeight: 700 },
    grandValue: { fontSize: 12, color: C.white, fontWeight: 700 },
    // Terms
    termsGrid: { flexDirection: "column" },
    termRow: { flexDirection: rowDir, paddingVertical: 4, borderBottomWidth: 0.5, borderColor: C.border },
    termLabel: { fontSize: 8.5, color: C.primaryDark, fontWeight: 700, width: 140, textAlign: align },
    termValue: { fontSize: 8.5, color: C.text, flex: 1, textAlign: align },
    // Signatures
    sigWrap: { flexDirection: rowDir, justifyContent: "space-between", marginTop: 18, gap: 20 },
    sigBox: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 12, minHeight: 100 },
    sigTitle: { fontSize: 9.5, fontWeight: 700, color: C.primaryDark, marginBottom: 8, textAlign: align },
    sigLine: { fontSize: 8, color: C.muted, marginTop: 6, textAlign: align, borderTopWidth: 0.5, borderColor: C.border, paddingTop: 4 },
    // Footer
    footer: {
      position: "absolute", bottom: 0, left: 0, right: 0,
      backgroundColor: C.primary, color: C.white,
      paddingHorizontal: 32, paddingVertical: 8,
      flexDirection: rowDir, justifyContent: "space-between", alignItems: "center",
    },
    footerText: { fontSize: 7.5, color: C.white },
    footerTagline: { fontSize: 8, color: C.white, fontWeight: 700, fontStyle: "italic" },
    pageNo: { position: "absolute", bottom: 8, right: 32, fontSize: 7, color: C.white },
  });
}

// ============ Localization ============
const L = {
  ar: {
    title: "عرض سعر",
    numberLabel: "رقم عرض السعر",
    date: "التاريخ",
    validUntil: "ساري حتى",
    status: "الحالة",
    client: "بيانات العميل",
    company: "الشركة",
    contact: "جهة الاتصال",
    position: "الوظيفة",
    country: "الدولة",
    city: "المدينة",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    currency: "العملة",
    opportunity: "الفرصة المرتبطة",
    owner: "المسؤول عن العرض",
    itemsTitle: "بنود عرض السعر",
    col: { idx: "م", name: "البيان والمواصفات", qty: "الكمية", unit: "الوحدة", price: "سعر الوحدة", disc: "الخصم %", total: "الإجمالي" },
    subtotal: "الإجمالي الفرعي",
    discount: "الخصم",
    tax: "الضريبة",
    grand: "الإجمالي النهائي",
    terms: "الشروط والأحكام",
    incoterms: "شروط التسليم (Incoterms)",
    payment: "شروط الدفع",
    delivery: "شروط التسليم",
    validity: "صلاحية عرض السعر",
    notes: "ملاحظات",
    sigClient: "اعتماد العميل",
    sigCompany: "عن السويدي للطباعة",
    sigName: "الاسم",
    sigJob: "الوظيفة",
    sigSign: "التوقيع",
    sigDate: "التاريخ",
    sigStamp: "ختم الشركة",
    tagline: "الدقة في كل طبعة",
    specs: {
      material: "الخامة", thickness: "السماكة", dimensions: "المقاس",
      color: "اللون", finish: "التشطيب", print_colors: "ألوان الطباعة",
      packaging: "التغليف", lead_time: "مدة التنفيذ", notes: "ملاحظات فنية",
    },
    dash: "—",
  },
  en: {
    title: "QUOTATION",
    numberLabel: "Quotation No.",
    date: "Date",
    validUntil: "Valid Until",
    status: "Status",
    client: "CLIENT INFORMATION",
    company: "Company",
    contact: "Contact Person",
    position: "Position",
    country: "Country",
    city: "City",
    email: "Email",
    phone: "Phone",
    currency: "Currency",
    opportunity: "Related Opportunity",
    owner: "Account Manager",
    itemsTitle: "QUOTATION ITEMS",
    col: { idx: "No.", name: "Item & Specifications", qty: "Quantity", unit: "Unit", price: "Unit Price", disc: "Disc. %", total: "Total" },
    subtotal: "Subtotal",
    discount: "Discount",
    tax: "Tax",
    grand: "GRAND TOTAL",
    terms: "TERMS & CONDITIONS",
    incoterms: "Incoterms",
    payment: "Payment Terms",
    delivery: "Delivery Terms",
    validity: "Quotation Validity",
    notes: "Notes",
    sigClient: "CLIENT APPROVAL",
    sigCompany: "FOR ELSEWEDY PRINT HOUSE",
    sigName: "Name",
    sigJob: "Position",
    sigSign: "Signature",
    sigDate: "Date",
    sigStamp: "Company Stamp",
    tagline: "Precision in Every Print",
    specs: {
      material: "Material", thickness: "Thickness", dimensions: "Dimensions",
      color: "Color", finish: "Finish", print_colors: "Printing",
      packaging: "Packaging", lead_time: "Lead Time", notes: "Technical Notes",
    },
    dash: "—",
  },
};

function buildSpecs(it: any, lang: "ar" | "en") {
  const s = L[lang].specs;
  const list: Array<[string, string]> = [];
  if (it.material)     list.push([s.material, safeText(it.material)]);
  if (it.thickness)    list.push([s.thickness, safeText(it.thickness)]);
  if (it.dimensions)   list.push([s.dimensions, safeText(it.dimensions)]);
  if (it.color)        list.push([s.color, safeText(it.color)]);
  if (it.finish)       list.push([s.finish, safeText(it.finish)]);
  if (it.print_colors) list.push([s.print_colors, safeText(it.print_colors)]);
  if (it.packaging)    list.push([s.packaging, safeText(it.packaging)]);
  if (it.lead_time_days != null && it.lead_time_days !== "") {
    list.push([s.lead_time, `${it.lead_time_days} ${lang === "ar" ? "يوم" : "days"}`]);
  }
  if (it.specs_notes)  list.push([s.notes, safeText(it.specs_notes)]);
  return list;
}

// ============ Document ============
interface DocProps {
  data: QuotationDocData;
  brand: BrandInfo;
  logoDataUrl: string | null;
  lang: "ar" | "en";
  fontFamily: string;
}

function QuotationPdfDoc({ data, brand, logoDataUrl, lang, fontFamily }: DocProps) {
  const rtl = lang === "ar";
  const s = makeStyles(rtl, fontFamily);
  const t = L[lang];
  const { quotation: q, items, company, contact, opportunity, owner } = data;
  const nameAr = safeText(brand.company_name_ar || brand.company_name);
  const nameEn = safeText(brand.company_name);
  const currency = q.currency || "USD";
  const statusText = t.status + ": " + (q.status || t.dash);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Fixed Header */}
        <View style={s.header} fixed>
          {logoDataUrl && <Image src={logoDataUrl} style={s.logo} />}
          <View style={s.companyBlock}>
            <Text style={s.companyName}>{rtl ? nameAr : nameEn}</Text>
            <Text style={s.companySub}>{rtl ? nameEn : (brand.company_name_ar ? nameAr : "")}</Text>
            {brand.address && <Text style={s.companySub}>{safeText(brand.address)}</Text>}
            {brand.phone   && <Text style={s.companySub}>{rtl ? "هاتف: " : "Tel: "}{brand.phone}</Text>}
            {brand.email   && <Text style={s.companySub}>{brand.email}</Text>}
            {brand.website && <Text style={s.companySub}>{brand.website}</Text>}
            {brand.tax_id  && <Text style={s.companySub}>{rtl ? "الرقم الضريبي: " : "Tax ID: "}{brand.tax_id}</Text>}
          </View>
        </View>

        {/* Title */}
        <Text style={s.docTitle}>{t.title}</Text>

        {/* Number + meta */}
        <View style={s.numberRow}>
          <View style={s.numberBox}>
            <Text style={s.numberLabel}>{t.numberLabel}</Text>
            <Text style={s.numberValue}>{safeText(q.quote_number)}</Text>
          </View>
          <View style={s.metaColumn}>
            <Text style={s.metaLine}>{t.date}: <Text style={s.metaStrong}>{formatDate(q.created_at, lang)}</Text></Text>
            <Text style={s.metaLine}>{t.validUntil}: <Text style={s.metaStrong}>{formatDate(q.valid_until, lang)}</Text></Text>
            <Text style={s.metaLine}>{safeText(statusText)}</Text>
          </View>
        </View>

        {/* Client */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.client}</Text>
          <View style={s.clientGrid}>
            <Cell s={s} label={t.company} value={company ? (rtl ? (company.name_ar || company.name_en) : (company.name_en || company.name_ar)) : t.dash} />
            <Cell s={s} label={t.contact} value={contact ? safeText(contact.full_name) : t.dash} />
            <Cell s={s} label={t.position} value={contact?.position ? safeText(contact.position) : t.dash} />
            <Cell s={s} label={t.country} value={company?.country ? safeText(company.country) : t.dash} />
            <Cell s={s} label={t.city} value={company?.city ? safeText(company.city) : t.dash} />
            <Cell s={s} label={t.email} value={contact?.email || company?.email || t.dash} />
            <Cell s={s} label={t.phone} value={contact?.phone || company?.phone || t.dash} />
            <Cell s={s} label={t.currency} value={currency} />
            {opportunity && <Cell s={s} label={t.opportunity} value={safeText(opportunity.name)} />}
            {owner && <Cell s={s} label={t.owner} value={safeText(owner.full_name || owner.email)} />}
          </View>
        </View>

        {/* Items Table */}
        <Text style={s.sectionTitle}>{t.itemsTitle}</Text>
        <View style={s.table}>
          <View style={s.tHead} fixed>
            <Text style={[s.tHeadCell, s.cIdx]}>{t.col.idx}</Text>
            <Text style={[s.tHeadCell, s.cName, { textAlign: rtl ? "right" : "left" }]}>{t.col.name}</Text>
            <Text style={[s.tHeadCell, s.cQty]}>{t.col.qty}</Text>
            <Text style={[s.tHeadCell, s.cUnit]}>{t.col.unit}</Text>
            <Text style={[s.tHeadCell, s.cPrice]}>{t.col.price}</Text>
            <Text style={[s.tHeadCell, s.cDisc]}>{t.col.disc}</Text>
            <Text style={[s.tHeadCell, s.cTotal]}>{t.col.total}</Text>
          </View>
          {items.map((it, i) => {
            const specs = buildSpecs(it, lang);
            return (
              <View key={i} style={[s.tRow, i % 2 ? s.tRowAlt : {}]} wrap={false}>
                <Text style={s.cIdx}>{i + 1}</Text>
                <View style={s.cName}>
                  <Text style={s.itemName}>{safeText(it.product_name)}</Text>
                  {it.description && <Text style={s.itemDesc}>{safeText(it.description)}</Text>}
                  {specs.length > 0 && (
                    <View style={s.specsGrid}>
                      {specs.map(([lbl, val], k) => (
                        <View key={k} style={s.specCell}>
                          <Text style={s.specLabel}>{lbl}:</Text>
                          <Text style={s.specValue}>{val}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <Text style={s.cQty}>{Number(it.quantity).toLocaleString("en-US")}</Text>
                <Text style={s.cUnit}>{safeText(it.unit) || t.dash}</Text>
                <Text style={s.cPrice}>{Number(it.unit_price || 0).toFixed(2)}</Text>
                <Text style={s.cDisc}>{Number(it.discount_pct ?? 0).toFixed(1)}</Text>
                <Text style={s.cTotal}>{Number(it.line_total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={s.totalsWrap} wrap={false}>
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>{t.subtotal}</Text>
              <Text style={s.totalValue}>{formatCurrency(q.subtotal, currency)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>{t.discount}</Text>
              <Text style={s.totalValue}>{formatCurrency(q.discount, currency)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>{t.tax}</Text>
              <Text style={s.totalValue}>{formatCurrency(q.tax, currency)}</Text>
            </View>
            <View style={s.grandRow}>
              <Text style={s.grandLabel}>{t.grand}</Text>
              <Text style={s.grandValue}>{formatCurrency(q.total, currency)}</Text>
            </View>
          </View>
        </View>

        {/* Terms */}
        {(q.incoterms || q.payment_terms || q.delivery_terms || q.valid_until || q.notes) && (
          <View style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>{t.terms}</Text>
            <View style={s.termsGrid}>
              {q.incoterms && <TermRow s={s} label={t.incoterms} value={safeText(q.incoterms)} />}
              {q.payment_terms && <TermRow s={s} label={t.payment} value={safeText(q.payment_terms)} />}
              {q.delivery_terms && <TermRow s={s} label={t.delivery} value={safeText(q.delivery_terms)} />}
              {q.valid_until && <TermRow s={s} label={t.validity} value={formatDate(q.valid_until, lang)} />}
              {q.notes && <TermRow s={s} label={t.notes} value={safeText(q.notes)} />}
            </View>
          </View>
        )}

        {/* Signatures */}
        <View style={s.sigWrap} wrap={false}>
          <View style={s.sigBox}>
            <Text style={s.sigTitle}>{t.sigClient}</Text>
            <Text style={s.sigLine}>{t.sigName}: ______________________</Text>
            <Text style={s.sigLine}>{t.sigJob}: ______________________</Text>
            <Text style={s.sigLine}>{t.sigSign}: ______________________</Text>
            <Text style={s.sigLine}>{t.sigDate}: ______________________</Text>
            <Text style={s.sigLine}>{t.sigStamp}</Text>
          </View>
          <View style={s.sigBox}>
            <Text style={s.sigTitle}>{t.sigCompany}</Text>
            <Text style={s.sigLine}>{t.sigName}: {owner ? safeText(owner.full_name || owner.email) : "______________________"}</Text>
            <Text style={s.sigLine}>{t.sigJob}: ______________________</Text>
            <Text style={s.sigLine}>{t.sigSign}: ______________________</Text>
            <Text style={s.sigLine}>{t.sigDate}: {formatDate(q.created_at, lang)}</Text>
            <Text style={s.sigLine}>{t.sigStamp}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {brand.email || ""}  {brand.website ? "|  " + brand.website : ""}
          </Text>
          <Text style={s.footerTagline}>{t.tagline}</Text>
        </View>
        <Text style={s.pageNo} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}

function Cell({ s, label, value }: any) {
  return (
    <View style={s.clientCell}>
      <Text style={s.clientLabel}>{label}</Text>
      <Text style={s.clientValue}>{value || "—"}</Text>
    </View>
  );
}

function TermRow({ s, label, value }: any) {
  return (
    <View style={s.termRow}>
      <Text style={s.termLabel}>{label}</Text>
      <Text style={s.termValue}>{value}</Text>
    </View>
  );
}

// ============ Public API ============
export async function generateQuotationPdfBlob(
  data: QuotationDocData, brand: BrandInfo, lang: "ar" | "en",
): Promise<Blob> {
  // Always try to load Arabic-capable font so English PDFs can still render
  // any Arabic company/customer names without missing-glyph boxes.
  const ok = await ensureArabicFont();
  const family = ok ? "NotoArabic" : "Helvetica";
  if (!ok && lang === "ar") console.warn("[quotation-pdf] Arabic font unavailable; falling back to Helvetica");
  const logoDataUrl = await resolveLogo(brand.logo_url);
  const blob = await pdf(
    <QuotationPdfDoc data={data} brand={brand} logoDataUrl={logoDataUrl} lang={lang} fontFamily={family} />
  ).toBlob();
  if (!blob || blob.size === 0) throw new Error("Generated PDF is empty");
  return blob;
}

function safeFilename(name: string): string {
  // Keep unicode, strip only truly unsafe filesystem chars.
  return name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "quotation";
}

export async function downloadQuotationPdf(
  data: QuotationDocData, brand: BrandInfo, lang: "ar" | "en",
): Promise<{ size: number; filename: string }> {
  const blob = await generateQuotationPdfBlob(data, brand, lang);
  const base = data.quotation.quote_number || "quotation";
  const filename = lang === "ar"
    ? safeFilename(`عرض-سعر-${base}.pdf`)
    : safeFilename(`Quotation-${base}.pdf`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return { size: blob.size, filename };
}
