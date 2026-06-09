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
  // If contracts not deployed, use pure mock data
  if (!isDeployed) {
    return { meetings: MOCK_MEETINGS, isLoading: false, isOnChain: false };
  }

  // Use mock data but mark as potentially on-chain
  // The individual meeting pages will pull real on-chain data for voting
  return {
    meetings: MOCK_MEETINGS,
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

  // Get mock data as fallback
  const mockMeeting = MOCK_MEETINGS.find(
    (m) => m.ticker.toLowerCase() === ticker.toLowerCase()
  );

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
          proposals: mockMeeting?.proposals ?? [],
          totalVoters: mockMeeting?.totalVoters ?? 0,
        }
      : mockMeeting ?? null,
    isOnChain: !!hasOnChainData,
    isLoading: meetingLoading,
    proposalCount: hasOnChainData
      ? meeting.proposalCount
      : mockMeeting?.proposalCount ?? 0,
  };
}
