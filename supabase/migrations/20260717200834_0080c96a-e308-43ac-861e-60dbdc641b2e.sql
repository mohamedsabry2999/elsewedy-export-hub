
-- 1) Remove legacy permissive policy on quotation_items that bypassed RBAC
DROP POLICY IF EXISTS "auth manage items" ON public.quotation_items;

-- 2) Fix duplicate order-quotation link (keep both order rows, unlink the cancelled duplicate)
UPDATE public.orders o
SET quotation_id = NULL
WHERE o.order_number = 'O-DEMO-2026-007'
  AND EXISTS (
    SELECT 1 FROM public.orders o2
    WHERE o2.quotation_id = o.quotation_id
      AND o2.id <> o.id
      AND o2.order_number = 'O-DEMO-2026-002'
  );

-- 3) Prevent future duplicate conversions at DB level
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_quotation_id
  ON public.orders(quotation_id) WHERE quotation_id IS NOT NULL;

-- 4) Sync quotation status where converted_order_id was set but status was wrong
UPDATE public.quotations
SET status = 'accepted', accepted_at = COALESCE(accepted_at, now())
WHERE converted_order_id IS NOT NULL AND status IN ('draft','sent');

-- 5) Enhance convert_quotation_to_order to also copy technical spec columns
CREATE OR REPLACE FUNCTION public.convert_quotation_to_order(_quotation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  INSERT INTO public.order_items (
    order_id, product_id, product_name, description,
    quantity, unit, unit_price, line_total, position,
    material, thickness, dimensions, color, finish, print_colors, packaging, lead_time_days, specs_notes
  )
  SELECT
    new_order_id, product_id, product_name, description,
    quantity, unit, unit_price, line_total, position,
    material, thickness, dimensions, color, finish, print_colors, packaging, lead_time_days, specs_notes
  FROM public.quotation_items WHERE quotation_id = _quotation_id ORDER BY position;

  UPDATE public.quotations SET converted_order_id = new_order_id, status = 'accepted', accepted_at = now()
  WHERE id = _quotation_id;

  RETURN new_order_id;
END $function$;
