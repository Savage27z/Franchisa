"""
Component D: Governance Proof Export

Queries the on-chain Stylus voting engine for final results,
packages them into a cryptographically signed JSON proof document
that custodians (Robinhood, DTCC, Broadridge) can verify and ingest.
"""

import json
import os
import time
from datetime import datetime, timezone
from typing import Optional
from rich.console import Console

console = Console()


def generate_governance_proof(
    ticker: str,
    company_name: str,
    meeting_date: str,
    proposal_count: int,
    rpc_url: Optional[str] = None,
    registry_address: Optional[str] = None,
    stylus_address: Optional[str] = None,
    private_key: Optional[str] = None,
) -> Optional[dict]:
    """
    Generate a cryptographic governance proof for a completed meeting vote.

    Reads final tallies from on-chain state and signs the result
    with the agent's private key for integrity verification.

    Args:
        ticker: Company ticker (e.g., "TSLA")
        company_name: Full company name
        meeting_date: Meeting date string (e.g., "2026-08-15")
        proposal_count: Number of proposals in the meeting
        rpc_url: Arbitrum Sepolia RPC URL
        registry_address: Registry contract address
        stylus_address: Stylus voting engine address
        private_key: Agent private key for signing

    Returns:
        Complete governance proof dict, or None on failure
    """
    from web3 import Web3
    from eth_account import Account
    from eth_account.messages import encode_defunct

    rpc_url = rpc_url or os.environ.get(
        "ARBITRUM_SEPOLIA_RPC", "https://sepolia-rollup.arbitrum.io/rpc"
    )
    registry_address = registry_address or os.environ.get(
        "REGISTRY_CONTRACT_ADDRESS"
    )
    stylus_address = stylus_address or os.environ.get("STYLUS_ENGINE_ADDRESS")
    private_key = private_key or os.environ.get("AGENT_PRIVATE_KEY")

    if not all([registry_address, stylus_address, private_key]):
        console.print(
            "[red]Missing required env vars: REGISTRY_CONTRACT_ADDRESS, "
            "STYLUS_ENGINE_ADDRESS, AGENT_PRIVATE_KEY[/red]"
        )
        return None

    try:
        # Import submitter for on-chain reads
        from submitter import get_onchain_results

        console.print(f"[cyan]Generating governance proof for {ticker}...[/cyan]")

        # Read on-chain results
        results = get_onchain_results(
            ticker=ticker,
            proposal_count=proposal_count,
            rpc_url=rpc_url,
            registry_address=registry_address,
        )

        if not results:
            console.print("[red]Failed to read on-chain results[/red]")
            return None

        # Calculate total unique voters (max across proposals)
        total_voters = max(r["voterCount"] for r in results) if results else 0

        # Build the proof payload (everything except signature)
        proof_payload = {
            "franchisa_governance_proof": {
                "version": "1.0.0",
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "network": "arbitrum-sepolia",
                "chainId": 421614,
                "contracts": {
                    "registry": registry_address,
                    "stylusEngine": stylus_address,
                },
                "meeting": {
                    "ticker": ticker,
                    "companyName": company_name,
                    "meetingDate": meeting_date,
                    "totalVoters": total_voters,
                },
                "results": results,
            }
        }

        # Sign the proof
        # Hash the entire payload (minus signature field) for signing
        payload_json = json.dumps(
            proof_payload, sort_keys=True, separators=(",", ":")
        )
        message = encode_defunct(text=payload_json)
        account = Account.from_key(private_key)
        signed = account.sign_message(message)

        # Add signature to the proof
        proof_payload["franchisa_governance_proof"]["signature"] = signed.signature.hex()
        proof_payload["franchisa_governance_proof"]["signer"] = account.address

        console.print(
            f"[green]✓ Governance proof generated and signed[/green]\n"
            f"  Ticker: {ticker}\n"
            f"  Proposals: {len(results)}\n"
            f"  Total voters: {total_voters}\n"
            f"  Signer: {account.address}"
        )

        return proof_payload

    except Exception as e:
        console.print(f"[red]Error generating proof: {e}[/red]")
        return None


def verify_governance_proof(proof: dict) -> bool:
    """
    Verify the cryptographic signature on a governance proof.

    Checks that:
    1. The signature is valid
    2. The signer matches the declared signer
    3. The proof data hasn't been tampered with

    Args:
        proof: The governance proof dict (with signature)

    Returns:
        True if the proof is valid, False otherwise
    """
    from eth_account import Account
    from eth_account.messages import encode_defunct
    import copy

    try:
        inner = proof["franchisa_governance_proof"]
        signature = inner.get("signature")
        signer = inner.get("signer")

        if not signature or not signer:
            console.print("[red]Proof missing signature or signer field[/red]")
            return False

        # Build a copy without signature/signer for hash reconstruction
        # (never mutate the original dict — safe against mid-flow exceptions)
        inner_copy = copy.deepcopy(inner)
        del inner_copy["signature"]
        del inner_copy["signer"]

        # Reconstruct the payload that was signed
        payload_json = json.dumps(
            {"franchisa_governance_proof": inner_copy},
            sort_keys=True,
            separators=(",", ":"),
        )

        # Recover the signer from the signature
        # Handle optional 0x prefix on hex signature
        sig_hex = signature.removeprefix("0x") if isinstance(signature, str) else signature
        message = encode_defunct(text=payload_json)
        recovered = Account.recover_message(message, signature=bytes.fromhex(sig_hex))

        if recovered.lower() == signer.lower():
            console.print(
                f"[green]✓ Proof signature VALID[/green]\n"
                f"  Signer: {signer}\n"
                f"  Recovered: {recovered}"
            )
            return True
        else:
            console.print(
                f"[red]✗ Proof signature INVALID[/red]\n"
                f"  Declared signer: {signer}\n"
                f"  Recovered: {recovered}"
            )
            return False

    except Exception as e:
        console.print(f"[red]Verification error: {e}[/red]")
        return False


def export_proof_to_file(
    proof: dict,
    output_dir: str = ".",
) -> str:
    """
    Export a governance proof to a JSON file.

    Args:
        proof: The governance proof dict
        output_dir: Directory to write the file to

    Returns:
        Path to the exported file
    """
    ticker = proof["franchisa_governance_proof"]["meeting"]["ticker"]
    timestamp = int(time.time())
    filename = f"franchisa_proof_{ticker}_{timestamp}.json"
    filepath = os.path.join(output_dir, filename)

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(proof, f, indent=2)

    console.print(f"[green]Proof exported to: {filepath}[/green]")
    return filepath


def generate_demo_proof() -> dict:
    """
    Generate a demo governance proof without on-chain reads.
    Used for testing and demonstration purposes.
    """
    from eth_account import Account

    # Generate a random signer for demo
    demo_key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"  # Hardhat #0

    demo_proof = {
        "franchisa_governance_proof": {
            "version": "1.0.0",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "network": "arbitrum-sepolia",
            "chainId": 421614,
            "contracts": {
                "registry": os.environ.get("REGISTRY_CONTRACT_ADDRESS", "0x2497F9f712ed85d5204e53610faa064a17794023"),
                "stylusEngine": os.environ.get("STYLUS_ENGINE_ADDRESS", "0x224304493CF93c4ea7ad8904c2A43bcdb808cF2f"),
            },
            "meeting": {
                "ticker": "TSLA",
                "companyName": "Tesla, Inc.",
                "meetingDate": "2026-08-15",
                "totalVoters": 1247,
            },
            "results": [
                {
                    "proposalId": 1,
                    "title": "Approval of Executive Compensation Plan",
                    "yesWeight": "68420000000000000000000",
                    "noWeight": "22150000000000000000000",
                    "abstainWeight": "9430000000000000000000",
                    "yesPercentage": "68.42%",
                    "noPercentage": "22.15%",
                    "abstainPercentage": "9.43%",
                    "voterCount": 1247,
                },
                {
                    "proposalId": 2,
                    "title": "Ratification of Ernst & Young as Auditor",
                    "yesWeight": "85000000000000000000000",
                    "noWeight": "5000000000000000000000",
                    "abstainWeight": "10000000000000000000000",
                    "yesPercentage": "85.00%",
                    "noPercentage": "5.00%",
                    "abstainPercentage": "10.00%",
                    "voterCount": 1247,
                },
                {
                    "proposalId": 3,
                    "title": "Shareholder Proposal on Climate Risk Reporting",
                    "yesWeight": "35000000000000000000000",
                    "noWeight": "55000000000000000000000",
                    "abstainWeight": "10000000000000000000000",
                    "yesPercentage": "35.00%",
                    "noPercentage": "55.00%",
                    "abstainPercentage": "10.00%",
                    "voterCount": 1247,
                },
                {
                    "proposalId": 4,
                    "title": "Election of Board of Directors",
                    "yesWeight": "75000000000000000000000",
                    "noWeight": "15000000000000000000000",
                    "abstainWeight": "10000000000000000000000",
                    "yesPercentage": "75.00%",
                    "noPercentage": "15.00%",
                    "abstainPercentage": "10.00%",
                    "voterCount": 1247,
                },
            ],
        }
    }

    # Sign it
    from eth_account.messages import encode_defunct

    payload_json = json.dumps(demo_proof, sort_keys=True, separators=(",", ":"))
    message = encode_defunct(text=payload_json)
    account = Account.from_key(demo_key)
    signed = account.sign_message(message)

    demo_proof["franchisa_governance_proof"]["signature"] = signed.signature.hex()
    demo_proof["franchisa_governance_proof"]["signer"] = account.address

    return demo_proof
