"use client";

import { useState } from "react";
import { CopyAddressButton } from "@/components/CopyAddressButton";
import { useWallet } from "@/contexts/WalletContext";
import { shortAddress } from "@/lib/split-contract";

const FRIENDBOT_URL = "https://friendbot.stellar.org";

type FundingState =
  | { kind: "idle" }
  | { kind: "funding" }
  | { kind: "success"; address: string }
  | { kind: "error"; message: string; source: "wallet" | "friendbot" };

function fundingError(responseBody: string) {
  const normalized = responseBody.toLowerCase();
  if (normalized.includes("rate") || normalized.includes("limit")) {
    return "Friendbot is receiving too many requests. Wait a moment, then try again.";
  }
  if (
    normalized.includes("already") ||
    normalized.includes("exist") ||
    normalized.includes("balance")
  ) {
    return "Friendbot could not add more XLM. This wallet may already be funded—check its Testnet balance in Freighter.";
  }
  return "Friendbot could not fund this wallet. Check Freighter is on Testnet, then try again.";
}

export function FriendbotFunding() {
  const { address, connecting, connect } = useWallet();
  const [state, setState] = useState<FundingState>({ kind: "idle" });

  async function fundWallet() {
    setState({ kind: "funding" });

    // Reconnect on every request so WalletContext re-checks the selected network.
    let connectionError: string | null = null;
    const testnetAddress = await connect((issue) => {
      connectionError = issue.message;
    });
    if (!testnetAddress) {
      setState({
        kind: "error",
        message:
          connectionError ??
          "Could not connect Freighter. Check the wallet message above, then try again.",
        source: "wallet",
      });
      return;
    }

    try {
      const response = await fetch(`${FRIENDBOT_URL}/?addr=${encodeURIComponent(testnetAddress)}`);
      const responseBody = await response.text();
      if (!response.ok) throw new Error(fundingError(responseBody));
      setState({ kind: "success", address: testnetAddress });
    } catch (caught) {
      setState({
        kind: "error",
        message:
          caught instanceof Error
            ? caught.message
            : "Friendbot could not fund this wallet. Try again shortly.",
        source: "friendbot",
      });
    }
  }

  const busy = connecting || state.kind === "funding";

  return (
    <article
      className="guide-step friendbot-card"
      id="fund-testnet-wallet"
      aria-labelledby="friendbot-title"
    >
      <span className="guide-step-number">05</span>
      <div className="friendbot-content">
        <div className="friendbot-copy">
          <span className="friendbot-mark" aria-hidden="true">
            ✦
          </span>
          <div>
            <p className="eyebrow">Testnet funding</p>
            <h2 id="friendbot-title">Fund your test wallet</h2>
            <p>
              Friendbot creates or tops up your Testnet account with fake XLM. It sends no real
              money and only receives your public wallet address.
            </p>
            {address && <CopyAddressButton address={address} className="friendbot-address" />}
          </div>
        </div>

        <div className="friendbot-action">
          <span className="friendbot-action-label">Ready for step 05?</span>
          <button
            className="button button-dark"
            type="button"
            onClick={() => void fundWallet()}
            disabled={busy || state.kind === "success"}
          >
            {state.kind === "funding" || connecting
              ? "Funding wallet…"
              : state.kind === "success"
                ? "Wallet funded ✓"
                : address
                  ? "Fund my Testnet wallet"
                  : "Connect and fund wallet"}
          </button>
          <small>No signature or private key is required.</small>
        </div>
      </div>

      {state.kind === "success" && (
        <div className="friendbot-status success" role="status">
          <span className="friendbot-status-icon" aria-hidden="true">
            ✓
          </span>
          <span>
            Test XLM was sent to {shortAddress(state.address)}. Open Freighter to confirm the
            Testnet balance.
          </span>
        </div>
      )}
      {state.kind === "error" && (
        <div className="friendbot-status error" role="alert">
          <span className="friendbot-status-icon" aria-hidden="true">
            !
          </span>
          <span className="friendbot-status-copy">
            <strong>
              {state.source === "wallet" ? "Wallet connection issue" : "Funding issue"}
            </strong>
            <span>{state.message}</span>
          </span>
        </div>
      )}
    </article>
  );
}
