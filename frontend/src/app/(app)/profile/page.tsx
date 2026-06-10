"use client";

import { motion } from "framer-motion";
import { Wallet, Vote, TrendingUp, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/liquid-glass-button";
import { useAccount, useReadContract } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { formatUnits } from "viem";
import { CONTRACT_ADDRESSES, MOCK_TOKEN_ABI } from "@/lib/contracts";
import { useState } from "react";

const tokenAddress = CONTRACT_ADDRESSES.mockToken as `0x${string}`;

export default function ProfilePage() {
  const { address, isConnected, chain } = useAccount();
  const [copied, setCopied] = useState(false);

  const { data: tokenBalance } = useReadContract({
    address: tokenAddress,
    chainId: arbitrumSepolia.id,
    abi: MOCK_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

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

  const formattedBalance = tokenBalance
    ? Number(formatUnits(tokenBalance as bigint, 18)).toLocaleString(undefined, {
        maximumFractionDigits: 0,
      })
    : "0";

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
        className="grid grid-cols-2 gap-px bg-muted/50 dark:bg-white/5 rounded-2xl border border-border dark:border-white/10 overflow-hidden mb-10"
      >
        {[
          {
            icon: Wallet,
            label: "mTSLA Balance",
            value: `${formattedBalance} mTSLA`,
          },
          {
            icon: TrendingUp,
            label: "Network",
            value: chain?.name ?? "Unknown",
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
        <p className="text-sm text-muted-foreground mb-4">Token Holdings</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border dark:border-white/10 bg-card/80 dark:bg-white/[0.03]">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">
                mTSLA
              </span>
              <span className="text-xs text-muted-foreground">
                Mock Tokenized TSLA
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground/70">
                {formattedBalance} tokens
              </span>
              {Number(formattedBalance.replace(/,/g, "")) === 0 && (
                <a
                  href="/faucet"
                  className="text-[10px] text-primary hover:underline"
                >
                  Get tokens
                </a>
              )}
            </div>
          </div>
        </div>
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
