import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  UserPlus,
  UserX,
  UserCheck,
  KeyRound,
  Trash2,
  Users as UsersIcon,
  Loader2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  listUsers,
  inviteUser,
  setUserActive,
  assignUserRoles,
  resetUserPassword,
  deleteUser,
  updateUserProfile,
} from "@/lib/admin-users.functions";

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export const Route = createFileRoute("/_authenticated/users")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
    const { data: r } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.session.user.id);
    const roles = (r ?? []).map((x: { role: string }) => x.role);
    if (!roles.includes("system_owner") && !roles.includes("export_manager")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: UsersPage,
});

const ROLE_LABELS: Record<string, string> = {
  system_owner: "مالك النظام",
  export_manager: "مدير التصدير",
  sales_specialist: "أخصائي مبيعات",
  sales_coordinator: "منسق مبيعات",
  pricing: "التسعير",
  production: "الإنتاج",
  logistics: "اللوجستيات",
  accounting: "الحسابات",
  viewer: "مشاهد",
};
const ALL_ROLES = Object.keys(ROLE_LABELS);

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  job_title: string | null;
  department: string | null;
  phone: string | null;
  is_active: boolean;
  roles: string[];
  last_sign_in_at: string | null;
};

function UsersPage() {
  const qc = useQueryClient();
  const list = useServerFn(listUsers);
  const invite = useServerFn(inviteUser);
  const setActive = useServerFn(setUserActive);
  const assign = useServerFn(assignUserRoles);
  const resetPw = useServerFn(resetUserPassword);
  const del = useServerFn(deleteUser);
  const updProfile = useServerFn(updateUserProfile);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => list() as Promise<UserRow[]>,
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<UserRow | null>(null);
  const [rolesOpen, setRolesOpen] = useState<UserRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState<UserRow | null>(null);

  const inv = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const suspendMut = useMutation({
    mutationFn: (v: { user_id: string; is_active: boolean }) =>
      setActive({ data: v }),
    onSuccess: (_, v) => {
      toast.success(v.is_active ? "تم تفعيل الحساب" : "تم إيقاف الحساب");
      inv();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMut = useMutation({
    mutationFn: (email: string) => resetPw({ data: { email } }),
    onSuccess: () => toast.success("تم إرسال رابط إعادة تعيين كلمة المرور"),
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (user_id: string) => del({ data: { user_id } }),
    onSuccess: () => {
      toast.success("تم حذف المستخدم");
      setDeleteOpen(null);
      inv();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="المستخدمون والصلاحيات"
        subtitle="إدارة الفريق: دعوة، تعيين أدوار، إيقاف، إعادة تعيين، حذف"
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="w-4 h-4" /> دعوة مستخدم
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : (data ?? []).length === 0 ? (
            <div className="py-16 text-center">
              <UsersIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">لا يوجد مستخدمون بعد</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البريد</TableHead>
                  <TableHead>الوظيفة / القسم</TableHead>
                  <TableHead>الأدوار</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>آخر دخول</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell dir="ltr" className="text-sm">{u.email}</TableCell>
                    <TableCell className="text-sm">
                      {u.job_title || "—"}
                      {u.department && (
                        <div className="text-muted-foreground text-xs">{u.department}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <Badge variant="outline">بدون دور</Badge>
                        ) : (
                          u.roles.map((r) => (
                            <Badge
                              key={r}
                              variant="outline"
                              className={r === "system_owner" ? "bg-gold/20 border-gold/40" : ""}
                            >
                              {r === "system_owner" && <ShieldCheck className="w-3 h-3" />}{" "}
                              {ROLE_LABELS[r] || r}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.is_active ? (
                        <Badge className="bg-green-600/20 text-green-700 border-green-500/30">
                          نشط
                        </Badge>
                      ) : (
                        <Badge variant="destructive">موقوف</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground" dir="ltr">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleString("ar-EG")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditOpen(u)}>
                            تعديل البيانات
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setRolesOpen(u)}>
                            <ShieldCheck className="w-4 h-4" /> إدارة الأدوار
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => u.email && resetMut.mutate(u.email)}
                          >
                            <KeyRound className="w-4 h-4" /> إعادة تعيين كلمة السر
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {u.is_active ? (
                            <DropdownMenuItem
                              onClick={() =>
                                suspendMut.mutate({ user_id: u.id, is_active: false })
                              }
                            >
                              <UserX className="w-4 h-4" /> إيقاف الحساب
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                suspendMut.mutate({ user_id: u.id, is_active: true })
                              }
                            >
                              <UserCheck className="w-4 h-4" /> تفعيل الحساب
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteOpen(u)}
                          >
                            <Trash2 className="w-4 h-4" /> حذف المستخدم
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSubmit={async (v) => {
          try {
            await invite({ data: v });
            toast.success("تم إرسال الدعوة");
            setInviteOpen(false);
            inv();
          } catch (e: any) {
            toast.error(e?.message || "فشلت العملية");
          }
        }}
      />

      {editOpen && (
        <EditProfileDialog
          user={editOpen}
          onClose={() => setEditOpen(null)}
          onSubmit={async (v) => {
            try {
              await updProfile({ data: { user_id: editOpen.id, ...v } });
              toast.success("تم التحديث");
              setEditOpen(null);
              inv();
            } catch (e: any) {
              toast.error(e?.message || "فشل التحديث");
            }
          }}
        />
      )}

      {rolesOpen && (
        <RolesDialog
          user={rolesOpen}
          onClose={() => setRolesOpen(null)}
          onSubmit={async (roles) => {
            try {
              await assign({ data: { user_id: rolesOpen.id, roles } });
              toast.success("تم تحديث الأدوار");
              setRolesOpen(null);
              inv();
            } catch (e: any) {
              toast.error(e?.message || "فشل التحديث");
            }
          }}
        />
      )}

      <AlertDialog open={!!deleteOpen} onOpenChange={(o) => !o && setDeleteOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المستخدم</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف حساب <strong>{deleteOpen?.full_name || deleteOpen?.email}</strong> نهائياً.
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteOpen && delMut.mutate(deleteOpen.id)}
            >
              {delMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />} حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (v: {
    email: string;
    full_name: string;
    job_title?: string;
    department?: string;
    phone?: string;
    roles: string[];
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    job_title: "",
    department: "",
    phone: "",
  });
  const [roles, setRoles] = useState<string[]>(["viewer"]);
  const [busy, setBusy] = useState(false);

  const toggle = (r: string) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>دعوة مستخدم جديد</DialogTitle>
          <DialogDescription>
            سيتم إرسال دعوة عبر البريد لتعيين كلمة المرور والدخول.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>البريد الإلكتروني *</Label>
            <Input
              dir="ltr"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Label>الاسم الكامل *</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div>
            <Label>الوظيفة</Label>
            <Input
              value={form.job_title}
              onChange={(e) => setForm({ ...form, job_title: e.target.value })}
            />
          </div>
          <div>
            <Label>القسم</Label>
            <Input
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Label>الهاتف</Label>
            <Input
              dir="ltr"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Label>الأدوار *</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {ALL_ROLES.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={roles.includes(r)} onCheckedChange={() => toggle(r)} />
                  {ROLE_LABELS[r]}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            disabled={busy || !form.email || !form.full_name || roles.length === 0}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit({
                  email: form.email,
                  full_name: form.full_name,
                  job_title: form.job_title || undefined,
                  department: form.department || undefined,
                  phone: form.phone || undefined,
                  roles,
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} إرسال الدعوة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditProfileDialog({
  user,
  onClose,
  onSubmit,
}: {
  user: UserRow;
  onClose: () => void;
  onSubmit: (v: {
    full_name?: string;
    job_title?: string | null;
    department?: string | null;
    phone?: string | null;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    full_name: user.full_name ?? "",
    job_title: user.job_title ?? "",
    department: user.department ?? "",
    phone: user.phone ?? "",
  });
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>الاسم</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div>
            <Label>الوظيفة</Label>
            <Input
              value={form.job_title}
              onChange={(e) => setForm({ ...form, job_title: e.target.value })}
            />
          </div>
          <div>
            <Label>القسم</Label>
            <Input
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>
          <div>
            <Label>الهاتف</Label>
            <Input
              dir="ltr"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit({
                  full_name: form.full_name || undefined,
                  job_title: form.job_title || null,
                  department: form.department || null,
                  phone: form.phone || null,
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RolesDialog({
  user,
  onClose,
  onSubmit,
}: {
  user: UserRow;
  onClose: () => void;
  onSubmit: (roles: string[]) => Promise<void>;
}) {
  const [roles, setRoles] = useState<string[]>(user.roles);
  const [busy, setBusy] = useState(false);
  const toggle = (r: string) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إدارة أدوار: {user.full_name || user.email}</DialogTitle>
          <DialogDescription>يمكن تعيين أكثر من دور واحد لنفس المستخدم.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {ALL_ROLES.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={roles.includes(r)} onCheckedChange={() => toggle(r)} />
              {ROLE_LABELS[r]}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            disabled={busy || roles.length === 0}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit(roles);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
