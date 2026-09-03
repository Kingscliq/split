# Split V2 UX Decision Log

This log records why V2 changes are made. Update it when a decision is accepted,
reversed, or materially refined. Evidence should point to repository files or
anonymized research notes.

## Decision template

### D-XXX — Decision title

- **Status:** Proposed, accepted, superseded, or rejected
- **Date:** YYYY-MM-DD
- **Problem:** What needs to be resolved
- **Evidence:** Screenshots, observations, or feedback supporting the problem
- **Decision:** What V2 will do
- **Why:** Why this direction was selected
- **Consequences:** Product, technical, security, or QA implications
- **Validation:** How the decision will be tested

## Accepted decisions

### D-001 — Preserve V1 as the evidence baseline

- **Status:** Accepted
- **Date:** 2026-09-03
- **Problem:** The redesign needs an honest, stable before state.
- **Evidence:** `docs/ux-case-study/v1/`
- **Decision:** Keep V1 frozen and use V2 for feedback-driven changes.
- **Why:** A stable baseline supports regression testing and credible before/after documentation.
- **Consequences:** V1 receives no redesign work; critical security corrections must be documented explicitly if ever backported.
- **Validation:** V1 deployment and tag remain accessible, and every major V2 change has traceable V1 evidence.

### D-002 — Make embedded wallet a V2 release requirement

- **Status:** Accepted
- **Date:** 2026-09-03
- **Problem:** Browser-extension setup and mobile extension limitations interrupt the payment task for new users.
- **Evidence:** V1 onboarding, wrong-network, and mobile captures; moderated testing observations.
- **Decision:** Embedded wallet is the default new-user route in V2. Existing-wallet connection remains secondary.
- **Why:** Split should manage onboarding, signing, recovery, and cross-device continuity in familiar product language.
- **Consequences:** A provider/custody architecture spike and security review are release blockers. Mobile QA expands to the complete transactional flow.
- **Validation:** A new mobile user can onboard, fund, create or pay, return on another device, and recover from interrupted signing without installing Freighter.

### D-003 — Keep address primary during entry and name primary during scanning

- **Status:** Accepted
- **Date:** 2026-09-03
- **Problem:** Wallet address determines payment authorization, but long addresses make participant lists difficult to understand.
- **Evidence:** V1 participant-entry and Split-status captures; participant-label feedback.
- **Decision:** Address is the primary validated field during participant entry. Display name becomes the primary visual label in review and receipt views, with shortened address available for verification.
- **Why:** This separates transaction correctness from human recognition instead of sacrificing either.
- **Consequences:** Review UI must expose exact addresses; status UI must retain a copy/view-full-address control.
- **Validation:** Creator detects invalid or duplicate addresses and can identify paid/pending people without comparing address strings.

### D-004 — Gate Split presentation by viewer relationship

- **Status:** Accepted
- **Date:** 2026-09-03
- **Problem:** Creator, assigned participant, disconnected visitor, and unrelated wallet states can be confused.
- **Evidence:** `v1/desktop/10-creator-view-active-split-not-assigned.png` and participant-state captures.
- **Decision:** Creator and assigned participants can view the Split UI. A disconnected visitor must authenticate. An unrelated wallet sees no private Split presentation and receives a Create a Split action.
- **Why:** The interface should disclose only what the current product identity needs, while recognizing that contract data remains publicly inspectable.
- **Consequences:** Access checks must be consistent across server/client states and must never be described as on-chain privacy.
- **Validation:** Three-wallet QA proves creator access, participant access/payment, and unrelated-wallet denial.

### D-005 — Lead with the payment action

- **Status:** Accepted
- **Date:** 2026-09-03
- **Problem:** Setup and system information can appear before users understand what Split helps them do.
- **Evidence:** Disconnected dashboard and comparative product review.
- **Decision:** Create a Split is the primary entry action; onboarding appears in context when identity or signing is needed.
- **Why:** Users should understand and begin their goal before handling infrastructure.
- **Consequences:** Creation must support a pre-authentication stage without implying that a Split exists before signing.
- **Validation:** First-time users identify the primary action and understand the task without moderator guidance.

### D-006 — Present Split details as a receipt

- **Status:** Accepted
- **Date:** 2026-09-03
- **Problem:** Purpose, group status, personal amount, balance, and proof are distributed across competing panels.
- **Evidence:** V1 pending and completed Split captures; review of familiar payment-product patterns.
- **Decision:** V2 uses a receipt hierarchy: purpose/status, money summary, viewer relationship, next action, people/status, sharing, then proof.
- **Why:** A receipt matches how users already verify payment requests and completed transactions.
- **Consequences:** Technical details move lower in the hierarchy but remain accessible.
- **Validation:** Participant can state purpose, amount owed, status, and next action after viewing one screen.

### D-007 — Pair V1 and V2 evidence by scenario

- **Status:** Accepted
- **Date:** 2026-09-03
- **Problem:** Unstructured screenshots do not prove why or whether a redesign improved the experience.
- **Evidence:** Current V1 archive and case-study goals.
- **Decision:** Capture matching V2 scenarios using consistent roles, data, and viewports, and map each change to feedback and acceptance criteria.
- **Why:** Paired evidence supports QA, product reasoning, and the published case study.
- **Consequences:** Screenshot capture is part of the definition of done for each workstream.
- **Validation:** Each completed row in `BEFORE_AFTER_MAP.md` links a passed behavior to both V1 and V2 evidence.

## Open architecture decisions

Create a new numbered decision entry after the embedded-wallet spike for:

- provider selection
- custody model
- authentication methods
- recovery and account portability
- session duration and logout behavior
- transaction-policy and confirmation design
- data retention and deletion behavior

