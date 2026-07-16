import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/audit-log")({
  ssr: false,
  component: AuditLog,
});

function AuditLog() {
  const { isAdmin } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

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
      <PageHeader title="سجل التدقيق" subtitle={`${data?.length ?? 0} حدث`} />
      <Card><CardContent className="pt-4">
        {isLoading ? <Skeleton className="h-40 w-full" /> :
          !data || data.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <ShieldCheck className="w-12 h-12 mx-auto opacity-50 mb-3" />
              لا يوجد سجل حتى الآن
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>الإجراء</TableHead>
                <TableHead>الكيان</TableHead>
                <TableHead>المعرف</TableHead>
                <TableHead>التفاصيل</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("ar-EG")}</TableCell>
                    <TableCell><Badge variant="outline">{r.action}</Badge></TableCell>
                    <TableCell>{r.entity_type}</TableCell>
                    <TableCell className="font-mono text-xs">{r.entity_id?.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs max-w-md truncate">{r.details ? JSON.stringify(r.details) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </CardContent></Card>
    </div>
  );
}
