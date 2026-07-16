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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, CheckSquare, Calendar as CalIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/tasks")({
  ssr: false,
  component: Tasks,
});

type Task = {
  id: string; title: string; description: string | null;
  status: string; priority: string;
  due_date: string | null; completed_at: string | null;
  assigned_to: string | null; created_by: string | null;
};

const empty = { title: "", description: "", status: "open", priority: "medium", due_date: "", assigned_to: "" };
const PRIOS = [
  { v: "low", l: "منخفضة", c: "bg-muted" },
  { v: "medium", l: "متوسطة", c: "bg-blue-500/15 text-blue-500 border-blue-500/40" },
  { v: "high", l: "عالية", c: "bg-amber-500/15 text-amber-600 border-amber-500/40" },
  { v: "urgent", l: "عاجلة", c: "bg-destructive/15 text-destructive border-destructive/40" },
];
const STATUSES = [
  { v: "open", l: "مفتوحة" },
  { v: "in_progress", l: "قيد التنفيذ" },
  { v: "done", l: "منجزة" },
  { v: "cancelled", l: "ملغاة" },
];

function Tasks() {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const [filter, setFilter] = useState("mine");
  const [statusFilter, setStatusFilter] = useState("open");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Task[];
    },
  });
  const { data: users } = useQuery({
    queryKey: ["profiles-min"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,full_name,email");
      return (data ?? []) as { id: string; full_name: string | null; email: string }[];
    },
  });

  const filtered = (tasks ?? []).filter(t => {
    if (filter === "mine" && t.assigned_to !== user?.id) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  const openNew = () => { setEditing(null); setForm({ ...empty, assigned_to: user?.id ?? "" }); setOpen(true); };
  const openEdit = (t: Task) => {
    setEditing(t);
    setForm({
      title: t.title, description: t.description ?? "",
      status: t.status, priority: t.priority,
      due_date: t.due_date ? t.due_date.slice(0, 16) : "",
      assigned_to: t.assigned_to ?? "",
    });
    setOpen(true);
  };
  const save = async () => {
    if (!form.title.trim()) { toast.error("العنوان مطلوب"); return; }
    setSaving(true);
    const payload: any = {
      title: form.title, description: form.description || null,
      status: form.status, priority: form.priority,
      due_date: form.due_date || null,
      assigned_to: form.assigned_to || null,
      completed_at: form.status === "done" ? new Date().toISOString() : null,
    };
    let error;
    if (editing) ({ error } = await supabase.from("tasks").update(payload).eq("id", editing.id));
    else ({ error } = await supabase.from("tasks").insert({ ...payload, created_by: user?.id }));
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "تم التحديث" : "تمت الإضافة");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };
  const toggle = async (t: Task) => {
    const done = t.status !== "done";
    const { error } = await supabase.from("tasks").update({
      status: done ? "done" : "open",
      completed_at: done ? new Date().toISOString() : null,
    }).eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };
  const del = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  return (
    <div>
      <PageHeader title="المهام" subtitle={`${filtered.length} مهمة`}
        actions={<Button onClick={openNew}><Plus className="w-4 h-4" /> مهمة جديدة</Button>} />

      <Card className="mb-4"><CardContent className="pt-4 flex gap-2 flex-wrap">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="mine">مهامي</SelectItem>
            <SelectItem value="all">كل المهام</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardContent></Card>

      <Card><CardContent className="pt-4">
        {isLoading ? <Skeleton className="h-40 w-full" /> :
          filtered.length === 0 ? (
            <div className="py-16 text-center">
              <CheckSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">لا توجد مهام</p>
              <Button onClick={openNew}><Plus className="w-4 h-4" /> مهمة جديدة</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(t => {
                const prio = PRIOS.find(p => p.v === t.priority);
                const overdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== "done";
                const done = t.status === "done";
                return (
                  <div key={t.id} className={`flex items-start gap-3 p-3 rounded-lg border ${done ? "bg-muted/30 opacity-60" : "bg-card"} ${overdue ? "border-destructive/40" : ""}`}>
                    <Checkbox checked={done} onCheckedChange={() => toggle(t)} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium ${done ? "line-through" : ""}`}>{t.title}</div>
                      {t.description && <div className="text-sm text-muted-foreground truncate">{t.description}</div>}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className={prio?.c}>{prio?.l}</Badge>
                        <Badge variant="outline">{STATUSES.find(s => s.v === t.status)?.l}</Badge>
                        {t.due_date && (
                          <span className={`text-xs flex items-center gap-1 ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                            <CalIcon className="w-3 h-3" />
                            {new Date(t.due_date).toLocaleDateString("ar-EG")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Edit className="w-4 h-4" /></Button>
                      {(isAdmin || t.created_by === user?.id || t.assigned_to === user?.id) && (
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(t.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "تعديل مهمة" : "مهمة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <F label="العنوان *"><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></F>
            <F label="الوصف"><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="الأولوية">
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIOS.map(p => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="الحالة">
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="الموعد النهائي"><Input type="datetime-local" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} dir="ltr" /></F>
              <F label="مسندة إلى">
                <Select value={form.assigned_to} onValueChange={v => setForm({ ...form, assigned_to: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{users?.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
                </Select>
              </F>
            </div>
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
