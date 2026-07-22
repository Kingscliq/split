"use client";

import { getAddress, getNetworkDetails, isAllowed, isConnected, requestAccess } from "@stellar/freighter-api";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { NETWORK_PASSPHRASE } from "@/lib/split-contract";

type WalletContextValue = {
  address: string | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<string | null>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const installed = await isConnected();
      if (!installed.isConnected) throw new Error("Install the Freighter wallet extension to continue.");
      const access = await requestAccess();
      if (access.error) throw new Error(access.error.message);
      const network = await getNetworkDetails();
      if (network.error) throw new Error(network.error.message);
      if (network.networkPassphrase !== NETWORK_PASSPHRASE) throw new Error("Switch Freighter to Testnet, then try again.");
      setAddress(access.address);
      return access.address;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not connect Freighter.");
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const installed = await isConnected();
      if (!installed.isConnected) return;
      const permission = await isAllowed();
      if (!permission.isAllowed) return;
      const current = await getAddress();
      const network = await getNetworkDetails();
      if (!current.error && !network.error && network.networkPassphrase === NETWORK_PASSPHRASE) {
        setAddress(current.address);
      }
    })();
  }, []);

  const value = useMemo(() => ({ address, connecting, error, connect }), [address, connecting, error, connect]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider.");
  return value;
}
