
-- Shipment tracking events
CREATE TABLE IF NOT EXISTS public.shipment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  event_status TEXT NOT NULL,
  location TEXT,
  description TEXT,
  event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipment_events TO authenticated;
GRANT ALL ON public.shipment_events TO service_role;
ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth manage ship events" ON public.shipment_events;
CREATE POLICY "auth manage ship events" ON public.shipment_events TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_shipment_events_sid ON public.shipment_events(shipment_id, event_at DESC);

-- Auto-update order paid_amount from payments
CREATE OR REPLACE FUNCTION public.tg_recompute_order_paid()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  oid UUID;
  total_paid NUMERIC;
  order_total NUMERIC;
BEGIN
  oid := COALESCE(NEW.order_id, OLD.order_id);
  IF oid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM public.payments WHERE order_id = oid AND status IN ('paid','partial');
  SELECT total INTO order_total FROM public.orders WHERE id = oid;
  UPDATE public.orders SET paid_amount = total_paid WHERE id = oid;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS tg_payments_recompute ON public.payments;
CREATE TRIGGER tg_payments_recompute AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_order_paid();

-- Storage RLS for documents bucket
DROP POLICY IF EXISTS "auth read documents" ON storage.objects;
DROP POLICY IF EXISTS "auth upload documents" ON storage.objects;
DROP POLICY IF EXISTS "auth update documents" ON storage.objects;
DROP POLICY IF EXISTS "admin delete documents" ON storage.objects;

CREATE POLICY "auth read documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');
CREATE POLICY "auth upload documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "auth update documents" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "admin delete documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND public.is_admin(auth.uid()));
