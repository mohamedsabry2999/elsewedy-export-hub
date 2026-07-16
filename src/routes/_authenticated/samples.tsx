import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/samples")({ ssr: false, component: Samples });

const STATUSES = [
  { v: "requested", l: "مطلوبة" }, { v: "preparing", l: "قيد التحضير" },
  { v: "shipped", l: "تم الشحن" }, { v: "delivered", l: "تم التسليم" },
  { v: "feedback_positive", l: "ردود إيجابية" }, { v: "feedback_negative", l: "ردود سلبية" },
  { v: "cancelled", l: "ملغاة" },
];

function Samples() {
  return (
    <CrudPage
      title="العينات" addLabel="عينة جديدة" table="samples"
      searchable={["sample_number", "product_name", "tracking_number"]}
      defaults={{
        sample_number: "", product_name: "", quantity: 1, status: "requested",
        courier: "", tracking_number: "", cost: 0, shipped_at: "",
        delivered_at: "", feedback_notes: "", notes: "",
      }}
      numberGenerator={() => ({ sample_number: `SMP-${Date.now().toString().slice(-6)}` })}
      fields={[
        { name: "sample_number", label: "رقم العينة", required: true },
        { name: "product_name", label: "المنتج", required: true },
        { name: "quantity", label: "الكمية", type: "number" },
        { name: "status", label: "الحالة", type: "select", options: STATUSES },
        { name: "courier", label: "شركة الشحن" },
        { name: "tracking_number", label: "رقم التتبع" },
        { name: "shipped_at", label: "تاريخ الشحن", type: "date" },
        { name: "delivered_at", label: "تاريخ التسليم", type: "date" },
        { name: "cost", label: "التكلفة", type: "number" },
        { name: "feedback_notes", label: "ملاحظات الرد", type: "textarea", colSpan: 2 },
        { name: "notes", label: "ملاحظات", type: "textarea", colSpan: 2 },
      ]}
      columns={[
        { key: "sample_number", header: "رقم", className: "font-mono" },
        { key: "product_name", header: "المنتج" },
        { key: "quantity", header: "الكمية" },
        { key: "status", header: "الحالة", render: (r: any) => <Badge variant="outline">{STATUSES.find(s => s.v === r.status)?.l ?? r.status}</Badge> },
        { key: "courier", header: "الشحن" },
        { key: "tracking_number", header: "التتبع" },
      ]}
    />
  );
}
