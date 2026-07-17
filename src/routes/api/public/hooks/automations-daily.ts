import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/automations-daily")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const today = new Date();
        const in3 = new Date(today.getTime() + 3 * 86400000);
        const todayISO = today.toISOString().slice(0, 10);
        const in3ISO = in3.toISOString().slice(0, 10);

        // 1) Payments due within 3 days (not fully paid) → notify order owner
        const { data: duePayments = [] } = await supabaseAdmin
          .from("payments")
          .select("id, payment_number, amount, currency, due_date, order_id, status")
          .neq("status", "paid")
          .gte("due_date", todayISO)
          .lte("due_date", in3ISO);

        let paymentAlerts = 0;
        for (const p of duePayments ?? []) {
          if (!p.order_id) continue;
          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("owner_id, order_number")
            .eq("id", p.order_id)
            .maybeSingle();
          if (!order?.owner_id) continue;
          await supabaseAdmin.rpc("notify_user", {
            _user_id: order.owner_id,
            _title: "دفعة قادمة قريبًا",
            _body: `${p.payment_number ?? "دفعة"} — ${order.order_number ?? ""} — ${p.amount} ${p.currency ?? ""} مستحقة ${p.due_date}`,
            _type: "payment_due_soon",
            _entity_type: "payment",
            _entity_id: p.id,
            _link: "/payments",
          });
          paymentAlerts++;
        }

        // 2) Overdue payments → notify order owner
        const { data: overduePayments = [] } = await supabaseAdmin
          .from("payments")
          .select("id, payment_number, amount, currency, due_date, order_id")
          .neq("status", "paid")
          .lt("due_date", todayISO);

        let overdueAlerts = 0;
        for (const p of overduePayments ?? []) {
          if (!p.order_id) continue;
          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("owner_id, order_number")
            .eq("id", p.order_id)
            .maybeSingle();
          if (!order?.owner_id) continue;
          await supabaseAdmin.rpc("notify_user", {
            _user_id: order.owner_id,
            _title: "دفعة متأخرة",
            _body: `${p.payment_number ?? "دفعة"} — ${order.order_number ?? ""} — ${p.amount} ${p.currency ?? ""} متأخرة منذ ${p.due_date}`,
            _type: "payment_overdue",
            _entity_type: "payment",
            _entity_id: p.id,
            _link: "/payments",
          });
          overdueAlerts++;
        }

        // 3) Overdue tasks → escalate to assignee + system_owners
        const { data: overdueTasks = [] } = await supabaseAdmin
          .from("tasks")
          .select("id, title, due_date, assigned_to, status")
          .not("status", "in", "(done,cancelled)")
          .lt("due_date", todayISO);

        const { data: owners = [] } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .eq("role", "system_owner");
        const ownerIds = (owners ?? []).map((r: any) => r.user_id);

        let taskAlerts = 0;
        for (const t of overdueTasks ?? []) {
          const recipients = new Set<string>();
          if (t.assigned_to) recipients.add(t.assigned_to);
          for (const oid of ownerIds) recipients.add(oid);
          for (const uid of recipients) {
            await supabaseAdmin.rpc("notify_user", {
              _user_id: uid,
              _title: "مهمة متأخرة تحتاج تصعيد",
              _body: `${t.title} — كانت مستحقة ${t.due_date}`,
              _type: "task_overdue",
              _entity_type: "task",
              _entity_id: t.id,
              _link: "/tasks",
            });
            taskAlerts++;
          }
        }

        return new Response(
          JSON.stringify({
            ok: true,
            paymentAlerts,
            overdueAlerts,
            taskAlerts,
            ranAt: new Date().toISOString(),
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
