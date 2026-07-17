import { createFileRoute, Link } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/shipments")({ ssr: false, component: Shipments });

const STATUSES = [
  { v: "pending", l: "قيد الإعداد" }, { v: "booked", l: "محجوز" },
  { v: "in_transit", l: "قيد النقل" }, { v: "delivered", l: "تم التسليم" },
  { v: "delayed", l: "متأخر" }, { v: "cancelled", l: "ملغى" },
];
const MODES = [
  { v: "sea", l: "بحري" }, { v: "air", l: "جوي" },
  { v: "road", l: "بري" }, { v: "rail", l: "سكة حديد" },
];

function Shipments() {
  return (
    <CrudPage
      title="الشحنات" addLabel="شحنة جديدة" table="shipments"
      searchable={["shipment_number", "tracking_number", "destination_country"]}
      bulkFields={[
        { name: "status", label: "الحالة", options: STATUSES },
        { name: "mode", label: "الوسيلة", options: MODES },
      ]}
      defaults={{
        shipment_number: "", status: "pending", mode: "sea", carrier: "",
        tracking_number: "", origin_port: "", destination_port: "",
        destination_country: "", container_number: "", order_id: "", company_id: "",
        weight_kg: 0, volume_cbm: 0, shipped_at: "", eta: "", delivered_at: "",
        freight_cost: 0, insurance_cost: 0, notes: "",
      }}
      numberGenerator={() => ({ shipment_number: `SHP-${Date.now().toString().slice(-6)}` })}
      fields={[
        { name: "shipment_number", label: "رقم الشحنة", required: true },
        { name: "status", label: "الحالة", type: "select", options: STATUSES },
        { name: "order_id", label: "الطلبية المرتبطة", type: "async-select", optionsTable: "orders", optionsLabelField: "order_number" },
        { name: "company_id", label: "العميل", type: "async-select", optionsTable: "companies", optionsLabelField: "name_en" },
        { name: "mode", label: "الوسيلة", type: "select", options: MODES },
        { name: "carrier", label: "شركة الشحن" },
        { name: "tracking_number", label: "رقم التتبع" },
        { name: "container_number", label: "رقم الحاوية" },
        { name: "origin_port", label: "ميناء الشحن" },
        { name: "destination_port", label: "ميناء الوصول" },
        { name: "destination_country", label: "الدولة" },
        { name: "weight_kg", label: "الوزن (كجم)", type: "number" },
        { name: "volume_cbm", label: "الحجم (م³)", type: "number" },
        { name: "shipped_at", label: "تاريخ الشحن", type: "date" },
        { name: "eta", label: "الوصول المتوقع", type: "date" },
        { name: "delivered_at", label: "تاريخ التسليم", type: "date" },
        { name: "freight_cost", label: "تكلفة الشحن", type: "number" },
        { name: "insurance_cost", label: "تكلفة التأمين", type: "number" },
        { name: "notes", label: "ملاحظات", type: "textarea", colSpan: 2 },
      ]}
      columns={[
        { key: "shipment_number", header: "رقم", className: "font-mono" },
        { key: "status", header: "الحالة", render: (r: any) => <Badge variant="outline">{STATUSES.find(s => s.v === r.status)?.l ?? r.status}</Badge> },
        { key: "mode", header: "الوسيلة", render: (r: any) => MODES.find(m => m.v === r.mode)?.l ?? r.mode },
        { key: "destination_country", header: "الوجهة" },
        { key: "tracking_number", header: "التتبع" },
        { key: "eta", header: "الوصول المتوقع" },
        { key: "id", header: "التتبع", render: (r: any) => <Button asChild size="sm" variant="outline"><Link to="/shipments/$id" params={{ id: r.id }}><MapPin className="w-3 h-3" /> أحداث</Link></Button> },
      ]}
    />
  );
}
