import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/hero/Hero";
import { TimelineSection } from "@/components/timeline/TimelineSection";
import { PartsSection } from "@/components/parts/PartsSection";
import { DualViewSection } from "@/components/dual/DualViewSection";
import { StatsSection } from "@/components/trust/StatsSection";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { WorkshopProvider } from "@/store/workshop";

export default function HomePage() {
  return (
    <WorkshopProvider>
      <SmoothScrollProvider>
        <Header />
        <main className="relative flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-clip">
          <Hero />
          <TimelineSection />
          <PartsSection />
          <DualViewSection />
          <StatsSection />
        </main>
        <Footer />
      </SmoothScrollProvider>
    </WorkshopProvider>
  );
}
