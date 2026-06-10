"use client";

import { motion } from "framer-motion";
import { MeetingCard } from "@/components/meeting-card";
import { StatsBar } from "@/components/stats-bar";
import { useReadContract, useReadContracts } from "wagmi";
import {
  REGISTRY_ABI,
  CONTRACT_ADDRESSES,
  bytes32ToTicker,
} from "@/lib/contracts";
import { MOCK_MEETINGS } from "@/lib/mock-data";
import type { Meeting } from "@/lib/mock-data";

const registryAddress = CONTRACT_ADDRESSES.registry as `0x${string}`;
const isDeployed =
  registryAddress !== "0x0000000000000000000000000000000000000000";

export default function DashboardPage() {
  // Get count of registered tickers from chain
  const { data: tickerCount } = useReadContract({
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: "getRegisteredTickerCount",
    query: { enabled: isDeployed },
  });

  const count = tickerCount ? Number(tickerCount) : 0;

  // Fetch all registered ticker bytes32 values
  const tickerContracts = Array.from({ length: count }, (_, i) => ({
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: "registeredTickers" as const,
    args: [BigInt(i)] as const,
  }));

  const { data: tickerResults } = useReadContracts({
    contracts: tickerContracts,
    query: { enabled: count > 0 },
  });

  // Fetch meeting data for each ticker
  const tickers = tickerResults
    ?.map((r) => (r.status === "success" ? (r.result as `0x${string}`) : null))
    .filter(Boolean) as `0x${string}`[] | undefined;

  const meetingContracts = (tickers ?? []).map((t) => ({
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: "getMeeting" as const,
    args: [t] as const,
  }));

  const { data: meetingResults, isLoading } = useReadContracts({
    contracts: meetingContracts,
    query: { enabled: (tickers ?? []).length > 0 },
  });

  // Build meetings list from on-chain data
  const onChainMeetings: Meeting[] = (meetingResults ?? [])
    .map((r, i) => {
      if (r.status !== "success" || !r.result) return null;
      const m = r.result as {
        ticker: `0x${string}`;
        companyName: string;
        meetingDate: bigint;
        registeredAt: bigint;
        isActive: boolean;
        proposalCount: number;
      };
      if (!m.companyName) return null;

      const ticker = bytes32ToTicker(tickers![i]);

      // Try to get proposal details from mock data for richer display
      const mockMatch = MOCK_MEETINGS.find(
        (mm) => mm.ticker.toUpperCase() === ticker.toUpperCase()
      );

      return {
        ticker: ticker.toUpperCase(),
        companyName: m.companyName,
        meetingDate: new Date(Number(m.meetingDate) * 1000)
          .toISOString()
          .split("T")[0],
        registeredAt: new Date(Number(m.registeredAt) * 1000)
          .toISOString()
          .split("T")[0],
        isActive: m.isActive,
        proposalCount: m.proposalCount,
        proposals: mockMatch?.proposals ?? [],
        // Real voter counts are read per-proposal on the detail page
        totalVoters: 0,
      } satisfies Meeting;
    })
    .filter(Boolean) as Meeting[];

  const meetings = onChainMeetings.length > 0 ? onChainMeetings : [];

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <p className="text-sm text-muted-foreground mb-2">Governance</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Active Meetings
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="mb-8"
      >
        <StatsBar />
      </motion.div>

      {isLoading ? (
        <div className="text-center py-16">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Loading on-chain meetings...
          </p>
        </div>
      ) : meetings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 rounded-2xl border border-border dark:border-white/10 bg-card/80 dark:bg-white/[0.03]"
        >
          <p className="text-muted-foreground">
            No active meetings registered on-chain.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map((meeting, i) => (
            <MeetingCard key={meeting.ticker} meeting={meeting} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
