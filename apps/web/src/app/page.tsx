import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/hero/Hero";
import { TimelineSection } from "@/components/timeline/TimelineSection";
import { PartsSection } from "@/components/parts/PartsSection";
import { DualViewSection } from "@/components/dual/DualViewSection";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { WorkshopProvider } from "@/store/workshop";

export default function HomePage() {
  return (
    <WorkshopProvider>
      <SmoothScrollProvider>
        <Header />
        <aside role="note" className="bg-amber-300 px-4 py-3 text-center text-sm font-semibold text-black">DEMO VISUAL · Esta página ilustra el producto y usa datos de ejemplo; el seguimiento real se comparte por enlace privado.</aside>
        <main className="relative flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-clip">
          <Hero />
          <TimelineSection />
          <PartsSection />
          <DualViewSection />
        </main>
        <Footer />
      </SmoothScrollProvider>
    </WorkshopProvider>
  );
}
