"use client";

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useSwitchChain,
} from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { REGISTRY_ABI, MOCK_TOKEN_ABI, CONTRACT_ADDRESSES, tickerToBytes32 } from "@/lib/contracts";

/**
 * Hook that ensures the wallet is on Arbitrum Sepolia before a write,
 * prompting the wallet to switch (and add the network) if needed.
 */
function useEnsureArbitrumSepolia() {
  // useAccount().chainId is the wallet's ACTUAL chain (undefined if the
  // wallet is on a network outside the app config). useChainId() would
  // only return the app's configured chain and miss the mismatch.
  const { chainId: walletChainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  return async () => {
    if (walletChainId !== arbitrumSepolia.id) {
      await switchChainAsync({ chainId: arbitrumSepolia.id });
    }
  };
}

/**
 * Hook to submit a vote on-chain via the FranchisaGovernanceRegistry.
 */
export function useSubmitVote() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const ensureChain = useEnsureArbitrumSepolia();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const submitVote = async (ticker: string, proposalId: number, choice: number) => {
    reset(); // clear any stale error from a previous attempt
    try {
      await ensureChain();
    } catch {
      return; // user declined the network switch
    }
    writeContract({
      address: CONTRACT_ADDRESSES.registry as `0x${string}`,
      chainId: arbitrumSepolia.id,
      abi: REGISTRY_ABI,
      functionName: "submitVote",
      args: [tickerToBytes32(ticker), proposalId, choice],
    });
  };

  return {
    submitVote,
    txHash: hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to read vote results for a proposal from the on-chain registry.
 */
export function useVoteResults(ticker: string, proposalId: number) {
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.registry as `0x${string}`,
      chainId: arbitrumSepolia.id,
    abi: REGISTRY_ABI,
    functionName: "getResults",
    args: [tickerToBytes32(ticker), proposalId],
  });

  const [yes, no, abstain] = (data as [bigint, bigint, bigint]) || [0n, 0n, 0n];
  const total = yes + no + abstain;

  return {
    yes,
    no,
    abstain,
    total,
    yesPercent: total > 0n ? Number((yes * 10000n) / total) / 100 : 0,
    noPercent: total > 0n ? Number((no * 10000n) / total) / 100 : 0,
    abstainPercent: total > 0n ? Number((abstain * 10000n) / total) / 100 : 0,
    isLoading,
    refetch,
  };
}

/**
 * Hook to check if the current user has already voted on a proposal.
 */
export function useHasVoted(ticker: string, proposalId: number) {
  const { address } = useAccount();

  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.registry as `0x${string}`,
      chainId: arbitrumSepolia.id,
    abi: REGISTRY_ABI,
    functionName: "hasUserVoted",
    args: address ? [address, tickerToBytes32(ticker), proposalId] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    hasVoted: data as boolean | undefined,
    isLoading,
  };
}

/**
 * Hook to get the current user's balance of a tokenized stock.
 * Defaults to the mTSLA token for backwards compatibility.
 */
export function useTokenBalance(
  tokenAddress?: `0x${string}`,
  symbol: string = "mTSLA"
) {
  const { address } = useAccount();
  const token = tokenAddress ?? (CONTRACT_ADDRESSES.mockToken as `0x${string}`);

  const { data, isLoading, refetch } = useReadContract({
    address: token,
    chainId: arbitrumSepolia.id,
    abi: MOCK_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    balance: data as bigint | undefined,
    formatted: data
      ? `${(Number(data) / 1e18).toLocaleString()} ${symbol}`
      : `0 ${symbol}`,
    isLoading,
    refetch,
  };
}

/**
 * Hook to claim testnet tokens from a tokenized stock's faucet.
 */
export function useFaucet() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const ensureChain = useEnsureArbitrumSepolia();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const claimTokens = async (
    amount: bigint = BigInt("1000000000000000000000"),
    tokenAddress?: `0x${string}`
  ) => {
    if (!address) return;
    reset(); // clear any stale error from a previous attempt
    try {
      await ensureChain();
    } catch {
      return; // user declined the network switch
    }
    writeContract({
      address: tokenAddress ?? (CONTRACT_ADDRESSES.mockToken as `0x${string}`),
      chainId: arbitrumSepolia.id,
      abi: MOCK_TOKEN_ABI,
      functionName: "faucet",
      args: [address, amount],
    });
  };

  return {
    claimTokens,
    txHash: hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
