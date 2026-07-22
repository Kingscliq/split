# Split Contract Specification

## Purpose

The Split contract records shared payment requests and participant payment status for Split.

Split is a Stellar-powered group payment tracker for shared bills, contributions, and real-time payment status tracking.

The MVP contract is responsible for:

- creating a Split
- storing participant shares
- accepting participant payments
- transferring payment directly to the Split creator
- tracking paid/pending status
- exposing bounded read methods
- emitting useful events

The MVP contract is not an escrow contract.
The MVP contract does not implement deadlines.

## Payment Settlement Decision

For MVP, `pay_share` uses direct-to-creator settlement.

When a participant pays, the contract verifies the payer and amount, then transfers tokens directly from the payer to the Split creator. After the transfer succeeds, the contract updates participant and Split payment state.

The contract must not hold escrowed funds in the MVP.

Escrow, refunds, and release rules are future scope.

The Split creator is the receiver/collector and is not a participant payer. Participant rows represent only the people expected to contribute back to the creator.

## Contribution Amount Decision

Split supports equal contribution amounts in the MVP.

The frontend may preview equal owed amounts, but the contract calculates the final owed amount for each participant.

- Equal mode: the contract divides the collection amount across participants.
- The collection amount is the amount others are paying back to the creator. It must not include the creator's own share.
- `requested_amount` is the original amount the creator wanted to collect.
- `total_amount` is the final amount split equally and collected through Split.
- `waived_amount` is `requested_amount - total_amount`.
- Custom amounts are paused for MVP until the product rules for different remaining balances and off-chain payments are clearer.

The contract rejects Split creation if the total amount does not divide evenly across participants.

If the creator reduces the collection amount to make the split even, the removed amount is stored as `waived_amount` for transparency. It is not assigned to any participant and is not collected by Split. It becomes a creator-approved waived remainder.

Amounts are stored in the selected settlement token's base units. NGN display values, exchange-rate estimates, and receipt-backed fiat context are frontend/backend concerns and are not contract truth in the MVP.

## Deadline Decision

Split has no required deadline in the MVP.

A Split stays `Active` until either:

- every participant pays and the Split becomes `Completed`
- the creator manually closes it and the Split becomes `Closed`

Optional deadlines may be added later for event-based or time-sensitive collections.

## Link Sharing Decision

Split links are manually shared by the creator in the MVP through copy link, WhatsApp, or QR code.

The MVP does not include built-in invite delivery or participant claim links.

Future versions may support invite/claim links where participants open a Split link, select their name, connect a wallet, claim their slot, and then pay. This is future scope because it requires claim ownership rules, correction/reassignment flows, and protection against accidental or malicious claims.

## Data Types

### SplitStatus

Variants:

- `Active`
- `Completed`
- `Closed`

### ParticipantStatus

Variants:

- `Pending`
- `Partial`
- `Paid`

### Split

Fields:

- `id: u32`
- `creator: Address`
- `title: String`
- `token: Address`
- `requested_amount: i128`
- `total_amount: i128`
- `waived_amount: i128`
- `total_paid: i128`
- `participant_count: u32`
- `status: SplitStatus`
- `created_at: u64`

### Participant

Fields:

- `address: Address`
- `display_name: String`

`Participant` is the input type used by `create_split`. It keeps each participant's wallet address and display name together so the contract does not rely on parallel arrays.

### ParticipantShare

Fields:

- `split_id: u32`
- `participant: Address`
- `display_name: String`
- `amount_owed: i128`
- `amount_paid: i128`
- `status: ParticipantStatus`

`display_name` is an optional label. If empty, the frontend should fall back to a shortened wallet address. It is not identity verification.

## Storage Keys

Recommended `DataKey` variants:

- `NextSplitId`
- `Split(u32)`
- `Participant(u32, Address)`
- `ParticipantAt(u32, u32)`

Storage behavior:

- `NextSplitId` stores the next sequential id.
- `Split(id)` stores the Split record.
- `Participant(id, address)` stores that participant's share.
- `ParticipantAt(id, index)` stores each participant address for bounded list reads.

## Constants

Recommended MVP limits:

- `MAX_PARTICIPANTS = 50`
- `MAX_TITLE_LEN = 80`
- `MAX_DISPLAY_NAME_LEN = 40`
- `MAX_PAGE_LIMIT = 50`

These bounds keep reads and writes predictable.

## Errors

Recommended `SplitError` variants:

- `InvalidTitle`
- `InvalidParticipantCount`
- `InvalidDisplayName`
- `InvalidAmount`
- `UnevenSplit`
- `DuplicateParticipant`
- `CreatorCannotBeParticipant`
- `SplitNotFound`
- `ParticipantNotFound`
- `NotCreator`
- `SplitClosed`
- `SplitCompleted`
- `Overpayment`
- `InvalidPageLimit`
- `InvalidWaivedAmount`

## Functions

### create_split

Signature:

```rust
create_split(
    env: Env,
    creator: Address,
    title: String,
    token: Address,
    requested_amount: i128,
    total_amount: i128,
    participants: Vec<Participant>,
) -> Result<u32, SplitError>
```

Authorization:

- `creator.require_auth()`

Validation:

- title must not be empty
- title length must not exceed `MAX_TITLE_LEN`
- participants length must be greater than 0
- participants length must not exceed `MAX_PARTICIPANTS`
- requested amount must be greater than 0
- total amount must be greater than 0
- requested amount must be greater than or equal to total amount
- total amount must divide evenly across participant count
- each display name length must not exceed `MAX_DISPLAY_NAME_LEN`
- duplicate participant addresses must be rejected
- creator address must not be included in participants

Behavior:

1. Read current `NextSplitId`, defaulting to 0.
2. Calculate `waived_amount` as `requested_amount - total_amount`.
3. Calculate `amount_owed` as `total_amount / participant_count`.
4. Store a new `Split` with `total_paid = 0`, `waived_amount`, and `status = Active`.
5. Store each `ParticipantShare` with the calculated equal `amount_owed`.
5. Store each participant address by index using `ParticipantAt`.
6. Increment `NextSplitId`.
7. Emit `split_created`.
8. Return new split id.

### pay_share

Signature:

```rust
pay_share(
    env: Env,
    split_id: u32,
    payer: Address,
    amount: i128,
) -> Result<(), SplitError>
```

Authorization:

- `payer.require_auth()`

Validation:

- Split must exist
- Split status must be `Active`
- payer must be a participant
- amount must be greater than 0
- `amount_paid + amount` must not exceed `amount_owed`

Behavior:

1. Load Split.
2. Load payer's `ParticipantShare`.
3. Transfer `amount` of Split token directly from payer to Split creator.
4. Increase participant `amount_paid`.
5. Set participant status:
   - `Paid` when `amount_paid == amount_owed`
   - otherwise `Partial`
6. Increase Split `total_paid`.
7. Set Split status to `Completed` when `total_paid == total_amount`.
8. Persist updated participant and Split records.
9. Emit `share_paid`.
10. Emit `split_completed` if the Split becomes completed.

### close_split

Signature:

```rust
close_split(
    env: Env,
    split_id: u32,
) -> Result<(), SplitError>
```

Authorization:

- `split.creator.require_auth()`

Validation:

- Split must exist
- caller must be creator
- Split must not already be closed

Behavior:

1. Load Split.
2. Require creator authorization.
3. Set status to `Closed`.
4. Persist Split.
5. Emit `split_closed`.

### get_split

Signature:

```rust
get_split(env: Env, split_id: u32) -> Option<Split>
```

Behavior:

- Return the Split record if it exists.
- Return `None` if it does not exist.

### get_participant

Signature:

```rust
get_participant(
    env: Env,
    split_id: u32,
    participant: Address,
) -> Option<ParticipantShare>
```

Behavior:

- Return the participant share if it exists.
- Return `None` if it does not exist.

### get_participants

Signature:

```rust
get_participants(
    env: Env,
    split_id: u32,
    start: u32,
    limit: u32,
) -> Result<Vec<ParticipantShare>, SplitError>
```

Validation:

- Split must exist
- limit must be greater than 0
- limit must not exceed `MAX_PAGE_LIMIT`

Behavior:

- Read participant addresses from `ParticipantAt(split_id, index)`.
- Resolve each address into `ParticipantShare`.
- Return at most `limit` participant records.
- Stop at `participant_count`.

### get_split_count

Signature:

```rust
get_split_count(env: Env) -> u32
```

Behavior:

- Return total number of created Splits.
- Return 0 if no Split has been created.

## Events

### split_created

Topic:

```text
split, split_created, split_id
```

Data:

- split id
- creator
- token
- total amount
- participant count

### share_paid

Topic:

```text
split, share_paid, split_id
```

Data:

- split id
- payer
- amount
- participant amount paid
- participant amount owed
- split total paid
- split total amount

### split_completed

Topic:

```text
split, split_completed, split_id
```

Data:

- split id
- creator
- total paid
- total amount

### split_closed

Topic:

```text
split, split_closed, split_id
```

Data:

- split id
- creator
- total paid
- total amount

## Invariants

- `total_amount` equals the sum of participant `amount_owed` values.
- `total_paid` equals the sum of participant `amount_paid` values.
- participant `amount_paid` never exceeds `amount_owed`.
- Split status is `Completed` only when `total_paid == total_amount`.
- Closed Splits cannot receive new payments.
- The contract does not escrow funds in the MVP.
- Reads that return participant lists are bounded.

## MVP Test Plan

Required tests:

- create Split succeeds
- create Split rejects empty participant list
- create Split rejects mismatched participants, display names, and amounts
- create Split rejects zero or negative amount
- create Split rejects duplicate participant address
- create Split rejects creator as participant
- create Split stores participant display names
- pay share succeeds
- pay share rejects non-participant
- pay share rejects overpayment
- partial payment sets participant status to `Partial`
- full participant payment sets participant status to `Paid`
- final payment sets Split status to `Completed`
- completed Split rejects additional payments
- creator can close Split
- non-creator cannot close Split
- closed Split rejects payment
- bounded participant read returns expected page

## Frontend Contract Assumptions

- Public pages can call `get_split` and `get_participants`.
- Payment panels can call `get_participant` for the connected wallet.
- The MVP frontend offers verified XLM and USDC settlement options using the correct token contract address for the selected network.
- The frontend handles USDC trustline detection, token decimals, balances, and insufficient-balance guidance.
- Frontend should display `display_name` when non-empty and shortened address otherwise.
- Frontend should treat contract state as source of truth after transaction confirmation.

## Future Extensions

Future contract or architecture work may add:

- escrow settlement
- refunds
- optional deadlines
- invite/claim links
- custom contribution amounts
- reusable groups
- protocol fees
- USDC-specific mainnet configuration
- trusted on-ramp or swap integration for acquiring the selected settlement token
- indexer-backed creator dashboards
