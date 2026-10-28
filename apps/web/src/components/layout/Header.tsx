"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { NAV_LINKS } from "@/lib/site";
import { cx } from "@/lib/utils";

export function LiveIndicator({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className="font-label inline-flex items-center gap-2 rounded-full border border-st-ready/35 bg-st-ready/10 px-3 py-1.5 text-[10.5px] text-st-ready"
      role="status"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-st-ready" />
        <span className="relative h-2 w-2 rounded-full bg-st-ready" />
      </span>
      {compact ? "En vivo" : "Sistema en vivo • Tiempo real"}
    </span>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollTo } = useSmoothScroll();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    scrollTo(href);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <div
        className={cx(
          "glass relative mx-auto flex max-w-7xl items-center justify-between gap-4 overflow-hidden rounded-2xl px-3 py-2 transition-all duration-500 sm:px-4",
          scrolled ? "shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)]" : "shadow-none",
        )}
      >
        <a
          href="#inicio"
          onClick={(e) => {
            e.preventDefault();
            go("#inicio");
          }}
          className="flex items-center gap-2.5"
          aria-label="Chambi Motors — ir al inicio"
        >
          <Logo variant="emblem" priority sizes="64px" className="h-10 w-auto sm:h-11" />
          <span className="leading-none">
            <span className="font-title text-titanium block text-[17px] sm:text-lg">Chambi</span>
            <span className="font-label text-racing block text-[10px] tracking-[0.5em]">Motors</span>
          </span>
        </a>

        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => {
                e.preventDefault();
                go(l.href);
              }}
              className="font-tech rounded-lg px-3.5 py-2 text-[15px] font-semibold uppercase tracking-wider text-ink-muted transition-colors hover:bg-white/5 hover:text-racing"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <LiveIndicator />
          </div>
          <div className="md:hidden">
            <LiveIndicator compact />
          </div>
          <button
            type="button"
            id="nav-toggle"
            className="grid h-10 w-10 place-items-center rounded-xl border border-steel-line/40 text-ink lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <motion.span
          aria-hidden
          style={{ scaleX: progress }}
          className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gradient-to-r from-racing via-amber to-amber-deep max-md:hidden"
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label="Menú móvil"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="glass mx-auto mt-2 flex max-w-7xl flex-col rounded-2xl p-2 lg:hidden"
          >
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => {
                  e.preventDefault();
                  go(l.href);
                }}
                className="font-tech rounded-xl px-4 py-3.5 text-lg font-semibold uppercase tracking-wider text-ink hover:bg-white/5 hover:text-racing"
              >
                {l.label}
              </a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
