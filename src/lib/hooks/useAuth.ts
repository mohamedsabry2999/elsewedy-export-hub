import { useEffect, useState, useCallback } from "react";
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

interface RolePerm { role: AppRole; permission_code: string }
interface UserPerm { permission_code: string; granted: boolean }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (u: User | null) => {
    if (!u) { setProfile(null); setRoles([]); setPermissions(new Set()); return; }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", u.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.id),
    ]);
    const roleList = (r ?? []).map((x: { role: AppRole }) => x.role);
    setProfile(p as Profile | null);
    setRoles(roleList);

    // Compute permissions
    const isAdmin = roleList.includes("system_owner") || roleList.includes("export_manager");
    const perms = new Set<string>();
    if (isAdmin) {
      const { data: all } = await supabase.from("permissions").select("code");
      (all ?? []).forEach((x: { code: string }) => perms.add(x.code));
    } else if (roleList.length > 0) {
      const { data: rp } = await supabase
        .from("role_permissions")
        .select("permission_code")
        .in("role", roleList);
      (rp ?? []).forEach((x: { permission_code: string }) => perms.add(x.permission_code));
    }
    // Apply per-user overrides
    const { data: up } = await supabase
      .from("user_permissions").select("permission_code, granted").eq("user_id", u.id);
    (up ?? []).forEach((x: UserPerm) => {
      if (x.granted) perms.add(x.permission_code);
      else perms.delete(x.permission_code);
    });
    setPermissions(perms);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null;
      if (!mounted) return;
      setUser(u);
      await load(u);
      if (mounted) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user ?? null;
      if (!mounted) return;
      setUser(u);
      await load(u);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [load]);

  const isAdmin = roles.includes("system_owner") || roles.includes("export_manager");
  const hasPermission = (code: string) => isAdmin || permissions.has(code);
  const hasAnyPermission = (codes: string[]) => isAdmin || codes.some((c) => permissions.has(c));

  return { user, profile, roles, permissions, isAdmin, hasPermission, hasAnyPermission, loading };
}

// Silence unused imports helper
export type { RolePerm };
