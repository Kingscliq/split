# Split V1 to V2 Before/After Map

Status: Working evidence map  
V1 source: `docs/ux-case-study/v1/`  
V2 destination: `docs/ux-case-study/v2/`

Use this map to connect research evidence to an implemented V2 decision. A V2
row is complete only when its behavior passes QA and its matching screenshot is
captured.

| Flow | V1 evidence | V1 observation | V2 hypothesis | Observable success criterion | V2 evidence | Status |
|---|---|---|---|---|---|---|
| Disconnected dashboard | `v1/desktop/01-dashboard-wallet-disconnected.png` | Wallet setup and an empty private dashboard appear before the user has experienced the core action. | Lead with Create a Split and start embedded onboarding only when identity is needed. | A disconnected first-time user identifies how to create a Split without explanation. | `v2/desktop/01-dashboard-wallet-disconnected.png` | Planned |
| Connected dashboard | `v1/desktop/03-dashboard-connected-with-notifications.png` | Balance and Split summary exist, but the page must become a clearer action surface. | Prioritize Create, active requests, and balances in that order. | User can identify their next relevant payment or creation action at a glance. | `v2/desktop/03-dashboard-connected-with-notifications.png` | Planned |
| Wallet menu | `v1/desktop/04-wallet-menu-address-balance-disconnect.png` | Address, balances, and disconnect work, but the extension-led mental model remains prominent. | Present embedded identity and balances in familiar account language; keep external wallet as secondary. | User can identify the active account, balance, recovery entry point, and logout/disconnect behavior. | `v2/desktop/04-wallet-menu-address-balance-disconnect.png` | Planned |
| Wrong network | `v1/desktop/05-wrong-network-testnet-instructions.png` | Recovery depends on opening Freighter and manually changing networks. | Embedded wallet selects the supported network internally; external-wallet users receive specific recovery guidance. | Embedded users never need to switch an extension; external users can recover without assistance. | `v2/desktop/05-wrong-network-testnet-instructions.png` | Planned |
| Onboarding | `v1/desktop/06-testnet-onboarding-guide.png` | Guide explains extension installation, wallet creation, network switching, funding, and public addresses before payment. | Make embedded signup the default and teach Stellar concepts progressively. | New user reaches a funded usable wallet without installing Freighter. | `v2/desktop/06-embedded-wallet-onboarding.png` | Planned |
| Empty Create Split | `v1/desktop/07-create-split-empty-form.png` | A long page presents amount, title, asset, final amount, and participant entry together. | Divide creation into purpose/amount, participants, review, and signing decisions. | User can explain the current step and proceed without scanning the whole form. | `v2/desktop/07-create-split-first-step.png` | Planned |
| Completed Create Split | `v1/desktop/09-create-split-completed-form.png` | Equal allocation is visible, but entry and review are mixed. | Add a dedicated review state with exact total, asset, allocation, and identities. | Creator catches an incorrect address or allocation before signing. | `v2/desktop/09-create-split-review.png` | Planned |
| Participant validation | `v1/desktop/09-create-split-completed-form.png` | Wallet-address correctness is essential, while names are needed for recognition. | Keep wallet address primary during entry and show display name as the required human label. | Invalid and duplicate addresses are rejected inline; every valid address has a readable label. | `v2/desktop/10-participant-address-validation.png` | Planned |
| Creation confirmation | `v1/desktop/08-split-created-confirmation.png` | Confirmation and proof exist but compete with the full Split page. | Show a concise success state with Share and View on Stellar as distinct next actions. | Creator can share the Split or verify the transaction immediately. | `v2/desktop/08-split-created-confirmation.png` | Planned |
| Creator viewing unassigned Split | `v1/desktop/10-creator-view-active-split-not-assigned.png` | Creator correctly sees the Split but the payment panel says “You're not in this split,” which can imply lack of authorization. | State “You created this Split” and replace payer controls with creator actions. | Creator understands they can manage/view the Split without owing a share. | `v2/desktop/10-creator-view-active-split-not-assigned.png` | Planned |
| Assigned participant pending | `v1/desktop/14-participant-pending-payment.png` | Assigned amount, balance, group status, and action are distributed across large panels. | Use a receipt hierarchy that leads with purpose, amount owed, status, and Pay. | Participant can state what the payment is for and how much they owe within one view. | `v2/desktop/14-participant-pending-payment.png` | Planned |
| Completed Split | `v1/desktop/11-completed-split-paid-participant.png` | Completion is visible, but the page still resembles the active payment layout. | Use a compact paid receipt with status, participant record, and proof. | User cannot mistake a completed Split for an actionable request. | `v2/desktop/11-completed-split-paid-participant.png` | Planned |
| Notifications | `v1/desktop/13-dashboard-active-and-completed-notifications.png` | Assignments and completion updates are useful but separate from a clear priority model. | Order notifications by actionability and state, with completed items de-emphasized. | User can distinguish “needs action” from historical updates. | `v2/desktop/13-dashboard-active-and-completed-notifications.png` | Planned |
| Admin/indexed activity | `v1/desktop/15-admin-indexed-activity.png` | Indexed activity proves persistence but is not part of the participant's core journey. | Retain as operational evidence and keep it out of the primary user navigation where possible. | Product flow remains focused while maintainers can verify indexing health. | `v2/desktop/15-admin-indexed-activity.png` | Planned |
| Version selector | `v1/desktop/16-version-selector-v1-v2.png` | Version navigation establishes the product as a documented case study. | Preserve a compact selector that clearly labels frozen V1 and evolving V2. | Reader can move between releases without confusing the active product version. | `v2/desktop/16-version-selector-v1-v2.png` | Planned |
| Mobile dashboard | `v1/mobile/01-mobile-dashboard-connected.png` | Content stacks correctly, but creation and wallet behavior still inherit desktop-extension assumptions. | Lead with the primary action and embedded balance/account state. | Mobile user can begin creation and understand account state without an extension. | `v2/mobile/01-mobile-dashboard-connected.png` | Planned |
| Mobile creation | `v1/mobile/02-mobile-create-split.png` | The long desktop form becomes a long mobile scroll. | Use the same short staged flow on mobile with persistent step context. | User completes creation without horizontal scrolling or losing the primary action. | `v2/mobile/02-mobile-create-split.png` | Planned |
| Mobile notifications | `v1/mobile/03-mobile-notifications.png` | Overlay can obscure the page and compete with the current task. | Use a mobile sheet/drawer with clear dismissal and task-priority grouping. | Notification view does not trap or obscure the next action. | `v2/mobile/03-mobile-notifications.png` | Planned |
| Payment confirmation | `v1/transaction-proof/01-payment-confirmed-in-split.png` | Confirmation clearly records success and links to proof. | Preserve this trust signal while simplifying the surrounding receipt. | Paid state persists after refresh and View on Stellar opens the matching transaction. | `v2/transaction-proof/01-payment-confirmed-in-split.png` | Planned |
| Stellar proof | `v1/transaction-proof/02-payment-success-stellar-expert.png` | External proof verifies that `pay_share` succeeded. | Continue linking each successful create/pay operation to the correct network transaction. | Transaction hash, network, account, contract call, and amount match the in-app record. | `v2/transaction-proof/02-payment-success-stellar-expert.png` | Planned |

## Evidence still required during V2

- embedded-wallet account creation on desktop
- embedded-wallet account creation on mobile
- returning-user authentication and recovery
- embedded-wallet balance and Testnet funding
- embedded-wallet create signature
- embedded-wallet payment signature
- existing-wallet secondary connection route
- unrelated-wallet denial state
- rejected and interrupted embedded-signing states
- complete mobile payment confirmation

## Capture protocol

- Use the same Split purpose, amount, participant role, and completion state as the V1 comparison where possible.
- Capture desktop at one consistent viewport and mobile at one consistent viewport.
- Remove unrelated tabs, personal information, and browser notifications.
- Keep the V1 and V2 version indicator visible when it helps establish provenance.
- Record the build commit and test wallet role, never a private key or recovery phrase.
- Mark the row complete only after the behavior passes the relevant QA checklist.

