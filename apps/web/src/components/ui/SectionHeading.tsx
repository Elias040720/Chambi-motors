"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

interface SectionHeadingProps {
  chapter: string;
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  className?: string;
  /** Compacta tamaños para secciones fijadas (pinned) */
  compact?: boolean;
  id?: string;
}

export function SectionHeading({
  chapter,
  eyebrow,
  title,
  lead,
  align = "left",
  className,
  compact,
  id,
}: SectionHeadingProps) {
  const reduce = useReducedMotion();
  return (
    <motion.header
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={cx(
        align === "center" && "mx-auto text-center",
        !compact && "max-w-3xl",
        className,
      )}
    >
      <p
        className={cx(
          "font-label flex items-center gap-3 text-xs text-amber",
          align === "center" && "justify-center",
        )}
      >
        <span className="font-mono text-[11px] tracking-widest text-racing">{chapter}</span>
        <span className="h-px w-8 bg-gradient-to-r from-racing to-transparent" aria-hidden />
        {eyebrow}
      </p>
      <h2
        id={id}
        className={cx(
          "font-title mt-3 text-balance leading-[1.02] text-ink",
          compact ? "text-2xl sm:text-3xl lg:text-4xl" : "text-3xl sm:text-4xl lg:text-5xl",
        )}
      >
        {title}
      </h2>
      {lead && (
        <p
          className={cx(
            "mt-4 text-pretty text-ink-muted",
            compact ? "text-sm sm:text-base" : "text-base sm:text-lg",
            align === "center" && "mx-auto max-w-2xl",
          )}
        >
          {lead}
        </p>
      )}
    </motion.header>
  );
}
