# Split AI Agent Workflow

This guide is for AI agents working on Split, a standalone Soroban project for Stellar-powered group payment tracking.

Split should stay simple: create a group payment, share the link, let participants pay their assigned share, and show who has paid or is pending.

## Product North Star

Split is not a generic expense tracker. It is a shared payment collection tool with Stellar-backed confirmation.

Primary user promise:

> Split bills and group contributions without chasing people on WhatsApp.

## New Project Context

Build Split as a fresh standalone project.

Recommended structure:

- `contracts/split_contract/` for the Soroban smart contract
- `frontend/` for the Next.js app
- `scripts/` for contract build/deploy/invoke helpers
- `docs/` for specs, demo notes, and release evidence
- `agents/` for AI-agent role instructions

Do not reuse unrelated naming, routes, data models, or token assumptions.

## Approved Split Scope

Split targets everyday Nigerian group payments:

- birthday dinners
- class dues
- hostel or roommate purchases
- church/unit contributions
- tech meetup fees
- shared rides
- small community events

The MVP should support:

- creating a Split
- adding participants
- equal assigned amounts
- verified XLM and USDC settlement options
- public shared Split page
- wallet connection
- paying assigned amount
- paid/pending status per participant
- total collected and remaining amount
- copy link and WhatsApp share
- QR code for the Split page

## Recommended Agent Sequence

Use the role files in `agents/` in this order:

1. `agents/product-analyst.md`
2. `agents/software-architect.md`
3. `agents/soroban-contract-engineer.md`
4. `agents/frontend-engineer.md`
5. `agents/wallet-integration-engineer.md`
6. `agents/qa-release-engineer.md`

Do not start implementation until the Product Analyst and Software Architect have produced a small approved spec.

## Development Workflow

### Discovery

Read:

- `README.md` if it exists
- `AGENTS.md` if it exists
- `contracts/split_contract/SPEC.md` if it exists
- `contracts/split_contract/src/lib.rs` if it exists
- `frontend/AGENTS.md` if it exists
- `frontend/lib/split-contract.ts` if it exists
- `frontend/contexts/WalletContext.tsx` if it exists

Produce:

- restated goal
- assumptions
- non-goals
- data model
- contract function list
- MVP acceptance criteria

### Contract First

Create a dedicated Split contract.

Recommended path:

- `contracts/split_contract/Cargo.toml`
- `contracts/split_contract/src/lib.rs`
- `contracts/split_contract/SPEC.md`

The contract should expose:

- `create_split`
- `pay_share`
- `close_split`
- `get_split`
- `get_participant`
- `get_split_count`
- `get_splits_by_creator` only if it can be bounded or indexed safely

Keep reads bounded. Prefer events and frontend/indexer reads over expensive unbounded loops.

### Frontend After Contract Shape

Recommended routes:

- `frontend/app/split/create/page.tsx`
- `frontend/app/split/[id]/page.tsx`
- `frontend/app/split/page.tsx` for simple dashboard/history if time allows

Recommended UI modules:

- `frontend/components/split/SplitForm.tsx`
- `frontend/components/split/SplitStatusList.tsx`
- `frontend/components/split/SplitProgress.tsx`
- `frontend/components/split/ShareSplitActions.tsx`
- `frontend/lib/split-contract.ts`
- `frontend/lib/split-types.ts`

If the project has no wallet context yet, create a small wallet layer before wiring Split transactions.

### Validation

Contract validation should cover:

- create Split with equal shares
- reject empty participant list
- reject zero or negative amount
- reject duplicate participant addresses
- reject overpayment
- allow partial payment if intentionally supported
- prevent paid amount exceeding owed amount
- mark Split completed when total paid reaches expected amount
- restrict `close_split` to creator
- emit events for create, pay, complete, close

Frontend validation should cover:

- required title
- valid total amount
- valid participants
- equal split math
- disabled states while signing/submitting
- useful errors for wallet missing, signing rejected, submission failed, and transaction failed

## Production-Ready Definition

Split is production-ready enough for Rise In when:

- contract has focused tests for all core payment paths
- frontend can create and pay a Split on testnet
- public Split page works on mobile
- payment status updates after confirmation
- share link and WhatsApp share work
- QR code is visible and scannable
- README explains setup, env vars, deploy, and demo flow
- screenshots or demo video show create, share, pay, and status update
- no secret keys are committed

## Mainnet Vision

After MVP:

- add Stellar anchor/ramp path for local currency access
- add an in-app asset swap path for users who hold XLM but need the selected settlement token
- add notifications/reminders
- add event indexing with Supabase/Postgres
- add participant aliases for non-crypto-friendly display
- add creator history and reusable groups

## Hard Rules For Agents

- Keep the product simple and useful before adding advanced features.
- Do not turn Split into a full accounting app.
- Do not implement unbounded contract loops for production-critical reads.
- Do not commit secrets or private keys.
- Do not replace the existing wallet flow unless necessary.
- Do not start mainnet assumptions before testnet flow works end to end.
- Do not skip tests for contract state transitions.
