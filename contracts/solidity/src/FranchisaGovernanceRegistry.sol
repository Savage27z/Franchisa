// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Interface for ERC20Votes — getPastVotes for snapshot voting
interface IERC20Votes {
    function getPastVotes(address account, uint256 timepoint) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

interface IProxyOracleStylus {
    function castProxyVote(
        address voter,
        bytes32 ticker,
        uint256 meetingId,
        uint256 proposalId,
        uint256 choice,
        uint256 balance
    ) external returns (bool);

    function compileFinalResults(
        bytes32 ticker,
        uint256 meetingId,
        uint256 proposalId
    ) external view returns (uint256, uint256, uint256);

    function getVoterCount(
        bytes32 ticker,
        uint256 meetingId,
        uint256 proposalId
    ) external view returns (uint256);

    function hasUserVoted(
        address voter,
        bytes32 ticker,
        uint256 meetingId,
        uint256 proposalId
    ) external view returns (bool);

    function getUserVote(
        address voter,
        bytes32 ticker,
        uint256 meetingId,
        uint256 proposalId
    ) external view returns (uint256, uint256);
}

contract FranchisaGovernanceRegistry is Ownable, Pausable, ReentrancyGuard {
    struct Proposal {
        uint8 proposalId;
        string title;
        string category;
        string description;
        string riskRating;
        string riskJustification;
        string boardRecommendation;
    }

    struct Meeting {
        bytes32 ticker;
        string companyName;
        uint256 meetingDate;
        uint256 registeredAt;
        bool isActive;
        uint8 proposalCount;
        // ─── Filing provenance ──────────────────────────────────────
        bytes32 filingHash;         // keccak256 of the raw DEF 14A filing text
        string accessionNumber;     // SEC EDGAR accession number (e.g. "0001193125-26-123456")
        // ─── Snapshot block for vote weight ─────────────────────────
        uint256 snapshotBlock;      // block.number at registration — getPastVotes uses this
        // ─── Meeting epoch ──────────────────────────────────────────
        uint256 meetingId;          // Monotonic nonce — isolates engine vote storage per cycle
    }

    address public stylusVotingEngine;
    address public tokenizedAssetRegistry; // ERC20Votes token

    /// @notice Monotonically increasing meeting nonce — each registration gets a unique ID.
    ///         Prevents stale vote flags in the engine when a ticker is closed & re-registered.
    uint256 public meetingNonce;

    // ticker (bytes32) => Meeting
    mapping(bytes32 => Meeting) public meetings;

    // ticker (bytes32) => proposalId => Proposal
    mapping(bytes32 => mapping(uint8 => Proposal)) public proposals;

    // List of all registered tickers for enumeration (deduplicated)
    bytes32[] public registeredTickers;

    // Track which tickers have been registered (prevents array duplication)
    mapping(bytes32 => bool) private _tickerRegistered;

    // Cached active meeting counter (avoids O(n) loop in view)
    uint256 private _activeMeetingCount;

    // Authorized agent addresses that can register meetings
    mapping(address => bool) public authorizedAgents;

    event MeetingRegistered(
        bytes32 indexed ticker,
        string companyName,
        uint256 meetingDate,
        uint8 proposalCount,
        bytes32 filingHash,
        uint256 snapshotBlock
    );

    event ProposalRegistered(
        bytes32 indexed ticker,
        uint8 indexed proposalId,
        string title,
        string category
    );

    event VoteSubmitted(
        address indexed voter,
        bytes32 indexed ticker,
        uint8 indexed proposalId,
        uint8 choice,
        uint256 weight
    );

    event MeetingClosed(bytes32 indexed ticker);

    modifier onlyAgent() {
        require(
            authorizedAgents[msg.sender] || msg.sender == owner(),
            "Not authorized agent"
        );
        _;
    }

    constructor(
        address _stylusTarget,
        address _tokenRegistry
    ) Ownable(msg.sender) {
        stylusVotingEngine = _stylusTarget;
        tokenizedAssetRegistry = _tokenRegistry;
    }

    // ─── Admin Functions ─────────────────────────────────────────────

    function setAgent(address agent, bool authorized) external onlyOwner {
        authorizedAgents[agent] = authorized;
    }

    function setStylusEngine(address _engine) external onlyOwner {
        stylusVotingEngine = _engine;
    }

    function setTokenRegistry(address _registry) external onlyOwner {
        tokenizedAssetRegistry = _registry;
    }

    /// @notice Emergency pause — halts all voting and registration
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Resume operations after pause
    function unpause() external onlyOwner {
        _unpause();
    }

    // ─── Agent Functions ─────────────────────────────────────────────

    /// @notice Register a shareholder meeting with verifiable filing provenance
    /// @param filingHash keccak256 hash of the raw DEF 14A filing text from EDGAR.
    ///        Anyone can fetch the filing, hash it, and verify proposals derived from it.
    /// @param accessionNumber SEC EDGAR accession number for the filing
    function registerMeeting(
        bytes32 ticker,
        string calldata companyName,
        uint256 meetingDate,
        uint8[] calldata proposalIds,
        string[] calldata titles,
        string[] calldata categories,
        string[] calldata descriptions,
        string[] calldata riskRatings,
        string[] calldata riskJustifications,
        string[] calldata boardRecommendations,
        bytes32 filingHash,
        string calldata accessionNumber
    ) external onlyAgent whenNotPaused {
        uint256 len = proposalIds.length;
        require(len > 0, "Must include at least one proposal");
        require(len == titles.length, "Array length mismatch");
        require(len == categories.length, "Array length mismatch");
        require(len == descriptions.length, "Array length mismatch");
        require(len == riskRatings.length, "Array length mismatch");
        require(len == riskJustifications.length, "Array length mismatch");
        require(len == boardRecommendations.length, "Array length mismatch");
        require(!meetings[ticker].isActive, "Meeting already active for ticker");

        // Enforce sequential proposalIds: must be 1, 2, 3, ... N
        for (uint8 i = 0; i < len; i++) {
            require(proposalIds[i] == i + 1, "Proposal IDs must be sequential 1..N");
        }

        // Snapshot is the PREVIOUS block (current block's votes aren't finalized yet)
        uint256 snapshot = block.number - 1;

        // Each meeting gets a unique ID — isolates engine vote storage across epochs
        uint256 currentMeetingId = ++meetingNonce;

        meetings[ticker] = Meeting({
            ticker: ticker,
            companyName: companyName,
            meetingDate: meetingDate,
            registeredAt: block.timestamp,
            isActive: true,
            proposalCount: uint8(len),
            filingHash: filingHash,
            accessionNumber: accessionNumber,
            snapshotBlock: snapshot,
            meetingId: currentMeetingId
        });

        for (uint8 i = 0; i < len; i++) {
            proposals[ticker][proposalIds[i]] = Proposal({
                proposalId: proposalIds[i],
                title: titles[i],
                category: categories[i],
                description: descriptions[i],
                riskRating: riskRatings[i],
                riskJustification: riskJustifications[i],
                boardRecommendation: boardRecommendations[i]
            });

            emit ProposalRegistered(ticker, proposalIds[i], titles[i], categories[i]);
        }

        // Deduplicated ticker array — only push if first time seeing this ticker
        if (!_tickerRegistered[ticker]) {
            registeredTickers.push(ticker);
            _tickerRegistered[ticker] = true;
        }
        _activeMeetingCount++;

        emit MeetingRegistered(
            ticker,
            companyName,
            meetingDate,
            uint8(len),
            filingHash,
            snapshot
        );
    }

    // ─── Voting ──────────────────────────────────────────────────────

    function submitVote(
        bytes32 ticker,
        uint8 proposalId,
        uint8 choice
    ) external whenNotPaused nonReentrant {
        Meeting storage m = meetings[ticker];
        require(m.isActive, "No active meeting for ticker");
        require(block.timestamp < m.meetingDate, "Voting closed: meeting date has passed");
        require(choice <= 2, "Invalid choice: 0=No, 1=Yes, 2=Abstain");
        require(
            proposalId > 0 && proposalId <= m.proposalCount,
            "Invalid proposal ID"
        );

        // Use snapshot voting: weight = balance at registration block
        // This prevents transfer-and-vote attacks (vote, send tokens to alt, revote)
        uint256 voteWeight = IERC20Votes(tokenizedAssetRegistry).getPastVotes(
            msg.sender,
            m.snapshotBlock
        );
        require(voteWeight > 0, "No voting power at snapshot block");

        bool success = IProxyOracleStylus(stylusVotingEngine).castProxyVote(
            msg.sender,
            ticker,
            m.meetingId,
            proposalId,
            choice,
            voteWeight
        );
        require(success, "Stylus vote execution failed");

        emit VoteSubmitted(msg.sender, ticker, proposalId, choice, voteWeight);
    }

    // ─── Read Functions ──────────────────────────────────────────────

    function getResults(
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (uint256 yes, uint256 no, uint256 abstain) {
        uint256 mid = meetings[ticker].meetingId;
        return
            IProxyOracleStylus(stylusVotingEngine).compileFinalResults(
                ticker,
                mid,
                proposalId
            );
    }

    function getVoterCount(
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (uint256) {
        uint256 mid = meetings[ticker].meetingId;
        return
            IProxyOracleStylus(stylusVotingEngine).getVoterCount(
                ticker,
                mid,
                proposalId
            );
    }

    function hasUserVoted(
        address voter,
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (bool) {
        uint256 mid = meetings[ticker].meetingId;
        return
            IProxyOracleStylus(stylusVotingEngine).hasUserVoted(
                voter,
                ticker,
                mid,
                proposalId
            );
    }

    function getUserVote(
        address voter,
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (uint256 choice, uint256 weight) {
        uint256 mid = meetings[ticker].meetingId;
        return
            IProxyOracleStylus(stylusVotingEngine).getUserVote(
                voter,
                ticker,
                mid,
                proposalId
            );
    }

    function getProposal(
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (Proposal memory) {
        return proposals[ticker][proposalId];
    }

    function getMeeting(
        bytes32 ticker
    ) external view returns (Meeting memory) {
        return meetings[ticker];
    }

    function getRegisteredTickerCount() external view returns (uint256) {
        return registeredTickers.length;
    }

    /// @notice Returns cached count of active meetings (O(1) instead of O(n))
    function getActiveMeetingCount() external view returns (uint256) {
        return _activeMeetingCount;
    }

    /// @notice Close a meeting and clean up stale proposal data
    function closeMeeting(bytes32 ticker) external onlyAgent {
        require(meetings[ticker].isActive, "Meeting not active");

        // Delete stale proposals to prevent data pollution on re-registration
        uint8 count = meetings[ticker].proposalCount;
        for (uint8 i = 1; i <= count; i++) {
            delete proposals[ticker][i];
        }

        meetings[ticker].isActive = false;
        _activeMeetingCount--;

        emit MeetingClosed(ticker);
    }
}
