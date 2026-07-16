
CREATE TYPE public.sample_status AS ENUM ('requested','preparing','shipped','delivered','feedback_positive','feedback_negative','cancelled');
CREATE TYPE public.order_status AS ENUM ('draft','confirmed','in_production','ready','shipped','delivered','completed','cancelled');
CREATE TYPE public.shipment_status AS ENUM ('pending','booked','in_transit','delivered','delayed','cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending','partial','paid','overdue','refunded');
CREATE TYPE public.doc_type AS ENUM ('commercial_invoice','packing_list','bill_of_lading','certificate_of_origin','coa','insurance','customs','other');

-- Samples
CREATE TABLE public.samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_number TEXT NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INT DEFAULT 1,
  status public.sample_status NOT NULL DEFAULT 'requested',
  shipped_at DATE, delivered_at DATE, feedback_at DATE,
  courier TEXT, tracking_number TEXT, cost NUMERIC(12,2) DEFAULT 0,
  feedback_notes TEXT, notes TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.samples TO authenticated;
GRANT ALL ON public.samples TO service_role;
ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read samples" ON public.samples FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert samples" ON public.samples FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update samples" ON public.samples FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin del samples" ON public.samples FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER tg_samples_upd BEFORE UPDATE ON public.samples FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  status public.order_status NOT NULL DEFAULT 'draft',
  currency TEXT DEFAULT 'USD',
  subtotal NUMERIC(14,2) DEFAULT 0, discount NUMERIC(14,2) DEFAULT 0,
  tax NUMERIC(14,2) DEFAULT 0, total NUMERIC(14,2) DEFAULT 0,
  paid_amount NUMERIC(14,2) DEFAULT 0,
  order_date DATE DEFAULT CURRENT_DATE,
  expected_delivery DATE, delivered_at DATE,
  incoterms TEXT, payment_terms TEXT, notes TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update orders" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin del orders" ON public.orders FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER tg_orders_upd BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL, description TEXT,
  quantity NUMERIC(14,2) NOT NULL DEFAULT 1, unit TEXT DEFAULT 'pcs',
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage order items" ON public.order_items FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Shipments
CREATE TABLE public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_number TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  status public.shipment_status NOT NULL DEFAULT 'pending',
  mode TEXT, carrier TEXT, tracking_number TEXT,
  origin_port TEXT, destination_port TEXT, destination_country TEXT,
  container_number TEXT, weight_kg NUMERIC(14,2), volume_cbm NUMERIC(14,2),
  shipped_at DATE, eta DATE, delivered_at DATE,
  freight_cost NUMERIC(14,2) DEFAULT 0, insurance_cost NUMERIC(14,2) DEFAULT 0,
  notes TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipments TO authenticated;
GRANT ALL ON public.shipments TO service_role;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read ship" ON public.shipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth ins ship" ON public.shipments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth upd ship" ON public.shipments FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin del ship" ON public.shipments FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER tg_ship_upd BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  method TEXT, reference TEXT,
  paid_at DATE, due_date DATE, notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read pay" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth ins pay" ON public.payments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth upd pay" ON public.payments FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin del pay" ON public.payments FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER tg_pay_upd BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Export docs
CREATE TABLE public.export_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number TEXT NOT NULL,
  doc_type public.doc_type NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  issue_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE, file_url TEXT, notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.export_documents TO authenticated;
GRANT ALL ON public.export_documents TO service_role;
ALTER TABLE public.export_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read docs" ON public.export_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth ins docs" ON public.export_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth upd docs" ON public.export_documents FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin del docs" ON public.export_documents FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER tg_docs_upd BEFORE UPDATE ON public.export_documents FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Exhibitions
CREATE TABLE public.exhibitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, country TEXT, city TEXT, venue TEXT,
  start_date DATE, end_date DATE,
  booth_number TEXT, booth_cost NUMERIC(14,2) DEFAULT 0,
  total_cost NUMERIC(14,2) DEFAULT 0,
  leads_collected INT DEFAULT 0,
  status TEXT DEFAULT 'planned',
  website TEXT, notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exhibitions TO authenticated;
GRANT ALL ON public.exhibitions TO service_role;
ALTER TABLE public.exhibitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read exh" ON public.exhibitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth ins exh" ON public.exhibitions FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth upd exh" ON public.exhibitions FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin del exh" ON public.exhibitions FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER tg_exh_upd BEFORE UPDATE ON public.exhibitions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- link leads to exhibition
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS exhibition_id UUID REFERENCES public.exhibitions(id) ON DELETE SET NULL;

CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_shipments_status ON public.shipments(status);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_samples_status ON public.samples(status);
