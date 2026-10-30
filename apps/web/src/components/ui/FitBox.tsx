"use client";

import type { ReactNode } from "react";
import { useFitScale } from "@/hooks/useFitScale";

interface FitBoxProps {
  designWidth: number;
  designHeight: number;
  children: ReactNode;
  className?: string;
  max?: number;
}

/**
 * Renderiza `children` a su tamaño de diseño y lo escala (transform)
 * para ajustarse al espacio disponible del contenedor padre.
 * El padre debe tener ancho/alto definidos (flex-1, h-full, etc.).
 */
export function FitBox({ designWidth, designHeight, children, className, max = 1 }: FitBoxProps) {
  const { ref, scale } = useFitScale(designWidth, designHeight, max);
  return (
    <div ref={ref} className={`relative h-full w-full ${className ?? ""}`}>
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: designWidth,
          height: designHeight,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
