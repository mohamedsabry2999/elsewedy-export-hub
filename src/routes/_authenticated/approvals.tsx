import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { PermissionGuard } from "@/components/PermissionGuard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Check, X, Ban, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/approvals")({
  ssr: false,
  component: () => (
    <PermissionGuard permission="approvals.read">
      <Approvals />
    </PermissionGuard>
  ),
});

type ApprovalRow = {
  id: string; entity_type: string; entity_id: string;
  requested_by: string; approver_id: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reason: string | null; decision_note: string | null;
  decided_at: string | null; created_at: string;
};

const ENTITY_TYPES = [
  { v: "quotation", l: "عرض سعر" },
  { v: "order", l: "طلبية" },
  { v: "payment", l: "دفعة" },
  { v: "shipment", l: "شحنة" },
  { v: "sample", l: "عينة" },
  { v: "other", l: "أخرى" },
];

const STATUS_META: Record<string, { l: string; c: string }> = {
  pending: { l: "قيد الانتظار", c: "bg-amber-500/15 text-amber-600 border-amber-500/40" },
  approved: { l: "تمت الموافقة", c: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40" },
  rejected: { l: "مرفوض", c: "bg-destructive/15 text-destructive border-destructive/40" },
  cancelled: { l: "ملغى", c: "bg-muted text-muted-foreground" },
};

function Approvals() {
  const qc = useQueryClient();
  const { user, hasPermission, isSystemOwner } = useAuth();
  const canManage = isSystemOwner || hasPermission("approvals.manage");
  const canCreate = isSystemOwner || hasPermission("approvals.create");
  const [tab, setTab] = useState<"pending" | "mine" | "assigned" | "all">("pending");
  const [open, setOpen] = useState(false);
  const [decide, setDecide] = useState<ApprovalRow | null>(null);
  const [decideStatus, setDecideStatus] = useState<"approved" | "rejected">("approved");
  const [decideNote, setDecideNote] = useState("");
  const [form, setForm] = useState({ entity_type: "quotation", entity_id: "", reason: "", approver_id: "" });
  const [saving, setSaving] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["approvals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("approvals").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApprovalRow[];
    },
  });
  const { data: users } = useQuery({
    queryKey: ["profiles-min"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,full_name,email");
      return (data ?? []) as { id: string; full_name: string | null; email: string }[];
    },
  });
  const userLabel = (id: string | null) => {
    if (!id) return "—";
    const u = users?.find(x => x.id === id);
    return u ? (u.full_name || u.email) : id.slice(0, 8);
  };

  const filtered = (rows ?? []).filter(r => {
    if (tab === "pending") return r.status === "pending";
    if (tab === "mine") return r.requested_by === user?.id;
    if (tab === "assigned") return r.approver_id === user?.id;
    return true;
  });

  const submit = async () => {
    if (!form.entity_type || !form.entity_id.trim()) { toast.error("النوع والمعرّف مطلوبان"); return; }
    setSaving(true);
    const { error } = await supabase.from("approvals").insert({
      entity_type: form.entity_type,
      entity_id: form.entity_id.trim(),
      requested_by: user!.id,
      approver_id: form.approver_id || null,
      reason: form.reason || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم إرسال الطلب");
    setOpen(false);
    setForm({ entity_type: "quotation", entity_id: "", reason: "", approver_id: "" });
    qc.invalidateQueries({ queryKey: ["approvals"] });
  };

  const openDecide = (row: ApprovalRow, status: "approved" | "rejected") => {
    setDecide(row); setDecideStatus(status); setDecideNote("");
  };
  const applyDecide = async () => {
    if (!decide) return;
    const { error } = await supabase.from("approvals").update({
      status: decideStatus,
      decision_note: decideNote || null,
      decided_at: new Date().toISOString(),
    }).eq("id", decide.id);
    if (error) { toast.error(error.message); return; }
    toast.success(decideStatus === "approved" ? "تمت الموافقة" : "تم الرفض");
    setDecide(null);
    qc.invalidateQueries({ queryKey: ["approvals"] });
  };
  const cancel = async (row: ApprovalRow) => {
    const { error } = await supabase.from("approvals").update({ status: "cancelled" }).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["approvals"] });
  };

  return (
    <div>
      <PageHeader
        title="الموافقات"
        subtitle={`${filtered.length} طلب`}
        actions={canCreate && (
          <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> طلب موافقة</Button>
        )}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending">قيد الانتظار</TabsTrigger>
          <TabsTrigger value="assigned">مسندة إليّ</TabsTrigger>
          <TabsTrigger value="mine">طلباتي</TabsTrigger>
          <TabsTrigger value="all">الكل</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          <Card><CardContent className="pt-4">
            {isLoading ? <Skeleton className="h-40 w-full" /> :
              filtered.length === 0 ? (
                <EmptyState icon={ClipboardCheck} title="لا توجد طلبات موافقة" description="ابدأ بإنشاء طلب موافقة جديد" />
              ) : (
                <div className="space-y-2">
                  {filtered.map(r => {
                    const st = STATUS_META[r.status];
                    const entityLabel = ENTITY_TYPES.find(e => e.v === r.entity_type)?.l ?? r.entity_type;
                    const canDecide = r.status === "pending" && (r.approver_id === user?.id || canManage);
                    const canCancel = r.status === "pending" && (r.requested_by === user?.id || canManage);
                    return (
                      <div key={r.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={st.c}>{st.l}</Badge>
                              <Badge variant="outline">{entityLabel}</Badge>
                              <span className="text-xs text-muted-foreground font-mono">{r.entity_id.slice(0, 8)}</span>
                            </div>
                            {r.reason && <div className="text-sm mt-2">{r.reason}</div>}
                            <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1">
                              <span>مقدّم من: {userLabel(r.requested_by)}</span>
                              <span>المعتمد: {userLabel(r.approver_id)}</span>
                              <span>{new Date(r.created_at).toLocaleString("ar-EG")}</span>
                            </div>
                            {r.decision_note && (
                              <div className="text-xs mt-2 p-2 rounded bg-muted/50">
                                <span className="font-medium">ملاحظة القرار:</span> {r.decision_note}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {canDecide && (
                              <>
                                <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-500/40"
                                  onClick={() => openDecide(r, "approved")}><Check className="w-4 h-4" /> موافقة</Button>
                                <Button size="sm" variant="outline" className="text-destructive border-destructive/40"
                                  onClick={() => openDecide(r, "rejected")}><X className="w-4 h-4" /> رفض</Button>
                              </>
                            )}
                            {canCancel && (
                              <Button size="sm" variant="ghost" onClick={() => cancel(r)}><Ban className="w-4 h-4" /> إلغاء</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>طلب موافقة جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <F label="نوع الكيان *">
              <Select value={form.entity_type} onValueChange={v => setForm({ ...form, entity_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENTITY_TYPES.map(e => <SelectItem key={e.v} value={e.v}>{e.l}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="معرّف السجل *">
              <Input value={form.entity_id} onChange={e => setForm({ ...form, entity_id: e.target.value })} placeholder="UUID الخاص بالسجل" dir="ltr" />
            </F>
            <F label="المعتمد (اختياري)">
              <Select value={form.approver_id} onValueChange={v => setForm({ ...form, approver_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر معتمداً" /></SelectTrigger>
                <SelectContent>
                  {users?.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="السبب / التفاصيل">
              <Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={3} />
            </F>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "جاري..." : "إرسال"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!decide} onOpenChange={(o) => !o && setDecide(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decideStatus === "approved" ? "الموافقة على الطلب" : "رفض الطلب"}</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="text-xs mb-1 block">ملاحظة (اختياري)</Label>
            <Textarea value={decideNote} onChange={e => setDecideNote(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecide(null)}>إلغاء</Button>
            <Button onClick={applyDecide} variant={decideStatus === "approved" ? "default" : "destructive"}>
              {decideStatus === "approved" ? "تأكيد الموافقة" : "تأكيد الرفض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs mb-1 block">{label}</Label>{children}</div>;
}
