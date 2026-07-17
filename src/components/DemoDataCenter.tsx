import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Trash2, RefreshCw, Database } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface SeedRun {
  id: string;
  name: string;
  scenario: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  deleted_at: string | null;
  summary: any;
  error_message: string | null;
}

export function DemoDataCenter() {
  const { isSystemOwner } = useAuth();
  const [runs, setRuns] = useState<SeedRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("demo_seed_runs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRuns((data as SeedRun[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (isSystemOwner) load(); }, [isSystemOwner]);

  if (!isSystemOwner) return null;

  const runSeed = async () => {
    setSeeding(true);
    const { data, error } = await supabase.rpc("seed_demo_data", { _scale: "full", _scenario: "export_full_cycle" });
    setSeeding(false);
    if (error) return toast.error(error.message);
    const counts = (data as any)?.counts ?? {};
    const total = Object.values(counts).reduce((a: number, b: any) => a + Number(b || 0), 0);
    toast.success(`تم إنشاء ${total} سجل تجريبي (بما فيها سيناريو Golden Path)`);
    load();
  };

  const resetRun = async (id: string) => {
    setResettingId(id);
    const { error } = await supabase.rpc("reset_demo_data", { _run_id: id });
    setResettingId(null);
    if (error) return toast.error(error.message);
    toast.success("تم حذف البيانات التجريبية لهذه التشغيلة");
    load();
  };

  const activeRuns = runs.filter(r => r.status === "completed" || r.status === "active");
  const totalActiveRows = activeRuns.reduce((sum, r) => {
    const counts = r.summary?.counts ?? {};
    return sum + Object.values(counts).reduce((a: number, b: any) => a + Number(b || 0), 0);
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="w-5 h-5 text-brand-red" />
          مركز البيانات التجريبية
          <Badge variant="outline" className="mr-2">System Owner فقط</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          يولّد سيناريو تصدير متكامل (Golden Path) يمتد من عميل محتمل ← فرصة ← عرض سعر ← طلبية ← إنتاج ← شحن ← دفع ← مستندات،
          بالإضافة إلى ~180 سجل موزّع على 22 جدول للاختبار. جميع السجلات موسومة بمعرّف تشغيلة لحذفها بأمان بضغطة واحدة.
        </p>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="text-sm">
            التشغيلات النشطة: <strong>{activeRuns.length}</strong> • إجمالي السجلات: <strong>{totalActiveRows}</strong>
          </div>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> تحديث
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={seeding} className="gap-2 bg-brand-red hover:bg-brand-red/90">
                {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                توليد بيانات تجريبية
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>توليد سيناريو Golden Path كامل</AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم إنشاء ~180 سجل موسوم بمعرّف تشغيلة (شركات، جهات، عملاء محتملين، فرص، عروض أسعار، طلبيات، شحنات، مدفوعات، مستندات، مهام، أنشطة، إشعارات). لن يمس أي بيانات حقيقية موجودة.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={runSeed}>تنفيذ</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التشغيلة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  لا توجد تشغيلات بيانات تجريبية بعد.
                </TableCell></TableRow>
              )}
              {runs.map((r) => {
                const counts = r.summary?.counts ?? {};
                const total = Object.values(counts).reduce((a: number, b: any) => a + Number(b || 0), 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "completed" ? "default" : r.status === "deleted" ? "outline" : "secondary"}>
                        {r.status === "completed" ? "مكتمل" : r.status === "deleted" ? "محذوف" : r.status === "active" ? "قيد التنفيذ" : r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{total}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("ar-EG")}
                    </TableCell>
                    <TableCell className="text-left">
                      {r.status !== "deleted" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive" disabled={resettingId === r.id}>
                              {resettingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} حذف
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف بيانات التشغيلة</AlertDialogTitle>
                              <AlertDialogDescription>
                                سيتم حذف كل السجلات التي أنشأتها هذه التشغيلة فقط ({total} سجل). البيانات الحقيقية آمنة.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => resetRun(r.id)} className="bg-destructive text-destructive-foreground">
                                حذف نهائي
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
