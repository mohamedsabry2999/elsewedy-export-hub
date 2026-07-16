import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPage,
});

function ResetPage() {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("تم تحديث كلمة المرور"); navigate({ to: "/dashboard" }); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <h1 className="text-xl font-semibold mb-4">تعيين كلمة مرور جديدة</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="password" placeholder="كلمة المرور الجديدة" required minLength={6}
              value={pw} onChange={(e) => setPw(e.target.value)} dir="ltr" />
            <Button type="submit" disabled={loading} className="w-full">حفظ</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
