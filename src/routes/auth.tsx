import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    // Enforce is_active
    const { data: prof } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", data.user!.id)
      .maybeSingle();
    setLoading(false);
    if (prof && prof.is_active === false) {
      await supabase.auth.signOut();
      toast.error("الحساب موقوف. تواصل مع مسؤول النظام.");
      return;
    }
    toast.success("تم تسجيل الدخول");
    navigate({ to: "/dashboard" });
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("تم إرسال رابط إعادة تعيين كلمة المرور");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-gold/10 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Elsewedy Export Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">مركز إدارة التصدير والمبيعات الدولية</p>
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardContent className="pt-6">
            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input id="email" type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" dir="ltr" />
                </div>
                <div>
                  <Label htmlFor="password">كلمة المرور</Label>
                  <div className="relative">
                    <Input id="password" type={showPw ? "text" : "password"} required
                      value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute inset-y-0 left-2 flex items-center text-muted-foreground">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                    تذكرني
                  </label>
                  <button type="button" onClick={() => setMode("forgot")}
                    className="text-primary hover:underline">نسيت كلمة المرور؟</button>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  تسجيل الدخول
                </Button>
                <p className="text-xs text-center text-muted-foreground pt-2">
                  الدخول مقتصر على المستخدمين المُضافين من قِبل مسؤول النظام.
                </p>
              </form>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <h2 className="font-semibold">استعادة كلمة المرور</h2>
                <Input type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" dir="ltr" />
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  إرسال رابط الاستعادة
                </Button>
                <button type="button" onClick={() => setMode("login")}
                  className="text-sm text-primary hover:underline w-full text-center">
                  رجوع لتسجيل الدخول
                </button>
              </form>
            )}
          </CardContent>
        </Card>
        <p className="text-xs text-center text-muted-foreground mt-6">
          © {new Date().getFullYear()} Elsewedy Print House
        </p>
      </div>
    </div>
  );
}
