import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  /** Any of these grants access. */
  anyOf?: string[];
  /** All of these are required. */
  allOf?: string[];
  /** Single-permission shorthand. */
  perm?: string;
  children: ReactNode;
}

export function PermissionGuard({ perm, anyOf, allOf, children }: Props) {
  const { loading, isSystemOwner, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>جاري التحقق من الصلاحيات...</span>
      </div>
    );
  }

  const codes: string[] = [
    ...(perm ? [perm] : []),
    ...(allOf ?? []),
    ...(anyOf ?? []),
  ];
  const allowed =
    isSystemOwner ||
    (perm ? hasPermission(perm) : true) &&
    (allOf ? hasAllPermissions(allOf) : true) &&
    (anyOf ? hasAnyPermission(anyOf) : true);

  if (!allowed) return <AccessDenied required={codes} />;
  return <>{children}</>;
}

function AccessDenied({ required }: { required: string[] }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold">ليس لديك صلاحية</h1>
          <p className="text-sm text-muted-foreground">
            هذه الصفحة تتطلب صلاحية إضافية لم يتم منحها لحسابك بعد.
          </p>
          {required.length > 0 && (
            <div className="text-xs font-mono bg-muted rounded p-2 break-all">
              {required.join(" · ")}
            </div>
          )}
          <div className="flex gap-2 justify-center pt-2">
            <Button asChild variant="default"><Link to="/dashboard">العودة للوحة التحكم</Link></Button>
            <Button variant="outline" onClick={() => history.back()}>رجوع</Button>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            للحصول على الصلاحية، تواصل مع مسؤول النظام.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export { AccessDenied };
