import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Upload, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/profile")({
  ssr: false,
  component: ProfilePage,
});

const roleLabels: Record<string, string> = {
  system_owner: "مالك النظام", export_manager: "مدير التصدير",
  sales_specialist: "أخصائي مبيعات", sales_coordinator: "منسق مبيعات",
  pricing: "التسعير", production: "الإنتاج", logistics: "الشحن",
  accounting: "المحاسبة", viewer: "قارئ",
};

function ProfilePage() {
  const { user, profile, roles, permissions } = useAuth();
  const [full_name, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [job_title, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [avatar_url, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setJobTitle(profile.job_title ?? "");
      setDepartment(profile.department ?? "");
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name, phone, job_title, department, avatar_url }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("تم حفظ الملف الشخصي");
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    setAvatarUrl(data?.signedUrl ?? null);
    setUploading(false);
    toast.success("تم رفع الصورة — اضغط حفظ لتثبيتها");
  };

  const changePassword = async () => {
    if (newPass.length < 8) return toast.error("كلمة المرور 8 أحرف على الأقل");
    setChangingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setChangingPass(false);
    if (error) toast.error(error.message); else { toast.success("تم تغيير كلمة المرور"); setNewPass(""); }
  };

  if (!user || !profile) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="الملف الشخصي" subtitle="بياناتك، دورك، وصلاحياتك" />
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">البيانات الأساسية</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                {avatar_url && <AvatarImage src={avatar_url} />}
                <AvatarFallback>{(full_name || profile.email || "?").charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label>صورة شخصية</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input type="file" accept="image/*" disabled={uploading}
                    onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
                  {uploading && <Loader2 className="animate-spin w-4 h-4" />}
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>الاسم الكامل</Label><Input value={full_name} onChange={(e) => setFullName(e.target.value)} /></div>
              <div><Label>البريد الإلكتروني</Label><Input dir="ltr" value={profile.email ?? ""} disabled /></div>
              <div><Label>رقم الهاتف</Label><Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><Label>المسمى الوظيفي</Label><Input value={job_title} onChange={(e) => setJobTitle(e.target.value)} /></div>
              <div><Label>القسم</Label><Input value={department} onChange={(e) => setDepartment(e.target.value)} /></div>
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ
              </Button>
            </div>
            <Separator />
            <div>
              <Label className="flex items-center gap-2"><KeyRound className="w-4 h-4" /> تغيير كلمة المرور</Label>
              <div className="flex gap-2 mt-2">
                <Input type="password" dir="ltr" placeholder="كلمة مرور جديدة" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
                <Button variant="outline" onClick={changePassword} disabled={changingPass || !newPass}>
                  {changingPass ? <Loader2 className="w-4 h-4 animate-spin" /> : "تغيير"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">الأدوار</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {roles.length === 0 && <span className="text-sm text-muted-foreground">لا توجد أدوار</span>}
              {roles.map((r) => <Badge key={r} variant="secondary">{roleLabels[r] ?? r}</Badge>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">الصلاحيات ({permissions.size})</CardTitle></CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-auto space-y-1">
                {[...permissions].sort().map((p) => (
                  <div key={p} className="text-xs font-mono text-muted-foreground">{p}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
