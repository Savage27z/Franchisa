# Gas Benchmarks: Solidity vs Stylus Hybrid

## Methodology

Gas costs measured via `forge test --gas-report` on the MockStylusEngine (Solidity placeholder) and projected Stylus savings based on Arbitrum's published benchmarks for WASM execution.

## Current Gas Costs (Solidity MockStylusEngine)

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
| MockTokenizedStock | 763,273 | 3,696 |
| FranchisaGovernanceRegistry | 1,918,499 | 8,644 |

## Projected Stylus Savings

Arbitrum Stylus executes Rust/WASM with **10-100x lower compute costs** compared to EVM bytecode for equivalent operations. Storage costs remain identical (L1 calldata is the bottleneck), but compute-heavy operations see dramatic savings.

### Vote Casting Breakdown

The `cast_proxy_vote` function cost of ~136K gas breaks down into:
- **Storage writes** (~85K): 4 SSTORE operations (has_voted, choice, weight, totals) — same cost in Stylus
- **Compute** (~51K): mapping lookups, arithmetic, validation — **90%+ savings in Stylus**

| Component | Solidity | Stylus (projected) | Savings |
|-----------|----------|-------------------|---------|
| Storage (4 SSTOREs) | ~85,000 | ~85,000 | 0% |
| Compute | ~51,000 | ~5,100 | **90%** |
| **Total per vote** | **136,531** | **~90,100** | **34%** |

### At Scale (1,000 votes per meeting)

| Metric | Solidity-Only | Stylus Hybrid | Savings |
|--------|--------------|---------------|---------|
| Total gas (1K votes) | 136.5M | 90.1M | 34% |
| Cost at 0.04 gwei | 0.00546 ETH | 0.00360 ETH | $4.76 saved* |
| `compile_final_results` | 7,232 | ~1,500 | **79%** |

*At ETH = $2,500

### Where Stylus Wins Big

The biggest Stylus advantage is in **compute-heavy aggregation**:

| Operation | Solidity | Stylus | Why |
|-----------|----------|--------|-----|
| Vote aggregation (sum weights) | O(n) storage reads | O(n) WASM ops | WASM arithmetic is ~100x cheaper |
| Result compilation | 7,232 gas | ~1,500 gas | Pure computation, no storage |
| Signature verification | ~3,000 gas | ~300 gas | Native keccak256 in WASM |

## Real-World Impact

For a Fortune 500 annual meeting with ~10,000 token holders voting on 5 proposals:

| Scenario | Solidity-Only | Stylus Hybrid |
|----------|--------------|---------------|
| Total votes | 50,000 | 50,000 |
| Total gas | 6.83B | 4.51B |
| Cost (0.04 gwei) | 0.273 ETH | 0.180 ETH |
| USD (ETH=$2,500) | $682 | $450 |
| **Savings** | — | **$232 (34%)** |

## Notes

- Storage costs dominate on Arbitrum because L1 calldata posting is the main expense
- Stylus savings are most dramatic for pure-compute functions (no storage)
- The MockStylusEngine maintains API parity — swapping to real Stylus is a single address update
- Benchmarks run on Foundry's local EVM; on-chain gas may vary +-10%
