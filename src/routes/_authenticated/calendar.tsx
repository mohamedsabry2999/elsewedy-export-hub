import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, Calendar as CalIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/calendar")({ ssr: false, component: Cal });

type Task = { id: string; title: string; due_date: string | null; priority: string; status: string };
type Act = { id: string; subject: string; type: string; occurred_at: string };

const AR_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const AR_DAYS = ["أحد","اثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"];

function Cal() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const y = cursor.getFullYear(), m = cursor.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  const startISO = start.toISOString();
  const endISO = new Date(y, m + 1, 0, 23, 59).toISOString();

  const { data: tasks, isLoading: lt } = useQuery({
    queryKey: ["cal-tasks", y, m],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks")
        .select("id,title,due_date,priority,status")
        .not("due_date", "is", null).gte("due_date", startISO).lte("due_date", endISO);
      if (error) throw error;
      return data as Task[];
    },
  });
  const { data: acts, isLoading: la } = useQuery({
    queryKey: ["cal-acts", y, m],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities")
        .select("id,subject,type,occurred_at")
        .gte("occurred_at", startISO).lte("occurred_at", endISO);
      if (error) throw error;
      return data as Act[];
    },
  });

  const grid = useMemo(() => {
    const firstDay = start.getDay(); // 0=Sun
    const daysInMonth = end.getDate();
    const cells: { day: number | null; date: Date | null }[] = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, date: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: new Date(y, m, d) });
    while (cells.length % 7 !== 0) cells.push({ day: null, date: null });
    return cells;
  }, [y, m, start, end]);

  const eventsFor = (d: Date) => {
    const ds = d.toISOString().slice(0, 10);
    const t = (tasks ?? []).filter(t => t.due_date?.slice(0, 10) === ds);
    const a = (acts ?? []).filter(a => a.occurred_at.slice(0, 10) === ds);
    return { tasks: t, acts: a };
  };
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="التقويم" subtitle={`${AR_MONTHS[m]} ${y}`}
        actions={
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" onClick={() => setCursor(new Date(y, m - 1, 1))}><ChevronRight className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>اليوم</Button>
            <Button size="icon" variant="outline" onClick={() => setCursor(new Date(y, m + 1, 1))}><ChevronLeft className="w-4 h-4" /></Button>
          </div>
        } />

      <Card><CardContent className="pt-4">
        {(lt || la) ? <Skeleton className="h-96 w-full" /> : (
          <div>
            <div className="grid grid-cols-7 border-b pb-2 mb-2">
              {AR_DAYS.map(d => <div key={d} className="text-center text-xs font-semibold text-muted-foreground">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {grid.map((c, i) => {
                if (!c.date) return <div key={i} className="min-h-[90px] bg-muted/20 rounded" />;
                const isToday = c.date.toISOString().slice(0, 10) === today;
                const ev = eventsFor(c.date);
                return (
                  <div key={i} className={`min-h-[90px] p-1 rounded border ${isToday ? "border-primary bg-primary/5" : "border-border"}`}>
                    <div className={`text-xs font-semibold mb-1 ${isToday ? "text-primary" : ""}`}>{c.day}</div>
                    <div className="space-y-0.5">
                      {ev.tasks.slice(0, 2).map(t => (
                        <div key={t.id} className="text-[10px] truncate bg-blue-500/15 text-blue-600 px-1 rounded">📋 {t.title}</div>
                      ))}
                      {ev.acts.slice(0, 2).map(a => (
                        <div key={a.id} className="text-[10px] truncate bg-amber-500/15 text-amber-700 px-1 rounded">📞 {a.subject}</div>
                      ))}
                      {ev.tasks.length + ev.acts.length > 4 && (
                        <div className="text-[10px] text-muted-foreground">+ المزيد</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent></Card>

      <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1"><Badge variant="outline" className="bg-blue-500/15">📋 مهام</Badge></div>
        <div className="flex items-center gap-1"><Badge variant="outline" className="bg-amber-500/15">📞 أنشطة</Badge></div>
      </div>
    </div>
  );
}
