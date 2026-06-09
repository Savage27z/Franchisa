"use client";

import { motion } from "framer-motion";
import { Wallet, Vote, TrendingUp, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const mockProfile = {
  address: "0x1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0b",
  shortAddress: "0x1a2B...9a0b",
  totalVotes: 24,
  meetingsParticipated: 6,
  tokenHoldings: [
    { ticker: "TSLA", shares: "1,247", value: "$312,450" },
    { ticker: "AAPL", shares: "890", value: "$178,220" },
    { ticker: "NVDA", shares: "456", value: "$54,720" },
    { ticker: "MSFT", shares: "620", value: "$263,500" },
    { ticker: "AMZN", shares: "340", value: "$67,320" },
    { ticker: "GOOGL", shares: "510", value: "$91,800" },
  ],
  recentVotes: [
    { proposal: "Approval of Executive Compensation Plan", ticker: "TSLA", vote: "For", date: "Jun 8, 2026" },
    { proposal: "Shareholder Proposal on Responsible AI Deployment", ticker: "MSFT", vote: "For", date: "Jun 7, 2026" },
    { proposal: "Ratification of Ernst & Young as Auditor", ticker: "TSLA", vote: "For", date: "Jun 6, 2026" },
    { proposal: "Recapitalization to Eliminate Dual-Class Structure", ticker: "GOOGL", vote: "For", date: "Jun 5, 2026" },
    { proposal: "Shareholder Proposal on Warehouse Worker Safety", ticker: "AMZN", vote: "For", date: "Jun 3, 2026" },
    { proposal: "Shareholder Proposal on AI Transparency", ticker: "AAPL", vote: "Against", date: "May 28, 2026" },
  ],
};

export default function ProfilePage() {
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
          <code className="text-sm text-muted-foreground font-mono bg-muted/50 dark:bg-white/5 px-3 py-1 rounded-full border border-border dark:border-white/10">
            {mockProfile.shortAddress}
          </code>
          <Badge className="text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10">
            Connected
          </Badge>
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
          { icon: Vote, label: "Total Votes", value: mockProfile.totalVotes.toString() },
          { icon: TrendingUp, label: "Meetings", value: mockProfile.meetingsParticipated.toString() },
          { icon: Wallet, label: "Holdings", value: `${mockProfile.tokenHoldings.length} tokens` },
        ].map((stat) => (
          <div key={stat.label} className="bg-card/80 dark:bg-white/[0.03] p-5">
            <stat.icon className="h-4 w-4 text-muted-foreground/50 mb-2" />
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
              {stat.label}
            </p>
            <p className="text-lg font-semibold text-foreground/90">{stat.value}</p>
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
          {mockProfile.tokenHoldings.map((holding) => (
            <div
              key={holding.ticker}
              className="flex items-center justify-between p-4 rounded-xl border border-border dark:border-white/10 bg-card/80 dark:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-foreground">{holding.ticker}</span>
                <span className="text-xs text-muted-foreground">{holding.shares} shares</span>
              </div>
              <span className="text-sm font-medium text-foreground/70">{holding.value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Votes */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <p className="text-sm text-muted-foreground mb-4">Recent Votes</p>
        <div className="space-y-2">
          {mockProfile.recentVotes.map((vote, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border dark:border-white/10 bg-card/80 dark:bg-white/[0.03]"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground/80 mb-1 truncate">{vote.proposal}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{vote.ticker}</span>
                  <span className="text-xs text-muted-foreground/50">·</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {vote.date}
                  </span>
                </div>
              </div>
              <Badge
                className={`text-[10px] rounded-full ${
                  vote.vote === "For"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                } hover:bg-transparent`}
              >
                {vote.vote}
              </Badge>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
