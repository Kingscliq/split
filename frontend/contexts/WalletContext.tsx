"use client";

import {
  getAddress,
  getNetworkDetails,
  isAllowed,
  isConnected,
  requestAccess,
  WatchWalletChanges,
} from "@stellar/freighter-api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getTokenBalance, NETWORK_PASSPHRASE, TOKEN_CONTRACTS } from "@/lib/split-contract";

export const FREIGHTER_INSTALL_URL = "https://www.freighter.app/";
const WALLET_DISCONNECTED_KEY = "split-wallet-disconnected";

function rememberDisconnected(disconnected: boolean) {
  try {
    if (disconnected) window.localStorage.setItem(WALLET_DISCONNECTED_KEY, "true");
    else window.localStorage.removeItem(WALLET_DISCONNECTED_KEY);
  } catch {
    // The in-memory state still works when browser storage is unavailable.
  }
}

function wasDisconnected() {
  try {
    return window.localStorage.getItem(WALLET_DISCONNECTED_KEY) === "true";
  } catch {
    return false;
  }
}

export type WalletIssue = {
  code: "missing" | "wrong_network" | "access" | "unknown";
  message: string;
};

export type WalletBalances = {
  XLM: bigint;
  USDC: bigint;
};

type WalletContextValue = {
  address: string | null;
  connecting: boolean;
  error: string | null;
  issue: WalletIssue | null;
  balances: WalletBalances | null;
  balanceLoading: boolean;
  balanceError: string | null;
  connect: (onError?: (issue: WalletIssue) => void) => Promise<string | null>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issue, setIssue] = useState<WalletIssue | null>(null);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const manuallyDisconnected = useRef(false);

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

  const connect = useCallback(async (onError?: (issue: WalletIssue) => void) => {
    manuallyDisconnected.current = false;
    rememberDisconnected(false);
    setConnecting(true);
    setError(null);
    setIssue(null);
    try {
      const installed = await isConnected();
      if (!installed.isConnected) {
        const missing: WalletIssue = {
          code: "missing",
          message: "Freighter is not installed. Install it to connect your Stellar Testnet wallet.",
        };
        throw missing;
      }
      const access = await requestAccess();
      if (access.error) {
        const denied: WalletIssue = { code: "access", message: access.error.message };
        throw denied;
      }
      const network = await getNetworkDetails();
      if (network.error) {
        const unknown: WalletIssue = { code: "unknown", message: network.error.message };
        throw unknown;
      }
      if (network.networkPassphrase !== NETWORK_PASSPHRASE) {
        const wrongNetwork: WalletIssue = {
          code: "wrong_network",
          message: `Freighter is on ${network.network || "another network"}. Open Freighter, click the hamburger menu (or globe/network icon), open Networks, and select Testnet. Then return to Split—it will reconnect automatically.`,
        };
        throw wrongNetwork;
      }
      setAddress(access.address);
      return access.address;
    } catch (caught) {
      const walletIssue: WalletIssue =
        typeof caught === "object" && caught !== null && "code" in caught && "message" in caught
          ? (caught as WalletIssue)
          : {
              code: "unknown",
              message: caught instanceof Error ? caught.message : "Could not connect Freighter.",
            };
      if (onError) {
        onError(walletIssue);
      } else {
        setError(walletIssue.message);
        setIssue(walletIssue);
      }
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    manuallyDisconnected.current = true;
    rememberDisconnected(true);
    setAddress(null);
    setError(null);
    setIssue(null);
    setConnecting(false);
    setBalances(null);
    setBalanceError(null);
    setBalanceLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refreshBalances(), 0);
    return () => window.clearTimeout(timeout);
  }, [refreshBalances]);

  useEffect(() => {
    let watcher: WatchWalletChanges | null = null;
    let disposed = false;

    void (async () => {
      manuallyDisconnected.current = wasDisconnected();
      const installed = await isConnected();
      if (!installed.isConnected || disposed) return;
      const permission = await isAllowed();
      if (disposed) return;
      if (permission.isAllowed && !manuallyDisconnected.current) {
        const current = await getAddress();
        const network = await getNetworkDetails();
        if (!current.error && !network.error && network.networkPassphrase === NETWORK_PASSPHRASE) {
          setAddress(current.address);
        }
      }

      // Start watching even before authorization. Once requestAccess succeeds,
      // this detects account/network changes without another page refresh.
      watcher = new WatchWalletChanges(1200);
      watcher.watch((wallet) => {
        if (disposed || wallet.error || manuallyDisconnected.current) return;
        if (wallet.address && wallet.networkPassphrase === NETWORK_PASSPHRASE) {
          setAddress(wallet.address);
          setError(null);
          setIssue(null);
          return;
        }
        setAddress(null);
        if (wallet.address && wallet.networkPassphrase) {
          const wrongNetwork: WalletIssue = {
            code: "wrong_network",
            message: `Freighter is on ${wallet.network || "another network"}. Open Freighter, click the hamburger menu (or globe/network icon), open Networks, and select Testnet. Then return to Split—it will reconnect automatically.`,
          };
          setError(wrongNetwork.message);
          setIssue(wrongNetwork);
        }
      });
    })();

    return () => {
      disposed = true;
      watcher?.stop();
    };
  }, []);

  const value = useMemo(
    () => ({
      address,
      connecting,
      error,
      issue,
      balances,
      balanceLoading,
      balanceError,
      connect,
      disconnect,
      refreshBalances,
    }),
    [
      address,
      connecting,
      error,
      issue,
      balances,
      balanceLoading,
      balanceError,
      connect,
      disconnect,
      refreshBalances,
    ],
  );
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider.");
  return value;
}
