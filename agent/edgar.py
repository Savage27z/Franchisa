"""
SEC EDGAR API client for fetching DEF 14A proxy statement filings.

EDGAR is free, public, no auth needed.
Rate limit: max 10 requests/second.
Requires User-Agent header with name and email.
"""

import httpx
import time
from datetime import datetime, timedelta
from typing import Optional
from rich.console import Console

console = Console()

EDGAR_SEARCH_URL = "https://efts.sec.gov/LATEST/search-index"
EDGAR_FULL_TEXT_URL = "https://efts.sec.gov/LATEST/search-index"
EDGAR_COMPANY_URL = "https://www.sec.gov/cgi-bin/browse-edgar"
EDGAR_FILING_BASE = "https://www.sec.gov/Archives/edgar/data"

USER_AGENT = "Franchisa Agent freakysavage23@gmail.com"

# Rate limiting: max 10 req/sec
_last_request_time = 0.0
_MIN_INTERVAL = 0.1  # 100ms between requests


def _rate_limit():
    """Enforce EDGAR rate limit."""
    global _last_request_time
    now = time.time()
    elapsed = now - _last_request_time
    if elapsed < _MIN_INTERVAL:
        time.sleep(_MIN_INTERVAL - elapsed)
    _last_request_time = time.time()


def search_filings(
    ticker: str,
    filing_type: str = "DEF 14A",
    days_back: int = 365,
) -> list[dict]:
    """
    Search EDGAR for recent filings of a given type for a company.

    Returns a list of filing metadata dicts with keys:
    - accession_number, filing_date, company_name, cik, filing_url
    """
    _rate_limit()

    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")

    params = {
        "q": f'"{filing_type}"',
        "dateRange": "custom",
        "startdt": start_date,
        "enddt": end_date,
        "forms": filing_type,
        "ticker": ticker,
    }

    headers = {"User-Agent": USER_AGENT}

    try:
        with httpx.Client(timeout=30) as client:
            resp = client.get(
                "https://efts.sec.gov/LATEST/search-index",
                params=params,
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()

            filings = []
            hits = data.get("hits", {}).get("hits", [])

            for hit in hits:
                source = hit.get("_source", {})
                filings.append(
                    {
                        "accession_number": source.get("file_num", ""),
                        "filing_date": source.get("file_date", ""),
                        "company_name": source.get("display_names", [""])[0]
                        if source.get("display_names")
                        else "",
                        "cik": source.get("entity_id", ""),
                        "form_type": source.get("form_type", ""),
                    }
                )

            return filings

    except httpx.HTTPError as e:
        console.print(f"[red]EDGAR API error: {e}[/red]")
        return []


def fetch_filing_text(ticker: str) -> Optional[str]:
    """
    Fetch the full text of the latest DEF 14A filing for a ticker.

    Uses the EDGAR full-text search API to find the filing,
    then downloads the HTML document content.
    """
    _rate_limit()

    headers = {"User-Agent": USER_AGENT}

    try:
        with httpx.Client(timeout=60, follow_redirects=True) as client:
            # Step 1: Search for latest DEF 14A
            search_url = "https://efts.sec.gov/LATEST/search-index"
            params = {
                "q": f'"DEF 14A"',
                "forms": "DEF 14A",
                "ticker": ticker,
                "dateRange": "custom",
                "startdt": (datetime.now() - timedelta(days=365)).strftime(
                    "%Y-%m-%d"
                ),
                "enddt": datetime.now().strftime("%Y-%m-%d"),
            }

            resp = client.get(search_url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()

            hits = data.get("hits", {}).get("hits", [])
            if not hits:
                console.print(
                    f"[yellow]No DEF 14A filings found for {ticker}[/yellow]"
                )
                return None

            # Get the first (most recent) filing
            source = hits[0].get("_source", {})
            file_url = source.get("file_url", "")

            if not file_url:
                console.print(
                    f"[yellow]No file URL found for {ticker} filing[/yellow]"
                )
                return None

            # Step 2: Download the filing document
            _rate_limit()
            full_url = f"https://www.sec.gov{file_url}" if file_url.startswith("/") else file_url
            doc_resp = client.get(full_url, headers=headers)
            doc_resp.raise_for_status()

            text = doc_resp.text

            # Strip HTML tags for cleaner parsing (basic approach)
            import re

            clean_text = re.sub(r"<[^>]+>", " ", text)
            clean_text = re.sub(r"\s+", " ", clean_text)

            # Truncate to ~100k chars to stay within Claude context limits
            if len(clean_text) > 100_000:
                clean_text = clean_text[:100_000]

            console.print(
                f"[green]Fetched {len(clean_text):,} chars from {ticker} DEF 14A[/green]"
            )
            return clean_text

    except httpx.HTTPError as e:
        console.print(f"[red]Error fetching filing for {ticker}: {e}[/red]")
        return None


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
