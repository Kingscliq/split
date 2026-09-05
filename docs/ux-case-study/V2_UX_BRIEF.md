# Split V2 UX Brief

Status: Draft for approval  
Release: V2  
Evidence baseline: Frozen V1 screenshots in `docs/ux-case-study/v1/`

## 1. Product objective

V2 should let a person create, understand, share, and complete a group payment
without needing prior Web3 knowledge. Stellar remains the settlement and proof
layer, while Split owns the language, hierarchy, onboarding, and recovery
experience.

The primary promise remains:

> Split bills and group contributions without chasing people on WhatsApp.

## 2. Why V2 exists

V1 proved that a real group payment can be created, assigned, paid, indexed,
and verified on Stellar Testnet. User testing also showed that successful
transactions are not enough: wallet setup, network selection, unfamiliar
addresses, information density, and mobile extension limitations can distract
users from the payment task.

V2 therefore focuses on comprehension and completion, not new expense-accounting
features.

## 3. Research inputs

- moderated testing with Web3 beginners and Stellar-aware users
- observed sessions with Favour, Tomi, and additional participants
- feedback-form responses and screenshots
- V1 desktop and mobile evidence
- transaction and indexer evidence
- product-pattern review of Wise, LemFi, Flutterwave Send, and NoBlocks

Exact quotes must be added only from the original research material. This brief
does not invent participant quotations.

## 4. Target users

### Split creator

Someone collecting money for rent, dinner, transport, dues, a meetup, or another
small group activity. They need to define the payment, identify participants,
share it, and see who has paid.

### Assigned participant

Someone asked to pay a specific share. They need to understand the request,
confirm that it is meant for their wallet, see whether they can afford it, and
complete payment confidently.

### New-to-Web3 participant

Someone who does not already have a browser-extension wallet or understand
Testnet, fees, public addresses, or transaction signing. They need an embedded
wallet path that keeps those concepts secondary to the payment task.

### Unrelated wallet

Someone who opens a Split link but is neither its creator nor an assigned
participant. They must not see the private presentation of the Split inside the
product.

## 5. V2 design principles

1. **Action first.** The primary task should appear before setup details.
2. **Payment language first.** Explain the contribution before blockchain mechanics.
3. **Progressive disclosure.** Show transaction hashes and full addresses when useful, not everywhere.
4. **Correctness without visual noise.** Addresses remain authoritative while names aid recognition.
5. **Receipt-like status.** Purpose, amount, people, and payment state should read as one coherent record.
6. **Embedded onboarding by default.** A new user should not need a browser extension.
7. **Explicit states.** Creator, assigned participant, disconnected visitor, wrong network, and unrelated wallet must never look interchangeable.
8. **Remove before adding.** Every visible element must support comprehension, trust, or the next action.
9. **Verifiable by choice.** Users can inspect Stellar proof without needing it to understand the normal flow.

## 6. Required V2 workstreams

### 6.1 Action-first entry and dashboard

The disconnected experience leads with **Create a split**. Selecting it begins
the task and introduces embedded-wallet onboarding only when identity or signing
becomes necessary.

Acceptance criteria:

- Page shows one visually dominant Create Split action when disconnected.
- User can begin understanding the creation task before learning wallet terminology.
- Page explains that settlement is on Stellar without making wallet setup the headline.
- Connected users can see their relevant active and completed Splits.
- Balance is available at a glance without opening an individual Split.

### 6.2 Simplified Create Split flow

The form should be divided into understandable decisions instead of presenting
every field with equal weight.

Proposed sequence:

1. Enter purpose and collection amount.
2. Add participants and authoritative wallet addresses.
3. Review the equal allocation and final amount.
4. Authenticate or confirm the active wallet.
5. Sign and create.

Acceptance criteria:

- Amount field is immediately identifiable as an amount entry control.
- Form explains whether the creator's own share is included.
- Participant wallet address is required, prominent, and validated inline.
- Display name is collected as the human-readable label for that address.
- Errors appear beside the responsible field and in the participant container.
- Review step shows the exact asset, total, per-person amount, and participants.
- Rejecting or failing a signature does not create a successful Split state.

### 6.3 Participant identity hierarchy

The wallet address and display name serve different purposes.

During entry:

- wallet address is primary because it controls assignment and payment rights
- display name is required for human recognition
- address validation and duplicate detection are immediate

During review and status display:

- display name is primary for scanning
- shortened wallet address is secondary for verification
- full address and copy action are available on demand

Acceptance criteria:

- Creator can distinguish participants without comparing long addresses.
- Creator can still verify the exact address before signing.
- System rejects invalid and duplicate addresses.
- Payment status is always associated with both the friendly name and wallet identity.

### 6.4 Receipt-style Split details

The Split page should read as a payment receipt rather than disconnected panels.

Required information order:

1. purpose and status
2. total requested, collected, and remaining
3. viewer's relationship to the Split
4. viewer's amount and next action, when assigned
5. paid and pending participants
6. share controls
7. on-chain proof and advanced details

Acceptance criteria:

- User can identify the purpose, amount, status, and next action at a glance.
- Creator can see paid and pending participants in one coherent list.
- Assigned participant sees their share more prominently than group-wide technical data.
- Completed state removes or disables payment actions clearly.
- Stellar Expert links remain available as proof.

### 6.5 Access and disclosure states

#### Disconnected visitor

- Page does not reveal the private presentation of Split and participant details.
- Page asks the visitor to continue with the embedded wallet or connect an existing wallet.
- Page may provide a generic on-chain verification route without exposing private UI details.

#### Creator

- Can view the Split even when not included as an assigned payer.
- Sees creator-specific sharing and status controls.
- Is never labeled as unauthorized merely because they do not owe a share.

#### Assigned participant

- Can view the Split and their assigned amount.
- Can pay only for the connected identity's assignment.
- Sees paid, pending, insufficient-balance, and completed states clearly.

#### Unrelated wallet

- Cannot view the private Split presentation or participant details.
- Sees a clear explanation that the Split is not assigned to this wallet.
- Receives a Create a Split action.
- Cannot trigger payment.

Important limitation: Stellar contract state is publicly inspectable. V2 access
rules limit disclosure in the Split interface; they do not make public on-chain
data cryptographically private.

### 6.6 Embedded wallet and wallet abstraction

Embedded wallet support is a V2 release requirement, not a future research item.
The architecture spike selected Blux as the conditional Testnet candidate,
Freighter as the secondary existing-wallet path, and Privy as the fallback.
The custody target is user-owned and non-custodial. Provider due diligence and
the live contract proof in `EMBEDDED_WALLET_ARCHITECTURE_SPIKE.md` remain release
gates before the interface is redesigned around this path.

Required experience:

- Embedded wallet is the default route for new users.
- No browser-extension installation is required.
- User can create or access the same wallet on desktop and mobile.
- Authentication and recovery use familiar language.
- User can see balances and approve Split transactions inside the experience.
- App explains when a transaction is being signed and submitted.
- Existing-wallet connection remains a distinct secondary option.
- Transactions remain verifiable on Stellar.

Provider evaluation criteria:

- Stellar and Soroban transaction support
- supported authentication methods
- key custody and recovery model
- mobile and desktop compatibility
- account export or portability
- transaction-policy controls
- SDK maturity and maintenance
- testnet support
- pricing and operational limits
- data protection and account-deletion support

Release acceptance criteria:

- New user completes onboarding without installing Freighter.
- Returning user restores access on another supported device.
- User can receive Testnet funding and see the updated balance.
- User can create or pay a Split using the embedded signer.
- Failed, rejected, and interrupted signing states are recoverable.
- Existing Freighter users can intentionally choose the external-wallet route.
- Security review documents custody, recovery, session, and logout behavior.

### 6.7 Mobile end-to-end experience

Mobile is not a resized desktop page. The embedded wallet must make the complete
V2 flow possible in a normal supported mobile browser.

Acceptance criteria:

- User can onboard, create, open, pay, and verify a Split on mobile.
- No horizontal scrolling is required.
- Primary action remains visible without covering content.
- Navigation overlays close after selection.
- Long addresses do not break the layout.
- Transaction and error messages remain associated with the initiating action.

## 7. Non-goals

- full Splitwise-style debt accounting
- recurring payments
- lending, credit, or escrow
- fiat-bank-transfer reconciliation
- complex profiles or social feeds
- ratings, reputation, or governance
- hiding data that is inherently public in the deployed contract
- mainnet release before the V2 Testnet flow passes security and usability checks

## 8. V2 success measures

- New user identifies the primary action without prompting.
- New-to-Web3 user onboards without installing a wallet extension.
- Creator completes a valid Split without help identifying participant fields.
- Participant can state purpose, amount owed, and payment status after viewing the receipt.
- Unrelated wallet cannot access the private Split presentation or payment action.
- Users can locate on-chain proof when asked.
- Desktop and mobile completion paths pass the release checklist.
- Follow-up testing produces fewer wallet, network, and information-hierarchy questions than V1.

## 9. Delivery gates

1. Approve this UX brief.
2. Complete embedded-wallet architecture spike and threat review.
3. Approve the before/after map and flow acceptance criteria.
4. Implement one workstream per feature branch.
5. Run creator, participant, unrelated-wallet, failure, and mobile QA.
6. Capture matching V2 evidence.
7. Conduct follow-up usability testing.
8. Publish the case study only after documenting outcomes honestly.

## 10. Open decisions

- Whether Blux passes the documented custody, recovery, export, deletion, pricing,
  classic-address, and Split-contract proof gates
- Whether passkey login links safely to the same wallet as email/social login
- Exact unauthenticated verification content
- Whether display names remain on-chain, indexed off-chain, or local presentation metadata
