# Split

> Split bills and group contributions without chasing people on WhatsApp.

Split is a Stellar-powered group payment tracker for shared bills, dues, event contributions, and other small group collections. A creator defines an equal contribution, shares one public payment page, and participants pay their assigned amount from a Stellar wallet. The page shows paid and pending participants using on-chain state instead of screenshots or manual confirmations.

Split is currently **pre-launch on Stellar Testnet**. V2 builds on the working V1 payment flow through user feedback, UX research, and a review call with UX professional PV. The current implementation and remaining validation are documented in the [product case study](docs/ux-case-study/CASE_STUDY.md).

## Links

- [Live application · V2](https://split-zig.vercel.app/)
- [Original application · V1](https://split-v1.vercel.app/)
- [Source code](https://github.com/Kingscliq/split)
- [Product journey and UX evidence](docs/ux-case-study/CASE_STUDY.md)
- [V1 → V2 decisions](docs/ux-case-study/DECISION_LOG.md)
- [Wallet architecture and implementation evidence](docs/ux-case-study/EMBEDDED_WALLET_ARCHITECTURE_SPIKE.md)
- [Testnet contract](https://stellar.expert/explorer/testnet/contract/CAMQBDU43E2QJSOLKSMPRK4NIO73RRPPRVMSZGNNQEPOJVHJM674KECL)

## The Problem

Small groups often coordinate collections in WhatsApp chats. The organizer shares payment details, participants send screenshots, and someone manually tracks who has paid. This becomes slow and unreliable for birthday dinners, class dues, roommate purchases, church contributions, meetups, shared rides, and community events.

## The Product Journey

V1 established the end-to-end payment flow. Feedback exposed wallet setup friction, long forms, and competing information panels. V2 responds with task-first entry, embedded onboarding alongside Freighter, staged creation, and a clearer receipt hierarchy. A Split-owned wallet adapter separates provider identity and signing from transaction construction, simulation, submission, and confirmation.

The local integration and isolated embedded-wallet Testnet proof are recorded in the linked UX documentation. Cross-wallet regression, recovery checks, paired V2 screenshots, and follow-up usability validation remain separate release tasks.

### Established V1 workflow

Split gives each collection one shared page:

1. The creator connects a Freighter wallet.
2. The creator enters a title, token, amount, and participant wallet addresses.
3. Split calculates equal participant shares and creates the collection on Stellar Testnet.
4. The creator shares the Split link through WhatsApp or copy link.
5. Each participant connects their wallet and pays their assigned share.
6. The public page updates the amount collected and each participant's paid or pending status.

Payments move directly from the participant to the creator. The Split contract tracks the collection but does not custody participant funds.

## Established Payment Features

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
- Limit Split detail pages to the creator and assigned participant wallets
- Pay a full or remaining participant share
- Track total collected, remaining amount, and completion progress
- Show paid and pending status for each participant
- Close an active Split as its creator
- Copy a Split link and share it through WhatsApp
- Responsive light and dark interfaces
- Bounded contract reads and direct-to-creator token transfers

### Payment-flow limitations

- Participants must provide wallet addresses before the creator creates a Split; self-join and claim links are future work.
- Freighter requires the user to approve network changes inside the wallet; Split detects the change and reconnects automatically once Testnet is selected.
- QR-code sharing is not implemented.
- The admin dashboard reports current contract state and unique public wallet addresses; Split does not yet have an off-chain identity or signup system.
- Split detail pages are gated in the application, but their underlying contract records remain public on Stellar Testnet.
- Assignment notifications poll current contract state while the application is open. Read status is stored per wallet in the current browser; push notifications across devices require a future backend/indexer.
- USDC onboarding requires a Testnet asset balance and may require additional trustline guidance. XLM is the recommended asset for the first user cohort.

## Architecture

The diagram below describes the original Freighter path. V2 introduces a shared wallet adapter for Blux and Freighter; see the [wallet architecture spike](docs/ux-case-study/EMBEDDED_WALLET_ARCHITECTURE_SPIKE.md) for integration status and validation boundaries.

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
NEXT_PUBLIC_SPLIT_VERSION=v2
NEXT_PUBLIC_SPLIT_V1_URL=https://split-v1.vercel.app
NEXT_PUBLIC_SPLIT_V2_URL=https://split-zig.vercel.app
```

Never commit secret keys or wallet seed phrases. All `NEXT_PUBLIC_*` values are embedded in the browser bundle and must contain public configuration only.

The durable event-history infrastructure is defined in [`supabase/`](supabase/). Follow the [Supabase indexer setup guide](docs/SUPABASE_INDEXER_SETUP.md) to apply the migration, deploy the Edge Function, schedule ingestion, and configure Vercel. The service-role key and indexer secret must remain server-side.

### Contract validation

```bash
cargo test -p split-contract
stellar contract build
```

Deployment and invocation helpers are available in [`scripts/`](scripts/). See the [latest QA report](docs/QA_REPORT_2026-07-22.md) for the existing validation record; record current signed multi-wallet and recovery testing in a new report before release.

## Feedback-Driven Product Improvements

User feedback will be grouped into onboarding, wallet/payment, usability, reliability, and feature-request themes. Improvements will be prioritized by frequency, user impact, implementation risk, and relevance to Split's focused payment-collection scope.

Every shipped feedback-driven change must link to its evidence and implementation commit. Do not list planned work as completed.

| Feedback insight | Planned or shipped improvement | Validation method | Commit |
| --- | --- | --- | --- |
| Testers need a simpler first transaction | Added an in-product Testnet onboarding guide covering Freighter, network selection, funding, and payment | Measure onboarding completion and repeat support questions | [4f9bdba](https://github.com/Kingscliq/split/commit/4f9bdba) and [2766d9f](https://github.com/Kingscliq/split/commit/2766d9f) |
| Participants cannot join without sending an address first | Evaluate a safe invite-and-claim flow without expanding into expense accounting | Prototype test and participant feedback | Pending user feedback and implementation |
| Sharing should work beyond copied links | Add and validate a scannable QR code on the Split page in V2 | Mobile scan test and user rating | V2 backlog |
| Transaction progress can be unclear | Added signing, submission, confirmation, retry, and failure messages | Controlled wallet-state tests | [4ad050e](https://github.com/Kingscliq/split/commit/4ad050e) and [6d7b5ef](https://github.com/Kingscliq/split/commit/6d7b5ef) |
| Users need confidence that activity is real | Added immediate receipts and a persistent indexed activity timeline with Stellar Expert links | Verify every displayed link and indexed event on Testnet | [4ad050e](https://github.com/Kingscliq/split/commit/4ad050e) and [707c04e](https://github.com/Kingscliq/split/commit/707c04e) |
| Wallet addresses are difficult to reuse | Added copy controls for the connected wallet and participant addresses | Desktop and mobile clipboard test | [6d7b5ef](https://github.com/Kingscliq/split/commit/6d7b5ef) |
| Missing Freighter and wrong-network errors block onboarding | Added an install link, explicit Testnet guidance, and automatic reconnection after the user switches Freighter to Testnet | Missing-extension and Public-to-Testnet wallet tests | [6d7b5ef](https://github.com/Kingscliq/split/commit/6d7b5ef) |
| Unfunded wallets are reported as nonexistent accounts | Added XLM/token balance checks and a Friendbot recovery path | Unfunded and insufficient-balance payment tests | [6d7b5ef](https://github.com/Kingscliq/split/commit/6d7b5ef) |
| Contract-wide activity exposes unrelated Splits | Filtered dashboard results to Splits created by or assigned to the connected wallet | Creator, participant, and unrelated-wallet dashboard tests | [6d7b5ef](https://github.com/Kingscliq/split/commit/6d7b5ef) |
| Unrelated wallets can open a shared Split URL | Gate Split details to the creator and assigned participant wallets and offer unrelated users a create action | Creator, participant, disconnected, and unrelated-wallet route tests | Implemented locally; commit pending |
| Payment errors are too far from the pressed action | Rendered wallet, balance, and transaction errors directly inside the payment card | Controlled failure-state UI tests | [6d7b5ef](https://github.com/Kingscliq/split/commit/6d7b5ef) |

Baseline implementation and QA history can be reviewed in the [frontend implementation commit](https://github.com/Kingscliq/split/commit/c6f1eda), [QA report commit](https://github.com/Kingscliq/split/commit/6c16cd6), and [deployment-script commit](https://github.com/Kingscliq/split/commit/1644132). These commits establish the baseline; the UX decision log records the later redesign.

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

### V2 validation

- Validate creation, payment, and closure across embedded and Freighter wallets
- Test session restoration, second-device recovery, and rejected or interrupted signing
- Capture matching V1/V2 screens and run follow-up task testing
- Review provider custody, recovery, portability, and operational requirements
- Resolve or assess dependency advisories before release

### Next phase

- Invite-and-claim links for participants who do not share wallet addresses in advance
- Reminders and notification options
- Reusable participant groups and bounded creator history
- Better USDC acquisition and trustline guidance
- QR-code sharing for Split invitations
- Product analytics beyond the current on-chain admin metrics
- Mainnet readiness review, security hardening, and storage TTL strategy

Split will remain a focused group payment tracker rather than becoming a full expense-accounting clone.

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
