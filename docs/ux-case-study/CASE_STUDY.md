# Split: Designing group payments without the payment chase

> A product design and engineering case study about turning a technically working Stellar payment tracker into a clearer, mobile-ready experience for people who may know nothing about Web3.

**Product:** Split  
**Role:** Product design, UX research, frontend engineering, smart-contract architecture, wallet integration, and QA  
**Platform:** Responsive web application  
**Network:** Stellar Testnet  
**Stack:** Next.js, React, TypeScript, Rust, Soroban, Blux, Freighter, Supabase, Vercel  
**Status:** V2 Testnet implementation in progress  
**Contact:** [@ajaezo on X](https://x.com/ajaezo)

---

## Overview

Split helps small groups collect equal contributions without relying on payment screenshots, repeated reminders, or a manually updated list in a WhatsApp chat.

A creator defines a purpose, total amount, asset, and participants. Split creates one shared payment record, assigns an equal share to each participant, and shows who is paid or pending from verifiable Stellar contract state. Payments move directly from each participant to the creator; the contract records coordination and status without holding the group's money.

The first version proved that the core transaction model worked. It could create a Split, accept participant payments, update group status, index events, and link to independent proof on Stellar Expert. Testing revealed a different problem: the product still asked everyday users to think like crypto users before they could act like people splitting a bill.

V2 became a focused redesign of comprehension, trust, and completion—not an expansion into full expense accounting.

> **Core product promise**  
> Split bills and group contributions without chasing people on WhatsApp.

### At a glance

| | |
|---|---|
| **Problem** | Group collections are coordinated through chat messages, screenshots, and manual follow-up. |
| **Primary users** | Friends, roommates, classmates, communities, and small event organizers. |
| **V1 achievement** | Proven on-chain creation, payment, status tracking, event indexing, and transaction proof. |
| **V1 friction** | Wallet installation, network switching, long addresses, dense forms, and technical details competed with the payment task. |
| **V2 direction** | Action-first entry, embedded onboarding, staged creation, receipt-like payment pages, explicit user roles, and progressive disclosure. |
| **Technical principle** | Keep funds non-custodial and the wallet provider replaceable while preserving the tested Soroban transaction lifecycle. |

🖼️ **SCREENSHOT PLACEHOLDER — Hero image**  
*Suggested capture: V2 Split receipt on desktop, showing the purpose, personal share, primary Pay action, and group progress.*

---

## The problem

Small group payments are rarely difficult because the arithmetic is complex. They are difficult because coordination is fragmented.

The organizer posts payment details in a chat. Participants pay at different times and send screenshots. The organizer cross-checks names, amounts, and bank alerts, then follows up with whoever is still pending. As the group grows, the chat becomes a poor source of truth.

This pattern appears in birthday dinners, class dues, roommate purchases, church and volunteer units, meetups, shared rides, and community events. The group needs a lightweight collection record—not a long-running ledger of who owes whom.

### The product opportunity

Split could replace the manual status loop with one shared page that answers four questions:

1. What is this payment for?
2. How much do I need to pay?
3. Who has already paid?
4. Can the result be independently verified?

The opportunity was deliberately narrow. Split would not become a Splitwise-style debt system, lending product, escrow, recurring billing tool, or fiat reconciliation service.

🖼️ **SCREENSHOT PLACEHOLDER — The existing behavior**  
*Suggested visual: a simple illustration or anonymized WhatsApp-style flow showing payment details → screenshots → manual checklist → reminders.*

---

## Users and jobs to be done

### The creator

Someone coordinating a shared expense or contribution. They need to define the payment, assign people accurately, share one link, and see who has paid without checking separate messages.

### The assigned participant

Someone asked to pay a specific share. They need to recognize the request, confirm that it belongs to their account, understand the amount and asset, and complete payment confidently.

### The new-to-Web3 participant

Someone who may not know what a browser-extension wallet, Testnet, transaction fee, or public address is. They need a familiar sign-in path and contextual explanations, with blockchain mechanics kept secondary to the task.

### The unrelated visitor

Someone who opens a shared link using an account that is neither the creator nor an assigned participant. They need a clear explanation without seeing the private presentation of participant details or payment controls.

---

## V1: proving the system before redesigning it

The first release established the contract and transaction foundation:

- Create an equal-contribution Split with participant names and Stellar addresses.
- Settle in Testnet XLM or configured Testnet USDC.
- Transfer funds directly from each participant to the creator.
- Track pending, partial, paid, completed, and closed states.
- Limit the dashboard to Splits relevant to the connected wallet.
- Persist contract events through a Supabase indexer.
- Link confirmed activity to Stellar Expert.
- Share a Split through a copied link or WhatsApp.

The Soroban contract exposes a deliberately small API: `create_split`, `pay_share`, `close_split`, `get_split`, `get_participant`, `get_participants`, and `get_split_count`. Its core state transitions are covered by 25 contract tests.

This mattered because the redesign could improve the experience without changing the underlying financial rules.

### What V1 taught us

V1 showed that transaction success alone does not create a successful product experience. Moderated testing with Web3 beginners and Stellar-aware users, supported by desktop and mobile evidence, surfaced several recurring issues:

- Wallet setup appeared before users had experienced the value of Split.
- Freighter installation and manual Testnet switching interrupted the core task.
- Long wallet addresses were correct but difficult to scan and remember.
- The creation form presented too many decisions at once.
- A participant's amount, group progress, balance, and proof competed across panels.
- Creator, participant, disconnected, and unrelated-account states were not always distinct enough.
- Mobile layouts inherited desktop wallet assumptions even when the page itself was responsive.
- Transaction state needed to distinguish review, approval, submission, confirmation, rejection, and failure.

> **Research discipline**  
> V1 was frozen as the evidence baseline. Every major V2 change was mapped to a V1 state, an observed friction, a design hypothesis, and a measurable success criterion. User quotations were not invented where the original wording was unavailable.

🖼️ **SCREENSHOT PLACEHOLDER — V1 evidence strip**  
*Suggested captures: disconnected dashboard, Testnet onboarding guide, long Create Split form, and participant payment page.*

---

## Defining the V2 strategy

The redesign objective was simple:

> Let a person create, understand, share, and complete a group payment without needing prior Web3 knowledge.

Stellar would remain the settlement and proof layer. Split would own the language, hierarchy, onboarding, recovery, and feedback around it.

### Product principles

1. **Action first.** Show the user's goal before setup details.
2. **Payment language first.** Explain the contribution before blockchain mechanics.
3. **Progressive disclosure.** Keep hashes and full addresses available without placing them everywhere.
4. **Correctness without visual noise.** Addresses stay authoritative; names support recognition.
5. **Receipt-like status.** Purpose, amount, people, and state should read as one record.
6. **Embedded onboarding by default.** A beginner should not need a browser extension.
7. **Explicit roles and states.** Creator, participant, disconnected visitor, and unrelated account must not look interchangeable.
8. **Remove before adding.** Every element must support comprehension, trust, or the next action.
9. **Verifiable by choice.** On-chain proof should be accessible, not required for ordinary understanding.

---

## The redesigned experience

### 1. From wallet-first to action-first entry

**Before:** The disconnected dashboard led with wallet connection and an empty private state. Users encountered infrastructure before the product's main job.

**After:** “Create a split” became the dominant entry action. A user can begin understanding the task before identity becomes necessary. Authentication appears in context when Split needs an account to create, view, or sign.

**Why it is better:** It answers “What can I do here?” before “Which wallet do I use?” and keeps valid work intact if the user dismisses authentication.

🖼️ **SCREENSHOT PLACEHOLDER — Before / After 01**  
*Left: V1 disconnected dashboard. Right: V2 action-first dashboard with the primary Create a split CTA.*

### 2. From one long form to staged decisions

**Before:** Purpose, amount, asset, participant details, allocation, and signing appeared in one long form with similar visual weight.

**After:** Creation is organized around four understandable decisions:

1. Define the purpose and amount.
2. Add participant names and authoritative wallet addresses.
3. Review the equal allocation, asset, total, and identities.
4. Confirm the active account and approve creation.

Validation is placed beside the responsible field. Duplicate or invalid addresses are caught before signing, and the review step makes the final consequences visible.

**Why it is better:** The user can understand the current step, fix errors locally, and catch an incorrect participant or amount before authorizing an irreversible transaction.

🖼️ **SCREENSHOT PLACEHOLDER — Before / After 02**  
*Left: V1 full Create Split form. Right: V2 purpose-and-amount step plus the final review state.*

### 3. Separating identity correctness from human recognition

Wallet addresses and display names solve different problems.

**During entry:** The wallet address is primary because it controls who is authorized to pay. It is validated, checked for duplicates, and shown in full before signing.

**During review and status:** The display name becomes primary for scanning. A shortened address remains visible as secondary proof, with copy or full-address access on demand.

**Tradeoff:** A friendly name is not identity verification. Split keeps the exact address available wherever a wrong assignment would carry consequences.

🖼️ **SCREENSHOT PLACEHOLDER — Before / After 03**  
*Left: address-heavy participant rows. Right: name-first status list with shortened address and verification controls.*

### 4. Turning the Split page into a receipt

**Before:** Purpose, group status, personal amount, balance, payment action, and proof were distributed across competing panels.

**After:** The page follows the way people read a payment request:

1. Purpose and status.
2. Total requested, collected, and remaining.
3. The viewer's relationship to the Split.
4. The viewer's amount and next action.
5. Paid and pending participants.
6. Copy link and Share on WhatsApp.
7. On-chain proof and advanced transaction details.

The personal payment CTA is visually dominant. The amount summary remains prominent but no longer competes with the action through identical color treatment. Transaction details sit inside a clearly signposted accordion with a chevron.

**Why it is better:** A participant can state what the payment is for, what they owe, and what to do next from one coherent view. A completed Split reads as a paid receipt rather than an active request.

🖼️ **SCREENSHOT PLACEHOLDER — Before / After 04**  
*Left: V1 participant page with competing panels. Right: V2 receipt hierarchy and dominant Pay CTA.*

### 5. Making sharing a first-class next step

Creating a Split is only useful when the group can reach it.

The creation success state and Split receipt restore two explicit actions:

- **Copy link** for any channel.
- **Share on WhatsApp** for the dominant coordination context.

These actions are distinct from “View on Stellar,” which exists for verification rather than invitation.

🖼️ **SCREENSHOT PLACEHOLDER — Sharing**  
*Suggested capture: creation confirmation showing Copy link, Share on WhatsApp, and View on Stellar as separate next actions.*

### 6. Designing explicit access states

V2 treats identity as part of the interface model:

| Viewer | Experience |
|---|---|
| **Disconnected** | Asked to continue before participant details are shown. |
| **Creator** | Sees “You created this Split,” sharing, progress, and creator controls—even when they do not owe a share. |
| **Assigned participant** | Sees their amount, balance, payment state, and Pay action. |
| **Unrelated account** | Sees that the Split is not assigned to the account and is invited to create a new Split; participant details and payment controls stay hidden. |

**Important limitation:** This is interface-level disclosure control, not cryptographic privacy. Stellar contract records remain publicly inspectable on-chain.

### 7. Making mobile a complete flow

V1 was responsive, but an extension-led wallet model still limited the practical mobile journey.

V2's embedded account path is designed so a user can authenticate, fund a Testnet account, create, open, pay, and verify a Split inside a normal supported mobile browser. Long addresses wrap safely, primary actions remain reachable, overlays dismiss clearly, and transaction feedback stays beside the action that started it.

🖼️ **SCREENSHOT PLACEHOLDER — Mobile journey**  
*Suggested sequence: mobile dashboard → embedded sign-in → participant receipt → payment confirmation.*

---

## Wallet architecture: convenience without product lock-in

Removing the browser-extension requirement was the largest UX opportunity and the most consequential technical decision.

V1 imported Freighter directly into wallet state and transaction signing. Replacing it with a single embedded-wallet SDK throughout the interface would have traded one form of coupling for another.

### The decision

V2 introduced a Split-owned wallet adapter with:

- **Blux** as the primary embedded Testnet candidate.
- **Freighter** as the existing-wallet path.
- **Privy user-owned Stellar wallets** as a documented fallback if Blux fails custody, recovery, portability, or production gates.

The UI and contract transaction service depend on Split's own session and signer types, not page-level provider APIs. This keeps provider identity, session, and signing separate from the domain logic that builds, simulates, submits, and confirms a Split transaction.

```text
User action
    ↓
Split transaction service
validate → build → simulate → request signature → submit → confirm
    ↓                                      ↓
Soroban contract                    Active wallet adapter
                                 ↙                       ↘
                         Blux embedded             Freighter external
```

### Why Blux was selected for the Testnet proof

Blux offered the closest documented fit for a Stellar/Soroban React product:

- Email, Google, passkey, and existing-wallet authentication methods.
- Testnet support and Stellar balance helpers.
- Soroban transaction and authorization support.
- Raw signed XDR returned to Split's existing submission pipeline.
- A classic `G...` account compatible with the existing source-account model.

### What the proof established

On 3 September 2026, the isolated capability proof verified:

- Email and one-time-code authentication.
- A classic Stellar account returned by Blux.
- Session restoration to the same address after refresh.
- Friendbot funding visible in the Testnet balance.
- Successful review, signing, submission, and confirmation of a self-payment.
- Successful simulation, authorization, submission, and confirmation of `create_split`.
- A deployed contract result with Split ID `13` and a verifiable transaction hash.

The local V2 integration then added provider-neutral Create, Pay, and Close signing; Split-owned transaction review; automatic session restoration; email, Google, and passkey entry; Testnet balances and funding; and distinct **Log out** versus **Disconnect wallet** behavior.

### The tradeoffs

| Decision | Benefit | Cost or risk | Mitigation |
|---|---|---|---|
| Embedded wallet by default | Removes extension setup and enables a normal mobile browser flow. | Custody, recovery, portability, deletion, and pricing depend on a provider. | Conditional Testnet adoption, provider-neutral adapter, written Mainnet gates. |
| Keep Freighter | Preserves choice for existing Stellar users and an outage fallback. | Two session and approval models must be tested. | One shared transaction lifecycle and provider-specific adapters. |
| Classic `G...` accounts | Works with the existing source-account and Soroban flow. | Does not capture the full potential of smart wallets or sponsored transactions. | Keep Stellar Passkey Kit as a future architecture option. |
| Split-owned approval UI | Makes purpose, amount, network, account, and action understandable before signing. | The wallet still owns the final cryptographic approval surface. | Display locally prepared details first; never sign arbitrary remote XDR. |
| Headless white-label auth | Keeps onboarding visually consistent with Split. | Provider email delivery remains only partially customizable and still exposes Blux branding/sender details. | Describe it honestly as branded in-app authentication, not a fully white-labeled email channel. |

### Mainnet gates still open

Blux is a proven Testnet candidate, not an unconditional Mainnet approval. Before release, Split still needs to verify:

- Same-address recovery after explicit logout and on a second device.
- Embedded-to-Freighter and Freighter-to-embedded payments in both directions.
- Rejection, timeout, insufficient-funds, and interrupted-confirmation paths.
- Full Freighter regression after the SDK migration.
- Provider custody, recovery, export, deletion, session revocation, licensing, and Mainnet pricing.

---

## Smart-contract and data decisions

### Direct-to-creator settlement

When a participant pays, the Soroban contract transfers the selected token directly to the creator and updates the participant and group records.

**Why:** It keeps Split focused on coordination and proof while avoiding custody, pooled balances, withdrawal logic, and a larger security surface.

**Tradeoff:** The creator receives funds immediately, so Split is not an escrow or dispute-resolution mechanism.

### Equal contributions only

The contract divides the final amount evenly across participants and rejects an uneven total.

**Why:** Equal group contributions match the initial use cases and keep creation, verification, and contract logic predictable.

**Tradeoff:** Users cannot assign custom amounts or maintain complex debts. This is intentional product scope, not an overlooked feature.

### Bounded storage and reads

Participant count, title length, display-name length, and pagination are bounded. The current maximum is 50 participants.

**Why:** Bounded operations make contract resource use and frontend pagination predictable.

### Event index rather than a second source of truth

Stellar contract state remains authoritative. A Supabase Edge Function, scheduled ingestion, and Postgres table preserve a durable, queryable activity timeline with transaction hashes and Explorer links.

**Why:** The index improves notification and history UX without turning an off-chain database into the financial source of truth.

**Tradeoff:** Indexed activity can lag behind the chain and must be monitored for missed events or duplicate ingestion.

---

## Transaction safety and feedback

Every financial action uses the same product-owned lifecycle:

1. **Review** — show purpose, asset, amount, participants, active account, network, and action.
2. **Preparing** — validate intent and simulate against Stellar Testnet.
3. **Approve** — request an explicit signature from the active wallet.
4. **Submitting** — disable duplicate submission and send the signed transaction.
5. **Confirming** — poll Stellar and preserve the transaction hash.
6. **Success or actionable failure** — update the correct product state and provide proof or recovery.

Split never accepts an arbitrary unsigned XDR from a URL or database and forwards it directly to a signer. The client constructs and simulates the allowed `create_split`, `pay_share`, or `close_split` call locally before approval.

Rejected or interrupted approvals do not create an optimistic “paid” state. Errors appear next to the action that needs attention rather than in a detached global message.

🖼️ **SCREENSHOT PLACEHOLDER — Transaction lifecycle**  
*Suggested captures: Review transaction → Awaiting approval → Confirming → Success receipt.*

---

## Before and after summary

| Experience | V1 | V2 |
|---|---|---|
| Entry | Connect a wallet before understanding the task. | Begin with the dominant Create a split action; authenticate in context. |
| Onboarding | Install Freighter, create a wallet, switch networks, then fund it. | Continue with Google, email, or passkey; keep existing wallet as a choice. |
| Creation | One long form with competing fields and review information. | Staged decisions with inline validation and a dedicated final review. |
| Participant identity | Long addresses dominate status views. | Address-first when correctness matters; name-first when scanning. |
| Split details | Amount, status, action, and proof compete across panels. | One receipt hierarchy centered on the viewer's role and next action. |
| Payment CTA | Shared the same strong color treatment as the amount card. | The button is the unmistakable dominant action. |
| Sharing | Could disappear from the post-creation flow. | Copy link and Share on WhatsApp are explicit next steps. |
| Technical proof | Visible, but sometimes competed with the task. | Available inside a labeled accordion with a chevron and Explorer links. |
| Access states | Creator and unrelated states could be ambiguous. | Creator, participant, disconnected, and unrelated views are explicit. |
| Mobile | Responsive layout with extension-dependent completion. | Normal-browser onboarding and payment path through an embedded account. |

---

## Validation and evidence

### Contract quality

- 25 contract tests passed in the recorded QA baseline.
- Coverage includes valid creation, invalid participant inputs, equal-split rules, partial and full payment, overpayment rejection, completion, and creator-only closure.
- The contract builds to a release WASM artifact.

### Frontend and integration

- ESLint and the Next.js production build passed in the recorded QA baseline.
- Responsive layouts were inspected at 390×844, 768×1024, 1440×900, and 1920×1080 without horizontal overflow.
- A real Blux-signed `create_split` transaction was confirmed on Stellar Testnet.
- Successful in-product receipts can link to matching Stellar Expert proof.

### Evidence framework

The repository preserves V1 desktop, mobile, and transaction-proof screenshots. V2 captures are intentionally paired by scenario, role, data, and viewport. Each final case-study comparison should follow the same structure:

1. V1 state.
2. Observed friction.
3. Research evidence.
4. Design decision.
5. V2 state.
6. Observable result.

### What is not yet claimed

This case study does not claim a quantified usability lift or production readiness yet. The V2 evidence set still needs completed same-scenario screenshots, moderated task results, full multi-wallet regression, second-device recovery, and failure-state testing.

That distinction matters: the work has strong implementation and transaction evidence, but future usability metrics should be reported only after the next testing round.

---

## Known limitations

- Split is currently on Stellar Testnet; the assets have no real-world value.
- Participants must provide public Stellar addresses before creation; self-join and claim links are future work.
- Contributions are equal rather than individually assigned.
- Interface access controls do not make public on-chain records private.
- Testnet USDC may require additional balance or trustline guidance; XLM remains the simpler first-cohort asset.
- QR sharing is not part of the current completed experience.
- Contract storage TTL maintenance and event regression coverage need further engineering work.
- The frontend needs a dedicated automated test suite for form, wallet, decoding, and transaction states.
- Large valid token values should remain in exact `bigint` formatting paths to avoid JavaScript `Number` precision loss.
- The Blux email sender and template are not fully white-labeled even when the in-app authentication experience uses Split branding.

---

## Outcome

Split moved from a blockchain application that successfully tracked a group payment to a more deliberate payment product that uses blockchain in the background.

The most important change was not a new contract function. It was a shift in hierarchy:

- from connecting infrastructure to starting a task;
- from reading addresses to recognizing people;
- from navigating panels to reading a receipt;
- from generic transaction feedback to an explicit approval lifecycle;
- from an extension-dependent flow to a provider-neutral embedded path;
- from blockchain proof everywhere to blockchain proof when it builds trust.

The result is a clearer V2 direction that preserves non-custodial settlement, verifiability, and focused scope while making the experience more approachable for the people Split is actually for.

🖼️ **SCREENSHOT PLACEHOLDER — Final product montage**  
*Suggested captures: dashboard, creation review, creator receipt, participant Pay state, completed receipt, and mobile confirmation.*

---

## What I would do next

1. Complete the V2 screenshot set using the frozen V1 scenarios and consistent viewports.
2. Run moderated creator and participant tasks with Web3 beginners and Stellar-aware users.
3. Measure task completion, time to first successful payment, points of moderator assistance, and comprehension of purpose/amount/status.
4. Finish embedded/external cross-wallet payment testing and failure-state regression.
5. Validate same-address recovery across logout, browser, and mobile device.
6. Resolve contract TTL, event assertions, exact large-number formatting, and frontend automated test coverage.
7. Confirm Blux custody, export, deletion, session, licensing, and Mainnet terms before any production decision.
8. Explore participant invite-and-claim only after defining safe ownership, reassignment, and recovery rules.

---

## Reflection

Three lessons shaped this work.

**A working transaction is only one layer of success.** The chain can confirm a payment while the person remains uncertain about identity, amount, network, or status.

**Abstraction is a product decision.** The wallet adapter did more than clean up code. It made it possible to offer familiar onboarding without letting one provider define the entire product experience.

**Scope protects clarity.** Keeping Split focused on equal group collections made the contract safer, the receipt easier to understand, and every UX decision easier to evaluate against a single job.

---

## Links

- [Live Testnet application](https://split-zig.vercel.app/)
- [Source code](https://github.com/Kingscliq/split)
- [Stellar Testnet contract](https://stellar.expert/explorer/testnet/contract/CAMQBDU43E2QJSOLKSMPRK4NIO73RRPPRVMSZGNNQEPOJVHJM674KECL)
- [Contact @ajaezo on X](https://x.com/ajaezo)

---

## Screenshot checklist

Use this section while completing the final Notion page, then remove it before publishing.

- [ ] Hero: strongest V2 desktop receipt
- [ ] Manual chat-based coordination problem
- [ ] V1 evidence strip
- [ ] Disconnected dashboard before/after
- [ ] Create Split before/after
- [ ] Participant identity before/after
- [ ] Receipt hierarchy before/after
- [ ] Creation success and sharing actions
- [ ] Mobile end-to-end flow
- [ ] Transaction lifecycle states
- [ ] Stellar Expert proof
- [ ] Final V2 product montage

