
-- Auto-compute exchange_rate and base_total/base_amount on quotations, orders, payments
CREATE OR REPLACE FUNCTION public.tg_fx_fill()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_base TEXT;
  v_rate NUMERIC;
  v_amount NUMERIC;
  v_on_date DATE;
BEGIN
  SELECT base_currency INTO v_base FROM public.system_settings ORDER BY created_at LIMIT 1;
  IF v_base IS NULL THEN v_base := 'USD'; END IF;

  IF TG_TABLE_NAME = 'payments' THEN
    v_amount := COALESCE(NEW.amount, 0);
    v_on_date := COALESCE(NEW.paid_at, NEW.due_date, CURRENT_DATE);
  ELSIF TG_TABLE_NAME = 'orders' THEN
    v_amount := COALESCE(NEW.total, 0);
    v_on_date := COALESCE(NEW.order_date, CURRENT_DATE);
  ELSE -- quotations
    v_amount := COALESCE(NEW.total, 0);
    v_on_date := CURRENT_DATE;
  END IF;

  IF NEW.currency IS NULL OR NEW.currency = v_base THEN
    NEW.exchange_rate := 1;
    IF TG_TABLE_NAME = 'payments' THEN
      NEW.base_amount := v_amount;
    ELSE
      NEW.base_total := v_amount;
    END IF;
  ELSE
    SELECT rate INTO v_rate FROM public.fx_rates
      WHERE code = NEW.currency AND base_code = v_base AND rate_date <= v_on_date
      ORDER BY rate_date DESC LIMIT 1;
    IF v_rate IS NOT NULL THEN
      NEW.exchange_rate := v_rate;
      IF TG_TABLE_NAME = 'payments' THEN
        NEW.base_amount := ROUND(v_amount * v_rate, 2);
      ELSE
        NEW.base_total := ROUND(v_amount * v_rate, 2);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_fx_fill_quotations ON public.quotations;
CREATE TRIGGER tg_fx_fill_quotations BEFORE INSERT OR UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.tg_fx_fill();

DROP TRIGGER IF EXISTS tg_fx_fill_orders ON public.orders;
CREATE TRIGGER tg_fx_fill_orders BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_fx_fill();

DROP TRIGGER IF EXISTS tg_fx_fill_payments ON public.payments;
CREATE TRIGGER tg_fx_fill_payments BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_fx_fill();
