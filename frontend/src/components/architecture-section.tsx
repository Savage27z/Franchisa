"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    label: "AI Ingestion",
    description:
      "Watches SEC EDGAR for DEF 14A filings. Claude API parses dense legal text into clean, structured proposals.",
  },
  {
    number: "02",
    label: "On-Chain Registry",
    description:
      "Solidity contract on Arbitrum stores proposals, validates token holdings, and bridges to the voting engine.",
  },
  {
    number: "03",
    label: "Stylus Voting",
    description:
      "Real Rust/WASM contract deployed and activated via Arbitrum Stylus. Snapshot-weighted votes recorded and aggregated on-chain.",
  },
  {
    number: "04",
    label: "Proof Export",
    description:
      "Signed JSON report with final tallies and cryptographic proof, ready for custodian ingestion.",
  },
];

export function ArchitectureSection() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-sm text-white/40 mb-4"
        >
          How it works
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-semibold tracking-tight mb-16 text-white"
        >
          Four components.
          <br />
          <span className="text-white/40">One complete pipeline.</span>
        </motion.h2>

        <div className="space-y-0">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group grid grid-cols-[60px_1fr] md:grid-cols-[80px_200px_1fr] gap-x-6 py-8 border-t border-white/10"
            >
              <span className="text-sm font-mono text-white/20 pt-1">
                {step.number}
              </span>
              <span className="font-medium text-[15px] pt-1 hidden md:block text-white/90">
                {step.label}
              </span>
              <div>
                <span className="font-medium text-[15px] md:hidden block mb-1 text-white/90">
                  {step.label}
                </span>
                <p className="text-white/40 text-[15px] leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
