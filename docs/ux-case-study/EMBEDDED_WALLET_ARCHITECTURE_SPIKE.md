# Split V2 Embedded Wallet Architecture Spike

Status: Testnet capability proven; provider-neutral V2 integration implemented locally  
Date: 2026-09-04  
Scope: Wallet onboarding, authentication, signing, recovery, and external-wallet coexistence

## 1. Decision summary

V2 will add a user-owned embedded wallet as the default onboarding path while
retaining Freighter as a secondary existing-wallet option.

The selected Testnet candidate is **Blux**, integrated behind a Split-owned
wallet adapter. Blux is the strongest product and technical fit currently
documented because it is Stellar-specific and combines:

- email, social, passkey, and existing-wallet login methods
- React and Next.js support
- Testnet network configuration
- Stellar balance and transaction helpers
- Soroban contract writes
- raw XDR transaction signing without forced submission
- Soroban authorization-entry signing

This selection is conditional rather than a Mainnet approval. Blux's public
documentation does not currently provide enough detail about embedded-wallet
key custody, recovery, export, account deletion, or pricing. Those answers and
a working Split transaction proof are release gates.

If Blux does not satisfy the security and portability gates, the fallback is
**Privy user-owned Stellar wallets**. Privy documents self-custodial user
wallets, recovery, key export, Stellar wallet creation, and raw-hash signing,
but its Stellar integration would require Split to attach an Ed25519 signature
to the prepared Stellar transaction instead of receiving a signed XDR.

The native **Stellar Passkey Kit** remains a future architecture option rather
than the first V2 implementation. It offers open-source passkey smart wallets
and sponsored transactions, but it changes the account model from a classic
`G...` account to a contract `C...` account and therefore requires a larger
source-account, authorization, recovery, relayer, and QA redesign.

## 2. Product outcome

A new-to-Web3 user should be able to:

1. Choose **Continue with email** from inside Split.
2. Verify the email and receive a Stellar Testnet wallet without installing an extension.
3. See the wallet address and Testnet balances in familiar account language.
4. Receive Testnet funding.
5. Review and approve a Create Split or Pay transaction inside the product flow.
6. Return later on desktop or mobile and regain access to the same wallet.
7. Log out without deleting the wallet or moving its funds.

An experienced user should be able to choose **Use an existing Stellar wallet**
and continue through the existing Freighter path.

## 3. Current-state findings

V1 is directly coupled to Freighter in two places:

- `frontend/contexts/WalletContext.tsx` owns Freighter connection, address,
  network detection, disconnect state, and wallet-change polling.
- `frontend/lib/split-contract.ts` imports Freighter's `signTransaction`
  directly inside the transaction build/simulate/sign/submit/poll pipeline.

The Soroban contract accepts `Address` values and calls `require_auth()` for
the creator and payer. The deployed V1 transaction client nevertheless assumes
that the active wallet is also a funded classic `G...` source account whose
sequence number can be loaded before signing.

That assumption is compatible with a classic embedded Stellar account. It is
not directly compatible with a passkey smart wallet whose identity is a `C...`
contract and whose transaction envelope is sourced and fee-paid by a relayer.

The first package-resolution check found that Blux React `0.3.3` resolves to
Blux Core `0.3.4`, whose peers require Stellar SDK `^17.0.1` and Freighter API
`^5.0.0`. The isolated proof succeeded with that exact combination. V2 then
migrated the frontend to the compatible versions without `--force` or
`--legacy-peer-deps`; lint, TypeScript, and the production build pass. The
Freighter adapter still requires a full regression run before release.

## 4. Provider comparison

| Option                   | Stellar/Soroban fit                                                                                | UX and recovery                                                                                                 | Integration cost                                                                          | Main risk                                                                             | Decision                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Blux                     | Native Stellar SDK; Testnet; signed XDR; Soroban writes and auth entries; existing Stellar wallets | Email, SMS, social, passkey, and wallet login are documented; custody/recovery/export details must be confirmed | Low to medium                                                                             | Security, portability, and pricing details are not public enough                      | Primary Testnet candidate                                     |
| Privy                    | Stellar is a Tier 2 chain; creates Stellar wallets and signs raw hashes                            | User-owned model, new-device recovery, MFA, and export are documented                                           | Medium; Split must assemble the Stellar signature and retain a separate Freighter adapter | More chain-specific signing code and no unified Stellar external-wallet flow          | Fallback                                                      |
| Stellar Passkey Kit      | Native Soroban contract wallet; arbitrary auth; sponsored submission                               | Excellent extension-free passkey UX; recovery and multi-device signer policy must be designed by Split          | High                                                                                      | Changes account type, source account, relayer, discovery, and recovery architecture   | Later V2 experiment, not first release                        |
| Dfns                     | Stellar XDR signing and broadcasting are documented                                                | Enterprise wallet-as-a-service with MPC and account recovery controls                                           | High                                                                                      | Enterprise operational model and pricing are disproportionate to this Testnet release | Rejected for V2                                               |
| Stellar Wallets Kit only | Strong multi-wallet connection for existing wallets                                                | Does not itself create an embedded wallet for a new user                                                        | Low                                                                                       | Does not solve the no-extension onboarding requirement                                | Useful external-wallet alternative, not the embedded solution |

## 5. Required custody and control model

Split's required model is **user-owned and non-custodial**:

- Split must never receive, store, log, or reconstruct a user's private key.
- The wallet provider must not allow Split's backend to sign unilaterally.
- Every Create Split, Pay Share, and Close Split transaction requires an explicit
  user approval in the active session.
- Recovery must restore the user's existing wallet, not silently create a new address.
- The user must have a documented portability or export path before Mainnet.
- Provider application secrets must remain server-side and out of browser bundles.

The selected provider must explain which party controls each key share, whether
any operator can sign alone, where signing occurs, and what happens if the
provider or Split becomes unavailable.

## 6. Authentication and recovery decision

The first V2 Testnet presentation should remain deliberately small:

1. **Continue with email** — default embedded route.
2. **Continue with Google** — secondary familiar route.
3. **Use an existing Stellar wallet** — secondary Web3 route.

Passkey login should be enabled only after the proof confirms whether it links
to the same wallet as email/social login, how it behaves across devices, and
how a lost authenticator is recovered. It must not accidentally create a second
wallet for the same person.

Recovery acceptance criteria:

- A returning user gets the same Stellar address after signing in again.
- A supported second device can restore the same wallet through an explicit flow.
- Losing one authentication factor does not silently transfer control to Split.
- Recovery and export require recent authentication and an additional factor
  where supported.
- The UI clearly distinguishes log out, disconnect, recover, export, and delete.

## 7. Session and logout behavior

- Authentication may persist between visits, but a financial action must always
  show a review state and request wallet approval.
- The UI must lock the account after the provider session expires and preserve
  the unsigned form data where safe.
- Logging out clears Split's in-memory wallet state, cached balances, provider
  session, and wallet-specific UI data.
- Logging out does not delete the wallet and does not change on-chain ownership.
- Switching identity invalidates wallet-specific queries before rendering the
  next user's Split data.
- Export, recovery changes, or account deletion require fresh authentication.

Exact session duration remains a provider-dashboard configuration to verify in
the proof. Split must not inherit a long default without reviewing it.

## 8. Split-owned wallet adapter

The product must not import a provider SDK throughout the UI or contract client.
Introduce a narrow adapter boundary:

```ts
type WalletMode = "embedded" | "external";
type WalletAccountType = "classic" | "contract";

type WalletSession = {
  address: string;
  mode: WalletMode;
  accountType: WalletAccountType;
  provider: "blux" | "freighter";
  networkPassphrase: string;
};

interface WalletAdapter {
  connect(): Promise<WalletSession>;
  disconnect(): Promise<void>;
  getSession(): Promise<WalletSession | null>;
  signTransaction(xdr: string, networkPassphrase: string): Promise<string>;
  subscribe(listener: (session: WalletSession | null) => void): () => void;
}
```

Responsibilities stay separated:

- **Wallet adapter:** identity, session, network, approval, and signature.
- **Split transaction service:** validate intent, build the contract call,
  simulate, prepare, request a signature, submit, poll, and normalize failures.
- **Wallet context:** expose provider-neutral session and balance state to React.
- **UI:** show preparing, awaiting approval, submitting, confirming, success,
  rejection, expiry, and failure states.

For the first milestone, keep two implementations:

- `BluxWalletAdapter` for embedded accounts.
- `FreighterWalletAdapter` wrapping the proven V1 behavior.

Use Blux's raw `signTransaction` result with Split's existing prepared-XDR and
RPC submission flow. Do not replace the contract domain layer with provider
hooks during the proof; this reduces lock-in and preserves the tested
simulate/sign/submit/poll lifecycle.

## 9. Transaction safety model

Before requesting a signature, Split must verify and display:

- Testnet network passphrase
- configured Split contract ID
- allowed function: `create_split`, `pay_share`, or `close_split`
- active wallet address and role
- title, asset, amount, and participant addresses relevant to the action

The client must continue to simulate before signing. It must never accept an
arbitrary unsigned XDR from a URL, database row, or remote response and pass it
directly to the wallet.

The transaction state machine remains:

1. validating
2. preparing and simulating
3. waiting for user approval
4. submitting
5. confirming
6. success or actionable failure

Rejected and interrupted approvals must not appear as failed on-chain payments
or optimistic paid states.

## 10. Data handling

Split should store the minimum provider data required to associate an app
session with a public wallet:

- provider user identifier, if required
- public Stellar address
- provider type and account type
- timestamps needed for support and security auditing

Do not copy provider access tokens, recovery material, private keys, raw OTPs,
or authentication secrets into Supabase.

Email and social profile data should remain with the authentication provider
unless a separate product requirement justifies storing it. Account deletion
must remove deletable off-chain profile and session data while explaining that
existing Stellar transactions and contract state cannot be erased.

## 11. Proof-of-capability plan

Create a short-lived implementation branch before redesigning the interface.
The proof is successful only if all items below pass against the deployed Split
Testnet contract:

### Provider and address

- Create one embedded user with email.
- Confirm whether the returned address is `G...` or `C...`.
- Confirm the same user returns to the same address after logout/login.
- Confirm a second supported device can restore the same address.
- Confirm the provider's custody, recovery, export, deletion, and pricing answers.

### Funding and reads

- Fund the embedded Testnet account.
- Read XLM and USDC balances through Split's existing balance service.
- Refresh and verify that newly funded balances appear.

### Contract writes

- Create a Split with the embedded account.
- Connect Freighter as an assigned participant and pay the share.
- Create a second Split with Freighter and pay it with the embedded account.
- Verify both create and pay transactions on Stellar Expert.
- Confirm the cron indexer records both providers' events without changes.

### Failure and mobile cases

- Reject signing.
- Let an approval expire or interrupt it.
- Try insufficient XLM and insufficient asset balance.
- Refresh during confirmation and recover the final state.
- Complete onboarding and one payment in a supported mobile browser.
- Log out and confirm private wallet-specific UI disappears.

## 12. Go/no-go gates

Blux is approved for V2 implementation only if:

- the embedded wallet is user-owned and Split cannot sign unilaterally
- a stable classic Stellar address works with the existing Split transaction flow
- email login restores the same wallet on desktop and mobile
- recovery and wallet export/portability are documented and testable
- `create_split` and `pay_share` succeed through returned signed XDR
- Testnet limits and expected V2 pricing are acceptable
- provider account deletion and personal-data handling are documented
- SDK maintenance and support channels are active

If any custody, unilateral-signing, recovery, or portability gate fails, stop
the Blux integration and run the same proof with Privy user-owned Stellar
wallets. Convenience does not override user control.

If the embedded address is a contract `C...` account, do not force it into the
classic-account adapter. Re-scope the work around Passkey Kit/contract-account
authorization and sponsored submission.

## 13. Full implementation plan

This work is deliberately split into a disposable capability proof and the
actual V2 integration. Split must not redesign its primary experience around a
provider until the provider can complete real Split transactions safely.

### Phase 0: provider due diligence and project setup

1. Create a separate Blux Testnet application for the capability proof.
2. Register the localhost and Vercel preview origins.
3. Enable only email and wallet login initially. Add Google only after email
   identity restoration has passed, and do not enable passkeys until account
   linking and recovery behavior are understood.
4. Record the public App ID in `frontend/.env.example` and the real value only
   in local and Vercel environment settings.
5. Keep any Blux App Secret server-side. It must never use a `NEXT_PUBLIC_`
   prefix or enter browser code.
6. Obtain written answers to the provider questions in section 14.

Exit criteria:

- the Testnet app opens only from allowed origins
- the App ID works without exposing an App Secret
- account type, custody, recovery, export, deletion, and Testnet pricing are known

### Phase 1: isolated capability proof

Build a small internal-only route or disposable branch before changing the V2
screens. It should use Blux's own modal and the minimum Split code necessary to
prove compatibility.

1. Create an isolated proof package and install pinned, mutually compatible
   versions of `@bluxcc/react`, `@bluxcc/core`, Stellar SDK, and Freighter API.
   Do not alter Split's working frontend dependency versions for this proof.
2. Add `BluxProvider` inside a client-side provider boundary beneath the root
   layout and configure only Stellar Testnet.
3. Authenticate a new user by email and record the returned wallet address and
   whether it is a classic `G...` or contract `C...` account.
4. Log out, log in again, and confirm that the same email restores the same address.
5. Repeat restoration in a supported mobile browser and on a second device.
6. Fund the address with Testnet XLM and read its balance.
7. Prepare and simulate a real `create_split` transaction using Split's existing
   transaction service.
8. Ask Blux to sign the prepared XDR, submit it through Split's existing RPC
   client, poll confirmation, and verify it on Stellar Expert.
9. Repeat with `pay_share` in both directions:
   - embedded creator and Freighter participant
   - Freighter creator and embedded participant
10. Confirm that the existing Supabase indexer records every resulting event.
11. Test rejection, timeout, insufficient funds, refresh during confirmation,
    logout, and returning-session behavior.

Exit criteria:

- every go/no-go gate in section 12 passes
- Blux provides a supported dependency path compatible with Split, or the
  adapter can be integrated without duplicate or conflicting Stellar SDK types
- the existing contract needs no unsafe compatibility workaround
- both wallet types can create and pay the same Split
- no private key, token, OTP, or provider secret reaches Split logs or Supabase

If the address is `C...`, stop this implementation path. A contract-account
architecture using authorization entries and sponsored submission must be
designed instead of treating the wallet as a classic transaction signer.

### Phase 2: provider-neutral wallet foundation

1. Create provider-neutral session, issue, and signer types.
2. Move Freighter-specific calls out of `WalletContext.tsx` into
   `FreighterWalletAdapter`.
3. Move the direct Freighter `signTransaction` import out of
   `split-contract.ts`.
4. Make the transaction service accept the active adapter or signer as an
   argument while retaining its existing validation, simulation, submission,
   polling, and error normalization.
5. Add `BluxWalletAdapter` to translate Blux session and signing results into
   the same Split-owned types.
6. Let `WalletContext` expose one active session at a time, including provider,
   address, account type, authentication state, and balances.
7. Clear wallet-scoped queries and notifications whenever the active identity
   changes.

Exit criteria:

- pages no longer import provider SDKs directly
- `split-contract.ts` does not import Freighter
- all V1 Freighter regression tests still pass
- changing adapters cannot briefly display the previous user's private UI state

### Phase 3: action-first authentication experience

1. Replace generic **Connect wallet** language with **Continue** at the point
   where identity becomes necessary.
2. Present two clear choices:
   - **Continue with email** — recommended for new users
   - **Use an existing Stellar wallet** — for Freighter and other supported wallets
3. Let users explore the empty Create Split form before authentication; preserve
   valid form state while the login modal is open.
4. After successful login, return users to the action they started instead of
   redirecting them to a generic dashboard.
5. Show a short account-ready state containing the friendly login identity,
   shortened public address, Testnet label, and balance.
6. Keep blockchain terminology behind optional help where it is not required
   for the decision at hand.

Exit criteria:

- a beginner can start creating before learning wallet terminology
- dismissing login does not erase the form or falsely advance the action
- external-wallet users can deliberately choose their existing wallet

### Phase 4: transaction approval experience

Use the same product-owned state machine for embedded and external wallets:

1. **Review** — show purpose, asset, total, participant count, active account,
   and the exact action being authorized.
2. **Preparing** — validate and simulate against Testnet.
3. **Approve** — open the Blux or external-wallet confirmation experience.
4. **Submitting** — disable duplicate submission and send the signed XDR.
5. **Confirming** — poll Stellar and retain the transaction hash across refresh.
6. **Success** — show the Split result and Stellar Expert proof.
7. **Recoverable failure** — explain rejection, timeout, insufficient funds,
   wrong network, RPC failure, or on-chain failure beside the initiating action.

The UI must never label a transaction successful before Stellar confirms it.

### Phase 5: account, balance, logout, and recovery UX

1. Keep the existing at-a-glance XLM and USDC balances on the dashboard.
2. Make the wallet menu provider-neutral and show login method, shortened
   address, Testnet, balances, copy-address, and logout/disconnect.
3. For embedded accounts, label the action **Log out** and explain that the
   wallet and funds remain available after signing in again.
4. For external wallets, label it **Disconnect wallet**.
5. Link recovery/export controls only when the provider behavior is documented
   and verified; do not create misleading Split-owned recovery controls.
6. Require recent authentication before sensitive account-management actions.

### Phase 6: privacy and authorization integration

1. Treat the active embedded or external address identically when deciding
   whether the viewer is the creator, an assigned participant, or unrelated.
2. Do not reveal the private Split presentation while authentication is unresolved.
3. After identity resolution, load wallet-specific Split history and notifications.
4. On logout or identity switch, cancel or invalidate outstanding wallet-scoped
   reads before rendering the next state.

### Phase 7: rollout and release

1. Put the embedded route behind a V2-only feature flag.
2. Deploy it first to a Vercel preview environment with the preview origin
   allowlisted in Blux.
3. Run the complete test matrix in section 17.
4. Invite a small group of existing testers and compare completion with V1.
5. Monitor authentication failures, abandoned approvals, signing errors, RPC
   failures, and successful completions without logging sensitive data.
6. Capture paired V1/V2 screenshots and session observations for the case study.
7. Promote to the V2 production URL only after the release gates pass.

Rollback consists of disabling the V2 embedded-wallet feature flag. Because
Freighter remains behind the same adapter boundary, users retain a working
external-wallet route while provider issues are investigated.

## 14. Provider questions that require written answers

1. Does an email/social/passkey user receive a classic `G...` Stellar account or
   a smart-contract `C...` account?
2. Where is key material created and reconstructed, and can Blux sign without
   the authenticated user's approval?
3. How does the same user recover the same wallet on a new or lost device?
4. Can the user export the Stellar secret/key, and in what format?
5. Can email, Google, and passkey methods be linked to one identity and wallet?
6. What exactly does logout revoke, and what is the default session lifetime?
7. How are a user and their off-chain personal data deleted?
8. What are the Testnet, MAU, signing, and production pricing limits?
9. Are allowed origins, MFA, audit logs, and webhook signature verification available?
10. Which SDK/API stability and incident-support commitments apply?
11. Which Blux release supports Freighter API 6, and is a peer-compatible
    Stellar SDK migration path documented for an existing SDK 16 application?

## 15. Primary sources reviewed

- [Stellar wallet integration directory](https://developers.stellar.org/docs/tools/developer-tools/wallets)
- [Blux introduction and quick start](https://docs.blux.cc/)
- [Blux getting started](https://docs.blux.cc/getting-started)
- [Blux sign transaction](https://docs.blux.cc/react/usage/sign-transaction)
- [Blux Soroban contract writes](https://docs.blux.cc/react/hooks/use-write-contract)
- [Blux network configuration](https://docs.blux.cc/configuration/networks)
- [Privy embedded-wallet overview](https://docs.privy.io/wallets/overview/embedded)
- [Privy chain support](https://docs.privy.io/wallets/overview/chains)
- [Privy other-chain signing](https://docs.privy.io/wallets/using-wallets/other-chains)
- [Privy new-device recovery](https://docs.privy.io/wallets/advanced-topics/new-devices/overview)
- [Privy wallet export](https://docs.privy.io/wallets/wallets/export)
- [Stellar smart-wallet guidance](https://developers.stellar.org/docs/build/guides/contract-accounts/smart-wallets)
- [Stellar Passkey Kit](https://github.com/stellar/passkey-kit)
- [Dfns Stellar transaction reference](https://docs.dfns.co/api-reference/broadcast/stellar)

## 16. Intended user flows

### 16.1 New creator using email

1. User opens Split and selects **Create a split**.
2. User enters the purpose, amount, and participant information without first
   being asked to install a wallet.
3. User selects **Review split**.
4. Split says an account is needed to create and track the Split and recommends
   **Continue with email**.
5. User enters an email and completes the Blux one-time-code flow.
6. The same browser returns to the populated review screen with a Testnet wallet ready.
7. If the account is unfunded, Split offers the verified Testnet funding action
   and refreshes the balance after funding.
8. User reviews the exact Split transaction and approves it through Blux.
9. Split shows preparing, submitting, and confirming states.
10. On confirmation, the user sees the share link, WhatsApp action, status, and
    optional Stellar Expert proof.

### 16.2 New participant opening a shared link on mobile

1. Participant opens the shared link in a normal mobile browser.
2. Before authentication, Split explains that sign-in is required to confirm
   whether the request belongs to them; it does not expose the private Split view.
3. Participant selects **Continue with email** and authenticates.
4. If that wallet is assigned, Split displays a receipt-like view with purpose,
   amount owed, status, available balance, and **Pay share**.
5. If Testnet funds are missing, Split guides funding and refreshes the balance.
6. Participant reviews and approves the payment inside the browser.
7. Split confirms the transaction, marks the participant paid, and makes
   on-chain proof available.

### 16.3 Existing Stellar user

1. User selects **Use an existing Stellar wallet**.
2. The Blux wallet chooser or Split's retained Freighter adapter presents only
   wallets that support the required Stellar and Soroban capabilities.
3. The selected account and Testnet network are verified.
4. The user returns to the exact create or payment action already in progress.
5. All review, submission, confirmation, status, and proof screens match the
   embedded flow; only the approval surface differs.

### 16.4 Returning embedded-wallet user

1. A valid provider session restores the same public address automatically.
2. If the session expired, Split asks the user to continue with the same login
   method without creating a new wallet.
3. After authentication, dashboard balances, relevant Splits, and notifications load.
4. Financial actions still require an explicit review and approval.

### 16.5 Unrelated user

1. User opens a shared Split link and authenticates.
2. Split compares the active address with the creator and participant addresses.
3. If there is no match, Split shows **This Split is not assigned to this
   account** and a **Create your own split** action.
4. Participant details and payment controls remain hidden.

### 16.6 Logout and wallet switching

1. Embedded user chooses **Log out**; external-wallet user chooses **Disconnect wallet**.
2. Split clears the active session, balances, wallet-specific Split results,
   notifications, and pending unsigned actions.
3. On the next login, Split confirms the selected account before revealing
   wallet-specific content.

## 17. Test and acceptance matrix

### Authentication and identity

- email creates an account without an extension
- repeated email login restores the same address
- supported second-device recovery restores the same address
- cancelling email verification leaves the original task intact
- expired and invalid codes show recoverable errors
- switching users never flashes the previous user's data

### Wallet coexistence

- embedded creator can assign and receive payment from a Freighter participant
- Freighter creator can assign and receive payment from an embedded participant
- disconnect and logout use distinct language and behavior
- wrong-network external wallets receive Testnet instructions

### Create, pay, and close

- embedded and Freighter users can each create a Split
- embedded and Freighter assigned participants can each pay
- only the creator can close an active Split
- every action is simulated before approval
- approval rejection, interruption, and duplicate clicks produce no false state
- confirmation survives refresh and resolves to the correct on-chain result

### Funds and fees

- XLM and USDC balances load and refresh
- unfunded account receives a clear Testnet funding path
- insufficient asset and fee balances are distinguished
- balance refreshes after funding and payment

### Authorization and privacy

- creator and assigned participant see the correct role-based presentation
- unrelated wallet cannot view participant details or pay
- disconnected visitor does not receive private UI content
- contract data is described honestly as publicly inspectable on-chain

### Mobile and resilience

- email onboarding, funding, creating, paying, and proof work in a supported
  mobile browser without extensions
- no modal, keyboard, or long address causes horizontal overflow
- closing or backgrounding the browser during approval has a recoverable state
- Blux outage leaves the external-wallet route available through the feature flag

### Indexer and evidence

- Blux and Freighter transactions both enter `split_events`
- dashboard and notification state update after the scheduled indexer run
- transaction hash and Stellar Expert link remain available
- matching V1/V2 screenshots and observed usability results are recorded

## 18. Capability proof results — 3 September 2026

Verified against the isolated `experiments/blux-poc` package and the deployed
Stellar Testnet contract:

- email and one-time-code authentication completed successfully
- Blux returned a classic Stellar `G...` account
- refreshing the page restored the authenticated session and the same address
- Friendbot funding was visible through Blux's Testnet balance query
- Blux reviewed, signed, submitted, and confirmed a classic self-payment
- Blux simulated, authorized, submitted, and confirmed `create_split`
- the deployed contract returned Split ID `13`
- the contract proof transaction hash was
  `b7ce00beb45b95cadc42c63e9b467f32bbba504e602f9564b4f3e498f94377cc`

The provider-neutral V2 integration now also includes:

- a Split-owned session and signer interface
- separate Blux and Freighter adapters
- email-first and existing-wallet choices at the point of action
- Split-branded email and one-time-code screens using Blux's headless authentication API
- Split-branded passkey onboarding using Blux's headless WebAuthn flow
- a Split-owned transaction review and lifecycle dialog for Create, Pay, and Close
- headless Blux signing only after explicit approval of locally prepared transaction details
- automatic Blux session restoration after refresh
- provider-specific **Log out** and **Disconnect wallet** behavior
- provider-neutral signing for Create Split, Pay Share, and Close Split
- a client-only Blux boundary compatible with Next.js prerendering
- account restoration states that prevent disconnected-state flicker

Still required before the provider is considered release-ready:

- repeat login on a supported mobile browser or second device
- verify the same email restores the same address after explicit logout
- run embedded-creator/Freighter-participant payment in both directions
- confirm the scheduled indexer records the proof transaction
- test rejection, timeout, insufficient funds, and refresh during confirmation
- run the full Freighter regression flow after the SDK migration
- obtain written answers for custody, recovery, export, deletion, session
  revocation, production licensing, and Mainnet pricing
