"use client";

import { motion } from "framer-motion";
import {
  Wallet,
  Vote,
  TrendingUp,
  ExternalLink,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAccount, useReadContracts } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { formatUnits } from "viem";
import {
  REGISTRY_ABI,
  MOCK_TOKEN_ABI,
  CONTRACT_ADDRESSES,
  TICKER_TOKENS,
  tickerToBytes32,
} from "@/lib/contracts";
import { useState } from "react";

const registryAddress = CONTRACT_ADDRESSES.registry as `0x${string}`;
const TICKERS = Object.keys(TICKER_TOKENS);

/// Virtual reference prices (USD) for the mock tokenized stocks — testnet
/// display only, roughly mirroring real share prices.
const VIRTUAL_PRICES: Record<string, number> = {
  TSLA: 248.5,
  AAPL: 211.2,
  NVDA: 144.85,
  MSFT: 468.3,
};

const COMPANY_NAMES: Record<string, string> = {
  TSLA: "Mock Tokenized TSLA",
  AAPL: "Mock Tokenized AAPL",
  NVDA: "Mock Tokenized NVDA",
  MSFT: "Mock Tokenized MSFT",
};

const CHOICE_LABELS: Record<number, { label: string; cls: string }> = {
  1: { label: "For", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  0: { label: "Against", cls: "text-red-400 bg-red-500/10 border-red-500/20" },
  2: { label: "Abstain", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

const usd = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function ProfilePage() {
  const { address, isConnected, chain } = useAccount();
  const [copied, setCopied] = useState(false);

  // ── Balances of all four tokenized stocks ────────────────────────────
  const { data: balanceResults } = useReadContracts({
    contracts: TICKERS.map((t) => ({
      address: TICKER_TOKENS[t].address,
      chainId: arbitrumSepolia.id,
      abi: MOCK_TOKEN_ABI,
      functionName: "balanceOf" as const,
      args: [address ?? "0x0000000000000000000000000000000000000000"] as const,
    })),
    query: { enabled: isConnected && !!address },
  });

  const holdings = TICKERS.map((t, i) => {
    const raw = balanceResults?.[i]?.status === "success"
      ? (balanceResults[i].result as bigint)
      : 0n;
    const amount = Number(formatUnits(raw, 18));
    return {
      ticker: t,
      symbol: TICKER_TOKENS[t].symbol,
      name: COMPANY_NAMES[t],
      amount,
      value: amount * (VIRTUAL_PRICES[t] ?? 0),
    };
  });

  const totalValue = holdings.reduce((acc, h) => acc + h.value, 0);
  const totalTokens = holdings.reduce((acc, h) => acc + h.amount, 0);

  // ── Voting history across the active meetings ────────────────────────
  // Meeting headers first (for proposal counts)...
  const { data: meetingResults } = useReadContracts({
    contracts: TICKERS.map((t) => ({
      address: registryAddress,
      chainId: arbitrumSepolia.id,
      abi: REGISTRY_ABI,
      functionName: "getMeeting" as const,
      args: [tickerToBytes32(t)] as const,
    })),
    query: { enabled: isConnected && !!address },
  });

  // ...then one getUserVote per (ticker, proposalId) pair
  const votePairs: { ticker: string; proposalId: number }[] = [];
  meetingResults?.forEach((r, i) => {
    if (r.status !== "success" || !r.result) return;
    const m = r.result as unknown as { proposalCount: number; isActive: boolean };
    for (let pid = 1; pid <= Number(m.proposalCount); pid++) {
      votePairs.push({ ticker: TICKERS[i], proposalId: pid });
    }
  });

  const { data: voteResults } = useReadContracts({
    contracts: votePairs.map((p) => ({
      address: registryAddress,
      chainId: arbitrumSepolia.id,
      abi: REGISTRY_ABI,
      functionName: "getUserVote" as const,
      args: [
        address ?? "0x0000000000000000000000000000000000000000",
        tickerToBytes32(p.ticker),
        p.proposalId,
      ] as const,
    })),
    query: { enabled: isConnected && !!address && votePairs.length > 0 },
  });

  const myVotes = votePairs
    .map((p, i) => {
      const r = voteResults?.[i];
      if (r?.status !== "success" || !r.result) return null;
      const [choice, weight] = r.result as [bigint, bigint];
      if (weight === 0n) return null; // never voted on this proposal
      return {
        ...p,
        choice: Number(choice),
        weight: Number(formatUnits(weight, 18)),
      };
    })
    .filter(Boolean) as {
    ticker: string;
    proposalId: number;
    choice: number;
    weight: number;
  }[];

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  // Not connected state
  if (!isConnected || !address) {
    return (
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <p className="text-sm text-muted-foreground mb-2">Account</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
            Profile
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-2xl border border-border dark:border-white/10 bg-card/80 dark:bg-white/[0.03] p-12 text-center"
        >
          <Wallet className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-foreground/80 mb-2">
            Wallet not connected
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Connect your wallet to view your profile, token holdings, and voting
            history.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <p className="text-sm text-muted-foreground mb-2">Account</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
          Profile
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground font-mono bg-muted/50 dark:bg-white/5 px-3 py-1 rounded-full border border-border dark:border-white/10 hover:bg-muted dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            {shortAddress}
            {copied ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3 opacity-50" />
            )}
          </button>
          <Badge className="text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10">
            Connected
          </Badge>
          {chain && (
            <span className="text-[10px] text-muted-foreground">
              {chain.name}
            </span>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-3 gap-px bg-muted/50 dark:bg-white/5 rounded-2xl border border-border dark:border-white/10 overflow-hidden mb-10"
      >
        {[
          {
            icon: Wallet,
            label: "Portfolio Value",
            value: usd(totalValue),
          },
          {
            icon: TrendingUp,
            label: "Total Tokens",
            value: totalTokens.toLocaleString(undefined, { maximumFractionDigits: 0 }),
          },
          {
            icon: Vote,
            label: "Votes Cast",
            value: myVotes.length.toString(),
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-card/80 dark:bg-white/[0.03] p-5"
          >
            <stat.icon className="h-4 w-4 text-muted-foreground/50 mb-2" />
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
              {stat.label}
            </p>
            <p className="text-lg font-semibold text-foreground/90">
              {stat.value}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Token Holdings */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-10"
      >
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-sm text-muted-foreground">Token Holdings</p>
          <p className="text-[10px] text-muted-foreground/50">
            Virtual reference prices — testnet display only
          </p>
        </div>
        <div className="space-y-2">
          {holdings.map((h) => (
            <div
              key={h.ticker}
              className="flex items-center justify-between p-4 rounded-xl border border-border dark:border-white/10 bg-card/80 dark:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-semibold text-foreground w-14 shrink-0">
                  {h.symbol}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {h.name}
                </span>
                <span className="text-[10px] text-muted-foreground/50 shrink-0">
                  @ {usd(VIRTUAL_PRICES[h.ticker])}
                </span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-sm font-medium text-foreground/70">
                  {h.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} tokens
                </span>
                <span className="text-sm font-semibold text-foreground/90 w-24 text-right">
                  {h.amount > 0 ? usd(h.value) : "—"}
                </span>
                {h.amount === 0 && (
                  <a
                    href="/faucet"
                    className="text-[10px] text-primary hover:underline"
                  >
                    Get tokens
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Votes */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.12 }}
        className="mb-10"
      >
        <p className="text-sm text-muted-foreground mb-4">Recent Votes</p>
        {myVotes.length === 0 ? (
          <div className="p-6 rounded-xl border border-border dark:border-white/10 bg-card/80 dark:bg-white/[0.03] text-center">
            <Vote className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No votes cast in the current meetings yet.
            </p>
            <a href="/dashboard" className="text-xs text-primary hover:underline">
              Browse active meetings
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {myVotes.map((v) => {
              const choice = CHOICE_LABELS[v.choice] ?? CHOICE_LABELS[2];
              return (
                <a
                  key={`${v.ticker}-${v.proposalId}`}
                  href={`/dashboard/${v.ticker}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-border dark:border-white/10 bg-card/80 dark:bg-white/[0.03] hover:bg-muted/50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground w-14">
                      {v.ticker}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Proposal #{v.proposalId}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {v.weight.toLocaleString(undefined, { maximumFractionDigits: 0 })} votes
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${choice.cls}`}
                    >
                      {choice.label}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Links */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <p className="text-sm text-muted-foreground mb-4">Explorer</p>
        <a
          href={`https://sepolia.arbiscan.io/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-4 rounded-xl border border-border dark:border-white/10 bg-card/80 dark:bg-white/[0.03] hover:bg-muted/50 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <ExternalLink className="h-4 w-4 text-muted-foreground/50" />
          <span className="text-sm text-foreground/80">
            View on Arbiscan
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            {shortAddress}
          </span>
        </a>
      </motion.div>
    </div>
  );
}
