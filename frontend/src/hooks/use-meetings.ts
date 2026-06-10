"use client";

import { useReadContract, useReadContracts, useAccount } from "wagmi";
import {
  REGISTRY_ABI,
  CONTRACT_ADDRESSES,
  tickerToBytes32,
  bytes32ToTicker,
} from "@/lib/contracts";
import type { Meeting, Proposal } from "@/lib/mock-data";
import { MOCK_MEETINGS } from "@/lib/mock-data";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const registryAddress = CONTRACT_ADDRESSES.registry as `0x${string}`;
const isDeployed = registryAddress !== ZERO_ADDRESS;

/**
 * Fetch the total number of registered tickers from the on-chain registry.
 */
export function useRegisteredTickerCount() {
  return useReadContract({
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: "getRegisteredTickerCount",
    query: { enabled: isDeployed },
  });
}

/**
 * Fetch a single on-chain meeting by ticker symbol.
 */
export function useOnChainMeeting(ticker: string) {
  const tickerBytes = tickerToBytes32(ticker);

  const { data: meetingData, isLoading: meetingLoading } = useReadContract({
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: "getMeeting",
    args: [tickerBytes],
    query: { enabled: isDeployed },
  });

  return { meetingData, meetingLoading };
}

/**
 * Fetch all on-chain proposals for a given ticker and count.
 */
export function useOnChainProposals(ticker: string, proposalCount: number) {
  const tickerBytes = tickerToBytes32(ticker);

  const contracts = Array.from({ length: proposalCount }, (_, i) => ({
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: "getProposal" as const,
    args: [tickerBytes, i + 1] as const,
  }));

  return useReadContracts({
    contracts,
    query: { enabled: isDeployed && proposalCount > 0 },
  });
}

/**
 * Hook that returns meeting data, preferring on-chain data when available.
 * Falls back to mock data for meetings not registered on-chain.
 */
export function useMeetings(): {
  meetings: Meeting[];
  isLoading: boolean;
  isOnChain: boolean;
} {
  // Read the on-chain meeting header for every known ticker
  const { data: headers } = useReadContracts({
    contracts: MOCK_MEETINGS.map((m) => ({
      address: registryAddress,
      abi: REGISTRY_ABI,
      functionName: "getMeeting" as const,
      args: [tickerToBytes32(m.ticker)] as const,
    })),
    query: { enabled: isDeployed },
  });

  // If contracts not deployed, use pure mock data
  if (!isDeployed) {
    return { meetings: MOCK_MEETINGS, isLoading: false, isOnChain: false };
  }

  // Merge on-chain headers (company name, dates, counts, status) over the
  // mock entries; detail pages fetch full proposal metadata from chain.
  const meetings = MOCK_MEETINGS.map((mock, i) => {
    const result = headers?.[i];
    if (result?.status !== "success" || !result.result) return mock;
    const m = result.result as unknown as {
      companyName: string;
      meetingDate: bigint;
      registeredAt: bigint;
      isActive: boolean;
      proposalCount: number;
    };
    if (!m.companyName) return mock;
    return {
      ...mock,
      companyName: m.companyName,
      meetingDate: new Date(Number(m.meetingDate) * 1000)
        .toISOString()
        .split("T")[0],
      registeredAt: new Date(Number(m.registeredAt) * 1000)
        .toISOString()
        .split("T")[0],
      isActive: m.isActive,
      proposalCount: m.proposalCount,
    };
  });

  return {
    meetings,
    isLoading: false,
    isOnChain: true,
  };
}

/**
 * Hook to get a single meeting with on-chain proposal data for detail page.
 * This is the key hook for wiring real voting to the frontend.
 */
export function useMeetingDetail(ticker: string) {
  const tickerBytes = tickerToBytes32(ticker);

  // Get meeting info from chain
  const { data: meetingData, isLoading: meetingLoading } = useReadContract({
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: "getMeeting",
    args: [tickerBytes],
    query: { enabled: isDeployed },
  });

  // Check if meeting exists on chain
  const meeting = meetingData as
    | {
        ticker: `0x${string}`;
        companyName: string;
        meetingDate: bigint;
        registeredAt: bigint;
        isActive: boolean;
        proposalCount: number;
      }
    | undefined;

  const hasOnChainData = meeting && meeting.companyName !== "";
  const onChainCount = hasOnChainData ? meeting.proposalCount : 0;

  // Fetch the real proposal metadata from the registry
  const { data: proposalData, isLoading: proposalsLoading } =
    useOnChainProposals(ticker, onChainCount);

  // Get mock data as fallback
  const mockMeeting = MOCK_MEETINGS.find(
    (m) => m.ticker.toLowerCase() === ticker.toLowerCase()
  );

  type OnChainProposal = {
    proposalId: number;
    title: string;
    category: string;
    description: string;
    riskRating: string;
    riskJustification: string;
    boardRecommendation: string;
  };

  const onChainProposals: Proposal[] =
    proposalData
      ?.filter((r) => r.status === "success" && r.result)
      .map((r) => {
        const p = r.result as unknown as OnChainProposal;
        return {
          proposalId: Number(p.proposalId),
          title: p.title,
          category: p.category,
          description: p.description,
          riskRating: p.riskRating as Proposal["riskRating"],
          riskJustification: p.riskJustification,
          boardRecommendation:
            p.boardRecommendation as Proposal["boardRecommendation"],
          yesWeight: 0n,
          noWeight: 0n,
          abstainWeight: 0n,
          voterCount: 0,
        };
      }) ?? [];

  return {
    meeting: hasOnChainData
      ? {
          ticker: ticker.toUpperCase(),
          companyName: meeting.companyName,
          meetingDate: new Date(
            Number(meeting.meetingDate) * 1000
          ).toISOString().split("T")[0],
          registeredAt: new Date(
            Number(meeting.registeredAt) * 1000
          ).toISOString().split("T")[0],
          isActive: meeting.isActive,
          proposalCount: meeting.proposalCount,
          proposals:
            onChainProposals.length > 0
              ? onChainProposals
              : mockMeeting?.proposals ?? [],
          totalVoters: mockMeeting?.totalVoters ?? 0,
        }
      : mockMeeting ?? null,
    isOnChain: !!hasOnChainData,
    isLoading: meetingLoading || proposalsLoading,
    proposalCount: hasOnChainData
      ? meeting.proposalCount
      : mockMeeting?.proposalCount ?? 0,
  };
}
