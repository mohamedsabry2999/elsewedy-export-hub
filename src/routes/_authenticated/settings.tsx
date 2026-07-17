import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/hooks/useAuth";
import { useBranding } from "@/components/BrandingProvider";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  component: SettingsPage,
});

interface Settings {
  id: string;
  company_name: string;
  company_name_ar: string;
  logo_url: string | null;
  logo_path: string | null;
  primary_color: string | null;
  default_currency: string;
  default_language: string;
  timezone: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_id: string | null;
  invoice_footer: string | null;
}

function SettingsPage() {
  const { isAdmin } = useAuth();
  const { brand, refresh, logoFullFallback } = useBranding();
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.from("system_settings").select("*").eq("id", "default").maybeSingle()
      .then(({ data }) => setS(data as Settings | null));
  }, []);

  if (!s) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin" /></div>;

  const upd = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });

  const save = async () => {
    if (!isAdmin) return toast.error("للمسؤولين فقط");
    setSaving(true);
    const { error } = await supabase.from("system_settings").update({
      company_name: s.company_name, company_name_ar: s.company_name_ar,
      primary_color: s.primary_color, default_currency: s.default_currency,
      default_language: s.default_language, timezone: s.timezone,
      address: s.address, phone: s.phone, email: s.email, website: s.website,
      tax_id: s.tax_id, invoice_footer: s.invoice_footer,
      logo_path: s.logo_path, logo_url: s.logo_url,
    }).eq("id", "default");
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("تم الحفظ"); refresh(); }
  };

  const uploadLogo = async (file: File) => {
    if (!isAdmin) return toast.error("للمسؤولين فقط");
    setUploading(true);
    const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
    const path = `logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, {
      upsert: true, contentType: file.type || "image/png",
    });
    if (error) { toast.error(error.message); setUploading(false); return; }
    // Persist stable path; BrandingProvider resolves signed URL at read time.
    const { error: upErr } = await supabase.from("system_settings")
      .update({ logo_path: path, logo_url: null }).eq("id", "default");
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    setS({ ...s, logo_path: path, logo_url: null });
    setUploading(false);
    toast.success("تم رفع الشعار بنجاح");
    refresh();
  };

  const resetLogo = async () => {
    if (!isAdmin) return;
    if (s.logo_path) {
      await supabase.storage.from("branding").remove([s.logo_path]);
    }
    await supabase.from("system_settings")
      .update({ logo_path: null, logo_url: null }).eq("id", "default");
    setS({ ...s, logo_path: null, logo_url: null });
    toast.success("تمت إعادة الشعار للنسخة الافتراضية");
    refresh();
  };

  const currentLogo = brand.logo_url || logoFullFallback;

  return (
    <div>
      <PageHeader title="الإعدادات" subtitle="بيانات الشركة والهوية والتفضيلات" />
      {!isAdmin && <p className="mb-4 text-sm text-muted-foreground">وضع للقراءة فقط — للمسؤولين فقط تعديل الإعدادات.</p>}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">بيانات الشركة</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>اسم الشركة (EN)</Label><Input value={s.company_name} onChange={(e) => upd("company_name", e.target.value)} disabled={!isAdmin} /></div>
            <div><Label>اسم الشركة (AR)</Label><Input value={s.company_name_ar} onChange={(e) => upd("company_name_ar", e.target.value)} disabled={!isAdmin} /></div>
            <div><Label>البريد الإلكتروني</Label><Input dir="ltr" value={s.email ?? ""} onChange={(e) => upd("email", e.target.value)} disabled={!isAdmin} /></div>
            <div><Label>رقم التواصل</Label><Input dir="ltr" value={s.phone ?? ""} onChange={(e) => upd("phone", e.target.value)} disabled={!isAdmin} /></div>
            <div><Label>الموقع الإلكتروني</Label><Input dir="ltr" value={s.website ?? ""} onChange={(e) => upd("website", e.target.value)} disabled={!isAdmin} /></div>
            <div><Label>العنوان</Label><Input value={s.address ?? ""} onChange={(e) => upd("address", e.target.value)} disabled={!isAdmin} /></div>
            <div><Label>الرقم الضريبي</Label><Input value={s.tax_id ?? ""} onChange={(e) => upd("tax_id", e.target.value)} disabled={!isAdmin} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">الهوية البصرية والتفضيلات</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>شعار الشركة</Label>
              <div className="flex items-center gap-3 my-2">
                <img src={currentLogo} alt="logo" className="h-16 rounded border p-1 bg-white" />
                {s.logo_path && (
                  <Button size="sm" variant="outline" type="button" onClick={resetLogo} disabled={!isAdmin}>
                    <Trash2 className="w-3 h-3" /> إعادة تعيين
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input type="file" accept="image/*" disabled={!isAdmin || uploading}
                  onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                {uploading && <Loader2 className="animate-spin w-4 h-4" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">يُرفع مرة واحدة، ويُعرض تلقائياً في كل مكان (الواجهة والـ PDF).</p>
            </div>
            <div>
              <Label>اللون الأساسي</Label>
              <div className="flex gap-2 items-center">
                <Input type="color" value={s.primary_color ?? "#C1272D"} onChange={(e) => upd("primary_color", e.target.value)} disabled={!isAdmin} className="w-16 h-10 p-1" />
                <Input value={s.primary_color ?? ""} onChange={(e) => upd("primary_color", e.target.value)} disabled={!isAdmin} dir="ltr" />
              </div>
            </div>
            <div>
              <Label>العملة الافتراضية</Label>
              <Select value={s.default_currency} onValueChange={(v) => upd("default_currency", v)} disabled={!isAdmin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - دولار أمريكي</SelectItem>
                  <SelectItem value="EUR">EUR - يورو</SelectItem>
                  <SelectItem value="EGP">EGP - جنيه مصري</SelectItem>
                  <SelectItem value="GBP">GBP - جنيه استرليني</SelectItem>
                  <SelectItem value="SAR">SAR - ريال سعودي</SelectItem>
                  <SelectItem value="AED">AED - درهم إماراتي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>اللغة الافتراضية</Label>
              <Select value={s.default_language} onValueChange={(v) => upd("default_language", v)} disabled={!isAdmin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>المنطقة الزمنية</Label><Input dir="ltr" value={s.timezone} onChange={(e) => upd("timezone", e.target.value)} disabled={!isAdmin} /></div>
            <div><Label>تذييل الفاتورة/العرض</Label><Textarea value={s.invoice_footer ?? ""} onChange={(e) => upd("invoice_footer", e.target.value)} disabled={!isAdmin} rows={3} /></div>
          </CardContent>
        </Card>
      </div>
      {isAdmin && (
        <div className="mt-6 flex justify-end">
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            حفظ الإعدادات
          </Button>
        </div>
      )}
    </div>
  );
}
