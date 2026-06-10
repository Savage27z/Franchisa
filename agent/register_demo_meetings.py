"""
Register demo meetings on-chain for the Franchisa hackathon demo.
Uses the deployer key (which is an authorized agent) to register
multiple company meetings with realistic SEC proxy proposals.

Each meeting includes a keccak256 filing hash and EDGAR accession number
for verifiable provenance — anyone can fetch the filing, hash it,
and verify the proposals were derived from that exact document.
"""

import os
import sys
import time
import hashlib

# Add parent dir to path
sys.path.insert(0, os.path.dirname(__file__))

from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

RPC_URL = os.environ.get("ARBITRUM_SEPOLIA_RPC", "https://sepolia-rollup.arbitrum.io/rpc")
PRIVATE_KEY = os.environ.get("AGENT_PRIVATE_KEY")
REGISTRY_ADDRESS = os.environ.get("REGISTRY_CONTRACT_ADDRESS")

REGISTRY_ABI = [
    {
        "inputs": [
            {"name": "ticker", "type": "bytes32"},
            {"name": "companyName", "type": "string"},
            {"name": "meetingDate", "type": "uint256"},
            {"name": "proposalIds", "type": "uint8[]"},
            {"name": "titles", "type": "string[]"},
            {"name": "categories", "type": "string[]"},
            {"name": "descriptions", "type": "string[]"},
            {"name": "riskRatings", "type": "string[]"},
            {"name": "riskJustifications", "type": "string[]"},
            {"name": "boardRecommendations", "type": "string[]"},
            {"name": "filingHash", "type": "bytes32"},
            {"name": "accessionNumber", "type": "string"},
        ],
        "name": "registerMeeting",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]


def ticker_to_bytes32(ticker: str) -> bytes:
    return ticker.encode("utf-8").ljust(32, b"\x00")


def compute_filing_hash(filing_text: str) -> bytes:
    """Compute keccak256 hash of filing text, matching Solidity's keccak256."""
    return Web3.solidity_keccak(["string"], [filing_text])


# Demo filing texts — in production these come from real EDGAR DEF 14A filings.
# Each is a synthetic summary representing the type of content the agent would
# parse from SEC EDGAR. The hash is stored on-chain for verifiable provenance.
DEMO_FILING_TEXTS = {
    "TSLA": "Tesla Inc DEF 14A Proxy Statement FY2026 - Annual Meeting July 18 2026. Proposals: Board Election (11 nominees), Auditor Ratification (PwC), Executive Compensation Advisory Vote, Shareholder Proposal on Lobbying Transparency.",
    "AAPL": "Apple Inc DEF 14A Proxy Statement FY2026 - Annual Meeting July 8 2026. Proposals: Board Election (8 nominees), 2022 Employee Stock Plan Amendment (+200M shares), Shareholder Proposal on AI Transparency.",
    "NVDA": "NVIDIA Corporation DEF 14A Proxy Statement FY2026 - Annual Meeting August 2 2026. Proposals: Board Election (13 nominees), Executive Compensation Advisory Vote, Shareholder Proposal on Dual-Class Stock Sunset.",
    "MSFT": "Microsoft Corporation DEF 14A Proxy Statement FY2026 - Annual Meeting June 30 2026. Proposals: Board Election (12 nominees), Auditor Ratification (Deloitte), Executive Compensation Advisory Vote, Shareholder Proposals on AI Risk and Gender Pay Gap.",
}


DEMO_MEETINGS = [
    {
        "ticker": "TSLA",
        "companyName": "Tesla, Inc.",
        "meetingDate": 1784332800,  # July 18, 2026
        "accessionNumber": "0001193125-26-150234",  # Synthetic but realistic format
        "proposals": [
            {
                "proposalId": 1,
                "title": "Election of Board of Directors",
                "category": "Board Election",
                "description": "Vote to elect 11 nominees to serve on the Board of Directors until the next annual meeting.",
                "riskRating": "Low",
                "riskJustification": "Standard annual board election with incumbent nominees.",
                "boardRecommendation": "For",
            },
            {
                "proposalId": 2,
                "title": "Ratification of Independent Auditor",
                "category": "Auditor Ratification",
                "description": "Ratify the appointment of PricewaterhouseCoopers LLP as independent registered public accounting firm for FY2026.",
                "riskRating": "Low",
                "riskJustification": "Routine auditor ratification. PwC has served as auditor since 2020.",
                "boardRecommendation": "For",
            },
            {
                "proposalId": 3,
                "title": "Advisory Vote on Executive Compensation",
                "category": "Executive Compensation",
                "description": "Non-binding advisory vote to approve the compensation of named executive officers as disclosed in the proxy statement.",
                "riskRating": "Medium",
                "riskJustification": "CEO compensation package significantly exceeds industry median. Previous say-on-pay received 63% approval.",
                "boardRecommendation": "For",
            },
            {
                "proposalId": 4,
                "title": "Shareholder Proposal: Report on Lobbying Activities",
                "category": "Shareholder Proposal",
                "description": "Shareholder proposal requesting the company publish an annual report detailing lobbying expenditures and policy positions.",
                "riskRating": "Low",
                "riskJustification": "Non-binding transparency request. Similar proposals at peer companies received 25-40% support.",
                "boardRecommendation": "Against",
            },
        ],
    },
    {
        "ticker": "AAPL",
        "companyName": "Apple Inc.",
        "meetingDate": 1783468800,  # July 8, 2026
        "accessionNumber": "0001193125-26-142567",
        "proposals": [
            {
                "proposalId": 1,
                "title": "Election of Board of Directors",
                "category": "Board Election",
                "description": "Vote to elect 8 director nominees to the Apple Inc. Board of Directors.",
                "riskRating": "Low",
                "riskJustification": "Standard board election. All nominees are well-qualified incumbents.",
                "boardRecommendation": "For",
            },
            {
                "proposalId": 2,
                "title": "Amendment to 2022 Employee Stock Plan",
                "category": "Executive Compensation",
                "description": "Approve an amendment to increase the share reserve under the 2022 Employee Stock Plan by 200 million shares.",
                "riskRating": "Medium",
                "riskJustification": "Dilution impact of ~1.3%. Necessary for talent retention but increases total shares outstanding.",
                "boardRecommendation": "For",
            },
            {
                "proposalId": 3,
                "title": "Shareholder Proposal: AI Transparency Report",
                "category": "Shareholder Proposal",
                "description": "Shareholder proposal requesting Apple publish annual reports on AI system capabilities, training data, and ethical safeguards.",
                "riskRating": "Low",
                "riskJustification": "Non-binding transparency measure. Growing investor interest in AI governance.",
                "boardRecommendation": "Against",
            },
        ],
    },
    {
        "ticker": "NVDA",
        "companyName": "NVIDIA Corporation",
        "meetingDate": 1785628800,  # Aug 2, 2026
        "accessionNumber": "0001193125-26-163890",
        "proposals": [
            {
                "proposalId": 1,
                "title": "Election of Board of Directors",
                "category": "Board Election",
                "description": "Elect 13 director nominees to the NVIDIA Board of Directors for the upcoming fiscal year.",
                "riskRating": "Low",
                "riskJustification": "Standard annual election. Board diversity exceeds governance benchmarks.",
                "boardRecommendation": "For",
            },
            {
                "proposalId": 2,
                "title": "Advisory Vote on Executive Compensation",
                "category": "Executive Compensation",
                "description": "Non-binding say-on-pay vote approving compensation of named executive officers including CEO Jensen Huang.",
                "riskRating": "High",
                "riskJustification": "CEO total compensation of $127M significantly exceeds semiconductor industry median. Stock performance justifies but magnitude is notable.",
                "boardRecommendation": "For",
            },
            {
                "proposalId": 3,
                "title": "Shareholder Proposal: Dual-Class Stock Sunset",
                "category": "Shareholder Proposal",
                "description": "Shareholder proposal requesting the Board adopt a policy to phase out the dual-class share structure within 7 years.",
                "riskRating": "Medium",
                "riskJustification": "Would significantly alter governance power dynamics. Supported by major proxy advisors.",
                "boardRecommendation": "Against",
            },
        ],
    },
    {
        "ticker": "MSFT",
        "companyName": "Microsoft Corporation",
        "meetingDate": 1782777600,  # June 30, 2026
        "accessionNumber": "0001193125-26-135678",
        "proposals": [
            {
                "proposalId": 1,
                "title": "Election of Board of Directors",
                "category": "Board Election",
                "description": "Elect 12 nominees to the Microsoft Board of Directors.",
                "riskRating": "Low",
                "riskJustification": "Routine election. All nominees meet independence requirements.",
                "boardRecommendation": "For",
            },
            {
                "proposalId": 2,
                "title": "Ratification of Deloitte & Touche as Auditor",
                "category": "Auditor Ratification",
                "description": "Ratify the appointment of Deloitte & Touche LLP as independent auditor for fiscal year 2026.",
                "riskRating": "Low",
                "riskJustification": "Standard auditor ratification. Deloitte has served as auditor since 1983.",
                "boardRecommendation": "For",
            },
            {
                "proposalId": 3,
                "title": "Advisory Vote on Executive Compensation",
                "category": "Executive Compensation",
                "description": "Non-binding advisory vote on the compensation of named executive officers.",
                "riskRating": "Low",
                "riskJustification": "Compensation aligned with performance. Previous say-on-pay received 93% approval.",
                "boardRecommendation": "For",
            },
            {
                "proposalId": 4,
                "title": "Shareholder Proposal: Report on AI Risk Management",
                "category": "Shareholder Proposal",
                "description": "Request that Microsoft publish an annual report assessing risks from generative AI deployment including misinformation and workforce displacement.",
                "riskRating": "Medium",
                "riskJustification": "Highly relevant given Microsoft's $13B OpenAI investment and Copilot rollout.",
                "boardRecommendation": "Against",
            },
            {
                "proposalId": 5,
                "title": "Shareholder Proposal: Median Gender Pay Gap Report",
                "category": "Shareholder Proposal",
                "description": "Request the company report on the median pay gap between male and female employees across all levels.",
                "riskRating": "Low",
                "riskJustification": "Non-binding transparency request. Microsoft already publishes some pay equity data.",
                "boardRecommendation": "Against",
            },
        ],
    },
]


def main():
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not w3.is_connected():
        print("ERROR: Cannot connect to RPC")
        return

    account = Account.from_key(PRIVATE_KEY)
    registry = w3.eth.contract(
        address=Web3.to_checksum_address(REGISTRY_ADDRESS), abi=REGISTRY_ABI
    )

    print(f"Deployer: {account.address}")
    print(f"Registry: {REGISTRY_ADDRESS}")
    print(f"Balance:  {w3.from_wei(w3.eth.get_balance(account.address), 'ether')} ETH")
    print(f"Meetings to register: {len(DEMO_MEETINGS)}\n")

    nonce = w3.eth.get_transaction_count(account.address)

    for meeting in DEMO_MEETINGS:
        ticker = meeting["ticker"]
        proposals = meeting["proposals"]

        # Compute filing hash from demo filing text
        filing_text = DEMO_FILING_TEXTS[ticker]
        filing_hash = compute_filing_hash(filing_text)
        accession = meeting["accessionNumber"]

        print(f"--- Registering {ticker} ({len(proposals)} proposals) ---")
        print(f"  Filing hash: {filing_hash.hex()}")
        print(f"  Accession:   {accession}")

        # Use EIP-1559 fees
        latest = w3.eth.get_block("latest")
        base_fee = latest.get("baseFeePerGas", 100000000)
        max_priority = w3.to_wei(0.1, "gwei")
        max_fee = base_fee * 2 + max_priority

        tx = registry.functions.registerMeeting(
            ticker_to_bytes32(ticker),
            meeting["companyName"],
            meeting["meetingDate"],
            [p["proposalId"] for p in proposals],
            [p["title"] for p in proposals],
            [p["category"] for p in proposals],
            [p["description"] for p in proposals],
            [p["riskRating"] for p in proposals],
            [p["riskJustification"] for p in proposals],
            [p["boardRecommendation"] for p in proposals],
            filing_hash,
            accession,
        ).build_transaction(
            {
                "from": account.address,
                "nonce": nonce,
                "maxFeePerGas": max_fee,
                "maxPriorityFeePerGas": max_priority,
                "chainId": 421614,
            }
        )

        tx["gas"] = w3.eth.estimate_gas(tx)
        print(f"  Gas estimate: {tx['gas']:,}")

        signed = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        print(f"  Tx sent: {tx_hash.hex()}")

        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        if receipt["status"] == 1:
            print(f"  SUCCESS! Block: {receipt['blockNumber']}")
            print(f"  https://sepolia.arbiscan.io/tx/{tx_hash.hex()}")
        else:
            print(f"  REVERTED!")

        nonce += 1
        time.sleep(1)  # Small delay between txs

    print(f"\nDone! Remaining balance: {w3.from_wei(w3.eth.get_balance(account.address), 'ether')} ETH")


if __name__ == "__main__":
    main()
