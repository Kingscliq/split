#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, String};

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
    pub total_amount: i128,
    pub total_paid: i128,
    pub participant_count: u32,
    pub status: SplitStatus,
    pub created_at: u64,
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
    InvalidDisplayNameCount = 3,
    InvalidAmountCount = 4,
    InvalidAmount = 5,
    DuplicateParticipant = 6,
    CreatorCannotBeParticipant = 7,
    SplitNotFound = 8,
    ParticipantNotFound = 9,
    NotCreator = 10,
    SplitClosed = 11,
    SplitCompleted = 12,
    Overpayment = 13,
    InvalidPageLimit = 14,
}

#[contract]
pub struct SplitContract;

#[contractimpl]
impl SplitContract {
    pub fn get_split_count(env: Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::SplitCount)
            .unwrap_or(0)
    }
}

mod test;
