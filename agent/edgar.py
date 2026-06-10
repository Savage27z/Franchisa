"""
SEC EDGAR API client for fetching DEF 14A proxy statement filings.

Uses the official SEC submissions API (data.sec.gov):
  1. Resolve ticker -> CIK via company_tickers.json
  2. Pull the company's submissions index
  3. Locate the most recent DEF 14A and download its primary document

EDGAR is free, public, no auth needed.
Rate limit: max 10 requests/second.
Requires User-Agent header with name and email.
"""

import re
import time
from datetime import datetime
from typing import Optional
from rich.console import Console

import httpx

console = Console()

COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik:010d}.json"
ARCHIVES_URL = "https://www.sec.gov/Archives/edgar/data/{cik}/{accession_nodash}/{document}"

USER_AGENT = "Franchisa Agent freakysavage23@gmail.com"

# Rate limiting: max 10 req/sec
_last_request_time = 0.0
_MIN_INTERVAL = 0.1  # 100ms between requests

# Cache the ticker -> CIK map for the process lifetime
_ticker_cik_cache: dict[str, dict] = {}


def _rate_limit():
    """Enforce EDGAR rate limit."""
    global _last_request_time
    now = time.time()
    elapsed = now - _last_request_time
    if elapsed < _MIN_INTERVAL:
        time.sleep(_MIN_INTERVAL - elapsed)
    _last_request_time = time.time()


def _get(client: httpx.Client, url: str, **kwargs):
    _rate_limit()
    resp = client.get(url, headers={"User-Agent": USER_AGENT}, **kwargs)
    resp.raise_for_status()
    return resp


def resolve_cik(ticker: str) -> Optional[dict]:
    """Resolve a ticker to its SEC CIK number and registered company title."""
    global _ticker_cik_cache
    ticker = ticker.upper()

    if not _ticker_cik_cache:
        try:
            with httpx.Client(timeout=30) as client:
                data = _get(client, COMPANY_TICKERS_URL).json()
            for entry in data.values():
                _ticker_cik_cache[entry["ticker"].upper()] = {
                    "cik": int(entry["cik_str"]),
                    "title": entry["title"],
                }
        except httpx.HTTPError as e:
            console.print(f"[red]Failed to load SEC ticker map: {e}[/red]")
            return None

    return _ticker_cik_cache.get(ticker)


def search_filings(
    ticker: str,
    filing_type: str = "DEF 14A",
    days_back: int = 730,
) -> list[dict]:
    """
    List recent filings of a given type for a company via the submissions API.

    Returns a list of filing metadata dicts with keys:
    - accession_number, filing_date, company_name, cik, form_type, primary_document
    """
    company = resolve_cik(ticker)
    if not company:
        console.print(f"[yellow]Unknown ticker: {ticker}[/yellow]")
        return []

    try:
        with httpx.Client(timeout=30) as client:
            data = _get(
                client, SUBMISSIONS_URL.format(cik=company["cik"])
            ).json()
    except httpx.HTTPError as e:
        console.print(f"[red]EDGAR submissions API error: {e}[/red]")
        return []

    recent = data.get("filings", {}).get("recent", {})
    forms = recent.get("form", [])
    accessions = recent.get("accessionNumber", [])
    dates = recent.get("filingDate", [])
    primary_docs = recent.get("primaryDocument", [])

    cutoff = datetime.now().timestamp() - days_back * 86400
    filings = []
    for i, form in enumerate(forms):
        if form != filing_type:
            continue
        try:
            filed_ts = datetime.strptime(dates[i], "%Y-%m-%d").timestamp()
        except (ValueError, IndexError):
            filed_ts = 0
        if filed_ts < cutoff:
            continue
        filings.append(
            {
                "accession_number": accessions[i],
                "filing_date": dates[i],
                "company_name": data.get("name", company["title"]),
                "cik": company["cik"],
                "form_type": form,
                "primary_document": primary_docs[i],
            }
        )

    return filings


def fetch_latest_filing(ticker: str) -> Optional[dict]:
    """
    Fetch the latest DEF 14A filing for a ticker with full provenance.

    Returns a dict:
    - text: cleaned filing text (truncated to ~100k chars for the LLM)
    - filing_hash: keccak256 hex of the FULL cleaned text (pre-truncation),
      matching Solidity keccak256(abi.encodePacked(string))
    - accession_number, filing_date, company_name, cik, document_url
    """
    filings = search_filings(ticker, filing_type="DEF 14A")
    if not filings:
        console.print(f"[yellow]No DEF 14A filings found for {ticker}[/yellow]")
        return None

    latest = filings[0]
    accession_nodash = latest["accession_number"].replace("-", "")
    doc_url = ARCHIVES_URL.format(
        cik=latest["cik"],
        accession_nodash=accession_nodash,
        document=latest["primary_document"],
    )

    try:
        with httpx.Client(timeout=60, follow_redirects=True) as client:
            doc_resp = _get(client, doc_url)
            text = doc_resp.text
    except httpx.HTTPError as e:
        console.print(f"[red]Error fetching filing for {ticker}: {e}[/red]")
        return None

    # Strip HTML tags for cleaner parsing (basic approach)
    clean_text = re.sub(r"<[^>]+>", " ", text)
    clean_text = re.sub(r"&[a-zA-Z#0-9]+;", " ", clean_text)
    clean_text = re.sub(r"\s+", " ", clean_text).strip()

    # Hash the FULL cleaned text so anyone can re-fetch the document,
    # apply the same normalization, and verify the on-chain hash.
    from web3 import Web3

    filing_hash = Web3.solidity_keccak(["string"], [clean_text]).hex()

    # Truncate for the LLM context only — the hash covers the full text
    llm_text = clean_text[:100_000]

    console.print(
        f"[green]Fetched {len(clean_text):,} chars from {ticker} DEF 14A "
        f"({latest['accession_number']}, filed {latest['filing_date']})[/green]"
    )

    return {
        "text": llm_text,
        "filing_hash": filing_hash,
        "accession_number": latest["accession_number"],
        "filing_date": latest["filing_date"],
        "company_name": latest["company_name"],
        "cik": latest["cik"],
        "document_url": doc_url,
    }


def fetch_filing_text(ticker: str) -> Optional[str]:
    """Back-compat wrapper: fetch just the cleaned filing text."""
    filing = fetch_latest_filing(ticker)
    return filing["text"] if filing else None


def load_demo_filing() -> str:
    """Load a pre-saved demo filing for testing without hitting EDGAR."""
    import os

    demo_path = os.path.join(os.path.dirname(__file__), "demo_filing.txt")
    if os.path.exists(demo_path):
        with open(demo_path, "r", encoding="utf-8") as f:
            return f.read()

    # If no demo file exists, return a synthetic filing excerpt
    return _SYNTHETIC_TSLA_FILING


_SYNTHETIC_TSLA_FILING = """
TESLA, INC.
NOTICE OF 2026 ANNUAL MEETING OF STOCKHOLDERS
To Be Held on August 15, 2026

PROXY STATEMENT

The Board of Directors of Tesla, Inc. ("Tesla" or the "Company") is soliciting your proxy
for use at the 2026 Annual Meeting of Stockholders.

PROPOSAL 1 — ELECTION OF DIRECTORS
The Board recommends a vote FOR each of the 11 director nominees listed below.
The Board has nominated 11 directors for election at the Annual Meeting, including
3 new independent directors. Each director will serve a one-year term.
Risk Assessment: Low risk. Standard board election with majority of independent directors.

PROPOSAL 2 — RATIFICATION OF ERNST & YOUNG LLP AS INDEPENDENT AUDITOR
The Board recommends a vote FOR this proposal.
The Audit Committee has selected Ernst & Young LLP as Tesla's independent registered
public accounting firm for fiscal year 2026. EY has served as Tesla's auditor since 2020.
Risk Assessment: Low risk. Standard annual auditor ratification.

PROPOSAL 3 — ADVISORY VOTE ON EXECUTIVE COMPENSATION ("SAY ON PAY")
The Board recommends a vote FOR this proposal.
The Board is asking stockholders to approve, on a non-binding advisory basis, the
compensation of Tesla's named executive officers as disclosed in this proxy statement.
The CEO compensation package includes up to $50 billion in performance-based stock
options vesting over 5 years, contingent on achieving market capitalization and revenue targets.
Risk Assessment: High risk. This is the largest executive compensation package in corporate
history. If approved, it would result in significant shareholder dilution of approximately 9%.

PROPOSAL 4 — SHAREHOLDER PROPOSAL ON CLIMATE RISK REPORTING
The Board recommends a vote AGAINST this proposal.
A shareholder has submitted a proposal requesting that Tesla publish an annual
Climate Action 100+ aligned report detailing transition risks and Scope 3 emissions targets.
Risk Assessment: Medium risk. Would increase reporting obligations and potentially
require disclosure of competitive strategic information about Tesla's energy business.
"""
