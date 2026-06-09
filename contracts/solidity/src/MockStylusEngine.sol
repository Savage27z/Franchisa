// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockStylusEngine
 * @notice Solidity stand-in for the Rust/Stylus ProxyOracle voting engine.
 *         Deployed as a temporary placeholder until the real Stylus contract
 *         is compiled and deployed from a Linux environment.
 *
 *         The interface is IDENTICAL to the Stylus contract — swapping is
 *         a single address update in the registry.
 *
 * @dev In production, this logic runs in Rust via Arbitrum Stylus for
 *      90%+ gas savings on compute-heavy vote aggregation.
 *
 * @dev SECURITY: Only the authorized registry contract can call cast_proxy_vote.
 *      This prevents vote forgery by direct calls to the engine.
 */
contract MockStylusEngine {
    /// @notice The governance registry — only caller allowed to cast votes
    address public authorizedRegistry;

    /// @notice Owner who can set the registry (deployer)
    address public immutable owner;

    modifier onlyRegistry() {
        require(
            authorizedRegistry == address(0) || msg.sender == authorizedRegistry,
            "MockStylusEngine: caller is not the authorized registry"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Lock the engine to a specific registry contract.
    ///         Once set to a non-zero address, only owner can change it.
    function setAuthorizedRegistry(address _registry) external {
        require(msg.sender == owner, "Only owner can set registry");
        authorizedRegistry = _registry;
    }

    // ─── Meeting Epochs ─────────────────────────────────────────────
    // All vote storage is keyed by (ticker, meetingId, proposalId) so
    // closing and re-registering the same ticker starts a clean epoch.
    // The registry assigns a monotonically increasing meetingId per
    // registration and passes it on every engine call.

    // voter => ticker => meetingId => proposalId => voted
    mapping(address => mapping(bytes32 => mapping(uint256 => mapping(uint8 => bool)))) private _hasVoted;

    // voter => ticker => meetingId => proposalId => choice
    mapping(address => mapping(bytes32 => mapping(uint256 => mapping(uint8 => uint8)))) private _userChoices;

    // voter => ticker => meetingId => proposalId => weight
    mapping(address => mapping(bytes32 => mapping(uint256 => mapping(uint8 => uint256)))) private _userWeights;

    // ticker => meetingId => proposalId => choice => total_weight
    mapping(bytes32 => mapping(uint256 => mapping(uint8 => mapping(uint8 => uint256)))) private _totalWeights;

    // ticker => meetingId => proposalId => voter_count
    mapping(bytes32 => mapping(uint256 => mapping(uint8 => uint256))) private _voterCount;

    /**
     * @notice Cast a weighted proxy vote. Called ONLY by the governance registry.
     * @param voter The actual voter address (passed from the registry's msg.sender)
     * @param ticker The company ticker as bytes32
     * @param meetingId Epoch identifier — prevents stale vote flags across meeting cycles
     * @param proposalId The proposal number (1-indexed)
     * @param choice 0=No, 1=Yes, 2=Abstain
     * @param tokenBalance The voter's token balance (vote weight)
     * @return success True if the vote was recorded, false if already voted or invalid
     */
    function cast_proxy_vote(
        address voter,
        bytes32 ticker,
        uint256 meetingId,
        uint8 proposalId,
        uint8 choice,
        uint256 tokenBalance
    ) external onlyRegistry returns (bool) {
        // Prevent double voting within the same meeting epoch
        if (_hasVoted[voter][ticker][meetingId][proposalId]) return false;

        // Validate
        if (choice > 2) return false;
        if (tokenBalance == 0) return false;

        // Record vote
        _hasVoted[voter][ticker][meetingId][proposalId] = true;
        _userChoices[voter][ticker][meetingId][proposalId] = choice;
        _userWeights[voter][ticker][meetingId][proposalId] = tokenBalance;

        // Update aggregated totals
        _totalWeights[ticker][meetingId][proposalId][choice] += tokenBalance;
        _voterCount[ticker][meetingId][proposalId]++;

        return true;
    }

    /**
     * @notice Returns aggregated results: (yes_weight, no_weight, abstain_weight)
     */
    function compile_final_results(
        bytes32 ticker,
        uint256 meetingId,
        uint8 proposalId
    ) external view returns (uint256 yes, uint256 no, uint256 abstain) {
        yes = _totalWeights[ticker][meetingId][proposalId][1];
        no = _totalWeights[ticker][meetingId][proposalId][0];
        abstain = _totalWeights[ticker][meetingId][proposalId][2];
    }

    /**
     * @notice Returns total unique voters for a proposal
     */
    function get_voter_count(
        bytes32 ticker,
        uint256 meetingId,
        uint8 proposalId
    ) external view returns (uint256) {
        return _voterCount[ticker][meetingId][proposalId];
    }

    /**
     * @notice Checks if a specific address has voted on a proposal
     */
    function has_user_voted(
        address voter,
        bytes32 ticker,
        uint256 meetingId,
        uint8 proposalId
    ) external view returns (bool) {
        return _hasVoted[voter][ticker][meetingId][proposalId];
    }

    /**
     * @notice Returns a user's vote details (choice, weight)
     */
    function get_user_vote(
        address voter,
        bytes32 ticker,
        uint256 meetingId,
        uint8 proposalId
    ) external view returns (uint8 choice, uint256 weight) {
        choice = _userChoices[voter][ticker][meetingId][proposalId];
        weight = _userWeights[voter][ticker][meetingId][proposalId];
    }
}
