import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/hooks/useAuth";
import type { AppRole } from "@/lib/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/roles")({
  ssr: false,
  component: RolesPage,
});

const ROLES: { code: AppRole; label: string }[] = [
  { code: "system_owner", label: "مالك النظام" },
  { code: "export_manager", label: "مدير التصدير" },
  { code: "sales_specialist", label: "أخصائي مبيعات" },
  { code: "sales_coordinator", label: "منسق مبيعات" },
  { code: "pricing", label: "التسعير" },
  { code: "production", label: "الإنتاج" },
  { code: "logistics", label: "الشحن" },
  { code: "accounting", label: "المحاسبة" },
  { code: "viewer", label: "قارئ" },
];

interface Permission { code: string; module: string; action: string; label_ar: string }

function RolesPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [perms, setPerms] = useState<Permission[]>([]);
  const [rolePerms, setRolePerms] = useState<Map<AppRole, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<AppRole | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: rp }] = await Promise.all([
        supabase.from("permissions").select("*").order("module").order("action"),
        supabase.from("role_permissions").select("role, permission_code"),
      ]);
      setPerms((p ?? []) as Permission[]);
      const map = new Map<AppRole, Set<string>>();
      (rp ?? []).forEach((x: { role: AppRole; permission_code: string }) => {
        if (!map.has(x.role)) map.set(x.role, new Set());
        map.get(x.role)!.add(x.permission_code);
      });
      setRolePerms(map);
      setLoading(false);
    })();
  }, []);

  const byModule = useMemo(() => {
    const g = new Map<string, Permission[]>();
    perms.forEach((p) => {
      if (!g.has(p.module)) g.set(p.module, []);
      g.get(p.module)!.push(p);
    });
    return g;
  }, [perms]);

  const toggle = (role: AppRole, code: string) => {
    const next = new Map(rolePerms);
    const cur = new Set(next.get(role) ?? []);
    if (cur.has(code)) cur.delete(code); else cur.add(code);
    next.set(role, cur);
    setRolePerms(next);
  };

  const saveRole = async (role: AppRole) => {
    if (!isAdmin) return toast.error("للمسؤولين فقط");
    setSaving(role);
    const codes = [...(rolePerms.get(role) ?? [])];
    const { error: delErr } = await supabase.from("role_permissions").delete().eq("role", role);
    if (delErr) { toast.error(delErr.message); setSaving(null); return; }
    if (codes.length > 0) {
      const { error: insErr } = await supabase.from("role_permissions")
        .insert(codes.map((c) => ({ role, permission_code: c })));
      if (insErr) { toast.error(insErr.message); setSaving(null); return; }
    }
    setSaving(null);
    toast.success("تم حفظ الصلاحيات");
  };

  if (authLoading || loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <div className="p-6 text-center text-muted-foreground">هذه الصفحة متاحة للمسؤولين فقط.</div>;

  return (
    <div>
      <PageHeader title="الأدوار والصلاحيات" subtitle={`إدارة ${perms.length} صلاحية موزعة على ${ROLES.length} أدوار`} />
      <Tabs defaultValue={ROLES[0].code}>
        <TabsList className="flex-wrap h-auto">
          {ROLES.map((r) => <TabsTrigger key={r.code} value={r.code}>{r.label}</TabsTrigger>)}
        </TabsList>
        {ROLES.map((r) => {
          const isAdminRole = r.code === "system_owner" || r.code === "export_manager";
          const set = rolePerms.get(r.code) ?? new Set();
          return (
            <TabsContent key={r.code} value={r.code} className="mt-4">
              {isAdminRole && (
                <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">
                  هذا الدور يمتلك جميع الصلاحيات تلقائياً عبر النظام (is_admin) — التعديلات هنا للعرض فقط.
                </p>
              )}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...byModule.entries()].map(([mod, items]) => (
                  <Card key={mod}>
                    <CardHeader className="pb-2"><CardTitle className="text-sm uppercase">{mod}</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {items.map((p) => (
                        <label key={p.code} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={set.has(p.code)}
                            onCheckedChange={() => toggle(r.code, p.code)}
                          />
                          <span>{p.label_ar}</span>
                        </label>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => saveRole(r.code)} disabled={saving === r.code} className="gap-2">
                  {saving === r.code ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ صلاحيات "{r.label}"
                </Button>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
