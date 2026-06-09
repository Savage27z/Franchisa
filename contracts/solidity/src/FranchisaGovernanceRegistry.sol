// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IProxyOracleStylus {
    function cast_proxy_vote(
        address voter,
        bytes32 ticker,
        uint8 proposalId,
        uint8 choice,
        uint256 balance
    ) external returns (bool);

    function compile_final_results(
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (uint256, uint256, uint256);

    function get_voter_count(
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (uint256);

    function has_user_voted(
        address voter,
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (bool);

    function get_user_vote(
        address voter,
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (uint8, uint256);
}

contract FranchisaGovernanceRegistry is Ownable {
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
    }

    address public stylusVotingEngine;
    address public tokenizedAssetRegistry; // Mock RWA ERC-20 token

    // ticker (bytes32) => Meeting
    mapping(bytes32 => Meeting) public meetings;

    // ticker (bytes32) => proposalId => Proposal
    mapping(bytes32 => mapping(uint8 => Proposal)) public proposals;

    // List of all registered tickers for enumeration
    bytes32[] public registeredTickers;

    // Authorized agent addresses that can register meetings
    mapping(address => bool) public authorizedAgents;

    event MeetingRegistered(
        bytes32 indexed ticker,
        string companyName,
        uint256 meetingDate,
        uint8 proposalCount
    );

    event VoteSubmitted(
        address indexed voter,
        bytes32 indexed ticker,
        uint8 proposalId,
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

    // ─── Agent Functions ─────────────────────────────────────────────

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
        string[] calldata boardRecommendations
    ) external onlyAgent {
        require(proposalIds.length == titles.length, "Array length mismatch");
        require(proposalIds.length == categories.length, "Array length mismatch");
        require(proposalIds.length == descriptions.length, "Array length mismatch");
        require(proposalIds.length == riskRatings.length, "Array length mismatch");
        require(proposalIds.length == riskJustifications.length, "Array length mismatch");
        require(proposalIds.length == boardRecommendations.length, "Array length mismatch");
        require(!meetings[ticker].isActive, "Meeting already active for ticker");

        meetings[ticker] = Meeting({
            ticker: ticker,
            companyName: companyName,
            meetingDate: meetingDate,
            registeredAt: block.timestamp,
            isActive: true,
            proposalCount: uint8(proposalIds.length)
        });

        for (uint8 i = 0; i < proposalIds.length; i++) {
            proposals[ticker][proposalIds[i]] = Proposal({
                proposalId: proposalIds[i],
                title: titles[i],
                category: categories[i],
                description: descriptions[i],
                riskRating: riskRatings[i],
                riskJustification: riskJustifications[i],
                boardRecommendation: boardRecommendations[i]
            });
        }

        registeredTickers.push(ticker);

        emit MeetingRegistered(
            ticker,
            companyName,
            meetingDate,
            uint8(proposalIds.length)
        );
    }

    // ─── Voting ──────────────────────────────────────────────────────

    function submitVote(
        bytes32 ticker,
        uint8 proposalId,
        uint8 choice
    ) external {
        require(meetings[ticker].isActive, "No active meeting for ticker");
        require(choice <= 2, "Invalid choice: 0=No, 1=Yes, 2=Abstain");
        require(
            proposalId > 0 && proposalId <= meetings[ticker].proposalCount,
            "Invalid proposal ID"
        );

        uint256 userBalance = IERC20(tokenizedAssetRegistry).balanceOf(
            msg.sender
        );
        require(userBalance > 0, "Must hold tokenized stock to vote");

        bool success = IProxyOracleStylus(stylusVotingEngine).cast_proxy_vote(
            msg.sender,
            ticker,
            proposalId,
            choice,
            userBalance
        );
        require(success, "Stylus vote execution failed");

        emit VoteSubmitted(msg.sender, ticker, proposalId, choice, userBalance);
    }

    // ─── Read Functions ──────────────────────────────────────────────

    function getResults(
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (uint256 yes, uint256 no, uint256 abstain) {
        return
            IProxyOracleStylus(stylusVotingEngine).compile_final_results(
                ticker,
                proposalId
            );
    }

    function getVoterCount(
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (uint256) {
        return
            IProxyOracleStylus(stylusVotingEngine).get_voter_count(
                ticker,
                proposalId
            );
    }

    function hasUserVoted(
        address voter,
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (bool) {
        return
            IProxyOracleStylus(stylusVotingEngine).has_user_voted(
                voter,
                ticker,
                proposalId
            );
    }

    function getUserVote(
        address voter,
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (uint8 choice, uint256 weight) {
        return
            IProxyOracleStylus(stylusVotingEngine).get_user_vote(
                voter,
                ticker,
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

    function getActiveMeetingCount() external view returns (uint256 count) {
        for (uint256 i = 0; i < registeredTickers.length; i++) {
            if (meetings[registeredTickers[i]].isActive) count++;
        }
    }

    function closeMeeting(bytes32 ticker) external onlyAgent {
        meetings[ticker].isActive = false;
        emit MeetingClosed(ticker);
    }
}
