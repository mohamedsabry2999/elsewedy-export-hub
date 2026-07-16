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
  { title: "لوحة التحكم", url: "/dashboard", icon: LayoutDashboard },
  { title: "الشركات", url: "/companies", icon: Building2 },
  { title: "جهات الاتصال", url: "/contacts", icon: Contact2 },
  { title: "العملاء المحتملون", url: "/leads", icon: Sparkles },
  { title: "الفرص - Pipeline", url: "/opportunities", icon: Target },
  { title: "عروض الأسعار", url: "/quotations", icon: FileText },
  { title: "العينات", url: "/samples", icon: Beaker },
];
const opsNav = [
  { title: "المنتجات", url: "/products", icon: Boxes },
  { title: "الطلبيات", url: "/orders", icon: ShoppingCart },
  { title: "الشحنات", url: "/shipments", icon: Ship },
  { title: "المدفوعات", url: "/payments", icon: Wallet },
  { title: "مستندات التصدير", url: "/export-documents", icon: FileCheck2 },
];
const productivityNav = [
  { title: "المهام", url: "/tasks", icon: CheckSquare },
  { title: "التقويم", url: "/calendar", icon: CalendarDays },
  { title: "سجل التواصل", url: "/activities", icon: Activity },
  { title: "المعارض", url: "/exhibitions", icon: Store },
  { title: "التقارير", url: "/reports", icon: BarChart3 },
];
const personalNav = [
  { title: "الملف الشخصي", url: "/profile", icon: UserCircle },
];
const admin = [
  { title: "المستخدمون", url: "/users", icon: Users },
  { title: "الأدوار والصلاحيات", url: "/roles", icon: KeyRound },
  { title: "سجل التدقيق", url: "/audit-log", icon: ShieldCheck },
  { title: "الإعدادات", url: "/settings", icon: Settings2 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { isAdmin, profile } = useAuth();
  const isActive = (u: string) => pathname === u || pathname.startsWith(u + "/");

  const renderGroup = (label: string, items: typeof salesNav) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
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

  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="w-9 h-9 rounded-lg bg-gold text-gold-foreground flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-bold text-sm text-sidebar-foreground truncate">Elsewedy</div>
              <div className="text-[10px] text-sidebar-foreground/70 truncate">Export Hub</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("المبيعات", salesNav)}
        {renderGroup("العمليات", opsNav)}
        {renderGroup("الإنتاجية", productivityNav)}
        {renderGroup("حسابي", personalNav)}
        {isAdmin && renderGroup("الإدارة", admin)}
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
