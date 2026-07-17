import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Target, Ship, Wallet, Users, Award, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/reports")({ ssr: false, component: Reports });

const COLORS = ["#b48d42", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

function Reports() {
  const { data: baseCurrency } = useQuery({
    queryKey: ["system-base-currency"],
    queryFn: async () => {
      const { data } = await supabase.from("system_settings").select("base_currency").order("created_at").limit(1).maybeSingle();
      return (data?.base_currency as string) || "USD";
    },
  });
  const { data, isLoading } = useQuery({
    queryKey: ["reports-all"],
    queryFn: async () => {
      const [opps, orders, payments, shipments, leads, samples, companies] = await Promise.all([
        supabase.from("opportunities").select("stage,amount,currency,expected_close_date,created_at"),
        supabase.from("orders").select("id,order_number,company_id,status,total,base_total,paid_amount,currency,exchange_rate,order_date"),
        supabase.from("payments").select("status,amount,base_amount,currency,due_date,paid_at,order_id"),
        supabase.from("shipments").select("status,destination_country,freight_cost,shipped_at"),
        supabase.from("leads").select("source,status,country,temperature,expected_value"),
        supabase.from("samples").select("status"),
        supabase.from("companies").select("id,name_en,country"),
      ]);
      return {
        opps: opps.data ?? [], orders: orders.data ?? [], payments: payments.data ?? [],
        shipments: shipments.data ?? [], leads: leads.data ?? [], samples: samples.data ?? [],
        companies: companies.data ?? [],
      };
    },
  });

  if (isLoading || !data) return <div><PageHeader title="التقارير" /><Skeleton className="h-96 w-full" /></div>;

  const base = baseCurrency || "USD";
  const wonAmount = (data.opps as any[]).filter(o => o.stage === "won").reduce((a, o) => a + Number(o.amount || 0), 0);
  const lostAmount = (data.opps as any[]).filter(o => o.stage === "lost").reduce((a, o) => a + Number(o.amount || 0), 0);
  const winRate = (wonAmount + lostAmount) > 0 ? (wonAmount / (wonAmount + lostAmount)) * 100 : 0;

  // Use base_total for consistent cross-currency aggregation; fall back to total when null
  const totalRevenue = (data.orders as any[]).reduce((a, o) => a + Number(o.base_total ?? o.total ?? 0), 0);
  const totalPaid = (data.payments as any[]).filter(p => p.status === "paid" || p.status === "partial")
    .reduce((a, p) => a + Number(p.base_amount ?? p.amount ?? 0), 0);
  const outstanding = totalRevenue - totalPaid;

  const overduePayments = (data.payments as any[]).filter(p => p.status !== "paid" && p.due_date && new Date(p.due_date) < new Date());
  const overdueAmount = overduePayments.reduce((a, p) => a + Number(p.base_amount ?? p.amount ?? 0), 0);

  // Monthly revenue trend (last 12 months)
  const monthly = new Map<string, { month: string; revenue: number; paid: number }>();
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthly.set(key, { month: key, revenue: 0, paid: 0 });
  }
  for (const o of data.orders as any[]) {
    if (!o.order_date) continue;
    const d = new Date(o.order_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const m = monthly.get(key);
    if (m) { m.revenue += Number(o.total || 0); m.paid += Number(o.paid_amount || 0); }
  }
  const trendData = [...monthly.values()];

  // Top companies by revenue
  const compMap = new Map((data.companies as any[]).map(c => [c.id, c]));
  const byCompany = new Map<string, number>();
  for (const o of data.orders as any[]) {
    if (!o.company_id) continue;
    byCompany.set(o.company_id, (byCompany.get(o.company_id) ?? 0) + Number(o.total || 0));
  }
  const topCompanies = [...byCompany.entries()]
    .map(([id, v]) => ({ name: (compMap.get(id) as any)?.name_en ?? "—", value: v }))
    .sort((a, b) => b.value - a.value).slice(0, 8);

  // Pipeline by stage
  const stageAgg = new Map<string, number>();
  for (const o of data.opps as any[]) stageAgg.set(o.stage ?? "—", (stageAgg.get(o.stage ?? "—") ?? 0) + Number(o.amount || 0));
  const pipelineData = [...stageAgg.entries()].map(([name, value]) => ({ name, value }));

  // Shipments by destination
  const destAgg = new Map<string, number>();
  for (const s of data.shipments as any[]) destAgg.set(s.destination_country ?? "—", (destAgg.get(s.destination_country ?? "—") ?? 0) + 1);
  const destData = [...destAgg.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

  return (
    <div>
      <PageHeader title="التقارير التنفيذية" subtitle="ملخص أداء التصدير" />

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

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card><CardHeader><CardTitle className="text-sm">اتجاه الإيرادات (آخر 12 شهر)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" style={{ fontSize: 10 }} />
                <YAxis style={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="الطلبيات" stroke="#b48d42" strokeWidth={2} />
                <Line type="monotone" dataKey="paid" name="المحصّل" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle className="text-sm">أفضل العملاء</CardTitle></CardHeader>
          <CardContent className="h-72">
            {topCompanies.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCompanies} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" style={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={120} style={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#b48d42" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle className="text-sm">Pipeline حسب المرحلة</CardTitle></CardHeader>
          <CardContent className="h-72">
            {pipelineData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pipelineData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {pipelineData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle className="text-sm">الشحنات حسب الوجهة</CardTitle></CardHeader>
          <CardContent className="h-72">
            {destData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={destData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" style={{ fontSize: 10 }} />
                  <YAxis style={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">المدفوعات المتأخرة</CardTitle></CardHeader>
        <CardContent>
          {overduePayments.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">لا توجد دفعات متأخرة 🎉</div>
          ) : (
            <div className="space-y-2">
              {overduePayments.slice(0, 10).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded border border-destructive/20 bg-destructive/5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="text-sm">استحقاق: {p.due_date}</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-destructive">{Number(p.amount).toLocaleString()} {p.currency}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Empty() { return <div className="h-full flex items-center justify-center text-xs text-muted-foreground">لا توجد بيانات كافية</div>; }

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

function sum(arr: any[], field: string) {
  return arr.reduce((a, r) => a + Number(r[field] || 0), 0);
}
