# Gas Benchmarks

## Methodology

Gas costs measured via `forge test --gas-report` on Arbitrum Sepolia testnet contracts. All numbers are from the deployed Solidity MockStylusEngine. Stylus benchmarks will be added once the Rust engine is deployed (see below).

## Measured Gas Costs (Solidity MockStylusEngine)

| Operation | Min Gas | Avg Gas | Max Gas |
|-----------|---------|---------|---------|
| `cast_proxy_vote` | 24,629 | 99,222 | 136,531 |
| `compile_final_results` (view) | 7,232 | 7,232 | 7,232 |
| `setAuthorizedRegistry` | 21,580 | 38,125 | 43,641 |

### Registry Operations

| Operation | Min Gas | Avg Gas | Max Gas |
|-----------|---------|---------|---------|
| `registerMeeting` (4 proposals) | 33,365 | 447,699 | 516,722 |
| `submitVote` | 24,080 | 61,818 | 107,222 |
| `closeMeeting` | 30,146 | 30,146 | 30,146 |
| `setAgent` | 46,381 | 46,381 | 46,381 |
| `getResults` (view) | 13,040 | 13,040 | 13,040 |

### Deployment Costs

| Contract | Gas | Size (bytes) |
|----------|-----|-------------|
| MockStylusEngine | 368,370 | 1,508 |
| MockTokenizedStock (ERC20Votes) | ~940,000 | ~4,200 |
| FranchisaGovernanceRegistry | ~2,100,000 | ~9,500 |

## Stylus — Measured On-Chain

The Rust engine is deployed and activated on Arbitrum Sepolia at
[`0x5f4a788b9614b1177b7a75b5645aa955f6af82e1`](https://sepolia.arbiscan.io/address/0x5f4a788b9614b1177b7a75b5645aa955f6af82e1)
(7.9 KB WASM). Real vote transactions through the full path
(registry snapshot checks + Stylus `castProxyVote`):

| Operation | Gas (measured) | Tx |
|-----------|----------------|-----|
| `submitVote` end-to-end (AAPL P1) | 479,785 | [`0x7d488c95...c189`](https://sepolia.arbiscan.io/tx/0x7d488c95fcb11876d8381f9ddfec8feeec6556d0f066830f9f1df7d96cd4c189) |
| `submitVote` end-to-end (NVDA P1, real filing meeting) | 495,789 | on-chain |

These end-to-end numbers are not directly comparable to the engine-only unit
test figures above (different scope: registry validation + cross-contract
call + engine storage vs. isolated engine call). We do not publish projected
savings — only measured numbers with evidence.

Expected savings based on Arbitrum's architecture:
- **Storage writes** (~85K gas per vote): identical cost in Stylus (L1 calldata dominates)
- **Compute** (~51K gas per vote): WASM execution is 10-100x cheaper than EVM
- **View functions** (compile_final_results): pure computation, largest percentage savings

The MockStylusEngine maintains API parity — swapping to real Stylus is a single `setStylusEngine(address)` call.

## Notes

- Storage costs dominate on Arbitrum because L1 calldata posting is the main expense
- Benchmarks run on Foundry's local EVM; on-chain gas may vary ±10%
- Vote weight now uses `getPastVotes` (ERC20Votes snapshot) instead of `balanceOf`
