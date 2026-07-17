import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check, Loader2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/hooks/useAuth";

interface Notification {
  id: string; type: string; title: string; body: string | null;
  link: string | null; is_read: boolean; created_at: string;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("notifications")
      .select("*").order("created_at", { ascending: false }).limit(30);
    setItems((data ?? []) as Notification[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load())
      .subscribe();
    const t = setInterval(load, 60_000);
    return () => { supabase.removeChannel(channel); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const unread = items.filter((n) => !n.is_read).length;

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    load();
  };
  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    load();
  };
  const del = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    load();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] rounded-full bg-destructive text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-semibold text-sm">الإشعارات</div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAll} className="text-xs h-7">
              <Check className="w-3 h-3" /> قراءة الكل
            </Button>
          )}
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="px-3 pt-2">
          <TabsList className="w-full h-8">
            <TabsTrigger value="all" className="flex-1 text-xs h-7">الكل ({items.length})</TabsTrigger>
            <TabsTrigger value="unread" className="flex-1 text-xs h-7">غير مقروءة ({unread})</TabsTrigger>
          </TabsList>
        </Tabs>
        <ScrollArea className="h-96">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-5 h-5" /></div>
          ) : (() => {
            const list = filter === "unread" ? items.filter(n => !n.is_read) : items;
            if (list.length === 0) return <div className="p-8 text-center text-sm text-muted-foreground">لا توجد إشعارات</div>;
            return (
              <div className="divide-y">
                {list.map((n) => (
                  <div key={n.id} className={`p-3 hover:bg-muted/50 ${!n.is_read ? "bg-primary/5" : ""}`}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {n.link ? (
                          <Link to={n.link} onClick={() => { markRead(n.id); setOpen(false); }} className="text-sm font-medium hover:underline block truncate">
                            {n.title}
                          </Link>
                        ) : (
                          <div className="text-sm font-medium truncate">{n.title}</div>
                        )}
                        {n.body && <div className="text-xs text-muted-foreground truncate">{n.body}</div>}
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ar })}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {!n.is_read && (
                          <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => markRead(n.id)}>
                            <Check className="w-3 h-3" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="w-6 h-6 text-destructive" onClick={() => del(n.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
