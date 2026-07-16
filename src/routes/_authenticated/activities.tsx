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
import { Plus, Phone, Mail, Calendar, MessageSquare, StickyNote, Package as Pkg, MapPin, Activity as ActIcon, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/activities")({
  ssr: false,
  component: Activities,
});

type Act = {
  id: string; type: string; subject: string; notes: string | null;
  occurred_at: string; company_id: string | null; contact_id: string | null;
  opportunity_id: string | null; created_by: string | null;
};

const TYPES = [
  { v: "call", l: "مكالمة", icon: Phone, c: "bg-blue-500/15 text-blue-500" },
  { v: "email", l: "بريد", icon: Mail, c: "bg-indigo-500/15 text-indigo-500" },
  { v: "meeting", l: "اجتماع", icon: Calendar, c: "bg-purple-500/15 text-purple-500" },
  { v: "whatsapp", l: "واتساب", icon: MessageSquare, c: "bg-green-500/15 text-green-600" },
  { v: "note", l: "ملاحظة", icon: StickyNote, c: "bg-amber-500/15 text-amber-600" },
  { v: "sample", l: "عينة", icon: Pkg, c: "bg-pink-500/15 text-pink-500" },
  { v: "visit", l: "زيارة", icon: MapPin, c: "bg-orange-500/15 text-orange-500" },
];

const empty = { type: "call", subject: "", notes: "", occurred_at: "", company_id: "", contact_id: "", opportunity_id: "" };

function Activities() {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const { data: acts, isLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities").select("*").order("occurred_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as Act[];
    },
  });
  const { data: companies } = useQuery({
    queryKey: ["companies-min-act"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id,name_en").order("name_en");
      return (data ?? []) as { id: string; name_en: string }[];
    },
  });
  const { data: opps } = useQuery({
    queryKey: ["opps-min-act"],
    queryFn: async () => {
      const { data } = await supabase.from("opportunities").select("id,name").order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const filtered = (acts ?? []).filter(a => filter === "all" || a.type === filter);
  const compMap = new Map((companies ?? []).map(c => [c.id, c.name_en]));
  const oppMap = new Map((opps ?? []).map(o => [o.id, o.name]));

  const openNew = () => {
    setForm({ ...empty, occurred_at: new Date().toISOString().slice(0, 16) });
    setOpen(true);
  };
  const save = async () => {
    if (!form.subject.trim()) { toast.error("الموضوع مطلوب"); return; }
    setSaving(true);
    const payload: any = {
      type: form.type, subject: form.subject, notes: form.notes || null,
      occurred_at: form.occurred_at || new Date().toISOString(),
      company_id: form.company_id || null,
      opportunity_id: form.opportunity_id || null,
      created_by: user?.id,
    };
    const { error } = await supabase.from("activities").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تمت الإضافة");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["activities"] });
  };
  const del = async (id: string) => {
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["activities"] });
  };

  return (
    <div>
      <PageHeader title="سجل التواصل" subtitle={`${filtered.length} نشاط`}
        actions={<Button onClick={openNew}><Plus className="w-4 h-4" /> نشاط جديد</Button>} />

      <Card className="mb-4"><CardContent className="pt-4 flex gap-2 flex-wrap">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>الكل</Button>
        {TYPES.map(t => (
          <Button key={t.v} size="sm" variant={filter === t.v ? "default" : "outline"} onClick={() => setFilter(t.v)}>
            <t.icon className="w-3 h-3" /> {t.l}
          </Button>
        ))}
      </CardContent></Card>

      <Card><CardContent className="pt-4">
        {isLoading ? <Skeleton className="h-40 w-full" /> :
          filtered.length === 0 ? (
            <div className="py-16 text-center">
              <ActIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">لا توجد أنشطة بعد</p>
              <Button onClick={openNew}><Plus className="w-4 h-4" /> نشاط جديد</Button>
            </div>
          ) : (
            <div className="relative border-r-2 border-border pr-6 mr-2 space-y-4">
              {filtered.map(a => {
                const t = TYPES.find(x => x.v === a.type)!;
                return (
                  <div key={a.id} className="relative">
                    <div className={`absolute -right-[34px] w-7 h-7 rounded-full flex items-center justify-center ${t.c}`}>
                      <t.icon className="w-4 h-4" />
                    </div>
                    <div className="bg-card border rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{a.subject}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline">{t.l}</Badge>
                            {a.company_id && compMap.get(a.company_id) && (
                              <Badge variant="secondary">{compMap.get(a.company_id)}</Badge>
                            )}
                            {a.opportunity_id && oppMap.get(a.opportunity_id) && (
                              <Badge variant="secondary">فرصة: {oppMap.get(a.opportunity_id)}</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">{new Date(a.occurred_at).toLocaleString("ar-EG")}</span>
                          </div>
                          {a.notes && <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{a.notes}</div>}
                        </div>
                        {(isAdmin || a.created_by === user?.id) && (
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(a.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>نشاط جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <F label="النوع">
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="الموضوع *"><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></F>
            <F label="التاريخ"><Input type="datetime-local" value={form.occurred_at} onChange={e => setForm({ ...form, occurred_at: e.target.value })} dir="ltr" /></F>
            <F label="الشركة">
              <Select value={form.company_id} onValueChange={v => setForm({ ...form, company_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name_en}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="الفرصة">
              <Select value={form.opportunity_id} onValueChange={v => setForm({ ...form, opportunity_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{opps?.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="ملاحظات"><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={4} /></F>
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
