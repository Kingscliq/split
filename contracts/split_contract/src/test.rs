#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, String};

#[test]
fn scaffold_exposes_zero_split_count() {
    let env = Env::default();
    let contract_id = env.register(SplitContract, ());
    let client = SplitContractClient::new(&env, &contract_id);

    assert_eq!(client.get_split_count(), 0);
}

#[test]
fn split_storage_types_can_be_constructed() {
    let env = Env::default();
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let participant = Address::generate(&env);
    let title = String::from_str(&env, "House internet");
    let display_name = String::from_str(&env, "Ada");

    let split = Split {
        id: 0,
        creator,
        title,
        token,
        total_amount: 100,
        total_paid: 0,
        participant_count: 1,
        status: SplitStatus::Active,
        created_at: 1,
    };

    let share = ParticipantShare {
        split_id: split.id,
        participant,
        display_name,
        amount_owed: 100,
        amount_paid: 0,
        status: ParticipantStatus::Pending,
    };

    assert_eq!(split.status, SplitStatus::Active);
    assert_eq!(share.status, ParticipantStatus::Pending);
    assert_eq!(split.total_amount, share.amount_owed);
}
