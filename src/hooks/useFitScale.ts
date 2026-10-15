"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Calcula la escala necesaria para que un diseño de tamaño fijo
 * (designW × designH) quepa dentro de su contenedor sin desbordar.
 * Permite mantener pixel‑perfect los mockups de teléfono en móvil.
 */
export function useFitScale(designW: number, designH: number, max = 1) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(max);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      setScale(Math.min(max, width / designW, height / designH));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [designW, designH, max]);

  return { ref, scale };
}
