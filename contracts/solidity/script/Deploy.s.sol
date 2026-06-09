// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/FranchisaGovernanceRegistry.sol";
import "../src/MockTokenizedStock.sol";
import "../src/MockStylusEngine.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy mock Stylus engine (placeholder until real Stylus deploys)
        MockStylusEngine engine = new MockStylusEngine();
        console.log("MockStylusEngine deployed at:", address(engine));

        // 2. Deploy mock tokenized stock
        MockTokenizedStock token = new MockTokenizedStock();
        console.log("MockTokenizedStock deployed at:", address(token));

        // 3. Deploy governance registry
        FranchisaGovernanceRegistry registry = new FranchisaGovernanceRegistry(
            address(engine),
            address(token)
        );
        console.log("FranchisaGovernanceRegistry deployed at:", address(registry));

        // 4. Authorize the deployer as an agent (for demo)
        address agentAddress = vm.envOr("AGENT_ADDRESS", vm.addr(deployerPrivateKey));
        registry.setAgent(agentAddress, true);
        console.log("Agent authorized:", agentAddress);

        vm.stopBroadcast();

        // Print summary
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Network: Arbitrum Sepolia (421614)");
        console.log("MockStylusEngine:", address(engine));
        console.log("MockTokenizedStock:", address(token));
        console.log("FranchisaGovernanceRegistry:", address(registry));
        console.log("Agent:", agentAddress);
        console.log("\nUpdate .env files with these addresses!");
    }
}
