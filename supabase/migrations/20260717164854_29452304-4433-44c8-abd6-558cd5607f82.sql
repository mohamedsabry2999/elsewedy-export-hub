
-- 1) currencies catalog
CREATE TABLE IF NOT EXISTS public.currencies (
  code TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  symbol TEXT,
  decimals INT NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.currencies TO authenticated;
GRANT ALL ON public.currencies TO service_role;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY currencies_select ON public.currencies FOR SELECT TO authenticated USING (true);
CREATE POLICY currencies_insert ON public.currencies FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(),'settings.manage'));
CREATE POLICY currencies_update ON public.currencies FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'settings.manage')) WITH CHECK (public.has_permission(auth.uid(),'settings.manage'));
CREATE POLICY currencies_delete ON public.currencies FOR DELETE TO authenticated USING (public.has_permission(auth.uid(),'settings.manage'));
CREATE TRIGGER currencies_set_updated_at BEFORE UPDATE ON public.currencies FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2) fx_rates (rate is: 1 unit of `code` = rate * base_currency)
CREATE TABLE IF NOT EXISTS public.fx_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL REFERENCES public.currencies(code) ON DELETE CASCADE,
  base_code TEXT NOT NULL REFERENCES public.currencies(code) ON DELETE CASCADE,
  rate NUMERIC(18,8) NOT NULL CHECK (rate > 0),
  rate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code, base_code, rate_date)
);
GRANT SELECT ON public.fx_rates TO authenticated;
GRANT ALL ON public.fx_rates TO service_role;
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY fx_rates_select ON public.fx_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY fx_rates_insert ON public.fx_rates FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(),'settings.manage'));
CREATE POLICY fx_rates_update ON public.fx_rates FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'settings.manage')) WITH CHECK (public.has_permission(auth.uid(),'settings.manage'));
CREATE POLICY fx_rates_delete ON public.fx_rates FOR DELETE TO authenticated USING (public.has_permission(auth.uid(),'settings.manage'));
CREATE TRIGGER fx_rates_set_updated_at BEFORE UPDATE ON public.fx_rates FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX IF NOT EXISTS fx_rates_code_date_idx ON public.fx_rates(code, rate_date DESC);

-- 3) system_settings base currency
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS base_currency TEXT NOT NULL DEFAULT 'USD';

-- 4) exchange_rate + base_total on financial docs
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,8);
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS base_total    NUMERIC(18,2);
ALTER TABLE public.orders     ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,8);
ALTER TABLE public.orders     ADD COLUMN IF NOT EXISTS base_total    NUMERIC(18,2);
ALTER TABLE public.payments   ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,8);
ALTER TABLE public.payments   ADD COLUMN IF NOT EXISTS base_amount   NUMERIC(18,2);

-- 5) helper: latest rate to base
CREATE OR REPLACE FUNCTION public.fx_to_base(_code TEXT, _amount NUMERIC, _on_date DATE DEFAULT CURRENT_DATE)
RETURNS NUMERIC LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE base TEXT; r NUMERIC;
BEGIN
  SELECT base_currency INTO base FROM public.system_settings ORDER BY created_at LIMIT 1;
  IF base IS NULL THEN base := 'USD'; END IF;
  IF _code = base THEN RETURN _amount; END IF;
  SELECT rate INTO r FROM public.fx_rates
    WHERE code=_code AND base_code=base AND rate_date <= _on_date
    ORDER BY rate_date DESC LIMIT 1;
  IF r IS NULL THEN RETURN NULL; END IF;
  RETURN ROUND(_amount * r, 2);
END $$;
GRANT EXECUTE ON FUNCTION public.fx_to_base(TEXT,NUMERIC,DATE) TO authenticated;

-- 6) seed currencies
INSERT INTO public.currencies(code,name_ar,name_en,symbol,decimals) VALUES
  ('USD','دولار أمريكي','US Dollar','$',2),
  ('EUR','يورو','Euro','€',2),
  ('GBP','جنيه إسترليني','British Pound','£',2),
  ('EGP','جنيه مصري','Egyptian Pound','ج.م',2),
  ('SAR','ريال سعودي','Saudi Riyal','﷼',2),
  ('AED','درهم إماراتي','UAE Dirham','د.إ',2),
  ('JPY','ين ياباني','Japanese Yen','¥',0),
  ('CNY','يوان صيني','Chinese Yuan','¥',2),
  ('TRY','ليرة تركية','Turkish Lira','₺',2),
  ('KWD','دينار كويتي','Kuwaiti Dinar','د.ك',3)
ON CONFLICT (code) DO NOTHING;

-- 7) seed sample rates against USD (approx, editable)
INSERT INTO public.fx_rates(code, base_code, rate, rate_date, source) VALUES
  ('EUR','USD',1.08,CURRENT_DATE,'seed'),
  ('GBP','USD',1.27,CURRENT_DATE,'seed'),
  ('EGP','USD',0.021,CURRENT_DATE,'seed'),
  ('SAR','USD',0.27,CURRENT_DATE,'seed'),
  ('AED','USD',0.27,CURRENT_DATE,'seed'),
  ('JPY','USD',0.0064,CURRENT_DATE,'seed'),
  ('CNY','USD',0.14,CURRENT_DATE,'seed'),
  ('TRY','USD',0.031,CURRENT_DATE,'seed'),
  ('KWD','USD',3.26,CURRENT_DATE,'seed')
ON CONFLICT (code, base_code, rate_date) DO NOTHING;
