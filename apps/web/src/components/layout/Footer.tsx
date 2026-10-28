"use client";

import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { NAV_LINKS, SITE, whatsappUrl } from "@/lib/site";

export function Footer() {
  const { scrollTo } = useSmoothScroll();

  return (
    <footer className="relative isolate border-t border-white/10 bg-obsidian py-16 text-ink-muted">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-bg absolute inset-0 opacity-40" />
        <div className="absolute bottom-0 left-1/2 h-[320px] w-[600px] -translate-x-1/2 rounded-full bg-racing/[0.04] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Marca */}
          <div className="space-y-4">
            <a
              href="#inicio"
              onClick={(e) => {
                e.preventDefault();
                scrollTo("#inicio");
              }}
              className="inline-block"
              aria-label="Chambi Motors - Inicio"
            >
              <Logo variant="full" sizes="200px" className="h-8 w-auto" />
            </a>
            <p className="text-sm text-ink-dim leading-relaxed">
              {SITE.description}
            </p>
            <div className="pt-2">
              <a
                href={whatsappUrl()}
                target="_blank"
                rel="noreferrer"
                className="font-label inline-flex items-center gap-2 rounded-xl bg-st-ready/15 border border-st-ready/40 px-4 py-2.5 text-xs font-semibold text-st-ready hover:bg-st-ready/25 transition-all"
              >
                <MessageCircle className="h-4 w-4" />
                Contactar por WhatsApp
              </a>
            </div>
          </div>

          {/* Navegación */}
          <div>
            <h3 className="font-label text-xs uppercase tracking-widest text-ink mb-4">
              Navegación
            </h3>
            <ul className="space-y-2.5 text-sm">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo(link.href);
                    }}
                    className="hover:text-racing transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Horarios */}
          <div>
            <h3 className="font-label text-xs uppercase tracking-widest text-ink mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber" />
              Horarios de Atención
            </h3>
            <ul className="space-y-2 text-sm">
              {SITE.hours.map((h, i) => (
                <li key={i} className="flex flex-col">
                  <span className="text-ink font-medium">{h.days}</span>
                  <span className="text-xs text-ink-dim">{h.time}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Ubicación y Contacto */}
          <div>
            <h3 className="font-label text-xs uppercase tracking-widest text-ink mb-4">
              Taller Central
            </h3>
            <div className="space-y-3 text-sm">
              <p className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-racing mt-0.5" />
                <span>{SITE.address}</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-racing" />
                <span>{SITE.phoneDisplay}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-dim">
          <p>© {new Date().getFullYear()} {SITE.name}. Todos los derechos reservados.</p>
          <p className="font-mono text-[11px] tracking-wider text-ink-dim/80">
            CHAMBI MOTORS OS · V1.0.0
          </p>
        </div>
      </div>
    </footer>
  );
}
