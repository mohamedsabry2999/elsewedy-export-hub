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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Building2, Trash2, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/companies")({
  ssr: false,
  component: Companies,
});

type Company = {
  id: string; name_en: string; name_ar: string | null; country: string | null;
  city: string | null; industry: string | null; status: string; priority: string | null;
  website: string | null; owner_id: string | null; created_at: string;
};

const emptyForm = {
  name_en: "", name_ar: "", country: "", city: "", industry: "", website: "",
  company_type: "", company_size: "", description: "", notes: "",
  status: "prospect", priority: "medium", currency: "USD",
};

function Companies() {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const [q, setQ] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: companies, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies")
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Company[];
    },
  });

  const filtered = (companies ?? []).filter((c) => {
    if (q && !`${c.name_en} ${c.name_ar ?? ""} ${c.city ?? ""} ${c.country ?? ""}`
      .toLowerCase().includes(q.toLowerCase())) return false;
    if (countryFilter !== "all" && c.country !== countryFilter) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    return true;
  });

  const countries = Array.from(new Set((companies ?? []).map(c => c.country).filter(Boolean))) as string[];

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (c: Company) => {
    setEditing(c);
    setForm({
      ...emptyForm, ...c,
      name_ar: c.name_ar || "", country: c.country || "", city: c.city || "",
      industry: c.industry || "", website: c.website || "",
    } as typeof emptyForm);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name_en.trim()) { toast.error("اسم الشركة مطلوب"); return; }
    setSaving(true);
    const payload: any = { ...form, name_ar: form.name_ar || null };
    let error;
    if (editing) {
      ({ error } = await supabase.from("companies").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("companies").insert({ ...payload, created_by: user?.id, owner_id: user?.id }));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "تم تحديث الشركة" : "تمت إضافة الشركة");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["companies"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم حذف الشركة");
    qc.invalidateQueries({ queryKey: ["companies"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  return (
    <div>
      <PageHeader title="الشركات" subtitle={`${filtered.length} شركة`}
        actions={<Button onClick={openNew}><Plus className="w-4 h-4" /> إضافة شركة</Button>} />

      <Card className="mb-4">
        <CardContent className="pt-4 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث..." value={q} onChange={(e) => setQ(e.target.value)} className="pr-9" />
          </div>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="الدولة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الدول</SelectItem>
              {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="prospect">محتمل</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="customer">عميل</SelectItem>
              <SelectItem value="inactive">غير نشط</SelectItem>
              <SelectItem value="archived">مؤرشف</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_,i)=><Skeleton key={i} className="h-12"/>)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">لا توجد شركات بعد</p>
              <Button onClick={openNew}><Plus className="w-4 h-4" /> إضافة شركة</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الدولة</TableHead>
                  <TableHead>القطاع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الأولوية</TableHead>
                  <TableHead className="text-left">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.name_en}</div>
                      {c.name_ar && <div className="text-xs text-muted-foreground">{c.name_ar}</div>}
                    </TableCell>
                    <TableCell>{c.country || "—"}{c.city && <span className="text-muted-foreground text-xs"> · {c.city}</span>}</TableCell>
                    <TableCell>{c.industry || "—"}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell><PriorityBadge p={c.priority} /></TableCell>
                    <TableCell className="text-left">
                      <div className="flex gap-1 justify-start">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Edit className="w-4 h-4" /></Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف الشركة؟</AlertDialogTitle>
                                <AlertDialogDescription>سيتم حذف الشركة وجميع جهات الاتصال المرتبطة بها. لا يمكن التراجع.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => del(c.id)} className="bg-destructive">حذف</AlertDialogAction>
                              </AlertDialogFooter>
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
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل شركة" : "إضافة شركة جديدة"}</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="الاسم بالإنجليزية *"><Input value={form.name_en} onChange={e=>setForm({...form,name_en:e.target.value})} /></Field>
            <Field label="الاسم بالعربية"><Input value={form.name_ar} onChange={e=>setForm({...form,name_ar:e.target.value})} /></Field>
            <Field label="الدولة"><Input value={form.country} onChange={e=>setForm({...form,country:e.target.value})} placeholder="Saudi Arabia" /></Field>
            <Field label="المدينة"><Input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} /></Field>
            <Field label="القطاع"><Input value={form.industry} onChange={e=>setForm({...form,industry:e.target.value})} placeholder="Food, Pharma, Cosmetics..." /></Field>
            <Field label="الموقع الإلكتروني"><Input value={form.website} onChange={e=>setForm({...form,website:e.target.value})} dir="ltr" /></Field>
            <Field label="نوع الشركة"><Input value={form.company_type} onChange={e=>setForm({...form,company_type:e.target.value})} /></Field>
            <Field label="حجم الشركة"><Input value={form.company_size} onChange={e=>setForm({...form,company_size:e.target.value})} placeholder="SME / Large..." /></Field>
            <Field label="الحالة">
              <Select value={form.status} onValueChange={(v)=>setForm({...form,status:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">محتمل</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="customer">عميل</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                  <SelectItem value="archived">مؤرشف</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="الأولوية">
              <Select value={form.priority} onValueChange={(v)=>setForm({...form,priority:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">عالية</SelectItem>
                  <SelectItem value="medium">متوسطة</SelectItem>
                  <SelectItem value="low">منخفضة</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="md:col-span-2">
              <Field label="وصف النشاط"><Textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={2} /></Field>
            </div>
            <div className="md:col-span-2">
              <Field label="ملاحظات"><Textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} /></Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs mb-1 block">{label}</Label>{children}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    prospect: "bg-muted text-foreground",
    active: "bg-success/20 text-success-foreground border border-success/40",
    customer: "bg-gold/20 text-primary border border-gold/40",
    inactive: "bg-muted text-muted-foreground",
    archived: "bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {
    prospect: "محتمل", active: "نشط", customer: "عميل", inactive: "غير نشط", archived: "مؤرشف",
  };
  return <Badge className={map[status] || ""}>{labels[status] || status}</Badge>;
}
function PriorityBadge({ p }: { p: string | null }) {
  if (!p) return <span className="text-muted-foreground">—</span>;
  const map: Record<string, string> = {
    high: "bg-destructive/20 text-destructive border border-destructive/40",
    medium: "bg-warning/20 text-warning-foreground border border-warning/40",
    low: "bg-muted",
  };
  const l: Record<string, string> = { high: "عالية", medium: "متوسطة", low: "منخفضة" };
  return <Badge variant="outline" className={map[p] || ""}>{l[p] || p}</Badge>;
}
