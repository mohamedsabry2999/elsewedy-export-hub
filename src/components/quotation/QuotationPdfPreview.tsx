import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, ExternalLink, Loader2 } from "lucide-react";
import { generateQuotationPdfBlob } from "@/lib/quotation-pdf";
import type { QuotationDocData } from "@/lib/quotation-document";
import type { BrandInfo } from "@/components/BrandingProvider";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: QuotationDocData | null;
  brand: BrandInfo;
  defaultLang?: "ar" | "en";
}

export function QuotationPdfPreview({ open, onOpenChange, data, brand, defaultLang = "ar" }: Props) {
  const [lang, setLang] = useState<"ar" | "en">(defaultLang);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !data) return;
    let objectUrl: string | null = null;
    setBusy(true);
    setUrl(null);
    (async () => {
      try {
        const blob = await generateQuotationPdfBlob(data, brand, lang);
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch (e: any) {
        toast.error(`تعذر إنشاء معاينة PDF: ${e?.message ?? "خطأ"}`);
      } finally {
        setBusy(false);
      }
    })();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, data, brand, lang]);

  const download = () => {
    if (!url || !data) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = lang === "ar"
      ? `عرض-سعر-${data.quotation.quote_number}.pdf`
      : `Quotation-${data.quotation.quote_number}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
  };
  const openNew = () => url && window.open(url, "_blank", "noopener,noreferrer");
  const printIt = () => {
    if (!url) return;
    const w = window.open(url, "_blank");
    if (w) w.addEventListener("load", () => w.print());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-3 border-b flex-row items-center justify-between gap-3">
          <DialogTitle>معاينة PDF — {data?.quotation.quote_number}</DialogTitle>
          <div className="flex gap-2 items-center">
            <div className="flex rounded-md border overflow-hidden text-sm">
              <button className={`px-3 py-1 ${lang === "ar" ? "bg-primary text-primary-foreground" : "bg-background"}`} onClick={() => setLang("ar")}>العربية</button>
              <button className={`px-3 py-1 ${lang === "en" ? "bg-primary text-primary-foreground" : "bg-background"}`} onClick={() => setLang("en")}>English</button>
            </div>
            <Button size="sm" variant="outline" onClick={download} disabled={!url}><Download className="w-4 h-4" /> تحميل</Button>
            <Button size="sm" variant="outline" onClick={openNew} disabled={!url}><ExternalLink className="w-4 h-4" /> فتح</Button>
            <Button size="sm" variant="outline" onClick={printIt} disabled={!url}><Printer className="w-4 h-4" /> طباعة</Button>
          </div>
        </DialogHeader>
        <div className="flex-1 bg-muted/30 relative">
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> جاري تجهيز عرض السعر...
            </div>
          )}
          {url && (
            <iframe title="quotation-pdf" src={url} className="w-full h-full border-0" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
