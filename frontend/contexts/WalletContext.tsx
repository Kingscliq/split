"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { TransactionApprovalDialog } from "@/components/TransactionApprovalDialog";
import { getTokenBalance, TOKEN_CONTRACTS } from "@/lib/split-contract";
import {
  connectBluxWithEmailCode,
  connectBluxWithPasskey,
  connectionFromBlux,
  type BluxBridge,
} from "@/lib/wallet/blux-adapter";
import {
  connectFreighter,
  FREIGHTER_INSTALL_URL,
  normalizeFreighterIssue,
  restoreFreighter,
  watchFreighter,
  type FreighterIssue,
} from "@/lib/wallet/freighter-adapter";
import type {
  WalletConnection,
  WalletProviderId,
  WalletSession,
  WalletSigner,
  TransactionApprovalState,
} from "@/lib/wallet/types";

export { FREIGHTER_INSTALL_URL };
export type WalletIssue = FreighterIssue;

const ACTIVE_PROVIDER_KEY = "split-active-wallet-provider";
const FREIGHTER_DISCONNECTED_KEY = "split-wallet-disconnected";

function storageGet(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // In-memory wallet state remains usable when storage is unavailable.
  }
}

function activeProvider(): WalletProviderId | null {
  const value = storageGet(ACTIVE_PROVIDER_KEY);
  return value === "blux" || value === "freighter" ? value : null;
}

export type WalletBalances = {
  XLM: bigint;
  USDC: bigint;
};

type WalletContextValue = {
  address: string | null;
  session: WalletSession | null;
  signer: WalletSigner;
  provider: WalletProviderId | null;
  restoring: boolean;
  connecting: boolean;
  error: string | null;
  issue: WalletIssue | null;
  balances: WalletBalances | null;
  balanceLoading: boolean;
  balanceError: string | null;
  connect: (onError?: (issue: WalletIssue) => void) => Promise<string | null>;
  disconnect: () => void;
  openProfile: () => void;
  refreshBalances: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

type PendingConnection = {
  resolve: (address: string | null) => void;
  onError?: (issue: WalletIssue) => void;
};

type PendingTransactionApproval = {
  resolve: () => void;
  reject: (error: Error) => void;
};

type AccountStep = "choice" | "email" | "code";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function authenticationMessage(caught: unknown, fallback: string) {
  if (!(caught instanceof Error) || !caught.message) return fallback;
  return caught.message.replace(/^BLUX:\s*/i, "");
}

export function WalletProvider({ children, blux }: { children: ReactNode; blux?: BluxBridge }) {
  const [connection, setConnection] = useState<WalletConnection | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [accountStep, setAccountStep] = useState<AccountStep>("choice");
  const [emailAddress, setEmailAddress] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [authenticationError, setAuthenticationError] = useState<string | null>(null);
  const [transactionApproval, setTransactionApproval] = useState<TransactionApprovalState | null>(
    null,
  );
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issue, setIssue] = useState<WalletIssue | null>(null);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [freighterChecked, setFreighterChecked] = useState(false);
  const [bluxChecked, setBluxChecked] = useState(!blux);
  const pendingConnection = useRef<PendingConnection | null>(null);
  const pendingTransactionApproval = useRef<PendingTransactionApproval | null>(null);
  const transactionRunning = useRef(false);
  const connectionRef = useRef<WalletConnection | null>(null);

  const address = connection?.session.address ?? null;
  const provider = connection?.session.provider ?? null;
  const restoring = !freighterChecked || !bluxChecked;
  const signer = useMemo<WalletSigner>(() => {
    return {
      async runTransaction(request, execute) {
        const activeConnection = connectionRef.current;
        if (!activeConnection)
          throw new Error("Continue with an account before approving this action.");
        if (activeConnection.session.address !== request.account)
          throw new Error("The active account changed before this transaction was prepared.");
        if (transactionRunning.current)
          throw new Error("Another transaction is already in progress.");

        transactionRunning.current = true;
        setTransactionApproval({ request, stage: "preparing" });

        try {
          const result = await execute({
            requestApproval() {
              setTransactionApproval({ request, stage: "review" });
              return new Promise<void>((resolve, reject) => {
                pendingTransactionApproval.current = { resolve, reject };
              });
            },
            signTransaction: activeConnection.signer.signTransaction,
            setStage(stage, hash) {
              setTransactionApproval({ request, stage, hash });
            },
          });
          setTransactionApproval((current) =>
            current ? { ...current, stage: "success" } : current,
          );
          await new Promise((resolve) => window.setTimeout(resolve, 450));
          setTransactionApproval(null);
          return result;
        } catch (caught) {
          const error = caught instanceof Error ? caught : new Error("Transaction failed.");
          if (error.name === "TransactionApprovalCancelled") {
            setTransactionApproval(null);
          } else {
            setTransactionApproval({ request, stage: "failure", error: error.message });
          }
          throw error;
        } finally {
          pendingTransactionApproval.current = null;
          transactionRunning.current = false;
        }
      },
    };
  }, []);

  const approveTransaction = useCallback(() => {
    const pending = pendingTransactionApproval.current;
    if (!pending) return;
    pendingTransactionApproval.current = null;
    setTransactionApproval((current) => (current ? { ...current, stage: "signing" } : current));
    pending.resolve();
  }, []);

  const cancelTransaction = useCallback(() => {
    const pending = pendingTransactionApproval.current;
    if (!pending) return;
    const cancelled = new Error("Transaction cancelled. Nothing was submitted to Stellar.");
    cancelled.name = "TransactionApprovalCancelled";
    pendingTransactionApproval.current = null;
    pending.reject(cancelled);
  }, []);

  const closeTransactionFailure = useCallback(() => {
    setTransactionApproval(null);
  }, []);

  useEffect(() => {
    connectionRef.current = connection;
  }, [connection]);

  const applyConnection = useCallback((next: WalletConnection) => {
    connectionRef.current = next;
    setConnection(next);
    storageSet(ACTIVE_PROVIDER_KEY, next.session.provider);
    if (next.session.provider === "freighter") {
      storageSet(FREIGHTER_DISCONNECTED_KEY, null);
    }
    setError(null);
    setIssue(null);
  }, []);

  const clearWalletData = useCallback(() => {
    connectionRef.current = null;
    setConnection(null);
    setBalances(null);
    setBalanceError(null);
    setBalanceLoading(false);
    setError(null);
    setIssue(null);
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!address) {
      setBalances(null);
      setBalanceError(null);
      setBalanceLoading(false);
      return;
    }
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const [XLM, USDC] = await Promise.all([
        getTokenBalance(TOKEN_CONTRACTS.XLM, address),
        getTokenBalance(TOKEN_CONTRACTS.USDC, address),
      ]);
      setBalances({ XLM, USDC });
    } catch {
      setBalances(null);
      setBalanceError("Balances are temporarily unavailable.");
    } finally {
      setBalanceLoading(false);
    }
  }, [address]);

  const reportIssue = useCallback((walletIssue: WalletIssue) => {
    const pending = pendingConnection.current;
    if (pending?.onError) pending.onError(walletIssue);
    else {
      setError(walletIssue.message);
      setIssue(walletIssue);
    }
  }, []);

  const finishPending = useCallback((result: string | null) => {
    pendingConnection.current?.resolve(result);
    pendingConnection.current = null;
  }, []);

  const connect = useCallback((onError?: (walletIssue: WalletIssue) => void) => {
    if (connectionRef.current) {
      return Promise.resolve(connectionRef.current.session.address);
    }
    pendingConnection.current?.resolve(null);
    setAccountStep("choice");
    setEmailAddress("");
    setEmailCode("");
    setAuthenticationError(null);
    setChooserOpen(true);
    setError(null);
    setIssue(null);
    return new Promise<string | null>((resolve) => {
      pendingConnection.current = { resolve, onError };
    });
  }, []);

  const chooseEmail = useCallback(() => {
    setAccountStep("email");
    setAuthenticationError(null);
  }, []);

  const choosePasskey = useCallback(async () => {
    if (!blux) return;
    setConnecting(true);
    setAuthenticationError(null);
    try {
      const next = await connectBluxWithPasskey(blux);
      applyConnection(next);
      setChooserOpen(false);
      finishPending(next.session.address);
    } catch (caught) {
      const cancelled = caught instanceof Error && caught.name === "NotAllowedError";
      setAuthenticationError(
        cancelled
          ? "Passkey setup was cancelled. You can try again or use email instead."
          : authenticationMessage(caught, "Passkey login could not be completed. Try again."),
      );
    } finally {
      setConnecting(false);
    }
  }, [applyConnection, blux, finishPending]);

  const sendEmailCode = useCallback(async () => {
    const email = emailAddress.trim();
    if (!blux) return;
    if (!validEmail(email)) {
      setAuthenticationError("Enter a valid email address.");
      return;
    }
    setConnecting(true);
    setAuthenticationError(null);
    try {
      await blux.sendEmailCode(email);
      setEmailAddress(email);
      setEmailCode("");
      setAccountStep("code");
    } catch (caught) {
      setAuthenticationError(
        authenticationMessage(caught, "We could not send the code. Try again."),
      );
    } finally {
      setConnecting(false);
    }
  }, [blux, emailAddress]);

  const verifyEmailCode = useCallback(async () => {
    const code = emailCode.trim();
    if (!blux) return;
    if (!/^\d{6}$/.test(code)) {
      setAuthenticationError("Enter the six-digit code from your email.");
      return;
    }
    setConnecting(true);
    setAuthenticationError(null);
    try {
      const next = await connectBluxWithEmailCode(blux, emailAddress, code);
      applyConnection(next);
      setChooserOpen(false);
      finishPending(next.session.address);
    } catch (caught) {
      setAuthenticationError(
        authenticationMessage(caught, "That code could not be verified. Check it and try again."),
      );
    } finally {
      setConnecting(false);
    }
  }, [applyConnection, blux, emailAddress, emailCode, finishPending]);

  const backToAccountChoice = useCallback(() => {
    if (connecting) return;
    setAccountStep("choice");
    setEmailCode("");
    setAuthenticationError(null);
  }, [connecting]);

  const backToEmail = useCallback(() => {
    if (connecting) return;
    setAccountStep("email");
    setEmailCode("");
    setAuthenticationError(null);
  }, [connecting]);

  const chooseFreighter = useCallback(async () => {
    setConnecting(true);
    try {
      const next = await connectFreighter();
      applyConnection(next);
      setChooserOpen(false);
      finishPending(next.session.address);
    } catch (caught) {
      const walletIssue = normalizeFreighterIssue(caught);
      reportIssue(walletIssue);
      finishPending(null);
      setChooserOpen(false);
    } finally {
      setConnecting(false);
    }
  }, [applyConnection, finishPending, reportIssue]);

  const closeChooser = useCallback(() => {
    if (connecting) return;
    setChooserOpen(false);
    setAccountStep("choice");
    setEmailAddress("");
    setEmailCode("");
    setAuthenticationError(null);
    finishPending(null);
  }, [connecting, finishPending]);

  const disconnect = useCallback(() => {
    if (connectionRef.current?.session.provider === "blux") blux?.logout();
    if (connectionRef.current?.session.provider === "freighter") {
      storageSet(FREIGHTER_DISCONNECTED_KEY, "true");
    }
    storageSet(ACTIVE_PROVIDER_KEY, null);
    clearWalletData();
  }, [blux, clearWalletData]);

  const openProfile = useCallback(() => {
    if (connectionRef.current?.session.provider === "blux") blux?.profile();
  }, [blux]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refreshBalances(), 0);
    return () => window.clearTimeout(timeout);
  }, [refreshBalances]);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      const preferred = activeProvider();
      const manuallyDisconnected = storageGet(FREIGHTER_DISCONNECTED_KEY) === "true";
      if ((preferred === "freighter" || (!preferred && !blux)) && !manuallyDisconnected) {
        const restored = await restoreFreighter();
        if (!disposed && restored) applyConnection(restored);
      }
      if (!disposed) setFreighterChecked(true);
    })();
    return () => {
      disposed = true;
    };
  }, [applyConnection, blux]);

  useEffect(() => {
    if (!blux) return;
    if (!blux.isReady) return;
    const timeout = window.setTimeout(() => {
      setBluxChecked(true);

      const preferred = activeProvider();
      if (blux.isAuthenticated && preferred !== "freighter") {
        try {
          const restored = connectionFromBlux(blux);
          if (restored) applyConnection(restored);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Could not restore email login.");
        }
      } else if (preferred === "blux" && !blux.isAuthenticated) {
        storageSet(ACTIVE_PROVIDER_KEY, null);
        clearWalletData();
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [applyConnection, blux, clearWalletData]);

  useEffect(() => {
    return watchFreighter(
      (next) => {
        if (storageGet(FREIGHTER_DISCONNECTED_KEY) === "true") return;
        if (activeProvider() !== "freighter") return;
        if (next) applyConnection(next);
        else clearWalletData();
      },
      (walletIssue) => {
        if (activeProvider() !== "freighter") return;
        setError(walletIssue.message);
        setIssue(walletIssue);
      },
    );
  }, [applyConnection, clearWalletData]);

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      session: connection?.session ?? null,
      signer,
      provider,
      restoring,
      connecting,
      error,
      issue,
      balances,
      balanceLoading,
      balanceError,
      connect,
      disconnect,
      openProfile,
      refreshBalances,
    }),
    [
      address,
      connection,
      signer,
      provider,
      restoring,
      connecting,
      error,
      issue,
      balances,
      balanceLoading,
      balanceError,
      connect,
      disconnect,
      openProfile,
      refreshBalances,
    ],
  );

  return (
    <WalletContext.Provider value={value}>
      {children}
      {chooserOpen && (
        <div className="wallet-choice-backdrop" role="presentation" onMouseDown={closeChooser}>
          <section
            className="wallet-choice-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-choice-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="wallet-choice-close"
              onClick={closeChooser}
              disabled={connecting}
              aria-label="Close account options"
            >
              ×
            </button>
            {accountStep === "choice" && (
              <>
                <p className="eyebrow">Continue to Split</p>
                <h2 id="wallet-choice-title">How would you like to continue?</h2>
                <p>
                  Use a passkey for the fastest return, continue with email, or connect a Stellar
                  wallet you already use.
                </p>
                <div className="wallet-choice-options">
                  <button
                    type="button"
                    className="wallet-choice-primary"
                    onClick={() => void choosePasskey()}
                    disabled={connecting || !blux?.isReady}
                  >
                    <span>
                      <strong>{connecting ? "Opening passkey…" : "Continue with passkey"}</strong>
                      <small>Face ID, fingerprint, or device PIN · Recommended</small>
                    </span>
                    <b aria-hidden="true">→</b>
                  </button>
                  <button
                    type="button"
                    className="wallet-choice-secondary"
                    onClick={chooseEmail}
                    disabled={connecting || !blux?.isReady}
                  >
                    <span>
                      <strong>Continue with email</strong>
                      <small>Receive a one-time code</small>
                    </span>
                    <b aria-hidden="true">→</b>
                  </button>
                  <button
                    type="button"
                    className="wallet-choice-secondary"
                    onClick={() => void chooseFreighter()}
                    disabled={connecting}
                  >
                    <span>
                      <strong>Use an existing Stellar wallet</strong>
                      <small>Connect with Freighter</small>
                    </span>
                    <b aria-hidden="true">→</b>
                  </button>
                </div>
                {authenticationError && (
                  <p className="wallet-choice-error" role="alert">
                    {authenticationError}
                  </p>
                )}
                <small className="wallet-choice-safety">
                  Returning? Choose the same method you used before so you reopen the same Testnet
                  account.
                </small>
                {!blux && (
                  <small className="wallet-choice-note">
                    Passkey and email login are unavailable until the Blux App ID is configured.
                  </small>
                )}
              </>
            )}

            {accountStep === "email" && (
              <form
                className="wallet-auth-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendEmailCode();
                }}
              >
                <button type="button" className="wallet-auth-back" onClick={backToAccountChoice}>
                  ← All options
                </button>
                <p className="eyebrow">Your Split account</p>
                <h2 id="wallet-choice-title">Continue with email</h2>
                <p>We’ll email you a one-time code. No password or wallet extension needed.</p>
                <label htmlFor="split-account-email">Email address</label>
                <input
                  id="split-account-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={emailAddress}
                  onChange={(event) => {
                    setEmailAddress(event.target.value);
                    setAuthenticationError(null);
                  }}
                  placeholder="you@example.com"
                  disabled={connecting}
                  autoFocus
                  required
                />
                {authenticationError && (
                  <p className="wallet-auth-error" role="alert">
                    {authenticationError}
                  </p>
                )}
                <button type="submit" className="wallet-auth-submit" disabled={connecting}>
                  {connecting ? "Sending code…" : "Email me a code →"}
                </button>
                <small>
                  Your email is used by the wallet provider to securely restore your account.
                </small>
              </form>
            )}

            {accountStep === "code" && (
              <form
                className="wallet-auth-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void verifyEmailCode();
                }}
              >
                <button type="button" className="wallet-auth-back" onClick={backToEmail}>
                  ← Change email
                </button>
                <p className="eyebrow">Check your inbox</p>
                <h2 id="wallet-choice-title">Enter your code</h2>
                <p>
                  We sent a six-digit code to <strong>{emailAddress}</strong>.
                </p>
                <label htmlFor="split-account-code">Verification code</label>
                <input
                  id="split-account-code"
                  className="wallet-auth-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={emailCode}
                  onChange={(event) => {
                    setEmailCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    setAuthenticationError(null);
                  }}
                  placeholder="000000"
                  maxLength={6}
                  disabled={connecting}
                  autoFocus
                  required
                />
                {authenticationError && (
                  <p className="wallet-auth-error" role="alert">
                    {authenticationError}
                  </p>
                )}
                <button type="submit" className="wallet-auth-submit" disabled={connecting}>
                  {connecting ? "Verifying…" : "Continue to Split →"}
                </button>
                <button
                  type="button"
                  className="wallet-auth-resend"
                  onClick={() => void sendEmailCode()}
                  disabled={connecting}
                >
                  Send a new code
                </button>
              </form>
            )}
          </section>
        </div>
      )}
      {transactionApproval && (
        <TransactionApprovalDialog
          state={transactionApproval}
          onApprove={approveTransaction}
          onCancel={cancelTransaction}
          onClose={closeTransactionFailure}
        />
      )}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider.");
  return value;
}
