import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Sparkles, Trash2, Edit, Flame, Zap } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/leads")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    temperature: (s.temperature as string) || undefined,
    status: (s.status as string) || undefined,
  }),
  component: Leads,
});

type Lead = {
  id: string; company_name: string | null; contact_name: string | null;
  country: string | null; source: string | null; product_requested: string | null;
  expected_value: number | null; currency: string | null;
  temperature: string; priority: string | null; probability: number;
  lead_score: number; status: string; next_followup_at: string | null;
  owner_id: string | null; company_id: string | null;
};

const empty = {
  company_name: "", contact_name: "", country: "", city: "", industry: "",
  source: "Website", product_requested: "", print_type: "", expected_quantity: "",
  expected_value: "", currency: "USD", temperature: "warm", priority: "medium",
  probability: "20", lead_score: "50", status: "new", next_step: "", notes: "",
  company_id: "",
};

const SOURCES = ["Website","LinkedIn","WhatsApp","Email","Exhibition","Referral","Cold Outreach","Advertising","Other"];
const STATUSES = [
  { v: "new", l: "جديد" }, { v: "contacted", l: "تم التواصل" }, { v: "qualified", l: "مؤهل" },
  { v: "nurturing", l: "متابعة" }, { v: "proposal", l: "عرض سعر" },
  { v: "won", l: "مكتسب" }, { v: "lost", l: "مفقود" },
];

function Leads() {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState(search.status ?? "all");
  const [tempFilter, setTempFilter] = useState(search.temperature ?? "all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });
  const { data: companies } = useQuery({
    queryKey: ["companies-min-leads"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id,name_en").order("name_en");
      return (data ?? []) as { id: string; name_en: string }[];
    },
  });

  const filtered = (leads ?? []).filter(l => {
    if (q && !`${l.company_name ?? ""} ${l.contact_name ?? ""} ${l.product_requested ?? ""}`
      .toLowerCase().includes(q.toLowerCase())) return false;
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (tempFilter !== "all" && l.temperature !== tempFilter) return false;
    return true;
  });

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (l: Lead) => {
    setEditing(l);
    setForm({
      ...empty, ...l,
      expected_value: l.expected_value?.toString() ?? "",
      probability: l.probability.toString(),
      lead_score: l.lead_score.toString(),
      company_id: l.company_id ?? "",
      priority: l.priority ?? "medium",
    } as typeof empty);
    setOpen(true);
  };
  const save = async () => {
    if (!form.company_name?.trim() && !form.company_id) { toast.error("اسم الشركة أو ربطها مطلوب"); return; }
    setSaving(true);
    const payload: any = {
      ...form,
      expected_value: form.expected_value ? Number(form.expected_value) : null,
      probability: Number(form.probability) || 0,
      lead_score: Number(form.lead_score) || 0,
      company_id: form.company_id || null,
    };
    let error;
    if (editing) ({ error } = await supabase.from("leads").update(payload).eq("id", editing.id));
    else ({ error } = await supabase.from("leads").insert({ ...payload, created_by: user?.id, owner_id: user?.id }));
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "تم التحديث" : "تمت الإضافة");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };
  const del = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };
  const convert = async (l: Lead) => {
    if (!user) return;
    const name = `${l.company_name ?? l.contact_name ?? "فرصة"} - ${l.product_requested ?? ""}`.trim();
    const { data: opp, error } = await supabase.from("opportunities").insert({
      name, stage: "qualified",
      amount: l.expected_value ?? 0,
      currency: l.currency ?? "USD",
      probability: l.probability ?? 30,
      company_id: l.company_id,
      lead_id: l.id,
      owner_id: l.owner_id ?? user.id,
      created_by: user.id,
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    await supabase.from("leads").update({ status: "qualified" }).eq("id", l.id);
    toast.success("تم تحويل الليد إلى فرصة");
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["opportunities"] });
    if (opp) navigate({ to: "/opportunities" });
  };

  return (
    <div>
      <PageHeader title="العملاء المحتملون" subtitle={`${filtered.length} ليد`}
        actions={<Button onClick={openNew}><Plus className="w-4 h-4" /> إضافة ليد</Button>} />

      <Card className="mb-4"><CardContent className="pt-4 flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث..." value={q} onChange={e=>setQ(e.target.value)} className="pr-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tempFilter} onValueChange={setTempFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="الحرارة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
          </SelectContent>
        </Select>
      </CardContent></Card>

      <Card><CardContent className="pt-4">
        {isLoading ? <Skeleton className="h-40 w-full" /> :
          filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">لا يوجد ليدز بعد</p>
              <Button onClick={openNew}><Plus className="w-4 h-4" /> إضافة ليد</Button>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>الشركة</TableHead>
                <TableHead>المنتج</TableHead>
                <TableHead>الدولة</TableHead>
                <TableHead>المصدر</TableHead>
                <TableHead>القيمة</TableHead>
                <TableHead>الحرارة</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(l => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="font-medium">{l.company_name || "—"}</div>
                      {l.contact_name && <div className="text-xs text-muted-foreground">{l.contact_name}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{l.product_requested || "—"}</TableCell>
                    <TableCell>{l.country || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{l.source || "—"}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">
                      {l.expected_value ? `${Number(l.expected_value).toLocaleString()} ${l.currency}` : "—"}
                    </TableCell>
                    <TableCell><TempBadge t={l.temperature} /></TableCell>
                    <TableCell><ScoreBadge s={l.lead_score} /></TableCell>
                    <TableCell><StatusBadge s={l.status} /></TableCell>
                    <TableCell className="text-left">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={()=>openEdit(l)} title="تعديل"><Edit className="w-4 h-4" /></Button>
                        {l.status !== "won" && l.status !== "lost" && (
                          <Button size="icon" variant="ghost" onClick={()=>convert(l)} title="تحويل إلى فرصة" className="text-primary"><Zap className="w-4 h-4" /></Button>
                        )}
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>حذف الليد؟</AlertDialogTitle>
                                <AlertDialogDescription>لا يمكن التراجع.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={()=>del(l.id)} className="bg-destructive">حذف</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل ليد" : "إضافة ليد جديد"}</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <F label="اسم الشركة"><Input value={form.company_name} onChange={e=>setForm({...form,company_name:e.target.value})} /></F>
            <F label="ربط بشركة موجودة">
              <Select value={form.company_id} onValueChange={v=>setForm({...form,company_id:v})}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name_en}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="اسم جهة الاتصال"><Input value={form.contact_name} onChange={e=>setForm({...form,contact_name:e.target.value})} /></F>
            <F label="الدولة"><Input value={form.country} onChange={e=>setForm({...form,country:e.target.value})} /></F>
            <F label="المصدر">
              <Select value={form.source} onValueChange={v=>setForm({...form,source:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="القطاع"><Input value={form.industry} onChange={e=>setForm({...form,industry:e.target.value})} /></F>
            <F label="المنتج المطلوب"><Input value={form.product_requested} onChange={e=>setForm({...form,product_requested:e.target.value})} /></F>
            <F label="نوع الطباعة"><Input value={form.print_type} onChange={e=>setForm({...form,print_type:e.target.value})} /></F>
            <F label="الكمية المتوقعة"><Input value={form.expected_quantity} onChange={e=>setForm({...form,expected_quantity:e.target.value})} /></F>
            <F label="القيمة المتوقعة"><Input type="number" value={form.expected_value} onChange={e=>setForm({...form,expected_value:e.target.value})} dir="ltr" /></F>
            <F label="العملة"><Input value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})} dir="ltr" /></F>
            <F label="الحرارة">
              <Select value={form.temperature} onValueChange={v=>setForm({...form,temperature:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                </SelectContent>
              </Select>
            </F>
            <F label="الأولوية">
              <Select value={form.priority} onValueChange={v=>setForm({...form,priority:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">عالية</SelectItem>
                  <SelectItem value="medium">متوسطة</SelectItem>
                  <SelectItem value="low">منخفضة</SelectItem>
                </SelectContent>
              </Select>
            </F>
            <F label="احتمالية الإغلاق %"><Input type="number" min={0} max={100} value={form.probability} onChange={e=>setForm({...form,probability:e.target.value})} dir="ltr" /></F>
            <F label="Lead Score (0-100)"><Input type="number" min={0} max={100} value={form.lead_score} onChange={e=>setForm({...form,lead_score:e.target.value})} dir="ltr" /></F>
            <F label="الحالة">
              <Select value={form.status} onValueChange={v=>setForm({...form,status:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="الخطوة التالية"><Input value={form.next_step} onChange={e=>setForm({...form,next_step:e.target.value})} /></F>
            <div className="md:col-span-2"><F label="ملاحظات"><Textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} /></F></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={saving}>{saving ? "جاري..." : "حفظ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs mb-1 block">{label}</Label>{children}</div>;
}
function TempBadge({ t }: { t: string }) {
  const map: Record<string, string> = {
    hot: "bg-destructive/15 text-destructive border-destructive/40",
    warm: "bg-warning/15 text-warning-foreground border-warning/40",
    cold: "bg-muted",
  };
  return <Badge variant="outline" className={map[t]}>{t === "hot" && <Flame className="w-3 h-3" />} {t}</Badge>;
}
function ScoreBadge({ s }: { s: number }) {
  let color = "bg-muted";
  if (s >= 80) color = "bg-destructive/15 text-destructive border-destructive/40";
  else if (s >= 60) color = "bg-success/15 text-success-foreground border-success/40";
  else if (s >= 40) color = "bg-warning/15 text-warning-foreground border-warning/40";
  return <Badge variant="outline" className={color}>{s}</Badge>;
}
function StatusBadge({ s }: { s: string }) {
  const labels: Record<string,string> = { new:"جديد", contacted:"تم التواصل", qualified:"مؤهل", nurturing:"متابعة", proposal:"عرض سعر", won:"مكتسب", lost:"مفقود" };
  const colors: Record<string,string> = {
    won: "bg-success/20 text-success-foreground border-success/40",
    lost: "bg-destructive/15 text-destructive border-destructive/40",
    proposal: "bg-gold/20 text-primary border-gold/40",
  };
  return <Badge variant="outline" className={colors[s] || ""}>{labels[s] || s}</Badge>;
}
