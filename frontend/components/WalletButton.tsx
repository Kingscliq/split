"use client";

import { CopyAddressButton } from "@/components/CopyAddressButton";
import { FREIGHTER_INSTALL_URL, useWallet } from "@/contexts/WalletContext";
import { shortAddress } from "@/lib/split-contract";

export function DisconnectWalletButton({ className = "" }: { className?: string }) {
  const { address, disconnect } = useWallet();
  if (!address) return null;

  return (
    <button className={`wallet-disconnect ${className}`.trim()} type="button" onClick={disconnect}>
      <span aria-hidden="true">↪</span> Disconnect wallet
    </button>
  );
}

export function WalletButton() {
  const { address, connecting, issue, connect } = useWallet();
  return (
    <div className="wallet-control">
      {address ? (
        <details className="wallet-menu">
          <summary className="wallet-chip" title={address} aria-label={`Connected wallet ${address}. Open wallet menu`}>
            <span className="wallet-orb" />
            <span>{shortAddress(address)}</span>
            <i aria-hidden="true">⌄</i>
          </summary>
          <div className="wallet-menu-panel">
            <div className="wallet-menu-heading">
              <span>Connected on Testnet</span>
              <strong>{shortAddress(address)}</strong>
            </div>
            <CopyAddressButton address={address} label="Copy wallet address" />
            <DisconnectWalletButton />
            <small>This disconnects the wallet from Split only.</small>
          </div>
        </details>
      ) : (
        <button className="wallet-chip" type="button" onClick={() => void connect()} disabled={connecting}>
          <span className="wallet-orb" />
          {connecting ? "Connecting…" : "Connect wallet"}
        </button>
      )}
      {issue && !address && (
        <span className="wallet-error" role="status">
          <span>{issue.message}</span>
          {issue.code === "missing" ? (
            <a href={FREIGHTER_INSTALL_URL} target="_blank" rel="noreferrer">Install Freighter ↗</a>
          ) : (
            <button type="button" onClick={() => void connect()} disabled={connecting}>
              {issue.code === "wrong_network" ? "Check Testnet again" : "Try again"}
            </button>
          )}
        </span>
      )}
    </div>
  );
}
