#![no_std]
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, Env, String, Vec,
};

pub const MAX_PARTICIPANTS: u32 = 50;
pub const MAX_TITLE_LEN: u32 = 80;
pub const MAX_DISPLAY_NAME_LEN: u32 = 40;
pub const MAX_PAGE_LIMIT: u32 = 50;

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SplitStatus {
    Active,
    Completed,
    Closed,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ParticipantStatus {
    Pending,
    Partial,
    Paid,
}

#[contracttype]
#[derive(Clone, Eq, PartialEq)]
pub struct Split {
    pub id: u32,
    pub creator: Address,
    pub title: String,
    pub token: Address,
    pub requested_amount: i128,
    pub total_amount: i128,
    pub waived_amount: i128,
    pub total_paid: i128,
    pub participant_count: u32,
    pub status: SplitStatus,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Eq, PartialEq)]
pub struct Participant {
    pub address: Address,
    pub display_name: String,
}

#[contracttype]
#[derive(Clone, Eq, PartialEq)]
pub struct ParticipantShare {
    pub split_id: u32,
    pub participant: Address,
    pub display_name: String,
    pub amount_owed: i128,
    pub amount_paid: i128,
    pub status: ParticipantStatus,
}

#[contracttype]
#[derive(Clone, Eq, PartialEq)]
pub enum DataKey {
    SplitCount,
    Split(u32),
    Participant(u32, Address),
    ParticipantAt(u32, u32),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum SplitError {
    InvalidTitle = 1,
    InvalidParticipantCount = 2,
    InvalidDisplayName = 3,
    InvalidAmount = 4,
    UnevenSplit = 5,
    DuplicateParticipant = 6,
    CreatorCannotBeParticipant = 7,
    SplitNotFound = 8,
    ParticipantNotFound = 9,
    NotCreator = 10,
    SplitClosed = 11,
    SplitCompleted = 12,
    Overpayment = 13,
    InvalidPageLimit = 14,
    InvalidWaivedAmount = 15,
}

#[contractevent(topics = ["split", "created"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SplitCreated {
    #[topic]
    pub split_id: u32,
    pub creator: Address,
    pub total_amount: i128,
    pub participant_count: u32,
}

#[contract]
pub struct SplitContract;

#[contractimpl]
impl SplitContract {
    pub fn create_split(
        env: Env,
        creator: Address,
        title: String,
        token: Address,
        requested_amount: i128,
        total_amount: i128,
        participants: Vec<Participant>,
    ) -> Result<u32, SplitError> {
        creator.require_auth();

        let participant_count = participants.len();

        if title.is_empty() || title.len() > MAX_TITLE_LEN {
            return Err(SplitError::InvalidTitle);
        }

        if participant_count == 0 || participant_count > MAX_PARTICIPANTS {
            return Err(SplitError::InvalidParticipantCount);
        }

        if requested_amount <= 0 || total_amount <= 0 {
            return Err(SplitError::InvalidAmount);
        }

        if requested_amount < total_amount {
            return Err(SplitError::InvalidWaivedAmount);
        }

        if total_amount % i128::from(participant_count) != 0 {
            return Err(SplitError::UnevenSplit);
        }

        let amount_owed = total_amount / i128::from(participant_count);
        let waived_amount = requested_amount - total_amount;

        // Validate every participant before writing any Split data to storage.
        for index in 0..participant_count {
            let participant = participants
                .get(index)
                .ok_or(SplitError::InvalidParticipantCount)?;

            // The creator receives payments, so they must not be included as a payer.
            if participant.address == creator {
                return Err(SplitError::CreatorCannotBeParticipant);
            }

            // Display names are stored on-chain, so keep them bounded.
            if participant.display_name.len() > MAX_DISPLAY_NAME_LEN {
                return Err(SplitError::InvalidDisplayName);
            }

            // Compare against earlier rows to reject duplicate participant wallets.
            for previous_index in 0..index {
                let previous_participant = participants
                    .get(previous_index)
                    .ok_or(SplitError::InvalidParticipantCount)?;
                if previous_participant.address == participant.address {
                    return Err(SplitError::DuplicateParticipant);
                }
            }
        }

        let split_id = Self::get_split_count(env.clone());
        let created_at = env.ledger().timestamp();
        let split = Split {
            id: split_id,
            creator: creator.clone(),
            title,
            token,
            requested_amount,
            total_amount,
            waived_amount,
            total_paid: 0,
            participant_count,
            status: SplitStatus::Active,
            created_at,
        };

        let storage = env.storage().persistent();
        storage.set(&DataKey::Split(split_id), &split);

        for index in 0..participant_count {
            let participant = participants
                .get(index)
                .ok_or(SplitError::InvalidParticipantCount)?;
            let share = ParticipantShare {
                split_id,
                participant: participant.address.clone(),
                display_name: participant.display_name,
                amount_owed,
                amount_paid: 0,
                status: ParticipantStatus::Pending,
            };

            storage.set(
                &DataKey::Participant(split_id, participant.address.clone()),
                &share,
            );
            storage.set(
                &DataKey::ParticipantAt(split_id, index),
                &participant.address,
            );
        }

        storage.set(&DataKey::SplitCount, &(split_id + 1));
        SplitCreated {
            split_id,
            creator,
            total_amount,
            participant_count,
        }
        .publish(&env);

        Ok(split_id)
    }

    pub fn get_split(env: Env, split_id: u32) -> Option<Split> {
        env.storage().persistent().get(&DataKey::Split(split_id))
    }

    pub fn get_participant(
        env: Env,
        split_id: u32,
        participant: Address,
    ) -> Option<ParticipantShare> {
        env.storage()
            .persistent()
            .get(&DataKey::Participant(split_id, participant))
    }

    pub fn get_split_count(env: Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::SplitCount)
            .unwrap_or(0)
    }
}

mod test;
