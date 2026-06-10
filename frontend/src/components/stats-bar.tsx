"use client";

import { motion } from "framer-motion";
import { useReadContract, useReadContracts } from "wagmi";
import {
  REGISTRY_ABI,
  CONTRACT_ADDRESSES,
  tickerToBytes32,
} from "@/lib/contracts";
import { MOCK_MEETINGS } from "@/lib/mock-data";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const registryAddress = CONTRACT_ADDRESSES.registry as `0x${string}`;
const isDeployed = registryAddress !== ZERO_ADDRESS;

export function StatsBar() {
  const { data: onChainCount } = useReadContract({
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: "getActiveMeetingCount",
    query: { enabled: isDeployed },
  });

  const { data: tickerCount } = useReadContract({
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: "getRegisteredTickerCount",
    query: { enabled: isDeployed },
  });

  // Sum real proposal counts from the on-chain meeting headers
  const { data: headers } = useReadContracts({
    contracts: MOCK_MEETINGS.map((m) => ({
      address: registryAddress,
      abi: REGISTRY_ABI,
      functionName: "getMeeting" as const,
      args: [tickerToBytes32(m.ticker)] as const,
    })),
    query: { enabled: isDeployed },
  });

  const activeMeetings = onChainCount ? Number(onChainCount) : 0;
  const totalOnChain = tickerCount ? Number(tickerCount) : 0;

  const totalProposals = (headers ?? []).reduce((acc, r) => {
    if (r.status !== "success" || !r.result) return acc;
    const m = r.result as unknown as { isActive: boolean; proposalCount: number };
    return m.isActive ? acc + Number(m.proposalCount) : acc;
  }, 0);

  const stats = [
    {
      label: "Active Meetings",
      value: activeMeetings > 0 ? activeMeetings.toString() : "—",
    },
    {
      label: "Total Proposals",
      value: totalProposals > 0 ? totalProposals.toString() : "—",
    },
    {
      label: "On-Chain",
      value: totalOnChain > 0 ? `${totalOnChain} registered` : "Connecting...",
    },
    {
      label: "Network",
      value: "Arbitrum Sepolia",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl border border-border overflow-hidden bg-muted/50 dark:bg-white/5">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: i * 0.04 }}
          className="bg-card/80 dark:bg-white/[0.03] backdrop-blur-sm p-5"
        >
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
            {stat.label}
          </p>
          <p className="text-lg font-semibold tracking-tight text-foreground/90">
            {stat.value}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
