import Image from "next/image";
import { cx } from "@/lib/utils";

interface LogoProps {
  variant?: "emblem" | "full";
  className?: string;
  priority?: boolean;
  sizes?: string;
}

const DIMENSIONS = {
  emblem: { src: "/images/logo-emblem.webp", width: 1210, height: 800 },
  full: { src: "/images/logo-full.webp", width: 1450, height: 1280 },
} as const;

/**
 * Logo oficial de Chambi Motors (recortes optimizados de images/Logo.jpg).
 * El borde se difumina con una máscara para fundirse con el fondo carbono.
 */
export function Logo({ variant = "emblem", className, priority, sizes }: LogoProps) {
  const d = DIMENSIONS[variant];
  return (
    <Image
      src={d.src}
      width={d.width}
      height={d.height}
      alt="Chambi Motors — auto deportivo con llave mecánica y engranaje"
      priority={priority}
      sizes={sizes}
      className={cx("logo-fade select-none object-contain", className)}
      draggable={false}
    />
  );
}
