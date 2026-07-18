import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { loadQuotationDocumentData, STATUS_MAP } from "@/lib/quotation-document";
import { QuotationDocument } from "@/components/quotation/QuotationDocument";
import { QuotationPdfPreview } from "@/components/quotation/QuotationPdfPreview";
import { downloadQuotationPdf } from "@/lib/quotation-pdf";
import { useBranding } from "@/components/BrandingProvider";
import { Button } from "@/components/ui/button";
import { ArrowRight, Edit, Eye, Download, Printer, ShieldCheck, ArrowRightLeft, ExternalLink, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "sonner";
import "@/styles/quotation-doc.css";

export const Route = createFileRoute("/_authenticated/quotations/$id")({
  ssr: false,
  component: QuotationDetail,
});

function QuotationDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { brand } = useBranding();
  const { user } = useAuth();
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLang, setPreviewLang] = useState<"ar" | "en">("ar");
  const [busy, setBusy] = useState<"ar" | "en" | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["quotation-doc", id],
    queryFn: () => loadQuotationDocumentData(id),
  });

  const download = async (which: "ar" | "en") => {
    if (!data || busy) return;
    setBusy(which);
    const toastId = toast.loading(`جاري تجهيز عرض السعر (${which === "ar" ? "عربي" : "English"})...`);
    try {
      const { size, filename } = await downloadQuotationPdf(data, brand, which);
      toast.success(`تم تحميل ${filename} (${(size / 1024).toFixed(0)} KB)`, { id: toastId });
    } catch (e: any) {
      console.error("[quotation-detail] pdf failed", e);
      toast.error(`تعذر إنشاء ملف عرض السعر: ${e?.message ?? "خطأ"}`, { id: toastId });
    } finally {
      setBusy(null);
    }
  };

  const openPreview = (l: "ar" | "en") => { setPreviewLang(l); setPreviewOpen(true); };

  const requestApproval = async () => {
    if (!data) return;
    const reason = window.prompt("سبب طلب الموافقة:", "مراجعة عرض السعر");
    if (reason == null) return;
    const { error } = await supabase.from("approvals").insert({
      entity_type: "quotation", entity_id: data.quotation.id, status: "pending",
      reason, requested_by: user?.id!,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("تم إرسال طلب الموافقة");
    qc.invalidateQueries({ queryKey: ["quotation-doc", id] });
  };

  const convertToOrder = async () => {
    if (!data) return;
    const { data: newId, error } = await supabase.rpc("convert_quotation_to_order", { _quotation_id: data.quotation.id });
    if (error) { toast.error(error.message); return; }
    toast.success("تم التحويل إلى طلبية");
    if (newId) navigate({ to: "/orders/$id", params: { id: newId as string } });
  };

  if (isLoading) {
    return (
      <div className="quotation-page p-6">
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-[80vh] max-w-4xl mx-auto" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="quotation-page p-6 text-center">
        <p className="text-destructive mb-4">{(error as any)?.message ?? "تعذر تحميل عرض السعر"}</p>
        <Button variant="outline" onClick={() => navigate({ to: "/quotations" })}>الرجوع للقائمة</Button>
      </div>
    );
  }

  const status = STATUS_MAP[data.quotation.status];
  const canRequestApproval = !["accepted", "rejected", "expired"].includes(data.quotation.status) && !data.quotation.converted_order_id;

  return (
    <div className="quotation-page">
      {/* Toolbar */}
      <div className="quotation-toolbar no-print sticky top-0 z-10 px-6 py-3 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/quotations" })}>
            <ArrowRight className="w-4 h-4" /> رجوع
          </Button>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">عرض سعر</span>
            <span className="font-mono font-bold" dir="ltr">{data.quotation.quote_number}</span>
          </div>
          <span className="q-status-badge" style={{ color: status.color, borderColor: status.color, background: `${status.color}15` }}>
            {status.ar}
          </span>
          <div className="flex rounded-md border overflow-hidden text-sm ms-2">
            <button className={`px-3 py-1 ${lang === "ar" ? "bg-primary text-primary-foreground" : "bg-background"}`} onClick={() => setLang("ar")}>العربية</button>
            <button className={`px-3 py-1 ${lang === "en" ? "bg-primary text-primary-foreground" : "bg-background"}`} onClick={() => setLang("en")}>English</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate({ to: "/quotations" })}>
            <Edit className="w-4 h-4" /> تعديل
          </Button>
          <Button size="sm" variant="outline" onClick={() => openPreview("ar")}>
            <Eye className="w-4 h-4" /> معاينة PDF
          </Button>
          <Button size="sm" onClick={() => download("ar")} disabled={busy !== null}
            style={{ background: "#0F5D3B" }}>
            {busy === "ar" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            تحميل PDF عربي
          </Button>
          <Button size="sm" variant="outline" onClick={() => download("en")} disabled={busy !== null}>
            {busy === "en" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download English PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> طباعة
          </Button>
          {canRequestApproval && (
            <Button size="sm" variant="outline" onClick={requestApproval}>
              <ShieldCheck className="w-4 h-4" /> طلب موافقة
            </Button>
          )}
          {data.linkedOrder ? (
            <Button size="sm" variant="secondary" onClick={() => navigate({ to: "/orders/$id", params: { id: data.linkedOrder!.id } })}>
              <ExternalLink className="w-4 h-4" /> عرض الطلب المرتبط
            </Button>
          ) : data.quotation.status === "accepted" ? (
            <Button size="sm" onClick={convertToOrder}>
              <ArrowRightLeft className="w-4 h-4" /> تحويل إلى طلب
            </Button>
          ) : null}
        </div>
      </div>

      {/* Document */}
      <div className="py-8 px-4">
        <QuotationDocument data={data} brand={brand} lang={lang} />
      </div>

      <QuotationPdfPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        data={data}
        brand={brand}
        defaultLang={previewLang}
      />
    </div>
  );
}
