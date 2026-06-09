import HeroSection from "@/components/ui/glassmorphism-trust-hero";
import { ArchitectureSection } from "@/components/architecture-section";
import { FooterTaped } from "@/components/ui/footer-taped-design";

export default function Home() {
  return (
    <main className="flex-1 bg-[#09090b]">
      <HeroSection backgroundImage="/hero-bg.jpg" />
      <div className="relative">
        {/* Night skyline covers architecture + footer */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-top bg-no-repeat opacity-30"
          style={{
            backgroundImage: "url(/hero-bg-night.jpg)",
            maskImage: "linear-gradient(180deg, transparent 0%, black 15%, black 85%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 15%, black 85%, transparent 100%)",
          }}
        />
        <div className="absolute inset-0 z-0 bg-[#09090b]/50" />
        <div className="relative z-10">
          <ArchitectureSection />
          <FooterTaped />
        </div>
      </div>
    </main>
  );
}
