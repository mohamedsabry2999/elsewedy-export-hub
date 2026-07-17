import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
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

interface UserPerm { permission_code: string; granted: boolean }

export interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  permissions: Set<string>;
  isSystemOwner: boolean;
  isExportManager: boolean;
  /** @deprecated Now strictly equals isSystemOwner. Use hasPermission for gating. */
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  hasAllPermissions: (codes: string[]) => boolean;
  refreshAuth: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadAll(u: User): Promise<{
  profile: Profile | null; roles: AppRole[]; permissions: Set<string>;
}> {
  const [{ data: p }, { data: r, error: rErr }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", u.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", u.id),
  ]);
  if (rErr) throw new Error(`Failed to load roles: ${rErr.message}`);
  const roleList = (r ?? []).map((x: { role: AppRole }) => x.role);
  const isOwner = roleList.includes("system_owner");
  const perms = new Set<string>();

  // ONLY system_owner gets automatic full access (loaded for UI symmetry;
  // real authorization lives in has_permission / RLS).
  if (isOwner) {
    const { data: all } = await supabase.from("permissions").select("code");
    (all ?? []).forEach((x: { code: string }) => perms.add(x.code));
  } else if (roleList.length > 0) {
    const { data: rp } = await supabase
      .from("role_permissions").select("permission_code").in("role", roleList);
    (rp ?? []).forEach((x: { permission_code: string }) => perms.add(x.permission_code));
  }
  // Per-user overrides (skip for system_owner — they always have full access).
  if (!isOwner) {
    const { data: up } = await supabase
      .from("user_permissions").select("permission_code, granted").eq("user_id", u.id);
    (up ?? []).forEach((x: UserPerm) => {
      if (x.granted) perms.add(x.permission_code);
      else perms.delete(x.permission_code);
    });
  }

  return { profile: (p as Profile | null) ?? null, roles: roleList, permissions: perms };
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hydrate = useCallback(async (u: User | null) => {
    if (!u) {
      setProfile(null); setRoles([]); setPermissions(new Set()); setError(null);
      return;
    }
    try {
      const res = await loadAll(u);
      setProfile(res.profile); setRoles(res.roles); setPermissions(res.permissions);
      setError(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load auth context";
      setError(msg);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user ?? null;
      if (!mounted) return;
      setUser(u);
      await hydrate(u);
      if (mounted) setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user ?? null;
      if (!mounted) return;
      setUser(u);
      await hydrate(u);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [hydrate]);

  const isSystemOwner = roles.includes("system_owner");
  const isExportManager = roles.includes("export_manager");
  const isAdmin = isSystemOwner || isExportManager;

  const hasPermission = (code: string) => isSystemOwner || permissions.has(code);
  const hasAnyPermission = (codes: string[]) => isSystemOwner || codes.some((c) => permissions.has(c));
  const hasAllPermissions = (codes: string[]) => isSystemOwner || codes.every((c) => permissions.has(c));

  const refreshAuth = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const u = data.session?.user ?? null;
    setUser(u); await hydrate(u);
  }, [hydrate]);
  const refreshPermissions = useCallback(async () => { if (user) await hydrate(user); }, [hydrate, user]);
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setRoles([]); setPermissions(new Set());
  }, []);

  const value: AuthContextValue = {
    user, profile, roles, permissions,
    isSystemOwner, isExportManager, isAdmin,
    loading, error,
    hasPermission, hasAnyPermission, hasAllPermissions,
    refreshAuth, refreshPermissions, signOut,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Safe fallback when consumed outside a provider (e.g. public routes):
    // returns a permission-less, loading=false snapshot.
    return {
      user: null, profile: null, roles: [], permissions: new Set(),
      isSystemOwner: false, isExportManager: false, isAdmin: false,
      loading: false, error: null,
      hasPermission: () => false, hasAnyPermission: () => false, hasAllPermissions: () => false,
      refreshAuth: async () => {}, refreshPermissions: async () => {}, signOut: async () => {},
    };
  }
  return ctx;
}
