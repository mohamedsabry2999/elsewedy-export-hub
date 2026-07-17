import { supabase } from "@/integrations/supabase/client";

let cachedBase: string | null = null;

export async function getBaseCurrency(): Promise<string> {
  if (cachedBase) return cachedBase;
  const { data } = await supabase
    .from("system_settings")
    .select("base_currency")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  cachedBase = (data?.base_currency as string) || "USD";
  return cachedBase;
}

export function clearFxCache() {
  cachedBase = null;
}

/**
 * Convert an amount from `code` currency to the system base currency.
 * Returns { rate, base } where rate is code→base and base = amount*rate.
 * If no rate found and code === base, rate=1.
 */
export async function convertToBase(
  code: string,
  amount: number,
  onDate?: string
): Promise<{ rate: number | null; base: number | null; baseCurrency: string }> {
  const base = await getBaseCurrency();
  if (!code || code === base) {
    return { rate: 1, base: Number(amount) || 0, baseCurrency: base };
  }
  const dateStr = onDate ?? new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("fx_rates")
    .select("rate,rate_date")
    .eq("code", code)
    .eq("base_code", base)
    .lte("rate_date", dateStr)
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return { rate: null, base: null, baseCurrency: base };
  const rate = Number(data.rate);
  return { rate, base: Math.round(Number(amount) * rate * 100) / 100, baseCurrency: base };
}
