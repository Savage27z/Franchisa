// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/FranchisaGovernanceRegistry.sol";
import "../src/MockTokenizedStock.sol";

/// @dev Minimal mock that simulates the Stylus voting engine for unit tests.
///      Keyed by (ticker, meetingId, proposalId) to support meeting epochs.
contract MockStylusEngine {
    // voter => ticker => meetingId => proposalId => voted
    mapping(address => mapping(bytes32 => mapping(uint256 => mapping(uint8 => bool)))) public voted;
    // ticker => meetingId => proposalId => choice => weight
    mapping(bytes32 => mapping(uint256 => mapping(uint8 => mapping(uint8 => uint256)))) public weights;
    // ticker => meetingId => proposalId => count
    mapping(bytes32 => mapping(uint256 => mapping(uint8 => uint256))) public counts;

    function cast_proxy_vote(
        address voter,
        bytes32 ticker,
        uint256 meetingId,
        uint8 proposalId,
        uint8 choice,
        uint256 balance
    ) external returns (bool) {
        if (voted[voter][ticker][meetingId][proposalId]) return false;
        voted[voter][ticker][meetingId][proposalId] = true;
        if (choice > 2 || balance == 0) return false;

        weights[ticker][meetingId][proposalId][choice] += balance;
        counts[ticker][meetingId][proposalId]++;
        return true;
    }

    function compile_final_results(
        bytes32 ticker,
        uint256 meetingId,
        uint8 proposalId
    ) external view returns (uint256, uint256, uint256) {
        return (
            weights[ticker][meetingId][proposalId][1], // yes
            weights[ticker][meetingId][proposalId][0], // no
            weights[ticker][meetingId][proposalId][2]  // abstain
        );
    }

    function get_voter_count(
        bytes32 ticker,
        uint256 meetingId,
        uint8 proposalId
    ) external view returns (uint256) {
        return counts[ticker][meetingId][proposalId];
    }

    function has_user_voted(
        address voter,
        bytes32 ticker,
        uint256 meetingId,
        uint8 proposalId
    ) external view returns (bool) {
        return voted[voter][ticker][meetingId][proposalId];
    }

    function get_user_vote(
        address,
        bytes32,
        uint256,
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
    bytes32 public constant FILING_HASH = keccak256("DEF 14A filing text for Tesla Inc 2026");
    string public constant ACCESSION = "0001193125-26-123456";

    function setUp() public {
        // Start at a reasonable block/timestamp
        vm.warp(100_000);
        vm.roll(100);

        engine = new MockStylusEngine();
        token = new MockTokenizedStock();
        registry = new FranchisaGovernanceRegistry(
            address(engine),
            address(token)
        );

        // Authorize agent
        registry.setAgent(agent, true);

        // Give voters some tokens (use owner bulkMint to bypass faucet cooldown)
        // bulkMint now auto-delegates so getPastVotes will work
        address[] memory recipients = new address[](2);
        recipients[0] = voter1;
        recipients[1] = voter2;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1000 * 10 ** 18;
        amounts[1] = 500 * 10 ** 18;
        token.bulkMint(recipients, amounts);

        // Advance one block so the snapshot (block.number - 1) captures the minted balances
        vm.roll(block.number + 1);
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
            boardRecs,
            FILING_HASH,
            ACCESSION
        );
    }

    // ─── Registration tests ────────────────────────────────────────

    function test_registerMeeting() public {
        _registerTSLAMeeting();

        FranchisaGovernanceRegistry.Meeting memory m = registry.getMeeting(TSLA);
        assertEq(m.companyName, "Tesla, Inc.");
        assertTrue(m.isActive);
        assertEq(m.proposalCount, 2);
        assertEq(m.filingHash, FILING_HASH);
        assertEq(m.accessionNumber, ACCESSION);
        assertEq(m.snapshotBlock, block.number - 1);
    }

    function test_registerMeeting_onlyAgent() public {
        uint8[] memory ids = new uint8[](1);
        ids[0] = 1;
        string[] memory s = new string[](1);
        s[0] = "test";

        vm.prank(voter1);
        vm.expectRevert("Not authorized agent");
        registry.registerMeeting(TSLA, "Tesla", block.timestamp, ids, s, s, s, s, s, s, bytes32(0), "");
    }

    function test_registerMeeting_nonSequentialIds_reverts() public {
        uint8[] memory ids = new uint8[](2);
        ids[0] = 1;
        ids[1] = 3; // Gap — should be 2

        string[] memory s = new string[](2);
        s[0] = "a";
        s[1] = "b";

        vm.prank(agent);
        vm.expectRevert("Proposal IDs must be sequential 1..N");
        registry.registerMeeting(TSLA, "Tesla", block.timestamp, ids, s, s, s, s, s, s, bytes32(0), "");
    }

    function test_registerMeeting_tickerDeduplication() public {
        _registerTSLAMeeting();
        assertEq(registry.getRegisteredTickerCount(), 1);

        // Close and re-register — ticker array should NOT grow
        vm.prank(agent);
        registry.closeMeeting(TSLA);

        // Advance block for new snapshot
        vm.roll(block.number + 1);

        _registerTSLAMeeting();
        assertEq(registry.getRegisteredTickerCount(), 1); // Still 1, not 2
    }

    // ─── Voting tests ──────────────────────────────────────────────

    function test_submitVote() public {
        _registerTSLAMeeting();

        vm.prank(voter1);
        registry.submitVote(TSLA, 1, 1); // Yes

        (uint256 yes, uint256 no, uint256 abstain) = registry.getResults(TSLA, 1);
        assertEq(yes, 1000 * 10 ** 18);
        assertEq(no, 0);
        assertEq(abstain, 0);
    }

    function test_submitVote_usesSnapshotWeight() public {
        _registerTSLAMeeting();

        // Transfer tokens AFTER registration — vote weight should still be snapshot balance
        vm.prank(voter1);
        token.transfer(address(0xDEAD), 500 * 10 ** 18); // voter1 now has 500 tokens

        // But snapshot weight should still be 1000
        vm.prank(voter1);
        registry.submitVote(TSLA, 1, 1);

        (uint256 yes,,) = registry.getResults(TSLA, 1);
        assertEq(yes, 1000 * 10 ** 18); // Snapshot balance, not current
    }

    function test_submitVote_noTokens() public {
        _registerTSLAMeeting();

        address noTokens = address(0xDEAD);
        vm.prank(noTokens);
        vm.expectRevert("No voting power at snapshot block");
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

    function test_submitVote_afterMeetingDate_reverts() public {
        _registerTSLAMeeting();

        // Warp past meeting date
        vm.warp(block.timestamp + 61 days);

        vm.prank(voter1);
        vm.expectRevert("Voting closed: meeting date has passed");
        registry.submitVote(TSLA, 1, 1);
    }

    // ─── Close meeting tests ───────────────────────────────────────

    function test_closeMeeting() public {
        _registerTSLAMeeting();

        vm.prank(agent);
        registry.closeMeeting(TSLA);

        FranchisaGovernanceRegistry.Meeting memory m = registry.getMeeting(TSLA);
        assertFalse(m.isActive);
    }

    function test_closeMeeting_clearsStaleProposals() public {
        _registerTSLAMeeting();

        // Verify proposals exist
        FranchisaGovernanceRegistry.Proposal memory p = registry.getProposal(TSLA, 1);
        assertEq(p.proposalId, 1);

        // Close meeting
        vm.prank(agent);
        registry.closeMeeting(TSLA);

        // Stale proposals should be deleted
        FranchisaGovernanceRegistry.Proposal memory deleted = registry.getProposal(TSLA, 1);
        assertEq(deleted.proposalId, 0); // default value — deleted
        assertEq(bytes(deleted.title).length, 0);
    }

    function test_closeMeeting_preventsVoting() public {
        _registerTSLAMeeting();

        vm.prank(agent);
        registry.closeMeeting(TSLA);

        vm.prank(voter1);
        vm.expectRevert("No active meeting for ticker");
        registry.submitVote(TSLA, 1, 1);
    }

    function test_getActiveMeetingCount_cached() public {
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
        registry.registerMeeting(TSLA, "Tesla", block.timestamp, ids, s, s, s, s, s, s, bytes32(0), "");
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

    // ─── Pause tests ───────────────────────────────────────────────

    function test_pause_blocksVoting() public {
        _registerTSLAMeeting();

        registry.pause();

        vm.prank(voter1);
        vm.expectRevert(); // EnforcedPause()
        registry.submitVote(TSLA, 1, 1);
    }

    function test_unpause_resumesVoting() public {
        _registerTSLAMeeting();

        registry.pause();
        registry.unpause();

        vm.prank(voter1);
        registry.submitVote(TSLA, 1, 1);

        (uint256 yes,,) = registry.getResults(TSLA, 1);
        assertEq(yes, 1000 * 10 ** 18);
    }

    // ─── Faucet rate-limit tests ────────────────────────────────────

    function test_faucet_cooldown() public {
        address claimer = address(0xCCC);

        token.faucet(claimer, 1000 * 10 ** 18);

        // Second claim immediately should revert
        vm.expectRevert("Faucet: 24h cooldown between claims");
        token.faucet(claimer, 1000 * 10 ** 18);

        // After 24h it should work
        vm.warp(block.timestamp + 24 hours + 1);
        token.faucet(claimer, 1000 * 10 ** 18);
        assertEq(token.balanceOf(claimer), 2000 * 10 ** 18);
    }

    function test_faucet_maxBalance() public {
        address claimer = address(0xDDD);

        // Claim 5 times (10k each) with 24h warp between claims to hit 50k max
        for (uint256 i = 0; i < 5; i++) {
            if (i > 0) vm.warp(block.timestamp + 24 hours + 1);
            token.faucet(claimer, 10_000 * 10 ** 18);
        }
        assertEq(token.balanceOf(claimer), 50_000 * 10 ** 18);

        // Next claim should revert — at max
        vm.warp(block.timestamp + 24 hours + 1);
        vm.expectRevert("Faucet: would exceed max faucet balance of 50,000");
        token.faucet(claimer, 1000 * 10 ** 18);
    }

    function test_faucet_autoDelegates() public {
        address claimer = address(0xEEE);

        token.faucet(claimer, 1000 * 10 ** 18);

        // Advance block so getPastVotes works
        vm.roll(block.number + 1);

        // Should have voting power (auto-delegated)
        uint256 votes = token.getPastVotes(claimer, block.number - 1);
        assertEq(votes, 1000 * 10 ** 18);
    }

    // ─── Filing provenance tests ────────────────────────────────────

    function test_filingHash_storedOnChain() public {
        _registerTSLAMeeting();

        FranchisaGovernanceRegistry.Meeting memory m = registry.getMeeting(TSLA);
        assertEq(m.filingHash, FILING_HASH);
        assertEq(m.accessionNumber, ACCESSION);
    }

    function test_filingHash_verifiable() public {
        _registerTSLAMeeting();

        // Anyone can reconstruct the hash from the original filing text
        bytes32 reconstructed = keccak256("DEF 14A filing text for Tesla Inc 2026");
        FranchisaGovernanceRegistry.Meeting memory m = registry.getMeeting(TSLA);
        assertEq(m.filingHash, reconstructed);
    }

    // ─── Meeting epoch isolation test ────────────────────────────────

    function test_meetingEpoch_freshVotingAfterReRegister() public {
        // Epoch 1: register, vote, close
        _registerTSLAMeeting();

        vm.prank(voter1);
        registry.submitVote(TSLA, 1, 1); // Yes in epoch 1

        vm.prank(agent);
        registry.closeMeeting(TSLA);

        // Epoch 2: re-register same ticker — voter1 should be able to vote again
        vm.roll(block.number + 1);
        _registerTSLAMeeting();

        // This would revert with "Stylus vote execution failed" without meetingId epochs
        vm.prank(voter1);
        registry.submitVote(TSLA, 1, 0); // No in epoch 2 — different vote, same proposal

        (uint256 yes, uint256 no,) = registry.getResults(TSLA, 1);
        // Only epoch 2 results should appear (epoch 1 data is isolated)
        assertEq(yes, 0);
        assertEq(no, 1000 * 10 ** 18);
    }

    function test_meetingNonce_increments() public {
        assertEq(registry.meetingNonce(), 0);

        _registerTSLAMeeting();
        assertEq(registry.meetingNonce(), 1);

        FranchisaGovernanceRegistry.Meeting memory m = registry.getMeeting(TSLA);
        assertEq(m.meetingId, 1);

        // Close and re-register
        vm.prank(agent);
        registry.closeMeeting(TSLA);
        vm.roll(block.number + 1);
        _registerTSLAMeeting();
        assertEq(registry.meetingNonce(), 2);

        m = registry.getMeeting(TSLA);
        assertEq(m.meetingId, 2);
    }

    // ─── Invariant-style check ──────────────────────────────────────

    function test_voteWeightsSumCannotExceedSupply() public {
        _registerTSLAMeeting();

        vm.prank(voter1);
        registry.submitVote(TSLA, 1, 1);

        vm.prank(voter2);
        registry.submitVote(TSLA, 1, 0);

        (uint256 yes, uint256 no, uint256 abstain) = registry.getResults(TSLA, 1);
        uint256 totalVoteWeight = yes + no + abstain;
        assertLe(totalVoteWeight, token.totalSupply());
    }
}
