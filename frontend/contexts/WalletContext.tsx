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
import { getTokenBalance, TOKEN_CONTRACTS } from "@/lib/split-contract";
import { connectBlux, connectionFromBlux, type BluxBridge } from "@/lib/wallet/blux-adapter";
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

export function WalletProvider({ children, blux }: { children: ReactNode; blux?: BluxBridge }) {
  const [connection, setConnection] = useState<WalletConnection | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issue, setIssue] = useState<WalletIssue | null>(null);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [freighterChecked, setFreighterChecked] = useState(false);
  const [bluxChecked, setBluxChecked] = useState(!blux);
  const pendingConnection = useRef<PendingConnection | null>(null);
  const connectionRef = useRef<WalletConnection | null>(null);

  const address = connection?.session.address ?? null;
  const provider = connection?.session.provider ?? null;
  const restoring = !freighterChecked || !bluxChecked;
  const signer = useMemo<WalletSigner>(
    () => ({
      async signTransaction(transactionXdr, options) {
        const activeSigner = connectionRef.current?.signer;
        if (!activeSigner)
          throw new Error("Continue with an account before approving this action.");
        return activeSigner.signTransaction(transactionXdr, options);
      },
    }),
    [],
  );

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
    setChooserOpen(true);
    setError(null);
    setIssue(null);
    return new Promise<string | null>((resolve) => {
      pendingConnection.current = { resolve, onError };
    });
  }, []);

  const chooseEmail = useCallback(async () => {
    if (!blux) return;
    setConnecting(true);
    try {
      const next = await connectBlux(blux);
      applyConnection(next);
      setChooserOpen(false);
      finishPending(next.session.address);
    } catch (caught) {
      const walletIssue: WalletIssue = {
        code: "unknown",
        message: caught instanceof Error ? caught.message : "Could not continue with email.",
      };
      reportIssue(walletIssue);
      finishPending(null);
    } finally {
      setConnecting(false);
    }
  }, [applyConnection, blux, finishPending, reportIssue]);

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
            <p className="eyebrow">Continue to Split</p>
            <h2 id="wallet-choice-title">How would you like to continue?</h2>
            <p>
              Use email for the simplest experience, or connect a Stellar wallet you already use.
            </p>
            <div className="wallet-choice-options">
              <button
                type="button"
                className="wallet-choice-primary"
                onClick={() => void chooseEmail()}
                disabled={connecting || !blux?.isReady}
              >
                <span>
                  <strong>Continue with email</strong>
                  <small>No extension required · Recommended</small>
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
            {!blux && (
              <small className="wallet-choice-note">
                Email login is unavailable until the Blux App ID is configured.
              </small>
            )}
          </section>
        </div>
      )}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider.");
  return value;
}
