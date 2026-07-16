import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/products")({ ssr: false, component: Products });

function Products() {
  return (
    <CrudPage
      title="كتالوج المنتجات"
      addLabel="منتج جديد"
      table="products"
      searchable={["sku", "name_ar", "name_en", "category", "hs_code"]}
      defaults={{
        sku: "", name_ar: "", name_en: "", category: "", description: "",
        unit: "pcs", base_price: 0, currency: "USD", hs_code: "",
        image_url: "", min_order_qty: 1, stock_qty: 0, is_active: true, notes: "",
      }}
      fields={[
        { name: "sku", label: "SKU *", required: true, dir: "ltr" },
        { name: "name_ar", label: "الاسم بالعربي *", required: true },
        { name: "name_en", label: "Name (EN)", dir: "ltr" },
        { name: "category", label: "الفئة" },
        { name: "unit", label: "الوحدة", dir: "ltr" },
        { name: "base_price", label: "السعر الأساسي", type: "number" },
        { name: "currency", label: "العملة", dir: "ltr" },
        { name: "hs_code", label: "HS Code", dir: "ltr" },
        { name: "min_order_qty", label: "الحد الأدنى للطلب", type: "number" },
        { name: "stock_qty", label: "المخزون الحالي", type: "number" },
        { name: "image_url", label: "رابط الصورة", dir: "ltr", colSpan: 2 },
        { name: "description", label: "الوصف", type: "textarea", colSpan: 2 },
        { name: "notes", label: "ملاحظات", type: "textarea", colSpan: 2 },
      ]}
      columns={[
        { key: "sku", header: "SKU", className: "font-mono text-xs" },
        { key: "name_ar", header: "الاسم" },
        { key: "category", header: "الفئة" },
        { key: "base_price", header: "السعر", render: (r: any) => <span className="font-mono">{Number(r.base_price || 0).toLocaleString()} {r.currency}</span> },
        { key: "stock_qty", header: "المخزون", render: (r: any) => <span className="font-mono">{Number(r.stock_qty || 0).toLocaleString()} {r.unit}</span> },
        { key: "is_active", header: "الحالة", render: (r: any) => r.is_active ? <Badge className="bg-success/20 text-success-foreground border-success/40">نشط</Badge> : <Badge variant="secondary">موقوف</Badge> },
      ]}
    />
  );
}
