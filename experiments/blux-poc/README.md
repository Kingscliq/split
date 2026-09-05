# Split Blux capability proof

This isolated application verifies Blux email onboarding and Stellar Testnet
account behavior before the SDK is introduced into the Split frontend.

It is intentionally a separate package because the current Blux packages and
Split frontend declare incompatible Stellar SDK and Freighter API peer versions.
Do not use `--force` or `--legacy-peer-deps` to install Blux into `frontend/`.

## Run locally

1. Add the public Blux App ID to `.env.local`:

   ```text
   VITE_BLUX_APP_ID=<blux-public-app-id>
   ```

2. In the Blux dashboard, allow the exact origin `http://localhost:3000`.
   `http://127.0.0.1:3000` is a different origin and will be rejected.
3. Enable email as a login method for the Blux application.
4. Run:

   ```bash
   npm install
   npm run dev
   ```

5. Open `http://localhost:3000`.

## First proof checklist

- The SDK reports **Ready**.
- **Continue with email** opens the Blux email modal.
- The returned address is recorded as `G...` or `C...`.
- Logging out and signing in again restores the same address.
- A supported mobile or second-device login restores the same address.
- Testnet XLM funding appears after **Refresh balances**.
- A self-payment passes Blux review, signing, submission and confirmation.
- A real `create_split` call succeeds against the deployed Testnet contract.

The contract proof reads only the public deployed contract and XLM SAC values
from `frontend/.env.local`. It does not read or expose server-side secrets.

Do not enter an App Secret, private key, recovery phrase, or production funds
into this proof.
