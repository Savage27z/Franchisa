"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ThumbsUp,
  ThumbsDown,
  Minus,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type Proposal,
  formatTokenWeight,
  getVotePercentage,
} from "@/lib/mock-data";
import { useSubmitVote, useHasVoted, useVoteResults, useTokenBalance } from "@/hooks/use-governance";
import { useAccount } from "wagmi";

const riskStyles = {
  Low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  High: "bg-red-500/10 text-red-400 border-red-500/20",
};

interface ProposalCardProps {
  proposal: Proposal;
  ticker?: string;
  isOnChain?: boolean;
}

export function ProposalCard({
  proposal,
  ticker,
  isOnChain = false,
}: ProposalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { address, isConnected } = useAccount();
  const { balance } = useTokenBalance();

  // On-chain voting
  const {
    submitVote,
    txHash,
    isPending: isVotePending,
    isConfirming,
    isSuccess: voteSuccess,
    error: voteError,
  } = useSubmitVote();

  // On-chain vote status (only when ticker provided and on-chain)
  const { hasVoted: onChainHasVoted } = useHasVoted(
    ticker ?? "",
    proposal.proposalId
  );

  // On-chain results
  const {
    yes: onChainYes,
    no: onChainNo,
    abstain: onChainAbstain,
    yesPercent: onChainYesPercent,
    noPercent: onChainNoPercent,
    abstainPercent: onChainAbstainPercent,
    refetch: refetchResults,
  } = useVoteResults(ticker ?? "", proposal.proposalId);

  // Use on-chain results if available and non-zero, else mock data
  const hasOnChainResults =
    isOnChain && (onChainYes > 0n || onChainNo > 0n || onChainAbstain > 0n);

  const yesWeight = hasOnChainResults ? onChainYes : proposal.yesWeight;
  const noWeight = hasOnChainResults ? onChainNo : proposal.noWeight;
  const abstainWeight = hasOnChainResults
    ? onChainAbstain
    : proposal.abstainWeight;

  const { yesPercent, noPercent, abstainPercent } = hasOnChainResults
    ? {
        yesPercent: onChainYesPercent,
        noPercent: onChainNoPercent,
        abstainPercent: onChainAbstainPercent,
      }
    : getVotePercentage(
        proposal.yesWeight,
        proposal.noWeight,
        proposal.abstainWeight
      );

  // Track local vote state
  const [localVote, setLocalVote] = useState<string | null>(
    proposal.userVoted ?? null
  );

  const hasVoted = onChainHasVoted || !!localVote;

  // Refetch results after successful vote
  useEffect(() => {
    if (voteSuccess) {
      refetchResults();
    }
  }, [voteSuccess, refetchResults]);

  const handleVote = async (choice: "yes" | "no" | "abstain") => {
    if (!isOnChain || !ticker || !isConnected) {
      // Fallback to mock voting
      setLocalVote(choice);
      return;
    }

    // Real on-chain vote: 0=No, 1=Yes, 2=Abstain
    const choiceMap = { yes: 1, no: 0, abstain: 2 };
    submitVote(ticker, proposal.proposalId, choiceMap[choice]);
    setLocalVote(choice);
  };

  const isVoting = isVotePending || isConfirming;

  return (
    <motion.div layout transition={{ duration: 0.2 }}>
      <div className="rounded-2xl border border-border dark:border-white/10 bg-card dark:bg-white/[0.03] backdrop-blur-sm overflow-hidden hover:border-border/80 dark:hover:border-white/20 transition-colors duration-200">
        <div
          className="p-5 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className="text-[11px] font-medium rounded-full bg-muted dark:bg-white/10 text-foreground/70 dark:text-white/70 border-border dark:border-white/10 hover:bg-muted dark:hover:bg-white/10">
                  {proposal.category}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[11px] rounded-full ${riskStyles[proposal.riskRating]}`}
                >
                  {proposal.riskRating}
                </Badge>
                {isOnChain && (
                  <Badge
                    variant="outline"
                    className="text-[10px] rounded-full bg-blue-500/10 text-blue-400 border-blue-500/20"
                  >
                    On-Chain
                  </Badge>
                )}
              </div>
              <h3 className="font-medium text-[15px] leading-snug text-foreground/90">
                {proposal.title}
              </h3>
            </div>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.15 }}
              className="mt-1"
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground/50" />
            </motion.div>
          </div>

          <div className="space-y-2">
            <div className="h-1.5 rounded-full bg-muted dark:bg-white/10 overflow-hidden flex">
              <motion.div
                className="h-full bg-foreground dark:bg-white rounded-l-full"
                initial={{ width: 0 }}
                animate={{ width: `${yesPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              <motion.div
                className="h-full bg-foreground/20 dark:bg-white/20"
                initial={{ width: 0 }}
                animate={{ width: `${noPercent}%` }}
                transition={{ duration: 0.8, delay: 0.1 }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                For{" "}
                <span className="font-medium text-foreground/80">
                  {yesPercent.toFixed(1)}%
                </span>
              </span>
              <span>
                Against {noPercent.toFixed(1)}% · Abstain{" "}
                {abstainPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-1 border-t border-border dark:border-white/10">
                <p className="text-sm text-muted-foreground leading-relaxed mt-4 mb-4">
                  {proposal.description}
                </p>

                <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 dark:bg-white/5 mb-4">
                  <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {proposal.riskJustification}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-5">
                  <span>
                    {proposal.voterCount.toLocaleString()} voters
                  </span>
                  <span>
                    {formatTokenWeight(yesWeight + noWeight + abstainWeight)}{" "}
                    total weight
                  </span>
                  {proposal.boardRecommendation !== "None" && (
                    <span>
                      Board recommends: {proposal.boardRecommendation}
                    </span>
                  )}
                </div>

                {/* Vote error */}
                {voteError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 mb-4">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-400 leading-relaxed">
                      {voteError.message.includes("Must hold")
                        ? "You need mTSLA tokens to vote. Visit the Faucet page to claim some!"
                        : voteError.message.includes("already voted") ||
                            voteError.message.includes("failed")
                          ? "Vote already submitted or transaction failed."
                          : "Transaction failed. Please try again."}
                    </p>
                  </div>
                )}

                {/* Transaction hash link */}
                {txHash && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 mb-4">
                    <ExternalLink className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <a
                      href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      View transaction on Arbiscan
                    </a>
                  </div>
                )}

                {hasVoted ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 dark:bg-white/5">
                    <CheckCircle2 className="h-4 w-4 text-foreground" />
                    <span className="text-sm text-foreground/80">
                      Voted{" "}
                      <span className="font-medium capitalize">
                        {localVote ?? "submitted"}
                      </span>
                    </span>
                  </div>
                ) : !isConnected && isOnChain ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 dark:bg-white/5">
                    <span className="text-sm text-muted-foreground">
                      Connect wallet to vote on-chain
                    </span>
                  </div>
                ) : isOnChain && (!balance || balance === 0n) ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs text-amber-400">
                      You need mTSLA tokens to vote. Visit the Faucet page to
                      claim tokens.
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleVote("yes")}
                      disabled={isVoting}
                      className="flex-1 rounded-xl cursor-pointer bg-foreground text-background hover:bg-foreground/90"
                    >
                      {isVoting ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      For
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleVote("no")}
                      disabled={isVoting}
                      className="flex-1 rounded-xl cursor-pointer border-border dark:border-white/20 hover:bg-muted dark:hover:bg-white/10 bg-transparent"
                    >
                      {isVoting ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <ThumbsDown className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Against
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleVote("abstain")}
                      disabled={isVoting}
                      className="flex-1 rounded-xl cursor-pointer text-muted-foreground hover:bg-muted dark:hover:bg-white/10 hover:text-foreground"
                    >
                      {isVoting ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Minus className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Abstain
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
