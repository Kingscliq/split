"use client";

import { getAddress, getNetworkDetails, isAllowed, isConnected, requestAccess, WatchWalletChanges } from "@stellar/freighter-api";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { NETWORK_PASSPHRASE } from "@/lib/split-contract";

export const FREIGHTER_INSTALL_URL = "https://www.freighter.app/";

export type WalletIssue = {
  code: "missing" | "wrong_network" | "access" | "unknown";
  message: string;
};

type WalletContextValue = {
  address: string | null;
  connecting: boolean;
  error: string | null;
  issue: WalletIssue | null;
  connect: (onError?: (issue: WalletIssue) => void) => Promise<string | null>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issue, setIssue] = useState<WalletIssue | null>(null);

  const connect = useCallback(async (onError?: (issue: WalletIssue) => void) => {
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
          message: `Freighter is on ${network.network || "another network"}. Switch it to Testnet—Split will reconnect automatically.`,
        };
        throw wrongNetwork;
      }
      setAddress(access.address);
      return access.address;
    } catch (caught) {
      const walletIssue: WalletIssue =
        typeof caught === "object" && caught !== null && "code" in caught && "message" in caught
          ? caught as WalletIssue
          : { code: "unknown", message: caught instanceof Error ? caught.message : "Could not connect Freighter." };
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

  useEffect(() => {
    let watcher: WatchWalletChanges | null = null;
    let disposed = false;

    void (async () => {
      const installed = await isConnected();
      if (!installed.isConnected || disposed) return;
      const permission = await isAllowed();
      if (disposed) return;
      if (permission.isAllowed) {
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
        if (disposed || wallet.error) return;
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
            message: `Freighter is on ${wallet.network || "another network"}. Switch it to Testnet—Split will reconnect automatically.`,
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

  const value = useMemo(() => ({ address, connecting, error, issue, connect }), [address, connecting, error, issue, connect]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider.");
  return value;
}
