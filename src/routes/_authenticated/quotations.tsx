import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Edit, FileText, X, Download, ArrowRightLeft, Settings2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { downloadBrandedPdf } from "@/lib/pdf-service";
import { useBranding } from "@/components/BrandingProvider";
import { useNavigate } from "@tanstack/react-router";
import { convertToBase } from "@/lib/fx";

export const Route = createFileRoute("/_authenticated/quotations")({
  ssr: false,
  component: Quotations,
});

type Quote = {
  id: string; quote_number: string; company_id: string | null;
  opportunity_id: string | null; status: string;
  currency: string | null; subtotal: number | null; discount: number | null;
  tax: number | null; total: number | null; valid_until: string | null;
  incoterms: string | null; payment_terms: string | null; delivery_terms: string | null;
  notes: string | null; owner_id: string | null;
};
type Item = {
  id?: string; quotation_id?: string; product_name: string; description: string | null;
  quantity: number; unit: string | null; unit_price: number; discount_pct: number | null;
  line_total: number; position: number;
  material?: string | null; thickness?: string | null; dimensions?: string | null;
  color?: string | null; finish?: string | null; print_colors?: string | null;
  packaging?: string | null; lead_time_days?: number | null; specs_notes?: string | null;
};

const STATUSES = [
  { v: "draft", l: "مسودة", c: "bg-muted" },
  { v: "sent", l: "مُرسل", c: "bg-blue-500/15 text-blue-500 border-blue-500/40" },
  { v: "accepted", l: "مقبول", c: "bg-success/15 text-success-foreground border-success/40" },
  { v: "rejected", l: "مرفوض", c: "bg-destructive/15 text-destructive border-destructive/40" },
  { v: "expired", l: "منتهي", c: "bg-orange-500/15 text-orange-500 border-orange-500/40" },
];

const emptyQuote = {
  quote_number: "", company_id: "", opportunity_id: "", status: "draft",
  currency: "USD", discount: "0", tax: "0", valid_until: "",
  incoterms: "FOB", payment_terms: "", delivery_terms: "", notes: "",
};

const emptyItem = (): Item => ({
  product_name: "", description: "", quantity: 1, unit: "pcs",
  unit_price: 0, discount_pct: 0, line_total: 0, position: 0,
  material: "", thickness: "", dimensions: "", color: "", finish: "",
  print_colors: "", packaging: "", lead_time_days: null, specs_notes: "",
});


function Quotations() {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const { brand } = useBranding();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [form, setForm] = useState(emptyQuote);
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["quotations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Quote[];
    },
  });
  const { data: companies } = useQuery({
    queryKey: ["companies-min-quo"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id,name_en").order("name_en");
      return (data ?? []) as { id: string; name_en: string }[];
    },
  });
  const { data: opps } = useQuery({
    queryKey: ["opps-min-quo"],
    queryFn: async () => {
      const { data } = await supabase.from("opportunities").select("id,name").order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const filtered = (quotes ?? []).filter(q => statusFilter === "all" || q.status === statusFilter);
  const compMap = new Map((companies ?? []).map(c => [c.id, c.name_en]));

  const subtotal = useMemo(() =>
    items.reduce((a, it) => a + (Number(it.quantity) * Number(it.unit_price) * (1 - Number(it.discount_pct || 0) / 100)), 0),
    [items]
  );
  const total = subtotal - Number(form.discount || 0) + Number(form.tax || 0);

  const genNumber = () => `Q-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyQuote, quote_number: genNumber() });
    setItems([emptyItem()]);
    setOpen(true);
  };
  const openEdit = async (q: Quote) => {
    setEditing(q);
    setForm({
      quote_number: q.quote_number,
      company_id: q.company_id ?? "", opportunity_id: q.opportunity_id ?? "",
      status: q.status, currency: q.currency ?? "USD",
      discount: (q.discount ?? 0).toString(), tax: (q.tax ?? 0).toString(),
      valid_until: q.valid_until ?? "",
      incoterms: q.incoterms ?? "FOB", payment_terms: q.payment_terms ?? "",
      delivery_terms: q.delivery_terms ?? "", notes: q.notes ?? "",
    });
    const { data } = await supabase.from("quotation_items").select("*").eq("quotation_id", q.id).order("position");
    setItems((data && data.length > 0) ? (data as Item[]) : [emptyItem()]);
    setOpen(true);
  };
  const addItem = () => setItems([...items, { ...emptyItem(), position: items.length }]);
  const updateItem = (i: number, patch: Partial<Item>) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    next[i].line_total = Number(next[i].quantity) * Number(next[i].unit_price) * (1 - Number(next[i].discount_pct || 0) / 100);
    setItems(next);
  };
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!form.quote_number.trim()) { toast.error("رقم العرض مطلوب"); return; }
    if (items.length === 0 || !items[0].product_name) { toast.error("أضف بند واحد على الأقل"); return; }
    setSaving(true);
    const fx = await convertToBase(form.currency, total);
    const payload: any = {
      quote_number: form.quote_number,
      company_id: form.company_id || null,
      opportunity_id: form.opportunity_id || null,
      status: form.status, currency: form.currency,
      subtotal, discount: Number(form.discount) || 0, tax: Number(form.tax) || 0, total,
      exchange_rate: fx.rate,
      base_total: fx.base,
      valid_until: form.valid_until || null,
      incoterms: form.incoterms || null,
      payment_terms: form.payment_terms || null,
      delivery_terms: form.delivery_terms || null,
      notes: form.notes || null,
    };
    let quoteId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("quotations").update(payload).eq("id", editing.id);
      if (error) { setSaving(false); toast.error(error.message); return; }
    } else {
      const { data, error } = await supabase.from("quotations").insert({ ...payload, created_by: user?.id, owner_id: user?.id }).select().single();
      if (error) { setSaving(false); toast.error(error.message); return; }
      quoteId = data.id;
    }
    // Replace items
    if (quoteId) {
      await supabase.from("quotation_items").delete().eq("quotation_id", quoteId);
      const rows = items.filter(it => it.product_name.trim()).map((it, idx) => ({
        quotation_id: quoteId, product_name: it.product_name, description: it.description || null,
        quantity: Number(it.quantity), unit: it.unit || "pcs", unit_price: Number(it.unit_price),
        discount_pct: Number(it.discount_pct || 0), line_total: Number(it.line_total), position: idx,
        material: it.material || null, thickness: it.thickness || null, dimensions: it.dimensions || null,
        color: it.color || null, finish: it.finish || null, print_colors: it.print_colors || null,
        packaging: it.packaging || null,
        lead_time_days: it.lead_time_days != null && it.lead_time_days !== undefined && String(it.lead_time_days) !== "" ? Number(it.lead_time_days) : null,
        specs_notes: it.specs_notes || null,
      }));
      if (rows.length) await supabase.from("quotation_items").insert(rows);
    }
    setSaving(false);
    toast.success(editing ? "تم التحديث" : "تم الإنشاء");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["quotations"] });
  };
  const del = async (id: string) => {
    const { error } = await supabase.from("quotations").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: ["quotations"] });
  };

  const exportPdf = async (q: Quote) => {
    const { data: rows } = await supabase.from("quotation_items").select("*").eq("quotation_id", q.id).order("position");
    const { data: comp } = q.company_id
      ? await supabase.from("companies").select("name_en,name_ar").eq("id", q.company_id).maybeSingle()
      : { data: null };
    await downloadBrandedPdf({
      brand,
      titleAr: "عرض سعر",
      titleEn: "Quotation",
      docNumber: q.quote_number,
      meta: [
        { labelAr: "العميل", labelEn: "Client", value: (comp?.name_ar || comp?.name_en) ?? "-" },
        { labelAr: "الحالة", labelEn: "Status", value: q.status },
        { labelAr: "العملة", labelEn: "Currency", value: q.currency ?? "USD" },
        { labelAr: "ساري حتى", labelEn: "Valid Until", value: q.valid_until ?? "-" },
        { labelAr: "Incoterms", labelEn: "Incoterms", value: q.incoterms ?? "-" },
        { labelAr: "شروط الدفع", labelEn: "Payment", value: q.payment_terms ?? "-" },
      ],
      lines: (rows ?? []).map((it: any) => ({
        name: it.product_name, qty: Number(it.quantity), unit: it.unit,
        price: Number(it.unit_price), discount: Number(it.discount_pct ?? 0),
        total: Number(it.line_total),
      })),
      totals: {
        subtotal: Number(q.subtotal ?? 0), discount: Number(q.discount ?? 0),
        tax: Number(q.tax ?? 0), total: Number(q.total ?? 0), currency: q.currency ?? "USD",
      },
      notes: q.notes,
      filename: `${q.quote_number}.pdf`,
    });
  };

  const convertToOrder = async (q: Quote) => {
    const { data, error } = await supabase.rpc("convert_quotation_to_order", { _quotation_id: q.id });
    if (error) { toast.error(error.message); return; }
    toast.success("تم تحويل العرض إلى طلبية");
    qc.invalidateQueries({ queryKey: ["quotations"] });
    if (data) navigate({ to: "/orders/$id", params: { id: data as string } });
  };


  return (
    <div>
      <PageHeader title="عروض الأسعار" subtitle={`${filtered.length} عرض`}
        actions={<Button onClick={openNew}><Plus className="w-4 h-4" /> عرض جديد</Button>} />

      <Card className="mb-4"><CardContent className="pt-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
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
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">لا توجد عروض بعد</p>
              <Button onClick={openNew}><Plus className="w-4 h-4" /> عرض جديد</Button>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>رقم العرض</TableHead>
                <TableHead>الشركة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>ساري حتى</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(q => {
                  const st = STATUSES.find(s => s.v === q.status);
                  return (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono">{q.quote_number}</TableCell>
                      <TableCell>{q.company_id ? compMap.get(q.company_id) ?? "—" : "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={st?.c}>{st?.l}</Badge></TableCell>
                      <TableCell className="font-mono">{Number(q.total || 0).toLocaleString()} {q.currency}</TableCell>
                      <TableCell>{q.valid_until ? new Date(q.valid_until).toLocaleDateString("ar-EG") : "—"}</TableCell>
                      <TableCell className="text-left">
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" title="تصدير PDF" onClick={() => exportPdf(q)}><Download className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" title="تحويل إلى طلبية" onClick={() => convertToOrder(q)} disabled={q.status === "rejected"}><ArrowRightLeft className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(q)}><Edit className="w-4 h-4" /></Button>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>حذف العرض؟</AlertDialogTitle>
                                  <AlertDialogDescription>لا يمكن التراجع.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => del(q.id)} className="bg-destructive">حذف</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `تعديل عرض ${editing.quote_number}` : "عرض سعر جديد"}</DialogTitle></DialogHeader>

          <div className="grid md:grid-cols-3 gap-3">
            <F label="رقم العرض *"><Input value={form.quote_number} onChange={e => setForm({ ...form, quote_number: e.target.value })} dir="ltr" /></F>
            <F label="الحالة">
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="ساري حتى"><Input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} dir="ltr" /></F>
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
            <F label="العملة"><Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} dir="ltr" /></F>
            <F label="Incoterms"><Input value={form.incoterms} onChange={e => setForm({ ...form, incoterms: e.target.value })} dir="ltr" /></F>
            <F label="شروط الدفع"><Input value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} /></F>
            <F label="شروط الشحن"><Input value={form.delivery_terms} onChange={e => setForm({ ...form, delivery_terms: e.target.value })} /></F>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="font-semibold">البنود</Label>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-4 h-4" /> إضافة بند</Button>
            </div>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead className="w-20">الكمية</TableHead>
                  <TableHead className="w-20">الوحدة</TableHead>
                  <TableHead className="w-28">سعر الوحدة</TableHead>
                  <TableHead className="w-20">خصم %</TableHead>
                  <TableHead className="w-28">الإجمالي</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {items.map((it, i) => (
                    <TableRow key={i}>
                      <TableCell><Input value={it.product_name} onChange={e => updateItem(i, { product_name: e.target.value })} placeholder="اسم المنتج" /></TableCell>
                      <TableCell><Input type="number" value={it.quantity} onChange={e => updateItem(i, { quantity: Number(e.target.value) })} dir="ltr" /></TableCell>
                      <TableCell><Input value={it.unit ?? ""} onChange={e => updateItem(i, { unit: e.target.value })} dir="ltr" /></TableCell>
                      <TableCell><Input type="number" value={it.unit_price} onChange={e => updateItem(i, { unit_price: Number(e.target.value) })} dir="ltr" /></TableCell>
                      <TableCell><Input type="number" value={it.discount_pct ?? 0} onChange={e => updateItem(i, { discount_pct: Number(e.target.value) })} dir="ltr" /></TableCell>
                      <TableCell className="font-mono text-sm">{it.line_total.toFixed(2)}</TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={() => removeItem(i)}><X className="w-4 h-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <F label="ملاحظات"><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} /></F>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-mono">{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between items-center text-sm gap-2">
                <span>خصم</span>
                <Input type="number" className="w-32" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} dir="ltr" />
              </div>
              <div className="flex justify-between items-center text-sm gap-2">
                <span>ضريبة</span>
                <Input type="number" className="w-32" value={form.tax} onChange={e => setForm({ ...form, tax: e.target.value })} dir="ltr" />
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2"><span>الإجمالي</span><span className="font-mono">{total.toFixed(2)} {form.currency}</span></div>
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
