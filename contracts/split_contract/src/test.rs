#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{vec, Address, Env, String, Vec};

struct TestSetup {
    env: Env,
    client: SplitContractClient<'static>,
    creator: Address,
    token: Address,
    ada: Address,
    tolu: Address,
}

fn setup() -> TestSetup {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(SplitContract, ());
    let client = SplitContractClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let ada = Address::generate(&env);
    let tolu = Address::generate(&env);

    TestSetup {
        env,
        client,
        creator,
        token,
        ada,
        tolu,
    }
}

fn participants(env: &Env, ada: Address, tolu: Address) -> Vec<Participant> {
    vec![
        env,
        Participant {
            address: ada,
            display_name: String::from_str(env, "Ada"),
        },
        Participant {
            address: tolu,
            display_name: String::from_str(env, "Tolu"),
        },
    ]
}

#[test]
fn scaffold_exposes_zero_split_count() {
    let TestSetup { client, .. } = setup();

    assert_eq!(client.get_split_count(), 0);
}

#[test]
fn create_split_success_stores_split_and_participants() {
    let TestSetup {
        env,
        client,
        creator,
        token,
        ada,
        tolu,
    } = setup();
    let title = String::from_str(&env, "House internet");
    let participants = participants(&env, ada.clone(), tolu.clone());

    let split_id = client.create_split(
        &creator,
        &title,
        &token,
        &100_i128,
        &100_i128,
        &participants,
    );

    assert_eq!(split_id, 0);
    assert_eq!(client.get_split_count(), 1);

    let split = client.get_split(&split_id).unwrap();
    assert_eq!(split.id, split_id);
    assert_eq!(split.creator, creator);
    assert_eq!(split.title, title);
    assert_eq!(split.token, token);
    assert_eq!(split.requested_amount, 100);
    assert_eq!(split.total_amount, 100);
    assert_eq!(split.waived_amount, 0);
    assert_eq!(split.total_paid, 0);
    assert_eq!(split.participant_count, 2);
    assert_eq!(split.status, SplitStatus::Active);

    let ada_share = client.get_participant(&split_id, &ada).unwrap();
    assert_eq!(ada_share.display_name, String::from_str(&env, "Ada"));
    assert_eq!(ada_share.amount_owed, 50);
    assert_eq!(ada_share.amount_paid, 0);
    assert_eq!(ada_share.status, ParticipantStatus::Pending);
}

#[test]
fn create_split_stores_requested_and_waived_amounts() {
    let TestSetup {
        env,
        client,
        creator,
        token,
        ada,
        tolu,
    } = setup();
    let title = String::from_str(&env, "Fuel contribution");
    let participants = participants(&env, ada.clone(), tolu);

    let split_id = client.create_split(
        &creator,
        &title,
        &token,
        &101_i128,
        &100_i128,
        &participants,
    );

    let split = client.get_split(&split_id).unwrap();
    assert_eq!(split.requested_amount, 101);
    assert_eq!(split.total_amount, 100);
    assert_eq!(split.waived_amount, 1);

    let ada_share = client.get_participant(&split_id, &ada).unwrap();
    assert_eq!(ada_share.amount_owed, 50);
}

#[test]
fn create_split_rejects_empty_title() {
    let TestSetup {
        env,
        client,
        creator,
        token,
        ada,
        tolu,
    } = setup();
    let participants = participants(&env, ada, tolu);

    let result = client.try_create_split(
        &creator,
        &String::from_str(&env, ""),
        &token,
        &100_i128,
        &100_i128,
        &participants,
    );

    assert_eq!(result, Err(Ok(SplitError::InvalidTitle)));
}

#[test]
fn create_split_rejects_empty_participants() {
    let TestSetup {
        env,
        client,
        creator,
        token,
        ..
    } = setup();

    let result = client.try_create_split(
        &creator,
        &String::from_str(&env, "House internet"),
        &token,
        &100_i128,
        &100_i128,
        &vec![&env],
    );

    assert_eq!(result, Err(Ok(SplitError::InvalidParticipantCount)));
}

#[test]
fn create_split_rejects_long_display_name() {
    let TestSetup {
        env,
        client,
        creator,
        token,
        ada,
        tolu,
    } = setup();
    let long_name = String::from_str(
        &env,
        "A very very very very very very very very very long display name",
    );
    let participants = vec![
        &env,
        Participant {
            address: ada,
            display_name: long_name,
        },
        Participant {
            address: tolu,
            display_name: String::from_str(&env, "Tolu"),
        },
    ];

    let result = client.try_create_split(
        &creator,
        &String::from_str(&env, "House internet"),
        &token,
        &100_i128,
        &100_i128,
        &participants,
    );

    assert_eq!(result, Err(Ok(SplitError::InvalidDisplayName)));
}

#[test]
fn create_split_rejects_zero_total_amount() {
    let TestSetup {
        env,
        client,
        creator,
        token,
        ada,
        tolu,
    } = setup();
    let participants = participants(&env, ada, tolu);

    let result = client.try_create_split(
        &creator,
        &String::from_str(&env, "House internet"),
        &token,
        &0_i128,
        &0_i128,
        &participants,
    );

    assert_eq!(result, Err(Ok(SplitError::InvalidAmount)));
}

#[test]
fn create_split_rejects_uneven_total_amount() {
    let TestSetup {
        env,
        client,
        creator,
        token,
        ada,
        tolu,
    } = setup();
    let participants = participants(&env, ada, tolu);

    let result = client.try_create_split(
        &creator,
        &String::from_str(&env, "House internet"),
        &token,
        &101_i128,
        &101_i128,
        &participants,
    );

    assert_eq!(result, Err(Ok(SplitError::UnevenSplit)));
}

#[test]
fn create_split_rejects_total_above_requested_amount() {
    let TestSetup {
        env,
        client,
        creator,
        token,
        ada,
        tolu,
    } = setup();
    let participants = participants(&env, ada, tolu);

    let result = client.try_create_split(
        &creator,
        &String::from_str(&env, "House internet"),
        &token,
        &99_i128,
        &100_i128,
        &participants,
    );

    assert_eq!(result, Err(Ok(SplitError::InvalidWaivedAmount)));
}

#[test]
fn create_split_rejects_duplicate_participant() {
    let TestSetup {
        env,
        client,
        creator,
        token,
        ada,
        ..
    } = setup();
    let participants = participants(&env, ada.clone(), ada);

    let result = client.try_create_split(
        &creator,
        &String::from_str(&env, "House internet"),
        &token,
        &100_i128,
        &100_i128,
        &participants,
    );

    assert_eq!(result, Err(Ok(SplitError::DuplicateParticipant)));
}

#[test]
fn create_split_rejects_creator_as_participant() {
    let TestSetup {
        env,
        client,
        creator,
        token,
        tolu,
        ..
    } = setup();
    let participants = participants(&env, creator.clone(), tolu);

    let result = client.try_create_split(
        &creator,
        &String::from_str(&env, "House internet"),
        &token,
        &100_i128,
        &100_i128,
        &participants,
    );

    assert_eq!(result, Err(Ok(SplitError::CreatorCannotBeParticipant)));
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
        requested_amount: 100,
        total_amount: 100,
        waived_amount: 0,
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
