
-- Phase 2: Expand permission catalog and distribute to roles
-- 1) Insert missing permission codes
INSERT INTO public.permissions (code, module, action, label_ar, label_en) VALUES
  ('dashboard.view', 'dashboard', 'view', 'عرض لوحة التحكم', 'View Dashboard'),
  ('calendar.view', 'calendar', 'view', 'عرض التقويم', 'View Calendar'),
  ('notifications.view', 'notifications', 'view', 'عرض الإشعارات', 'View Notifications'),
  ('notifications.manage', 'notifications', 'manage', 'إدارة الإشعارات', 'Manage Notifications'),
  ('products.view', 'products', 'view', 'عرض المنتجات', 'View Products'),
  ('products.create', 'products', 'create', 'إضافة منتج', 'Create Product'),
  ('products.edit', 'products', 'edit', 'تعديل منتج', 'Edit Product'),
  ('products.delete', 'products', 'delete', 'حذف منتج', 'Delete Product'),
  ('products.export', 'products', 'export', 'تصدير المنتجات', 'Export Products'),
  ('products.import', 'products', 'import', 'استيراد المنتجات', 'Import Products'),
  ('production_stages.view', 'production_stages', 'view', 'عرض مراحل الإنتاج', 'View Production Stages'),
  ('production_stages.edit', 'production_stages', 'edit', 'تحديث مراحل الإنتاج', 'Edit Production Stages'),
  ('shipment_events.view', 'shipment_events', 'view', 'عرض أحداث الشحن', 'View Shipment Events'),
  ('shipment_events.create', 'shipment_events', 'create', 'إضافة حدث شحن', 'Create Shipment Event'),
  ('roles.manage', 'roles', 'manage', 'إدارة الأدوار والصلاحيات', 'Manage Roles & Permissions'),
  ('audit_log.export', 'audit_log', 'export', 'تصدير سجل التدقيق', 'Export Audit Log'),
  ('leads.import', 'leads', 'import', 'استيراد العملاء المحتملين', 'Import Leads'),
  ('leads.export', 'leads', 'export', 'تصدير العملاء المحتملين', 'Export Leads'),
  ('contacts.import', 'contacts', 'import', 'استيراد جهات الاتصال', 'Import Contacts'),
  ('contacts.export', 'contacts', 'export', 'تصدير جهات الاتصال', 'Export Contacts'),
  ('companies.import', 'companies', 'import', 'استيراد الشركات', 'Import Companies'),
  ('quotations.convert', 'quotations', 'convert', 'تحويل عرض إلى طلبية', 'Convert Quotation'),
  ('quotations.export', 'quotations', 'export', 'تصدير عروض الأسعار', 'Export Quotations'),
  ('orders.export', 'orders', 'export', 'تصدير الطلبيات', 'Export Orders'),
  ('shipments.export', 'shipments', 'export', 'تصدير الشحنات', 'Export Shipments'),
  ('payments.export', 'payments', 'export', 'تصدير المدفوعات', 'Export Payments'),
  ('activities.edit', 'activities', 'edit', 'تعديل النشاط', 'Edit Activity'),
  ('activities.delete', 'activities', 'delete', 'حذف النشاط', 'Delete Activity'),
  ('tasks.assign', 'tasks', 'assign', 'إسناد المهام', 'Assign Tasks'),
  ('opportunities.export', 'opportunities', 'export', 'تصدير الفرص', 'Export Opportunities')
ON CONFLICT (code) DO NOTHING;

-- 2) Distribute permissions to roles (idempotent)
-- Helper macro pattern: INSERT ... ON CONFLICT DO NOTHING

-- EXPORT MANAGER: broad operational access (everything except system administration)
INSERT INTO public.role_permissions (role, permission_code)
SELECT 'export_manager'::app_role, code FROM public.permissions
WHERE code NOT IN ('users.manage','roles.manage','settings.manage')
ON CONFLICT DO NOTHING;

-- SALES SPECIALIST: leads, contacts, companies, opportunities, quotations, samples, tasks, activities
INSERT INTO public.role_permissions (role, permission_code) VALUES
  ('sales_specialist','dashboard.view'),('sales_specialist','calendar.view'),
  ('sales_specialist','notifications.view'),
  ('sales_specialist','products.view'),
  ('sales_specialist','leads.import'),('sales_specialist','leads.export'),
  ('sales_specialist','contacts.import'),('sales_specialist','contacts.export'),
  ('sales_specialist','companies.import'),
  ('sales_specialist','opportunities.export'),
  ('sales_specialist','quotations.convert'),('sales_specialist','quotations.export'),
  ('sales_specialist','activities.edit'),('sales_specialist','activities.delete'),
  ('sales_specialist','tasks.assign'),
  ('sales_specialist','shipments.view'),('sales_specialist','payments.view'),
  ('sales_specialist','orders.view')
ON CONFLICT DO NOTHING;

-- SALES COORDINATOR: coordinate between sales & ops
INSERT INTO public.role_permissions (role, permission_code) VALUES
  ('sales_coordinator','dashboard.view'),('sales_coordinator','calendar.view'),
  ('sales_coordinator','notifications.view'),
  ('sales_coordinator','products.view'),
  ('sales_coordinator','samples.view'),('sales_coordinator','samples.create'),('sales_coordinator','samples.edit'),
  ('sales_coordinator','quotations.view'),('sales_coordinator','quotations.create'),('sales_coordinator','quotations.edit'),
  ('sales_coordinator','orders.view'),('sales_coordinator','shipments.view'),
  ('sales_coordinator','payments.view'),('sales_coordinator','export_documents.view'),
  ('sales_coordinator','tasks.assign'),('sales_coordinator','activities.edit')
ON CONFLICT DO NOTHING;

-- PRICING: quotations focus + products
INSERT INTO public.role_permissions (role, permission_code) VALUES
  ('pricing','dashboard.view'),('pricing','notifications.view'),
  ('pricing','products.view'),('pricing','products.edit'),
  ('pricing','quotations.view'),('pricing','quotations.create'),('pricing','quotations.edit'),
  ('pricing','quotations.approve'),('pricing','quotations.export'),
  ('pricing','opportunities.view'),('pricing','companies.view'),('pricing','contacts.view'),
  ('pricing','leads.view'),('pricing','reports.view')
ON CONFLICT DO NOTHING;

-- PRODUCTION: orders & production stages
INSERT INTO public.role_permissions (role, permission_code) VALUES
  ('production','dashboard.view'),('production','notifications.view'),
  ('production','products.view'),
  ('production','orders.view'),('production','orders.edit'),
  ('production','production_stages.view'),('production','production_stages.edit'),
  ('production','samples.view'),('production','samples.edit'),
  ('production','tasks.view'),('production','tasks.create'),('production','tasks.edit')
ON CONFLICT DO NOTHING;

-- LOGISTICS: shipments, export documents
INSERT INTO public.role_permissions (role, permission_code) VALUES
  ('logistics','dashboard.view'),('logistics','notifications.view'),
  ('logistics','shipments.view'),('logistics','shipments.create'),('logistics','shipments.edit'),('logistics','shipments.export'),
  ('logistics','shipment_events.view'),('logistics','shipment_events.create'),
  ('logistics','export_documents.view'),('logistics','export_documents.create'),('logistics','export_documents.edit'),
  ('logistics','orders.view'),('logistics','companies.view'),('logistics','contacts.view')
ON CONFLICT DO NOTHING;

-- ACCOUNTING: payments, orders (read), reports
INSERT INTO public.role_permissions (role, permission_code) VALUES
  ('accounting','dashboard.view'),('accounting','notifications.view'),
  ('accounting','payments.view'),('accounting','payments.create'),('accounting','payments.edit'),('accounting','payments.export'),
  ('accounting','orders.view'),('accounting','orders.export'),
  ('accounting','quotations.view'),('accounting','shipments.view'),
  ('accounting','companies.view'),('accounting','contacts.view'),
  ('accounting','reports.view'),('accounting','reports.export')
ON CONFLICT DO NOTHING;

-- VIEWER: read-only across the app
INSERT INTO public.role_permissions (role, permission_code)
SELECT 'viewer'::app_role, code FROM public.permissions
WHERE action = 'view'
ON CONFLICT DO NOTHING;
