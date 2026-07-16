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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowRight, MapPin, Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/shipments/$id")({ ssr: false, component: ShipmentDetail });

const EVENT_STATUSES = [
  { v: "booked", l: "محجوزة" },
  { v: "loaded", l: "تم التحميل" },
  { v: "departed", l: "غادرت" },
  { v: "in_transit", l: "في الطريق" },
  { v: "customs", l: "في الجمارك" },
  { v: "arrived", l: "وصلت" },
  { v: "delivered", l: "تم التسليم" },
  { v: "delayed", l: "متأخرة" },
];

function ShipmentDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ event_status: "in_transit", location: "", description: "", event_at: new Date().toISOString().slice(0, 16) });

  const { data: ship, isLoading } = useQuery({
    queryKey: ["shipment", id],
    queryFn: async () => (await supabase.from("shipments").select("*").eq("id", id).single()).data as any,
  });
  const { data: events } = useQuery({
    queryKey: ["ship-events", id],
    queryFn: async () => (await supabase.from("shipment_events").select("*").eq("shipment_id", id).order("event_at", { ascending: false })).data ?? [],
  });

  const addEvent = async () => {
    if (!form.event_status) { toast.error("الحالة مطلوبة"); return; }
    const { error } = await supabase.from("shipment_events").insert({
      shipment_id: id,
      event_status: form.event_status,
      location: form.location || null,
      description: form.description || null,
      event_at: new Date(form.event_at).toISOString(),
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة الحدث");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["ship-events", id] });
  };

  const del = async (eid: string) => {
    const { error } = await supabase.from("shipment_events").delete().eq("id", eid);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["ship-events", id] });
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!ship) return <div className="p-8 text-center">الشحنة غير موجودة</div>;

  return (
    <div>
      <PageHeader
        title={`شحنة ${ship.shipment_number}`}
        subtitle={`${ship.status} · إلى ${ship.destination_country ?? "—"}`}
        actions={<Button asChild variant="outline"><Link to="/shipments"><ArrowRight className="w-4 h-4" /> رجوع</Link></Button>}
      />

      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Truck className="w-4 h-4" /> الناقل</div><div className="font-medium">{ship.carrier ?? "—"}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">التتبع</div><div className="font-mono">{ship.tracking_number ?? "—"}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">الوصول المتوقع</div><div>{ship.eta ?? "—"}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>الأحداث والمحطات ({events?.length ?? 0})</CardTitle>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> حدث جديد</Button>
        </CardHeader>
        <CardContent>
          {(events?.length ?? 0) === 0 ? (
            <div className="py-8 text-center text-muted-foreground">لا توجد أحداث بعد.</div>
          ) : (
            <ol className="relative border-r-2 border-muted pr-6 space-y-4">
              {events!.map((e: any) => (
                <li key={e.id} className="relative">
                  <span className="absolute -right-[31px] w-4 h-4 rounded-full bg-primary border-4 border-background" />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{EVENT_STATUSES.find(s => s.v === e.event_status)?.l ?? e.event_status}</Badge>
                        {e.location && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {e.location}</span>}
                      </div>
                      {e.description && <div className="text-sm mt-1">{e.description}</div>}
                      <div className="text-[11px] text-muted-foreground mt-1">{new Date(e.event_at).toLocaleString("ar-EG")}</div>
                    </div>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(e.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة حدث تتبع</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الحالة *</Label>
              <Select value={form.event_status} onValueChange={v => setForm({ ...form, event_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EVENT_STATUSES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>الموقع</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>الوقت</Label><Input type="datetime-local" dir="ltr" value={form.event_at} onChange={e => setForm({ ...form, event_at: e.target.value })} /></div>
            <div><Label>الوصف</Label><Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={addEvent}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
