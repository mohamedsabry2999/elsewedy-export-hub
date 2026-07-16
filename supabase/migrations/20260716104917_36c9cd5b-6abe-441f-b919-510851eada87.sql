
-- ============ Products catalog ============
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  category TEXT,
  description TEXT,
  unit TEXT DEFAULT 'pcs',
  base_price NUMERIC(14,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  hs_code TEXT,
  image_url TEXT,
  min_order_qty NUMERIC(14,2) DEFAULT 1,
  stock_qty NUMERIC(14,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read products" ON public.products;
DROP POLICY IF EXISTS "auth insert products" ON public.products;
DROP POLICY IF EXISTS "auth update products" ON public.products;
DROP POLICY IF EXISTS "admin delete products" ON public.products;
CREATE POLICY "auth read products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update products" ON public.products FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin delete products" ON public.products FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS tg_products_upd ON public.products;
CREATE TRIGGER tg_products_upd BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- ============ Production Stages ============
CREATE TABLE IF NOT EXISTS public.production_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  progress_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | in_progress | done | blocked
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_stages TO authenticated;
GRANT ALL ON public.production_stages TO service_role;
ALTER TABLE public.production_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth manage stages" ON public.production_stages;
CREATE POLICY "auth manage stages" ON public.production_stages TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP TRIGGER IF EXISTS tg_prod_stages_upd ON public.production_stages;
CREATE TRIGGER tg_prod_stages_upd BEFORE UPDATE ON public.production_stages FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX IF NOT EXISTS idx_prod_stages_order ON public.production_stages(order_id);

-- ============ Extend quotations ============
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS revision INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

-- ============ Extend items with product_id ============
ALTER TABLE public.quotation_items
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- ============ Extend orders with production info ============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS production_status TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS production_progress NUMERIC(5,2) NOT NULL DEFAULT 0;

-- ============ Convert quotation to order (RPC) ============
CREATE OR REPLACE FUNCTION public.convert_quotation_to_order(_quotation_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q RECORD;
  new_order_id UUID;
  new_number TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO q FROM public.quotations WHERE id = _quotation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quotation not found'; END IF;
  IF q.converted_order_id IS NOT NULL THEN RETURN q.converted_order_id; END IF;

  new_number := 'PO-' || to_char(now(),'YYYY') || '-' || substr(replace(gen_random_uuid()::text,'-',''), 1, 6);
  INSERT INTO public.orders (
    order_number, company_id, contact_id, opportunity_id, quotation_id,
    status, currency, subtotal, discount, tax, total, incoterms, payment_terms,
    notes, owner_id, created_by
  ) VALUES (
    new_number, q.company_id, q.contact_id, q.opportunity_id, q.id,
    'confirmed', q.currency, q.subtotal, q.discount, q.tax, q.total, q.incoterms, q.payment_terms,
    q.notes, auth.uid(), auth.uid()
  ) RETURNING id INTO new_order_id;

  INSERT INTO public.order_items (order_id, product_id, product_name, description, quantity, unit, unit_price, line_total, position)
  SELECT new_order_id, product_id, product_name, description, quantity, unit, unit_price, line_total, position
  FROM public.quotation_items WHERE quotation_id = _quotation_id ORDER BY position;

  UPDATE public.quotations SET converted_order_id = new_order_id, status = 'accepted', accepted_at = now()
  WHERE id = _quotation_id;

  RETURN new_order_id;
END $$;
GRANT EXECUTE ON FUNCTION public.convert_quotation_to_order(UUID) TO authenticated;

-- ============ Recompute order production progress ============
CREATE OR REPLACE FUNCTION public.tg_recompute_order_progress()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  oid UUID;
  avg_p NUMERIC;
  all_done BOOLEAN;
  any_started BOOLEAN;
BEGIN
  oid := COALESCE(NEW.order_id, OLD.order_id);
  SELECT AVG(progress_pct), BOOL_AND(status = 'done'), BOOL_OR(status IN ('in_progress','done'))
    INTO avg_p, all_done, any_started
  FROM public.production_stages WHERE order_id = oid;
  UPDATE public.orders SET
    production_progress = COALESCE(avg_p, 0),
    production_status = CASE
      WHEN COALESCE(all_done, false) THEN 'completed'
      WHEN COALESCE(any_started, false) THEN 'in_progress'
      ELSE 'not_started'
    END
  WHERE id = oid;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS tg_stages_progress ON public.production_stages;
CREATE TRIGGER tg_stages_progress AFTER INSERT OR UPDATE OR DELETE ON public.production_stages
FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_order_progress();
