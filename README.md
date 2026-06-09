# Franchisa

**Corporate Governance On-Chain** — A Web2-to-Web3 bridge that connects SEC proxy voting to tokenized stockholder voting on Arbitrum.

Franchisa lets holders of tokenized stocks (RWA tokens like mTSLA, mAAPL) participate in real corporate governance decisions — board elections, executive compensation votes, shareholder proposals — that are sourced directly from SEC EDGAR filings and executed on-chain with cryptographic proof.

---

## Table of Contents

- [The Problem](#the-problem)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Why Stylus?](#why-stylus)
- [Live Demo](#live-demo)
- [Deployed Contracts](#deployed-contracts-arbitrum-sepolia)
- [Getting Started](#getting-started)
- [Smart Contracts](#smart-contracts)
- [AI Agent](#ai-agent)
- [Frontend](#frontend)
- [Gas Benchmarks](#gas-benchmarks)
- [Governance Proof](#governance-proof)
- [Security](#security)
- [Threat Model — Known Limitations](#threat-model--known-limitations)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [License](#license)

---

## The Problem

When a publicly traded company like Tesla holds a shareholder vote, the SEC requires it to be filed as a **DEF 14A proxy statement**. Traditional shareholders vote through brokerages like Fidelity or Vanguard.

But a growing class of investors hold **tokenized versions** of these stocks on platforms like Robinhood Chain and other RWA (Real-World Asset) protocols. These token holders own economic exposure to the stock, but they are completely **locked out of the corporate governance process**. Their tokens don't connect back to the SEC filing system, and there's no mechanism for on-chain voting on real corporate proposals.

This creates a governance gap: millions of tokenized stockholders with no voice in the companies they're invested in.

**Franchisa closes this gap** by building an autonomous pipeline from SEC filings to on-chain votes to custodian-verifiable proofs.

---

## How It Works

```
SEC EDGAR (DEF 14A proxy filings)
        |
        v
  [AI Agent]  ---- Observe, parse, validate, submit
        |
        v
  [Governance Registry]  ---- On-chain proposal storage (Solidity)
        |
        v
  [Voting Engine]  ---- Weighted vote aggregation (Rust/Stylus)
        |
        v
  [Governance Proof]  ---- ECDSA-signed results for custodians
```

### End-to-End Flow

1. **OBSERVE** — The AI agent monitors SEC EDGAR for new DEF 14A proxy filings across a watchlist of tickers (TSLA, AAPL, NVDA, MSFT, etc.)
2. **PARSE** — When a filing is detected, Claude AI extracts structured proposal data: titles, categories, risk ratings, board recommendations
3. **VALIDATE** — The agent validates completeness (ticker match, proposal count, valid dates) and assigns risk assessments
4. **SUBMIT** — Validated proposals are pushed on-chain to the FranchisaGovernanceRegistry contract on Arbitrum Sepolia
5. **VOTE** — Tokenized stockholders connect their wallet, see the proposals, and cast weighted votes (For / Against / Abstain). Vote weight equals their token balance
6. **AGGREGATE** — The Rust/Stylus voting engine aggregates all votes with proper weighting, preventing double-voting
7. **PROVE** — Final results are packaged into a cryptographically signed governance proof (ECDSA on secp256k1) that custodians like Robinhood or DTCC can independently verify

---

## Architecture

| Component | Language | Framework | Role |
|-----------|----------|-----------|------|
| **AI Ingestion Agent** | Python 3.11+ | Click CLI, Rich, web3.py | Autonomous filing watcher, SEC EDGAR parser, on-chain submitter |
| **Governance Registry** | Solidity 0.8.20 | OpenZeppelin, Foundry | Meeting/proposal storage, vote routing, token balance validation |
| **Voting Engine** | Rust | Arbitrum Stylus SDK | High-performance weighted vote aggregation (WASM on-chain) |
| **Mock Stylus Engine** | Solidity 0.8.20 | Foundry | API-identical Solidity placeholder (Stylus can't compile on Windows) |
| **Mock Tokenized Stock** | Solidity 0.8.20 | OpenZeppelin ERC-20 | mTSLA token with public faucet for testnet demos |
| **Governance Proof** | Python | eth_account, ECDSA | Tamper-proof signed result export for custodian ingestion |
| **Frontend** | TypeScript | Next.js 16, wagmi v3, RainbowKit v2 | Wallet-connected governance dashboard with live on-chain data |

---

## Tech Stack

### Smart Contracts
- **Solidity 0.8.20** with `via-ir` compilation
- **OpenZeppelin** Ownable, IERC20
- **Foundry** (forge, cast) for build, test, deploy
- **Arbitrum Stylus SDK** for Rust WASM contracts
- **EIP-1559** gas pricing for all transactions

### Agent
- **Python 3.11+** with Click CLI framework
- **Rich** for terminal UI (tables, panels, progress bars)
- **web3.py** for Arbitrum Sepolia interaction
- **Claude AI** (Anthropic API) for SEC filing parsing
- **ECDSA** (eth_account) for proof signing

### Frontend
- **Next.js 16** App Router with TypeScript
- **wagmi v3** + **viem** for contract reads/writes
- **RainbowKit v2** for wallet connection
- **Tailwind CSS** + **shadcn/ui** for styling
- **Framer Motion** for animations
- Custom **Liquid Glass** button component with SVG filter effects

---

## Why Stylus?

The voting engine is written in **Rust** and targets **Arbitrum Stylus** (compiles to WASM that runs alongside the EVM) for a specific technical reason:

**Vote aggregation is compute-heavy.** Summing weighted votes across thousands of token holders, preventing double-votes, and compiling final results involves iteration and arithmetic that the EVM handles inefficiently. Stylus executes this same logic as native WASM with:

- **90%+ gas savings** on pure compute operations (result compilation, signature verification)
- **34% total savings** per vote (storage costs stay the same, compute drops dramatically)
- **No API changes** — the Solidity interface is identical; swapping from MockStylusEngine to the real Stylus deployment is a single address update

See [`GAS_BENCHMARKS.md`](./GAS_BENCHMARKS.md) for detailed forge gas report data and Solidity-vs-Stylus comparisons.

> **Note:** The Stylus contract cannot currently be compiled on Windows due to a `native_keccak256` linker error. A `MockStylusEngine.sol` with an identical interface is deployed as a drop-in placeholder. The Rust source is at `contracts/stylus/src/lib.rs` and is ready for Linux/CI compilation.

---

## Live Demo

| Resource | Link |
|----------|------|
| Frontend | [franchisa.vercel.app](https://franchisa.vercel.app) |
| Registry on Arbiscan | [View Contract](https://sepolia.arbiscan.io/address/0xca55b1c8ce1d15109417Db6f3D987C8B903F9f45) |
| Engine on Arbiscan | [View Contract](https://sepolia.arbiscan.io/address/0xF7D8891eB22Be860c2F666CcBFB2D81d28229aa1) |
| Token on Arbiscan | [View Contract](https://sepolia.arbiscan.io/address/0xDac5c91f20AB2419a5069c99e8cD7a0291E65B1b) |
| mTSLA on Robinhood Chain | [View Contract (Verified)](https://explorer.testnet.chain.robinhood.com/address/0x4956dB7e5604B197C8a44eDb165a6e530C4848C3) |

---

## Deployed Contracts (Arbitrum Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| **FranchisaGovernanceRegistry** | [`0xca55b1c8ce1d15109417Db6f3D987C8B903F9f45`](https://sepolia.arbiscan.io/address/0xca55b1c8ce1d15109417Db6f3D987C8B903F9f45) | Meeting registration, vote routing, token balance checks |
| **MockStylusEngine** | [`0xF7D8891eB22Be860c2F666CcBFB2D81d28229aa1`](https://sepolia.arbiscan.io/address/0xF7D8891eB22Be860c2F666CcBFB2D81d28229aa1) | Vote storage and aggregation (Solidity stand-in for Stylus) |
| **MockTokenizedStock (mTSLA)** | [`0xDac5c91f20AB2419a5069c99e8cD7a0291E65B1b`](https://sepolia.arbiscan.io/address/0xDac5c91f20AB2419a5069c99e8cD7a0291E65B1b) | ERC-20 tokenized stock with public faucet |
| **Agent/Deployer** | [`0xD78D1D5Dd356DECc696192D68b2cd046266D3046`](https://sepolia.arbiscan.io/address/0xD78D1D5Dd356DECc696192D68b2cd046266D3046) | Authorized agent that submits proposals |

**Chain**: Arbitrum Sepolia (Chain ID `421614`)

### Robinhood Chain Testnet (Chain ID `46630`)

| Contract | Address | Purpose |
|----------|---------|---------|
| **MockTokenizedStock (mTSLA)** | [`0x4956dB7e5604B197C8a44eDb165a6e530C4848C3`](https://explorer.testnet.chain.robinhood.com/address/0x4956dB7e5604B197C8a44eDb165a6e530C4848C3) | ERC-20 tokenized stock on Robinhood's financial-grade L2 (verified) |

**Currently Registered Meetings (Arbitrum Sepolia):**

| Ticker | Company | Proposals | Meeting Date |
|--------|---------|-----------|-------------|
| TSLA | Tesla, Inc. | 4 (Board, Auditor, Exec Comp, Lobbying) | July 18, 2026 |
| AAPL | Apple Inc. | 3 (Board, Stock Plan, AI Transparency) | July 8, 2026 |
| NVDA | NVIDIA Corporation | 3 (Board, Exec Comp, Dual-Class Sunset) | Aug 2, 2026 |
| MSFT | Microsoft Corporation | 5 (Board, Auditor, Exec Comp, AI Risk, Pay Gap) | June 30, 2026 |

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Frontend |
| Python | 3.11+ | AI Agent |
| Foundry | Latest | Smart contract build/test/deploy |
| Rust (nightly) | Latest | Stylus contract compilation (Linux/macOS only) |
| Git | 2.0+ | Version control |

### Clone and Setup

```bash
git clone https://github.com/Savage27z/Franchisa.git
cd Franchisa
```

---

## Smart Contracts

### Build

```bash
cd contracts/solidity
forge install       # Install OpenZeppelin + forge-std
forge build         # Compile with via-ir
```

### Test

```bash
forge test -vv      # Run all 34 tests with verbose output
```

**Test coverage:**
- 13 tests for `FranchisaGovernanceRegistry` (registration, voting, closing, access control, edge cases)
- 6 tests for `MockStylusEngine` auth guard (owner checks, registry-only voting, direct call rejection)

### Deploy

```bash
# Set your deployer private key
export DEPLOYER_PRIVATE_KEY=0x...

# Deploy to Arbitrum Sepolia
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast --via-ir
```

The deploy script automatically:
1. Deploys MockStylusEngine
2. Deploys MockTokenizedStock (mTSLA)
3. Deploys FranchisaGovernanceRegistry (linked to engine + token)
4. Calls `engine.setAuthorizedRegistry(registry)` to lock the engine
5. Authorizes the deployer as an agent

### Contract Details

**FranchisaGovernanceRegistry.sol** — The central contract. Stores meeting data (ticker, company name, date, proposals with titles/categories/risk ratings/board recommendations). Routes votes through the Stylus engine. Enforces `onlyAgent` for registration and validates token balances before voting.

**MockStylusEngine.sol** — API-identical Solidity implementation of the Rust voting engine. Stores votes per-voter per-proposal, tracks aggregated weights by choice (Yes/No/Abstain), and prevents double-voting. Protected by an `onlyRegistry` modifier so votes can only be cast through the registry, not by direct calls.

**MockTokenizedStock.sol** — Standard ERC-20 "Mock Tokenized TSLA" (mTSLA) with a public `faucet()` function (max 10,000 tokens per call) for testnet demos.

### Stylus Contract

```bash
cd contracts/stylus

# Check compilation (Linux/macOS only)
cargo stylus check --endpoint https://sepolia-rollup.arbitrum.io/rpc

# Deploy (Linux/macOS only)
cargo stylus deploy --endpoint https://sepolia-rollup.arbitrum.io/rpc --private-key $DEPLOYER_PRIVATE_KEY
```

> The Stylus Rust source at `contracts/stylus/src/lib.rs` mirrors the MockStylusEngine exactly. Once deployed from a Linux environment, swapping is a single `setAuthorizedRegistry` call.

---

## AI Agent

The agent runs a **7-step observable reasoning loop**:

```
OBSERVE -> DECIDE -> PARSE -> VALIDATE -> SUBMIT -> VERIFY -> PROVE
```

### Setup

```bash
cd agent
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your keys (see Environment Variables below)
```

### Commands

```bash
# Full autonomous loop — watch, parse, submit, prove
python agent.py run

# Single ticker
python agent.py run --ticker TSLA

# Demo mode (uses synthetic data, no API keys needed)
python agent.py run --demo

# Manually fetch and parse a filing
python agent.py fetch --ticker TSLA

# Watch mode — poll EDGAR every N hours
python agent.py watch

# Generate governance proof for a ticker
python agent.py proof --ticker TSLA --demo-mode

# Verify a governance proof file
python agent.py verify franchisa_proof_TSLA.json

# View on-chain registry status
python agent.py status
```

### Agent Reasoning Steps

| Step | Action | Output |
|------|--------|--------|
| **OBSERVE** | Query SEC EDGAR API for DEF 14A filings | Filing URL + metadata |
| **DECIDE** | Check if filing is new, actionable, not duplicate | Go/no-go decision |
| **PARSE** | Send filing text to Claude AI for structured extraction | Proposals with titles, categories, risk ratings |
| **VALIDATE** | Verify ticker match, proposal count, dates, data completeness | Validation report |
| **SUBMIT** | Build and send `registerMeeting` transaction via web3.py | Transaction hash |
| **VERIFY** | Read back on-chain state and confirm it matches submitted data | Block confirmation |
| **PROVE** | Generate ECDSA-signed governance proof JSON | Signed proof file |

---

## Frontend

### Setup

```bash
cd frontend
npm install        # Uses legacy-peer-deps for wagmi v3 / RainbowKit v2 compat
npm run dev        # http://localhost:3000
```

### Build for Production

```bash
npm run build      # Generates static + SSR pages
npm start          # Production server
```

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Hero section, architecture diagram, trust indicators |
| `/dashboard` | Governance Dashboard | Active meetings with on-chain stats, proposal counts |
| `/dashboard/[ticker]` | Meeting Detail | Individual proposals with voting interface |
| `/faucet` | Token Faucet | Claim mTSLA tokens for testnet voting |
| `/proof` | Proof Export | View and verify governance proof JSON |
| `/profile` | Profile | Connected wallet info and vote history |

### Key Components

- **ProposalCard** — Voting interface with For/Against/Abstain buttons, live results, "On-Chain" badge, Arbiscan tx links
- **StatsBar** — Reads `getActiveMeetingCount` and `getRegisteredTickerCount` directly from the registry
- **ConnectWalletButton** — Custom RainbowKit wrapper with Liquid Glass styling and wrong-network detection
- **LiquidButton** — Glass morphism button with SVG `feTurbulence` + `feDisplacementMap` filter effects

### Wallet Connection

The frontend uses **RainbowKit v2** for wallet connection with **Arbitrum Sepolia** as the target network. When a user connects on the wrong chain, they're prompted to switch. Vote weight is determined by the user's `mTSLA` token balance at the time of voting.

---

## Gas Benchmarks

Measured via `forge test --gas-report`. Full breakdown in [`GAS_BENCHMARKS.md`](./GAS_BENCHMARKS.md).

| Operation | Solidity Gas | Stylus (projected) | Savings |
|-----------|-------------|-------------------|---------|
| `cast_proxy_vote` | 136,531 | ~90,100 | **34%** |
| `compile_final_results` | 7,232 | ~1,500 | **79%** |
| Vote aggregation (compute) | ~51,000 | ~5,100 | **90%** |

At scale (10,000 voters, 5 proposals per meeting):
- **Solidity-only**: ~$682 at ETH $2,500
- **Stylus hybrid**: ~$450 — saving **$232 per meeting**

---

## Governance Proof

Franchisa generates **custodian-grade cryptographic proofs** that attest a vote was:
1. Sourced from a real SEC EDGAR filing
2. Validated by the AI agent
3. Executed on-chain through the voting engine
4. Signed with ECDSA (secp256k1) by the authorized agent

See [`PROOF_SPEC.md`](./PROOF_SPEC.md) for the full v1 specification including:
- JSON proof schema
- ECDSA signature construction and verification
- Agent trace format (7-step audit trail)
- On-chain verification via `ecrecover`

### Quick Verify

```bash
cd agent
python agent.py verify franchisa_proof_TSLA.json
```

This recovers the signer address from the ECDSA signature and confirms it matches the authorized agent on the registry contract.

---

## Security

### Engine Auth Guard

The voting engine (`MockStylusEngine` / Rust `ProxyOracle`) enforces an **`onlyRegistry` modifier** — only the `FranchisaGovernanceRegistry` contract can call `cast_proxy_vote`. This prevents vote forgery by direct calls to the engine.

```
User -> Registry (validates token balance) -> Engine (records vote)
           ^                                       ^
     msg.sender = user                      msg.sender = registry (enforced)
```

### Access Control

- **Meeting registration**: `onlyAgent` modifier — only addresses authorized by the contract owner
- **Vote casting**: Requires non-zero voting power at snapshot block (ERC20Votes `getPastVotes`)
- **Engine registry lock**: `onlyOwner` can call `setAuthorizedRegistry` — set once at deployment
- **Double-vote prevention**: Per-voter per-proposal flag in the engine
- **Emergency pause**: `Pausable` modifier on both `registerMeeting` and `submitVote` — owner can halt all operations
- **Reentrancy protection**: `ReentrancyGuard` on `submitVote` — defends against token contracts with transfer hooks (e.g. ERC-777)
- **Sequential proposal IDs**: `registerMeeting` enforces `proposalIds[i] == i + 1` — prevents phantom proposals from gaps

### Vote Integrity

- **Snapshot voting**: Vote weight = `getPastVotes(voter, snapshotBlock)` — balance is locked at the block when the meeting was registered, preventing transfer-and-vote attacks
- **ERC20Votes token**: mTSLA uses OpenZeppelin's `ERC20Votes` with auto-delegation on faucet/mint
- **Meeting date enforcement**: `require(block.timestamp < meetingDate)` — votes rejected after the meeting date passes
- **Meeting epochs**: Each `registerMeeting` assigns a monotonically increasing `meetingId` nonce. Engine storage is keyed by `(ticker, meetingId, proposalId)` — closing and re-registering the same ticker starts a clean epoch with no stale vote flags
- **Ticker deduplication**: `_tickerRegistered` mapping prevents the registered tickers array from inflating on re-registration
- Choice validation: only 0 (No), 1 (Yes), 2 (Abstain) accepted
- Proposal ID validation: must match registered proposals
- Meeting must be active (not closed)
- Faucet rate-limited: 24h cooldown per address, 50k max balance cap
- Ticker deduplication: `registeredTickers` array doesn't grow on re-registration

### Filing Provenance

Each registered meeting stores **verifiable provenance** linking on-chain proposals to the original SEC filing:

- `filingHash` — `keccak256` of the raw DEF 14A filing text from EDGAR
- `accessionNumber` — SEC EDGAR accession number (e.g. `0001193125-26-150234`)

Anyone can fetch the filing from EDGAR using the accession number, hash it, and verify the proposals were derived from that exact document. This turns the governance proof from "trust the agent" into **verifiable provenance**.

### Threat Model — Known Limitations

This is a hackathon prototype. The following limitations are acknowledged and would be addressed in production:

| Threat | Status | Production Fix |
|--------|--------|----------------|
| **Single-key admin** | Deployer key controls registry, engine swap, agent auth | Multisig owner (Gnosis Safe) + timelock for config changes |
| **Faucet Sybil** | Rate-limited but attacker can use many EOAs | Production uses real RWA tokens from custodians, no faucet |
| **Agent key = proof signer** | Same key registers meetings and signs proofs | Separate signing key with HSM; proof signed via EIP-712 typed data |
| **No governance timelock** | `setStylusEngine` can swap engine mid-meeting | Timelock contract (48h delay) on all admin functions |
| **EDGAR content injection** | Filing text passed to Claude could contain prompt injection | Schema-validate parsed output with Pydantic; restrict allowed categories |
| ~~**Engine lacks meeting epochs**~~ | ~~Old vote flags leak if same ticker re-registered~~ | **FIXED** — `meetingId` nonce isolates engine storage per epoch (v2 deploy) |

---

## Project Structure

```
Franchisa/
  contracts/
    solidity/                       # Foundry project
      src/
        FranchisaGovernanceRegistry.sol   # Central governance registry
        MockStylusEngine.sol              # Voting engine (Solidity stand-in)
        MockTokenizedStock.sol            # ERC20Votes mTSLA with faucet + auto-delegation
      test/
        FranchisaGovernanceRegistry.t.sol # 26 registry + voting + snapshot tests
        MockStylusEngineAuth.t.sol        # 6 engine auth tests
      script/
        Deploy.s.sol                      # Full deployment script
      lib/                                # forge-std, OpenZeppelin
      foundry.toml                        # Foundry config (via-ir, optimizer)
    stylus/                         # Rust/Stylus project
      src/
        lib.rs                            # ProxyOracle voting engine (Rust)
      Cargo.toml
  agent/                            # Python AI agent
    agent.py                              # CLI entry point (7-step reasoning loop)
    edgar.py                              # SEC EDGAR API client
    parser.py                             # Claude AI proxy statement parser
    submitter.py                          # On-chain tx submission (web3.py, EIP-1559)
    proof_export.py                       # Governance proof generator + verifier
    register_demo_meetings.py             # Demo data registration script
    .env                                  # Agent config (not committed)
    requirements.txt
  frontend/                         # Next.js 16 App Router
    src/
      app/
        page.tsx                          # Landing page (hero, architecture, trust)
        (app)/
          dashboard/page.tsx              # Governance dashboard
          dashboard/[ticker]/page.tsx     # Meeting detail + voting
          faucet/page.tsx                 # Token faucet
          proof/page.tsx                  # Proof export view
          profile/page.tsx                # Wallet profile
      components/
        navbar.tsx                        # Fixed nav with tubelight tabs
        connect-wallet-button.tsx         # RainbowKit + Liquid Glass
        proposal-card.tsx                 # Voting UI with on-chain integration
        stats-bar.tsx                     # Live on-chain stats
        meeting-card.tsx                  # Dashboard meeting cards
        hero.tsx                          # Landing page hero
        web3-provider.tsx                 # wagmi + RainbowKit setup
        ui/                               # shadcn/ui + custom components
          liquid-glass-button.tsx         # Glass morphism SVG filter button
          tubelight-navbar.tsx            # Animated nav indicator
          starfield.tsx                   # Particle background
      hooks/
        use-governance.ts                 # wagmi hooks for voting (submitVote, hasVoted, getResults)
        use-meetings.ts                   # Meeting data hooks (on-chain + mock fallback)
      lib/
        contracts.ts                      # ABIs, addresses, chain config
        wagmi.ts                          # wagmi client configuration
        mock-data.ts                      # Fallback data for unregistered tickers
        utils.ts                          # Tailwind merge utilities
    .env.local                            # Frontend env (not committed)
    .npmrc                                # legacy-peer-deps for wagmi/RainbowKit compat
    package.json
  PROOF_SPEC.md                     # Governance proof specification (v1)
  GAS_BENCHMARKS.md                 # Solidity vs Stylus gas comparison
  .gitignore
  README.md
```

---

## Environment Variables

### Agent (`agent/.env`)

```env
# Required for full agent mode
ANTHROPIC_API_KEY=sk-ant-...          # Claude API key for SEC filing parsing

# Arbitrum Sepolia
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
AGENT_PRIVATE_KEY=0x...               # Private key of authorized agent wallet

# Contract addresses (set after deployment)
REGISTRY_CONTRACT_ADDRESS=0x...
STYLUS_ENGINE_ADDRESS=0x...
TOKEN_CONTRACT_ADDRESS=0x...
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...   # Get free at https://cloud.walletconnect.com
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_STYLUS_ADDRESS=0x...
NEXT_PUBLIC_TOKEN_ADDRESS=0x...
```

---

## Testing

### Smart Contract Tests

```bash
cd contracts/solidity
forge test -vv                    # 34 tests, verbose
forge test --gas-report           # With gas profiling
forge test --match-contract Auth  # Only auth guard tests
```

**Test Suite (34 tests):**

| Test | What It Verifies |
|------|-----------------|
| `test_registerMeeting` | Meeting stored correctly with all proposal data |
| `test_registerMeeting_onlyAgent` | Non-agents cannot register meetings |
| `test_registerMeeting_nonSequentialIds_reverts` | Proposal IDs must be sequential 1..N |
| `test_submitVote` | Vote recorded with correct weight |
| `test_submitVote_noTokens` | Zero-balance wallets rejected |
| `test_submitVote_invalidChoice` | Choice > 2 reverts |
| `test_submitVote_invalidProposal` | Non-existent proposal ID reverts |
| `test_closeMeeting` | Meeting set to inactive |
| `test_closeMeeting_clearsStaleProposals` | Stale proposal data deleted on close |
| `test_closeMeeting_preventsVoting` | Votes blocked after close |
| `test_getActiveMeetingCount_cached` | O(1) cached counter tracks active meetings |
| `test_getProposal` | Individual proposal data retrieval |
| `test_duplicateMeetingReverts` | Can't register same ticker twice |
| `test_multipleVoters` | Multiple voters with correct weight aggregation |
| `test_doubleVotePrevented` | Same voter can't vote twice on same proposal |
| `test_pause_blocksVoting` | Emergency pause halts all voting |
| `test_unpause_resumesVoting` | Unpause resumes normal operation |
| `test_faucet_cooldown` | 24h rate limit on faucet claims |
| `test_faucet_maxBalance` | 50k token cap on faucet balance |
| `test_submitVote_usesSnapshotWeight` | Vote weight from snapshot block, not current balance |
| `test_submitVote_afterMeetingDate_reverts` | Votes rejected after meeting date passes |
| `test_registerMeeting_tickerDeduplication` | Re-registering ticker doesn't duplicate in array |
| `test_faucet_autoDelegates` | Faucet auto-delegates for immediate voting power |
| `test_filingHash_storedOnChain` | Filing hash and accession number stored in meeting |
| `test_filingHash_verifiable` | Anyone can reconstruct hash from original filing text |
| `test_meetingEpoch_freshVotingAfterReRegister` | Close + re-register same ticker allows fresh voting (epoch isolation) |
| `test_meetingNonce_increments` | Meeting nonce increments and is stored per meeting |
| `test_voteWeightsSumCannotExceedSupply` | Total vote weight ≤ token supply (invariant) |
| `test_ownerCanSetRegistry` | Owner sets authorized registry |
| `test_nonOwnerCannotSetRegistry` | Non-owner rejected |
| `test_voteSucceedsFromRegistry` | Registry can cast votes |
| `test_voteRevertsFromNonRegistry` | Direct calls blocked |
| `test_voteWorksBeforeRegistrySet` | Open access when registry is zero address |
| `test_ownerIsImmutable` | Owner is set at deployment |

### Frontend

```bash
cd frontend
npm run build     # Type-check + build (catches type errors)
npm run lint      # ESLint
```

---

## Hackathon

Built for the [Arbitrum Open House London Online Buildathon](https://arbitrum-london.hackquest.io/buildathons/Arbitrum-Open-House-London-Online-Buildathon) (May 25 - June 14, 2026).

**Prize Tracks:**
- **Best Agentic Project** ($15K) — 7-step autonomous AI agent with observable reasoning loop
- **Robinhood Chain Track** — Mock tokenized stock simulating Robinhood Chain RWA assets
- **General Track** ($70K) — Full-stack Web2-to-Web3 governance bridge
- **Grants** ($30K USDC)

---

## License

MIT
