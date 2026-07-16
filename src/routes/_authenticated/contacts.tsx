import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Contact2, Mail, Phone, MessageCircle, Trash2, Edit, Linkedin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/contacts")({
  ssr: false,
  component: Contacts,
});

type Contact = {
  id: string; company_id: string | null; full_name: string; job_title: string | null;
  email: string | null; phone: string | null; whatsapp: string | null; linkedin: string | null;
  country: string | null; is_decision_maker: boolean;
};
type Company = { id: string; name_en: string };

const empty = {
  full_name: "", company_id: "", job_title: "", department: "", email: "", phone: "",
  whatsapp: "", linkedin: "", country: "", city: "", is_decision_maker: false,
  is_influencer: false, notes: "",
};

function Contacts() {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contact[];
    },
  });
  const { data: companies } = useQuery({
    queryKey: ["companies-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id,name_en").order("name_en");
      if (error) throw error;
      return data as Company[];
    },
  });
  const companyName = (id: string | null) => id ? companies?.find(c => c.id === id)?.name_en ?? "—" : "—";
  const filtered = (contacts ?? []).filter(c => !q ||
    `${c.full_name} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Contact) => {
    setEditing(c);
    setForm({ ...empty, ...c, company_id: c.company_id || "" } as typeof empty);
    setOpen(true);
  };
  const save = async () => {
    if (!form.full_name.trim()) { toast.error("الاسم مطلوب"); return; }
    setSaving(true);
    const payload = { ...form, company_id: form.company_id || null };
    let error;
    if (editing) ({ error } = await supabase.from("contacts").update(payload).eq("id", editing.id));
    else ({ error } = await supabase.from("contacts").insert({ ...payload, created_by: user?.id }));
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "تم التحديث" : "تمت الإضافة");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["contacts"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };
  const del = async (id: string) => {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: ["contacts"] });
  };

  return (
    <div>
      <PageHeader title="جهات الاتصال" subtitle={`${filtered.length} جهة اتصال`}
        actions={<Button onClick={openNew}><Plus className="w-4 h-4" /> إضافة جهة اتصال</Button>} />

      <Card className="mb-4"><CardContent className="pt-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو البريد أو الهاتف..." value={q} onChange={e=>setQ(e.target.value)} className="pr-9" />
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-4">
        {isLoading ? <Skeleton className="h-40 w-full" /> :
          filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Contact2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">لا توجد جهات اتصال</p>
              <Button onClick={openNew}><Plus className="w-4 h-4" /> إضافة</Button>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>الشركة</TableHead>
                <TableHead>الوظيفة</TableHead>
                <TableHead>التواصل</TableHead>
                <TableHead>الدولة</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.full_name}</div>
                      {c.is_decision_maker && <span className="text-xs text-gold">★ صانع قرار</span>}
                    </TableCell>
                    <TableCell className="text-sm">{companyName(c.company_id)}</TableCell>
                    <TableCell className="text-sm">{c.job_title || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {c.email && <a href={`mailto:${c.email}`} title={c.email}><Button size="icon" variant="ghost"><Mail className="w-4 h-4" /></Button></a>}
                        {c.phone && <a href={`tel:${c.phone}`} title={c.phone}><Button size="icon" variant="ghost"><Phone className="w-4 h-4" /></Button></a>}
                        {c.whatsapp && <a href={`https://wa.me/${c.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"><Button size="icon" variant="ghost"><MessageCircle className="w-4 h-4 text-success" /></Button></a>}
                        {c.linkedin && <a href={c.linkedin} target="_blank" rel="noreferrer"><Button size="icon" variant="ghost"><Linkedin className="w-4 h-4" /></Button></a>}
                      </div>
                    </TableCell>
                    <TableCell>{c.country || "—"}</TableCell>
                    <TableCell className="text-left">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={()=>openEdit(c)}><Edit className="w-4 h-4" /></Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>حذف جهة الاتصال؟</AlertDialogTitle>
                                <AlertDialogDescription>لا يمكن التراجع عن هذه العملية.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={()=>del(c.id)} className="bg-destructive">حذف</AlertDialogAction>
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
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل جهة اتصال" : "إضافة جهة اتصال"}</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <F label="الاسم الكامل *"><Input value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} /></F>
            <F label="الشركة">
              <Select value={form.company_id} onValueChange={v=>setForm({...form,company_id:v})}>
                <SelectTrigger><SelectValue placeholder="بدون" /></SelectTrigger>
                <SelectContent>
                  {companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name_en}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="الوظيفة"><Input value={form.job_title} onChange={e=>setForm({...form,job_title:e.target.value})} /></F>
            <F label="القسم"><Input value={form.department} onChange={e=>setForm({...form,department:e.target.value})} /></F>
            <F label="البريد الإلكتروني"><Input dir="ltr" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></F>
            <F label="الهاتف"><Input dir="ltr" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></F>
            <F label="WhatsApp"><Input dir="ltr" value={form.whatsapp} onChange={e=>setForm({...form,whatsapp:e.target.value})} /></F>
            <F label="LinkedIn"><Input dir="ltr" value={form.linkedin} onChange={e=>setForm({...form,linkedin:e.target.value})} /></F>
            <F label="الدولة"><Input value={form.country} onChange={e=>setForm({...form,country:e.target.value})} /></F>
            <F label="المدينة"><Input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} /></F>
            <div className="flex gap-4 items-center md:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.is_decision_maker} onCheckedChange={v=>setForm({...form,is_decision_maker:!!v})} />
                صانع قرار
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.is_influencer} onCheckedChange={v=>setForm({...form,is_influencer:!!v})} />
                مؤثر في القرار
              </label>
            </div>
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
