# Split UX Case Study Evidence

This directory preserves the visual evidence used to explain how Split changed
between the initial tested experience (V1) and the feedback-driven redesign
(V2).

The files in `v1/` are renamed copies. The original screenshots in Documents
were not moved, renamed, or deleted.

## Evidence structure

- `v1/desktop/` — desktop product states and complete user flows
- `v1/mobile/` — responsive/mobile product states
- `v1/transaction-proof/` — in-product confirmation and matching on-chain proof
- `v2/` — matching V2 screenshots captured at the same states and viewports
- `user-feedback/` — anonymized quotes, testing notes, and feedback screenshots

## V1 coverage

The current V1 archive documents:

- connected and disconnected dashboards
- wallet address, balance, and disconnect controls
- notifications
- wrong-network recovery guidance
- Testnet onboarding
- empty, completed, and invalid Create Split states
- split creation confirmation
- participant authorization and payment states
- a completed split
- indexed admin activity
- the V1/V2 selector
- responsive dashboard, creation, and notification views
- successful payment confirmation and its matching Stellar Expert transaction

## How to use the evidence in the case study

For every important change, present the evidence in this order:

1. **V1 state** — what the tested experience looked like.
2. **Observed friction** — what happened during testing.
3. **User evidence** — quote, note, or behavior that revealed the problem.
4. **Design decision** — what changed and why.
5. **V2 state** — the matching redesigned screen.
6. **Result** — what became clearer, faster, or safer.

Do not include every screenshot in the published article. Keep the full set as
the research archive, then select the strongest before-and-after pairs for the
story.

## V2 capture rule

Capture the same scenario, user role, data, theme, and approximate viewport as
the corresponding V1 image. Reuse the V1 filenames inside `v2/desktop/` and
`v2/mobile/` wherever possible so comparisons remain obvious.
