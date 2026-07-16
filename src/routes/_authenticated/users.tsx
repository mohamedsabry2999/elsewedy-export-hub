import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { Users as UsersIcon, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/users")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
    const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", data.session.user.id);
    const roles = (r ?? []).map((x: { role: string }) => x.role);
    if (!roles.includes("system_owner") && !roles.includes("export_manager")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: UsersPage,
});

const ROLE_LABELS: Record<string, string> = {
  system_owner: "مالك النظام",
  export_manager: "مدير التصدير",
  sales_specialist: "أخصائي مبيعات",
  sales_coordinator: "منسق مبيعات",
  pricing: "التسعير",
  production: "الإنتاج",
  logistics: "اللوجستيات",
  accounting: "الحسابات",
  viewer: "مشاهد",
};

function UsersPage() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("*"),
      ]);
      const rolesByUser: Record<string, string[]> = {};
      (roles ?? []).forEach((r: { user_id: string; role: string }) => {
        (rolesByUser[r.user_id] ||= []).push(r.role);
      });
      return (profiles ?? []).map((p: { id: string; full_name: string | null; email: string | null; job_title: string | null; department: string | null; is_active: boolean; created_at: string }) => ({
        ...p, roles: rolesByUser[p.id] ?? [],
      }));
    },
  });

  const setPrimaryRole = async (userId: string, role: string) => {
    setSaving(userId);
    // Remove all existing roles and set new
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success("تم تحديث الدور");
    qc.invalidateQueries({ queryKey: ["users-list"] });
  };

  return (
    <div>
      <PageHeader title="المستخدمون والصلاحيات" subtitle="إدارة أدوار الفريق (يقتصر على مالك النظام والإدارة)" />
      <Card>
        <CardContent className="pt-4">
          {isLoading ? <Skeleton className="h-32" /> :
            (data ?? []).length === 0 ? (
              <div className="py-16 text-center">
                <UsersIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">لا يوجد مستخدمون بعد</p>
              </div>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البريد</TableHead>
                  <TableHead>الوظيفة</TableHead>
                  <TableHead>القسم</TableHead>
                  <TableHead>الأدوار الحالية</TableHead>
                  <TableHead>تعيين دور</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {data!.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell dir="ltr" className="text-sm">{u.email}</TableCell>
                      <TableCell>{u.job_title || "—"}</TableCell>
                      <TableCell>{u.department || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map(r => (
                            <Badge key={r} variant="outline" className={r === "system_owner" ? "bg-gold/20 border-gold/40" : ""}>
                              {r === "system_owner" && <ShieldCheck className="w-3 h-3" />} {ROLE_LABELS[r] || r}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          disabled={saving === u.id || u.roles.includes("system_owner")}
                          onValueChange={(v) => setPrimaryRole(u.id, v)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="اختر دوراً..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_LABELS).filter(([k]) => k !== "system_owner").map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
      <p className="mt-4 text-xs text-muted-foreground">
        ملاحظة: إضافة مستخدمين جدد تتم عبر دعوة البريد الإلكتروني — تواصل مع مسؤول Lovable Cloud لإضافتهم أولاً، ثم عيّن لهم الدور من هنا.
      </p>
    </div>
  );
}
