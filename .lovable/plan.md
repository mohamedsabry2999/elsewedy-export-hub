# خطة إعادة الهيكلة الشاملة — Elsewedy Export Hub

طلبك يغطي 26 قسمًا ضخمًا (أمان + RBAC كامل + 22 مرحلة Pipeline + إنتاج + شحن + مستندات + أتمتة + استيراد Excel + PDF + Demo Data + اختبار شامل). هذا حجم عمل يعادل عدة أسابيع من التطوير المتواصل، ولا يمكن تنفيذه في جلسة واحدة دون فقدان الجودة أو كسر ما هو قائم.

سأقسّم العمل إلى **6 مراحل متتابعة**. كل مرحلة = تسليم مستقل وقابل للاختبار. بعد كل مرحلة سأتوقف لك لتراجع وتوافق قبل الانتقال للتالية.

---

## المرحلة 1 — الأمان والهوية (أولوية قصوى)
**الأقسام: 1، 5، جزء من 3**

- إزالة Bootstrap Owner و signUp من صفحة auth نهائيًا.
- Edge Function آمنة `admin-users` (Service Role) للعمليات: Invite / Suspend / Activate / Delete / Reset Password / Assign Role.
- إصلاح `is_admin` و `has_role` والتأكد من عملهما داخل RLS.
- فحص `profiles.is_active` في كل جلسة → طرد المستخدم الموقوف فورًا.
- تشديد سياسات RLS الحالية (لا تعديل مفتوح لأي authenticated).
- تحديث الهوية: Title / Meta / OG / Favicon / Manifest / اسم التطبيق = **Elsewedy Export Hub**.
- إعادة بناء صفحة Users بالعمليات الحقيقية عبر Edge Function.

## المرحلة 2 — نظام الصلاحيات RBAC الحقيقي
**الأقسام: 2، 4، 6**

- جداول: `roles`, `permissions`, `role_permissions`, `user_roles` (m2m), `user_permissions`.
- بذر الصلاحيات التفصيلية (view/create/edit/delete/export/print/approve/view_prices/…).
- دالة `has_permission(user, perm)` + استخدامها في RLS على كل الجداول الرئيسية.
- صفحة **Roles & Permissions** بـ Checkboxes (إنشاء/نسخ/تعديل دور).
- Hook `usePermission()` لإخفاء/تعطيل الأزرار في الواجهة.
- صفحة **Profile** كاملة (صورة + بيانات + تغيير كلمة السر + KPIs شخصية).
- صفحة **Settings** مربوطة بجدول `system_settings` (بيانات الشركة، شعار، عملة، لغة، بنوك، توقيع، ضرائب) + رفع للـ Storage.

## المرحلة 3 — نواة CRM المطوّرة
**الأقسام: 7، 8، 9، 10، 11، 12**

- **Global Search** (Command Palette) عبر كل الوحدات.
- جدول `notifications` + مركز إشعارات + جرس بعدّاد غير مقروء.
- صفحات **Details** كاملة للشركة والـ Contact مع Tabs (Overview/Contacts/Leads/Opps/Activities/Tasks/Samples/Quotations/Orders/Shipments/Payments/Docs/Timeline/Financial).
- **Leads**: Table + Cards + Kanban + Bulk actions + Duplicate detection + Convert (Company+Contact+Opportunity) + FK لـ exhibitions.
- **Lead Scoring Engine** قابل للتخصيص من Settings (0-100 + أسباب).
- **Pipeline بـ 22 مرحلة** + جدول `opportunity_stage_history` + سبب خسارة إجباري + زر Create Order.
- **Tasks** المطوّرة (Checklist/Comments/Attachments/Recurrence/Reminder) + Calendar بثلاث Views و Drag&Drop.

## المرحلة 4 — العمليات (Products/Samples/Quotations/Orders/Production)
**الأقسام: 13، 14، 15، 16**

- Modules جديدة: Products, Materials, Finishes, Units, Categories.
- **Samples** المطوّرة بالمواصفات الكاملة + أتمتة (Follow-up عند Sent، تحديث Stage عند Approved).
- **Quotations**: Versions + Approvals + Activity + PDF احترافي بهوية Elsewedy + جميع الحالات + RPC لحفظ Items ذريًا.
- **Orders**: Convert from Quotation + Details Page + Production Follow-up بـ 13 مرحلة (طباعة/تغليف/تلميع/قص/QC…).

## المرحلة 5 — اللوجستيات والمالية والدول
**الأقسام: 17، 18، 19**

- **Shipments** الكاملة + Document Checklist + منع Shipped عند نقص المستندات + رفع فعلي للـ Storage.
- **Payments** حول Payment Schedules + Aging Report + تحديث تلقائي للطلب.
- **Countries & Markets** + تطوير Exhibitions (Budget/Cost/ROI).

## المرحلة 6 — الاستيراد والتصدير والأتمتة والتقارير والبيانات التجريبية
**الأقسام: 20، 21، 22، 23، 24، 25، 26**

- Excel Import/Export (SheetJS) مع Mapping/Validation/Duplicates/History.
- Comments+Mentions + Attachments موحدة.
- Automation Rules (Postgres triggers + Edge scheduler).
- Audit Log التلقائي عبر Triggers لكل الجداول.
- Dashboard جديدة + Reports Center + Filters + Export.
- زر **Generate Demo Data / Delete Demo Data** (Idempotent، Admin فقط).
- جولة QA شاملة على كل زر ومسار وإصلاح المتبقي.

---

## ملاحظات مهمة قبل البدء

1. **لن أحذف أي بيانات موجودة** — كل Migration ستكون إضافية/تعديلية آمنة.
2. سأبدأ فورًا بـ **المرحلة 1** لأنها أمان حرج (Bootstrap مفتوح للعموم = ثغرة خطيرة).
3. بعد كل مرحلة سأعطيك تقريرًا مختصرًا وأنتظر موافقتك.
4. إذا أردت تسريع/دمج مراحل أخبرني، لكن جودة الاختبار ستقل.

**هل أبدأ بالمرحلة 1 (الأمان والهوية) الآن؟**
