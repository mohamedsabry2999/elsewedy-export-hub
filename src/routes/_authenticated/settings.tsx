import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div>
      <PageHeader title="الإعدادات" subtitle="بيانات الشركة والهوية والتفضيلات" />
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">بيانات الشركة</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>اسم الشركة</Label><Input defaultValue="Elsewedy Print House" /></div>
            <div><Label>البريد الإلكتروني</Label><Input dir="ltr" defaultValue="export@elsewedyprint.com" /></div>
            <div><Label>رقم التواصل</Label><Input dir="ltr" /></div>
            <div><Label>الموقع الإلكتروني</Label><Input dir="ltr" /></div>
            <div><Label>العنوان</Label><Input /></div>
            <p className="text-xs text-muted-foreground">سيتم تفعيل حفظ هذه البيانات وربطها بالمستندات في تحديث لاحق.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">الهوية البصرية</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>شعار الشركة</Label><Input type="file" accept="image/*" /></div>
            <div><Label>Favicon</Label><Input type="file" accept="image/*" /></div>
            <p className="text-xs text-muted-foreground">
              الألوان المعتمدة حالياً: كحلي داكن + ذهبي هادئ + رمادي فاتح.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
