// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MockStylusEngine.sol";

/// @title MockStylusEngine Auth Tests
/// @notice Validates the registry-only auth guard on cast_proxy_vote
contract MockStylusEngineAuthTest is Test {
    MockStylusEngine public engine;
    address public owner = address(this);
    address public registry = address(0xAE61);
    address public attacker = address(0xBAD);

    bytes32 public constant TSLA = bytes32("TSLA");

    function setUp() public {
        engine = new MockStylusEngine();
    }

    function test_ownerCanSetRegistry() public {
        engine.setAuthorizedRegistry(registry);
        assertEq(engine.authorizedRegistry(), registry);
    }

    function test_nonOwnerCannotSetRegistry() public {
        vm.prank(attacker);
        vm.expectRevert("Only owner can set registry");
        engine.setAuthorizedRegistry(registry);
    }

    function test_voteSucceedsFromRegistry() public {
        engine.setAuthorizedRegistry(registry);

        vm.prank(registry);
        bool ok = engine.cast_proxy_vote(
            address(0xBEEF),
            TSLA,
            1, // meetingId
            1, // proposalId
            1, // Yes
            1000 ether
        );
        assertTrue(ok);
    }

    function test_voteRevertsFromNonRegistry() public {
        engine.setAuthorizedRegistry(registry);

        vm.prank(attacker);
        vm.expectRevert("MockStylusEngine: caller is not the authorized registry");
        engine.cast_proxy_vote(
            address(0xBEEF),
            TSLA,
            1, // meetingId
            1,
            1,
            1000 ether
        );
    }

    function test_voteWorksBeforeRegistrySet() public {
        // Before setAuthorizedRegistry is called, anyone can call (authorizedRegistry == address(0))
        vm.prank(attacker);
        bool ok = engine.cast_proxy_vote(
            address(0xBEEF),
            TSLA,
            1, // meetingId
            1,
            1,
            1000 ether
        );
        assertTrue(ok);
    }

    function test_ownerIsImmutable() public {
        assertEq(engine.owner(), owner);
    }
}
