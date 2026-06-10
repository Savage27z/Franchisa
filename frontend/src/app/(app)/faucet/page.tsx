"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Droplets, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccount } from "wagmi";
import { useFaucet, useTokenBalance } from "@/hooks/use-governance";
import { TICKER_TOKENS } from "@/lib/contracts";

const TICKERS = Object.keys(TICKER_TOKENS);

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
  const [selected, setSelected] = useState<string>("NVDA");
  const token = TICKER_TOKENS[selected];

  const { formatted, refetch: refetchBalance } = useTokenBalance(
    token.address,
    token.symbol
  );
  const { claimTokens, txHash, isPending, isConfirming, isSuccess, error } =
    useFaucet();

  // Refresh balance after successful claim
  useEffect(() => {
    if (isSuccess) {
      refetchBalance();
    }
  }, [isSuccess, refetchBalance]);

  const handleClaim = () => {
    // Claim 1,000 tokens of the selected company's stock
    claimTokens(BigInt("1000000000000000000000"), token.address);
  };

  return (
    <div className="max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <p className="text-sm text-muted-foreground mb-2">Testnet</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
          Token Faucet
        </h1>
        <p className="text-muted-foreground text-[15px] leading-relaxed max-w-lg">
          Claim mock tokenized stock on Arbitrum Sepolia. Each company&apos;s
          meeting is gated by its own token — to vote on NVDA proposals you
          need mNVDA, for TSLA you need mTSLA, and so on.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-2xl border border-border dark:border-white/10 bg-card dark:bg-white/[0.03] backdrop-blur-sm p-8"
      >
        {!isConnected ? (
          <div className="text-center py-8">
            <Droplets className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Connect your wallet to claim tokens</p>
            <p className="text-xs text-muted-foreground/50">
              Make sure you&apos;re on Arbitrum Sepolia
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Token Selector */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Company stock</p>
              <div className="grid grid-cols-4 gap-2">
                {TICKERS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelected(t)}
                    className={`h-11 rounded-xl text-sm font-medium transition-colors duration-200 cursor-pointer border ${
                      selected === t
                        ? "bg-foreground text-background border-transparent"
                        : "bg-muted/40 dark:bg-white/5 text-foreground/70 border-border dark:border-white/10 hover:bg-muted dark:hover:bg-white/10"
                    }`}
                  >
                    {TICKER_TOKENS[t].symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Balance */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 dark:bg-white/5">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Your Balance</p>
                <p className="text-lg font-semibold">{formatted}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Wallet</p>
                <p className="text-sm font-mono text-muted-foreground">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
              </div>
            </div>

            {/* Claim Button */}
            <Button
              onClick={handleClaim}
              disabled={isPending || isConfirming}
              className="w-full h-12 rounded-xl text-sm font-medium cursor-pointer bg-foreground text-background hover:bg-foreground/90"
            >
              {isPending ? (
                "Confirm in wallet..."
              ) : isConfirming ? (
                "Confirming..."
              ) : (
                <>
                  <Droplets className="h-4 w-4 mr-2" />
                  Claim 1,000 {token.symbol}
                </>
              )}
            </Button>

            {/* Success State */}
            {isSuccess && txHash && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-emerald-400 font-medium">Tokens claimed!</p>
                  <a
                    href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-400/70 hover:text-emerald-400 flex items-center gap-1 mt-0.5"
                  >
                    View on Arbiscan <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </motion.div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">
                  {error.message?.includes("User rejected")
                    ? "Transaction rejected"
                    : error.message?.toLowerCase().includes("insufficient funds") ||
                        error.message?.toLowerCase().includes("exceeds the balance")
                      ? "You need Arbitrum Sepolia ETH for gas. Get some free at faucet.arbitrum.io, then try again."
                      : (error.name as string).includes("ChainMismatch") ||
                          error.message?.includes("does not match the target chain")
                        ? "Wrong network — switch your wallet to Arbitrum Sepolia and try again."
                        : `Transaction failed: ${
                            (error as { shortMessage?: string }).shortMessage ??
                            error.message?.slice(0, 200)
                          }`}
                </p>
              </div>
            )}

            {/* Info */}
            <p className="text-xs text-muted-foreground/50 text-center">
              Mock tokenized stocks for testnet demonstration. Not real
              securities. Max 10,000 tokens per claim, 24h cooldown per token.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
