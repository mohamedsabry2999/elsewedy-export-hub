
-- Enums
CREATE TYPE public.opportunity_stage AS ENUM ('new','qualified','proposal','negotiation','won','lost');
CREATE TYPE public.task_status AS ENUM ('open','in_progress','done','cancelled');
CREATE TYPE public.task_priority AS ENUM ('low','medium','high','urgent');
CREATE TYPE public.activity_type AS ENUM ('call','email','meeting','whatsapp','note','sample','visit');
CREATE TYPE public.quotation_status AS ENUM ('draft','sent','accepted','rejected','expired');

-- Opportunities
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  stage public.opportunity_stage NOT NULL DEFAULT 'new',
  amount NUMERIC(14,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  probability INT DEFAULT 10,
  expected_close_date DATE,
  product_category TEXT,
  description TEXT,
  lost_reason TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read opportunities" ON public.opportunities FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert opportunities" ON public.opportunities FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update opportunities" ON public.opportunities FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin delete opportunities" ON public.opportunities FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER tg_opps_updated BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status public.task_status NOT NULL DEFAULT 'open',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  related_type TEXT,
  related_id UUID,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update tasks" ON public.tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete tasks" ON public.tasks FOR DELETE TO authenticated USING (assigned_to = auth.uid() OR created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE TRIGGER tg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Activities (timeline)
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.activity_type NOT NULL,
  subject TEXT NOT NULL,
  notes TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  related_type TEXT,
  related_id UUID,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read activities" ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update activities" ON public.activities FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "auth delete activities" ON public.activities FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE TRIGGER tg_activities_updated BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Quotations
CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  status public.quotation_status NOT NULL DEFAULT 'draft',
  currency TEXT DEFAULT 'USD',
  subtotal NUMERIC(14,2) DEFAULT 0,
  discount NUMERIC(14,2) DEFAULT 0,
  tax NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2) DEFAULT 0,
  valid_until DATE,
  incoterms TEXT,
  payment_terms TEXT,
  delivery_terms TEXT,
  notes TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read quotations" ON public.quotations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert quotations" ON public.quotations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update quotations" ON public.quotations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin delete quotations" ON public.quotations FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER tg_quot_updated BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Quotation items
CREATE TABLE public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(14,2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'pcs',
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2) DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_items TO authenticated;
GRANT ALL ON public.quotation_items TO service_role;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage items" ON public.quotation_items FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Audit log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read audit" ON public.audit_log FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "auth write audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Indexes
CREATE INDEX idx_opps_stage ON public.opportunities(stage);
CREATE INDEX idx_opps_owner ON public.opportunities(owner_id);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_activities_related ON public.activities(related_type, related_id);
CREATE INDEX idx_quotation_items_qid ON public.quotation_items(quotation_id);
