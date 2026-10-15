"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  max: number;
  hue: number; // 0 = racing, 1 = amber
  kind: 0 | 1 | 2; // punto, trazo, hexágono
}

/**
 * Campo de chispas / trazos geométricos estilo motion‑graphics.
 * Canvas único, DPR limitado, pausado fuera de pantalla y con la pestaña oculta.
 */
export function SparkField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduce) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const sparks: Spark[] = [];

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (initial = false): Spark => {
      const max = 240 + Math.random() * 320;
      return {
        x: Math.random() * w,
        y: initial ? Math.random() * h : h + 20,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(0.25 + Math.random() * 0.75),
        r: 0.8 + Math.random() * 2.2,
        life: initial ? Math.random() * max : 0,
        max,
        hue: Math.random() > 0.55 ? 1 : 0,
        kind: (Math.random() < 0.7 ? 0 : Math.random() < 0.6 ? 1 : 2) as 0 | 1 | 2,
      };
    };

    resize();
    const count = w < 640 ? 26 : 46;
    for (let i = 0; i < count; i++) sparks.push(spawn(true));

    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!visible || document.hidden) return;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < sparks.length; i++) {
        const s = sparks[i]!;
        s.x += s.vx;
        s.y += s.vy;
        s.life += 1;
        if (s.life > s.max || s.y < -30) {
          sparks[i] = spawn();
          continue;
        }
        const t = s.life / s.max;
        const alpha = Math.sin(Math.PI * t) * 0.85;
        const color = s.hue ? `245,158,11` : `255,214,10`;
        ctx.globalAlpha = alpha;
        if (s.kind === 0) {
          ctx.fillStyle = `rgb(${color})`;
          ctx.shadowColor = `rgba(${color},0.9)`;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        } else if (s.kind === 1) {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = `rgb(${color})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x + s.vx * 38, s.y + s.vy * 38);
          ctx.stroke();
        } else {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "rgba(148,163,184,0.9)";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          const rr = s.r * 3.2;
          for (let k = 0; k < 6; k++) {
            const a = (Math.PI / 3) * k + s.life * 0.01;
            const px = s.x + Math.cos(a) * rr;
            const py = s.y + Math.sin(a) * rr;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    };
    draw();

    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
    });
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [reduce]);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
