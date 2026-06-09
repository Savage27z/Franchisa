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
 */
contract MockStylusEngine {
    // voter => ticker => proposalId => voted
    mapping(address => mapping(bytes32 => mapping(uint8 => bool))) private _hasVoted;

    // voter => ticker => proposalId => choice
    mapping(address => mapping(bytes32 => mapping(uint8 => uint8))) private _userChoices;

    // voter => ticker => proposalId => weight
    mapping(address => mapping(bytes32 => mapping(uint8 => uint256))) private _userWeights;

    // ticker => proposalId => choice => total_weight
    mapping(bytes32 => mapping(uint8 => mapping(uint8 => uint256))) private _totalWeights;

    // ticker => proposalId => voter_count
    mapping(bytes32 => mapping(uint8 => uint256)) private _voterCount;

    /**
     * @notice Cast a weighted proxy vote. Called by the Solidity registry.
     * @param voter The actual voter address (passed from the registry)
     * @param ticker The company ticker as bytes32
     * @param proposalId The proposal number (1-indexed)
     * @param choice 0=No, 1=Yes, 2=Abstain
     * @param tokenBalance The voter's token balance (vote weight)
     * @return success True if the vote was recorded, false if already voted or invalid
     */
    function cast_proxy_vote(
        address voter,
        bytes32 ticker,
        uint8 proposalId,
        uint8 choice,
        uint256 tokenBalance
    ) external returns (bool) {
        // Prevent double voting
        if (_hasVoted[voter][ticker][proposalId]) return false;

        // Validate
        if (choice > 2) return false;
        if (tokenBalance == 0) return false;

        // Record vote
        _hasVoted[voter][ticker][proposalId] = true;
        _userChoices[voter][ticker][proposalId] = choice;
        _userWeights[voter][ticker][proposalId] = tokenBalance;

        // Update aggregated totals
        _totalWeights[ticker][proposalId][choice] += tokenBalance;
        _voterCount[ticker][proposalId]++;

        return true;
    }

    /**
     * @notice Returns aggregated results: (yes_weight, no_weight, abstain_weight)
     */
    function compile_final_results(
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (uint256 yes, uint256 no, uint256 abstain) {
        yes = _totalWeights[ticker][proposalId][1];
        no = _totalWeights[ticker][proposalId][0];
        abstain = _totalWeights[ticker][proposalId][2];
    }

    /**
     * @notice Returns total unique voters for a proposal
     */
    function get_voter_count(
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (uint256) {
        return _voterCount[ticker][proposalId];
    }

    /**
     * @notice Checks if a specific address has voted on a proposal
     */
    function has_user_voted(
        address voter,
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (bool) {
        return _hasVoted[voter][ticker][proposalId];
    }

    /**
     * @notice Returns a user's vote details (choice, weight)
     */
    function get_user_vote(
        address voter,
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (uint8 choice, uint256 weight) {
        choice = _userChoices[voter][ticker][proposalId];
        weight = _userWeights[voter][ticker][proposalId];
    }
}
