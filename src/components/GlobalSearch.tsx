import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Building2, Contact2, Sparkles, Target, FileText, ShoppingCart, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

interface Result { id: string; title: string; subtitle?: string; kind: string; path: string }

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!q || q.length < 2) { setResults([]); return; }
    let cancel = false;
    const t = setTimeout(async () => {
      const term = `%${q}%`;
      const [companies, contacts, leads, opps, quotes, orders] = await Promise.all([
        supabase.from("companies").select("id,name_en,name_ar,country").or(`name_en.ilike.${term},name_ar.ilike.${term}`).limit(5),
        supabase.from("contacts").select("id,full_name,job_title,email").or(`full_name.ilike.${term},email.ilike.${term}`).limit(5),
        supabase.from("leads").select("id,company_name,contact_name,product_requested").or(`company_name.ilike.${term},contact_name.ilike.${term},product_requested.ilike.${term}`).limit(5),
        supabase.from("opportunities").select("id,name,stage").ilike("name", term).limit(5),
        supabase.from("quotations").select("id,quote_number,status").ilike("quote_number", term).limit(5),
        supabase.from("orders").select("id,order_number,status").ilike("order_number", term).limit(5),
      ]);
      if (cancel) return;
      const r: Result[] = [];
      (companies.data ?? []).forEach((c: any) => r.push({ id: c.id, title: c.name_en || c.name_ar, subtitle: c.country ?? undefined, kind: "الشركات", path: `/companies/${c.id}` }));
      (contacts.data ?? []).forEach((c: any) => r.push({ id: c.id, title: c.full_name, subtitle: c.job_title || c.email || undefined, kind: "جهات الاتصال", path: `/contacts/${c.id}` }));
      (leads.data ?? []).forEach((l: any) => r.push({ id: l.id, title: l.company_name || l.contact_name || "ليد", subtitle: l.product_requested ?? undefined, kind: "العملاء المحتملون", path: "/leads" }));
      (opps.data ?? []).forEach((o: any) => r.push({ id: o.id, title: o.name, subtitle: o.stage, kind: "الفرص", path: "/opportunities" }));
      (quotes.data ?? []).forEach((q2: any) => r.push({ id: q2.id, title: q2.quote_number, subtitle: q2.status, kind: "عروض الأسعار", path: "/quotations" }));
      (orders.data ?? []).forEach((o: any) => r.push({ id: o.id, title: o.order_number, subtitle: o.status, kind: "الطلبيات", path: `/orders/${o.id}` }));
      setResults(r);
    }, 250);
    return () => { cancel = true; clearTimeout(t); };
  }, [q]);

  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    (acc[r.kind] ??= []).push(r); return acc;
  }, {});

  const icons: Record<string, any> = {
    "الشركات": Building2, "جهات الاتصال": Contact2, "العملاء المحتملون": Sparkles,
    "الفرص": Target, "عروض الأسعار": FileText, "الطلبيات": ShoppingCart,
  };

  const go = (path: string) => { setOpen(false); navigate({ to: path }); };

  return (
    <>
      <Button variant="outline" size="sm" className="w-full max-w-md justify-start text-muted-foreground gap-2" onClick={() => setOpen(true)}>
        <Search className="w-4 h-4" />
        بحث شامل...
        <kbd className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="ابحث في الشركات، الليدز، الفرص، العروض..." value={q} onValueChange={setQ} />
        <CommandList>
          <CommandEmpty>{q.length < 2 ? "اكتب على الأقل حرفين" : "لا توجد نتائج"}</CommandEmpty>
          {Object.entries(grouped).map(([kind, items]) => {
            const Icon = icons[kind] ?? Search;
            return (
              <CommandGroup key={kind} heading={kind}>
                {items.map((r) => (
                  <CommandItem key={`${kind}-${r.id}`} value={`${kind}-${r.id}-${r.title}`} onSelect={() => go(r.path)}>
                    <Icon className="w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{r.title}</div>
                      {r.subtitle && <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
