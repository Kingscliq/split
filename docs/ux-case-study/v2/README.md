# Split V2 comparison and testing captures

Captured by Kingsley on 3 October 2026. Original Documents screenshots are preserved unchanged. See capture-manifest.json for source filenames and intrinsic dimensions.

## Desktop interface captures

Creation entry, participant input, creation review, transaction approval, authentication options, account menu, notifications and signing-in-progress are recorded under desktop/. These demonstrate interface states, not a completed payment or a confirmed V2 creation transaction. Captures include both public deployment and local testing environments; the browser address bar indicates the environment where present.

## Open testing findings

- Blux signing: the sign-transaction request returns HTTP 400; captured response reports an XDR decoding failure through SorobanTransactionData/ExtensionPoint and an invalid switch value 1. The UI shows transaction stopped. Root cause is not confirmed by these screenshots.
- Passkey sign-in: the local UI reports that sign-in could not be completed. This is a separate observed failure; its cause is unconfirmed.
- Stellar SDK: the editor shows a toXDR deprecation warning recommending toXdr. This is a warning, not evidence that it caused the signing failure.
- Provider support: a saved user-authored report records the failure and an attempted SDK/function-call update. No provider response or resolution is shown. Keep this screenshot as reference rather than a public product visual.

The September isolated Testnet proof remains historical evidence. It does not establish that the current October integration passes.

## Still needed

- Successful V2 creation and matching confirmed transaction receipt
- Assigned participant payment screen and confirmed payment receipt
- Cross-wallet create/pay/close regression
- Same-wallet recovery after logout and on another device
- Mobile flows and repeatable rejected/interrupted signing tests

No success state should be inferred from signing-in-progress or from notification entries for other collections. Do not use balances, participants or collection counts as adoption metrics.

## Protocol compatibility follow-up

Kingsley reports that signing rejects SorobanTransactionData.ext = 1 and asks whether the backend SDK/XDR definitions support Protocol 23 and later. Current official Stellar transaction XDR includes extension variants 0 and 1. The captured use of the older ExtensionPoint decoder is consistent with outdated definitions, but provider backend code/dependency versions are not accessible here. This remains a hypothesis requiring provider confirmation, a minimal failing XDR reproduction and a successful repeat of the same create/sign flow. Do not remove or rewrite the extension data merely to satisfy a stale parser.

Reference: https://github.com/stellar/stellar-xdr/blob/main/Stellar-transaction.x

## Later captures — 3 October, 17:03–17:08

Three additional screenshots show waiting for creation confirmation, Split #21 with a creation-confirmed banner, and the assigned participant's pending share with Pay your share. The creator view shows zero collected and zero of one paid: creation confirmation is not payment confirmation. The UI reports confirmation on Stellar Testnet; the full transaction hash was not supplied for independent Explorer verification. Earlier signing errors are preserved as historical test findings. No provider response, exact fix, full cross-wallet regression or completed payment is established by these captures.

## Pay-a-share captures — 3 October, 17:09–17:20

Six new originals bring the archive to 24 captures. They record a payment entry view, account-entry-missing errors for Splits #21 and #22, wrong-account gating, payment awaiting confirmation, and the successful payment state for Split #22. The final capture reports Payment confirmed, Completed, 300 XLM collected, zero remaining, and one of one paid. This is a Testnet example, not a user or traction metric. The payment-confirmed image replaces the portfolio/Notion receipt placeholder.

Split #21 (Vacation to bar beach, 200 XLM) is the creation/pending example. Split #22 (Trip to Abuja, 300 XLM) is the paid example. Do not present them as one uninterrupted transaction. Browser chrome indicates earlier deployed and later local testing environments; the final receipt is supplied user evidence. No full transaction hash was provided for independent chain verification. Screenshots establish the recorded UI states, not full regression or recovery coverage.
