"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_MEETINGS, getVotePercentage } from "@/lib/mock-data";

const sampleProof = {
  franchisa_governance_proof: {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    network: "arbitrum-sepolia",
    chainId: 421614,
    contracts: {
      registry: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
      stylusEngine: "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
    },
    meeting: {
      ticker: "TSLA",
      companyName: "Tesla, Inc.",
      meetingDate: "2026-08-15",
      totalVoters: 1247,
    },
    results: MOCK_MEETINGS[0].proposals.map((p) => {
      const { yesPercent, noPercent, abstainPercent } = getVotePercentage(
        p.yesWeight,
        p.noWeight,
        p.abstainWeight
      );
      return {
        proposalId: p.proposalId,
        title: p.title,
        yesWeight: p.yesWeight.toString(),
        noWeight: p.noWeight.toString(),
        abstainWeight: p.abstainWeight.toString(),
        yesPercentage: `${yesPercent.toFixed(2)}%`,
        noPercentage: `${noPercent.toFixed(2)}%`,
        abstainPercentage: `${abstainPercent.toFixed(2)}%`,
        voterCount: p.voterCount,
      };
    }),
    signature:
      "0x4a7b3c8d9e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a",
  },
};

export default function ProofPage() {
  const [copied, setCopied] = useState(false);
  const jsonString = JSON.stringify(sampleProof, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <p className="text-sm text-muted-foreground mb-2">Export</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
          Governance Proof
        </h1>
        <p className="text-muted-foreground text-[15px] leading-relaxed max-w-lg">
          Cryptographically signed vote results, packaged for custodian
          ingestion. Tamper-proof, sourced directly from on-chain state.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-2xl border border-border dark:border-white/10 bg-card dark:bg-white/[0.03] backdrop-blur-sm overflow-hidden mb-6"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium font-mono text-foreground/70">
              franchisa_proof_TSLA.json
            </span>
            <Badge className="text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10">
              Verified
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="text-xs h-7 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          </div>
        </div>
        <pre className="p-5 text-xs leading-relaxed overflow-x-auto text-muted-foreground font-mono">
          <code>{jsonString}</code>
        </pre>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="text-xs text-muted-foreground/50 leading-relaxed"
      >
        Cryptographic governance proofs are generated from on-chain state.
        Custodian integration (Robinhood, DTCC) is a partnership layer built
        on top of this verifiable data.
      </motion.p>
    </div>
  );
}
