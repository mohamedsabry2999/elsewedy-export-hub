import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, ArrowRight, Factory } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  ssr: false,
  component: OrderDetail,
});

const STAGE_STATUSES = [
  { v: "pending", l: "قيد الانتظار", c: "bg-muted" },
  { v: "in_progress", l: "قيد التنفيذ", c: "bg-blue-500/20 text-blue-600 border-blue-500/40" },
  { v: "done", l: "مكتمل", c: "bg-success/20 text-success-foreground border-success/40" },
  { v: "blocked", l: "معلّق", c: "bg-destructive/20 text-destructive border-destructive/40" },
];

function OrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [stageOpen, setStageOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<any>(null);
  const [stageForm, setStageForm] = useState<any>({});

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").eq("id", id).single();
      if (error) throw error;
      return data as any;
    },
  });
  const { data: items } = useQuery({
    queryKey: ["order-items", id],
    queryFn: async () => (await supabase.from("order_items").select("*").eq("order_id", id).order("position")).data ?? [],
  });
  const { data: stages } = useQuery({
    queryKey: ["prod-stages", id],
    queryFn: async () => (await supabase.from("production_stages").select("*").eq("order_id", id).order("position")).data ?? [],
  });

  const openStage = (s: any = null) => {
    setEditingStage(s);
    setStageForm(s ?? { stage_name: "", position: (stages?.length ?? 0), progress_pct: 0, status: "pending", notes: "" });
    setStageOpen(true);
  };

  const saveStage = async () => {
    if (!stageForm.stage_name?.trim()) { toast.error("اسم المرحلة مطلوب"); return; }
    const payload: any = {
      order_id: id,
      stage_name: stageForm.stage_name,
      position: Number(stageForm.position ?? 0),
      progress_pct: Number(stageForm.progress_pct ?? 0),
      status: stageForm.status ?? "pending",
      notes: stageForm.notes || null,
      started_at: stageForm.status === "in_progress" && !stageForm.started_at ? new Date().toISOString() : stageForm.started_at ?? null,
      completed_at: stageForm.status === "done" ? new Date().toISOString() : null,
    };
    let err;
    if (editingStage) {
      ({ error: err } = await supabase.from("production_stages").update(payload).eq("id", editingStage.id));
    } else {
      ({ error: err } = await supabase.from("production_stages").insert({ ...payload, created_by: user?.id }));
    }
    if (err) { toast.error(err.message); return; }
    toast.success("تم الحفظ");
    setStageOpen(false);
    qc.invalidateQueries({ queryKey: ["prod-stages", id] });
    qc.invalidateQueries({ queryKey: ["order", id] });
  };

  const delStage = async (sid: string) => {
    const { error } = await supabase.from("production_stages").delete().eq("id", sid);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["prod-stages", id] });
    qc.invalidateQueries({ queryKey: ["order", id] });
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!order) return <div className="p-8 text-center text-muted-foreground">الطلبية غير موجودة</div>;

  return (
    <div>
      <PageHeader
        title={`طلبية ${order.order_number}`}
        subtitle={`الحالة: ${order.status} · الإجمالي: ${Number(order.total ?? 0).toLocaleString()} ${order.currency}`}
        actions={<Button asChild variant="outline"><Link to="/orders"><ArrowRight className="w-4 h-4" /> رجوع</Link></Button>}
      />

      <div className="grid md:grid-cols-3 gap-4 mb-4">
        <Card><CardHeader><CardTitle className="text-sm">تقدم الإنتاج</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Factory className="w-8 h-8 text-gold" />
              <div className="flex-1">
                <Progress value={Number(order.production_progress ?? 0)} />
                <div className="text-xs text-muted-foreground mt-1">{Number(order.production_progress ?? 0).toFixed(0)}% · {order.production_status}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-sm">تاريخ الطلب</CardTitle></CardHeader>
          <CardContent className="text-lg">{order.order_date ? new Date(order.order_date).toLocaleDateString("ar-EG") : "—"}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">التسليم المتوقع</CardTitle></CardHeader>
          <CardContent className="text-lg">{order.expected_delivery ? new Date(order.expected_delivery).toLocaleDateString("ar-EG") : "—"}</CardContent></Card>
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle>البنود ({items?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {(items?.length ?? 0) === 0 ? <div className="text-sm text-muted-foreground py-4">لا توجد بنود</div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>المنتج</TableHead>
                <TableHead>الكمية</TableHead>
                <TableHead>سعر الوحدة</TableHead>
                <TableHead>الإجمالي</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {items!.map((it: any) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.product_name}</TableCell>
                    <TableCell className="font-mono">{it.quantity} {it.unit}</TableCell>
                    <TableCell className="font-mono">{Number(it.unit_price).toLocaleString()}</TableCell>
                    <TableCell className="font-mono">{Number(it.line_total).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>مراحل الإنتاج</CardTitle>
          <Button size="sm" onClick={() => openStage()}><Plus className="w-4 h-4" /> إضافة مرحلة</Button>
        </CardHeader>
        <CardContent>
          {(stages?.length ?? 0) === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              لا توجد مراحل بعد. أضف أول مرحلة إنتاجية لتتبع التقدم.
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>#</TableHead>
                <TableHead>المرحلة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التقدم</TableHead>
                <TableHead>البداية</TableHead>
                <TableHead>الاكتمال</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {stages!.map((s: any) => {
                  const st = STAGE_STATUSES.find(x => x.v === s.status);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono">{s.position + 1}</TableCell>
                      <TableCell className="font-medium">{s.stage_name}</TableCell>
                      <TableCell><Badge variant="outline" className={st?.c}>{st?.l}</Badge></TableCell>
                      <TableCell className="w-40"><Progress value={Number(s.progress_pct)} /><div className="text-xs mt-1">{Number(s.progress_pct).toFixed(0)}%</div></TableCell>
                      <TableCell className="text-xs">{s.started_at ? new Date(s.started_at).toLocaleDateString("ar-EG") : "—"}</TableCell>
                      <TableCell className="text-xs">{s.completed_at ? new Date(s.completed_at).toLocaleDateString("ar-EG") : "—"}</TableCell>
                      <TableCell className="text-left">
                        <Button size="icon" variant="ghost" onClick={() => openStage(s)}><Edit className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => delStage(s.id)}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={stageOpen} onOpenChange={setStageOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingStage ? "تعديل مرحلة" : "مرحلة جديدة"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>اسم المرحلة *</Label><Input value={stageForm.stage_name ?? ""} onChange={e => setStageForm({ ...stageForm, stage_name: e.target.value })} /></div>
            <div><Label>الترتيب</Label><Input type="number" value={stageForm.position ?? 0} onChange={e => setStageForm({ ...stageForm, position: e.target.value })} dir="ltr" /></div>
            <div><Label>التقدم %</Label><Input type="number" min={0} max={100} value={stageForm.progress_pct ?? 0} onChange={e => setStageForm({ ...stageForm, progress_pct: e.target.value })} dir="ltr" /></div>
            <div className="col-span-2"><Label>الحالة</Label>
              <Select value={stageForm.status ?? "pending"} onValueChange={v => setStageForm({ ...stageForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STAGE_STATUSES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>ملاحظات</Label><Textarea rows={3} value={stageForm.notes ?? ""} onChange={e => setStageForm({ ...stageForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageOpen(false)}>إلغاء</Button>
            <Button onClick={saveStage}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
