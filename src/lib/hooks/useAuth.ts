import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "system_owner" | "export_manager" | "sales_specialist" | "sales_coordinator"
  | "pricing" | "production" | "logistics" | "accounting" | "viewer";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  job_title: string | null;
  department: string | null;
  is_active: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async (u: User | null) => {
      if (!u) { setProfile(null); setRoles([]); return; }
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.id),
      ]);
      if (!mounted) return;
      setProfile(p as Profile | null);
      setRoles((r ?? []).map((x: { role: AppRole }) => x.role));
    };
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      await load(u);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      await load(u);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const isAdmin = roles.includes("system_owner") || roles.includes("export_manager");
  return { user, profile, roles, isAdmin, loading };
}
