// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockTokenizedStock.sol";

/**
 * @title DeployRobinhood
 * @notice Deploys MockTokenizedStock (mTSLA) to Robinhood Chain Testnet.
 *         Demonstrates tokenized stock on Robinhood's financial-grade L2,
 *         showing the RWA use case for corporate governance voting.
 *
 * Usage:
 *   forge script script/DeployRobinhood.s.sol:DeployRobinhoodScript \
 *     --rpc-url https://rpc.testnet.chain.robinhood.com \
 *     --private-key $DEPLOYER_PRIVATE_KEY \
 *     --broadcast --via-ir
 */
contract DeployRobinhoodScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy mock tokenized stock on Robinhood Chain
        MockTokenizedStock token = new MockTokenizedStock();
        console.log("MockTokenizedStock (mTSLA) deployed on Robinhood Chain at:", address(token));

        // Mint some initial tokens to the deployer for demo
        token.faucet(vm.addr(deployerPrivateKey), 10000 * 10 ** 18);
        console.log("Minted 10,000 mTSLA to deployer");

        vm.stopBroadcast();

        console.log("\n=== ROBINHOOD CHAIN DEPLOYMENT ===");
        console.log("Network: Robinhood Chain Testnet (46630)");
        console.log("MockTokenizedStock (mTSLA):", address(token));
        console.log("Explorer: https://explorer.testnet.chain.robinhood.com/address/", address(token));
    }
}
