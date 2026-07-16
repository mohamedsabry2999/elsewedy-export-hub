import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

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

async function openDoc(path: string) {
  const { data } = await supabase.storage.from("documents").createSignedUrl(path, 3600);
  if (data?.signedUrl) window.open(data.signedUrl, "_blank");
}

function ExportDocs() {
  return (
    <CrudPage
      title="مستندات التصدير" addLabel="مستند جديد" table="export_documents"
      searchable={["doc_number"]}
      defaults={{
        doc_number: "", doc_type: "commercial_invoice", order_id: "", shipment_id: "", company_id: "",
        issue_date: new Date().toISOString().slice(0, 10),
        expiry_date: "", file_url: "", notes: "",
      }}
      fields={[
        { name: "doc_number", label: "رقم المستند", required: true },
        { name: "doc_type", label: "النوع", type: "select", options: TYPES, required: true },
        { name: "order_id", label: "الطلبية", type: "async-select", optionsTable: "orders", optionsLabelField: "order_number" },
        { name: "shipment_id", label: "الشحنة", type: "async-select", optionsTable: "shipments", optionsLabelField: "shipment_number" },
        { name: "company_id", label: "العميل", type: "async-select", optionsTable: "companies", optionsLabelField: "name_en" },
        { name: "issue_date", label: "تاريخ الإصدار", type: "date" },
        { name: "expiry_date", label: "تاريخ الانتهاء", type: "date" },
        { name: "file_url", label: "الملف", type: "file", bucket: "documents", colSpan: 2 },
        { name: "notes", label: "ملاحظات", type: "textarea", colSpan: 2 },
      ]}
      columns={[
        { key: "doc_number", header: "رقم", className: "font-mono" },
        { key: "doc_type", header: "النوع", render: (r: any) => <Badge variant="outline">{TYPES.find(t => t.v === r.doc_type)?.l ?? r.doc_type}</Badge> },
        { key: "issue_date", header: "الإصدار" },
        { key: "expiry_date", header: "الانتهاء" },
        { key: "file_url", header: "الملف", render: (r: any) => r.file_url
          ? <Button size="sm" variant="outline" onClick={() => openDoc(r.file_url)}><Download className="w-3 h-3" /> تنزيل</Button>
          : "—" },
      ]}
      ownedFields={false}
    />
  );
}
