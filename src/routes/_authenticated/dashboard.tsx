import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import {
  Building2, Sparkles, Contact2, TrendingUp, Flame, Trophy,
  ShoppingCart, Ship, Wallet, DollarSign, AlertTriangle, PieChart as PieIcon,
  ClipboardCheck, Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: Dashboard,
});

function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats-v2"],
    queryFn: async () => {
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
      const monthISO = startOfMonth.toISOString();

      const [
        companies, contacts, leads, hotLeads, wonLeads,
        orders, activeShipments, monthPayments, pendingPayments,
        byStatus, byCountry, revenueTrend, topCompanies,
      ] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("temperature", "hot"),
        supabase.from("leads").select("expected_value").eq("status", "won"),
        supabase.from("orders").select("id, total, created_at, status"),
        supabase.from("shipments").select("id", { count: "exact", head: true }).in("status", ["booked", "in_transit"]),
        supabase.from("payments").select("amount, paid_at").gte("paid_at", monthISO).eq("status", "paid"),
        supabase.from("orders").select("id, total, paid_amount, order_number, company_id").gt("total", 0),
        supabase.from("leads").select("status"),
        supabase.from("companies").select("country"),
        supabase.from("orders").select("total, created_at").gte("created_at", new Date(Date.now() - 180 * 86400_000).toISOString()),
        supabase.from("orders").select("total, company_id").order("total", { ascending: false }).limit(200),
      ]);

      const statusCounts: Record<string, number> = {};
      (byStatus.data ?? []).forEach((r: any) => { statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1; });
      const countryCounts: Record<string, number> = {};
      (byCountry.data ?? []).forEach((r: any) => { const c = r.country || "غير محدد"; countryCounts[c] = (countryCounts[c] ?? 0) + 1; });
      const wonValue = (wonLeads.data ?? []).reduce((s: number, r: any) => s + (Number(r.expected_value) || 0), 0);
      const monthRevenue = (monthPayments.data ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const pendingAmount = (pendingPayments.data ?? []).reduce((s: number, r: any) => s + Math.max(0, Number(r.total || 0) - Number(r.paid_amount || 0)), 0);

      const buckets: Record<string, number> = {};
      (revenueTrend.data ?? []).forEach((r: any) => {
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        buckets[key] = (buckets[key] ?? 0) + Number(r.total || 0);
      });
      const trend = Object.entries(buckets).sort().slice(-6).map(([k, v]) => ({ month: k, revenue: v }));

      const companyTotals: Record<string, number> = {};
      (topCompanies.data ?? []).forEach((r: any) => { if (r.company_id) companyTotals[r.company_id] = (companyTotals[r.company_id] ?? 0) + Number(r.total || 0); });
      const topIds = Object.entries(companyTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
      let topRows: { name: string; total: number }[] = [];
      if (topIds.length) {
        const { data: cs } = await supabase.from("companies").select("id,name_en,name_ar").in("id", topIds.map(t => t[0]));
        const map = Object.fromEntries((cs ?? []).map((c: any) => [c.id, c.name_en || c.name_ar || "—"]));
        topRows = topIds.map(([id, total]) => ({ name: map[id] || "—", total }));
      }

      return {
        companies: companies.count ?? 0,
        contacts: contacts.count ?? 0,
        leads: leads.count ?? 0,
        hot: hotLeads.count ?? 0,
        wonValue,
        ordersCount: orders.data?.length ?? 0,
        activeShipments: activeShipments.count ?? 0,
        monthRevenue,
        pendingAmount,
        statusData: Object.entries(statusCounts).map(([k, v]) => ({ name: k, value: v })),
        countryData: Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ country: k, count: v })),
        trend,
        topRows,
      };
    },
  });

  const fmt = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  const kpiCards = [
    { label: "الشركات", value: stats?.companies ?? 0, icon: Building2, tone: "text-primary", to: "/companies" },
    { label: "جهات الاتصال", value: stats?.contacts ?? 0, icon: Contact2, tone: "text-chart-5", to: "/contacts" },
    { label: "العملاء المحتملون", value: stats?.leads ?? 0, icon: Sparkles, tone: "text-gold", to: "/leads" },
    { label: "Hot Leads", value: stats?.hot ?? 0, icon: Flame, tone: "text-destructive", to: "/leads" },
    { label: "الطلبيات", value: stats?.ordersCount ?? 0, icon: ShoppingCart, tone: "text-primary", to: "/orders" },
    { label: "شحنات نشطة", value: stats?.activeShipments ?? 0, icon: Ship, tone: "text-chart-3", to: "/shipments" },
    { label: "إيرادات الشهر", value: fmt(stats?.monthRevenue ?? 0), icon: DollarSign, tone: "text-success", to: "/payments" },
    { label: "مستحقات معلّقة", value: fmt(stats?.pendingAmount ?? 0), icon: AlertTriangle, tone: "text-warning", to: "/payments" },
    { label: "قيمة الصفقات المكتسبة", value: fmt(stats?.wonValue ?? 0), icon: Trophy, tone: "text-success", to: "/leads" },
    { label: "نشاط إجمالي", value: (stats?.companies ?? 0) + (stats?.leads ?? 0), icon: TrendingUp, tone: "text-primary", to: "/reports" },
  ];

  const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--destructive)", "var(--muted-foreground)"];

  return (
    <div>
      <PageHeader title="لوحة التحكم" subtitle="نظرة عامة على أداء التصدير والمبيعات الدولية" />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {kpiCards.map((c) => (
          <Link key={c.label} to={c.to} className="block">
            <Card className="transition-all hover:shadow-md hover:-translate-y-0.5 h-full">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-2">
                  <c.icon className={`w-5 h-5 ${c.tone}`} />
                </div>
                {isLoading ? <Skeleton className="h-7 w-20" /> :
                  <div className="text-xl md:text-2xl font-bold text-foreground truncate">{c.value}</div>}
                <div className="text-[11px] md:text-xs text-muted-foreground mt-1 truncate">{c.label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">اتجاه الإيرادات (آخر 6 أشهر)</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> :
              !stats?.trend?.length ? (
                <EmptyState icon={TrendingUp} title="لا توجد إيرادات بعد" description="ستظهر هنا حالما تُنشئ طلبيات." compact />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.trend}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">توزيع الليدز</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> :
              !stats?.statusData?.length ? (
                <EmptyState icon={PieIcon} title="لا توجد ليدز بعد" compact />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={stats.statusData} dataKey="value" nameKey="name" outerRadius={80} label={{ fontSize: 10 }}>
                      {stats.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">الشركات حسب الدولة</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> :
              !stats?.countryData?.length ? (
                <EmptyState icon={Building2} title="لا توجد شركات بعد" compact />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.countryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="country" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--chart-2)" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wallet className="w-4 h-4" /> أعلى 5 عملاء (بالقيمة)</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> :
              !stats?.topRows?.length ? (
                <EmptyState icon={Trophy} title="لا توجد طلبيات بعد" compact />
              ) : (
                <ul className="space-y-3">
                  {stats.topRows.map((r, i) => (
                    <li key={i} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-bold text-sm">{i + 1}</div>
                        <span className="truncate text-sm">{r.name}</span>
                      </div>
                      <Badge variant="secondary" className="shrink-0">{fmt(r.total)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
