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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Edit, Target, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/opportunities")({
  ssr: false,
  component: Opportunities,
});

type Opp = {
  id: string; name: string; stage: string; amount: number | null;
  currency: string | null; probability: number | null;
  expected_close_date: string | null; product_category: string | null;
  company_id: string | null; contact_id: string | null; lead_id: string | null;
  description: string | null; lost_reason: string | null; owner_id: string | null;
};

const STAGES = [
  { v: "new",              l: "جديد",                color: "bg-slate-500/15 border-slate-500/40" },
  { v: "contacted",        l: "تم التواصل",           color: "bg-slate-500/15 border-slate-500/40" },
  { v: "qualified",        l: "مؤهل",                color: "bg-blue-500/15 border-blue-500/40" },
  { v: "needs_analysis",   l: "تحليل الاحتياجات",     color: "bg-blue-500/15 border-blue-500/40" },
  { v: "sample_requested", l: "طلب عينة",             color: "bg-cyan-500/15 border-cyan-500/40" },
  { v: "sample_sent",      l: "إرسال العينة",         color: "bg-cyan-500/15 border-cyan-500/40" },
  { v: "sample_approved",  l: "اعتماد العينة",        color: "bg-teal-500/15 border-teal-500/40" },
  { v: "rfq_received",     l: "RFQ مستلم",            color: "bg-indigo-500/15 border-indigo-500/40" },
  { v: "proposal",         l: "إعداد عرض السعر",      color: "bg-amber-500/15 border-amber-500/40" },
  { v: "proposal_sent",    l: "عرض السعر مُرسل",      color: "bg-amber-500/15 border-amber-500/40" },
  { v: "negotiation",      l: "تفاوض",                color: "bg-orange-500/15 border-orange-500/40" },
  { v: "contract_review",  l: "مراجعة العقد",         color: "bg-orange-500/15 border-orange-500/40" },
  { v: "verbal_agreement", l: "موافقة مبدئية",        color: "bg-lime-500/15 border-lime-500/40" },
  { v: "po_received",      l: "استلام PO",            color: "bg-lime-500/15 border-lime-500/40" },
  { v: "deposit_pending",  l: "بانتظار الدفعة المقدمة", color: "bg-yellow-500/15 border-yellow-500/40" },
  { v: "deposit_received", l: "استلام الدفعة",         color: "bg-yellow-500/15 border-yellow-500/40" },
  { v: "production",       l: "قيد الإنتاج",           color: "bg-purple-500/15 border-purple-500/40" },
  { v: "ready_to_ship",    l: "جاهز للشحن",            color: "bg-purple-500/15 border-purple-500/40" },
  { v: "shipped",          l: "تم الشحن",              color: "bg-fuchsia-500/15 border-fuchsia-500/40" },
  { v: "delivered",        l: "تم التسليم",            color: "bg-emerald-500/15 border-emerald-500/40" },
  { v: "won",              l: "مكتسبة",                color: "bg-green-500/15 border-green-500/40" },
  { v: "lost",             l: "مفقودة",                color: "bg-red-500/15 border-red-500/40" },
  { v: "on_hold",          l: "معلّقة",                color: "bg-zinc-500/15 border-zinc-500/40" },
];

const empty = {
  name: "", stage: "new", amount: "", currency: "USD", probability: "10",
  expected_close_date: "", product_category: "", description: "",
  company_id: "", contact_id: "", lost_reason: "",
};

function Opportunities() {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Opp | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const { data: opps, isLoading } = useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("opportunities").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Opp[];
    },
  });
  const { data: companies } = useQuery({
    queryKey: ["companies-min-opps"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id,name_en").order("name_en");
      return (data ?? []) as { id: string; name_en: string }[];
    },
  });

  const byStage = (s: string) => (opps ?? []).filter(o => o.stage === s);
  const stageTotal = (s: string) =>
    byStage(s).reduce((a, o) => a + Number(o.amount || 0), 0);

  const openNew = (stage?: string) => {
    setEditing(null);
    setForm({ ...empty, stage: stage ?? "new" });
    setOpen(true);
  };
  const openEdit = (o: Opp) => {
    setEditing(o);
    setForm({
      name: o.name, stage: o.stage,
      amount: o.amount?.toString() ?? "",
      currency: o.currency ?? "USD",
      probability: (o.probability ?? 10).toString(),
      expected_close_date: o.expected_close_date ?? "",
      product_category: o.product_category ?? "",
      description: o.description ?? "",
      company_id: o.company_id ?? "",
      contact_id: o.contact_id ?? "",
      lost_reason: o.lost_reason ?? "",
    });
    setOpen(true);
  };
  const save = async () => {
    if (!form.name.trim()) { toast.error("اسم الفرصة مطلوب"); return; }
    setSaving(true);
    const payload: any = {
      name: form.name, stage: form.stage,
      amount: form.amount ? Number(form.amount) : 0,
      currency: form.currency, probability: Number(form.probability) || 0,
      expected_close_date: form.expected_close_date || null,
      product_category: form.product_category || null,
      description: form.description || null,
      lost_reason: form.lost_reason || null,
      company_id: form.company_id || null,
      contact_id: form.contact_id || null,
    };
    let error;
    if (editing) ({ error } = await supabase.from("opportunities").update(payload).eq("id", editing.id));
    else ({ error } = await supabase.from("opportunities").insert({ ...payload, created_by: user?.id, owner_id: user?.id }));
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "تم التحديث" : "تمت الإضافة");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["opportunities"] });
  };
  const del = async (id: string) => {
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: ["opportunities"] });
  };
  const moveTo = async (id: string, stage: string) => {
    const { error } = await supabase.from("opportunities").update({ stage: stage as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["opportunities"] });
  };

  const total = (opps ?? []).reduce((a, o) => a + Number(o.amount || 0), 0);
  const wonTotal = byStage("won").reduce((a, o) => a + Number(o.amount || 0), 0);

  return (
    <div>
      <PageHeader
        title="الفرص - Pipeline"
        subtitle={`إجمالي: ${total.toLocaleString()} • مكتسبة: ${wonTotal.toLocaleString()}`}
        actions={<Button onClick={() => openNew()}><Plus className="w-4 h-4" /> فرصة جديدة</Button>}
      />

      {isLoading ? <Skeleton className="h-96 w-full" /> : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {STAGES.map(s => (
            <div
              key={s.v}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragId) { moveTo(dragId, s.v); setDragId(null); } }}
              className={`rounded-lg border ${s.color} p-2 min-h-[400px]`}
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <div>
                  <div className="font-semibold text-sm">{s.l}</div>
                  <div className="text-[10px] text-muted-foreground">{byStage(s.v).length} • {stageTotal(s.v).toLocaleString()}</div>
                </div>
                <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => openNew(s.v)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-2">
                {byStage(s.v).map(o => (
                  <Card
                    key={o.id}
                    draggable
                    onDragStart={() => setDragId(o.id)}
                    className="cursor-move hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-2 space-y-1">
                      <div className="font-medium text-sm truncate">{o.name}</div>
                      {o.product_category && <div className="text-[11px] text-muted-foreground truncate">{o.product_category}</div>}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono flex items-center gap-1"><DollarSign className="w-3 h-3" />{Number(o.amount || 0).toLocaleString()} {o.currency}</span>
                        <Badge variant="outline" className="text-[10px]">{o.probability}%</Badge>
                      </div>
                      <div className="flex gap-1 pt-1">
                        <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => openEdit(o)}><Edit className="w-3 h-3" /></Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="w-6 h-6 text-destructive"><Trash2 className="w-3 h-3" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>حذف الفرصة؟</AlertDialogTitle>
                                <AlertDialogDescription>لا يمكن التراجع.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => del(o.id)} className="bg-destructive">حذف</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {byStage(s.v).length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    <Target className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    فارغ
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل الفرصة" : "فرصة جديدة"}</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><F label="اسم الفرصة *"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></F></div>
            <F label="المرحلة">
              <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="الشركة">
              <Select value={form.company_id} onValueChange={v => setForm({ ...form, company_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name_en}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="القيمة"><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} dir="ltr" /></F>
            <F label="العملة"><Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} dir="ltr" /></F>
            <F label="الاحتمالية %"><Input type="number" min={0} max={100} value={form.probability} onChange={e => setForm({ ...form, probability: e.target.value })} dir="ltr" /></F>
            <F label="تاريخ الإغلاق المتوقع"><Input type="date" value={form.expected_close_date} onChange={e => setForm({ ...form, expected_close_date: e.target.value })} dir="ltr" /></F>
            <F label="فئة المنتج"><Input value={form.product_category} onChange={e => setForm({ ...form, product_category: e.target.value })} /></F>
            <div className="md:col-span-2"><F label="الوصف"><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></F></div>
            {form.stage === "lost" && (
              <div className="md:col-span-2"><F label="سبب الخسارة"><Textarea value={form.lost_reason} onChange={e => setForm({ ...form, lost_reason: e.target.value })} rows={2} /></F></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
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
