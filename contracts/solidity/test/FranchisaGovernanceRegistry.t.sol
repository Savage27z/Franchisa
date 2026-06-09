// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/FranchisaGovernanceRegistry.sol";
import "../src/MockTokenizedStock.sol";

/// @dev Minimal mock that simulates the Stylus voting engine for unit tests.
///      Uses a nonce-based approach so each call is treated as a unique voter
///      (in production, the Stylus contract uses msg::sender() which is tx.origin).
contract MockStylusEngine {
    // nonce => ticker => proposalId => voted (nonce increments per call to simulate different voters)
    mapping(uint256 => mapping(bytes32 => mapping(uint8 => bool))) public voted;
    // ticker => proposalId => choice => weight
    mapping(bytes32 => mapping(uint8 => mapping(uint8 => uint256))) public weights;
    // ticker => proposalId => count
    mapping(bytes32 => mapping(uint8 => uint256)) public counts;

    uint256 private _callNonce;

    function cast_proxy_vote(
        address voter,
        bytes32 ticker,
        uint8 proposalId,
        uint8 choice,
        uint256 balance
    ) external returns (bool) {
        // Check double voting using voter address
        if (voted[uint256(uint160(voter))][ticker][proposalId]) return false;
        voted[uint256(uint160(voter))][ticker][proposalId] = true;
        if (choice > 2 || balance == 0) return false;

        weights[ticker][proposalId][choice] += balance;
        counts[ticker][proposalId]++;
        return true;
    }

    function compile_final_results(
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (uint256, uint256, uint256) {
        return (
            weights[ticker][proposalId][1], // yes
            weights[ticker][proposalId][0], // no
            weights[ticker][proposalId][2]  // abstain
        );
    }

    function get_voter_count(
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (uint256) {
        return counts[ticker][proposalId];
    }

    function has_user_voted(
        address voter,
        bytes32 ticker,
        uint8 proposalId
    ) external view returns (bool) {
        return voted[uint256(uint160(voter))][ticker][proposalId];
    }

    function get_user_vote(
        address,
        bytes32,
        uint8
    ) external pure returns (uint8, uint256) {
        return (0, 0);
    }
}

contract FranchisaGovernanceRegistryTest is Test {
    FranchisaGovernanceRegistry public registry;
    MockTokenizedStock public token;
    MockStylusEngine public engine;

    address public deployer = address(this);
    address public agent = address(0xA6E47);
    address public voter1 = address(0xBEEF1);
    address public voter2 = address(0xBEEF2);

    bytes32 public constant TSLA = bytes32("TSLA");

    function setUp() public {
        engine = new MockStylusEngine();
        token = new MockTokenizedStock();
        registry = new FranchisaGovernanceRegistry(
            address(engine),
            address(token)
        );

        // Authorize agent
        registry.setAgent(agent, true);

        // Give voters some tokens
        token.faucet(voter1, 1000 * 10 ** 18);
        token.faucet(voter2, 500 * 10 ** 18);
    }

    function _registerTSLAMeeting() internal {
        uint8[] memory ids = new uint8[](2);
        ids[0] = 1;
        ids[1] = 2;

        string[] memory titles = new string[](2);
        titles[0] = "CEO Compensation";
        titles[1] = "Auditor Ratification";

        string[] memory categories = new string[](2);
        categories[0] = "Executive Compensation";
        categories[1] = "Auditor Ratification";

        string[] memory descriptions = new string[](2);
        descriptions[0] = "Vote on CEO pay package";
        descriptions[1] = "Approve EY as auditor";

        string[] memory riskRatings = new string[](2);
        riskRatings[0] = "High";
        riskRatings[1] = "Low";

        string[] memory riskJustifications = new string[](2);
        riskJustifications[0] = "Largest CEO pay in history";
        riskJustifications[1] = "Standard audit";

        string[] memory boardRecs = new string[](2);
        boardRecs[0] = "For";
        boardRecs[1] = "For";

        vm.prank(agent);
        registry.registerMeeting(
            TSLA,
            "Tesla, Inc.",
            block.timestamp + 60 days,
            ids,
            titles,
            categories,
            descriptions,
            riskRatings,
            riskJustifications,
            boardRecs
        );
    }

    function test_registerMeeting() public {
        _registerTSLAMeeting();

        FranchisaGovernanceRegistry.Meeting memory m = registry.getMeeting(TSLA);
        assertEq(m.companyName, "Tesla, Inc.");
        assertTrue(m.isActive);
        assertEq(m.proposalCount, 2);
    }

    function test_registerMeeting_onlyAgent() public {
        uint8[] memory ids = new uint8[](1);
        ids[0] = 1;
        string[] memory s = new string[](1);
        s[0] = "test";

        vm.prank(voter1);
        vm.expectRevert("Not authorized agent");
        registry.registerMeeting(TSLA, "Tesla", block.timestamp, ids, s, s, s, s, s, s);
    }

    function test_submitVote() public {
        _registerTSLAMeeting();

        vm.prank(voter1);
        registry.submitVote(TSLA, 1, 1); // Yes

        (uint256 yes, uint256 no, uint256 abstain) = registry.getResults(TSLA, 1);
        assertEq(yes, 1000 * 10 ** 18);
        assertEq(no, 0);
        assertEq(abstain, 0);
    }

    function test_submitVote_noTokens() public {
        _registerTSLAMeeting();

        address noTokens = address(0xDEAD);
        vm.prank(noTokens);
        vm.expectRevert("Must hold tokenized stock to vote");
        registry.submitVote(TSLA, 1, 1);
    }

    function test_submitVote_invalidChoice() public {
        _registerTSLAMeeting();

        vm.prank(voter1);
        vm.expectRevert("Invalid choice: 0=No, 1=Yes, 2=Abstain");
        registry.submitVote(TSLA, 1, 3);
    }

    function test_submitVote_invalidProposal() public {
        _registerTSLAMeeting();

        vm.prank(voter1);
        vm.expectRevert("Invalid proposal ID");
        registry.submitVote(TSLA, 5, 1);
    }

    function test_closeMeeting() public {
        _registerTSLAMeeting();

        vm.prank(agent);
        registry.closeMeeting(TSLA);

        FranchisaGovernanceRegistry.Meeting memory m = registry.getMeeting(TSLA);
        assertFalse(m.isActive);
    }

    function test_closeMeeting_preventsVoting() public {
        _registerTSLAMeeting();

        vm.prank(agent);
        registry.closeMeeting(TSLA);

        vm.prank(voter1);
        vm.expectRevert("No active meeting for ticker");
        registry.submitVote(TSLA, 1, 1);
    }

    function test_getActiveMeetingCount() public {
        _registerTSLAMeeting();
        assertEq(registry.getActiveMeetingCount(), 1);

        vm.prank(agent);
        registry.closeMeeting(TSLA);
        assertEq(registry.getActiveMeetingCount(), 0);
    }

    function test_getProposal() public {
        _registerTSLAMeeting();

        FranchisaGovernanceRegistry.Proposal memory p = registry.getProposal(TSLA, 1);
        assertEq(p.title, "CEO Compensation");
        assertEq(p.riskRating, "High");
    }

    function test_duplicateMeetingReverts() public {
        _registerTSLAMeeting();

        uint8[] memory ids = new uint8[](1);
        ids[0] = 1;
        string[] memory s = new string[](1);
        s[0] = "test";

        vm.prank(agent);
        vm.expectRevert("Meeting already active for ticker");
        registry.registerMeeting(TSLA, "Tesla", block.timestamp, ids, s, s, s, s, s, s);
    }

    function test_multipleVoters() public {
        _registerTSLAMeeting();

        vm.prank(voter1);
        registry.submitVote(TSLA, 1, 1); // Yes, 1000 tokens

        vm.prank(voter2);
        registry.submitVote(TSLA, 1, 0); // No, 500 tokens

        (uint256 yes, uint256 no, uint256 abstain) = registry.getResults(TSLA, 1);
        assertEq(yes, 1000 * 10 ** 18);
        assertEq(no, 500 * 10 ** 18);
        assertEq(abstain, 0);
    }

    function test_doubleVotePrevented() public {
        _registerTSLAMeeting();

        vm.prank(voter1);
        registry.submitVote(TSLA, 1, 1); // First vote — Yes

        // Second vote from same voter should fail
        vm.prank(voter1);
        vm.expectRevert("Stylus vote execution failed");
        registry.submitVote(TSLA, 1, 0); // Try to change to No
    }
}
