import { useState, ReactNode, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Edit, Search, Download, Upload } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { toCSV, downloadCSV, parseCSV } from "@/lib/csv";

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
  const { user, isAdmin, hasPermission } = useAuth();
  // Permission codes derived from table name (companies.create, .edit, .delete, .export)
  const permBase = table;
  const canCreate = hasPermission(`${permBase}.create`);
  const canEdit = hasPermission(`${permBase}.edit`);
  const canDelete = hasPermission(`${permBase}.delete`);
  const canExport = hasPermission(`${permBase}.export`) || isAdmin;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<any>(defaults);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);

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

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    const { error } = await (supabase as any).from(table).delete().in("id", ids);
    if (error) { toast.error(error.message); return; }
    toast.success(`تم حذف ${ids.length} عنصر`);
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: [table] });
  };

  const exportCSV = () => {
    const src = selected.size > 0 ? filtered.filter((r: any) => selected.has(r.id)) : filtered;
    if (!src.length) { toast.error("لا توجد بيانات للتصدير"); return; }
    const cols = Array.from(new Set(src.flatMap((r: any) => Object.keys(r))));
    downloadCSV(`${table}-${new Date().toISOString().slice(0,10)}.csv`, toCSV(src as any, cols));
    toast.success(`تم تصدير ${src.length} صف`);
  };

  const importCSV = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) { toast.error("الملف فارغ"); return; }
      const fieldNames = new Set(fields.map(f => f.name));
      const payload = rows.map(r => {
        const o: any = { created_by: user?.id };
        if (ownedFields) o.owner_id = user?.id;
        for (const [k, v] of Object.entries(r)) {
          if (!fieldNames.has(k)) continue;
          if (v === "" || v == null) continue;
          const fd = fields.find(f => f.name === k);
          o[k] = fd?.type === "number" ? Number(v) : v;
        }
        return o;
      });
      const { error } = await (supabase as any).from(table).insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success(`تم استيراد ${payload.length} صف`);
      qc.invalidateQueries({ queryKey: [table] });
    } catch (e: any) {
      toast.error(e.message || "فشل الاستيراد");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const allSelected = filtered.length > 0 && filtered.every((r: any) => selected.has(r.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((r: any) => r.id)));
  };
  const toggleRow = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };

  return (
    <div>
      <PageHeader title={title} subtitle={`${filtered.length}${selected.size ? ` — محدد: ${selected.size}` : ""}`}
        actions={
          <div className="flex gap-2 flex-wrap">
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
              onChange={e => e.target.files?.[0] && importCSV(e.target.files[0])} />
            {canCreate && (
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>
                <Upload className="w-4 h-4" /> {importing ? "جارٍ..." : "استيراد CSV"}
              </Button>
            )}
            {canExport && (
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="w-4 h-4" /> تصدير CSV
              </Button>
            )}
            {canDelete && selected.size > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm"><Trash2 className="w-4 h-4" /> حذف ({selected.size})</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>حذف {selected.size} عنصر؟</AlertDialogTitle>
                    <AlertDialogDescription>لا يمكن التراجع.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={bulkDelete} className="bg-destructive">حذف الكل</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {canCreate && <Button onClick={openNew}><Plus className="w-4 h-4" /> {addLabel}</Button>}
          </div>
        } />

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
            <EmptyState
              title={q ? "لا توجد نتائج" : `لا توجد بيانات بعد`}
              description={q ? "جرّب تعديل مصطلح البحث." : "ابدأ بإضافة أول عنصر لهذه القائمة."}
              action={q || !canCreate ? undefined : { label: addLabel, onClick: openNew, icon: Plus }}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </TableHead>
                  {columns.map(c => <TableHead key={String(c.key)} className={c.className}>{c.header}</TableHead>)}
                  <TableHead className="text-left">إجراءات</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id} data-state={selected.has(r.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleRow(r.id)} />
                      </TableCell>
                      {columns.map(c => (
                        <TableCell key={String(c.key)} className={c.className}>
                          {c.render ? c.render(r) : ((r as any)[c.key] ?? "—")}
                        </TableCell>
                      ))}
                      <TableCell className="text-left">
                        <div className="flex gap-1">
                          {canEdit && (
                            <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Edit className="w-4 h-4" /></Button>
                          )}
                          {canDelete && (
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

function AsyncSelect({ field, value, onChange }: { field: FieldDef; value: string; onChange: (v: string) => void }) {
  const { data } = useQuery({
    queryKey: ["opts", field.optionsTable, field.optionsLabelField],
    queryFn: async () => {
      if (!field.optionsTable) return [];
      const label = field.optionsLabelField || "name";
      const val = field.optionsValueField || "id";
      const { data } = await (supabase as any).from(field.optionsTable).select(`${val},${label}`).order(label).limit(500);
      return (data ?? []) as Record<string, any>[];
    },
  });
  const label = field.optionsLabelField || "name";
  const val = field.optionsValueField || "id";
  return (
    <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
      value={value} onChange={e => onChange(e.target.value)}>
      <option value="">— اختر —</option>
      {(data ?? []).map((o) => <option key={o[val]} value={o[val]}>{o[label]}</option>)}
    </select>
  );
}

function FileUpload({ bucket, value, onChange }: { bucket: string; value: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const onFile = async (file: File) => {
    setUploading(true);
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    onChange(path);
    toast.success("تم رفع الملف");
  };
  const openFile = async () => {
    if (!value) return;
    const { data } = await supabase.storage.from(bucket).createSignedUrl(value, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };
  return (
    <div className="space-y-2">
      <Input type="file" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} disabled={uploading} />
      {value && (
        <div className="flex items-center gap-2 text-xs">
          <span className="truncate flex-1 font-mono">{value}</span>
          <Button size="sm" variant="outline" onClick={openFile} type="button">عرض</Button>
          <Button size="sm" variant="ghost" onClick={() => onChange("")} type="button">إزالة</Button>
        </div>
      )}
      {uploading && <div className="text-xs text-muted-foreground">جارٍ الرفع...</div>}
    </div>
  );
}

