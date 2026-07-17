import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/currencies")({ ssr: false, component: CurrenciesPage });

interface Currency { code: string; name_ar: string; name_en: string; symbol: string | null; decimals: number; is_active: boolean }
interface FxRate { id: string; code: string; base_code: string; rate: number; rate_date: string; source: string | null }

function CurrenciesPage() {
  const { hasPermission, isSystemOwner } = useAuth();
  const canManage = isSystemOwner || hasPermission("settings.manage");
  const [loading, setLoading] = useState(true);
  const [base, setBase] = useState("USD");
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [rates, setRates] = useState<FxRate[]>([]);
  const [newRate, setNewRate] = useState<{ code: string; rate: string }>({ code: "", rate: "" });

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: r }, { data: s }] = await Promise.all([
      supabase.from("currencies").select("*").order("code"),
      supabase.from("fx_rates").select("*").order("rate_date", { ascending: false }).limit(200),
      supabase.from("system_settings").select("base_currency").limit(1).maybeSingle(),
    ]);
    setCurrencies((c ?? []) as Currency[]);
    setRates((r ?? []) as FxRate[]);
    if (s?.base_currency) setBase(s.base_currency);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (code: string, val: boolean) => {
    if (!canManage) return toast.error("لا تملك الصلاحية");
    const { error } = await supabase.from("currencies").update({ is_active: val }).eq("code", code);
    if (error) return toast.error(error.message);
    setCurrencies((prev) => prev.map((c) => c.code === code ? { ...c, is_active: val } : c));
  };

  const saveBase = async () => {
    if (!canManage) return toast.error("لا تملك الصلاحية");
    const { data: s } = await supabase.from("system_settings").select("id").limit(1).maybeSingle();
    if (s?.id) {
      const { error } = await supabase.from("system_settings").update({ base_currency: base }).eq("id", s.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("system_settings").insert({ base_currency: base });
      if (error) return toast.error(error.message);
    }
    toast.success("تم تحديث العملة الأساسية");
  };

  const addRate = async () => {
    if (!canManage) return toast.error("لا تملك الصلاحية");
    if (!newRate.code || !newRate.rate) return toast.error("أدخل العملة والسعر");
    const { error } = await supabase.from("fx_rates").insert({
      code: newRate.code, base_code: base, rate: Number(newRate.rate), source: "manual",
    });
    if (error) return toast.error(error.message);
    setNewRate({ code: "", rate: "" });
    await load();
    toast.success("تم إضافة السعر");
  };

  const removeRate = async (id: string) => {
    if (!canManage) return;
    const { error } = await supabase.from("fx_rates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRates((prev) => prev.filter((r) => r.id !== id));
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="العملات وأسعار الصرف" subtitle="إدارة كتالوج العملات والعملة الأساسية وأسعار الصرف اليومية" />

      <Card>
        <CardHeader><CardTitle className="text-base">العملة الأساسية للنظام</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-3">
          <select
            className="border rounded-md px-3 py-2 bg-background text-foreground"
            value={base} onChange={(e) => setBase(e.target.value)} disabled={!canManage}
          >
            {currencies.filter(c => c.is_active).map(c => <option key={c.code} value={c.code}>{c.code} — {c.name_ar}</option>)}
          </select>
          <Button onClick={saveBase} disabled={!canManage} className="gap-2"><Save className="w-4 h-4" />حفظ</Button>
          <span className="text-xs text-muted-foreground">جميع الفواتير والطلبيات ستُقيَّم مقابل هذه العملة.</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">العملات المدعومة</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>الرمز</TableHead><TableHead>عربي</TableHead><TableHead>English</TableHead>
              <TableHead>Symbol</TableHead><TableHead>Decimals</TableHead><TableHead>مفعّلة</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {currencies.map(c => (
                <TableRow key={c.code}>
                  <TableCell className="font-mono font-bold">{c.code} {c.code === base && <Badge className="mr-1" variant="secondary">أساسية</Badge>}</TableCell>
                  <TableCell>{c.name_ar}</TableCell>
                  <TableCell>{c.name_en}</TableCell>
                  <TableCell>{c.symbol}</TableCell>
                  <TableCell>{c.decimals}</TableCell>
                  <TableCell>
                    <Switch checked={c.is_active} onCheckedChange={(v) => toggleActive(c.code, v)} disabled={!canManage} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">أسعار الصرف مقابل {base}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {canManage && (
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="text-xs">العملة</label>
                <select
                  className="border rounded-md px-3 py-2 bg-background block"
                  value={newRate.code}
                  onChange={(e) => setNewRate((s) => ({ ...s, code: e.target.value }))}
                >
                  <option value="">اختر…</option>
                  {currencies.filter(c => c.is_active && c.code !== base).map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs">السعر (1 وحدة = ؟ {base})</label>
                <Input type="number" step="0.00000001" value={newRate.rate} onChange={(e) => setNewRate((s) => ({ ...s, rate: e.target.value }))} className="w-40" />
              </div>
              <Button onClick={addRate} className="gap-2"><Plus className="w-4 h-4" />إضافة</Button>
            </div>
          )}

          <Table>
            <TableHeader><TableRow>
              <TableHead>العملة</TableHead><TableHead>مقابل</TableHead><TableHead>السعر</TableHead>
              <TableHead>التاريخ</TableHead><TableHead>المصدر</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rates.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.code}</TableCell>
                  <TableCell className="font-mono">{r.base_code}</TableCell>
                  <TableCell className="font-mono">{Number(r.rate).toLocaleString(undefined, { maximumFractionDigits: 8 })}</TableCell>
                  <TableCell>{r.rate_date}</TableCell>
                  <TableCell>{r.source ?? "—"}</TableCell>
                  <TableCell>
                    {canManage && (
                      <Button variant="ghost" size="icon" onClick={() => removeRate(r.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rates.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">لا توجد أسعار مسجلة بعد.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
