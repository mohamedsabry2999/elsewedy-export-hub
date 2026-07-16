import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight, Building2, Contact2, Sparkles, Target, FileText, ShoppingCart,
  Ship, Wallet, Beaker, Activity, CheckSquare, Loader2, Globe, MapPin, Phone, Mail,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/companies/$id")({
  ssr: false,
  component: CompanyDetail,
});

function CompanyDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: c, isLoading, refetch } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const contacts = useQuery({
    queryKey: ["company-contacts", id],
    queryFn: async () => (await supabase.from("contacts").select("*").eq("company_id", id)).data ?? [],
  });
  const leads = useQuery({
    queryKey: ["company-leads", id],
    queryFn: async () => (await supabase.from("leads").select("*").eq("company_id", id).order("created_at", { ascending: false })).data ?? [],
  });
  const opps = useQuery({
    queryKey: ["company-opps", id],
    queryFn: async () => (await supabase.from("opportunities").select("*").eq("company_id", id).order("created_at", { ascending: false })).data ?? [],
  });
  const quotations = useQuery({
    queryKey: ["company-quotations", id],
    queryFn: async () => (await supabase.from("quotations").select("*").eq("company_id", id).order("created_at", { ascending: false })).data ?? [],
  });
  const orders = useQuery({
    queryKey: ["company-orders", id],
    queryFn: async () => (await supabase.from("orders").select("*").eq("company_id", id).order("created_at", { ascending: false })).data ?? [],
  });
  const shipments = useQuery({
    queryKey: ["company-shipments", id],
    queryFn: async () => (await supabase.from("shipments").select("*").eq("company_id", id).order("created_at", { ascending: false })).data ?? [],
  });
  const payments = useQuery({
    queryKey: ["company-payments", id],
    queryFn: async () => (await supabase.from("payments").select("*").eq("company_id", id).order("created_at", { ascending: false })).data ?? [],
  });
  const samples = useQuery({
    queryKey: ["company-samples", id],
    queryFn: async () => (await supabase.from("samples").select("*").eq("company_id", id).order("created_at", { ascending: false })).data ?? [],
  });
  const activities = useQuery({
    queryKey: ["company-activities", id],
    queryFn: async () => (await supabase.from("activities").select("*").eq("company_id", id).order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  const tasks = useQuery({
    queryKey: ["company-tasks", id],
    queryFn: async () => (await supabase.from("tasks").select("*").eq("related_type", "company").eq("related_id", id).order("due_date", { ascending: true })).data ?? [],
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (!c) return <div className="text-center py-20 text-muted-foreground">الشركة غير موجودة</div>;

  const addNote = async () => {
    if (!note.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from("companies").update({ notes: `${c.notes ? c.notes + "\n\n" : ""}[${new Date().toLocaleString("ar-EG")}] ${note}` }).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setNote("");
    toast.success("تم حفظ الملاحظة");
    refetch();
  };

  const totalOpps = opps.data?.reduce((a: number, o: any) => a + Number(o.amount || 0), 0) ?? 0;
  const totalOrders = orders.data?.reduce((a: number, o: any) => a + Number(o.total_amount || 0), 0) ?? 0;

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/companies" })}>
          <ArrowRight className="w-4 h-4" /> العودة إلى الشركات
        </Button>
      </div>
      <PageHeader
        title={c.name_en || c.name_ar || "شركة"}
        subtitle={[c.industry, c.country, c.city].filter(Boolean).join(" • ")}
      />

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="جهات الاتصال" value={contacts.data?.length ?? 0} icon={Contact2} />
        <MetricCard label="العملاء المحتملون" value={leads.data?.length ?? 0} icon={Sparkles} />
        <MetricCard label="الفرص" value={`${opps.data?.length ?? 0} • ${totalOpps.toLocaleString()}`} icon={Target} />
        <MetricCard label="الطلبيات" value={`${orders.data?.length ?? 0} • ${totalOrders.toLocaleString()}`} icon={ShoppingCart} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview"><Building2 className="w-4 h-4" /> نظرة عامة</TabsTrigger>
          <TabsTrigger value="contacts"><Contact2 className="w-4 h-4" /> جهات الاتصال ({contacts.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="leads"><Sparkles className="w-4 h-4" /> الليدز ({leads.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="opps"><Target className="w-4 h-4" /> الفرص ({opps.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="quotes"><FileText className="w-4 h-4" /> العروض ({quotations.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="samples"><Beaker className="w-4 h-4" /> العينات ({samples.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="orders"><ShoppingCart className="w-4 h-4" /> الطلبيات ({orders.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="shipments"><Ship className="w-4 h-4" /> الشحنات ({shipments.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="payments"><Wallet className="w-4 h-4" /> المدفوعات ({payments.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="tasks"><CheckSquare className="w-4 h-4" /> المهام ({tasks.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="activity"><Activity className="w-4 h-4" /> السجل</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">المعلومات</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="الاسم (EN)" value={c.name_en} />
                <Row label="الاسم (AR)" value={c.name_ar} />
                <Row label="النوع" value={c.company_type} />
                <Row label="الحجم" value={c.company_size} />
                <Row label="عدد الموظفين" value={c.employees_count} />
                <Row label="الأولوية" value={c.priority} />
                <Row label="التقييم" value={c.rating} />
                <Row label="المصدر" value={c.source} />
                <Row label="الحالة" value={c.status} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">التواصل</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {c.website && <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-muted-foreground" /><a href={c.website} target="_blank" rel="noreferrer" className="underline" dir="ltr">{c.website}</a></div>}
                {c.linkedin && <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-muted-foreground" /><a href={c.linkedin} target="_blank" rel="noreferrer" className="underline" dir="ltr">LinkedIn</a></div>}
                {c.address && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" /><span>{c.address}</span></div>}
                <Row label="المنتجات المعروضة" value={c.products_offered} />
                <Row label="المنتجات المطلوبة" value={c.products_needed} />
                <Row label="المورّد الحالي" value={c.current_supplier} />
                <Row label="الحجم المتوقع" value={c.expected_volume} />
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">الملاحظات</CardTitle></CardHeader>
              <CardContent>
                <pre className="text-xs whitespace-pre-wrap font-sans text-muted-foreground max-h-64 overflow-auto mb-3">{c.notes || "لا توجد ملاحظات"}</pre>
                <div className="flex gap-2">
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="أضف ملاحظة جديدة..." rows={2} />
                  <Button onClick={addNote} disabled={saving || !note.trim()}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <SimpleTable
            headers={["الاسم", "المسمى", "البريد", "الهاتف", "قرار"]}
            rows={(contacts.data ?? []).map((x: any) => [
              <Link key="l" to="/contacts/$id" params={{ id: x.id }} className="underline">{x.full_name}</Link>,
              x.job_title || "—", x.email || "—", x.phone || "—",
              x.is_decision_maker ? <Badge>صاحب قرار</Badge> : "—",
            ])}
          />
        </TabsContent>
        <TabsContent value="leads" className="mt-4">
          <SimpleTable
            headers={["المنتج", "القيمة", "الحرارة", "Score", "الحالة"]}
            rows={(leads.data ?? []).map((x: any) => [
              x.product_requested || "—",
              x.expected_value ? `${Number(x.expected_value).toLocaleString()} ${x.currency}` : "—",
              x.temperature, x.lead_score, x.status,
            ])}
          />
        </TabsContent>
        <TabsContent value="opps" className="mt-4">
          <SimpleTable
            headers={["الاسم", "المرحلة", "القيمة", "الاحتمالية", "الإغلاق"]}
            rows={(opps.data ?? []).map((x: any) => [
              x.name, x.stage,
              x.amount ? `${Number(x.amount).toLocaleString()} ${x.currency}` : "—",
              `${x.probability}%`, x.expected_close_date || "—",
            ])}
          />
        </TabsContent>
        <TabsContent value="quotes" className="mt-4">
          <SimpleTable
            headers={["الرقم", "الحالة", "الإجمالي", "التاريخ"]}
            rows={(quotations.data ?? []).map((x: any) => [
              x.quotation_number, x.status,
              x.total_amount ? `${Number(x.total_amount).toLocaleString()} ${x.currency}` : "—",
              new Date(x.created_at).toLocaleDateString("ar-EG"),
            ])}
          />
        </TabsContent>
        <TabsContent value="samples" className="mt-4">
          <SimpleTable
            headers={["المنتج", "الحالة", "الكمية", "التاريخ"]}
            rows={(samples.data ?? []).map((x: any) => [
              x.product_name || "—", x.status, x.quantity ?? "—",
              new Date(x.created_at).toLocaleDateString("ar-EG"),
            ])}
          />
        </TabsContent>
        <TabsContent value="orders" className="mt-4">
          <SimpleTable
            headers={["الرقم", "الحالة", "الإجمالي", "التاريخ"]}
            rows={(orders.data ?? []).map((x: any) => [
              x.order_number, x.status,
              x.total_amount ? `${Number(x.total_amount).toLocaleString()} ${x.currency}` : "—",
              new Date(x.created_at).toLocaleDateString("ar-EG"),
            ])}
          />
        </TabsContent>
        <TabsContent value="shipments" className="mt-4">
          <SimpleTable
            headers={["الرقم", "الحالة", "الوجهة", "التاريخ"]}
            rows={(shipments.data ?? []).map((x: any) => [
              x.shipment_number || x.tracking_number || "—", x.status,
              x.destination_country || "—", new Date(x.created_at).toLocaleDateString("ar-EG"),
            ])}
          />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <SimpleTable
            headers={["المبلغ", "الحالة", "الطريقة", "التاريخ"]}
            rows={(payments.data ?? []).map((x: any) => [
              x.amount ? `${Number(x.amount).toLocaleString()} ${x.currency}` : "—",
              x.status, x.method || "—", x.payment_date || new Date(x.created_at).toLocaleDateString("ar-EG"),
            ])}
          />
        </TabsContent>
        <TabsContent value="tasks" className="mt-4">
          <SimpleTable
            headers={["العنوان", "الأولوية", "الاستحقاق", "الحالة"]}
            rows={(tasks.data ?? []).map((x: any) => [
              x.title, x.priority || "—", x.due_date || "—", x.status,
            ])}
          />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <SimpleTable
            headers={["النوع", "الوصف", "التاريخ"]}
            rows={(activities.data ?? []).map((x: any) => [
              x.type, x.description || x.subject || "—",
              new Date(x.created_at).toLocaleString("ar-EG"),
            ])}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: any }) {
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <Icon className="w-8 h-8 text-muted-foreground" />
      <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-bold">{value}</div></div>
    </CardContent></Card>
  );
}
function Row({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === "") return null;
  return <div className="flex justify-between gap-2"><span className="text-muted-foreground">{label}</span><span className="font-medium text-right">{String(value)}</span></div>;
}
function SimpleTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  if (rows.length === 0) return <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">لا توجد بيانات</CardContent></Card>;
  return (
    <Card><CardContent className="pt-4">
      <Table>
        <TableHeader><TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
        <TableBody>
          {rows.map((r, i) => <TableRow key={i}>{r.map((c, j) => <TableCell key={j}>{c}</TableCell>)}</TableRow>)}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}
