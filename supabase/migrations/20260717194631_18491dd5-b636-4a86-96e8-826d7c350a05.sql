
-- PART 1: FIX task_comments RLS
DROP POLICY IF EXISTS "task_comments read" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments insert" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments update own" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments delete own" ON public.task_comments;

CREATE POLICY "task_comments read" ON public.task_comments FOR SELECT
  USING (public.has_permission(auth.uid(), 'tasks.view') OR public.is_system_owner(auth.uid()));

CREATE POLICY "task_comments insert" ON public.task_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND (
      public.is_system_owner(auth.uid())
      OR public.has_permission(auth.uid(), 'tasks.edit')
      OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_comments.task_id AND (t.assigned_to = auth.uid() OR t.created_by = auth.uid()))
    )
  );

CREATE POLICY "task_comments update own" ON public.task_comments FOR UPDATE
  USING (author_id = auth.uid() OR public.is_system_owner(auth.uid()))
  WITH CHECK (author_id = auth.uid() OR public.is_system_owner(auth.uid()));

CREATE POLICY "task_comments delete own" ON public.task_comments FOR DELETE
  USING (author_id = auth.uid() OR public.is_system_owner(auth.uid()) OR public.has_permission(auth.uid(), 'tasks.delete'));

-- PART 2: FIX products RLS
DROP POLICY IF EXISTS "admin delete products" ON public.products;
DROP POLICY IF EXISTS "auth insert products" ON public.products;
DROP POLICY IF EXISTS "auth update products" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;

CREATE POLICY "products select" ON public.products FOR SELECT
  USING (public.is_system_owner(auth.uid()) OR public.has_permission(auth.uid(), 'products.view'));
CREATE POLICY "products insert" ON public.products FOR INSERT
  WITH CHECK (public.is_system_owner(auth.uid()) OR public.has_permission(auth.uid(), 'products.create'));
CREATE POLICY "products update" ON public.products FOR UPDATE
  USING (public.is_system_owner(auth.uid()) OR public.has_permission(auth.uid(), 'products.edit'));
CREATE POLICY "products delete" ON public.products FOR DELETE
  USING (public.is_system_owner(auth.uid()) OR public.has_permission(auth.uid(), 'products.delete'));

-- PART 3: Add demo_data.manage permission
INSERT INTO public.permissions(code, module, action, label_ar, label_en, description)
VALUES ('demo_data.manage', 'system', 'manage', 'إدارة البيانات التجريبية', 'Manage Demo Data', 'إنشاء وحذف البيانات التجريبية')
ON CONFLICT (code) DO NOTHING;

-- PART 4: demo_seed_runs
CREATE TABLE IF NOT EXISTS public.demo_seed_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  scenario TEXT NOT NULL DEFAULT 'export_full_cycle',
  scale TEXT NOT NULL DEFAULT 'full',
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  summary JSONB DEFAULT '{}'::jsonb,
  error_message TEXT
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_seed_runs TO authenticated;
GRANT ALL ON public.demo_seed_runs TO service_role;
ALTER TABLE public.demo_seed_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo runs owner only" ON public.demo_seed_runs;
CREATE POLICY "demo runs owner only" ON public.demo_seed_runs
  FOR ALL USING (public.is_system_owner(auth.uid()))
  WITH CHECK (public.is_system_owner(auth.uid()));

-- PART 5: demo_seed_id columns
DO $$
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY['companies','contacts','exhibitions','leads','opportunities','opportunity_stage_history','products','samples','quotations','quotation_items','approvals','orders','order_items','production_stages','shipments','shipment_events','payments','export_documents','tasks','task_comments','activities','notifications'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS demo_seed_id UUID REFERENCES public.demo_seed_runs(id) ON DELETE SET NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_demo_seed ON public.%I(demo_seed_id) WHERE demo_seed_id IS NOT NULL', t, t);
  END LOOP;
END $$;

-- PART 6: save_quotation_with_items
CREATE OR REPLACE FUNCTION public.save_quotation_with_items(
  _quotation_id UUID, _header JSONB, _items JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_qid UUID;
  v_subtotal NUMERIC := 0;
  v_discount NUMERIC := COALESCE((_header->>'discount')::NUMERIC, 0);
  v_tax NUMERIC := COALESCE((_header->>'tax')::NUMERIC, 0);
  v_total NUMERIC := 0;
  v_currency TEXT := COALESCE(_header->>'currency', 'USD');
  v_item JSONB;
  v_line_total NUMERIC;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _quotation_id IS NULL THEN
    IF NOT (public.is_system_owner(v_uid) OR public.has_permission(v_uid, 'quotations.create')) THEN
      RAISE EXCEPTION 'Forbidden'; END IF;
  ELSE
    IF NOT (public.is_system_owner(v_uid) OR public.has_permission(v_uid, 'quotations.edit')) THEN
      RAISE EXCEPTION 'Forbidden'; END IF;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(_items,'[]'::jsonb)) LOOP
    v_line_total := COALESCE((v_item->>'quantity')::NUMERIC,0) * COALESCE((v_item->>'unit_price')::NUMERIC,0)
                    * (1 - COALESCE((v_item->>'discount_pct')::NUMERIC,0)/100.0);
    v_subtotal := v_subtotal + v_line_total;
  END LOOP;
  v_total := v_subtotal - v_discount + v_tax;

  IF _quotation_id IS NULL THEN
    INSERT INTO public.quotations(
      quote_number, company_id, contact_id, opportunity_id, status, currency,
      subtotal, discount, tax, total, valid_until, incoterms, payment_terms,
      delivery_terms, notes, owner_id, created_by
    ) VALUES (
      COALESCE(_header->>'quote_number', 'Q-'||to_char(now(),'YYYYMMDD')||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,6)),
      NULLIF(_header->>'company_id','')::UUID,
      NULLIF(_header->>'contact_id','')::UUID,
      NULLIF(_header->>'opportunity_id','')::UUID,
      COALESCE((_header->>'status')::quotation_status, 'draft'::quotation_status),
      v_currency, v_subtotal, v_discount, v_tax, v_total,
      NULLIF(_header->>'valid_until','')::DATE,
      _header->>'incoterms', _header->>'payment_terms',
      _header->>'delivery_terms', _header->>'notes', v_uid, v_uid
    ) RETURNING id INTO v_qid;
  ELSE
    v_qid := _quotation_id;
    UPDATE public.quotations SET
      company_id = NULLIF(_header->>'company_id','')::UUID,
      contact_id = NULLIF(_header->>'contact_id','')::UUID,
      opportunity_id = NULLIF(_header->>'opportunity_id','')::UUID,
      status = COALESCE((_header->>'status')::quotation_status, status),
      currency = v_currency, subtotal = v_subtotal, discount = v_discount,
      tax = v_tax, total = v_total,
      valid_until = NULLIF(_header->>'valid_until','')::DATE,
      incoterms = _header->>'incoterms',
      payment_terms = _header->>'payment_terms',
      delivery_terms = _header->>'delivery_terms',
      notes = _header->>'notes', updated_at = now()
    WHERE id = v_qid;
  END IF;

  DELETE FROM public.quotation_items WHERE quotation_id = v_qid;
  INSERT INTO public.quotation_items(
    quotation_id, product_id, product_name, description, quantity, unit,
    unit_price, discount_pct, line_total, position, material, thickness,
    dimensions, color, finish, print_colors, packaging, lead_time_days, specs_notes
  )
  SELECT v_qid,
    NULLIF(it->>'product_id','')::UUID,
    it->>'product_name', it->>'description',
    COALESCE((it->>'quantity')::NUMERIC,1),
    COALESCE(it->>'unit','pcs'),
    COALESCE((it->>'unit_price')::NUMERIC,0),
    COALESCE((it->>'discount_pct')::NUMERIC,0),
    COALESCE((it->>'quantity')::NUMERIC,0) * COALESCE((it->>'unit_price')::NUMERIC,0)
      * (1 - COALESCE((it->>'discount_pct')::NUMERIC,0)/100.0),
    COALESCE((it->>'position')::INT, (row_number() OVER ())::INT - 1),
    it->>'material', it->>'thickness', it->>'dimensions', it->>'color',
    it->>'finish', it->>'print_colors', it->>'packaging',
    NULLIF(it->>'lead_time_days','')::INT, it->>'specs_notes'
  FROM jsonb_array_elements(COALESCE(_items,'[]'::jsonb)) AS it;

  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, details)
  VALUES (v_uid, 'quotation_saved', 'quotations', v_qid,
    jsonb_build_object('total', v_total, 'items', jsonb_array_length(COALESCE(_items,'[]'::jsonb))));
  RETURN v_qid;
END $$;

GRANT EXECUTE ON FUNCTION public.save_quotation_with_items(UUID, JSONB, JSONB) TO authenticated;

-- PART 7: reset_demo_data
CREATE OR REPLACE FUNCTION public.reset_demo_data(_run_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_counts JSONB := '{}'::jsonb;
  v_tables TEXT[] := ARRAY['task_comments','notifications','shipment_events','production_stages','export_documents','payments','order_items','orders','approvals','quotation_items','quotations','samples','opportunity_stage_history','activities','tasks','opportunities','leads','contacts','exhibitions','products','companies'];
  t TEXT; v_del BIGINT;
BEGIN
  IF v_uid IS NULL OR NOT public.is_system_owner(v_uid) THEN
    RAISE EXCEPTION 'Forbidden: system_owner only'; END IF;
  IF _run_id IS NULL THEN RAISE EXCEPTION 'run_id required'; END IF;

  FOREACH t IN ARRAY v_tables LOOP
    EXECUTE format('DELETE FROM public.%I WHERE demo_seed_id = $1', t) USING _run_id;
    GET DIAGNOSTICS v_del = ROW_COUNT;
    v_counts := v_counts || jsonb_build_object(t, v_del);
  END LOOP;

  UPDATE public.demo_seed_runs SET status='deleted', deleted_at=now(),
    summary = summary || jsonb_build_object('deleted_counts', v_counts)
  WHERE id = _run_id;

  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, details)
  VALUES (v_uid, 'demo_reset', 'demo_seed_runs', _run_id, v_counts);
  RETURN jsonb_build_object('run_id', _run_id, 'deleted', v_counts);
END $$;

GRANT EXECUTE ON FUNCTION public.reset_demo_data(UUID) TO authenticated;

-- PART 8: seed_demo_data
CREATE OR REPLACE FUNCTION public.seed_demo_data(_scale TEXT DEFAULT 'full', _scenario TEXT DEFAULT 'export_full_cycle')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_run UUID;
  v_counts JSONB := '{}'::jsonb;
  v_ids JSONB;
  gp_company UUID; gp_contact UUID; gp_lead UUID; gp_opp UUID;
  gp_sample UUID; gp_quote UUID; gp_order UUID; gp_shipment UUID; gp_approval UUID;
  v_company UUID; v_contact UUID; v_lead UUID; v_opp UUID;
  v_prod1 UUID; v_prod2 UUID; v_prod3 UUID; v_prod4 UUID;
  v_prod5 UUID; v_prod6 UUID; v_prod7 UUID; v_prod8 UUID;
  v_quote UUID; v_order UUID; v_task UUID;
  companies_arr TEXT[][] := ARRAY[
    ARRAY['Gulf Harvest Foods Demo','جلف هارفست للأغذية التجريبية','Saudi Arabia','Riyadh','Food Packaging','customer','SAR'],
    ARRAY['Riyadh Premium Packaging Demo','الرياض للتغليف الفاخر التجريبية','Saudi Arabia','Riyadh','Packaging','prospect','SAR'],
    ARRAY['Dubai Beauty Labs Demo','دبي للتجميل التجريبية','UAE','Dubai','Cosmetics','customer','AED'],
    ARRAY['Amman Pharma Solutions Demo','عمان للأدوية التجريبية','Jordan','Amman','Pharma','prospect','USD'],
    ARRAY['Kuwait Dates Trading Demo','الكويت لتجارة التمور التجريبية','Kuwait','Kuwait City','Food','customer','USD'],
    ARRAY['Libya Food Industries Demo','ليبيا للصناعات الغذائية التجريبية','Libya','Tripoli','Food','prospect','USD'],
    ARRAY['Cairo FMCG Export Demo','القاهرة لتصدير FMCG التجريبية','Egypt','Cairo','FMCG','customer','EGP'],
    ARRAY['Jeddah Chocolate House Demo','جدة للشوكولاتة التجريبية','Saudi Arabia','Jeddah','Chocolate','customer','SAR'],
    ARRAY['Abu Dhabi Cosmetics Demo','أبوظبي للتجميل التجريبية','UAE','Abu Dhabi','Cosmetics','prospect','AED'],
    ARRAY['Jordan Coffee Roasters Demo','الأردن لتحميص القهوة التجريبية','Jordan','Amman','Coffee','customer','USD'],
    ARRAY['Saudi Medical Supplies Demo','السعودية للمستلزمات الطبية التجريبية','Saudi Arabia','Dammam','Pharma','prospect','SAR'],
    ARRAY['Emirates Retail Group Demo','الإمارات لتجارة التجزئة التجريبية','UAE','Sharjah','Retail','customer','AED'],
    ARRAY['Alex Marine Foods Demo','الإسكندرية للأغذية البحرية التجريبية','Egypt','Alexandria','Food','prospect','EGP'],
    ARRAY['Doha Bakery Supplies Demo','الدوحة لمستلزمات المخابز التجريبية','Kuwait','Kuwait City','Food','prospect','USD'],
    ARRAY['Benghazi Trading Demo','بنغازي التجارية التجريبية','Libya','Benghazi','FMCG','prospect','USD']
  ];
  first_names TEXT[] := ARRAY['Ahmed','Mohamed','Ali','Khaled','Omar','Youssef','Hassan','Fatima','Sara','Layla','Nour','Amira'];
  last_names TEXT[] := ARRAY['Demo Buyer','Demo Manager','Demo Director','Demo Officer','Demo Executive'];
  titles TEXT[] := ARRAY['Procurement Manager','Purchasing Director','Supply Chain Manager','CEO','Commercial Manager','Operations Head'];
  i INT;
  v_stage opportunity_stage;
  v_stages opportunity_stage[] := ARRAY['new','contacted','qualified','needs_analysis','sample_requested','sample_sent','sample_approved','rfq_received','proposal','proposal_sent','negotiation','contract_review','verbal_agreement','po_received','deposit_pending','deposit_received','production','ready_to_ship','shipped','delivered','on_hold','won','lost']::opportunity_stage[];
BEGIN
  IF v_uid IS NULL OR NOT public.is_system_owner(v_uid) THEN
    RAISE EXCEPTION 'Forbidden: system_owner only'; END IF;

  INSERT INTO public.demo_seed_runs(name, scenario, scale, status, created_by)
  VALUES ('DEMO Golden Export Cycle '||to_char(now(),'YYYY-MM-DD HH24:MI'), _scenario, _scale, 'active', v_uid)
  RETURNING id INTO v_run;

  -- COMPANIES
  FOR i IN 1..array_length(companies_arr,1) LOOP
    INSERT INTO public.companies(name_en, name_ar, country, city, industry, status, currency, priority, source, website, notes, owner_id, created_by, demo_seed_id)
    VALUES (companies_arr[i][1], companies_arr[i][2], companies_arr[i][3], companies_arr[i][4], companies_arr[i][5],
      (companies_arr[i][6])::company_status, companies_arr[i][7],
      (ARRAY['low','medium','high','urgent'])[1+((i-1)%4)],
      (ARRAY['Website','LinkedIn','Exhibition','Referral','Direct Outreach'])[1+((i-1)%5)],
      'https://example.com/co'||i, 'شركة تجريبية للاختبار', v_uid, v_uid, v_run)
    RETURNING id INTO v_company;
    IF i = 1 THEN gp_company := v_company; END IF;
  END LOOP;

  -- CONTACTS
  FOR v_company IN SELECT id FROM public.companies WHERE demo_seed_id = v_run LOOP
    FOR i IN 1..2 LOOP
      INSERT INTO public.contacts(company_id, full_name, job_title, email, phone, whatsapp, is_decision_maker, preferred_channel, notes, created_by, demo_seed_id)
      VALUES (v_company,
        first_names[1+(floor(random()*array_length(first_names,1)))::int]||' '||last_names[1+(floor(random()*array_length(last_names,1)))::int],
        titles[1+(floor(random()*array_length(titles,1)))::int],
        'contact'||substr(v_company::text,1,4)||i||'@company.example',
        '+9665'||lpad((floor(random()*99999999))::text,8,'0'),
        '+9665'||lpad((floor(random()*99999999))::text,8,'0'),
        i = 1, (ARRAY['email','whatsapp','phone'])[1+((i-1)%3)],
        'جهة اتصال تجريبية', v_uid, v_run)
      RETURNING id INTO v_contact;
      IF gp_contact IS NULL AND v_company = gp_company THEN gp_contact := v_contact; END IF;
    END LOOP;
  END LOOP;

  UPDATE public.contacts SET full_name='Ahmed Demo Buyer', job_title='Procurement Manager',
    email='ahmed@gulfharvest.example' WHERE id = gp_contact;

  -- EXHIBITIONS
  FOR i IN 1..5 LOOP
    INSERT INTO public.exhibitions(name, country, city, venue, start_date, end_date, booth_number, booth_cost, status, notes, created_by, demo_seed_id)
    VALUES ('DEMO Expo '||i||' 2026',
      (ARRAY['UAE','Saudi Arabia','Egypt','Jordan','Kuwait'])[i],
      (ARRAY['Dubai','Riyadh','Cairo','Amman','Kuwait City'])[i],
      'Hall '||i, CURRENT_DATE + (i*30), CURRENT_DATE + (i*30+3),
      'B-'||(100+i), 5000+i*1000,
      (ARRAY['planned','confirmed','completed','planned','completed'])[i],
      'معرض تجريبي', v_uid, v_run);
  END LOOP;

  -- PRODUCTS
  INSERT INTO public.products(sku, name_ar, name_en, category, unit, base_price, currency, hs_code, min_order_qty, notes, created_by, demo_seed_id, is_active)
  VALUES ('DEMO-PRD-001','كرتون مطوي للمنتجات','Folding Carton Packaging','Packaging','pcs',0.35,'USD','4819.20',5000,'كرتون مطوي عالي الجودة', v_uid, v_run, true) RETURNING id INTO v_prod1;
  INSERT INTO public.products(sku, name_ar, name_en, category, unit, base_price, currency, hs_code, min_order_qty, notes, created_by, demo_seed_id, is_active)
  VALUES ('DEMO-PRD-002','علب أدوية','Pharmaceutical Carton','Packaging','pcs',0.45,'USD','4819.20',10000,'', v_uid, v_run, true) RETURNING id INTO v_prod2;
  INSERT INTO public.products(sku, name_ar, name_en, category, unit, base_price, currency, hs_code, min_order_qty, notes, created_by, demo_seed_id, is_active)
  VALUES ('DEMO-PRD-003','علب مستحضرات تجميل','Cosmetics Packaging','Packaging','pcs',0.60,'USD','4819.20',3000,'', v_uid, v_run, true) RETURNING id INTO v_prod3;
  INSERT INTO public.products(sku, name_ar, name_en, category, unit, base_price, currency, hs_code, min_order_qty, notes, created_by, demo_seed_id, is_active)
  VALUES ('DEMO-PRD-004','سليف تغليف أغذية','Food Packaging Sleeve','Packaging','pcs',0.25,'USD','4819.20',5000,'', v_uid, v_run, true) RETURNING id INTO v_prod4;
  INSERT INTO public.products(sku, name_ar, name_en, category, unit, base_price, currency, hs_code, min_order_qty, notes, created_by, demo_seed_id, is_active)
  VALUES ('DEMO-PRD-005','استيكرات وليبل منتجات','Premium Product Labels','Labels','pcs',0.12,'USD','4821.10',10000,'', v_uid, v_run, true) RETURNING id INTO v_prod5;
  INSERT INTO public.products(sku, name_ar, name_en, category, unit, base_price, currency, hs_code, min_order_qty, notes, created_by, demo_seed_id, is_active)
  VALUES ('DEMO-PRD-006','عينة تغليف ديجيتال','Digital Packaging Sample','Sample','pcs',2.00,'USD','4819.20',100,'', v_uid, v_run, true) RETURNING id INTO v_prod6;
  INSERT INTO public.products(sku, name_ar, name_en, category, unit, base_price, currency, hs_code, min_order_qty, notes, created_by, demo_seed_id, is_active)
  VALUES ('DEMO-PRD-007','كتالوج تسويقي','Marketing Catalog','Print','pcs',1.50,'USD','4901.99',1000,'', v_uid, v_run, true) RETURNING id INTO v_prod7;
  INSERT INTO public.products(sku, name_ar, name_en, category, unit, base_price, currency, hs_code, min_order_qty, notes, created_by, demo_seed_id, is_active)
  VALUES ('DEMO-PRD-008','تاجات ورقية','Paper Tags','Labels','pcs',0.08,'USD','4821.10',5000,'', v_uid, v_run, true) RETURNING id INTO v_prod8;

  -- LEADS
  FOR i IN 1..30 LOOP
    SELECT id INTO v_company FROM public.companies WHERE demo_seed_id = v_run ORDER BY id OFFSET (i % 15) LIMIT 1;
    SELECT id INTO v_contact FROM public.contacts WHERE company_id = v_company AND demo_seed_id = v_run LIMIT 1;
    INSERT INTO public.leads(company_id, contact_id, company_name, contact_name, country, city, industry, source, product_requested, expected_quantity, expected_value, currency, temperature, priority, probability, status, next_step, next_followup_at, notes, owner_id, created_by, demo_seed_id)
    VALUES (v_company, v_contact,
      (SELECT name_en FROM public.companies WHERE id=v_company),
      (SELECT full_name FROM public.contacts WHERE id=v_contact),
      (SELECT country FROM public.companies WHERE id=v_company),
      (SELECT city FROM public.companies WHERE id=v_company),
      (SELECT industry FROM public.companies WHERE id=v_company),
      (ARRAY['Website','LinkedIn','Meta Ads','Google Ads','Exhibition','Referral','Direct Outreach','Existing Customer','Email Campaign','WhatsApp'])[1+((i-1)%10)],
      (ARRAY['Folding Cartons','Product Labels','Pharma Boxes','Cosmetics Packaging','Food Sleeves','Marketing Catalog'])[1+((i-1)%6)],
      (5000 + i*2500)::text, (5000 + i*1500)::numeric, 'USD',
      (ARRAY['hot','warm','cold','warm','hot','cold','warm'])[1+((i-1)%7)]::lead_temperature,
      (ARRAY['low','medium','high','urgent'])[1+((i-1)%4)],
      10 + (i*3) % 90,
      (ARRAY['new','contacted','qualified','nurturing','proposal','won','lost'])[1+((i-1)%7)]::lead_status,
      'متابعة', now() + (i || ' days')::interval,
      'ليد تجريبي رقم '||i, v_uid, v_uid, v_run)
    RETURNING id INTO v_lead;
    IF i = 1 THEN gp_lead := v_lead; END IF;
  END LOOP;

  UPDATE public.leads SET
    company_name='Gulf Harvest Foods Demo', contact_name='Ahmed Demo Buyer',
    product_requested='Premium Folding Cartons for Dates',
    expected_quantity='100000 boxes', expected_value=45000, currency='USD',
    temperature='hot', status='qualified', probability=80
  WHERE id = gp_lead;

  -- OPPORTUNITIES
  i := 0;
  FOREACH v_stage IN ARRAY v_stages LOOP
    i := i + 1;
    SELECT id INTO v_company FROM public.companies WHERE demo_seed_id = v_run ORDER BY id OFFSET (i % 15) LIMIT 1;
    SELECT id INTO v_contact FROM public.contacts WHERE company_id = v_company AND demo_seed_id = v_run LIMIT 1;
    INSERT INTO public.opportunities(name, company_id, contact_id, stage, amount, currency, probability, expected_close_date, product_category, description, lost_reason, owner_id, created_by, demo_seed_id)
    VALUES ('DEMO Opp #'||i||' — '||v_stage::text, v_company, v_contact, v_stage,
      10000 + i*2500, 'USD',
      CASE WHEN v_stage='won' THEN 100 WHEN v_stage='lost' THEN 0 ELSE 10 + i*4 END,
      CURRENT_DATE + (30 + i*5),
      (ARRAY['Packaging','Labels','Print','Cartons'])[1+((i-1)%4)],
      'فرصة تجريبية في مرحلة '||v_stage::text,
      CASE WHEN v_stage='lost' THEN 'السعر منخفض من منافس' ELSE NULL END,
      v_uid, v_uid, v_run)
    RETURNING id INTO v_opp;
    IF i = 1 THEN gp_opp := v_opp; END IF;
    INSERT INTO public.opportunity_stage_history(opportunity_id, from_stage, to_stage, changed_by, demo_seed_id)
    VALUES (v_opp, NULL, v_stage, v_uid, v_run);
  END LOOP;

  UPDATE public.opportunities SET
    name='Gulf Harvest Dates Packaging 2026 Demo',
    company_id=gp_company, contact_id=gp_contact, lead_id=gp_lead,
    stage='production', amount=45000, probability=90
  WHERE id = gp_opp;

  INSERT INTO public.opportunity_stage_history(opportunity_id, from_stage, to_stage, changed_by, demo_seed_id)
  SELECT gp_opp, s1::opportunity_stage, s2::opportunity_stage, v_uid, v_run
  FROM (VALUES ('new','contacted'),('contacted','qualified'),('qualified','needs_analysis'),
    ('needs_analysis','sample_requested'),('sample_requested','sample_sent'),
    ('sample_sent','sample_approved'),('sample_approved','rfq_received'),
    ('rfq_received','proposal'),('proposal','proposal_sent'),('proposal_sent','negotiation'),
    ('negotiation','po_received'),('po_received','deposit_received'),('deposit_received','production')) AS x(s1,s2);

  -- SAMPLES
  FOR i IN 1..10 LOOP
    SELECT id INTO v_company FROM public.companies WHERE demo_seed_id = v_run ORDER BY id OFFSET (i % 15) LIMIT 1;
    SELECT id INTO v_contact FROM public.contacts WHERE company_id = v_company AND demo_seed_id = v_run LIMIT 1;
    INSERT INTO public.samples(sample_number, company_id, contact_id, product_name, quantity, status, shipped_at, delivered_at, courier, tracking_number, cost, feedback_notes, owner_id, created_by, demo_seed_id)
    VALUES ('SMP-DEMO-'||lpad(i::text,3,'0'), v_company, v_contact,
      'Premium Sample Kit '||i, 5 + i,
      (ARRAY['requested','preparing','shipped','delivered','feedback_positive','feedback_negative','delivered','feedback_positive','preparing','requested'])[i]::sample_status,
      CASE WHEN i > 2 THEN CURRENT_DATE - (i*3) ELSE NULL END,
      CASE WHEN i > 3 THEN CURRENT_DATE - (i*2) ELSE NULL END,
      'Demo Courier', 'DEMO-TRACK-SMP-'||i, 50 + i*10,
      CASE WHEN i=5 OR i=8 THEN 'ملاحظات إيجابية' WHEN i=6 THEN 'يحتاج إعادة عمل' ELSE NULL END,
      v_uid, v_uid, v_run)
    RETURNING id INTO gp_sample;
  END LOOP;

  -- QUOTATIONS: Golden Path first
  INSERT INTO public.quotations(quote_number, company_id, contact_id, opportunity_id, status, currency, subtotal, discount, tax, total, valid_until, incoterms, payment_terms, delivery_terms, notes, owner_id, created_by, demo_seed_id, accepted_at)
  VALUES ('Q-DEMO-2026-001', gp_company, gp_contact, gp_opp, 'accepted', 'USD',
    36750, 0, 0, 36750, CURRENT_DATE + 30, 'FOB',
    '50% Advance — 50% Before Shipping',
    'Production within 15 working days after approval',
    'عرض السعر الرئيسي للسيناريو التجريبي المتكامل', v_uid, v_uid, v_run, now())
  RETURNING id INTO gp_quote;

  INSERT INTO public.quotation_items(quotation_id, product_id, product_name, quantity, unit, unit_price, discount_pct, line_total, position, material, thickness, dimensions, color, finish, print_colors, packaging, lead_time_days, demo_seed_id) VALUES
    (gp_quote, v_prod1, 'Premium Dates Folding Carton', 60000, 'pcs', 0.35, 0, 21000, 0, '350 gsm folding box board', '350gsm', '180 × 120 × 60 mm', '4C', 'Matte Lamination + Gold Foil + Spot UV', 'CMYK', 'Export Cartons', 15, v_run),
    (gp_quote, v_prod4, 'Chocolate Gift Sleeve', 25000, 'pcs', 0.30, 0, 7500, 1, '300 gsm coated paper', '300gsm', '250 × 100 mm', '4C', 'Matte Lamination', 'CMYK', 'Export Cartons', 12, v_run),
    (gp_quote, v_prod5, 'Premium Product Labels', 15000, 'pcs', 0.55, 0, 8250, 2, 'Self Adhesive', NULL, NULL, '4C', 'Gloss Lamination', 'Digital', 'Rolls', 7, v_run);

  FOR i IN 1..11 LOOP
    SELECT id INTO v_company FROM public.companies WHERE demo_seed_id = v_run ORDER BY id OFFSET ((i+1) % 15) LIMIT 1;
    SELECT id INTO v_contact FROM public.contacts WHERE company_id = v_company AND demo_seed_id = v_run LIMIT 1;
    INSERT INTO public.quotations(quote_number, company_id, contact_id, status, currency, subtotal, discount, tax, total, valid_until, incoterms, payment_terms, notes, owner_id, created_by, demo_seed_id, sent_at, accepted_at)
    VALUES ('Q-DEMO-2026-'||lpad((i+1)::text,3,'0'), v_company, v_contact,
      (ARRAY['draft','draft','draft','sent','sent','sent','accepted','accepted','rejected','expired','accepted'])[i]::quotation_status,
      (ARRAY['USD','EUR','SAR','AED','EGP','USD','USD','USD','USD','USD','USD'])[i],
      1500, 0, 0, 1500,
      CASE WHEN i=10 THEN CURRENT_DATE - 10 ELSE CURRENT_DATE + 30 END,
      (ARRAY['FOB','CIF','EXW','FOB','DDP'])[1+((i-1)%5)], '50/50', 'عرض سعر تجريبي', v_uid, v_uid, v_run,
      CASE WHEN i > 3 THEN now() ELSE NULL END,
      CASE WHEN i IN (7,8,11) THEN now() ELSE NULL END)
    RETURNING id INTO v_quote;
    INSERT INTO public.quotation_items(quotation_id, product_name, quantity, unit, unit_price, line_total, position, demo_seed_id)
    VALUES (v_quote, 'Demo Item A', 1000, 'pcs', 0.5, 500, 0, v_run),
           (v_quote, 'Demo Item B', 500, 'pcs', 2.0, 1000, 1, v_run);
  END LOOP;

  -- APPROVALS
  INSERT INTO public.approvals(entity_type, entity_id, requested_by, approver_id, status, reason, decision_note, decided_at, demo_seed_id)
  VALUES ('quotation', gp_quote, v_uid, v_uid, 'approved', 'مراجعة العرض الرئيسي', 'Approved for demo testing', now(), v_run)
  RETURNING id INTO gp_approval;

  FOR i IN 1..6 LOOP
    INSERT INTO public.approvals(entity_type, entity_id, requested_by, approver_id, status, reason, demo_seed_id)
    SELECT 'quotation', id, v_uid, v_uid,
      (ARRAY['pending','pending','approved','rejected','pending','approved'])[i]::approval_status,
      'طلب موافقة تجريبي #'||i, v_run
    FROM public.quotations WHERE demo_seed_id = v_run AND id != gp_quote ORDER BY created_at OFFSET (i-1) LIMIT 1;
  END LOOP;

  -- ORDERS
  INSERT INTO public.orders(order_number, company_id, contact_id, opportunity_id, quotation_id, status, currency, subtotal, discount, tax, total, paid_amount, order_date, expected_delivery, incoterms, payment_terms, notes, owner_id, created_by, demo_seed_id)
  VALUES ('O-DEMO-2026-001', gp_company, gp_contact, gp_opp, gp_quote,
    'in_production', 'USD', 36750, 0, 0, 36750, 18375,
    CURRENT_DATE - 20, CURRENT_DATE + 15, 'FOB',
    '50% Advance — 50% Before Shipping',
    'الطلبية الرئيسية للسيناريو التجريبي', v_uid, v_uid, v_run)
  RETURNING id INTO gp_order;

  INSERT INTO public.order_items(order_id, product_id, product_name, quantity, unit, unit_price, line_total, position, material, dimensions, finish, lead_time_days, demo_seed_id)
  SELECT gp_order, product_id, product_name, quantity, unit, unit_price, line_total, position, material, dimensions, finish, lead_time_days, v_run
  FROM public.quotation_items WHERE quotation_id = gp_quote;

  UPDATE public.quotations SET converted_order_id = gp_order WHERE id = gp_quote;

  FOR i IN 1..6 LOOP
    SELECT id INTO v_quote FROM public.quotations WHERE demo_seed_id = v_run AND status='accepted' AND converted_order_id IS NULL LIMIT 1;
    IF v_quote IS NULL THEN
      SELECT id INTO v_quote FROM public.quotations WHERE demo_seed_id = v_run AND id != gp_quote ORDER BY created_at OFFSET i LIMIT 1;
    END IF;
    IF v_quote IS NULL THEN EXIT; END IF;
    INSERT INTO public.orders(order_number, company_id, contact_id, quotation_id, status, currency, subtotal, discount, tax, total, paid_amount, order_date, expected_delivery, incoterms, payment_terms, owner_id, created_by, demo_seed_id)
    SELECT 'O-DEMO-2026-'||lpad((i+1)::text,3,'0'), company_id, contact_id, id,
      (ARRAY['confirmed','in_production','ready','shipped','delivered','cancelled'])[i]::order_status,
      currency, total, 0, 0, total,
      CASE WHEN i IN (4,5) THEN total ELSE total/2 END,
      CURRENT_DATE - (i*7), CURRENT_DATE + (i*3),
      'FOB','50/50', v_uid, v_uid, v_run
    FROM public.quotations WHERE id = v_quote
    RETURNING id INTO v_order;

    INSERT INTO public.order_items(order_id, product_name, quantity, unit, unit_price, line_total, position, demo_seed_id)
    SELECT v_order, product_name, quantity, unit, unit_price, line_total, position, v_run
    FROM public.quotation_items WHERE quotation_id = v_quote;

    UPDATE public.quotations SET converted_order_id = v_order WHERE id = v_quote AND converted_order_id IS NULL;
  END LOOP;

  -- PRODUCTION STAGES
  INSERT INTO public.production_stages(order_id, stage_name, position, progress_pct, status, started_at, completed_at, created_by, demo_seed_id)
  VALUES
    (gp_order, 'Prepress Review', 0, 100, 'done', now() - interval '18 days', now() - interval '17 days', v_uid, v_run),
    (gp_order, 'Material Preparation', 1, 100, 'done', now() - interval '17 days', now() - interval '15 days', v_uid, v_run),
    (gp_order, 'Offset Printing', 2, 100, 'done', now() - interval '15 days', now() - interval '10 days', v_uid, v_run),
    (gp_order, 'Lamination', 3, 60, 'in_progress', now() - interval '8 days', NULL, v_uid, v_run),
    (gp_order, 'Foil and Spot UV', 4, 0, 'pending', NULL, NULL, v_uid, v_run),
    (gp_order, 'Die Cutting', 5, 0, 'pending', NULL, NULL, v_uid, v_run),
    (gp_order, 'Gluing', 6, 0, 'pending', NULL, NULL, v_uid, v_run),
    (gp_order, 'Packing and QC', 7, 0, 'pending', NULL, NULL, v_uid, v_run);

  FOR v_order IN SELECT id FROM public.orders WHERE demo_seed_id = v_run AND id != gp_order LOOP
    INSERT INTO public.production_stages(order_id, stage_name, position, progress_pct, status, created_by, demo_seed_id)
    VALUES (v_order, 'Prepress', 0, 100, 'done', v_uid, v_run),
      (v_order, 'Printing', 1, 50, 'in_progress', v_uid, v_run),
      (v_order, 'Finishing', 2, 0, 'pending', v_uid, v_run);
  END LOOP;

  -- SHIPMENTS
  INSERT INTO public.shipments(shipment_number, order_id, company_id, status, mode, carrier, tracking_number, origin_port, destination_port, destination_country, weight_kg, volume_cbm, freight_cost, insurance_cost, shipped_at, eta, notes, owner_id, created_by, demo_seed_id)
  VALUES ('SHP-DEMO-2026-001', gp_order, gp_company, 'in_transit', 'sea', 'Demo Shipping Line',
    'DEMO-TRACK-001', 'Port Said', 'Jeddah Islamic Port', 'Saudi Arabia',
    2500, 12, 1500, 200, CURRENT_DATE - 3, CURRENT_DATE + 10,
    'شحنة السيناريو الرئيسي', v_uid, v_uid, v_run)
  RETURNING id INTO gp_shipment;

  INSERT INTO public.shipment_events(shipment_id, event_status, location, description, event_at, created_by, demo_seed_id) VALUES
    (gp_shipment, 'Booking Confirmed', 'Port Said', 'تم تأكيد الحجز', now() - interval '5 days', v_uid, v_run),
    (gp_shipment, 'Cargo Received', 'Port Said Warehouse', 'تم استلام البضاعة', now() - interval '4 days', v_uid, v_run),
    (gp_shipment, 'Customs Documents Prepared', 'Port Said', 'تجهيز مستندات الجمارك', now() - interval '3 days 12 hours', v_uid, v_run),
    (gp_shipment, 'Vessel Departed', 'Port Said', 'غادرت السفينة', now() - interval '3 days', v_uid, v_run),
    (gp_shipment, 'In Transit', 'Red Sea', 'في الطريق إلى جدة', now() - interval '1 day', v_uid, v_run);

  i := 0;
  FOR v_order IN SELECT id FROM public.orders WHERE demo_seed_id = v_run AND id != gp_order LIMIT 5 LOOP
    i := i + 1;
    INSERT INTO public.shipments(shipment_number, order_id, company_id, status, mode, carrier, tracking_number, origin_port, destination_port, destination_country, weight_kg, freight_cost, shipped_at, eta, owner_id, created_by, demo_seed_id)
    SELECT 'SHP-DEMO-2026-'||lpad((i+1)::text,3,'0'), o.id, o.company_id,
      (ARRAY['pending','booked','in_transit','delayed','delivered'])[i]::shipment_status,
      (ARRAY['sea','air','road','sea','sea'])[i], 'Demo Carrier',
      'DEMO-TRK-'||i, 'Port Said',
      (ARRAY['Jebel Ali','Aqaba','Kuwait Port','Tripoli','Alexandria'])[i],
      (ARRAY['UAE','Jordan','Kuwait','Libya','Egypt'])[i],
      1000 + i*300, 800 + i*100,
      CASE WHEN i > 1 THEN CURRENT_DATE - (i*5) ELSE NULL END,
      CASE WHEN i=4 THEN CURRENT_DATE - 2 ELSE CURRENT_DATE + i*3 END,
      v_uid, v_uid, v_run
    FROM public.orders o WHERE o.id = v_order;
  END LOOP;

  -- PAYMENTS
  INSERT INTO public.payments(payment_number, order_id, company_id, status, amount, currency, method, reference, paid_at, due_date, notes, created_by, demo_seed_id) VALUES
    ('PAY-DEMO-001', gp_order, gp_company, 'paid', 18375, 'USD', 'bank_transfer', 'REF-ADV-001', CURRENT_DATE - 18, CURRENT_DATE - 18, 'دفعة مقدمة 50%', v_uid, v_run),
    ('PAY-DEMO-002', gp_order, gp_company, 'pending', 18375, 'USD', 'bank_transfer', NULL, NULL, CURRENT_DATE + 20, 'الدفعة النهائية 50%', v_uid, v_run);

  i := 2;
  FOR v_order IN SELECT id FROM public.orders WHERE demo_seed_id = v_run AND id != gp_order LOOP
    i := i + 1;
    INSERT INTO public.payments(payment_number, order_id, company_id, status, amount, currency, method, paid_at, due_date, created_by, demo_seed_id)
    SELECT 'PAY-DEMO-'||lpad(i::text,3,'0'), o.id, o.company_id,
      (ARRAY['paid','pending','partial','overdue','refunded','paid','pending','paid','overdue','paid'])[1+((i-3)%10)]::payment_status,
      o.total, o.currency,
      (ARRAY['bank_transfer','credit_card','cash','lc','bank_transfer'])[1+((i-3)%5)],
      CASE WHEN (i%3)=0 THEN CURRENT_DATE - i ELSE NULL END,
      CURRENT_DATE + (i-5), v_uid, v_run
    FROM public.orders o WHERE o.id = v_order;
    IF i >= 12 THEN EXIT; END IF;
  END LOOP;

  -- EXPORT DOCUMENTS
  FOR i IN 1..3 LOOP
    INSERT INTO public.export_documents(doc_number, doc_type, order_id, shipment_id, company_id, issue_date, notes, created_by, demo_seed_id) VALUES
      ('CI-DEMO-'||lpad(i::text,3,'0'), 'commercial_invoice', gp_order, gp_shipment, gp_company, CURRENT_DATE - 5, 'مستند تجريبي', v_uid, v_run),
      ('PL-DEMO-'||lpad(i::text,3,'0'), 'packing_list', gp_order, gp_shipment, gp_company, CURRENT_DATE - 5, 'مستند تجريبي', v_uid, v_run),
      ('CO-DEMO-'||lpad(i::text,3,'0'), 'certificate_of_origin', gp_order, gp_shipment, gp_company, CURRENT_DATE - 4, 'مستند تجريبي', v_uid, v_run),
      ('BL-DEMO-'||lpad(i::text,3,'0'), 'bill_of_lading', gp_order, gp_shipment, gp_company, CURRENT_DATE - 3, 'مستند تجريبي', v_uid, v_run),
      ('INS-DEMO-'||lpad(i::text,3,'0'), 'insurance', gp_order, gp_shipment, gp_company, CURRENT_DATE - 3, 'مستند تجريبي', v_uid, v_run),
      ('CUS-DEMO-'||lpad(i::text,3,'0'), 'customs', gp_order, gp_shipment, gp_company, CURRENT_DATE - 2, 'مستند تجريبي', v_uid, v_run);
  END LOOP;

  -- TASKS
  FOR i IN 1..30 LOOP
    INSERT INTO public.tasks(title, description, status, priority, due_date, assigned_to, related_type, related_id, created_by, demo_seed_id)
    VALUES (
      (ARRAY['متابعة اعتماد العينة','مراجعة عرض السعر','تحصيل الدفعة المقدمة','متابعة الإنتاج','تجهيز مستندات الشحن','تأكيد الحجز','متابعة وصول الشحنة','تحصيل الدفعة النهائية','اتصال متابعة','إرسال كتالوج'])[1+((i-1)%10)]||' #'||i,
      'مهمة تجريبية مرتبطة بالسيناريو',
      (ARRAY['open','in_progress','done','open','in_progress','done','open','open','in_progress','open'])[1+((i-1)%10)]::task_status,
      (ARRAY['low','medium','high','urgent'])[1+((i-1)%4)]::task_priority,
      now() + ((i-15) || ' days')::interval,
      v_uid,
      CASE WHEN i%3=0 THEN 'order' WHEN i%3=1 THEN 'quotation' ELSE 'company' END,
      CASE WHEN i%3=0 THEN gp_order WHEN i%3=1 THEN gp_quote ELSE gp_company END,
      v_uid, v_run);
  END LOOP;

  -- TASK COMMENTS
  FOR v_task IN SELECT id FROM public.tasks WHERE demo_seed_id = v_run LIMIT 15 LOOP
    INSERT INTO public.task_comments(task_id, author_id, body, demo_seed_id)
    VALUES (v_task, v_uid, 'تعليق تجريبي على المهمة — تم البدء بالمتابعة.', v_run);
  END LOOP;

  -- ACTIVITIES
  FOR i IN 1..40 LOOP
    SELECT id INTO v_company FROM public.companies WHERE demo_seed_id = v_run ORDER BY id OFFSET (i % 15) LIMIT 1;
    SELECT id INTO v_contact FROM public.contacts WHERE company_id = v_company AND demo_seed_id = v_run LIMIT 1;
    INSERT INTO public.activities(type, subject, notes, occurred_at, related_type, related_id, company_id, contact_id, created_by, demo_seed_id)
    VALUES ((ARRAY['call','email','meeting','whatsapp','note','sample','visit'])[1+((i-1)%7)]::activity_type,
      (ARRAY['مكالمة تعريفية','بريد متابعة','اجتماع تجاري','رسالة واتساب','ملاحظة داخلية','إرسال عينة','زيارة عميل'])[1+((i-1)%7)]||' #'||i,
      'نشاط تجريبي', now() - (i || ' hours')::interval,
      'company', v_company, v_company, v_contact, v_uid, v_run);
  END LOOP;

  -- NOTIFICATIONS
  FOR i IN 1..20 LOOP
    INSERT INTO public.notifications(user_id, type, title, body, entity_type, entity_id, link, demo_seed_id)
    VALUES (v_uid, 'info',
      (ARRAY['طلب موافقة جديد','تم تحويل عرض سعر','شحنة قيد التسليم','مهمة جديدة','دفعة متأخرة'])[1+((i-1)%5)],
      'إشعار تجريبي رقم '||i,
      CASE WHEN i%3=0 THEN 'order' WHEN i%3=1 THEN 'quotation' ELSE 'shipment' END,
      CASE WHEN i%3=0 THEN gp_order WHEN i%3=1 THEN gp_quote ELSE gp_shipment END,
      CASE WHEN i%3=0 THEN '/orders' WHEN i%3=1 THEN '/quotations' ELSE '/shipments' END,
      v_run);
  END LOOP;

  -- COUNTS
  SELECT jsonb_object_agg(t, cnt) INTO v_counts FROM (
    SELECT 'companies' t, count(*) cnt FROM public.companies WHERE demo_seed_id = v_run UNION ALL
    SELECT 'contacts', count(*) FROM public.contacts WHERE demo_seed_id = v_run UNION ALL
    SELECT 'exhibitions', count(*) FROM public.exhibitions WHERE demo_seed_id = v_run UNION ALL
    SELECT 'products', count(*) FROM public.products WHERE demo_seed_id = v_run UNION ALL
    SELECT 'leads', count(*) FROM public.leads WHERE demo_seed_id = v_run UNION ALL
    SELECT 'opportunities', count(*) FROM public.opportunities WHERE demo_seed_id = v_run UNION ALL
    SELECT 'opportunity_stage_history', count(*) FROM public.opportunity_stage_history WHERE demo_seed_id = v_run UNION ALL
    SELECT 'samples', count(*) FROM public.samples WHERE demo_seed_id = v_run UNION ALL
    SELECT 'quotations', count(*) FROM public.quotations WHERE demo_seed_id = v_run UNION ALL
    SELECT 'quotation_items', count(*) FROM public.quotation_items WHERE demo_seed_id = v_run UNION ALL
    SELECT 'approvals', count(*) FROM public.approvals WHERE demo_seed_id = v_run UNION ALL
    SELECT 'orders', count(*) FROM public.orders WHERE demo_seed_id = v_run UNION ALL
    SELECT 'order_items', count(*) FROM public.order_items WHERE demo_seed_id = v_run UNION ALL
    SELECT 'production_stages', count(*) FROM public.production_stages WHERE demo_seed_id = v_run UNION ALL
    SELECT 'shipments', count(*) FROM public.shipments WHERE demo_seed_id = v_run UNION ALL
    SELECT 'shipment_events', count(*) FROM public.shipment_events WHERE demo_seed_id = v_run UNION ALL
    SELECT 'payments', count(*) FROM public.payments WHERE demo_seed_id = v_run UNION ALL
    SELECT 'export_documents', count(*) FROM public.export_documents WHERE demo_seed_id = v_run UNION ALL
    SELECT 'tasks', count(*) FROM public.tasks WHERE demo_seed_id = v_run UNION ALL
    SELECT 'task_comments', count(*) FROM public.task_comments WHERE demo_seed_id = v_run UNION ALL
    SELECT 'activities', count(*) FROM public.activities WHERE demo_seed_id = v_run UNION ALL
    SELECT 'notifications', count(*) FROM public.notifications WHERE demo_seed_id = v_run
  ) x;

  v_ids := jsonb_build_object(
    'golden_company', gp_company, 'golden_contact', gp_contact,
    'golden_lead', gp_lead, 'golden_opportunity', gp_opp,
    'golden_quotation', gp_quote, 'golden_order', gp_order,
    'golden_shipment', gp_shipment, 'golden_approval', gp_approval,
    'quote_number', 'Q-DEMO-2026-001',
    'order_number', 'O-DEMO-2026-001',
    'shipment_number', 'SHP-DEMO-2026-001'
  );

  UPDATE public.demo_seed_runs SET status='completed', completed_at=now(),
    summary = jsonb_build_object('counts', v_counts, 'golden_path', v_ids)
  WHERE id = v_run;

  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, details)
  VALUES (v_uid, 'demo_seed', 'demo_seed_runs', v_run, jsonb_build_object('counts', v_counts));

  RETURN jsonb_build_object('run_id', v_run, 'counts', v_counts, 'golden_path', v_ids, 'created_at', now());
END $$;

GRANT EXECUTE ON FUNCTION public.seed_demo_data(TEXT, TEXT) TO authenticated;
