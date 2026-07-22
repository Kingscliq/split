"use client";

import { shortAddress } from "@/lib/split-contract";
import { useWallet } from "@/contexts/WalletContext";

export function WalletButton() {
  const { address, connecting, error, connect } = useWallet();
  return (
    <div className="wallet-control">
      <button className="wallet-chip" type="button" onClick={() => void connect()} disabled={connecting} title={error ?? undefined}>
        <span className={address ? "status-dot" : "wallet-orb"} />
        {connecting ? "Connecting…" : address ? shortAddress(address) : "Connect wallet"}
      </button>
      {error && <span className="wallet-error" role="status">{error}</span>}
    </div>
  );
}
