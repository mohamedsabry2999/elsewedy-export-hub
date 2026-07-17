import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoFull from "@/assets/elsewedy-logo.png.asset.json";
import logoMark from "@/assets/elsewedy-mark.png.asset.json";

export interface BrandInfo {
  company_name: string;
  company_name_ar: string | null;
  logo_url: string | null;      // resolved (signed URL or CDN fallback)
  logo_path: string | null;     // storage path under 'branding' bucket
  primary_color: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_id: string | null;
  invoice_footer: string | null;
  default_currency: string;
  default_language: string;
  timezone: string;
}

interface Ctx {
  brand: BrandInfo;
  logoFullFallback: string;
  logoMarkFallback: string;
  refresh: () => Promise<void>;
}

const DEFAULT_BRAND: BrandInfo = {
  company_name: "Elsewedy Export Hub",
  company_name_ar: "السويدي إكسبورت هَب",
  logo_url: logoFull.url,
  logo_path: null,
  primary_color: "#C1272D",
  address: null, phone: null, email: null, website: null, tax_id: null,
  invoice_footer: null,
  default_currency: "USD",
  default_language: "ar",
  timezone: "Africa/Cairo",
};

const BrandingCtx = createContext<Ctx>({
  brand: DEFAULT_BRAND,
  logoFullFallback: logoFull.url,
  logoMarkFallback: logoMark.url,
  refresh: async () => {},
});

const SIGN_TTL = 60 * 60 * 24 * 7; // 7 days

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<BrandInfo>(DEFAULT_BRAND);

  const load = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("system_settings")
        .select("*")
        .eq("id", "default")
        .maybeSingle();
      if (!data) return;
      let resolvedLogo: string | null = logoFull.url;
      const path = (data as any).logo_path as string | null;
      if (path) {
        const { data: signed } = await supabase.storage.from("branding").createSignedUrl(path, SIGN_TTL);
        if (signed?.signedUrl) resolvedLogo = signed.signedUrl;
      } else if ((data as any).logo_url) {
        resolvedLogo = (data as any).logo_url;
      }
      setBrand({
        company_name: data.company_name ?? DEFAULT_BRAND.company_name,
        company_name_ar: data.company_name_ar ?? DEFAULT_BRAND.company_name_ar,
        logo_url: resolvedLogo,
        logo_path: path,
        primary_color: data.primary_color ?? DEFAULT_BRAND.primary_color,
        address: data.address, phone: data.phone, email: data.email,
        website: data.website, tax_id: data.tax_id,
        invoice_footer: data.invoice_footer,
        default_currency: data.default_currency ?? "USD",
        default_language: data.default_language ?? "ar",
        timezone: data.timezone ?? "Africa/Cairo",
      });
    } catch (e) {
      // keep defaults
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <BrandingCtx.Provider value={{ brand, logoFullFallback: logoFull.url, logoMarkFallback: logoMark.url, refresh: load }}>
      {children}
    </BrandingCtx.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingCtx);
}
