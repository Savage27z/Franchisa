"""
On-chain proposal submission to the FranchisaGovernanceRegistry contract.

Takes parsed proposal JSON from the Claude parser and submits it
to the Solidity registry on Arbitrum Sepolia via web3.py.
"""

import os
import json
from typing import Optional
from rich.console import Console

console = Console()

# ABI for registerMeeting function
REGISTRY_ABI = json.loads("""[
    {
        "inputs": [
            {"internalType": "bytes32", "name": "ticker", "type": "bytes32"},
            {"internalType": "string", "name": "companyName", "type": "string"},
            {"internalType": "uint256", "name": "meetingDate", "type": "uint256"},
            {"internalType": "uint8[]", "name": "proposalIds", "type": "uint8[]"},
            {"internalType": "string[]", "name": "titles", "type": "string[]"},
            {"internalType": "string[]", "name": "categories", "type": "string[]"},
            {"internalType": "string[]", "name": "descriptions", "type": "string[]"},
            {"internalType": "string[]", "name": "riskRatings", "type": "string[]"},
            {"internalType": "string[]", "name": "riskJustifications", "type": "string[]"},
            {"internalType": "string[]", "name": "boardRecommendations", "type": "string[]"},
            {"internalType": "bytes32", "name": "filingHash", "type": "bytes32"},
            {"internalType": "string", "name": "accessionNumber", "type": "string"}
        ],
        "name": "registerMeeting",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "ticker", "type": "bytes32"}
        ],
        "name": "getMeeting",
        "outputs": [
            {
                "components": [
                    {"internalType": "bytes32", "name": "ticker", "type": "bytes32"},
                    {"internalType": "string", "name": "companyName", "type": "string"},
                    {"internalType": "uint256", "name": "meetingDate", "type": "uint256"},
                    {"internalType": "uint256", "name": "registeredAt", "type": "uint256"},
                    {"internalType": "bool", "name": "isActive", "type": "bool"},
                    {"internalType": "uint8", "name": "proposalCount", "type": "uint8"},
                    {"internalType": "bytes32", "name": "filingHash", "type": "bytes32"},
                    {"internalType": "string", "name": "accessionNumber", "type": "string"},
                    {"internalType": "uint256", "name": "snapshotBlock", "type": "uint256"},
                    {"internalType": "uint256", "name": "meetingId", "type": "uint256"}
                ],
                "internalType": "struct FranchisaGovernanceRegistry.Meeting",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "ticker", "type": "bytes32"},
            {"internalType": "uint8", "name": "proposalId", "type": "uint8"}
        ],
        "name": "getResults",
        "outputs": [
            {"internalType": "uint256", "name": "yes", "type": "uint256"},
            {"internalType": "uint256", "name": "no", "type": "uint256"},
            {"internalType": "uint256", "name": "abstain", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "ticker", "type": "bytes32"},
            {"internalType": "uint8", "name": "proposalId", "type": "uint8"}
        ],
        "name": "getVoterCount",
        "outputs": [
            {"internalType": "uint256", "name": "", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "ticker", "type": "bytes32"},
            {"internalType": "uint8", "name": "proposalId", "type": "uint8"}
        ],
        "name": "getProposal",
        "outputs": [
            {
                "components": [
                    {"internalType": "uint8", "name": "proposalId", "type": "uint8"},
                    {"internalType": "string", "name": "title", "type": "string"},
                    {"internalType": "string", "name": "category", "type": "string"},
                    {"internalType": "string", "name": "description", "type": "string"},
                    {"internalType": "string", "name": "riskRating", "type": "string"},
                    {"internalType": "string", "name": "riskJustification", "type": "string"},
                    {"internalType": "string", "name": "boardRecommendation", "type": "string"}
                ],
                "internalType": "struct FranchisaGovernanceRegistry.Proposal",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getActiveMeetingCount",
        "outputs": [
            {"internalType": "uint256", "name": "count", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getRegisteredTickerCount",
        "outputs": [
            {"internalType": "uint256", "name": "", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]""")


def ticker_to_bytes32(ticker: str) -> bytes:
    """Convert a ticker string to bytes32 for Solidity."""
    return ticker.encode("utf-8").ljust(32, b"\x00")


def submit_meeting_onchain(
    parsed_data: dict,
    rpc_url: Optional[str] = None,
    private_key: Optional[str] = None,
    registry_address: Optional[str] = None,
) -> Optional[str]:
    """
    Submit parsed proposal data to the FranchisaGovernanceRegistry contract.

    Args:
        parsed_data: Output from parser.parse_proxy_statement()
        rpc_url: Arbitrum Sepolia RPC URL
        private_key: Agent wallet private key
        registry_address: Deployed registry contract address

    Returns:
        Transaction hash on success, None on failure
    """
    from web3 import Web3
    from eth_account import Account

    rpc_url = rpc_url or os.environ.get(
        "ARBITRUM_SEPOLIA_RPC", "https://sepolia-rollup.arbitrum.io/rpc"
    )
    private_key = private_key or os.environ.get("AGENT_PRIVATE_KEY")
    registry_address = registry_address or os.environ.get(
        "REGISTRY_CONTRACT_ADDRESS"
    )

    if not private_key:
        console.print("[red]AGENT_PRIVATE_KEY not set[/red]")
        return None
    if not registry_address:
        console.print("[red]REGISTRY_CONTRACT_ADDRESS not set[/red]")
        return None

    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            console.print("[red]Failed to connect to Arbitrum Sepolia RPC[/red]")
            return None

        account = Account.from_key(private_key)
        console.print(f"[cyan]Submitting from: {account.address}[/cyan]")

        registry = w3.eth.contract(
            address=Web3.to_checksum_address(registry_address),
            abi=REGISTRY_ABI,
        )

        # Prepare parameters
        ticker = parsed_data["ticker"]
        ticker_bytes32 = ticker_to_bytes32(ticker)
        company_name = parsed_data["companyName"]
        meeting_date = parsed_data["meetingDate"]

        proposals = parsed_data["proposals"]
        proposal_ids = [p["proposalId"] for p in proposals]
        titles = [p["title"] for p in proposals]
        categories = [p["category"] for p in proposals]
        descriptions = [p["description"] for p in proposals]
        risk_ratings = [p["riskRating"] for p in proposals]
        risk_justifications = [p["riskJustification"] for p in proposals]
        board_recs = [p["boardRecommendation"] for p in proposals]

        # Filing provenance — hash + accession from EDGAR (zero hash if absent)
        filing_hash_hex = parsed_data.get("filingHash") or "00" * 32
        filing_hash = bytes.fromhex(filing_hash_hex.removeprefix("0x"))
        accession_number = parsed_data.get("accessionNumber", "")

        # Build transaction with EIP-1559 fees
        nonce = w3.eth.get_transaction_count(account.address)
        latest_block = w3.eth.get_block("latest")
        base_fee = latest_block.get("baseFeePerGas", 100000000)
        max_priority = w3.to_wei(0.1, "gwei")
        max_fee = base_fee * 2 + max_priority

        tx = registry.functions.registerMeeting(
            ticker_bytes32,
            company_name,
            meeting_date,
            proposal_ids,
            titles,
            categories,
            descriptions,
            risk_ratings,
            risk_justifications,
            board_recs,
            filing_hash,
            accession_number,
        ).build_transaction(
            {
                "from": account.address,
                "nonce": nonce,
                "maxFeePerGas": max_fee,
                "maxPriorityFeePerGas": max_priority,
                "chainId": 421614,  # Arbitrum Sepolia
            }
        )

        # Estimate gas
        tx["gas"] = w3.eth.estimate_gas(tx)
        console.print(f"[dim]Estimated gas: {tx['gas']:,}[/dim]")

        # Sign and send
        signed_tx = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

        console.print(
            f"[yellow]Transaction sent: {tx_hash.hex()}[/yellow]"
        )
        console.print("[dim]Waiting for confirmation...[/dim]")

        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

        if receipt["status"] == 1:
            console.print(
                f"[green]Meeting registered on-chain![/green]\n"
                f"  Ticker: {ticker}\n"
                f"  Proposals: {len(proposals)}\n"
                f"  Tx: https://sepolia.arbiscan.io/tx/{tx_hash.hex()}\n"
                f"  Block: {receipt['blockNumber']}"
            )
            return tx_hash.hex()
        else:
            console.print(f"[red]Transaction reverted![/red]")
            return None

    except Exception as e:
        console.print(f"[red]Submission error: {e}[/red]")
        return None


def get_onchain_results(
    ticker: str,
    proposal_count: int,
    rpc_url: Optional[str] = None,
    registry_address: Optional[str] = None,
) -> Optional[list[dict]]:
    """
    Read vote results from the on-chain registry for all proposals of a meeting.

    Returns list of dicts with keys: proposalId, title, yesWeight, noWeight,
    abstainWeight, voterCount
    """
    from web3 import Web3

    rpc_url = rpc_url or os.environ.get(
        "ARBITRUM_SEPOLIA_RPC", "https://sepolia-rollup.arbitrum.io/rpc"
    )
    registry_address = registry_address or os.environ.get(
        "REGISTRY_CONTRACT_ADDRESS"
    )

    if not registry_address:
        console.print("[red]REGISTRY_CONTRACT_ADDRESS not set[/red]")
        return None

    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        registry = w3.eth.contract(
            address=Web3.to_checksum_address(registry_address),
            abi=REGISTRY_ABI,
        )

        ticker_bytes32 = ticker_to_bytes32(ticker)
        results = []

        for pid in range(1, proposal_count + 1):
            # Get proposal details
            proposal = registry.functions.getProposal(
                ticker_bytes32, pid
            ).call()

            # Get vote results
            yes, no, abstain = registry.functions.getResults(
                ticker_bytes32, pid
            ).call()

            # Get voter count
            voter_count = registry.functions.getVoterCount(
                ticker_bytes32, pid
            ).call()

            total = yes + no + abstain
            results.append(
                {
                    "proposalId": pid,
                    "title": proposal[1],  # title field
                    "yesWeight": str(yes),
                    "noWeight": str(no),
                    "abstainWeight": str(abstain),
                    "yesPercentage": f"{(yes / total * 100):.2f}%"
                    if total > 0
                    else "0.00%",
                    "noPercentage": f"{(no / total * 100):.2f}%"
                    if total > 0
                    else "0.00%",
                    "abstainPercentage": f"{(abstain / total * 100):.2f}%"
                    if total > 0
                    else "0.00%",
                    "voterCount": voter_count,
                }
            )

        return results

    except Exception as e:
        console.print(f"[red]Error reading on-chain results: {e}[/red]")
        return None
