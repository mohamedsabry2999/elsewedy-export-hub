import type { QuotationDocData } from "@/lib/quotation-document";
import { formatCurrency, formatDate, STATUS_MAP } from "@/lib/quotation-document";
import type { BrandInfo } from "@/components/BrandingProvider";
import logoFallback from "@/assets/elsewedy-logo.png.asset.json";

interface Props {
  data: QuotationDocData;
  brand: BrandInfo;
  lang?: "ar" | "en";
}

const LABELS = {
  ar: {
    title: "عرض سعر",
    numberLabel: "رقم عرض السعر",
    date: "التاريخ",
    validUntil: "ساري حتى",
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
    sigName: "الاسم", sigJob: "الوظيفة", sigSign: "التوقيع", sigDate: "التاريخ", sigStamp: "ختم الشركة",
    tagline: "الدقة في كل طبعة",
    specs: { material: "الخامة", thickness: "السماكة", dimensions: "المقاس", color: "اللون", finish: "التشطيب", print_colors: "ألوان الطباعة", packaging: "التغليف", lead_time: "مدة التنفيذ", notes: "ملاحظات فنية" },
    dash: "—",
    day: "يوم",
  },
  en: {
    title: "QUOTATION",
    numberLabel: "Quotation No.",
    date: "Date", validUntil: "Valid Until",
    client: "CLIENT INFORMATION",
    company: "Company", contact: "Contact Person", position: "Position",
    country: "Country", city: "City", email: "Email", phone: "Phone",
    currency: "Currency", opportunity: "Related Opportunity", owner: "Account Manager",
    itemsTitle: "QUOTATION ITEMS",
    col: { idx: "No.", name: "Item & Specifications", qty: "Quantity", unit: "Unit", price: "Unit Price", disc: "Disc. %", total: "Total" },
    subtotal: "Subtotal", discount: "Discount", tax: "Tax", grand: "GRAND TOTAL",
    terms: "TERMS & CONDITIONS",
    incoterms: "Incoterms", payment: "Payment Terms", delivery: "Delivery Terms",
    validity: "Quotation Validity", notes: "Notes",
    sigClient: "CLIENT APPROVAL", sigCompany: "FOR ELSEWEDY PRINT HOUSE",
    sigName: "Name", sigJob: "Position", sigSign: "Signature", sigDate: "Date", sigStamp: "Company Stamp",
    tagline: "Precision in Every Print",
    specs: { material: "Material", thickness: "Thickness", dimensions: "Dimensions", color: "Color", finish: "Finish", print_colors: "Printing", packaging: "Packaging", lead_time: "Lead Time", notes: "Technical Notes" },
    dash: "—",
    day: "days",
  },
};

function pick(v: any, fallback = "—") {
  if (v === null || v === undefined || v === "") return fallback;
  return v;
}

function itemSpecs(it: any, lang: "ar" | "en") {
  const s = LABELS[lang].specs;
  const list: Array<[string, string]> = [];
  if (it.material) list.push([s.material, it.material]);
  if (it.thickness) list.push([s.thickness, it.thickness]);
  if (it.dimensions) list.push([s.dimensions, it.dimensions]);
  if (it.color) list.push([s.color, it.color]);
  if (it.finish) list.push([s.finish, it.finish]);
  if (it.print_colors) list.push([s.print_colors, it.print_colors]);
  if (it.packaging) list.push([s.packaging, it.packaging]);
  if (it.lead_time_days != null && it.lead_time_days !== "") list.push([s.lead_time, `${it.lead_time_days} ${LABELS[lang].day}`]);
  if (it.specs_notes) list.push([s.notes, it.specs_notes]);
  return list;
}

export function QuotationDocument({ data, brand, lang = "ar" }: Props) {
  const t = LABELS[lang];
  const { quotation: q, items, company, contact, opportunity, owner } = data;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const currency = q.currency || "USD";
  const status = STATUS_MAP[q.status] ?? STATUS_MAP.draft;
  const logo = brand.logo_url || logoFallback.url;
  const companyName = lang === "ar"
    ? (company?.name_ar || company?.name_en)
    : (company?.name_en || company?.name_ar);

  return (
    <article className="quotation-doc" dir={dir} lang={lang}>
      {/* Header */}
      <header className="quotation-header-line flex items-start justify-between gap-6" style={{ flexDirection: lang === "ar" ? "row-reverse" : "row" }}>
        <img src={logo} alt={brand.company_name} style={{ height: 70, width: "auto", objectFit: "contain" }} />
        <div style={{ textAlign: lang === "ar" ? "right" : "left", maxWidth: 380 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--q-primary-dark)" }}>
            {lang === "ar" ? (brand.company_name_ar || brand.company_name) : brand.company_name}
          </div>
          {brand.company_name_ar && lang !== "ar" && (
            <div style={{ fontSize: 12, color: "var(--q-muted)" }}>{brand.company_name_ar}</div>
          )}
          {brand.address && <div style={{ fontSize: 12, color: "var(--q-muted)", marginTop: 4 }}>{brand.address}</div>}
          {brand.phone && <div style={{ fontSize: 12, color: "var(--q-muted)", direction: "ltr" }}>{lang === "ar" ? "هاتف: " : "Tel: "}{brand.phone}</div>}
          {brand.email && <div style={{ fontSize: 12, color: "var(--q-muted)", direction: "ltr" }}>{brand.email}</div>}
          {brand.website && <div style={{ fontSize: 12, color: "var(--q-muted)", direction: "ltr" }}>{brand.website}</div>}
          {brand.tax_id && <div style={{ fontSize: 12, color: "var(--q-muted)" }}>{lang === "ar" ? "الرقم الضريبي: " : "Tax ID: "}{brand.tax_id}</div>}
        </div>
      </header>

      {/* Title */}
      <h1 className="q-title" style={{ textAlign: lang === "ar" ? "right" : "left" }}>{t.title}</h1>

      {/* Number + Meta */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap" style={{ flexDirection: lang === "ar" ? "row-reverse" : "row" }}>
        <div className="q-number-box">
          <span className="label">{t.numberLabel}</span>
          <span className="val">{q.quote_number}</span>
        </div>
        <div className="flex flex-col gap-1" style={{ alignItems: lang === "ar" ? "flex-start" : "flex-end" }}>
          <span style={{ fontSize: 13, color: "var(--q-muted)" }}>{t.date}: <strong style={{ color: "var(--q-text)" }}>{formatDate(q.created_at, lang)}</strong></span>
          <span style={{ fontSize: 13, color: "var(--q-muted)" }}>{t.validUntil}: <strong style={{ color: "var(--q-text)" }}>{formatDate(q.valid_until, lang)}</strong></span>
          <span className="q-status-badge" style={{ color: status.color, borderColor: status.color, background: `${status.color}15` }}>
            {lang === "ar" ? status.ar : status.en}
          </span>
        </div>
      </div>

      {/* Client */}
      <section className="q-section">
        <h3 className="q-section-title">{t.client}</h3>
        <div className="q-client-grid">
          <ClientCell t={t.company} v={pick(companyName)} />
          <ClientCell t={t.contact} v={pick(contact?.full_name)} />
          <ClientCell t={t.position} v={pick(contact?.position)} />
          <ClientCell t={t.country} v={pick(company?.country)} />
          <ClientCell t={t.city} v={pick(company?.city)} />
          <ClientCell t={t.email} v={pick(contact?.email || company?.email)} ltr />
          <ClientCell t={t.phone} v={pick(contact?.phone || company?.phone)} ltr />
          <ClientCell t={t.currency} v={currency} ltr />
          {opportunity && <ClientCell t={t.opportunity} v={opportunity.name} />}
          {owner && <ClientCell t={t.owner} v={owner.full_name || owner.email} />}
        </div>
      </section>

      {/* Items */}
      <h3 className="q-section-title">{t.itemsTitle}</h3>
      <table className="q-table">
        <thead>
          <tr>
            <th style={{ width: "5%" }}>{t.col.idx}</th>
            <th className="item-col" style={{ width: "42%" }}>{t.col.name}</th>
            <th style={{ width: "9%" }}>{t.col.qty}</th>
            <th style={{ width: "9%" }}>{t.col.unit}</th>
            <th style={{ width: "12%" }}>{t.col.price}</th>
            <th style={{ width: "8%" }}>{t.col.disc}</th>
            <th style={{ width: "15%" }}>{t.col.total}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const specs = itemSpecs(it, lang);
            return (
              <tr key={it.id ?? i}>
                <td>{i + 1}</td>
                <td>
                  <div className="q-item-name">{it.product_name}</div>
                  {it.description && <div className="q-item-desc">{it.description}</div>}
                  {specs.length > 0 && (
                    <div className="q-specs-grid">
                      {specs.map(([lbl, val], k) => (
                        <div key={k}>
                          <span className="lbl">{lbl}:</span>{" "}
                          <span className="val">{val}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td style={{ direction: "ltr" }}>{Number(it.quantity).toLocaleString("en-US")}</td>
                <td>{it.unit || "—"}</td>
                <td style={{ direction: "ltr" }}>{Number(it.unit_price || 0).toFixed(2)}</td>
                <td style={{ direction: "ltr" }}>{Number(it.discount_pct ?? 0).toFixed(1)}</td>
                <td style={{ direction: "ltr" }}>{Number(it.line_total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="q-totals">
        <div className="q-totals-box">
          <div className="q-total-row"><span>{t.subtotal}</span><span className="val" style={{ direction: "ltr" }}>{formatCurrency(q.subtotal, currency)}</span></div>
          <div className="q-total-row"><span>{t.discount}</span><span className="val" style={{ direction: "ltr" }}>{formatCurrency(q.discount, currency)}</span></div>
          <div className="q-total-row"><span>{t.tax}</span><span className="val" style={{ direction: "ltr" }}>{formatCurrency(q.tax, currency)}</span></div>
          <div className="q-grand"><span className="lbl">{t.grand}</span><span className="val" style={{ direction: "ltr" }}>{formatCurrency(q.total, currency)}</span></div>
        </div>
      </div>

      {/* Terms */}
      {(q.incoterms || q.payment_terms || q.delivery_terms || q.valid_until || q.notes) && (
        <section className="q-section">
          <h3 className="q-section-title">{t.terms}</h3>
          {q.incoterms && <TermRow label={t.incoterms} value={q.incoterms} />}
          {q.payment_terms && <TermRow label={t.payment} value={q.payment_terms} />}
          {q.delivery_terms && <TermRow label={t.delivery} value={q.delivery_terms} />}
          {q.valid_until && <TermRow label={t.validity} value={formatDate(q.valid_until, lang)} />}
          {q.notes && <TermRow label={t.notes} value={q.notes} />}
        </section>
      )}

      {/* Signatures */}
      <div className="q-sig-wrap">
        <div className="q-sig-box">
          <h4>{t.sigClient}</h4>
          <div className="q-sig-line">{t.sigName}: __________________________</div>
          <div className="q-sig-line">{t.sigJob}: __________________________</div>
          <div className="q-sig-line">{t.sigSign}: __________________________</div>
          <div className="q-sig-line">{t.sigDate}: __________________________</div>
          <div className="q-sig-line">{t.sigStamp}</div>
        </div>
        <div className="q-sig-box">
          <h4>{t.sigCompany}</h4>
          <div className="q-sig-line">{t.sigName}: {owner ? (owner.full_name || owner.email) : "__________________________"}</div>
          <div className="q-sig-line">{t.sigJob}: __________________________</div>
          <div className="q-sig-line">{t.sigSign}: __________________________</div>
          <div className="q-sig-line">{t.sigDate}: {formatDate(q.created_at, lang)}</div>
          <div className="q-sig-line">{t.sigStamp}</div>
        </div>
      </div>

      {/* Footer */}
      <footer className="q-footer" style={{ flexDirection: lang === "ar" ? "row-reverse" : "row" }}>
        <span style={{ direction: "ltr" }}>{brand.email}{brand.website ? "  |  " + brand.website : ""}</span>
        <span className="tagline">{t.tagline}</span>
      </footer>
    </article>
  );
}

function ClientCell({ t, v, ltr }: { t: string; v: any; ltr?: boolean }) {
  return (
    <div className="q-client-cell">
      <span className="q-client-label">{t}</span>
      <span className="q-client-value" style={ltr ? { direction: "ltr", unicodeBidi: "plaintext" } : undefined}>{v}</span>
    </div>
  );
}

function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="q-terms-row">
      <span className="lbl">{label}</span>
      <span className="val">{value}</span>
    </div>
  );
}
