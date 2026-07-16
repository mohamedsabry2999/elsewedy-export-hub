import logoFull from "@/assets/elsewedy-logo.png.asset.json";
import logoMark from "@/assets/elsewedy-mark.png.asset.json";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "mark";
  className?: string;
  alt?: string;
}

export function Logo({ variant = "full", className, alt = "Medhat Elsewedy Print House" }: LogoProps) {
  const src = variant === "full" ? logoFull.url : logoMark.url;
  return <img src={src} alt={alt} className={cn("object-contain select-none", className)} draggable={false} />;
}
