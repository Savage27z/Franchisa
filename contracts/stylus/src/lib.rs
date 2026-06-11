#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use stylus_sdk::{
    prelude::*,
    storage::{StorageAddress, StorageMap, StorageU256},
    msg,
};
use alloy_primitives::{Address, FixedBytes, U256};

#[storage]
#[entrypoint]
pub struct ProxyOracle {
    /// The authorized governance registry contract.
    /// Only this address can call cast_proxy_vote to prevent vote forgery.
    pub authorized_registry: StorageAddress,

    /// Owner who deployed the contract (can set the registry)
    pub owner: StorageAddress,

    /// user_address => ticker => meeting_id => proposal_id(U256) => has_voted (1=true, 0=false)
    pub has_voted: StorageMap<Address, StorageMap<FixedBytes<32>, StorageMap<U256, StorageMap<U256, StorageU256>>>>,

    /// user_address => ticker => meeting_id => proposal_id(U256) => choice (stored as U256)
    pub user_choices: StorageMap<Address, StorageMap<FixedBytes<32>, StorageMap<U256, StorageMap<U256, StorageU256>>>>,

    /// user_address => ticker => meeting_id => proposal_id(U256) => weight
    pub user_weights: StorageMap<Address, StorageMap<FixedBytes<32>, StorageMap<U256, StorageMap<U256, StorageU256>>>>,

    /// ticker => meeting_id => proposal_id(U256) => choice(U256) => total_weight
    pub total_weights: StorageMap<FixedBytes<32>, StorageMap<U256, StorageMap<U256, StorageMap<U256, StorageU256>>>>,

    /// ticker => meeting_id => proposal_id(U256) => voter_count
    pub voter_count: StorageMap<FixedBytes<32>, StorageMap<U256, StorageMap<U256, StorageU256>>>,
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
    /// meeting_id: Epoch identifier - isolates vote storage per meeting cycle so closing
    ///             and re-registering the same ticker starts with a clean slate.
    /// choice: 0 = No, 1 = Yes, 2 = Abstain
    /// token_balance: the user's tokenized stock balance, used as vote weight
    pub fn cast_proxy_vote(
        &mut self,
        voter: Address,
        ticker: FixedBytes<32>,
        meeting_id: U256,
        proposal_id: U256,
        choice: U256,
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

        // Prevent double voting within the same meeting epoch
        let already_voted = self.has_voted.getter(voter).getter(ticker).getter(meeting_id).get(proposal_id);
        if already_voted != U256::ZERO {
            return false;
        }

        // Validate choice (0=No, 1=Yes, 2=Abstain)
        if choice > U256::from(2u8) {
            return false;
        }

        // Validate non-zero balance
        if token_balance == U256::ZERO {
            return false;
        }

        // Record the vote
        self.has_voted.setter(voter).setter(ticker).setter(meeting_id).insert(proposal_id, U256::from(1u8));
        self.user_choices.setter(voter).setter(ticker).setter(meeting_id).insert(proposal_id, choice);
        self.user_weights.setter(voter).setter(ticker).setter(meeting_id).insert(proposal_id, token_balance);

        // Update aggregated totals
        let current = self.total_weights.getter(ticker).getter(meeting_id).getter(proposal_id).get(choice);
        self.total_weights
            .setter(ticker)
            .setter(meeting_id)
            .setter(proposal_id)
            .insert(choice, current + token_balance);

        // Increment voter count
        let count = self.voter_count.getter(ticker).getter(meeting_id).get(proposal_id);
        self.voter_count
            .setter(ticker)
            .setter(meeting_id)
            .insert(proposal_id, count + U256::from(1));

        true
    }

    /// Returns the aggregated results for a specific proposal in a meeting epoch
    /// Returns (yes_weight, no_weight, abstain_weight)
    pub fn compile_final_results(
        &self,
        ticker: FixedBytes<32>,
        meeting_id: U256,
        proposal_id: U256,
    ) -> (U256, U256, U256) {
        let yes = self.total_weights.getter(ticker).getter(meeting_id).getter(proposal_id).get(U256::from(1u8));
        let no = self.total_weights.getter(ticker).getter(meeting_id).getter(proposal_id).get(U256::from(0u8));
        let abstain = self.total_weights.getter(ticker).getter(meeting_id).getter(proposal_id).get(U256::from(2u8));
        (yes, no, abstain)
    }

    /// Returns the total number of unique voters for a proposal
    pub fn get_voter_count(&self, ticker: FixedBytes<32>, meeting_id: U256, proposal_id: U256) -> U256 {
        self.voter_count.getter(ticker).getter(meeting_id).get(proposal_id)
    }

    /// Checks if a specific address has voted on a proposal
    pub fn has_user_voted(&self, voter: Address, ticker: FixedBytes<32>, meeting_id: U256, proposal_id: U256) -> bool {
        self.has_voted.getter(voter).getter(ticker).getter(meeting_id).get(proposal_id) != U256::ZERO
    }

    /// Returns a user's vote details (choice as U256, weight) for a specific proposal
    pub fn get_user_vote(
        &self,
        voter: Address,
        ticker: FixedBytes<32>,
        meeting_id: U256,
        proposal_id: U256,
    ) -> (U256, U256) {
        let choice = self.user_choices.getter(voter).getter(ticker).getter(meeting_id).get(proposal_id);
        let weight = self.user_weights.getter(voter).getter(ticker).getter(meeting_id).get(proposal_id);
        (choice, weight)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ticker_tsla() -> FixedBytes<32> {
        let mut bytes = [0u8; 32];
        bytes[0] = b'T'; bytes[1] = b'S'; bytes[2] = b'L'; bytes[3] = b'A';
        FixedBytes::from(bytes)
    }

    fn ticker_nvda() -> FixedBytes<32> {
        let mut bytes = [0u8; 32];
        bytes[0] = b'N'; bytes[1] = b'V'; bytes[2] = b'D'; bytes[3] = b'A';
        FixedBytes::from(bytes)
    }

    fn voter_a() -> Address {
        Address::from([1u8; 20])
    }

    fn voter_b() -> Address {
        Address::from([2u8; 20])
    }

    #[motsu::test]
    fn cast_vote_records_correctly(contract: ProxyOracle) {
        let voter = voter_a();
        let ticker = ticker_tsla();
        let meeting_id = U256::from(1u8);
        let proposal_id = U256::from(1u8);
        let choice = U256::from(1u8); // Yes
        let weight = U256::from(1000u64);

        let result = contract.cast_proxy_vote(voter, ticker, meeting_id, proposal_id, choice, weight);
        assert!(result);

        assert!(contract.has_user_voted(voter, ticker, meeting_id, proposal_id));

        let (recorded_choice, recorded_weight) = contract.get_user_vote(voter, ticker, meeting_id, proposal_id);
        assert_eq!(recorded_choice, choice);
        assert_eq!(recorded_weight, weight);
    }

    #[motsu::test]
    fn double_vote_prevented(contract: ProxyOracle) {
        let voter = voter_a();
        let ticker = ticker_tsla();
        let meeting_id = U256::from(1u8);
        let proposal_id = U256::from(1u8);

        let first = contract.cast_proxy_vote(voter, ticker, meeting_id, proposal_id, U256::from(1u8), U256::from(1000u64));
        assert!(first);

        let second = contract.cast_proxy_vote(voter, ticker, meeting_id, proposal_id, U256::from(0u8), U256::from(500u64));
        assert!(!second);

        // Original vote unchanged
        let (choice, weight) = contract.get_user_vote(voter, ticker, meeting_id, proposal_id);
        assert_eq!(choice, U256::from(1u8));
        assert_eq!(weight, U256::from(1000u64));
    }

    #[motsu::test]
    fn invalid_choice_rejected(contract: ProxyOracle) {
        let result = contract.cast_proxy_vote(
            voter_a(), ticker_tsla(), U256::from(1u8), U256::from(1u8),
            U256::from(3u8), // Invalid: only 0, 1, 2 allowed
            U256::from(1000u64),
        );
        assert!(!result);
        assert!(!contract.has_user_voted(voter_a(), ticker_tsla(), U256::from(1u8), U256::from(1u8)));
    }

    #[motsu::test]
    fn zero_balance_rejected(contract: ProxyOracle) {
        let result = contract.cast_proxy_vote(
            voter_a(), ticker_tsla(), U256::from(1u8), U256::from(1u8),
            U256::from(1u8),
            U256::ZERO, // Zero balance
        );
        assert!(!result);
        assert!(!contract.has_user_voted(voter_a(), ticker_tsla(), U256::from(1u8), U256::from(1u8)));
    }

    #[motsu::test]
    fn meeting_epoch_isolation(contract: ProxyOracle) {
        let voter = voter_a();
        let ticker = ticker_tsla();
        let proposal_id = U256::from(1u8);

        // Vote in meeting epoch 1
        let r1 = contract.cast_proxy_vote(voter, ticker, U256::from(1u8), proposal_id, U256::from(1u8), U256::from(500u64));
        assert!(r1);

        // Same voter, same ticker, NEW epoch (meeting re-registered) — should succeed
        let r2 = contract.cast_proxy_vote(voter, ticker, U256::from(2u8), proposal_id, U256::from(0u8), U256::from(800u64));
        assert!(r2);

        // Verify both recorded independently
        let (c1, w1) = contract.get_user_vote(voter, ticker, U256::from(1u8), proposal_id);
        assert_eq!(c1, U256::from(1u8));
        assert_eq!(w1, U256::from(500u64));

        let (c2, w2) = contract.get_user_vote(voter, ticker, U256::from(2u8), proposal_id);
        assert_eq!(c2, U256::from(0u8));
        assert_eq!(w2, U256::from(800u64));
    }

    #[motsu::test]
    fn multiple_voters_aggregate(contract: ProxyOracle) {
        let ticker = ticker_tsla();
        let meeting_id = U256::from(1u8);
        let proposal_id = U256::from(1u8);

        // Voter A: Yes with weight 1000
        contract.cast_proxy_vote(voter_a(), ticker, meeting_id, proposal_id, U256::from(1u8), U256::from(1000u64));
        // Voter B: No with weight 2000
        contract.cast_proxy_vote(voter_b(), ticker, meeting_id, proposal_id, U256::from(0u8), U256::from(2000u64));

        let (yes, no, abstain) = contract.compile_final_results(ticker, meeting_id, proposal_id);
        assert_eq!(yes, U256::from(1000u64));
        assert_eq!(no, U256::from(2000u64));
        assert_eq!(abstain, U256::ZERO);

        assert_eq!(contract.get_voter_count(ticker, meeting_id, proposal_id), U256::from(2u8));
    }

    #[motsu::test]
    fn compile_results_all_choices(contract: ProxyOracle) {
        let ticker = ticker_nvda();
        let meeting_id = U256::from(1u8);
        let proposal_id = U256::from(1u8);

        // Three voters, one per choice
        contract.cast_proxy_vote(Address::from([1u8; 20]), ticker, meeting_id, proposal_id, U256::from(0u8), U256::from(100u64)); // No
        contract.cast_proxy_vote(Address::from([2u8; 20]), ticker, meeting_id, proposal_id, U256::from(1u8), U256::from(300u64)); // Yes
        contract.cast_proxy_vote(Address::from([3u8; 20]), ticker, meeting_id, proposal_id, U256::from(2u8), U256::from(200u64)); // Abstain

        let (yes, no, abstain) = contract.compile_final_results(ticker, meeting_id, proposal_id);
        assert_eq!(yes, U256::from(300u64));
        assert_eq!(no, U256::from(100u64));
        assert_eq!(abstain, U256::from(200u64));

        assert_eq!(contract.get_voter_count(ticker, meeting_id, proposal_id), U256::from(3u8));
    }

    #[motsu::test]
    fn cross_ticker_isolation(contract: ProxyOracle) {
        let meeting_id = U256::from(1u8);
        let proposal_id = U256::from(1u8);

        // Vote on TSLA
        contract.cast_proxy_vote(voter_a(), ticker_tsla(), meeting_id, proposal_id, U256::from(1u8), U256::from(500u64));
        // Vote on NVDA (same voter, same proposal_id — different ticker)
        contract.cast_proxy_vote(voter_a(), ticker_nvda(), meeting_id, proposal_id, U256::from(0u8), U256::from(700u64));

        let (tsla_yes, _, _) = contract.compile_final_results(ticker_tsla(), meeting_id, proposal_id);
        let (_, nvda_no, _) = contract.compile_final_results(ticker_nvda(), meeting_id, proposal_id);

        assert_eq!(tsla_yes, U256::from(500u64));
        assert_eq!(nvda_no, U256::from(700u64));
    }
}
