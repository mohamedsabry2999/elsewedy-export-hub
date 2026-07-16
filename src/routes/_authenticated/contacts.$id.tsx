import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Mail, Phone, Linkedin, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/contacts/$id")({
  ssr: false,
  component: ContactDetail,
});

function ContactDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { data: c, isLoading } = useQuery({
    queryKey: ["contact", id],
    queryFn: async () => (await supabase.from("contacts").select("*").eq("id", id).maybeSingle()).data,
  });
  const activities = useQuery({
    queryKey: ["contact-activities", id],
    queryFn: async () => (await supabase.from("activities").select("*").eq("contact_id", id).order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  const tasks = useQuery({
    queryKey: ["contact-tasks", id],
    queryFn: async () => (await supabase.from("tasks").select("*").eq("contact_id", id).order("due_date", { ascending: true })).data ?? [],
  });
  const company = useQuery({
    queryKey: ["contact-company", (c as any)?.company_id],
    queryFn: async () => {
      const cid = (c as any)?.company_id; if (!cid) return null;
      return (await supabase.from("companies").select("id,name_en,name_ar").eq("id", cid).maybeSingle()).data;
    },
    enabled: !!(c as any)?.company_id,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (!c) return <div className="text-center py-20 text-muted-foreground">جهة الاتصال غير موجودة</div>;

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/contacts" })} className="mb-4">
        <ArrowRight className="w-4 h-4" /> العودة
      </Button>
      <PageHeader title={c.full_name} subtitle={[c.job_title, c.department].filter(Boolean).join(" • ")} />

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">المعلومات</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <Info label="الاسم" value={c.full_name} />
            <Info label="المسمى" value={c.job_title} />
            <Info label="القسم" value={c.department} />
            <Info label="الشركة" value={company.data ? <Link to="/companies/$id" params={{ id: company.data.id }} className="underline">{company.data.name_en}</Link> : "—"} />
            <Info label="البريد" value={c.email && <a href={`mailto:${c.email}`} className="underline flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</a>} />
            <Info label="الهاتف" value={c.phone && <a href={`tel:${c.phone}`} className="underline flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</a>} />
            <Info label="واتساب" value={c.whatsapp && <a href={`https://wa.me/${c.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="underline flex items-center gap-1"><MessageCircle className="w-3 h-3" />{c.whatsapp}</a>} />
            <Info label="LinkedIn" value={c.linkedin && <a href={c.linkedin} target="_blank" rel="noreferrer" className="underline flex items-center gap-1"><Linkedin className="w-3 h-3" />رابط</a>} />
            <Info label="الدولة/المدينة" value={[c.country, c.city].filter(Boolean).join(" • ")} />
            <Info label="اللغة" value={c.language} />
            <Info label="القناة المفضلة" value={c.preferred_channel} />
            <Info label="أفضل وقت للتواصل" value={c.best_time_to_contact} />
            <Info label="عيد الميلاد" value={c.birthday} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">تصنيف</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {c.is_decision_maker && <Badge>صاحب قرار</Badge>}
            {c.is_influencer && <Badge variant="secondary">مؤثر</Badge>}
            {c.influence_level && <div className="text-sm"><span className="text-muted-foreground">مستوى التأثير: </span>{c.influence_level}</div>}
            {c.last_contact_at && <div className="text-xs text-muted-foreground">آخر تواصل: {new Date(c.last_contact_at).toLocaleString("ar-EG")}</div>}
            {c.next_followup_at && <div className="text-xs text-muted-foreground">متابعة قادمة: {new Date(c.next_followup_at).toLocaleString("ar-EG")}</div>}
            {c.notes && <div className="text-xs whitespace-pre-wrap text-muted-foreground mt-2 pt-2 border-t">{c.notes}</div>}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activities">
        <TabsList>
          <TabsTrigger value="activities">سجل الأنشطة ({activities.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="tasks">المهام ({tasks.data?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="activities" className="mt-4">
          <TableCard headers={["النوع", "الموضوع/الوصف", "التاريخ"]} rows={(activities.data ?? []).map((a: any) => [
            a.type, a.subject || a.description || "—", new Date(a.created_at).toLocaleString("ar-EG"),
          ])} />
        </TabsContent>
        <TabsContent value="tasks" className="mt-4">
          <TableCard headers={["العنوان", "الأولوية", "الاستحقاق", "الحالة"]} rows={(tasks.data ?? []).map((t: any) => [
            t.title, t.priority || "—", t.due_date || "—", t.status,
          ])} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value || "—"}</div></div>;
}
function TableCard({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  if (rows.length === 0) return <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">لا توجد بيانات</CardContent></Card>;
  return (<Card><CardContent className="pt-4">
    <Table><TableHeader><TableRow>{headers.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{rows.map((r, i) => <TableRow key={i}>{r.map((c, j) => <TableCell key={j}>{c}</TableCell>)}</TableRow>)}</TableBody></Table>
  </CardContent></Card>);
}
