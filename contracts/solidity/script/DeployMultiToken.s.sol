// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/FranchisaGovernanceRegistry.sol";
import "../src/MockTokenizedStock.sol";

/// @notice Deploys one mock tokenized stock per supported ticker and a
///         registry that maps each ticker to its own token, wired to the
///         already-deployed Stylus voting engine.
contract DeployMultiTokenScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address stylusEngine = vm.envAddress("STYLUS_ENGINE_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // 1. One tokenized stock per company
        MockTokenizedStock tsla = new MockTokenizedStock("Mock Tokenized TSLA", "mTSLA");
        MockTokenizedStock aapl = new MockTokenizedStock("Mock Tokenized AAPL", "mAAPL");
        MockTokenizedStock nvda = new MockTokenizedStock("Mock Tokenized NVDA", "mNVDA");
        MockTokenizedStock msft = new MockTokenizedStock("Mock Tokenized MSFT", "mMSFT");

        // 2. Registry pointing at the REAL Stylus engine; mTSLA as fallback token
        FranchisaGovernanceRegistry registry = new FranchisaGovernanceRegistry(
            stylusEngine,
            address(tsla)
        );

        // 3. Per-ticker token mapping
        registry.setTickerToken(bytes32("TSLA"), address(tsla));
        registry.setTickerToken(bytes32("AAPL"), address(aapl));
        registry.setTickerToken(bytes32("NVDA"), address(nvda));
        registry.setTickerToken(bytes32("MSFT"), address(msft));

        // 4. Authorize the deployer as agent
        address agentAddress = vm.envOr("AGENT_ADDRESS", vm.addr(deployerPrivateKey));
        registry.setAgent(agentAddress, true);

        vm.stopBroadcast();

        console.log("\n=== MULTI-TOKEN DEPLOYMENT ===");
        console.log("mTSLA:   ", address(tsla));
        console.log("mAAPL:   ", address(aapl));
        console.log("mNVDA:   ", address(nvda));
        console.log("mMSFT:   ", address(msft));
        console.log("Registry:", address(registry));
        console.log("Stylus engine (existing):", stylusEngine);
        console.log("\nNEXT: call setAuthorizedRegistry(registry) on the Stylus engine");
    }
}
