export interface Proposal {
  proposalId: number;
  title: string;
  category: string;
  description: string;
  riskRating: "Low" | "Medium" | "High";
  riskJustification: string;
  boardRecommendation: "For" | "Against" | "None";
  yesWeight: bigint;
  noWeight: bigint;
  abstainWeight: bigint;
  voterCount: number;
  userVoted?: "yes" | "no" | "abstain";
}

export interface Meeting {
  ticker: string;
  companyName: string;
  meetingDate: string;
  registeredAt: string;
  isActive: boolean;
  proposalCount: number;
  proposals: Proposal[];
  totalVoters: number;
}

export const MOCK_MEETINGS: Meeting[] = [
  {
    ticker: "TSLA",
    companyName: "Tesla, Inc.",
    meetingDate: "2026-08-15",
    registeredAt: "2026-06-08",
    isActive: true,
    proposalCount: 4,
    totalVoters: 1247,
    proposals: [
      {
        proposalId: 1,
        title: "Approval of Executive Compensation Plan",
        category: "Executive Compensation",
        description:
          "Vote on the revised 2026 performance-based stock option package for the CEO. If approved, the CEO would receive up to $50B in stock options vesting over 5 years.",
        riskRating: "High",
        riskJustification:
          "Largest executive compensation package in corporate history with significant shareholder dilution.",
        boardRecommendation: "For",
        yesWeight: BigInt("68420000000000000000000"),
        noWeight: BigInt("22150000000000000000000"),
        abstainWeight: BigInt("9430000000000000000000"),
        voterCount: 1247,
      },
      {
        proposalId: 2,
        title: "Ratification of Ernst & Young as Auditor",
        category: "Auditor Ratification",
        description:
          "Approve the appointment of Ernst & Young LLP as the independent registered public accounting firm for fiscal year 2026.",
        riskRating: "Low",
        riskJustification:
          "Standard annual auditor ratification with no known concerns.",
        boardRecommendation: "For",
        yesWeight: BigInt("85000000000000000000000"),
        noWeight: BigInt("5000000000000000000000"),
        abstainWeight: BigInt("10000000000000000000000"),
        voterCount: 1247,
      },
      {
        proposalId: 3,
        title: "Shareholder Proposal on Climate Risk Reporting",
        category: "ESG",
        description:
          "Request that Tesla publish an annual Climate Action 100+ aligned report detailing transition risks and Scope 3 emissions targets.",
        riskRating: "Medium",
        riskJustification:
          "Increased reporting obligations and potential strategic disclosure of competitive information.",
        boardRecommendation: "Against",
        yesWeight: BigInt("35000000000000000000000"),
        noWeight: BigInt("55000000000000000000000"),
        abstainWeight: BigInt("10000000000000000000000"),
        voterCount: 1247,
      },
      {
        proposalId: 4,
        title: "Election of Board of Directors",
        category: "Board Election",
        description:
          "Vote on the slate of 11 director nominees for the 2026-2027 board term, including 3 new independent directors.",
        riskRating: "Low",
        riskJustification:
          "Standard board election with majority of independent directors.",
        boardRecommendation: "For",
        yesWeight: BigInt("75000000000000000000000"),
        noWeight: BigInt("15000000000000000000000"),
        abstainWeight: BigInt("10000000000000000000000"),
        voterCount: 1247,
      },
    ],
  },
  {
    ticker: "AAPL",
    companyName: "Apple Inc.",
    meetingDate: "2026-09-10",
    registeredAt: "2026-06-05",
    isActive: true,
    proposalCount: 3,
    totalVoters: 2891,
    proposals: [
      {
        proposalId: 1,
        title: "Advisory Vote on Executive Compensation",
        category: "Executive Compensation",
        description:
          "Non-binding advisory vote on the compensation of Apple's named executive officers as disclosed in the proxy statement.",
        riskRating: "Low",
        riskJustification:
          "Advisory vote with compensation aligned to peer benchmarks.",
        boardRecommendation: "For",
        yesWeight: BigInt("120000000000000000000000"),
        noWeight: BigInt("15000000000000000000000"),
        abstainWeight: BigInt("8000000000000000000000"),
        voterCount: 2891,
      },
      {
        proposalId: 2,
        title: "Ratification of Deloitte as Auditor",
        category: "Auditor Ratification",
        description:
          "Approve the appointment of Deloitte & Touche LLP as independent auditor for fiscal year 2026.",
        riskRating: "Low",
        riskJustification: "Continuation of long-standing auditor relationship.",
        boardRecommendation: "For",
        yesWeight: BigInt("130000000000000000000000"),
        noWeight: BigInt("5000000000000000000000"),
        abstainWeight: BigInt("8000000000000000000000"),
        voterCount: 2891,
      },
      {
        proposalId: 3,
        title: "Shareholder Proposal on AI Transparency",
        category: "Shareholder Proposal",
        description:
          "Request that Apple publish a transparency report on AI model training data sources and algorithmic decision-making processes.",
        riskRating: "Medium",
        riskJustification:
          "May require disclosure of proprietary AI methodologies.",
        boardRecommendation: "Against",
        yesWeight: BigInt("45000000000000000000000"),
        noWeight: BigInt("80000000000000000000000"),
        abstainWeight: BigInt("18000000000000000000000"),
        voterCount: 2891,
      },
    ],
  },
  {
    ticker: "NVDA",
    companyName: "NVIDIA Corporation",
    meetingDate: "2026-07-20",
    registeredAt: "2026-06-01",
    isActive: true,
    proposalCount: 2,
    totalVoters: 3456,
    proposals: [
      {
        proposalId: 1,
        title: "Approval of 2026 Equity Incentive Plan",
        category: "Executive Compensation",
        description:
          "Approve a new equity incentive plan authorizing 50M additional shares for employee stock grants and options.",
        riskRating: "Medium",
        riskJustification:
          "Shareholder dilution of approximately 2.3% but necessary for talent retention.",
        boardRecommendation: "For",
        yesWeight: BigInt("95000000000000000000000"),
        noWeight: BigInt("25000000000000000000000"),
        abstainWeight: BigInt("12000000000000000000000"),
        voterCount: 3456,
      },
      {
        proposalId: 2,
        title: "Election of Board of Directors",
        category: "Board Election",
        description:
          "Vote on the re-election of 12 director nominees including CEO Jensen Huang and 8 independent directors.",
        riskRating: "Low",
        riskJustification:
          "Well-regarded board with strong independent representation.",
        boardRecommendation: "For",
        yesWeight: BigInt("110000000000000000000000"),
        noWeight: BigInt("10000000000000000000000"),
        abstainWeight: BigInt("12000000000000000000000"),
        voterCount: 3456,
      },
    ],
  },
  {
    ticker: "MSFT",
    companyName: "Microsoft Corporation",
    meetingDate: "2026-09-25",
    registeredAt: "2026-06-07",
    isActive: true,
    proposalCount: 5,
    totalVoters: 4102,
    proposals: [
      {
        proposalId: 1,
        title: "Advisory Vote on Executive Compensation",
        category: "Executive Compensation",
        description:
          "Non-binding advisory vote approving the compensation of Microsoft's named executive officers, including CEO Satya Nadella's $55M total package.",
        riskRating: "Low",
        riskJustification:
          "Compensation is within industry norms for mega-cap tech CEOs.",
        boardRecommendation: "For",
        yesWeight: BigInt("140000000000000000000000"),
        noWeight: BigInt("18000000000000000000000"),
        abstainWeight: BigInt("7000000000000000000000"),
        voterCount: 4102,
      },
      {
        proposalId: 2,
        title: "Ratification of PricewaterhouseCoopers as Auditor",
        category: "Auditor Ratification",
        description:
          "Approve the appointment of PricewaterhouseCoopers LLP as independent auditor for fiscal year 2027.",
        riskRating: "Low",
        riskJustification:
          "Long-standing auditor with no material findings in prior engagements.",
        boardRecommendation: "For",
        yesWeight: BigInt("155000000000000000000000"),
        noWeight: BigInt("3000000000000000000000"),
        abstainWeight: BigInt("7000000000000000000000"),
        voterCount: 4102,
      },
      {
        proposalId: 3,
        title: "Amendment to Certificate of Incorporation",
        category: "Corporate Governance",
        description:
          "Proposal to amend the certificate of incorporation to eliminate supermajority voting requirements for certain charter amendments, replacing with simple majority.",
        riskRating: "Medium",
        riskJustification:
          "Reduces threshold for future governance changes, potentially weakening minority shareholder protections.",
        boardRecommendation: "For",
        yesWeight: BigInt("90000000000000000000000"),
        noWeight: BigInt("50000000000000000000000"),
        abstainWeight: BigInt("25000000000000000000000"),
        voterCount: 4102,
      },
      {
        proposalId: 4,
        title: "Shareholder Proposal on Responsible AI Deployment",
        category: "Shareholder Proposal",
        description:
          "Request that Microsoft commission an independent third-party report on risks associated with AI-powered content generation, deepfakes, and Copilot hallucinations.",
        riskRating: "High",
        riskJustification:
          "Could expose proprietary safety evaluation methods and create regulatory precedent.",
        boardRecommendation: "Against",
        yesWeight: BigInt("55000000000000000000000"),
        noWeight: BigInt("85000000000000000000000"),
        abstainWeight: BigInt("25000000000000000000000"),
        voterCount: 4102,
      },
      {
        proposalId: 5,
        title: "Shareholder Proposal on Tax Transparency",
        category: "Shareholder Proposal",
        description:
          "Request that Microsoft publish a country-by-country tax report aligned with GRI 207 standards, disclosing revenue, profit, and tax paid per jurisdiction.",
        riskRating: "Medium",
        riskJustification:
          "May reveal tax optimization strategies and competitive financial structure details.",
        boardRecommendation: "Against",
        yesWeight: BigInt("42000000000000000000000"),
        noWeight: BigInt("95000000000000000000000"),
        abstainWeight: BigInt("28000000000000000000000"),
        voterCount: 4102,
      },
    ],
  },
  {
    ticker: "AMZN",
    companyName: "Amazon.com, Inc.",
    meetingDate: "2026-08-05",
    registeredAt: "2026-05-28",
    isActive: true,
    proposalCount: 4,
    totalVoters: 5230,
    proposals: [
      {
        proposalId: 1,
        title: "Election of Board of Directors",
        category: "Board Election",
        description:
          "Vote on 10 director nominees including 2 new independent directors with backgrounds in AI governance and supply chain sustainability.",
        riskRating: "Low",
        riskJustification:
          "Strong slate with increased board independence and relevant expertise.",
        boardRecommendation: "For",
        yesWeight: BigInt("180000000000000000000000"),
        noWeight: BigInt("20000000000000000000000"),
        abstainWeight: BigInt("15000000000000000000000"),
        voterCount: 5230,
      },
      {
        proposalId: 2,
        title: "Approval of $10B Share Repurchase Program",
        category: "Capital Allocation",
        description:
          "Authorize the board to repurchase up to $10 billion in common stock over the next 24 months through open market transactions.",
        riskRating: "Medium",
        riskJustification:
          "Large capital commitment that could limit R&D and acquisition capacity during critical AI infrastructure buildout.",
        boardRecommendation: "For",
        yesWeight: BigInt("120000000000000000000000"),
        noWeight: BigInt("60000000000000000000000"),
        abstainWeight: BigInt("35000000000000000000000"),
        voterCount: 5230,
      },
      {
        proposalId: 3,
        title: "Shareholder Proposal on Warehouse Worker Safety",
        category: "Shareholder Proposal",
        description:
          "Request that Amazon commission an independent audit of injury rates across fulfillment centers and publish a corrective action plan with measurable targets.",
        riskRating: "High",
        riskJustification:
          "Significant operational and reputational risk. OSHA citations have increased 3x since 2024.",
        boardRecommendation: "Against",
        yesWeight: BigInt("75000000000000000000000"),
        noWeight: BigInt("100000000000000000000000"),
        abstainWeight: BigInt("40000000000000000000000"),
        voterCount: 5230,
      },
      {
        proposalId: 4,
        title: "Ratification of KPMG as Auditor",
        category: "Auditor Ratification",
        description:
          "Approve the appointment of KPMG LLP as the independent registered public accounting firm for fiscal year 2026.",
        riskRating: "Low",
        riskJustification:
          "Standard auditor ratification. KPMG has served Amazon since 2020 with clean opinions.",
        boardRecommendation: "For",
        yesWeight: BigInt("190000000000000000000000"),
        noWeight: BigInt("8000000000000000000000"),
        abstainWeight: BigInt("17000000000000000000000"),
        voterCount: 5230,
      },
    ],
  },
  {
    ticker: "GOOGL",
    companyName: "Alphabet Inc.",
    meetingDate: "2026-07-30",
    registeredAt: "2026-06-03",
    isActive: true,
    proposalCount: 3,
    totalVoters: 3879,
    proposals: [
      {
        proposalId: 1,
        title: "Recapitalization to Eliminate Dual-Class Structure",
        category: "Corporate Governance",
        description:
          "Shareholder proposal to collapse Class A, B, and C shares into a single class with equal voting rights, ending the founders' supervoting control.",
        riskRating: "High",
        riskJustification:
          "Would fundamentally alter corporate control structure. Founders currently hold ~51% voting power with ~12% economic interest.",
        boardRecommendation: "Against",
        yesWeight: BigInt("60000000000000000000000"),
        noWeight: BigInt("130000000000000000000000"),
        abstainWeight: BigInt("20000000000000000000000"),
        voterCount: 3879,
      },
      {
        proposalId: 2,
        title: "Advisory Vote on Executive Compensation",
        category: "Executive Compensation",
        description:
          "Non-binding say-on-pay vote on compensation of named executive officers including CEO Sundar Pichai's $226M total package.",
        riskRating: "Medium",
        riskJustification:
          "CEO compensation is above 90th percentile of S&P 500 peers, though driven primarily by stock awards.",
        boardRecommendation: "For",
        yesWeight: BigInt("95000000000000000000000"),
        noWeight: BigInt("70000000000000000000000"),
        abstainWeight: BigInt("45000000000000000000000"),
        voterCount: 3879,
      },
      {
        proposalId: 3,
        title: "Shareholder Proposal on Antitrust Risk Disclosure",
        category: "Shareholder Proposal",
        description:
          "Request that Alphabet publish a comprehensive report on financial exposure from ongoing DOJ and EU antitrust proceedings, including worst-case scenario modeling.",
        riskRating: "High",
        riskJustification:
          "Active litigation with potential for structural remedies including forced divestiture of Chrome or Android.",
        boardRecommendation: "Against",
        yesWeight: BigInt("80000000000000000000000"),
        noWeight: BigInt("90000000000000000000000"),
        abstainWeight: BigInt("40000000000000000000000"),
        voterCount: 3879,
      },
    ],
  },
  {
    ticker: "META",
    companyName: "Meta Platforms, Inc.",
    meetingDate: "2026-08-22",
    registeredAt: "2026-06-06",
    isActive: true,
    proposalCount: 3,
    totalVoters: 2654,
    proposals: [
      {
        proposalId: 1,
        title: "Approval of Metaverse Capital Expenditure Budget",
        category: "Capital Allocation",
        description:
          "Authorize $18B in capital expenditure for Reality Labs division in FY2027, covering Quest headsets, Horizon Worlds, and AR glasses development.",
        riskRating: "High",
        riskJustification:
          "Reality Labs has accumulated $50B+ in losses since 2020 with uncertain path to profitability.",
        boardRecommendation: "For",
        yesWeight: BigInt("70000000000000000000000"),
        noWeight: BigInt("85000000000000000000000"),
        abstainWeight: BigInt("30000000000000000000000"),
        voterCount: 2654,
      },
      {
        proposalId: 2,
        title: "Election of Board of Directors",
        category: "Board Election",
        description:
          "Vote on 9 director nominees. CEO Mark Zuckerberg holds majority voting control through Class B shares regardless of outcome.",
        riskRating: "Low",
        riskJustification:
          "Dual-class structure means this vote is largely advisory for non-Zuckerberg nominees.",
        boardRecommendation: "For",
        yesWeight: BigInt("110000000000000000000000"),
        noWeight: BigInt("30000000000000000000000"),
        abstainWeight: BigInt("45000000000000000000000"),
        voterCount: 2654,
      },
      {
        proposalId: 3,
        title: "Shareholder Proposal on Content Moderation Audit",
        category: "Shareholder Proposal",
        description:
          "Request an independent human rights impact assessment of Meta's content moderation policies across Facebook, Instagram, WhatsApp, and Threads.",
        riskRating: "Medium",
        riskJustification:
          "Regulatory scrutiny increasing globally. EU Digital Services Act compliance already mandates some disclosures.",
        boardRecommendation: "Against",
        yesWeight: BigInt("65000000000000000000000"),
        noWeight: BigInt("90000000000000000000000"),
        abstainWeight: BigInt("30000000000000000000000"),
        voterCount: 2654,
      },
    ],
  },
  {
    ticker: "JPM",
    companyName: "JPMorgan Chase & Co.",
    meetingDate: "2026-07-15",
    registeredAt: "2026-05-30",
    isActive: true,
    proposalCount: 3,
    totalVoters: 1893,
    proposals: [
      {
        proposalId: 1,
        title: "CEO Succession Planning Disclosure",
        category: "Corporate Governance",
        description:
          "Shareholder proposal requesting the board publish a detailed CEO succession plan given Jamie Dimon's 20+ year tenure and approaching retirement timeline.",
        riskRating: "Medium",
        riskJustification:
          "Key-person risk is material. Dimon's departure without clear successor could impact market confidence.",
        boardRecommendation: "Against",
        yesWeight: BigInt("50000000000000000000000"),
        noWeight: BigInt("55000000000000000000000"),
        abstainWeight: BigInt("20000000000000000000000"),
        voterCount: 1893,
      },
      {
        proposalId: 2,
        title: "Ratification of PricewaterhouseCoopers as Auditor",
        category: "Auditor Ratification",
        description:
          "Approve the reappointment of PwC as independent auditor. PwC has served as JPMorgan's auditor for over 50 consecutive years.",
        riskRating: "Low",
        riskJustification:
          "Some shareholder concern about auditor independence given tenure length, but no regulatory findings.",
        boardRecommendation: "For",
        yesWeight: BigInt("100000000000000000000000"),
        noWeight: BigInt("12000000000000000000000"),
        abstainWeight: BigInt("13000000000000000000000"),
        voterCount: 1893,
      },
      {
        proposalId: 3,
        title: "Shareholder Proposal on Fossil Fuel Financing Policy",
        category: "ESG",
        description:
          "Request that JPMorgan adopt a policy to phase out financing of new fossil fuel exploration and production projects by 2030, aligned with IEA Net Zero pathway.",
        riskRating: "High",
        riskJustification:
          "Would impact ~$38B in energy sector lending. Potential loss of major corporate banking relationships.",
        boardRecommendation: "Against",
        yesWeight: BigInt("35000000000000000000000"),
        noWeight: BigInt("72000000000000000000000"),
        abstainWeight: BigInt("18000000000000000000000"),
        voterCount: 1893,
      },
    ],
  },
];

export function formatTokenWeight(weight: bigint): string {
  const eth = Number(weight) / 1e18;
  if (eth >= 1_000_000) return `${(eth / 1_000_000).toFixed(1)}M`;
  if (eth >= 1_000) return `${(eth / 1_000).toFixed(1)}K`;
  return eth.toFixed(0);
}

export function getVotePercentage(
  yes: bigint,
  no: bigint,
  abstain: bigint
): { yesPercent: number; noPercent: number; abstainPercent: number } {
  const total = Number(yes + no + abstain);
  if (total === 0) return { yesPercent: 0, noPercent: 0, abstainPercent: 0 };
  return {
    yesPercent: (Number(yes) / total) * 100,
    noPercent: (Number(no) / total) * 100,
    abstainPercent: (Number(abstain) / total) * 100,
  };
}
