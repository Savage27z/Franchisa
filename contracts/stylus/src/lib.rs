#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use stylus_sdk::{
    prelude::*,
    storage::{StorageAddress, StorageMap, StorageU256, StorageBool, StorageU8},
    msg,
};
use alloy_primitives::{Address, U256};

#[storage]
#[entrypoint]
pub struct ProxyOracle {
    /// The authorized governance registry contract.
    /// Only this address can call cast_proxy_vote to prevent vote forgery.
    pub authorized_registry: StorageAddress,

    /// Owner who deployed the contract (can set the registry)
    pub owner: StorageAddress,

    /// user_address => ticker => proposal_id => has_voted
    pub has_voted: StorageMap<Address, StorageMap<[u8; 32], StorageMap<u8, StorageBool>>>,

    /// user_address => ticker => proposal_id => choice
    pub user_choices: StorageMap<Address, StorageMap<[u8; 32], StorageMap<u8, StorageU8>>>,

    /// user_address => ticker => proposal_id => weight
    pub user_weights: StorageMap<Address, StorageMap<[u8; 32], StorageMap<u8, StorageU256>>>,

    /// ticker => proposal_id => choice (0=No, 1=Yes, 2=Abstain) => total_weight
    pub total_weights: StorageMap<[u8; 32], StorageMap<u8, StorageMap<u8, StorageU256>>>,

    /// ticker => proposal_id => voter_count
    pub voter_count: StorageMap<[u8; 32], StorageMap<u8, StorageU256>>,
}

#[public]
impl ProxyOracle {
    /// Set the authorized registry address. Only the owner (deployer) can call this.
    pub fn set_authorized_registry(&mut self, registry: Address) {
        let caller = msg::sender();
        let current_owner = self.owner.get();

        // If owner is zero (first call), set caller as owner
        if current_owner == Address::ZERO {
            self.owner.set(caller);
        } else {
            assert!(caller == current_owner, "Only owner can set registry");
        }

        self.authorized_registry.set(registry);
    }

    /// Casts a weighted proxy vote. Called ONLY by the authorized governance registry.
    ///
    /// SECURITY: msg::sender() in Stylus when called cross-contract is the calling contract,
    /// NOT the EOA. We enforce that only the registry can call this function, and the
    /// registry passes the real voter address as a parameter after verifying their token balance.
    ///
    /// choice: 0 = No, 1 = Yes, 2 = Abstain
    /// token_balance: the user's tokenized stock balance, used as vote weight
    pub fn cast_proxy_vote(
        &mut self,
        voter: Address,
        ticker: [u8; 32],
        proposal_id: u8,
        choice: u8,
        token_balance: U256,
    ) -> bool {
        // SECURITY: Only the authorized registry can cast votes
        let registry = self.authorized_registry.get();
        if registry != Address::ZERO {
            assert!(
                msg::sender() == registry,
                "Only the authorized registry can cast votes"
            );
        }

        // Prevent double voting
        let already_voted = self.has_voted.getter(voter).getter(ticker).get(proposal_id);
        if already_voted {
            return false;
        }

        // Validate choice
        if choice > 2 {
            return false;
        }

        // Validate non-zero balance
        if token_balance == U256::ZERO {
            return false;
        }

        // Record the vote
        self.has_voted.setter(voter).setter(ticker).insert(proposal_id, true);
        self.user_choices.setter(voter).setter(ticker).insert(proposal_id, choice);
        self.user_weights.setter(voter).setter(ticker).insert(proposal_id, token_balance);

        // Update aggregated totals
        let current = self.total_weights.getter(ticker).getter(proposal_id).get(choice);
        self.total_weights
            .setter(ticker)
            .setter(proposal_id)
            .insert(choice, current + token_balance);

        // Increment voter count
        let count = self.voter_count.getter(ticker).get(proposal_id);
        self.voter_count
            .setter(ticker)
            .insert(proposal_id, count + U256::from(1));

        true
    }

    /// Returns the aggregated results for a specific proposal
    /// Returns (yes_weight, no_weight, abstain_weight)
    pub fn compile_final_results(
        &self,
        ticker: [u8; 32],
        proposal_id: u8,
    ) -> (U256, U256, U256) {
        let yes = self.total_weights.getter(ticker).getter(proposal_id).get(1);
        let no = self.total_weights.getter(ticker).getter(proposal_id).get(0);
        let abstain = self.total_weights.getter(ticker).getter(proposal_id).get(2);
        (yes, no, abstain)
    }

    /// Returns the total number of unique voters for a proposal
    pub fn get_voter_count(&self, ticker: [u8; 32], proposal_id: u8) -> U256 {
        self.voter_count.getter(ticker).get(proposal_id)
    }

    /// Checks if a specific address has voted on a proposal
    pub fn has_user_voted(&self, voter: Address, ticker: [u8; 32], proposal_id: u8) -> bool {
        self.has_voted.getter(voter).getter(ticker).get(proposal_id)
    }

    /// Returns a user's vote details (choice, weight) for a specific proposal
    pub fn get_user_vote(
        &self,
        voter: Address,
        ticker: [u8; 32],
        proposal_id: u8,
    ) -> (u8, U256) {
        let choice = self.user_choices.getter(voter).getter(ticker).get(proposal_id);
        let weight = self.user_weights.getter(voter).getter(ticker).get(proposal_id);
        (choice, weight)
    }
}
