import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { MessageSquare, Send, Trash2 } from "lucide-react";

type Comment = {
  id: string; task_id: string; author_id: string; body: string; created_at: string;
  author?: { full_name: string | null; email: string } | null;
};

export function TaskComments({ taskId }: { taskId: string }) {
  const { user, isSystemOwner } = useAuth();
  const [items, setItems] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("task_comments")
      .select("id,task_id,author_id,body,created_at, author:profiles!task_comments_author_id_fkey(full_name,email)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    if (error) {
      const { data: d2 } = await supabase.from("task_comments").select("*").eq("task_id", taskId).order("created_at");
      setItems((d2 ?? []) as Comment[]);
    } else {
      setItems((data ?? []) as Comment[]);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`task-comments-${taskId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_comments", filter: `task_id=eq.${taskId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const send = async () => {
    if (!text.trim() || !user) return;
    setBusy(true);
    const { error } = await supabase.from("task_comments").insert({ task_id: taskId, author_id: user.id, body: text.trim() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setText("");
    load();
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("task_comments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="w-4 h-4" /> التعليقات {items ? `(${items.length})` : ""}
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {items === null ? <Skeleton className="h-16 w-full" /> :
          items.length === 0 ? <div className="text-xs text-muted-foreground text-center py-4">لا توجد تعليقات بعد</div> :
          items.map(c => {
            const name = c.author?.full_name || c.author?.email || "مستخدم";
            const mine = c.author_id === user?.id;
            const canDel = mine || isSystemOwner;
            return (
              <div key={c.id} className="flex gap-2 items-start p-2 rounded-md bg-muted/40 border">
                <Avatar className="w-7 h-7"><AvatarFallback className="text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-medium truncate">{name}</div>
                    <div className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString("ar-EG")}</div>
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words mt-1">{c.body}</div>
                </div>
                {canDel && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del(c.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            );
          })
        }
      </div>
      <div className="flex gap-2">
        <Textarea value={text} onChange={e => setText(e.target.value)} rows={2} placeholder="اكتب تعليقاً..." />
        <Button onClick={send} disabled={busy || !text.trim()} size="icon" className="shrink-0"><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}
