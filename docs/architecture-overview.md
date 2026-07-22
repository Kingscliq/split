# Split Architecture Overview

## Product Overview

Split is a Stellar-powered group payment tracker for shared bills, contributions, and real-time payment status tracking.

The MVP solves one coordination problem: a creator paid for, or is coordinating, a shared expense and needs to collect agreed contributions from a group. Split gives the group one payment page so everyone can see who has paid without chasing bank screenshots or WhatsApp confirmations.

Split is not a full expense accounting app. It does not calculate long-running debts, loans, recurring payments, dispute resolution, or fiat reconciliation in the MVP.

## MVP User Flows

### Create a Split

1. Creator opens `/split/create`.
2. Creator connects a Stellar wallet.
3. Creator enters a title, token, requested collection amount, final split amount, and participant rows.
4. Each participant row contains a wallet address and display name.
5. Frontend validates basic contribution inputs.
6. Creator signs `create_split`.
7. Contract validates that the final split amount divides evenly across participants.
8. Contract calculates each participant's equal owed amount and stores the Split and participant shares.
9. Frontend redirects to the public Split page.

The creator is the receiver/collector and is not added as a payer. Participants are the people who owe the creator.

The requested collection amount means the amount others are expected to pay back to the creator. It should not include the creator's own share. Frontend copy should ask: "How much do you want to collect from others?" and explain: "Enter the amount others are paying back to you. Do not include your own share."

#### Equal Contribution Mode

Use Equal mode when everyone owes the same agreed contribution for a shared expense such as internet subscription, gas refill, fuel, household foodstuff, group dues, or event contribution.

The frontend shows an equal-share preview before submission, but the contract calculates the final equal owed amount from `total_amount / participant_count`. `requested_amount` is the original amount the creator wanted to collect, `total_amount` is the final amount submitted for equal splitting, and `waived_amount` is `requested_amount - total_amount`. If the final split amount does not divide evenly across participants, the contract rejects creation.

If the creator reduces the collection amount to make the split even, the removed amount is stored as `waived_amount` for transparency. It is not assigned to any participant and is not collected by Split. It becomes a creator-approved waived remainder.

Recommended frontend error copy for uneven splits: "This amount cannot be split equally between the selected participants. Change the amount or participant list. Any reduced amount will not be collected by Split."

Custom contribution amounts are paused for MVP until the product rules for different remaining balances and off-chain payments are clearer.

### Local Currency Display

The contract stores `requested_amount`, `total_amount`, `waived_amount`, and participant shares in the selected settlement token's base units. The frontend may show NGN-friendly labels beside USDC or XLM values for user understanding, but exchange-rate display is off-chain context and not contract truth.

The contract remains settlement-token agnostic and accepts the address of any SEP-41-compatible token contract. For the MVP, the frontend offers verified XLM and USDC options and clearly shows the selected token. USDC support uses network-specific verified asset configuration plus trustline and balance onboarding in the frontend; it does not require a different payment contract.

Future iterations should add USDC acquisition support through a trusted Stellar anchor/on-ramp or swap integration so users who only hold XLM or fiat can obtain the settlement asset without leaving the Split flow. Receipt uploads and richer NGN conversion can also be added later with a backend, file storage, and exchange-rate source.

### Share a Split

1. Creator opens the created Split page.
2. Creator manually shares the Split URL through copy link, WhatsApp, or QR code.
3. Participants open the same public Split page.
4. Participants connect their wallet and pay their assigned share.

The MVP does not require a built-in invite system. Manual sharing keeps the product simple and matches existing group coordination behavior on WhatsApp.

### Future Invite/Claim Flow

Future versions may support invite/claim links:

1. Creator creates named unpaid slots.
2. Participant opens the Split link.
3. Participant selects their name.
4. Participant connects wallet.
5. Participant claims the slot.
6. Claimed wallet pays the assigned amount.

This is future scope because it requires claim ownership rules, correction/reassignment flows, and protection against accidental or malicious claims.

### View a Split

1. Any user opens `/split/[id]`.
2. Page loads Split summary and bounded participant rows from the contract.
3. Page shows total expected, total paid, remaining amount, status, and paid/pending participant rows.
4. Page can be read without wallet connection.

### Pay a Share

1. Participant opens `/split/[id]`.
2. Participant connects a Stellar wallet.
3. Frontend checks whether the connected address belongs to the Split.
4. Participant signs `pay_share`.
5. Contract verifies the payment is valid.
6. Token transfer moves funds directly from payer to the Split creator.
7. Contract updates participant paid amount, Split total paid, status, and emits events.
8. Frontend refreshes state and shows paid/pending progress.

## System Architecture

```text
Creator / Participant
        |
        v
Next.js frontend
        |
        | read state, prepare transactions
        v
Stellar RPC / wallet signer
        |
        | signed Soroban invocation
        v
Split Soroban contract
        |
        | direct token transfer
        v
Creator receives payment
```

## Component Responsibilities

### Soroban Contract

The contract owns the source of truth for:

- Split creation
- participant address membership
- participant display label
- participant amount owed
- participant amount paid
- total expected amount
- total paid amount
- Split status
- payment events
- close events

The contract does not own:

- fiat conversion
- notifications
- search
- creator dashboards
- escrow release/refund rules
- social profiles

### Frontend

The frontend owns:

- form state
- equal split preview before submission
- display formatting
- short wallet address display
- share links
- WhatsApp message construction
- QR code rendering
- transaction state messages
- refreshing contract reads after confirmation
- manual link sharing through copy link, WhatsApp, and QR code

### Optional Future Backend or Indexer

No backend is required for the MVP. A backend or indexer may be added later for:

- fast creator dashboards
- search
- analytics
- notification triggers
- long-term event history

## Contract Data Model

### Split

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `u32` | Sequential Split id. |
| `creator` | `Address` | Wallet that created the Split and receives direct payments. |
| `title` | `String` | Human-readable Split title. |
| `token` | `Address` | Stellar asset contract used for payment. |
| `requested_amount` | `i128` | Original amount the creator wanted to collect from participants. |
| `total_amount` | `i128` | Final amount split equally and collected through Split. |
| `waived_amount` | `i128` | Informational amount waived by creator before creation. |
| `total_paid` | `i128` | Sum of all paid amounts. |
| `participant_count` | `u32` | Number of participant rows. |
| `status` | `SplitStatus` | `Active`, `Completed`, or `Closed`. |
| `created_at` | `u64` | Ledger timestamp at creation. |

### Participant

| Field | Type | Notes |
| --- | --- | --- |
| `address` | `Address` | Wallet assigned to this participant row. |
| `display_name` | `String` | User-friendly label entered by the creator. |

### ParticipantShare

| Field | Type | Notes |
| --- | --- | --- |
| `split_id` | `u32` | Parent Split id. |
| `participant` | `Address` | Wallet allowed to pay this share. |
| `display_name` | `String` | Optional user-friendly label. Empty string falls back to shortened wallet address. |
| `amount_owed` | `i128` | Assigned share amount. |
| `amount_paid` | `i128` | Amount paid so far. |
| `status` | `ParticipantStatus` | `Pending`, `Partial`, or `Paid`. |

### Storage Keys

Use explicit keys:

- `NextSplitId`
- `Split(u32)`
- `Participant(u32, Address)`
- `ParticipantAt(u32, u32)`

`ParticipantAt(split_id, index)` stores the participant address for bounded pagination on public Split pages.

## Contract API

### Write Functions

- `create_split(creator, title, token, requested_amount, total_amount, participants) -> Result<u32, SplitError>`
- `pay_share(split_id, payer, amount) -> Result<(), SplitError>`
- `close_split(split_id) -> Result<(), SplitError>`

### Read Functions

- `get_split(split_id) -> Option<Split>`
- `get_participant(split_id, participant) -> Option<ParticipantShare>`
- `get_participants(split_id, start, limit) -> Vec<ParticipantShare>`
- `get_split_count() -> u32`

`get_participants` must be bounded. The contract should enforce a maximum page size.

## Direct-To-Creator Payment Decision

For the MVP, Split uses direct-to-creator payment settlement.

`pay_share` transfers token amount from payer to creator, then records payment status on-chain. The contract does not escrow funds.

This matches the MVP product goal: payment coordination and transparent confirmation, not custody or dispute resolution.

Escrow is future scope and should require a separate architecture decision.

The creator is the receiver for a Split and should not be included as a participant payer. The participant list represents only the people expected to contribute back to the creator.

## Deadline Decision

Split has no required deadline in the MVP.

A Split stays `Active` until either:

- every participant pays and the Split becomes `Completed`
- the creator manually closes it and the Split becomes `Closed`

Optional deadlines may be added later for event-based or time-sensitive collections.

## Event Model

Emit these events:

- `split_created`
- `share_paid`
- `split_completed`
- `split_closed`

Events should include enough data for frontend refresh and future indexers:

- split id
- creator or payer
- amount paid
- total paid
- total amount
- status

## Frontend Routes and Components

### Routes

- `/split/create`
- `/split/[id]`
- Optional future route: `/split`

### Components

- `SplitForm`
- `ParticipantEditor`
- `SplitProgress`
- `SplitStatusList`
- `PaySharePanel`
- `ShareSplitActions`
- `SplitQRCode`

### Frontend Libraries

Recommended files:

- `frontend/lib/split-types.ts`
- `frontend/lib/split-contract.ts`
- `frontend/contexts/WalletContext.tsx`

## Wallet Transaction Flow

### Create Split

1. Validate form.
2. Preview equal participant amounts.
3. Build `create_split` transaction with total amount and participant rows.
4. Request wallet signature.
5. Submit transaction.
6. Poll transaction status.
7. Read new Split or derive id from result/event.
8. Redirect to `/split/[id]`.

### Pay Share

1. Connect wallet.
2. Read participant share for connected address.
3. Validate payable amount.
4. Build `pay_share` transaction.
5. Request wallet signature.
6. Submit transaction.
7. Poll transaction status.
8. Refresh Split and participant data.

## MVP Scope

Included:

- one dedicated Split contract
- direct-to-creator payment settlement
- creator as receiver, not participant payer
- Equal contribution mode
- manual Split link sharing
- no required deadline
- create Split
- pay assigned share
- close Split
- public Split page
- participant display names
- paid/pending status
- WhatsApp share
- copy link
- QR code
- README and demo evidence

## Future Scope

Deferred:

- escrow and refund rules
- mainnet asset configuration and validation hardening
- Stellar anchor/ramp integrations
- in-app asset swaps for users who need the selected settlement token
- notifications
- reusable groups
- creator dashboards
- backend/indexer
- participant reputation
- full Splitwise-style accounting
- invite/claim links
- deadlines for event-based collections
- custom contribution amounts

## Implementation Order

1. Finalize `contracts/split_contract/SPEC.md`.
2. Scaffold and rename the Split contract crate.
3. Implement storage types and statuses.
4. Implement `create_split`.
5. Implement `pay_share`.
6. Implement close and read functions.
7. Add contract tests.
8. Build frontend routes with mocked reads.
9. Add wallet and contract helper integration.
10. Verify end-to-end testnet flow and docs.
