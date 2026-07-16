import { useState, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Edit, Search, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select" | "async-select" | "file";
  options?: { v: string; l: string }[];
  optionsTable?: string;
  optionsLabelField?: string;
  optionsValueField?: string;
  bucket?: string;
  colSpan?: number;
  required?: boolean;
  hidden?: boolean;
  dir?: string;
};

export type ColumnDef<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
};

type Props<T extends { id: string }> = {
  title: string;
  addLabel: string;
  table: string;
  columns: ColumnDef<T>[];
  fields: FieldDef[];
  defaults: Record<string, any>;
  searchable?: (keyof T | string)[];
  invalidateKeys?: string[];
  numberGenerator?: (form: any) => Record<string, string>;
  ownedFields?: boolean;
};

export function CrudPage<T extends { id: string }>({
  title, addLabel, table, columns, fields, defaults,
  searchable = [], invalidateKeys = [], numberGenerator, ownedFields = true,
}: Props<T>) {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<any>(defaults);
  const [saving, setSaving] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from(table).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as T[];
    },
  });

  const filtered = (rows ?? []).filter((r: any) => {
    if (!q) return true;
    return searchable.some(k => String(r[k as string] ?? "").toLowerCase().includes(q.toLowerCase()));
  });

  const openNew = () => {
    setEditing(null);
    const extra = numberGenerator ? numberGenerator({}) : {};
    setForm({ ...defaults, ...extra });
    setOpen(true);
  };
  const openEdit = (row: T) => {
    setEditing(row);
    const f: any = { ...defaults };
    for (const k of Object.keys(defaults)) {
      const v = (row as any)[k];
      f[k] = v === null || v === undefined ? "" : (v instanceof Date ? v : String(v));
    }
    setForm(f);
    setOpen(true);
  };
  const save = async () => {
    for (const fd of fields) {
      if (fd.required && !String(form[fd.name] ?? "").trim()) {
        toast.error(`${fd.label} مطلوب`);
        return;
      }
    }
    setSaving(true);
    const payload: any = {};
    for (const fd of fields) {
      const v = form[fd.name];
      if (v === "" || v === undefined) payload[fd.name] = null;
      else if (fd.type === "number") payload[fd.name] = Number(v);
      else payload[fd.name] = v;
    }
    let error;
    if (editing) {
      ({ error } = await (supabase as any).from(table).update(payload).eq("id", editing.id));
    } else {
      const insertPayload: any = { ...payload, created_by: user?.id };
      if (ownedFields) insertPayload.owner_id = user?.id;
      ({ error } = await (supabase as any).from(table).insert(insertPayload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "تم التحديث" : "تمت الإضافة");
    setOpen(false);
    qc.invalidateQueries({ queryKey: [table] });
    invalidateKeys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
  };
  const del = async (id: string) => {
    const { error } = await (supabase as any).from(table).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: [table] });
  };

  return (
    <div>
      <PageHeader title={title} subtitle={`${filtered.length}`}
        actions={<Button onClick={openNew}><Plus className="w-4 h-4" /> {addLabel}</Button>} />

      {searchable.length > 0 && (
        <Card className="mb-4"><CardContent className="pt-4">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث..." value={q} onChange={e => setQ(e.target.value)} className="pr-9" />
          </div>
        </CardContent></Card>
      )}

      <Card><CardContent className="pt-4">
        {isLoading ? <Skeleton className="h-40 w-full" /> :
          filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Inbox className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">لا توجد بيانات بعد</p>
              <Button onClick={openNew}><Plus className="w-4 h-4" /> {addLabel}</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  {columns.map(c => <TableHead key={String(c.key)} className={c.className}>{c.header}</TableHead>)}
                  <TableHead className="text-left">إجراءات</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      {columns.map(c => (
                        <TableCell key={String(c.key)} className={c.className}>
                          {c.render ? c.render(r) : ((r as any)[c.key] ?? "—")}
                        </TableCell>
                      ))}
                      <TableCell className="text-left">
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Edit className="w-4 h-4" /></Button>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                  <AlertDialogDescription>لا يمكن التراجع.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => del(r.id)} className="bg-destructive">حذف</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل" : addLabel}</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            {fields.filter(f => !f.hidden).map(f => (
              <div key={f.name} className={f.colSpan === 2 ? "md:col-span-2" : ""}>
                <Label className="text-xs mb-1 block">{f.label}{f.required && " *"}</Label>
                {f.type === "textarea" ? (
                  <textarea className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form[f.name] ?? ""} onChange={e => setForm({ ...form, [f.name]: e.target.value })} />
                ) : f.type === "select" ? (
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={form[f.name] ?? ""} onChange={e => setForm({ ...form, [f.name]: e.target.value })}>
                    <option value="">اختر</option>
                    {f.options?.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                ) : f.type === "async-select" ? (
                  <AsyncSelect field={f} value={form[f.name] ?? ""} onChange={v => setForm({ ...form, [f.name]: v })} />
                ) : f.type === "file" ? (
                  <FileUpload bucket={f.bucket || "documents"} value={form[f.name] ?? ""} onChange={v => setForm({ ...form, [f.name]: v })} />
                ) : (
                  <Input type={f.type || "text"} dir={f.dir || (f.type === "number" || f.type === "date" ? "ltr" : undefined)}
                    value={form[f.name] ?? ""} onChange={e => setForm({ ...form, [f.name]: e.target.value })} />
                )}
              </div>
            ))}
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
