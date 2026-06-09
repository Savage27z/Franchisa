# Franchisa

**Corporate Governance On-Chain — Bridging SEC Proxy Voting to Tokenized Stockholders on Arbitrum**

> Built for the [Arbitrum Open House London Online Buildathon](https://arbitrum-london.hackquest.io/buildathons/Arbitrum-Open-House-London-Online-Buildathon) (May 25 - June 14, 2026)

---

## The Problem

When Tesla holds a shareholder vote, the SEC requires it to be filed as a proxy statement (DEF 14A). Real shareholders vote through their brokers. But people holding **tokenized versions** of that stock on Robinhood Chain or other RWA platforms are completely cut out — their tokens don't connect back to the corporate voting system.

**Franchisa fixes this.**

## How It Works

```
SEC EDGAR (public filings)
        |
        v
[AI Agent] — Watches for new proxy filings, parses with Claude AI
        |
        v
[Governance Registry] — Stores proposals on Arbitrum (Solidity)
        |
        v
[Voting Engine] — High-performance vote aggregation (Rust/Stylus)
        |
        v
[Governance Proof] — Cryptographically signed results for custodians
```

1. An **AI agent** autonomously monitors SEC EDGAR for new DEF 14A proxy filings
2. It parses dense legal documents into plain-English voting proposals using **Claude AI**
3. Proposals are pushed on-chain to a **Solidity governance registry** on Arbitrum Sepolia
4. Tokenized stockholders **vote on-chain**, weighted by their token balance
5. Votes are aggregated in a **Rust/Stylus contract** — 90%+ cheaper than Solidity for compute-heavy operations
6. Final results are packaged with a **cryptographic proof** that custodians (Robinhood, DTCC) can verify and ingest

## Architecture

| Component | Tech | Purpose |
|-----------|------|---------|
| **AI Ingestion Agent** | Python, Claude API, SEC EDGAR | Autonomous filing detection, parsing, on-chain submission |
| **Governance Registry** | Solidity, OpenZeppelin, Arbitrum Sepolia | Meeting storage, vote validation, token balance checks |
| **Voting Engine** | Rust, Arbitrum Stylus SDK | High-performance weighted vote aggregation |
| **Governance Proof** | Python, ECDSA signing | Tamper-proof result packaging for custodian ingestion |
| **Frontend** | Next.js, RainbowKit, wagmi, Tailwind | Wallet-connected governance dashboard |

## Why Stylus?

The voting engine is written in **Rust** and deployed via **Arbitrum Stylus** because:

- Aggregating weighted votes across thousands of holders involves iteration-heavy computation
- Solidity would hit gas limits at scale for batch operations
- Rust via Stylus is **90%+ cheaper on gas** for these compute-heavy operations
- This is a real, measurable technical advantage — not a buzzword

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Rust (nightly) + cargo-stylus
- Foundry (forge, cast)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Smart Contracts

```bash
# Solidity (Foundry)
cd contracts/solidity
forge install
forge build
forge test

# Stylus (Rust)
cd contracts/stylus
cargo stylus check --endpoint https://sepolia-rollup.arbitrum.io/rpc
```

### AI Agent

```bash
cd agent
pip install -r requirements.txt
cp .env.example .env  # Fill in your keys

# Demo mode (no API calls needed)
python agent.py demo

# Fetch real filing from SEC EDGAR
python agent.py fetch --ticker TSLA

# Generate governance proof
python agent.py proof --ticker TSLA --demo-mode

# Verify a proof
python agent.py verify franchisa_proof_TSLA.json
```

## Deployed Contracts (Arbitrum Sepolia)

| Contract | Address |
|----------|---------|
| FranchisaGovernanceRegistry | `TBD` |
| ProxyOracle (Stylus) | `TBD` |
| MockTokenizedStock (mTSLA) | `TBD` |

## Project Structure

```
franchisa/
  contracts/
    solidity/          # Governance registry + mock token (Foundry)
      src/
        FranchisaGovernanceRegistry.sol
        MockTokenizedStock.sol
      test/
      script/
    stylus/            # Voting engine (Rust/Stylus)
      src/lib.rs
  agent/               # AI ingestion agent + proof export (Python)
    agent.py           # CLI entry point
    edgar.py           # SEC EDGAR API client
    parser.py          # Claude AI proxy statement parser
    submitter.py       # On-chain submission via web3.py
    proof_export.py    # Governance proof generator + verifier
  frontend/            # Next.js governance dashboard
    src/
      app/             # App Router pages
      components/      # UI components
      hooks/           # wagmi contract hooks
      lib/             # Contract ABIs, config
```

## Prize Tracks

- **Best Agentic Project** — Autonomous AI agent that watches SEC filings and pushes governance proposals on-chain
- **Robinhood Chain Track** — Mock tokenized stock simulating Robinhood Chain RWA assets
- **General Track** — Full-stack Web2-to-Web3 governance bridge with working end-to-end flow

## Team

Built with Claude Code.

## License

MIT
