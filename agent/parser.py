"""
Claude API proxy statement parser.

Takes raw text from SEC EDGAR DEF 14A filings and uses
Anthropic Claude to extract structured voting proposals.
"""

import json
import os
from typing import Optional
from rich.console import Console

console = Console()

EXTRACTION_PROMPT = """You are parsing an SEC DEF 14A proxy statement filing. Extract ALL voting proposals from this document.

For each proposal, return:
- proposalId (integer, sequential starting from 1)
- title (clean, concise title — max 80 characters)
- category (one of: "Board Election", "Executive Compensation", "Auditor Ratification", "Shareholder Proposal", "ESG", "Corporate Governance", "Capital Allocation", "Other")
- description (2-sentence plain English explanation that a retail investor would understand)
- riskRating ("Low", "Medium", or "High")
- riskJustification (1-sentence explanation of why this risk rating was assigned)
- boardRecommendation ("For", "Against", or "None")

Return ONLY valid JSON matching this exact schema, no other text:
{
  "ticker": "<TICKER>",
  "companyName": "<Full Company Name>",
  "filingDate": "<YYYY-MM-DD>",
  "meetingDate": <unix_timestamp>,
  "meetingType": "Annual" or "Special",
  "proposals": [
    {
      "proposalId": 1,
      "title": "...",
      "category": "...",
      "description": "...",
      "riskRating": "...",
      "riskJustification": "...",
      "boardRecommendation": "..."
    }
  ]
}

If you cannot determine a field (e.g., exact meeting date), use your best estimate based on context.
For meetingDate, convert to Unix timestamp (seconds since epoch).
"""


def parse_proxy_statement(
    filing_text: str,
    ticker: str,
    api_key: Optional[str] = None,
) -> Optional[dict]:
    """
    Parse a proxy statement using Claude API.

    Args:
        filing_text: Raw text content of the DEF 14A filing
        ticker: Company ticker symbol (e.g., "TSLA")
        api_key: Anthropic API key (falls back to env var)

    Returns:
        Parsed JSON dict with proposals, or None on failure
    """
    api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        console.print("[red]ANTHROPIC_API_KEY not set[/red]")
        return None

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)

        console.print(f"[cyan]Sending {ticker} filing to Claude for parsing...[/cyan]")

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": f"{EXTRACTION_PROMPT}\n\nTicker: {ticker}\n\nProxy Statement Text:\n{filing_text}",
                }
            ],
        )

        response_text = message.content[0].text.strip()

        # Extract JSON from response (handle markdown code blocks)
        if response_text.startswith("```"):
            # Remove markdown code block wrapper
            lines = response_text.split("\n")
            json_lines = []
            in_block = False
            for line in lines:
                if line.startswith("```") and not in_block:
                    in_block = True
                    continue
                elif line.startswith("```") and in_block:
                    break
                elif in_block:
                    json_lines.append(line)
            response_text = "\n".join(json_lines)

        parsed = json.loads(response_text)

        # Validate structure
        if "proposals" not in parsed:
            console.print("[red]Parsed response missing 'proposals' key[/red]")
            return None

        proposal_count = len(parsed["proposals"])
        console.print(
            f"[green]Successfully parsed {proposal_count} proposals from {ticker} filing[/green]"
        )

        return parsed

    except json.JSONDecodeError as e:
        console.print(f"[red]Failed to parse Claude response as JSON: {e}[/red]")
        console.print(f"[dim]Response was: {response_text[:500]}...[/dim]")
        return None
    except Exception as e:
        console.print(f"[red]Claude API error: {e}[/red]")
        return None


def parse_demo_filing(ticker: str = "TSLA") -> dict:
    """
    Parse the demo filing without calling Claude API.
    Returns a hardcoded result matching the synthetic TSLA filing.
    """
    return {
        "ticker": "TSLA",
        "companyName": "Tesla, Inc.",
        "filingDate": "2026-04-15",
        "meetingDate": 1786924800,  # Aug 15, 2026
        "meetingType": "Annual",
        "proposals": [
            {
                "proposalId": 1,
                "title": "Election of Board of Directors",
                "category": "Board Election",
                "description": "Vote on the slate of 11 director nominees for the 2026-2027 board term, including 3 new independent directors. Each director will serve a one-year term.",
                "riskRating": "Low",
                "riskJustification": "Standard board election with majority of independent directors.",
                "boardRecommendation": "For",
            },
            {
                "proposalId": 2,
                "title": "Ratification of Ernst & Young as Auditor",
                "category": "Auditor Ratification",
                "description": "Approve the appointment of Ernst & Young LLP as the independent registered public accounting firm for fiscal year 2026. EY has served as Tesla's auditor since 2020.",
                "riskRating": "Low",
                "riskJustification": "Standard annual auditor ratification with no known concerns.",
                "boardRecommendation": "For",
            },
            {
                "proposalId": 3,
                "title": "Approval of Executive Compensation Plan",
                "category": "Executive Compensation",
                "description": "Vote on the revised 2026 performance-based stock option package for the CEO. If approved, the CEO would receive up to $50B in stock options vesting over 5 years.",
                "riskRating": "High",
                "riskJustification": "Largest executive compensation package in corporate history with significant shareholder dilution of ~9%.",
                "boardRecommendation": "For",
            },
            {
                "proposalId": 4,
                "title": "Shareholder Proposal on Climate Risk Reporting",
                "category": "ESG",
                "description": "Request that Tesla publish an annual Climate Action 100+ aligned report detailing transition risks and Scope 3 emissions targets. This would increase transparency on Tesla's environmental impact.",
                "riskRating": "Medium",
                "riskJustification": "Increased reporting obligations and potential strategic disclosure of competitive information.",
                "boardRecommendation": "Against",
            },
        ],
    }
