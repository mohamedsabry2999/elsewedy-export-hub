import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useBranding } from "@/components/BrandingProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Check = { name: string; ok: boolean | null; detail?: string };

export function SystemDiagnostics() {
  const { user, roles, permissions, isSystemOwner, isExportManager } = useAuth();
  const { brand } = useBranding();
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const results: Check[] = [];

    // 1. Session
    const { data: sess } = await supabase.auth.getSession();
    results.push({ name: "الجلسة نشطة", ok: !!sess.session, detail: sess.session ? user?.email ?? "" : "لا توجد جلسة" });

    // 2. DB read (profiles)
    const t1 = performance.now();
    const { error: dbErr } = await supabase.from("profiles").select("id").limit(1);
    results.push({ name: "الاتصال بقاعدة البيانات", ok: !dbErr, detail: dbErr?.message ?? `${Math.round(performance.now() - t1)}ms` });

    // 3. RLS: user can read their own permissions
    const { error: rpErr, count } = await supabase.from("role_permissions").select("*", { count: "exact", head: true });
    results.push({ name: "قراءة صلاحيات الأدوار (RLS)", ok: !rpErr, detail: rpErr?.message ?? `${count ?? 0} سجل` });

    // 4. Storage: branding bucket signed URL check
    if (brand.logo_path) {
      const { error: sErr } = await supabase.storage.from("branding").createSignedUrl(brand.logo_path, 60);
      results.push({ name: "التخزين — شعار الشركة", ok: !sErr, detail: sErr?.message ?? "OK" });
    } else {
      results.push({ name: "التخزين — شعار الشركة", ok: true, detail: "الشعار الافتراضي" });
    }

    // 5. has_permission RPC
    const { error: hpErr } = await supabase.rpc("has_permission", { _user_id: user?.id ?? "00000000-0000-0000-0000-000000000000", _code: "companies.view" });
    results.push({ name: "دالة الصلاحيات has_permission", ok: !hpErr, detail: hpErr?.message ?? "متاحة" });

    // 6. is_system_owner RPC
    const { error: sioErr } = await supabase.rpc("is_system_owner", { _user_id: user?.id ?? "00000000-0000-0000-0000-000000000000" });
    results.push({ name: "دالة is_system_owner", ok: !sioErr, detail: sioErr?.message ?? "متاحة" });

    // 7. Notifications realtime channel (basic subscribe test)
    try {
      const ch = supabase.channel(`diag-${Date.now()}`);
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("timeout")), 3000);
        ch.subscribe((status) => {
          if (status === "SUBSCRIBED") { clearTimeout(t); resolve(); }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { clearTimeout(t); reject(new Error(status)); }
        });
      });
      supabase.removeChannel(ch);
      results.push({ name: "قناة Realtime", ok: true, detail: "متصلة" });
    } catch (e) {
      results.push({ name: "قناة Realtime", ok: false, detail: e instanceof Error ? e.message : "فشل" });
    }

    setChecks(results);
    setRunning(false);
  };

  useEffect(() => { void run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">تشخيص النظام</CardTitle>
        <Button size="sm" variant="outline" onClick={run} disabled={running} className="gap-2">
          {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          إعادة الفحص
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <InfoRow label="البريد" value={user?.email ?? "—"} />
          <InfoRow label="المعرّف" value={<span className="font-mono text-xs">{user?.id?.slice(0, 8) ?? "—"}…</span>} />
          <InfoRow label="مالك النظام" value={<Badge variant={isSystemOwner ? "default" : "secondary"}>{isSystemOwner ? "نعم" : "لا"}</Badge>} />
          <InfoRow label="مدير التصدير" value={<Badge variant={isExportManager ? "default" : "secondary"}>{isExportManager ? "نعم" : "لا"}</Badge>} />
          <InfoRow label="الأدوار" value={roles.length ? roles.join(", ") : "—"} />
          <InfoRow label="الصلاحيات النشطة" value={String(permissions.size)} />
        </div>

        <div className="border-t pt-3 space-y-2">
          {checks.length === 0 && running && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> جاري الفحص...
            </div>
          )}
          {checks.map((c) => (
            <div key={c.name} className="flex items-start justify-between text-sm border-b last:border-0 py-1.5">
              <div className="flex items-center gap-2">
                {c.ok === null ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  : c.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  : <XCircle className="w-4 h-4 text-destructive" />}
                <span>{c.name}</span>
              </div>
              {c.detail && <span className="text-xs text-muted-foreground max-w-[60%] truncate" dir="ltr">{c.detail}</span>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-muted/40 rounded px-3 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
