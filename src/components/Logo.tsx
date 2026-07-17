import { useBranding } from "./BrandingProvider";
import logoFull from "@/assets/elsewedy-logo.png.asset.json";
import logoMark from "@/assets/elsewedy-mark.png.asset.json";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "mark";
  className?: string;
  alt?: string;
}

export function Logo({ variant = "full", className, alt = "Medhat Elsewedy Print House" }: LogoProps) {
  const { brand } = useBranding();
  // "mark" always uses the bundled S-mark. "full" prefers the user-uploaded logo when present.
  const src = variant === "mark"
    ? logoMark.url
    : (brand.logo_url || logoFull.url);
  return <img src={src} alt={alt} className={cn("object-contain select-none", className)} draggable={false} />;
}
