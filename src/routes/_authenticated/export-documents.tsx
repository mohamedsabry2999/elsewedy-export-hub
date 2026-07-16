import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/export-documents")({ ssr: false, component: ExportDocs });

const TYPES = [
  { v: "commercial_invoice", l: "فاتورة تجارية" },
  { v: "packing_list", l: "قائمة تعبئة" },
  { v: "bill_of_lading", l: "بوليصة شحن" },
  { v: "certificate_of_origin", l: "شهادة منشأ" },
  { v: "coa", l: "شهادة تحليل" },
  { v: "insurance", l: "تأمين" },
  { v: "customs", l: "جمارك" },
  { v: "other", l: "أخرى" },
];

function ExportDocs() {
  return (
    <CrudPage
      title="مستندات التصدير" addLabel="مستند جديد" table="export_documents"
      searchable={["doc_number"]}
      defaults={{
        doc_number: "", doc_type: "commercial_invoice",
        issue_date: new Date().toISOString().slice(0, 10),
        expiry_date: "", file_url: "", notes: "",
      }}
      fields={[
        { name: "doc_number", label: "رقم المستند", required: true },
        { name: "doc_type", label: "النوع", type: "select", options: TYPES, required: true },
        { name: "issue_date", label: "تاريخ الإصدار", type: "date" },
        { name: "expiry_date", label: "تاريخ الانتهاء", type: "date" },
        { name: "file_url", label: "رابط الملف", dir: "ltr", colSpan: 2 },
        { name: "notes", label: "ملاحظات", type: "textarea", colSpan: 2 },
      ]}
      columns={[
        { key: "doc_number", header: "رقم", className: "font-mono" },
        { key: "doc_type", header: "النوع", render: (r: any) => <Badge variant="outline">{TYPES.find(t => t.v === r.doc_type)?.l ?? r.doc_type}</Badge> },
        { key: "issue_date", header: "الإصدار" },
        { key: "expiry_date", header: "الانتهاء" },
        { key: "file_url", header: "الملف", render: (r: any) => r.file_url ? <a href={r.file_url} target="_blank" rel="noreferrer" className="text-primary underline">فتح</a> : "—" },
      ]}
      ownedFields={false}
    />
  );
}
