import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/payments")({ ssr: false, component: Payments });

const STATUSES = [
  { v: "pending", l: "معلقة" }, { v: "partial", l: "جزئية" },
  { v: "paid", l: "مدفوعة" }, { v: "overdue", l: "متأخرة" },
  { v: "refunded", l: "مستردة" },
];
const METHODS = [
  { v: "wire_transfer", l: "تحويل بنكي" }, { v: "lc", l: "اعتماد مستندي (L/C)" },
  { v: "cash", l: "نقدي" }, { v: "cheque", l: "شيك" },
  { v: "credit_card", l: "بطاقة ائتمان" }, { v: "other", l: "أخرى" },
];

function Payments() {
  return (
    <CrudPage
      title="المدفوعات" addLabel="دفعة جديدة" table="payments"
      searchable={["payment_number", "reference"]}
      invalidateKeys={["orders", "reports-all"]}
      defaults={{
        payment_number: "", status: "pending", amount: 0, currency: "USD",
        method: "wire_transfer", reference: "", order_id: "", company_id: "",
        paid_at: "", due_date: "", notes: "",
      }}
      numberGenerator={() => ({ payment_number: `PAY-${Date.now().toString().slice(-6)}` })}
      fields={[
        { name: "payment_number", label: "رقم الدفعة", required: true },
        { name: "status", label: "الحالة", type: "select", options: STATUSES },
        { name: "order_id", label: "الطلبية", type: "async-select", optionsTable: "orders", optionsLabelField: "order_number" },
        { name: "company_id", label: "العميل", type: "async-select", optionsTable: "companies", optionsLabelField: "name_en" },
        { name: "amount", label: "المبلغ", type: "number", required: true },
        { name: "currency", label: "العملة" },
        { name: "method", label: "طريقة الدفع", type: "select", options: METHODS },
        { name: "reference", label: "مرجع/رقم العملية" },
        { name: "due_date", label: "تاريخ الاستحقاق", type: "date" },
        { name: "paid_at", label: "تاريخ الدفع", type: "date" },
        { name: "notes", label: "ملاحظات", type: "textarea", colSpan: 2 },
      ]}
      columns={[
        { key: "payment_number", header: "رقم", className: "font-mono" },
        { key: "status", header: "الحالة", render: (r: any) => <Badge variant="outline">{STATUSES.find(s => s.v === r.status)?.l ?? r.status}</Badge> },
        { key: "amount", header: "المبلغ", render: (r: any) => <span className="font-mono">{Number(r.amount || 0).toLocaleString()} {r.currency}</span> },
        { key: "method", header: "الطريقة", render: (r: any) => METHODS.find(m => m.v === r.method)?.l ?? r.method },
        { key: "due_date", header: "الاستحقاق" },
        { key: "paid_at", header: "تاريخ الدفع" },
      ]}
      filterFields={[
        { name: "status", label: "الحالة", options: STATUSES },
        { name: "method", label: "طريقة الدفع", options: METHODS },
      ]}
      bulkFields={[
        { name: "status", label: "تحديث الحالة", options: STATUSES },
      ]}
      ownedFields={false}
    />
  );
}
