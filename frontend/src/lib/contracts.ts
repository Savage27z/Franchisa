/**
 * Contract ABIs and addresses for the Franchisa governance system.
 *
 * These are used by wagmi hooks to interact with the deployed contracts
 * on Arbitrum Sepolia.
 */

// ─── Chain Config ────────────────────────────────────────────────────────────

export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
export const ROBINHOOD_TESTNET_CHAIN_ID = 46630;

// ─── Contract Addresses (update after deployment) ────────────────────────────

export const CONTRACT_ADDRESSES = {
  registry: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000",
  stylusEngine: process.env.NEXT_PUBLIC_STYLUS_ADDRESS || "0x0000000000000000000000000000000000000000",
  mockToken: process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000",
} as const;

// ─── Robinhood Chain Testnet Addresses ──────────────────────────────────────

export const ROBINHOOD_ADDRESSES = {
  mockToken: process.env.NEXT_PUBLIC_ROBINHOOD_TOKEN_ADDRESS || "0x4956dB7e5604B197C8a44eDb165a6e530C4848C3",
} as const;

// ─── Registry ABI (read + write functions we need) ───────────────────────────

export const REGISTRY_ABI = [
  // Write
  {
    inputs: [
      { name: "ticker", type: "bytes32" },
      { name: "proposalId", type: "uint8" },
      { name: "choice", type: "uint8" },
    ],
    name: "submitVote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Read
  {
    inputs: [{ name: "ticker", type: "bytes32" }, { name: "proposalId", type: "uint8" }],
    name: "getResults",
    outputs: [
      { name: "yes", type: "uint256" },
      { name: "no", type: "uint256" },
      { name: "abstain", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "ticker", type: "bytes32" }, { name: "proposalId", type: "uint8" }],
    name: "getVoterCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "voter", type: "address" },
      { name: "ticker", type: "bytes32" },
      { name: "proposalId", type: "uint8" },
    ],
    name: "hasUserVoted",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "voter", type: "address" },
      { name: "ticker", type: "bytes32" },
      { name: "proposalId", type: "uint8" },
    ],
    name: "getUserVote",
    outputs: [
      { name: "choice", type: "uint256" },
      { name: "weight", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "ticker", type: "bytes32" }],
    name: "getMeeting",
    outputs: [
      {
        components: [
          { name: "ticker", type: "bytes32" },
          { name: "companyName", type: "string" },
          { name: "meetingDate", type: "uint256" },
          { name: "registeredAt", type: "uint256" },
          { name: "isActive", type: "bool" },
          { name: "proposalCount", type: "uint8" },
          { name: "filingHash", type: "bytes32" },
          { name: "accessionNumber", type: "string" },
          { name: "snapshotBlock", type: "uint256" },
          { name: "meetingId", type: "uint256" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "ticker", type: "bytes32" }, { name: "proposalId", type: "uint8" }],
    name: "getProposal",
    outputs: [
      {
        components: [
          { name: "proposalId", type: "uint8" },
          { name: "title", type: "string" },
          { name: "category", type: "string" },
          { name: "description", type: "string" },
          { name: "riskRating", type: "string" },
          { name: "riskJustification", type: "string" },
          { name: "boardRecommendation", type: "string" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getActiveMeetingCount",
    outputs: [{ name: "count", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getRegisteredTickerCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "registeredTickers",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "voter", type: "address" },
      { indexed: true, name: "ticker", type: "bytes32" },
      { indexed: false, name: "proposalId", type: "uint8" },
      { indexed: false, name: "choice", type: "uint8" },
      { indexed: false, name: "weight", type: "uint256" },
    ],
    name: "VoteSubmitted",
    type: "event",
  },
] as const;

// ─── Mock Token ABI ──────────────────────────────────────────────────────────

export const MOCK_TOKEN_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "faucet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "account", type: "address" },
      { name: "timepoint", type: "uint256" },
    ],
    name: "getPastVotes",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "delegates",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "delegatee", type: "address" }],
    name: "delegate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a ticker string to bytes32 for contract calls.
 */
export function tickerToBytes32(ticker: string): `0x${string}` {
  const hex = Buffer.from(ticker, "utf-8").toString("hex").padEnd(64, "0");
  return `0x${hex}` as `0x${string}`;
}

/**
 * Convert a bytes32 value back to a ticker string.
 */
export function bytes32ToTicker(bytes32: string): string {
  const hex = bytes32.replace("0x", "").replace(/0+$/, "");
  return Buffer.from(hex, "hex").toString("utf-8");
}
