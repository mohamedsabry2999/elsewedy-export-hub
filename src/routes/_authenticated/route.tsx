import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
    // Enforce is_active on every route resolution
    const { data: prof } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", data.session.user.id)
      .maybeSingle();
    if (prof && prof.is_active === false) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
    return { user: data.session.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  // Periodic active-status check (every 60s) — force sign-out if suspended
  useEffect(() => {
    const check = async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", s.session.user.id)
        .maybeSingle();
      if (prof && prof.is_active === false) {
        toast.error("تم إيقاف حسابك. جاري تسجيل الخروج.");
        await supabase.auth.signOut();
        window.location.href = "/auth";
      }
    };
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
