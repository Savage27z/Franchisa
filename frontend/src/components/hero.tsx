"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ShaderBackground } from "@/components/ui/shader-background";

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <ShaderBackground />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 z-[2] opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8 text-xs text-white/50 uppercase tracking-widest">
            Corporate Governance On-Chain
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: 0.1,
            ease: [0.25, 0.4, 0.25, 1],
          }}
          className="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.05] mb-6 text-white"
        >
          Bridge SEC proxy voting{" "}
          <span className="text-white/40">to the blockchain</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: 0.2,
            ease: [0.25, 0.4, 0.25, 1],
          }}
          className="text-lg text-white/40 leading-relaxed max-w-xl mx-auto mb-12"
        >
          AI-parsed proposals, balance-weighted votes, and cryptographic
          proof — all in one platform.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: 0.3,
            ease: [0.25, 0.4, 0.25, 1],
          }}
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-10 py-3.5 rounded-full bg-white text-black font-medium text-sm hover:bg-white/90 transition-colors cursor-pointer"
          >
            Enter Dashboard
          </Link>
        </motion.div>
      </div>

      {/* Globe / planet at the bottom */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] max-w-[1400px] z-[3]">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
        >
          <div
            className="w-full aspect-[2.5/1] rounded-t-[50%] overflow-hidden relative"
            style={{
              background:
                "radial-gradient(ellipse at 50% 100%, #1a1a2e 0%, #0a0a15 40%, #050510 70%)",
              boxShadow:
                "0 -40px 120px 20px rgba(100, 120, 255, 0.06), 0 -20px 60px 10px rgba(255, 255, 255, 0.03)",
            }}
          >
            {/* Globe surface lines */}
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage: `
                  radial-gradient(ellipse at 50% 120%, transparent 40%, rgba(255,255,255,0.1) 60%, transparent 80%),
                  repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(255,255,255,0.15) 30px, rgba(255,255,255,0.15) 31px),
                  repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 41px)
                `,
              }}
            />
            {/* Top edge glow */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white/[0.04] to-transparent" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
