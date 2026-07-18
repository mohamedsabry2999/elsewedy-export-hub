import { supabase } from "@/integrations/supabase/client";

export interface QuotationDocData {
  quotation: any;
  items: any[];
  company: any | null;
  contact: any | null;
  opportunity: any | null;
  approval: any | null;
  linkedOrder: any | null;
  owner: any | null;
}

export async function loadQuotationDocumentData(id: string): Promise<QuotationDocData> {
  const { data: quotation, error } = await supabase
    .from("quotations").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!quotation) throw new Error("عرض السعر غير موجود");

  const [itemsRes, companyRes, contactRes, oppRes, approvalRes, orderRes, ownerRes] = await Promise.all([
    supabase.from("quotation_items").select("*").eq("quotation_id", id).order("position"),
    quotation.company_id
      ? supabase.from("companies").select("*").eq("id", quotation.company_id).maybeSingle()
      : Promise.resolve({ data: null }),
    quotation.contact_id
      ? supabase.from("contacts").select("*").eq("id", quotation.contact_id).maybeSingle()
      : Promise.resolve({ data: null }),
    quotation.opportunity_id
      ? supabase.from("opportunities").select("*").eq("id", quotation.opportunity_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("approvals").select("*").eq("entity_type", "quotation").eq("entity_id", id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    quotation.converted_order_id
      ? supabase.from("orders").select("id,order_number,status").eq("id", quotation.converted_order_id).maybeSingle()
      : Promise.resolve({ data: null }),
    quotation.owner_id
      ? supabase.from("profiles").select("id,full_name,email").eq("id", quotation.owner_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    quotation,
    items: (itemsRes.data as any[]) ?? [],
    company: (companyRes as any).data ?? null,
    contact: (contactRes as any).data ?? null,
    opportunity: (oppRes as any).data ?? null,
    approval: (approvalRes as any).data ?? null,
    linkedOrder: (orderRes as any).data ?? null,
    owner: (ownerRes as any).data ?? null,
  };
}

export function formatCurrency(amount: number | null | undefined, currency: string = "USD"): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return `0.00 ${currency}`;
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function formatDate(d: string | null | undefined, locale: "ar" | "en" = "ar"): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB");
  } catch { return "—"; }
}

export const STATUS_MAP: Record<string, { ar: string; en: string; color: string }> = {
  draft:    { ar: "مسودة",  en: "Draft",    color: "#66736D" },
  sent:     { ar: "مُرسل",  en: "Sent",     color: "#1e6ea7" },
  accepted: { ar: "مقبول",  en: "Accepted", color: "#198754" },
  rejected: { ar: "مرفوض",  en: "Rejected", color: "#C0392B" },
  expired:  { ar: "منتهي",  en: "Expired",  color: "#D99A16" },
};
