import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Building2, Users, Contact2, Sparkles, Settings2,
  Target, CheckSquare, FileText, Activity, ShieldCheck, Beaker, ShoppingCart,
  Ship, Wallet, FileCheck2, CalendarDays, BarChart3, Store, UserCircle, KeyRound, Boxes,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/hooks/useAuth";
import { Logo } from "./Logo";

const salesNav = [
  { title: "لوحة التحكم", url: "/dashboard", icon: LayoutDashboard, perm: null },
  { title: "الشركات", url: "/companies", icon: Building2, perm: "companies.view" },
  { title: "جهات الاتصال", url: "/contacts", icon: Contact2, perm: "contacts.view" },
  { title: "العملاء المحتملون", url: "/leads", icon: Sparkles, perm: "leads.view" },
  { title: "الفرص - Pipeline", url: "/opportunities", icon: Target, perm: "opportunities.view" },
  { title: "عروض الأسعار", url: "/quotations", icon: FileText, perm: "quotations.view" },
  { title: "العينات", url: "/samples", icon: Beaker, perm: "samples.view" },
];
const opsNav = [
  { title: "المنتجات", url: "/products", icon: Boxes, perm: null },
  { title: "الطلبيات", url: "/orders", icon: ShoppingCart, perm: "orders.view" },
  { title: "الشحنات", url: "/shipments", icon: Ship, perm: "shipments.view" },
  { title: "المدفوعات", url: "/payments", icon: Wallet, perm: "payments.view" },
  { title: "مستندات التصدير", url: "/export-documents", icon: FileCheck2, perm: "export_documents.view" },
];
const productivityNav = [
  { title: "المهام", url: "/tasks", icon: CheckSquare, perm: "tasks.view" },
  { title: "التقويم", url: "/calendar", icon: CalendarDays, perm: null },
  { title: "سجل التواصل", url: "/activities", icon: Activity, perm: "activities.view" },
  { title: "المعارض", url: "/exhibitions", icon: Store, perm: "exhibitions.view" },
  { title: "التقارير", url: "/reports", icon: BarChart3, perm: "reports.view" },
];
const personalNav = [
  { title: "الملف الشخصي", url: "/profile", icon: UserCircle, perm: null },
];
const admin = [
  { title: "المستخدمون", url: "/users", icon: Users, perm: "users.view" },
  { title: "الأدوار والصلاحيات", url: "/roles", icon: KeyRound, perm: "users.manage" },
  { title: "سجل التدقيق", url: "/audit-log", icon: ShieldCheck, perm: "audit_log.view" },
  { title: "الإعدادات", url: "/settings", icon: Settings2, perm: "settings.view" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { isSystemOwner, profile, hasPermission, loading, error, refreshPermissions } = useAuth();
  const isActive = (u: string) => pathname === u || pathname.startsWith(u + "/");
  const canSee = (perm: string | null) => !perm || isSystemOwner || hasPermission(perm);


  const renderGroup = (label: string, items: typeof salesNav) => {
    const visible = items.filter(i => canSee(i.perm));
    if (!visible.length) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarHeader className="border-b border-sidebar-border bg-white/[0.03]">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 shadow-sm">
            <Logo variant="mark" className="w-full h-full" />
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <div className="font-bold text-sm text-sidebar-foreground truncate">Medhat Elsewedy</div>
              <div className="text-[10px] text-sidebar-foreground/70 truncate">Print House — Export Hub</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {loading ? (
          <div className="px-3 py-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-8 rounded-md bg-sidebar-accent/20 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="px-3 py-4 text-xs text-destructive-foreground/90">
            تعذّر تحميل الصلاحيات.
            <button onClick={() => refreshPermissions()} className="underline mr-1">إعادة المحاولة</button>
          </div>
        ) : (
          <>
            {renderGroup("المبيعات", salesNav)}
            {renderGroup("العمليات", opsNav)}
            {renderGroup("الإنتاجية", productivityNav)}
            {renderGroup("حسابي", personalNav)}
            {renderGroup("الإدارة", admin)}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && profile && (
          <div className="px-2 py-2 text-xs text-sidebar-foreground/80 truncate">
            {profile.full_name || profile.email}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
