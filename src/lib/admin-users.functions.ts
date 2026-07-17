import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = [
  "system_owner",
  "export_manager",
  "sales_specialist",
  "sales_coordinator",
  "pricing",
  "production",
  "logistics",
  "accounting",
  "viewer",
] as const;

type Role = (typeof ROLES)[number];

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("is_admin", {
    _user_id: ctx.userId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles }, { data: roles }, authList] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").order("created_at"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    ]);
    const rolesBy: Record<string, string[]> = {};
    (roles ?? []).forEach((r: any) => {
      (rolesBy[r.user_id] ||= []).push(r.role);
    });
    const lastSignIn: Record<string, string | null> = {};
    (authList.data?.users ?? []).forEach((u: any) => {
      lastSignIn[u.id] = u.last_sign_in_at ?? null;
    });
    return (profiles ?? []).map((p: any) => ({
      ...p,
      roles: rolesBy[p.id] ?? [],
      last_sign_in_at: lastSignIn[p.id] ?? null,
    }));
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().email(),
        full_name: z.string().min(1).max(120),
        job_title: z.string().max(120).optional(),
        department: z.string().max(120).optional(),
        phone: z.string().max(40).optional(),
        roles: z.array(z.enum(ROLES)).min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Prevent granting system_owner unless caller is system_owner
    if (data.roles.includes("system_owner")) {
      const { data: isOwner } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "system_owner",
      });
      if (!isOwner) throw new Error("Forbidden: only system owner may grant system_owner");
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      { data: { full_name: data.full_name } },
    );
    if (error) throw new Error(error.message);
    const uid = created.user!.id;

    await supabaseAdmin.from("profiles").upsert({
      id: uid,
      email: data.email,
      full_name: data.full_name,
      job_title: data.job_title ?? null,
      department: data.department ?? null,
      phone: data.phone ?? null,
      is_active: true,
    });
    // Set roles (replace)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin.from("user_roles").insert(
      data.roles.map((role) => ({ user_id: uid, role: role as Role })),
    );
    return { ok: true, user_id: uid };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), is_active: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId) throw new Error("Cannot change your own status");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: data.is_active })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    // Sign out sessions if suspending
    if (!data.is_active) {
      await supabaseAdmin.auth.admin.signOut(data.user_id);
    }
    return { ok: true };
  });

export const assignUserRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ user_id: z.string().uuid(), roles: z.array(z.enum(ROLES)).min(1) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Protect system_owner escalation
    if (data.roles.includes("system_owner")) {
      const { data: isOwner } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "system_owner",
      });
      if (!isOwner) throw new Error("Forbidden: only system owner may grant system_owner");
    }
    // Prevent removing last system_owner
    const { data: currentRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id);
    const wasOwner = (currentRoles ?? []).some((r: any) => r.role === "system_owner");
    if (wasOwner && !data.roles.includes("system_owner")) {
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "system_owner");
      if ((count ?? 0) <= 1) throw new Error("Cannot remove the last system owner");
    }

    // Atomic transactional replace via SECURITY DEFINER RPC (protects last owner)
    const { error } = await supabaseAdmin.rpc("replace_user_roles_atomic", {
      _target_user: data.user_id,
      _new_roles: data.roles as Role[],
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId) throw new Error("Cannot delete your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Prevent deleting last owner
    const { data: victimRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id);
    if ((victimRoles ?? []).some((r: any) => r.role === "system_owner")) {
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "system_owner");
      if ((count ?? 0) <= 1) throw new Error("Cannot delete the last system owner");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateUserProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        full_name: z.string().min(1).max(120).optional(),
        job_title: z.string().max(120).nullable().optional(),
        department: z.string().max(120).nullable().optional(),
        phone: z.string().max(40).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { user_id, ...update } = data;
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(update)
      .eq("id", user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const checkMyActive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("is_active")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { is_active: data?.is_active ?? true };
  });
