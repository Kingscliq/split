# Split

> Split bills and group contributions without chasing people on WhatsApp.

Split is a Stellar-powered group payment tracker for shared bills, dues, event contributions, and other small group collections. A creator defines an equal contribution, shares one public payment page, and participants pay their assigned amount from a Stellar wallet. The page shows paid and pending participants using on-chain state instead of screenshots or manual confirmations.

Split is currently a **Stellar Testnet MVP** and is being prepared for the Rise In Level 5 Blue Belt user-growth phase.

## Links

| Resource | Link | Status |
| --- | --- | --- |
| Source code | [github.com/Kingscliq/split](https://github.com/Kingscliq/split) | Public |
| Web application | [split-zeta-six.vercel.app](https://split-zeta-six.vercel.app/) | Live and publicly accessible |
| Testnet contract | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAMQBDU43E2QJSOLKSMPRK4NIO73RRPPRVMSZGNNQEPOJVHJM674KECL) | Deployed |
| User feedback form | Not published yet | Required for Level 5 |
| Feedback response spreadsheet | Not published yet | Required for Level 5 |
| Pitch deck | Not published yet | Required for Level 5 |
| Demo video | Not published yet | Required for Level 5 |

## The Problem

Small groups often coordinate collections in WhatsApp chats. The organizer shares payment details, participants send screenshots, and someone manually tracks who has paid. This becomes slow and unreliable for birthday dinners, class dues, roommate purchases, church contributions, meetups, shared rides, and community events.

## The Solution

Split gives each collection one shared page:

1. The creator connects a Freighter wallet.
2. The creator enters a title, token, amount, and participant wallet addresses.
3. Split calculates equal participant shares and creates the collection on Stellar Testnet.
4. The creator shares the Split link through WhatsApp or copy link.
5. Each participant connects their wallet and pays their assigned share.
6. The public page updates the amount collected and each participant's paid or pending status.

Payments move directly from the participant to the creator. The Split contract tracks the collection but does not custody participant funds.

## MVP Features

- Create an equal-contribution Split with up to 50 participants
- Record participant names and Stellar wallet addresses
- Settle in native XLM or a configured Testnet USDC token
- Connect and sign transactions with Freighter
- Follow an in-app Testnet wallet setup and safety guide
- Fund a connected Testnet wallet with Stellar Friendbot
- View and copy confirmed transaction receipts with Stellar Expert links
- Copy connected and participant public wallet addresses
- Detect wrong-network changes and reconnect automatically after Freighter is switched to Testnet
- Check token balances before payment and distinguish insufficient funds from an unfunded wallet
- Show wallet and transaction errors beside the action that needs attention
- Limit the dashboard to Splits created by or assigned to the connected wallet
- Give the approved admin Testnet wallet a contract-wide activity dashboard with all Splits and unique creator/participant wallets
- Notify connected participants about assigned Splits with an unread badge, recent-assignment panel, and in-app live toast
- Persist contract events and transaction hashes through a Supabase event indexer, with a permanent activity timeline on each Split page
- Open a Split page without connecting a wallet
- Pay a full or remaining participant share
- Track total collected, remaining amount, and completion progress
- Show paid and pending status for each participant
- Close an active Split as its creator
- Copy a Split link and share it through WhatsApp
- Responsive light and dark interfaces
- Bounded contract reads and direct-to-creator token transfers

### Current MVP limitations

- Participants must provide wallet addresses before the creator creates a Split; self-join and claim links are future work.
- Freighter requires the user to approve network changes inside the wallet; Split detects the change and reconnects automatically once Testnet is selected.
- QR-code sharing is not implemented.
- The admin dashboard reports current contract state and unique public wallet addresses; Split does not yet have an off-chain identity/signup system or a persistent transaction-event index.
- Assignment notifications poll current contract state while the application is open. Read status is stored per wallet in the current browser; push notifications across devices require a future backend/indexer.
- USDC onboarding requires a Testnet asset balance and may require additional trustline guidance. XLM is the recommended asset for the first user cohort.

## Architecture

```text
Creator / Participant
        |
        v
Next.js application ---- Freighter wallet
        |                       |
        | read/simulate         | sign
        v                       v
Stellar Testnet RPC ---- Soroban Split contract
                                |
                                v
                     SEP-41 token transfer
                    participant -> creator
```

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Frontend | Next.js, React, TypeScript | Creation, sharing, payment, and status interfaces |
| Wallet | Freighter API | Testnet account access and transaction signing |
| Network | Stellar Testnet RPC | Contract simulation, submission, and state reads |
| Contract | Rust and Soroban SDK | Split validation, participant state, payments, status, and events |
| Assets | Native XLM SAC and configured USDC SAC | Direct participant-to-creator settlement |
| Hosting | Vercel | Web application deployment |
| Event index | Supabase Edge Functions, Cron, and Postgres | Durable transaction history and Explorer links |

More detail is available in [docs/architecture-overview.md](docs/architecture-overview.md) and [contracts/split_contract/SPEC.md](contracts/split_contract/SPEC.md).

## Contract Interface

The Soroban contract exposes the following focused API:

- `create_split`
- `pay_share`
- `close_split`
- `get_split`
- `get_participant`
- `get_participants`
- `get_split_count`

Core state transitions are covered by 25 contract tests, including valid creation, invalid participants, equal-split validation, partial and full payment, overpayment rejection, completion, and creator-only closure.

## Local Development

### Prerequisites

- Node.js and npm
- Rust toolchain
- Stellar CLI
- Freighter browser wallet for signed Testnet flows

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Configure these values in `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_SPLIT_CONTRACT_ID=<deployed-split-contract-id>
NEXT_PUBLIC_STELLAR_RPC_URL=<stellar-testnet-rpc-url>
NEXT_PUBLIC_SIMULATION_SOURCE=<valid-public-g-address>
NEXT_PUBLIC_XLM_TOKEN_CONTRACT=<native-xlm-sac-contract-id>
NEXT_PUBLIC_USDC_TOKEN_CONTRACT=<verified-testnet-usdc-sac-contract-id>
```

Never commit secret keys or wallet seed phrases. All `NEXT_PUBLIC_*` values are embedded in the browser bundle and must contain public configuration only.

The durable event-history infrastructure is defined in [`supabase/`](supabase/). Follow the [Supabase indexer setup guide](docs/SUPABASE_INDEXER_SETUP.md) to apply the migration, deploy the Edge Function, schedule ingestion, and configure Vercel. The service-role key and indexer secret must remain server-side.

### Contract validation

```bash
cargo test -p split-contract
stellar contract build
```

Deployment and invocation helpers are available in [`scripts/`](scripts/). See the [latest QA report](docs/QA_REPORT_2026-07-22.md) for the existing validation record; signed multi-wallet testing and Level 5 evidence must be recorded in a new report before submission.

## Level 5 User Onboarding Plan

The Level 5 target is **at least 50 unique Testnet users with real transaction activity and active-usage proof**. Page visits alone will not be counted as onboarded users.

### Onboarding definition

A user is considered successfully onboarded when all of the following are recorded:

1. They submit the onboarding form with their name, email, and public Stellar wallet address.
2. They connect their wallet on the public Split application.
3. They complete at least one successful Testnet Split transaction.
4. Their transaction hash or paid participant status is included in the evidence log.
5. They submit a product rating or written feedback.

### Google Form fields

The onboarding form will collect:

- Name
- Email address
- Public Stellar wallet address
- Whether onboarding and wallet setup were completed
- Split use case tested
- Transaction hash, when available
- Product rating on a 1–5 scale
- What was easy to understand
- What was confusing or difficult
- Most valuable requested improvement
- Permission to use anonymized feedback in the submission

Only public wallet addresses should be collected. Users must never submit seed phrases, private keys, passwords, or recovery phrases.

### Cohort strategy

- Begin with XLM-only test collections to minimize trustline and asset-acquisition friction.
- Recruit more than 50 candidates to allow for setup drop-off.
- Organize users into small, familiar groups with clear real-world scenarios.
- Personally support the first cohort and turn repeated questions into onboarding improvements.
- Export Google Form responses to Excel for analysis and submission evidence.
- Reconcile form responses with unique paid wallet addresses and Testnet transaction hashes.

### User evidence

The final evidence package will contain:

- A public or reviewer-accessible Google Form link
- An exported Excel workbook linked from this README
- At least 50 unique public wallet addresses
- Transaction hashes or explorer links proving real activity
- Screenshots of application analytics and on-chain activity
- A short anonymized feedback summary

**Feedback Excel export:** Not available yet. Add the final Google Drive or repository link here after responses have been exported and reviewed for sensitive information.

## Feedback-Driven Product Improvements

User feedback will be grouped into onboarding, wallet/payment, usability, reliability, and feature-request themes. Improvements will be prioritized by frequency, user impact, implementation risk, and relevance to Split's focused payment-collection scope.

Every shipped feedback-driven change must link to its evidence and implementation commit. Do not list planned work as completed.

| Feedback insight | Planned or shipped improvement | Validation method | Commit |
| --- | --- | --- | --- |
| Testers need a simpler first transaction | Add an in-product Testnet onboarding guide covering Freighter, network selection, funding, and payment | Measure onboarding completion and repeat support questions | Pending user feedback and implementation |
| Participants cannot join without sending an address first | Evaluate a safe invite-and-claim flow without expanding into expense accounting | Prototype test and participant feedback | Pending user feedback and implementation |
| Sharing should work beyond copied links | Add and validate a scannable QR code on the public Split page | Mobile scan test and user rating | Pending user feedback and implementation |
| Transaction progress can be unclear | Improve signing, submission, confirmation, retry, and failure messages | Controlled wallet-state tests | Pending user feedback and implementation |
| Users need confidence that activity is real | Add clear explorer links for the contract and successful transactions | Verify every displayed link on Testnet | Pending user feedback and implementation |
| Wallet addresses are difficult to reuse | Add copy controls for the connected wallet and participant addresses | Desktop and mobile clipboard test | Implemented locally; commit pending |
| Missing Freighter and wrong-network errors block onboarding | Add an install link, explicit Testnet guidance, and automatic network-change detection | Missing-extension and Public-to-Testnet wallet tests | Implemented locally; commit pending |
| Unfunded wallets are reported as nonexistent accounts | Check XLM/token balances before payment and provide a Friendbot recovery path | Unfunded and insufficient-balance payment tests | Implemented locally; commit pending |
| Contract-wide activity exposes unrelated Splits | Filter dashboard results to Splits created by or assigned to the connected wallet | Creator, participant, and unrelated-wallet dashboard tests | Implemented locally; commit pending |
| Payment errors are too far from the pressed action | Render wallet, balance, and transaction errors directly inside the payment card | Controlled failure-state UI tests | Implemented locally; commit pending |

Baseline implementation and QA history can be reviewed in the [frontend implementation commit](https://github.com/Kingscliq/split/commit/c6f1eda), [QA report commit](https://github.com/Kingscliq/split/commit/6c16cd6), and [deployment-script commit](https://github.com/Kingscliq/split/commit/1644132). These are baseline commits, not substitutes for the required feedback-driven iteration commits.

## Growth Strategy

### Initial audience

- Nigerian university students and class groups
- Roommates and hostel communities
- Church and volunteer units
- Tech meetup organizers
- Friends coordinating dinners, rides, and events

### Acquisition

- Guided WhatsApp onboarding sessions
- Small group demonstrations using familiar contribution scenarios
- Community partnerships with student and developer groups
- Shareable public Split links after the first successful transaction

### Activation and retention

- Activation: a user connects a wallet and completes a first payment.
- Success: the creator sees the payment confirmed without requesting a screenshot.
- Retention signal: a creator starts another Split or a participant pays in a later group.
- Feedback loop: cohort feedback is reviewed, prioritized, implemented, and retested with the next cohort.

## Market Opportunity

Split sits between informal chat-based coordination and heavyweight expense-accounting products. Its initial opportunity is small groups that need transparent collection status and fast settlement but do not need long-running debt calculations, accounting ledgers, or custodial balances.

The MVP deliberately focuses on one repeatable job: create a collection, share it, pay an assigned share, and see who is still pending.

## Roadmap

### Level 5

- Keep the public Vercel deployment stable and monitored during onboarding
- Verify and document signed XLM create-and-pay flows
- Onboard and validate at least 50 Testnet users
- Add onboarding guidance based on observed user friction
- Add analytics and transaction-evidence capture
- Ship feedback-driven UX and stability improvements
- Resolve or assess current dependency advisories
- Produce the pitch deck and full walkthrough video

### Next phase

- Invite-and-claim links for participants who do not share wallet addresses in advance
- Reminders and notification options
- Reusable participant groups and bounded creator history
- Better USDC acquisition and trustline guidance
- Event indexing for scalable activity history and analytics
- Mainnet readiness review, security hardening, and storage TTL strategy

Split will remain a focused group payment tracker rather than becoming a full expense-accounting clone.

## Pitch and Demo Outline

The professional pitch deck and recorded walkthrough will cover:

1. Problem statement and target users
2. Split's focused solution and product positioning
3. Market opportunity and initial communities
4. Live creator and participant user flow
5. Stellar, Soroban, and Freighter architecture
6. Testnet traction and transaction evidence
7. User feedback and shipped iterations
8. Growth and retention strategy
9. Roadmap and ecosystem opportunity

The demo must show a real end-to-end Testnet flow: create a Split, share it, connect a participant wallet, pay the assigned amount, and show the confirmed status and transaction evidence.

## Level 5 Submission Status

Status as of 2026-08-24:

| Requirement | Current evidence | Status |
| --- | --- | --- |
| Public GitHub repository | [Kingscliq/split](https://github.com/Kingscliq/split) | Complete |
| Live public application | [split-zeta-six.vercel.app](https://split-zeta-six.vercel.app/) returns the public Split application without authentication | Complete |
| 50+ Testnet users | No 50-user evidence package exists yet | Pending |
| Real transaction activity | One active Split is readable on Testnet; signed payment evidence is not documented | Pending |
| Active usage proof | No analytics or activity screenshots are stored in the repository | Pending |
| Product improvements from feedback | Feedback collection has not been completed | Pending |
| UX/UI and stability improvements | Responsive UI and contract validation exist; user-led iteration remains pending | In progress |
| Google Form | No form link supplied | Pending |
| Excel feedback export linked in README | No export link supplied | Pending |
| Professional pitch deck | No deck link supplied | Pending |
| Full demo video | No video link supplied | Pending |
| 20+ meaningful commits | Repository currently has 9 total commits, including merge commits | Blocked |
| Updated documentation | This README, architecture documentation, contract specification, and QA report | In progress |
| Feedback iteration summary with commit links | Structure is ready; real feedback and resulting commits are pending | Pending |

Meaningful commits should correspond to real product, testing, onboarding, analytics, evidence, documentation, or feedback-driven improvements. Trivial commit splitting should not be used to reach the requirement.

## Repository Structure

```text
.
├── agents/                         # Project role guidance
├── contracts/
│   └── split_contract/
│       ├── src/lib.rs              # Soroban contract
│       ├── src/test.rs             # Contract tests
│       └── SPEC.md                 # Contract specification
├── docs/
│   ├── architecture-overview.md
│   └── QA_REPORT_2026-07-22.md
├── frontend/
│   ├── app/                        # Next.js routes
│   │   ├── onboarding/             # Testnet setup guide
│   ├── components/                 # Shared UI
│   ├── contexts/WalletContext.tsx  # Freighter wallet state
│   └── lib/split-contract.ts       # Contract client
├── scripts/                        # Deploy, invoke, and smoke-test helpers
├── AI_AGENT_WORKFLOW.md
└── README.md
```

## Safety

- Split is currently for Stellar Testnet testing only.
- Never enter or share a wallet seed phrase or private key in Split, the feedback form, or the repository.
- Verify the network and transaction details in Freighter before signing.
- Do not treat Testnet balances as real funds.

## License

No license has been added yet. Add an explicit open-source license before encouraging third-party reuse.
