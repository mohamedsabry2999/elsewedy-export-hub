import { createFileRoute, Link } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Factory } from "lucide-react";


export const Route = createFileRoute("/_authenticated/orders")({ ssr: false, component: Orders });

const STATUSES = [
  { v: "draft", l: "مسودة" }, { v: "confirmed", l: "مؤكد" },
  { v: "in_production", l: "قيد الإنتاج" }, { v: "ready", l: "جاهز" },
  { v: "shipped", l: "تم الشحن" }, { v: "delivered", l: "تم التسليم" },
  { v: "completed", l: "مكتمل" }, { v: "cancelled", l: "ملغى" },
];

function Orders() {
  return (
    <CrudPage
      title="الطلبيات" addLabel="طلبية جديدة" table="orders"
      searchable={["order_number", "notes"]}
      bulkFields={[{ name: "status", label: "الحالة", options: STATUSES }]}
      defaults={{
        order_number: "", status: "draft", currency: "USD",
        subtotal: 0, discount: 0, tax: 0, total: 0, paid_amount: 0,
        order_date: new Date().toISOString().slice(0, 10),
        expected_delivery: "", delivered_at: "",
        incoterms: "FOB", payment_terms: "", notes: "",
      }}
      numberGenerator={() => ({ order_number: `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}` })}
      fields={[
        { name: "order_number", label: "رقم الطلبية", required: true },
        { name: "status", label: "الحالة", type: "select", options: STATUSES },
        { name: "order_date", label: "تاريخ الطلب", type: "date" },
        { name: "expected_delivery", label: "التسليم المتوقع", type: "date" },
        { name: "currency", label: "العملة" },
        { name: "incoterms", label: "Incoterms" },
        { name: "subtotal", label: "Subtotal", type: "number" },
        { name: "discount", label: "خصم", type: "number" },
        { name: "tax", label: "ضريبة", type: "number" },
        { name: "total", label: "الإجمالي", type: "number" },
        { name: "paid_amount", label: "المدفوع", type: "number" },
        { name: "payment_terms", label: "شروط الدفع" },
        { name: "delivered_at", label: "تاريخ التسليم الفعلي", type: "date" },
        { name: "notes", label: "ملاحظات", type: "textarea", colSpan: 2 },
      ]}
      columns={[
        { key: "order_number", header: "رقم", className: "font-mono" },
        { key: "status", header: "الحالة", render: (r: any) => <Badge variant="outline">{STATUSES.find(s => s.v === r.status)?.l ?? r.status}</Badge> },
        { key: "order_date", header: "التاريخ" },
        { key: "total", header: "الإجمالي", render: (r: any) => <span className="font-mono">{Number(r.total || 0).toLocaleString()} {r.currency}</span> },
        { key: "paid_amount", header: "المدفوع", render: (r: any) => <span className="font-mono">{Number(r.paid_amount || 0).toLocaleString()}</span> },
        { key: "expected_delivery", header: "التسليم المتوقع" },
        { key: "id", header: "الإنتاج", render: (r: any) => <Button asChild size="sm" variant="outline"><Link to="/orders/$id" params={{ id: r.id }}><Factory className="w-3 h-3" /> تفاصيل</Link></Button> },
      ]}
    />
  );
}
