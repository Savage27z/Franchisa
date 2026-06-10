"use client";

import { use } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useReadContract } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { ArrowLeft, ExternalLink, Zap } from "lucide-react";
import { ProposalCard } from "@/components/proposal-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_MEETINGS } from "@/lib/mock-data";
import { useMeetingDetail } from "@/hooks/use-meetings";
import { CONTRACT_ADDRESSES, REGISTRY_ABI, tickerToBytes32 } from "@/lib/contracts";

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = use(params);
  const router = useRouter();
  const { meeting, isOnChain, isLoading } = useMeetingDetail(ticker);

  // Read real on-chain voter count for proposal 1 (representative)
  const { data: onChainVoterCount } = useReadContract({
    address: CONTRACT_ADDRESSES.registry as `0x${string}`,
    chainId: arbitrumSepolia.id,
    abi: REGISTRY_ABI,
    functionName: "getVoterCount",
    args: [tickerToBytes32(ticker), 1],
    query: { enabled: isOnChain },
  });
  const realVoterCount = onChainVoterCount ? Number(onChainVoterCount) : 0;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-32 mx-auto mb-4" />
          <div className="h-4 bg-muted rounded w-48 mx-auto" />
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <h1 className="text-xl font-semibold mb-2">Not Found</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          No meeting for &quot;{ticker.toUpperCase()}&quot;
        </p>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
          className="rounded-full cursor-pointer"
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const daysLeft = Math.ceil(
    (new Date(meeting.meetingDate).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24)
  );

  const registryAddress = CONTRACT_ADDRESSES.registry;

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-semibold tracking-tight">
                {meeting.ticker}
              </h1>
              <Badge className="text-[11px] rounded-full bg-muted/50 dark:bg-white/10 text-foreground/70 border-border dark:border-white/10 hover:bg-muted/50 dark:hover:bg-white/10">
                {meeting.isActive ? "Active" : "Closed"}
              </Badge>
              {isOnChain && (
                <Badge className="text-[10px] rounded-full bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/10">
                  <Zap className="h-3 w-3 mr-1" />
                  Live On-Chain
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {meeting.companyName}
            </p>
          </div>
          <div className="flex gap-2">
            {isOnChain && (
              <a
                href={`https://sepolia.arbiscan.io/address/${registryAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted dark:hover:bg-white/10"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Arbiscan
              </a>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground cursor-pointer hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              SEC EDGAR
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-px bg-muted/50 dark:bg-white/5 rounded-2xl border border-border dark:border-white/10 overflow-hidden mb-10">
          {[
            {
              label: "Meeting",
              value: new Date(meeting.meetingDate).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric", year: "numeric" }
              ),
            },
            { label: "Proposals", value: meeting.proposalCount },
            {
              label: "Voters",
              value: isOnChain ? realVoterCount.toLocaleString() : meeting.totalVoters.toLocaleString(),
            },
            {
              label: "Remaining",
              value: daysLeft > 0 ? `${daysLeft}d` : "Ended",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.05 + i * 0.03 }}
              className="bg-card/80 dark:bg-white/[0.03] p-4"
            >
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                {stat.label}
              </p>
              <p className="text-sm font-semibold text-foreground/90">
                {stat.value}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <p className="text-sm text-muted-foreground">Proposals</p>
          {isOnChain && (
            <span className="text-[10px] text-blue-400/60">
              Votes are recorded on Arbitrum Sepolia
            </span>
          )}
        </div>
        <div className="space-y-3">
          {meeting.proposals.map((proposal) => (
            <ProposalCard
              key={proposal.proposalId}
              proposal={proposal}
              ticker={meeting.ticker}
              isOnChain={isOnChain}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
