import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Target, Ship, Wallet, Users, Award, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({ ssr: false, component: Reports });

function Reports() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports-all"],
    queryFn: async () => {
      const [opps, orders, payments, shipments, leads, samples] = await Promise.all([
        supabase.from("opportunities").select("stage,amount,currency,expected_close_date,created_at"),
        supabase.from("orders").select("status,total,paid_amount,currency,order_date"),
        supabase.from("payments").select("status,amount,currency,due_date,paid_at"),
        supabase.from("shipments").select("status,destination_country,freight_cost"),
        supabase.from("leads").select("source,status,country,temperature,expected_value"),
        supabase.from("samples").select("status"),
      ]);
      return {
        opps: opps.data ?? [], orders: orders.data ?? [], payments: payments.data ?? [],
        shipments: shipments.data ?? [], leads: leads.data ?? [], samples: samples.data ?? [],
      };
    },
  });

  if (isLoading || !data) return <div><PageHeader title="التقارير" /><Skeleton className="h-96 w-full" /></div>;

  const pipelineByStage = groupSum(data.opps, "stage", "amount");
  const wonAmount = (data.opps as any[]).filter(o => o.stage === "won").reduce((a, o) => a + Number(o.amount || 0), 0);
  const lostAmount = (data.opps as any[]).filter(o => o.stage === "lost").reduce((a, o) => a + Number(o.amount || 0), 0);
  const winRate = (wonAmount + lostAmount) > 0 ? (wonAmount / (wonAmount + lostAmount)) * 100 : 0;

  const totalRevenue = (data.orders as any[]).reduce((a, o) => a + Number(o.total || 0), 0);
  const totalPaid = (data.orders as any[]).reduce((a, o) => a + Number(o.paid_amount || 0), 0);
  const outstanding = totalRevenue - totalPaid;

  const overduePayments = (data.payments as any[]).filter(p => {
    return p.status !== "paid" && p.due_date && new Date(p.due_date) < new Date();
  });
  const overdueAmount = overduePayments.reduce((a, p) => a + Number(p.amount || 0), 0);

  const leadsBySource = groupCount(data.leads, "source");
  const leadsByCountry = groupCount(data.leads, "country");
  const shipmentsByCountry = groupCount(data.shipments, "destination_country");
  const ordersByStatus = groupCount(data.orders, "status");
  const samplesByStatus = groupCount(data.samples, "status");

  return (
    <div>
      <PageHeader title="التقارير والتحليلات" subtitle="ملخص أداء التصدير" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi icon={Target} label="حجم الـ Pipeline" value={sum(data.opps, "amount").toLocaleString()} color="text-blue-500" />
        <Kpi icon={Award} label="Win Rate" value={`${winRate.toFixed(1)}%`} color="text-success" />
        <Kpi icon={DollarSign} label="إجمالي الطلبيات" value={totalRevenue.toLocaleString()} color="text-primary" />
        <Kpi icon={Wallet} label="المحصّل" value={totalPaid.toLocaleString()} color="text-success" />
        <Kpi icon={TrendingUp} label="متبقي التحصيل" value={outstanding.toLocaleString()} color="text-warning" />
        <Kpi icon={AlertTriangle} label="متأخرات" value={overdueAmount.toLocaleString()} color="text-destructive" sub={`${overduePayments.length} دفعة`} />
        <Kpi icon={Ship} label="عدد الشحنات" value={data.shipments.length.toString()} color="text-indigo-500" />
        <Kpi icon={Users} label="عدد الليدز" value={data.leads.length.toString()} color="text-amber-500" />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Section title="Pipeline حسب المرحلة" items={pipelineByStage} format={(v) => v.toLocaleString()} />
        <Section title="الطلبيات حسب الحالة" items={ordersByStatus} />
        <Section title="الليدز حسب المصدر" items={leadsBySource} />
        <Section title="الليدز حسب الدولة" items={leadsByCountry} />
        <Section title="الشحنات حسب الوجهة" items={shipmentsByCountry} />
        <Section title="العينات حسب الحالة" items={samplesByStatus} />
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, color, sub }: any) {
  return (
    <Card><CardContent className="pt-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className={`w-4 h-4 ${color}`} /> {label}
      </div>
      <div className="text-xl font-bold font-mono">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-1">{sub}</div>}
    </CardContent></Card>
  );
}

function Section({ title, items, format }: { title: string; items: [string, number][]; format?: (v: number) => string }) {
  const max = Math.max(1, ...items.map(([, v]) => v));
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? <div className="text-xs text-muted-foreground">لا توجد بيانات</div> : (
          <div className="space-y-2">
            {items.map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="truncate">{k || "—"}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">{format ? format(v) : v}</Badge>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(v / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function sum(arr: any[], field: string) {
  return arr.reduce((a, r) => a + Number(r[field] || 0), 0);
}
function groupSum(arr: any[], key: string, valueField: string): [string, number][] {
  const m = new Map<string, number>();
  for (const r of arr) m.set(r[key] ?? "—", (m.get(r[key] ?? "—") ?? 0) + Number(r[valueField] || 0));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
function groupCount(arr: any[], key: string): [string, number][] {
  const m = new Map<string, number>();
  for (const r of arr) m.set(r[key] ?? "—", (m.get(r[key] ?? "—") ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
