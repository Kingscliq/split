"use client";

import { CopyAddressButton } from "@/components/CopyAddressButton";
import { FREIGHTER_INSTALL_URL, useWallet } from "@/contexts/WalletContext";

export function WalletButton() {
  const { address, connecting, issue, connect } = useWallet();
  return (
    <div className="wallet-control">
      {address ? (
        <CopyAddressButton address={address} className="wallet-chip" />
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
