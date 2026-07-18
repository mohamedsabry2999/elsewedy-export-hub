
## نطاق العمل

إعادة تصميم منظومة عروض الأسعار فقط (بدون المساس بباقي النظام) — بهوية خضراء Corporate خاصة بالمستند، مستقلة عن هوية النظام الحمراء.

## الملفات الجديدة

### 1. Design Tokens
- `src/styles/quotation-doc.css` — متغيرات `--quotation-*` + Print CSS + `print-color-adjust: exact`. يُستورد داخل صفحة التفاصيل فقط.

### 2. مكونات المستند (`src/components/quotation/`)
- `QuotationDocument.tsx` — الحاوية A4 (max-w 900px، خلفية بيضاء ثابتة حتى في Dark Mode)
- `QuotationHeader.tsx` — لوجو + بيانات الشركة من BrandingProvider
- `QuotationDocumentTitle.tsx` — "عرض سعر" / "QUOTATION"
- `QuotationNumberBox.tsx` — صندوق أخضر برقم العرض + تاريخ + صلاحية
- `QuotationStatusBadge.tsx` — ألوان الحالات الخمس
- `QuotationClientInfo.tsx` — بطاقة العميل بخلفية Soft Green، عمودين
- `QuotationItemsTable.tsx` — الجدول (رأس أخضر، صفوف متبادلة، لا ارتفاع ثابت)
- `QuotationItemSpecifications.tsx` — Grid للمواصفات (Material/Dimensions/Printing/Finish/Lead Time…)
- `QuotationTotals.tsx` — صندوق إجماليات + Formatter للعملة
- `QuotationTerms.tsx` — Incoterms / Payment / Delivery / Validity / Production
- `QuotationSignatures.tsx` — قسم توقيع العميل + قسم السويدي
- `QuotationFooter.tsx` — شريط أخضر + "Precision in Every Print"
- `QuotationActions.tsx` — شريط الأدوات خارج الورقة (رجوع/تعديل/معاينة/تحميل عربي/تحميل إنجليزي/طباعة/موافقة/تحويل أو عرض الطلب)
- `QuotationPdfPreview.tsx` — Dialog كبير مع iframe + revoke Object URL عند الإغلاق

### 3. Data Loader
- `src/lib/quotation-document.ts` — `loadQuotationDocumentData(id)` يجلب: quotation, items, company, contact, opportunity, approval, linkedOrder, branding, settings (بـ Promise.all).

### 4. PDF Service (توسيع)
- `src/lib/quotation-pdf.tsx` — مستند PDF جديد مبني على `@react-pdf/renderer`:
  - نسختان: `<ArabicQuotationPdf/>` (RTL، Noto Naskh Arabic 400/700) و`<EnglishQuotationPdf/>` (LTR، Helvetica/Inter)
  - تسجيل خط Noto Naskh Arabic Regular + Bold فعليًا؛ Fallback إذا فشل Bold
  - نفس الهوية الخضراء، تكرار Header/Footer، رقم صفحة، `wrap={false}` للصفوف
  - Formatter موحد للعملة (منزلتان + فواصل آلاف)
  - `resolvePdfLogo` كما هو + fallback محلي
  - دالتان: `downloadArabicQuotationPdf(data)`، `downloadEnglishQuotationPdf(data)`، `generateQuotationPdfBlob(data, lang)` للمعاينة

### 5. صفحة التفاصيل
- `src/routes/_authenticated/quotations.$id.tsx` — Route جديد `/quotations/$id` يعرض `<QuotationDocument/>` داخل خلفية `#F4F6F5` مع شريط الأدوات

## الملفات المُعدَّلة

- `src/routes/_authenticated/quotations.tsx` — 
  - رقم العرض قابل للنقر → يفتح `/quotations/$id`
  - Actions Menu (Popover): تفاصيل / تعديل / معاينة PDF عربي / تحميل عربي / تحميل إنجليزي / طباعة / موافقة / **عرض الطلب المرتبط** (إن وُجد `converted_order_id`) بدل زر التحويل
  - Spinner على مستوى الصف فقط
  - Toasts: جاري التجهيز / تم التحميل / تعذر الإنشاء

## القواعد المُحترمة

- بدون تغيير جدول DB أو أرقام أو منتجات أو أسعار
- الاحتفاظ بـ `@react-pdf/renderer` (بدون jsPDF)
- الاحتفاظ بـ `convert_quotation_to_order` كما هو — منع التحويل المكرر يتم بالفعل بـ UNIQUE INDEX على `quotation_id` + إخفاء الزر عند `converted_order_id`
- لا تغيير على Sidebar / Dashboard / Layout / Theme العام
- الهوية الخضراء داخل ملفات المستند فقط

## الخط العربي

- إبقاء أصول Cairo (للواجهة)، وإضافة Noto Naskh Arabic كأصول جديدة `src/assets/noto-naskh-arabic-regular.ttf.asset.json` و`-bold.ttf.asset.json` (تنزيل من Google Fonts ورفع عبر `lovable-assets`). يُسجَّل مرة واحدة داخل `quotation-pdf.tsx` مع `try/catch` وFallback على Regular إذا فشل Bold.

## الاختبار النهائي

1. `bun run build` (Production)
2. تشغيل Playwright: فتح `/quotations`، فتح صف Q-DEMO-2026-001، الضغط على تحميل PDF عربي وإنجليزي، حفظ الملفات، فحص حجمها (>10KB)، معاينة أول صفحة كصورة عبر `pdftoppm` والتأكد بصريًا من:
   - ظهور اللوجو
   - اتصال الحروف العربية
   - ظهور البنود الثلاثة والمواصفات
   - الإجمالي 36,750.00 USD
   - رأس الجدول مكرر
3. اختبار المعاينة داخل التطبيق (iframe يعرض PDF)
4. اختبار الطباعة عبر emulateMedia('print') وscreenshot

## التقرير النهائي

سيتضمن كل النقاط الـ 19 المطلوبة (الملفات، النتائج، الأحجام، Build Result…).

---

**ملاحظة:** هذا العمل كبير الحجم (≈15 مكون + PDF مزدوج اللغة + اختبار PDF فعلي). سأنفذه دفعة واحدة بعد الموافقة.
