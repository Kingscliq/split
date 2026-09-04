"use client";

import Link from "next/link";
import { BalanceAmount } from "@/components/BalanceAmount";
import { CopyAddressButton } from "@/components/CopyAddressButton";
import { FREIGHTER_INSTALL_URL, useWallet } from "@/contexts/WalletContext";
import { shortAddress } from "@/lib/split-contract";

export function DisconnectWalletButton({ className = "" }: { className?: string }) {
  const { address, provider, disconnect } = useWallet();
  if (!address) return null;

  return (
    <button className={`wallet-disconnect ${className}`.trim()} type="button" onClick={disconnect}>
      <span aria-hidden="true">↪</span> {provider === "blux" ? "Log out" : "Disconnect wallet"}
    </button>
  );
}

export function WalletButton() {
  const {
    address,
    provider,
    restoring,
    connecting,
    issue,
    balances,
    balanceLoading,
    balanceError,
    connect,
    openProfile,
    refreshBalances,
  } = useWallet();
  return (
    <div className="wallet-control">
      {address ? (
        <details className="wallet-menu">
          <summary
            className="wallet-chip"
            title={address}
            aria-label={`Connected wallet ${address}. Open wallet menu`}
          >
            <span className="wallet-orb" />
            <span>{shortAddress(address)}</span>
            <i aria-hidden="true">⌄</i>
          </summary>
          <div className="wallet-menu-panel">
            <div className="wallet-menu-heading">
              <span>{provider === "blux" ? "Email account on Testnet" : "Wallet on Testnet"}</span>
              <strong>{shortAddress(address)}</strong>
            </div>
            <div className="wallet-menu-balances" aria-live="polite">
              <div className="wallet-menu-balance-heading">
                <span>Wallet balance</span>
                <button
                  type="button"
                  onClick={() => void refreshBalances()}
                  disabled={balanceLoading}
                  aria-label="Refresh wallet balances"
                >
                  {balanceLoading ? "…" : "↻"}
                </button>
              </div>
              {balances ? (
                <div className="wallet-menu-balance-values">
                  <div>
                    <BalanceAmount value={balances.XLM} />
                    <span className="balance-asset">XLM</span>
                  </div>
                  <div>
                    <BalanceAmount value={balances.USDC} />
                    <span className="balance-asset">USDC</span>
                  </div>
                </div>
              ) : (
                <small>
                  {balanceLoading ? "Reading balances…" : (balanceError ?? "Balance unavailable.")}
                </small>
              )}
              {balances?.XLM === 0n && (
                <Link href="/onboarding#fund-testnet-wallet">Fund Testnet wallet →</Link>
              )}
            </div>
            <CopyAddressButton address={address} label="Copy wallet address" />
            {provider === "blux" && (
              <button className="copy-address" type="button" onClick={openProfile}>
                <span>Manage account</span>
                <i aria-hidden="true">→</i>
              </button>
            )}
            <DisconnectWalletButton />
            <small>
              {provider === "blux"
                ? "Your wallet remains available when you sign in again with the same email."
                : "This disconnects the wallet from Split only."}
            </small>
          </div>
        </details>
      ) : (
        <button
          className="wallet-chip"
          type="button"
          onClick={() => void connect()}
          disabled={connecting || restoring}
        >
          <span className="wallet-orb" />
          {restoring ? "Restoring…" : connecting ? "Continuing…" : "Continue"}
        </button>
      )}
      {issue && !address && (
        <span className="wallet-error" role="status">
          <span>{issue.message}</span>
          {issue.code === "missing" ? (
            <a href={FREIGHTER_INSTALL_URL} target="_blank" rel="noreferrer">
              Install Freighter ↗
            </a>
          ) : (
            <button type="button" onClick={() => void connect()} disabled={connecting}>
              {issue.code === "wrong_network" ? "I’ve switched — check again" : "Try again"}
            </button>
          )}
        </span>
      )}
    </div>
  );
}
