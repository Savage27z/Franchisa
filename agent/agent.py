#!/usr/bin/env python3
"""
Franchisa AI Ingestion Agent

Autonomous agent that watches SEC EDGAR for new DEF 14A proxy filings,
parses them with Claude AI, and pushes structured proposals on-chain
to the FranchisaGovernanceRegistry on Arbitrum Sepolia.

This is a multi-step reasoning agent with an observable decision loop:

  1. OBSERVE  — scan EDGAR for new filings across watchlist tickers
  2. DECIDE   — evaluate if filing is actionable (DEF 14A, not duplicate)
  3. PARSE    — extract proposals via Claude AI structured extraction
  4. VALIDATE — verify parsed data completeness & risk ratings
  5. SUBMIT   — push proposals on-chain to the governance registry
  6. VERIFY   — confirm on-chain state matches submitted data
  7. PROVE    — generate cryptographic governance proof for custodians

Usage:
    python agent.py run                     # Full agentic loop (observe -> submit -> prove)
    python agent.py run --ticker TSLA       # Single-ticker agentic run
    python agent.py run --demo              # Demo mode with synthetic data
    python agent.py fetch -t TSLA           # Manual fetch & parse
    python agent.py watch                   # Cron mode (poll every N hours)
    python agent.py proof -t TSLA           # Generate governance proof
    python agent.py verify proof.json       # Verify a proof file
    python agent.py status                  # Show on-chain registry status
"""

import os
import sys
import json
import time
import click
from pathlib import Path
from datetime import datetime
from enum import Enum
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.live import Live
from rich.layout import Layout
from rich.text import Text
from rich import box

# Load .env from agent directory
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

console = Console(force_terminal=True)


# ─── Agent State Machine ────────────────────────────────────────────────────

class AgentStep(Enum):
    OBSERVE = "OBSERVE"
    DECIDE = "DECIDE"
    PARSE = "PARSE"
    VALIDATE = "VALIDATE"
    SUBMIT = "SUBMIT"
    VERIFY = "VERIFY"
    PROVE = "PROVE"
    COMPLETE = "COMPLETE"
    ERROR = "ERROR"


class AgentState:
    """Observable state for the agentic decision loop."""

    def __init__(self):
        self.current_step = AgentStep.OBSERVE
        self.ticker: str = ""
        self.reasoning: list[str] = []
        self.decisions: list[dict] = []
        self.errors: list[str] = []
        self.tx_hashes: list[str] = []
        self.proposals_found: int = 0
        self.started_at = datetime.now()

    def log(self, message: str):
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.reasoning.append(f"[{timestamp}] {message}")
        console.print(f"  [dim][{timestamp}][/dim] {message}")

    def decide(self, question: str, answer: str, rationale: str):
        self.decisions.append({
            "question": question,
            "answer": answer,
            "rationale": rationale,
            "timestamp": datetime.now().isoformat(),
        })
        console.print(f"  [yellow]DECISION:[/yellow] {question}")
        console.print(f"  [green]-> {answer}[/green] [dim]({rationale})[/dim]")

    def transition(self, step: AgentStep):
        self.current_step = step
        console.print(f"\n[bold cyan]{'=' * 60}[/bold cyan]")
        console.print(f"[bold cyan]  STEP: {step.value}[/bold cyan]")
        console.print(f"[bold cyan]{'=' * 60}[/bold cyan]\n")

    def error(self, msg: str):
        self.errors.append(msg)
        self.current_step = AgentStep.ERROR
        console.print(f"  [red]ERROR: {msg}[/red]")


# ─── Display Helpers ─────────────────────────────────────────────────────────

def print_banner():
    console.print(
        Panel.fit(
            "[bold cyan]Franchisa[/bold cyan] -- AI Governance Agent\n"
            "[dim]SEC EDGAR -> Claude AI -> Arbitrum Sepolia[/dim]\n"
            "[dim]Multi-step reasoning | Observable decisions | On-chain verified[/dim]",
            border_style="cyan",
        )
    )


def print_proposals_table(parsed: dict):
    """Pretty-print parsed proposals."""
    table = Table(title=f"{parsed['ticker']} -- {parsed['companyName']}", box=box.ROUNDED)
    table.add_column("#", style="dim", width=3)
    table.add_column("Title", style="white", max_width=50)
    table.add_column("Category", style="cyan")
    table.add_column("Risk", style="yellow")
    table.add_column("Board Rec", style="green")

    for p in parsed["proposals"]:
        risk_color = {"Low": "green", "Medium": "yellow", "High": "red"}.get(
            p["riskRating"], "white"
        )
        table.add_row(
            str(p["proposalId"]),
            p["title"],
            p["category"],
            f"[{risk_color}]{p['riskRating']}[/{risk_color}]",
            p["boardRecommendation"],
        )

    console.print(table)


def print_agent_summary(state: AgentState):
    """Print a summary of the agent's run."""
    elapsed = (datetime.now() - state.started_at).total_seconds()

    summary = Table(title="Agent Run Summary", box=box.DOUBLE)
    summary.add_column("Metric", style="dim")
    summary.add_column("Value")

    summary.add_row("Ticker", state.ticker)
    summary.add_row("Final Step", state.current_step.value)
    summary.add_row("Proposals Found", str(state.proposals_found))
    summary.add_row("Decisions Made", str(len(state.decisions)))
    summary.add_row("Transactions", str(len(state.tx_hashes)))
    summary.add_row("Errors", str(len(state.errors)))
    summary.add_row("Duration", f"{elapsed:.1f}s")

    console.print("\n")
    console.print(summary)

    if state.decisions:
        dec_table = Table(title="Decision Log", box=box.ROUNDED)
        dec_table.add_column("Question", style="white", max_width=40)
        dec_table.add_column("Answer", style="green")
        dec_table.add_column("Rationale", style="dim", max_width=40)

        for d in state.decisions:
            dec_table.add_row(d["question"], d["answer"], d["rationale"])

        console.print(dec_table)

    if state.tx_hashes:
        console.print("\n[cyan]On-chain transactions:[/cyan]")
        for tx in state.tx_hashes:
            console.print(f"  https://sepolia.arbiscan.io/tx/{tx}")


# ─── CLI Commands ────────────────────────────────────────────────────────────

@click.group(invoke_without_command=True)
@click.pass_context
def cli(ctx):
    """Franchisa AI Governance Agent -- Multi-step reasoning for SEC -> On-chain governance."""
    if ctx.invoked_subcommand is None:
        print_banner()
        click.echo(ctx.get_help())


@cli.command()
@click.option("--ticker", "-t", default=None, help="Specific ticker (or run all watchlist)")
@click.option("--demo", is_flag=True, help="Use synthetic demo data (no API calls)")
@click.option("--submit", is_flag=True, default=True, help="Submit on-chain (default: true)")
@click.option("--prove", is_flag=True, help="Also generate governance proof after submit")
def run(ticker: str, demo: bool, submit: bool, prove: bool):
    """Full agentic loop: observe -> decide -> parse -> validate -> submit -> verify."""
    print_banner()
    state = AgentState()

    if demo:
        console.print("[yellow]Running in DEMO mode -- synthetic data, no external APIs[/yellow]\n")

    # Determine tickers to process
    if ticker:
        tickers = [ticker.upper()]
    else:
        watchlist_path = Path(__file__).parent / "watchlist.json"
        if watchlist_path.exists():
            with open(watchlist_path) as f:
                tickers = json.load(f).get("tickers", [])
        else:
            tickers = ["TSLA"]

    for t in tickers:
        state.ticker = t
        _run_agentic_loop(state, t, demo, submit, prove)

    print_agent_summary(state)


def _run_agentic_loop(state: AgentState, ticker: str, demo: bool, submit: bool, prove: bool):
    """Execute the full agentic reasoning loop for one ticker."""

    # ─── Step 1: OBSERVE ─────────────────────────────────────────────
    state.transition(AgentStep.OBSERVE)
    state.log(f"Target ticker: {ticker}")

    if demo:
        state.log("Demo mode: using synthetic filing data")
        filing_text = None
        state.log("Synthetic TSLA annual meeting filing loaded (4 proposals)")
    else:
        state.log(f"Querying SEC EDGAR for DEF 14A filings...")
        from edgar import search_filings, fetch_filing_text

        filings = search_filings(ticker, filing_type="DEF 14A")
        if filings:
            state.log(f"Found {len(filings)} filing(s) for {ticker}")
            filing_text = fetch_filing_text(ticker)
        else:
            state.log(f"No DEF 14A filings found for {ticker}")
            filing_text = None

    # ─── Step 2: DECIDE ──────────────────────────────────────────────
    state.transition(AgentStep.DECIDE)

    if demo:
        state.decide(
            "Should we process this filing?",
            "YES",
            "Demo mode -- always process synthetic data",
        )
    elif filing_text:
        # Check if filing is recent enough
        is_actionable = len(filing_text) > 1000
        state.decide(
            f"Is the {ticker} filing actionable?",
            "YES" if is_actionable else "NO",
            f"Filing length: {len(filing_text):,} chars. {'Sufficient' if is_actionable else 'Too short, likely stub'}.",
        )
        if not is_actionable:
            state.log("Skipping -- filing too short to contain meaningful proposals")
            return
    else:
        state.decide(
            f"Is the {ticker} filing actionable?",
            "NO",
            "No filing text available from EDGAR",
        )
        state.log("Skipping -- no filing data")
        return

    # Check if already registered on-chain
    registry_address = os.environ.get("REGISTRY_CONTRACT_ADDRESS")
    if registry_address and not demo:
        state.log("Checking if meeting already registered on-chain...")
        try:
            from submitter import ticker_to_bytes32, REGISTRY_ABI
            from web3 import Web3

            w3 = Web3(Web3.HTTPProvider(os.environ.get("ARBITRUM_SEPOLIA_RPC", "")))
            registry = w3.eth.contract(
                address=Web3.to_checksum_address(registry_address),
                abi=REGISTRY_ABI,
            )
            meeting = registry.functions.getMeeting(ticker_to_bytes32(ticker)).call()
            if meeting[4]:  # isActive
                state.decide(
                    f"Is {ticker} already on-chain?",
                    "YES -- SKIP",
                    f"Meeting already active with {meeting[5]} proposals",
                )
                state.log(f"Meeting for {ticker} already registered on-chain. Skipping.")
                return
            else:
                state.decide(
                    f"Is {ticker} already on-chain?",
                    "NO",
                    "No active meeting found -- proceeding with registration",
                )
        except Exception as e:
            state.log(f"On-chain check skipped: {e}")

    # ─── Step 3: PARSE ───────────────────────────────────────────────
    state.transition(AgentStep.PARSE)

    if demo:
        from parser import parse_demo_filing

        state.log("Extracting proposals from synthetic filing...")
        parsed = parse_demo_filing(ticker)
    else:
        from parser import parse_proxy_statement

        state.log("Sending filing to Claude AI for structured extraction...")
        state.log("Prompt: Extract proposals, categories, risk ratings, board recommendations")
        parsed = parse_proxy_statement(filing_text, ticker)

    if not parsed:
        state.error(f"Failed to parse filing for {ticker}")
        return

    state.proposals_found = len(parsed["proposals"])
    state.log(f"Extracted {state.proposals_found} proposals for {parsed['companyName']}")
    print_proposals_table(parsed)

    # ─── Step 4: VALIDATE ────────────────────────────────────────────
    state.transition(AgentStep.VALIDATE)

    # Validate completeness
    issues = []
    for p in parsed["proposals"]:
        if not p.get("title"):
            issues.append(f"Proposal {p['proposalId']}: missing title")
        if not p.get("category"):
            issues.append(f"Proposal {p['proposalId']}: missing category")
        if p.get("riskRating") not in ("Low", "Medium", "High"):
            issues.append(f"Proposal {p['proposalId']}: invalid risk rating '{p.get('riskRating')}'")

    if issues:
        for issue in issues:
            state.log(f"[yellow]Validation warning: {issue}[/yellow]")
        state.decide(
            "Are validation issues blocking?",
            "NO -- proceed with warnings",
            f"{len(issues)} non-critical issues found",
        )
    else:
        state.log("All proposals passed validation checks")
        state.decide(
            "Is parsed data valid for on-chain submission?",
            "YES",
            f"{state.proposals_found} proposals, all fields present, risk ratings valid",
        )

    # Save parsed data
    output_path = Path(__file__).parent / f"parsed_{ticker}.json"
    with open(output_path, "w") as f:
        json.dump(parsed, f, indent=2)
    state.log(f"Saved parsed data to {output_path}")

    # ─── Step 5: SUBMIT ──────────────────────────────────────────────
    if submit:
        state.transition(AgentStep.SUBMIT)

        if not os.environ.get("REGISTRY_CONTRACT_ADDRESS"):
            state.decide(
                "Can we submit on-chain?",
                "NO",
                "REGISTRY_CONTRACT_ADDRESS not set in .env",
            )
            state.log("Skipping on-chain submission -- no contract address")
        else:
            from submitter import submit_meeting_onchain

            state.decide(
                f"Submit {ticker} ({state.proposals_found} proposals) to Arbitrum Sepolia?",
                "YES",
                "Registry address configured, agent wallet funded",
            )

            state.log("Building transaction...")
            tx_hash = submit_meeting_onchain(parsed)

            if tx_hash:
                state.tx_hashes.append(tx_hash)
                state.log(f"Transaction confirmed: {tx_hash}")

                # ─── Step 6: VERIFY ──────────────────────────────────
                state.transition(AgentStep.VERIFY)
                state.log("Verifying on-chain state matches submitted data...")

                try:
                    from submitter import ticker_to_bytes32, REGISTRY_ABI
                    from web3 import Web3

                    w3 = Web3(
                        Web3.HTTPProvider(
                            os.environ.get(
                                "ARBITRUM_SEPOLIA_RPC",
                                "https://sepolia-rollup.arbitrum.io/rpc",
                            )
                        )
                    )
                    registry = w3.eth.contract(
                        address=Web3.to_checksum_address(
                            os.environ["REGISTRY_CONTRACT_ADDRESS"]
                        ),
                        abi=REGISTRY_ABI,
                    )
                    meeting = registry.functions.getMeeting(
                        ticker_to_bytes32(ticker)
                    ).call()

                    on_chain_count = meeting[5]  # proposalCount
                    state.log(
                        f"On-chain: {meeting[1]} | Proposals: {on_chain_count} | Active: {meeting[4]}"
                    )

                    if on_chain_count == state.proposals_found and meeting[4]:
                        state.decide(
                            "Does on-chain state match submitted data?",
                            "YES -- VERIFIED",
                            f"{on_chain_count} proposals, meeting active",
                        )
                    else:
                        state.decide(
                            "Does on-chain state match?",
                            "MISMATCH",
                            f"Expected {state.proposals_found}, got {on_chain_count}",
                        )
                except Exception as e:
                    state.log(f"Verification skipped: {e}")
            else:
                state.error("On-chain submission failed")
                return

    # ─── Step 7: PROVE ───────────────────────────────────────────────
    if prove:
        state.transition(AgentStep.PROVE)
        state.log("Generating cryptographic governance proof...")

        from proof_export import generate_demo_proof, export_proof_to_file

        proof_data = generate_demo_proof()
        if proof_data:
            filepath = export_proof_to_file(proof_data, str(Path(__file__).parent))
            state.log(f"Proof exported to {filepath}")
        else:
            state.error("Failed to generate governance proof")

    state.transition(AgentStep.COMPLETE)
    state.log(f"Agentic loop complete for {ticker}")


@cli.command()
@click.option("--ticker", "-t", required=True, help="Company ticker symbol (e.g., TSLA)")
@click.option("--submit", is_flag=True, help="Submit parsed proposals on-chain")
def fetch(ticker: str, submit: bool):
    """Fetch and parse the latest DEF 14A filing from SEC EDGAR."""
    print_banner()
    ticker = ticker.upper()

    console.print(f"\n[cyan]Fetching latest DEF 14A for {ticker} from SEC EDGAR...[/cyan]")

    from edgar import fetch_filing_text
    from parser import parse_proxy_statement

    filing_text = fetch_filing_text(ticker)
    if not filing_text:
        console.print(f"[red]Could not fetch filing for {ticker}[/red]")
        sys.exit(1)

    parsed = parse_proxy_statement(filing_text, ticker)
    if not parsed:
        console.print(f"[red]Could not parse filing for {ticker}[/red]")
        sys.exit(1)

    print_proposals_table(parsed)

    output_path = Path(__file__).parent / f"parsed_{ticker}.json"
    with open(output_path, "w") as f:
        json.dump(parsed, f, indent=2)
    console.print(f"[dim]Saved to {output_path}[/dim]")

    if submit:
        from submitter import submit_meeting_onchain

        tx_hash = submit_meeting_onchain(parsed)
        if tx_hash:
            console.print(f"\n[green]Successfully submitted to Arbitrum Sepolia[/green]")
        else:
            console.print(f"\n[red]On-chain submission failed[/red]")
            sys.exit(1)


@cli.command()
@click.option("--interval", default=6, help="Poll interval in hours (default: 6)")
def watch(interval: int):
    """Watch EDGAR for new filings from the watchlist (cron mode)."""
    print_banner()

    watchlist_path = Path(__file__).parent / "watchlist.json"
    if not watchlist_path.exists():
        console.print("[red]watchlist.json not found[/red]")
        sys.exit(1)

    with open(watchlist_path) as f:
        watchlist = json.load(f)

    tickers = watchlist.get("tickers", [])
    console.print(f"[cyan]Watching {len(tickers)} tickers: {', '.join(tickers)}[/cyan]")
    console.print(f"[dim]Poll interval: {interval} hours[/dim]\n")

    from edgar import fetch_filing_text
    from parser import parse_proxy_statement
    from submitter import submit_meeting_onchain

    while True:
        console.print(f"\n[yellow]{'--' * 25}[/yellow]")
        console.print(f"[yellow]Poll cycle at {time.strftime('%Y-%m-%d %H:%M:%S')}[/yellow]")

        for ticker in tickers:
            console.print(f"\n[cyan]Checking {ticker}...[/cyan]")

            filing_text = fetch_filing_text(ticker)
            if not filing_text:
                console.print(f"[dim]No new filing for {ticker}[/dim]")
                continue

            parsed = parse_proxy_statement(filing_text, ticker)
            if not parsed:
                continue

            print_proposals_table(parsed)
            tx_hash = submit_meeting_onchain(parsed)
            if tx_hash:
                console.print(f"[green]  {ticker} submitted on-chain[/green]")

        console.print(f"\n[dim]Next poll in {interval} hours...[/dim]")
        time.sleep(interval * 3600)


@cli.command()
@click.option("--ticker", "-t", required=True, help="Ticker to generate proof for")
@click.option("--demo-mode", "demo_mode", is_flag=True, help="Generate demo proof (no on-chain reads)")
@click.option("--output", "-o", default=".", help="Output directory for proof file")
def proof(ticker: str, demo_mode: bool, output: str):
    """Generate a governance proof for a completed meeting vote."""
    print_banner()
    ticker = ticker.upper()

    from proof_export import (
        generate_governance_proof,
        generate_demo_proof,
        export_proof_to_file,
        verify_governance_proof,
    )

    if demo_mode:
        console.print(f"\n[yellow]Generating DEMO proof for {ticker}...[/yellow]\n")
        proof_data = generate_demo_proof()
    else:
        console.print(f"\n[cyan]Generating governance proof for {ticker}...[/cyan]\n")
        proof_data = generate_governance_proof(
            ticker=ticker,
            company_name="",
            meeting_date="",
            proposal_count=0,
        )

    if proof_data:
        filepath = export_proof_to_file(proof_data, output)
        console.print(f"\n[cyan]Verifying proof signature...[/cyan]")
        is_valid = verify_governance_proof(proof_data)
        if is_valid:
            console.print(f"\n[green]Proof is ready for custodian ingestion[/green]")
    else:
        console.print(f"[red]Failed to generate proof[/red]")
        sys.exit(1)


@cli.command()
@click.argument("filepath", type=click.Path(exists=True))
def verify(filepath: str):
    """Verify a governance proof JSON file."""
    print_banner()

    from proof_export import verify_governance_proof

    console.print(f"\n[cyan]Verifying proof: {filepath}[/cyan]\n")

    with open(filepath) as f:
        proof_data = json.load(f)

    is_valid = verify_governance_proof(proof_data)

    if is_valid:
        inner = proof_data["franchisa_governance_proof"]
        meeting = inner["meeting"]

        table = Table(title="Proof Summary", box=box.ROUNDED)
        table.add_column("Field", style="dim")
        table.add_column("Value")

        table.add_row("Ticker", meeting["ticker"])
        table.add_row("Company", meeting["companyName"])
        table.add_row("Meeting Date", meeting["meetingDate"])
        table.add_row("Total Voters", str(meeting["totalVoters"]))
        table.add_row("Network", inner["network"])
        table.add_row("Chain ID", str(inner["chainId"]))
        table.add_row("Registry", inner["contracts"]["registry"])
        table.add_row("Stylus Engine", inner["contracts"]["stylusEngine"])
        table.add_row("Proposals", str(len(inner["results"])))
        table.add_row("Signer", inner.get("signer", "N/A"))
        table.add_row("Generated At", inner["generatedAt"])

        console.print(table)
    else:
        console.print("[red]Proof verification FAILED[/red]")
        sys.exit(1)


@cli.command()
def status():
    """Show on-chain registry status -- meetings, proposals, voter counts."""
    print_banner()

    registry_address = os.environ.get("REGISTRY_CONTRACT_ADDRESS")
    if not registry_address:
        console.print("[red]REGISTRY_CONTRACT_ADDRESS not set[/red]")
        sys.exit(1)

    from web3 import Web3
    from submitter import REGISTRY_ABI, ticker_to_bytes32

    # Extended ABI with registeredTickers array accessor
    extended_abi = REGISTRY_ABI + [
        {
            "inputs": [{"name": "", "type": "uint256"}],
            "name": "registeredTickers",
            "outputs": [{"name": "", "type": "bytes32"}],
            "stateMutability": "view",
            "type": "function",
        }
    ]

    w3 = Web3(Web3.HTTPProvider(os.environ.get("ARBITRUM_SEPOLIA_RPC", "")))
    registry = w3.eth.contract(
        address=Web3.to_checksum_address(registry_address), abi=extended_abi
    )

    console.print(f"\n[cyan]Registry:[/cyan] {registry_address}")
    console.print(f"[cyan]Network:[/cyan]  Arbitrum Sepolia (421614)\n")

    try:
        count = registry.functions.getRegisteredTickerCount().call()
        active = registry.functions.getActiveMeetingCount().call()
        console.print(f"[cyan]Registered tickers:[/cyan] {count}")
        console.print(f"[cyan]Active meetings:[/cyan]    {active}\n")

        if count > 0:
            table = Table(title="On-Chain Meetings", box=box.ROUNDED)
            table.add_column("Ticker", style="cyan")
            table.add_column("Company", style="white")
            table.add_column("Proposals", style="yellow")
            table.add_column("Status", style="green")
            table.add_column("Meeting Date")

            for i in range(count):
                ticker_bytes = registry.functions.registeredTickers(i).call()
                meeting = registry.functions.getMeeting(ticker_bytes).call()

                # Decode ticker
                ticker_str = ticker_bytes.rstrip(b"\x00").decode("utf-8") if isinstance(ticker_bytes, bytes) else ticker_bytes.replace("0x", "").rstrip("0")
                try:
                    ticker_str = bytes.fromhex(ticker_bytes.hex().rstrip("0") if hasattr(ticker_bytes, "hex") else ticker_bytes.replace("0x", "").rstrip("0")).decode("utf-8")
                except Exception:
                    ticker_str = str(ticker_bytes)[:8]

                status = "[green]Active[/green]" if meeting[4] else "[red]Closed[/red]"
                meeting_date = datetime.fromtimestamp(meeting[2]).strftime("%Y-%m-%d") if meeting[2] > 0 else "N/A"

                table.add_row(
                    ticker_str,
                    meeting[1],
                    str(meeting[5]),
                    status,
                    meeting_date,
                )

            console.print(table)
    except Exception as e:
        console.print(f"[red]Error reading registry: {e}[/red]")


if __name__ == "__main__":
    cli()
