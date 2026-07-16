import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { Building2, Sparkles, Contact2, TrendingUp, Flame, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: Dashboard,
});

function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [companies, contacts, leads, hotLeads, wonLeads, byStatus, byCountry] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("temperature", "hot"),
        supabase.from("leads").select("expected_value").eq("status", "won"),
        supabase.from("leads").select("status"),
        supabase.from("companies").select("country"),
      ]);
      const statusCounts: Record<string, number> = {};
      (byStatus.data ?? []).forEach((r: { status: string }) => {
        statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
      });
      const countryCounts: Record<string, number> = {};
      (byCountry.data ?? []).forEach((r: { country: string | null }) => {
        const c = r.country || "غير محدد";
        countryCounts[c] = (countryCounts[c] ?? 0) + 1;
      });
      const wonValue = (wonLeads.data ?? []).reduce(
        (s: number, r: { expected_value: number | null }) => s + (Number(r.expected_value) || 0), 0);
      return {
        companies: companies.count ?? 0,
        contacts: contacts.count ?? 0,
        leads: leads.count ?? 0,
        hot: hotLeads.count ?? 0,
        wonValue,
        statusData: Object.entries(statusCounts).map(([k, v]) => ({ name: k, value: v })),
        countryData: Object.entries(countryCounts)
          .sort((a, b) => b[1] - a[1]).slice(0, 8)
          .map(([k, v]) => ({ country: k, count: v })),
      };
    },
  });

  const cards = [
    { label: "الشركات", value: stats?.companies ?? 0, icon: Building2, color: "text-primary" },
    { label: "جهات الاتصال", value: stats?.contacts ?? 0, icon: Contact2, color: "text-chart-5" },
    { label: "العملاء المحتملون", value: stats?.leads ?? 0, icon: Sparkles, color: "text-gold" },
    { label: "Hot Leads", value: stats?.hot ?? 0, icon: Flame, color: "text-destructive" },
    { label: "قيمة الصفقات المكتسبة", value: `$${(stats?.wonValue ?? 0).toLocaleString()}`, icon: Trophy, color: "text-success" },
    { label: "إجمالي النشاط", value: (stats?.companies ?? 0) + (stats?.leads ?? 0), icon: TrendingUp, color: "text-warning" },
  ];

  const COLORS = ["oklch(0.28 0.08 260)", "oklch(0.78 0.12 85)", "oklch(0.62 0.16 150)", "oklch(0.72 0.17 60)", "oklch(0.55 0.20 300)", "oklch(0.58 0.22 25)", "oklch(0.50 0.05 260)"];

  return (
    <div>
      <PageHeader title="لوحة التحكم" subtitle="نظرة عامة على أداء التصدير والمبيعات الدولية" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
              {isLoading ? <Skeleton className="h-7 w-20" /> :
                <div className="text-2xl font-bold text-primary">{c.value}</div>}
              <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">الشركات حسب الدولة</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> :
              (stats?.countryData?.length ?? 0) === 0 ?
                <EmptyChart label="لا توجد بيانات بعد" /> :
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats!.countryData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="country" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="oklch(0.28 0.08 260)" radius={[8,8,0,0]} />
                  </BarChart>
                </ResponsiveContainer>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">توزيع الليدز حسب المرحلة</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> :
              (stats?.statusData?.length ?? 0) === 0 ?
                <EmptyChart label="لا توجد ليدز بعد" /> :
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={stats!.statusData} dataKey="value" nameKey="name" outerRadius={90} label>
                      {stats!.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">{label}</div>;
}
