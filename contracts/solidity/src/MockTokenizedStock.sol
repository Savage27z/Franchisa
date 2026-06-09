// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockTokenizedStock
/// @notice Simulates a tokenized RWA stock on testnet.
///         Anyone can mint via the faucet for demo purposes.
///         This is NOT a real security token — it's a testnet simulation
///         that stands in for tokenized stock on Robinhood Chain.
contract MockTokenizedStock is ERC20, Ownable {
    constructor() ERC20("Mock Tokenized TSLA", "mTSLA") Ownable(msg.sender) {
        // Mint 1M tokens to deployer for initial distribution
        _mint(msg.sender, 1_000_000 * 10 ** 18);
    }

    /// @notice Testnet faucet — anyone can mint tokens for demo purposes
    /// @param to The address to receive tokens
    /// @param amount The amount of tokens to mint (in wei, 18 decimals)
    function faucet(address to, uint256 amount) external {
        require(amount <= 10_000 * 10 ** 18, "Faucet: max 10,000 tokens per call");
        _mint(to, amount);
    }

    /// @notice Owner-only bulk mint for setting up demo scenarios
    /// @param recipients Array of addresses to receive tokens
    /// @param amounts Array of amounts to mint to each address
    function bulkMint(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(recipients.length == amounts.length, "Array length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }
}
