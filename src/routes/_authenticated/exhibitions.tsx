import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/exhibitions")({ ssr: false, component: Exhibitions });

const STATUSES = [
  { v: "planned", l: "مخطط" }, { v: "confirmed", l: "مؤكد" },
  { v: "ongoing", l: "جارٍ" }, { v: "completed", l: "منتهي" },
  { v: "cancelled", l: "ملغى" },
];

function Exhibitions() {
  return (
    <CrudPage
      title="المعارض" addLabel="معرض جديد" table="exhibitions"
      searchable={["name", "country", "city"]}
      defaults={{
        name: "", country: "", city: "", venue: "", status: "planned",
        start_date: "", end_date: "", booth_number: "",
        booth_cost: 0, total_cost: 0, leads_collected: 0,
        website: "", notes: "",
      }}
      fields={[
        { name: "name", label: "اسم المعرض", required: true, colSpan: 2 },
        { name: "country", label: "الدولة" },
        { name: "city", label: "المدينة" },
        { name: "venue", label: "المكان" },
        { name: "status", label: "الحالة", type: "select", options: STATUSES },
        { name: "start_date", label: "البداية", type: "date" },
        { name: "end_date", label: "النهاية", type: "date" },
        { name: "booth_number", label: "رقم الجناح" },
        { name: "booth_cost", label: "تكلفة الجناح", type: "number" },
        { name: "total_cost", label: "التكلفة الإجمالية", type: "number" },
        { name: "leads_collected", label: "عدد الليدز المجمعة", type: "number" },
        { name: "website", label: "الموقع الإلكتروني", dir: "ltr", colSpan: 2 },
        { name: "notes", label: "ملاحظات", type: "textarea", colSpan: 2 },
      ]}
      columns={[
        { key: "name", header: "الاسم" },
        { key: "country", header: "الدولة" },
        { key: "city", header: "المدينة" },
        { key: "status", header: "الحالة", render: (r: any) => <Badge variant="outline">{STATUSES.find(s => s.v === r.status)?.l ?? r.status}</Badge> },
        { key: "start_date", header: "البداية" },
        { key: "end_date", header: "النهاية" },
        { key: "leads_collected", header: "ليدز" },
        { key: "total_cost", header: "التكلفة", render: (r: any) => <span className="font-mono">{Number(r.total_cost || 0).toLocaleString()}</span> },
      ]}
      ownedFields={false}
    />
  );
}
