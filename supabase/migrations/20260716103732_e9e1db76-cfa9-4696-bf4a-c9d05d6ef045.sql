
-- Permissions catalog
CREATE TABLE IF NOT EXISTS public.permissions (
  code TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  label_ar TEXT NOT NULL,
  label_en TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read permissions" ON public.permissions FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission_code TEXT NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, permission_code)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage role_permissions" ON public.role_permissions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_code)
);
GRANT SELECT ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user read own permissions" ON public.user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admin manage user_permissions" ON public.user_permissions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _code TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id=_user_id AND permission_code=_code AND granted=false) THEN false
      WHEN EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id=_user_id AND permission_code=_code AND granted=true) THEN true
      WHEN public.is_admin(_user_id) THEN true
      WHEN EXISTS (
        SELECT 1 FROM public.role_permissions rp
        JOIN public.user_roles ur ON ur.role = rp.role
        WHERE ur.user_id=_user_id AND rp.permission_code=_code
      ) THEN true
      ELSE false
    END
$$;

CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  company_name TEXT NOT NULL DEFAULT 'Elsewedy Print House',
  company_name_ar TEXT NOT NULL DEFAULT 'السويدي برنت هاوس',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#B8860B',
  default_currency TEXT NOT NULL DEFAULT 'USD',
  default_language TEXT NOT NULL DEFAULT 'ar',
  timezone TEXT NOT NULL DEFAULT 'Africa/Cairo',
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_id TEXT,
  invoice_footer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read settings" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin update settings" ON public.system_settings FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin insert settings" ON public.system_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_system_settings_updated_at BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.system_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_profiles_updated_at') THEN
    CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='user update own profile') THEN
    CREATE POLICY "user update own profile" ON public.profiles FOR UPDATE TO authenticated
      USING (id = auth.uid()) WITH CHECK (id = auth.uid());
  END IF;
END $$;

INSERT INTO public.permissions (code, module, action, label_ar, label_en) VALUES
  ('companies.view','companies','view','عرض الشركات','View Companies'),
  ('companies.create','companies','create','إنشاء شركة','Create Company'),
  ('companies.edit','companies','edit','تعديل الشركات','Edit Companies'),
  ('companies.delete','companies','delete','حذف الشركات','Delete Companies'),
  ('companies.export','companies','export','تصدير الشركات','Export Companies'),
  ('contacts.view','contacts','view','عرض جهات الاتصال','View Contacts'),
  ('contacts.create','contacts','create','إنشاء جهة اتصال','Create Contact'),
  ('contacts.edit','contacts','edit','تعديل جهات الاتصال','Edit Contacts'),
  ('contacts.delete','contacts','delete','حذف جهات الاتصال','Delete Contacts'),
  ('leads.view','leads','view','عرض العملاء المحتملين','View Leads'),
  ('leads.create','leads','create','إنشاء عميل محتمل','Create Lead'),
  ('leads.edit','leads','edit','تعديل العملاء المحتملين','Edit Leads'),
  ('leads.delete','leads','delete','حذف العملاء المحتملين','Delete Leads'),
  ('leads.convert','leads','convert','تحويل عميل محتمل','Convert Lead'),
  ('opportunities.view','opportunities','view','عرض الفرص','View Opportunities'),
  ('opportunities.create','opportunities','create','إنشاء فرصة','Create Opportunity'),
  ('opportunities.edit','opportunities','edit','تعديل الفرص','Edit Opportunities'),
  ('opportunities.delete','opportunities','delete','حذف الفرص','Delete Opportunities'),
  ('quotations.view','quotations','view','عرض عروض الأسعار','View Quotations'),
  ('quotations.create','quotations','create','إنشاء عرض سعر','Create Quotation'),
  ('quotations.edit','quotations','edit','تعديل عروض الأسعار','Edit Quotations'),
  ('quotations.delete','quotations','delete','حذف عروض الأسعار','Delete Quotations'),
  ('quotations.approve','quotations','approve','اعتماد عروض الأسعار','Approve Quotations'),
  ('samples.view','samples','view','عرض العينات','View Samples'),
  ('samples.create','samples','create','إنشاء عينة','Create Sample'),
  ('samples.edit','samples','edit','تعديل العينات','Edit Samples'),
  ('samples.delete','samples','delete','حذف العينات','Delete Samples'),
  ('orders.view','orders','view','عرض الطلبيات','View Orders'),
  ('orders.create','orders','create','إنشاء طلبية','Create Order'),
  ('orders.edit','orders','edit','تعديل الطلبيات','Edit Orders'),
  ('orders.delete','orders','delete','حذف الطلبيات','Delete Orders'),
  ('orders.approve','orders','approve','اعتماد الطلبيات','Approve Orders'),
  ('shipments.view','shipments','view','عرض الشحنات','View Shipments'),
  ('shipments.create','shipments','create','إنشاء شحنة','Create Shipment'),
  ('shipments.edit','shipments','edit','تعديل الشحنات','Edit Shipments'),
  ('shipments.delete','shipments','delete','حذف الشحنات','Delete Shipments'),
  ('payments.view','payments','view','عرض المدفوعات','View Payments'),
  ('payments.create','payments','create','تسجيل دفعة','Record Payment'),
  ('payments.edit','payments','edit','تعديل المدفوعات','Edit Payments'),
  ('payments.delete','payments','delete','حذف المدفوعات','Delete Payments'),
  ('export_documents.view','export_documents','view','عرض المستندات','View Export Documents'),
  ('export_documents.create','export_documents','create','إنشاء مستند','Create Export Document'),
  ('export_documents.edit','export_documents','edit','تعديل المستندات','Edit Export Documents'),
  ('export_documents.delete','export_documents','delete','حذف المستندات','Delete Export Documents'),
  ('tasks.view','tasks','view','عرض المهام','View Tasks'),
  ('tasks.create','tasks','create','إنشاء مهمة','Create Task'),
  ('tasks.edit','tasks','edit','تعديل المهام','Edit Tasks'),
  ('tasks.delete','tasks','delete','حذف المهام','Delete Tasks'),
  ('activities.view','activities','view','عرض الأنشطة','View Activities'),
  ('activities.create','activities','create','تسجيل نشاط','Create Activity'),
  ('exhibitions.view','exhibitions','view','عرض المعارض','View Exhibitions'),
  ('exhibitions.manage','exhibitions','manage','إدارة المعارض','Manage Exhibitions'),
  ('reports.view','reports','view','عرض التقارير','View Reports'),
  ('reports.export','reports','export','تصدير التقارير','Export Reports'),
  ('audit_log.view','audit_log','view','عرض سجل التدقيق','View Audit Log'),
  ('users.view','users','view','عرض المستخدمين','View Users'),
  ('users.manage','users','manage','إدارة المستخدمين','Manage Users'),
  ('settings.view','settings','view','عرض الإعدادات','View Settings'),
  ('settings.manage','settings','manage','إدارة الإعدادات','Manage Settings')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_code)
SELECT 'system_owner'::app_role, code FROM public.permissions ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role, permission_code)
SELECT 'export_manager'::app_role, code FROM public.permissions ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_code)
SELECT 'sales_specialist'::app_role, code FROM public.permissions
WHERE code IN (
  'companies.view','companies.create','companies.edit',
  'contacts.view','contacts.create','contacts.edit',
  'leads.view','leads.create','leads.edit','leads.convert',
  'opportunities.view','opportunities.create','opportunities.edit',
  'quotations.view','quotations.create','quotations.edit',
  'samples.view','samples.create','samples.edit',
  'orders.view','tasks.view','tasks.create','tasks.edit',
  'activities.view','activities.create','exhibitions.view','reports.view'
) ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_code)
SELECT 'sales_coordinator'::app_role, code FROM public.permissions
WHERE code IN (
  'companies.view','contacts.view','leads.view','opportunities.view',
  'quotations.view','samples.view','orders.view','tasks.view','tasks.create',
  'tasks.edit','activities.view','activities.create','exhibitions.view','reports.view'
) ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_code)
SELECT 'pricing'::app_role, code FROM public.permissions
WHERE code IN (
  'quotations.view','quotations.create','quotations.edit','quotations.approve',
  'opportunities.view','companies.view','contacts.view','reports.view'
) ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_code)
SELECT 'production'::app_role, code FROM public.permissions
WHERE code IN (
  'orders.view','orders.edit','samples.view','samples.edit','tasks.view','tasks.edit'
) ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_code)
SELECT 'logistics'::app_role, code FROM public.permissions
WHERE code IN (
  'orders.view','shipments.view','shipments.create','shipments.edit',
  'export_documents.view','export_documents.create','export_documents.edit','tasks.view'
) ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_code)
SELECT 'accounting'::app_role, code FROM public.permissions
WHERE code IN (
  'orders.view','payments.view','payments.create','payments.edit',
  'reports.view','reports.export','export_documents.view'
) ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_code)
SELECT 'viewer'::app_role, code FROM public.permissions
WHERE code LIKE '%.view'
ON CONFLICT DO NOTHING;

-- Storage RLS (buckets already created)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='avatars_auth_read') THEN
    CREATE POLICY "avatars_auth_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='avatars_user_write') THEN
    CREATE POLICY "avatars_user_write" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='avatars_user_update') THEN
    CREATE POLICY "avatars_user_update" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id='avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='avatars_user_delete') THEN
    CREATE POLICY "avatars_user_delete" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id='avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='branding_auth_read') THEN
    CREATE POLICY "branding_auth_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='branding');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='branding_admin_write') THEN
    CREATE POLICY "branding_admin_write" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id='branding' AND public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='branding_admin_update') THEN
    CREATE POLICY "branding_admin_update" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id='branding' AND public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='branding_admin_delete') THEN
    CREATE POLICY "branding_admin_delete" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id='branding' AND public.is_admin(auth.uid()));
  END IF;
END $$;
