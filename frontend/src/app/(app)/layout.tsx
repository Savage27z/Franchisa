"use client";

import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Starfield } from "@/components/ui/starfield";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <>
      <Navbar />
      {/* Starfield — always mounted, opacity controlled by theme */}
      <div
        className="fixed inset-0 z-0 transition-opacity duration-500"
        style={{ opacity: mounted && resolvedTheme === "dark" ? 1 : 0 }}
      >
        <Starfield
          starColor="rgba(255,255,255,0.7)"
          bgColor="rgba(5,5,16,1)"
          speed={0.3}
          quantity={300}
          mouseAdjust
          easing={5}
        />
      </div>
      <main className="relative z-10 flex-1 pt-28 pb-16 px-6 bg-background dark:bg-transparent">
        {children}
      </main>
      <Footer />
    </>
  );
}
