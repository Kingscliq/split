import { useState } from "react";
import {
  networks,
  StellarSdk,
  useBalances,
  useBlux,
  writeContract,
} from "@bluxcc/react";

const HORIZON_TESTNET_URL = "https://horizon-testnet.stellar.org";
const STELLAR_EXPERT_TESTNET_URL = "https://stellar.expert/explorer/testnet";
const SPLIT_CONTRACT_ID = import.meta.env.VITE_SPLIT_CONTRACT_ID;
const XLM_TOKEN_CONTRACT = import.meta.env.VITE_XLM_TOKEN_CONTRACT;

function accountType(address?: string) {
  if (address?.startsWith("G")) return "Classic Stellar account (G...)";
  if (address?.startsWith("C")) return "Contract account (C...)";
  return "Unknown until login";
}

function formatError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The Blux request did not complete.";
}

export function App() {
  const {
    isReady,
    isAuthenticated,
    user,
    login,
    logout,
    profile,
    sendTransaction,
  } = useBlux();
  const [actionError, setActionError] = useState<string | null>(null);
  const [transactionState, setTransactionState] = useState<
    "idle" | "preparing" | "approving" | "confirmed"
  >("idle");
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [contractState, setContractState] = useState<
    "idle" | "preparing" | "approving" | "confirmed"
  >("idle");
  const [contractProof, setContractProof] = useState<{
    hash: string;
    splitId: string;
  } | null>(null);
  const balances = useBalances(
    { address: user?.address, network: user?.walletPassphrase },
    { enabled: Boolean(isAuthenticated && user?.address) },
  );
  const balanceRows = balances.data as
    | Array<{ asset_type: string; asset_code?: string; balance: string }>
    | undefined;

  async function handleLogin() {
    setActionError(null);
    try {
      await login();
    } catch (error) {
      setActionError(formatError(error));
    }
  }

  async function copyAddress() {
    if (!user?.address) return;
    await navigator.clipboard.writeText(user.address);
  }

  async function testSigning() {
    if (!user?.address || transactionState !== "idle") return;

    setActionError(null);
    setTransactionHash(null);
    setTransactionState("preparing");

    try {
      const horizon = new StellarSdk.Horizon.Server(HORIZON_TESTNET_URL);
      const account = await horizon.loadAccount(user.address);
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: networks.testnet,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: user.address,
            asset: StellarSdk.Asset.native(),
            amount: "0.0000001",
          }),
        )
        .setTimeout(180)
        .build();

      setTransactionState("approving");
      const result = (await sendTransaction(transaction.toXDR(), {
        network: networks.testnet,
      })) as { hash?: string };

      if (!result?.hash) {
        throw new Error("Blux returned no transaction hash.");
      }

      setTransactionHash(result.hash);
      setTransactionState("confirmed");
      await balances.refetch();
    } catch (error) {
      setTransactionState("idle");
      setActionError(formatError(error));
    }
  }

  async function testSplitContract() {
    if (!user?.address || contractState !== "idle") return;
    if (!SPLIT_CONTRACT_ID || !XLM_TOKEN_CONTRACT) {
      setActionError("The deployed Split contract configuration is unavailable.");
      return;
    }

    setActionError(null);
    setContractProof(null);
    setContractState("preparing");

    try {
      // The proof participant only needs to be a valid public address. Its
      // secret is never retained, displayed or sent anywhere.
      const participantAddress = StellarSdk.Keypair.random().publicKey();
      const participant = StellarSdk.nativeToScVal(
        {
          address: new StellarSdk.Address(participantAddress),
          display_name: "Proof participant",
        },
        { type: { address: ["symbol", null], display_name: ["symbol", null] } },
      );

      setContractState("approving");
      const result = await writeContract(
        {
          address: SPLIT_CONTRACT_ID,
          fn: "create_split",
          args: [
            new StellarSdk.Address(user.address).toScVal(),
            StellarSdk.nativeToScVal("Blux compatibility proof"),
            new StellarSdk.Address(XLM_TOKEN_CONTRACT).toScVal(),
            StellarSdk.nativeToScVal(1_000_000n, { type: "i128" }),
            StellarSdk.nativeToScVal(1_000_000n, { type: "i128" }),
            StellarSdk.xdr.ScVal.scvVec([participant]),
          ],
        },
        { network: networks.testnet },
      );
      const splitId = await result.returnValue();

      setContractProof({ hash: result.hash, splitId: String(splitId) });
      setContractState("confirmed");
      await balances.refetch();
    } catch (error) {
      setContractState("idle");
      setActionError(formatError(error));
    }
  }

  return (
    <main className="proof-shell">
      <section className="proof-card">
        <p className="eyebrow">Split V2 · isolated capability proof</p>
        <h1>Verify Blux before changing Split</h1>
        <p className="intro">
          This page tests email authentication, the returned Stellar account
          type, session restoration and Testnet balance reads. It does not use
          Split production data.
        </p>

        <dl className="status-grid">
          <div>
            <dt>SDK</dt>
            <dd>{isReady ? "Ready" : "Initializing"}</dd>
          </div>
          <div>
            <dt>Session</dt>
            <dd>{isAuthenticated ? "Authenticated" : "Signed out"}</dd>
          </div>
          <div>
            <dt>Login method</dt>
            <dd>{user?.authMethod ?? "Email only"}</dd>
          </div>
          <div>
            <dt>Account type</dt>
            <dd>{accountType(user?.address)}</dd>
          </div>
        </dl>

        {user ? (
          <section className="account-panel" aria-label="Authenticated account">
            <p className="label">Public Testnet address</p>
            <code>{user.address}</code>
            <div className="actions">
              <button type="button" onClick={() => void copyAddress()}>
                Copy address
              </button>
              <button type="button" onClick={profile}>
                Open Blux profile
              </button>
              <button type="button" className="secondary" onClick={logout}>
                Log out
              </button>
            </div>
          </section>
        ) : (
          <button
            type="button"
            className="primary"
            onClick={() => void handleLogin()}
            disabled={!isReady}
          >
            {isReady ? "Continue with email" : "Preparing secure login…"}
          </button>
        )}

        {isAuthenticated && (
          <section className="balance-panel" aria-live="polite">
            <div>
              <p className="label">Testnet balance diagnostic</p>
              {balances.isPending && <p>Loading balances…</p>}
              {balances.error && (
                <p className="error">{balances.error.message}</p>
              )}
              {balanceRows && (
                <ul>
                  {balanceRows.map((balance, index) => (
                    <li key={`${balance.asset_type}-${index}`}>
                      <span>
                        {balance.asset_type === "native"
                          ? "XLM"
                          : balance.asset_code}
                      </span>
                      <strong>{balance.balance}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={() => void balances.refetch()}
              disabled={balances.isFetching}
            >
              {balances.isFetching ? "Refreshing…" : "Refresh balances"}
            </button>
          </section>
        )}

        {isAuthenticated && user && (
          <section className="account-panel" aria-label="Transaction signing proof">
            <p className="label">Testnet signing diagnostic</p>
            <p>
              Send 0.0000001 XLM back to this same account. This uses only free
              Testnet funds and proves that Blux can approve, sign and submit a
              Stellar transaction.
            </p>
            <div className="actions">
              <button
                type="button"
                onClick={() => void testSigning()}
                disabled={transactionState !== "idle"}
              >
                {transactionState === "preparing"
                  ? "Preparing transaction…"
                  : transactionState === "approving"
                    ? "Complete approval in Blux…"
                    : transactionState === "confirmed"
                      ? "Signing test confirmed"
                      : "Test transaction signing"}
              </button>
              {transactionHash && (
                <a
                  href={`${STELLAR_EXPERT_TESTNET_URL}/tx/${transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View proof on Stellar Expert
                </a>
              )}
            </div>
          </section>
        )}

        {isAuthenticated && user && (
          <section className="account-panel" aria-label="Split contract proof">
            <p className="label">Deployed Split contract diagnostic</p>
            <p>
              Create a 0.1 XLM compatibility Split with a generated Testnet
              participant. This verifies Soroban simulation, embedded-wallet
              authorization, submission and the contract return value.
            </p>
            <div className="actions">
              <button
                type="button"
                onClick={() => void testSplitContract()}
                disabled={contractState !== "idle"}
              >
                {contractState === "preparing"
                  ? "Preparing Split…"
                  : contractState === "approving"
                    ? "Complete approval in Blux…"
                    : contractState === "confirmed"
                      ? `Created Split #${contractProof?.splitId ?? ""}`
                      : "Test Split contract"}
              </button>
              {contractProof && (
                <a
                  href={`${STELLAR_EXPERT_TESTNET_URL}/tx/${contractProof.hash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View contract proof on Stellar Expert
                </a>
              )}
            </div>
          </section>
        )}

        {actionError && (
          <p className="error" role="alert">
            {actionError}
          </p>
        )}

        <aside>
          <strong>Record after the first login</strong>
          <ol>
            <li>Whether the address begins with G or C.</li>
            <li>Whether logout and email login restore the same address.</li>
            <li>Whether the same address is restored on mobile.</li>
            <li>Whether Testnet funding appears after refreshing balances.</li>
          </ol>
        </aside>
      </section>
    </main>
  );
}
