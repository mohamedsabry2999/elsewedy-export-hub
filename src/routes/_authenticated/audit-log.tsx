import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck, Download, Eye } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { toCSV, downloadCSV } from "@/lib/csv";

export const Route = createFileRoute("/_authenticated/audit-log")({
  ssr: false,
  component: AuditLog,
});

const ENTITY_LABELS: Record<string, string> = {
  companies: "شركات", contacts: "جهات اتصال", leads: "عملاء محتملون",
  opportunities: "فرص", quotations: "عروض أسعار", orders: "طلبيات",
  shipments: "شحنات", payments: "مدفوعات", products: "منتجات",
  tasks: "مهام", samples: "عينات", exhibitions: "معارض",
  export_documents: "مستندات تصدير", user_roles: "أدوار المستخدمين",
  role_permissions: "صلاحيات الأدوار", system_settings: "إعدادات النظام",
};
const ACTION_COLORS: Record<string, string> = {
  insert: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  update: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  delete: "bg-red-500/15 text-red-600 border-red-500/30",
};

function AuditLog() {
  const { isAdmin } = useAuth();
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,full_name,email");
      const m: Record<string, string> = {};
      (data ?? []).forEach((p: any) => (m[p.id] = p.full_name || p.email));
      return m;
    },
    enabled: isAdmin,
  });

  const filtered = useMemo(() => {
    return (data ?? []).filter((r: any) => {
      if (entityFilter && r.entity_type !== entityFilter) return false;
      if (actionFilter && r.action !== actionFilter) return false;
      if (fromDate && new Date(r.created_at) < new Date(fromDate)) return false;
      if (toDate && new Date(r.created_at) > new Date(toDate + "T23:59:59")) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${r.entity_type} ${r.entity_id} ${JSON.stringify(r.details ?? "")}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [data, entityFilter, actionFilter, fromDate, toDate, search]);

  const entities = useMemo(() => Array.from(new Set((data ?? []).map((r: any) => r.entity_type))).sort(), [data]);

  const exportAudit = () => {
    if (!filtered.length) return;
    const rows = filtered.map((r: any) => ({
      created_at: r.created_at,
      actor: profiles?.[r.actor_id] || r.actor_id || "—",
      action: r.action,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      details: JSON.stringify(r.details ?? {}),
    }));
    downloadCSV(`audit-log-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows));
  };

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="سجل التدقيق" />
        <Card><CardContent className="py-16 text-center text-muted-foreground">صلاحية الأدمن مطلوبة</CardContent></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="سجل التدقيق"
        subtitle={`${filtered.length} من ${data?.length ?? 0} حدث`}
        actions={
          <Button variant="outline" size="sm" onClick={exportAudit} disabled={!filtered.length}>
            <Download className="w-4 h-4" /> تصدير CSV
          </Button>
        }
      />

      <Card className="mb-4"><CardContent className="pt-4">
        <div className="grid md:grid-cols-5 gap-3">
          <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
            <option value="">كل الكيانات</option>
            {entities.map(e => <option key={e} value={e}>{ENTITY_LABELS[e] || e}</option>)}
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
            <option value="">كل العمليات</option>
            <option value="insert">إضافة</option>
            <option value="update">تعديل</option>
            <option value="delete">حذف</option>
          </select>
          <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-4">
        {isLoading ? <Skeleton className="h-40 w-full" /> :
          filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <ShieldCheck className="w-12 h-12 mx-auto opacity-50 mb-3" />
              لا يوجد سجل مطابق
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>الإجراء</TableHead>
                  <TableHead>الكيان</TableHead>
                  <TableHead>المعرف</TableHead>
                  <TableHead className="text-left">تفاصيل</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString("ar-EG")}</TableCell>
                      <TableCell className="text-xs">{profiles?.[r.actor_id] || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={ACTION_COLORS[r.action]}>{r.action}</Badge></TableCell>
                      <TableCell>{ENTITY_LABELS[r.entity_type] || r.entity_type}</TableCell>
                      <TableCell className="font-mono text-xs">{r.entity_id?.slice(0, 8) || "—"}</TableCell>
                      <TableCell className="text-left">
                        <Button size="icon" variant="ghost" onClick={() => setPreview(r)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </CardContent></Card>

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>تفاصيل الحدث</DialogTitle></DialogHeader>
          {preview && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">التاريخ:</span> {new Date(preview.created_at).toLocaleString("ar-EG")}</div>
                <div><span className="text-muted-foreground">المستخدم:</span> {profiles?.[preview.actor_id] || "—"}</div>
                <div><span className="text-muted-foreground">الإجراء:</span> {preview.action}</div>
                <div><span className="text-muted-foreground">الكيان:</span> {ENTITY_LABELS[preview.entity_type] || preview.entity_type}</div>
                <div className="col-span-2"><span className="text-muted-foreground">المعرف:</span> <span className="font-mono">{preview.entity_id}</span></div>
              </div>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap" dir="ltr">
                {JSON.stringify(preview.details, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
