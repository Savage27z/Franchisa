# Franchisa Governance Proof Specification

## Overview

Franchisa generates cryptographic governance proofs — signed attestations that a corporate proxy vote was ingested from SEC EDGAR, validated on-chain, and executed through the Arbitrum Stylus voting engine. These proofs serve as custodian-grade audit trails for institutional compliance.

## Proof Schema (v1)

```json
{
  "version": "1.0",
  "type": "franchisa-governance-proof",
  "timestamp": "2026-06-09T12:00:00Z",
  "chain": {
    "network": "arbitrum-sepolia",
    "chainId": 421614,
    "registryContract": "0x35b0dA10c9304aE5c4F08904ACC4D8901d537AE2",
    "stylusEngine": "0x224304493CF93c4ea7ad8904c2A43bcdb808cF2f",
    "tokenContract": "0xE2769d8731577608454Fc1Aeb080978134be7Fdf"
  },
  "meeting": {
    "ticker": "TSLA",
    "companyName": "Tesla, Inc.",
    "meetingDate": "2026-07-18T00:00:00Z",
    "source": "SEC EDGAR DEF 14A",
    "filingUrl": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=TSLA&type=DEF+14A"
  },
  "proposal": {
    "id": 1,
    "title": "Election of Board of Directors",
    "category": "Board Election"
  },
  "vote": {
    "voter": "0xD78D1D5Dd356DECc696192D68b2cd046266D3046",
    "choice": 1,
    "choiceLabel": "FOR",
    "weight": "1000000000000000000000",
    "weightFormatted": "1,000 mTSLA",
    "txHash": "0x...",
    "blockNumber": 12345678
  },
  "results": {
    "yes": "1000000000000000000000",
    "no": "0",
    "abstain": "0",
    "totalVoters": 1,
    "snapshotBlock": 12345678
  },
  "agentTrace": {
    "steps": ["OBSERVE", "DECIDE", "PARSE", "VALIDATE", "SUBMIT", "VERIFY", "PROVE"],
    "observeSource": "SEC EDGAR API",
    "parseModel": "claude-sonnet-4-20250514",
    "validateChecks": ["ticker_match", "proposal_count", "date_valid", "token_balance > 0"],
    "submitTxHash": "0x...",
    "verifyBlockConfirmations": 1
  },
  "signature": {
    "algorithm": "ECDSA-secp256k1",
    "signer": "0xD78D1D5Dd356DECc696192D68b2cd046266D3046",
    "message": "<keccak256 of canonical proof body>",
    "v": 28,
    "r": "0x...",
    "s": "0x..."
  }
}
```

## Signature Scheme

### Message Construction

The signed message is the Keccak-256 hash of the canonical proof body (all fields except `signature`), JSON-serialized with sorted keys and no whitespace:

```
message = keccak256(JSON.stringify(proofBody, sortedKeys, 0))
```

### Signing

The agent's private key signs the message using ECDSA on the secp256k1 curve (Ethereum's native signature scheme):

```python
from eth_account.messages import encode_defunct
from eth_account import Account

signable = encode_defunct(text=hex(message))
signed = Account.sign_message(signable, private_key=AGENT_KEY)
```

### Verification

Anyone can verify the proof:

1. Reconstruct the message hash from the proof body
2. Recover the signer address from (v, r, s)
3. Confirm the recovered address matches `signature.signer`
4. Confirm `signature.signer` is an authorized agent on the registry contract

```solidity
// On-chain verification
address recovered = ecrecover(messageHash, v, r, s);
require(registry.isAuthorizedAgent(recovered), "Invalid proof signer");
```

## Agent Trace

The `agentTrace` field captures the 7-step agentic reasoning loop:

| Step | Description | Verifiable |
|------|-------------|------------|
| OBSERVE | Fetch SEC EDGAR filing | Filing URL in proof |
| DECIDE | AI determines vote-worthy proposals | Model ID logged |
| PARSE | Extract proposal details from filing | Proposal data in proof |
| VALIDATE | Check ticker, dates, token balance | Validation checks listed |
| SUBMIT | Send vote transaction on-chain | Tx hash in proof |
| VERIFY | Wait for block confirmation | Block number in proof |
| PROVE | Generate and sign this proof | Signature in proof |

## Security Considerations

- **Agent key custody**: The signing key should be secured in a HSM or secure enclave for production. Demo uses a hot wallet.
- **Replay protection**: Each proof includes a unique `txHash` and `blockNumber`, preventing replay.
- **Data integrity**: The Keccak-256 hash covers all proof fields, any tampering invalidates the signature.
- **On-chain anchor**: Vote results can be independently verified by reading the Stylus engine contract state.

## Future Extensions (v2)

- Merkle tree of all votes for a meeting (single root hash)
- ZK proof that vote choice is valid without revealing it (private voting)
- Multi-sig proof requiring N-of-M agent signatures
- IPFS pinning of proof JSON with CID in on-chain event
