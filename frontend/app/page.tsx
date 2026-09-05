"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BalanceAmount } from "@/components/BalanceAmount";
import { useWallet } from "@/contexts/WalletContext";
import {
  formatAmount,
  getSplitsForWallet,
  tokenSymbol,
  type SplitRecord,
} from "@/lib/split-contract";
import { fundTestnetAccount } from "@/lib/testnet-funding";

type FundingState =
  | { kind: "idle" }
  | { kind: "funding"; address: string }
  | { kind: "success"; address: string }
  | { kind: "error"; address: string; message: string };

export default function Home() {
  const router = useRouter();
  const {
    address,
    restoring,
    balances,
    accountFunded,
    balanceLoading,
    balanceError,
    refreshBalances,
  } = useWallet();
  const [splits, setSplits] = useState<SplitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedAddress, setLoadedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [funding, setFunding] = useState<FundingState>({ kind: "idle" });
  const currentFunding =
    funding.kind !== "idle" && funding.address === address ? funding : ({ kind: "idle" } as const);

  useEffect(() => {
    if (funding.kind !== "success") return;
    const timeout = window.setTimeout(() => setFunding({ kind: "idle" }), 4_000);
    return () => window.clearTimeout(timeout);
  }, [funding]);

  const fundWallet = useCallback(async () => {
    if (!address) return;
    setFunding({ kind: "funding", address });
    try {
      await fundTestnetAccount(address);
      await refreshBalances();
      setFunding({ kind: "success", address });
    } catch (caught) {
      setFunding({
        kind: "error",
        address,
        message:
          caught instanceof Error
            ? caught.message
            : "Friendbot could not fund this account. Try again shortly.",
      });
    }
  }, [address, refreshBalances]);

  const load = useCallback(async () => {
    if (!address) {
      setSplits([]);
      setLoadedAddress(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setSplits(await getSplitsForWallet(address));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read the Split contract.");
    } finally {
      setLoadedAddress(address);
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);
  useEffect(() => {
    if (restoring || loading || error) return;
    if (address) {
      if (loadedAddress === address && splits.length === 0) router.replace("/split/create");
      return;
    }
    try {
      const savedProvider = window.localStorage.getItem("split-active-wallet-provider");
      if (savedProvider === "blux" || savedProvider === "freighter") return;
    } catch {
      // Continue to the create screen when browser storage is unavailable.
    }
    const timeout = window.setTimeout(() => router.replace("/split/create"), 1_200);
    return () => window.clearTimeout(timeout);
  }, [address, error, loadedAddress, loading, restoring, router, splits.length]);

  if (
    restoring ||
    loading ||
    (!!address && loadedAddress !== address) ||
    (!error && (!address || splits.length === 0))
  ) {
    return (
      <AppShell active="home">
        <div className="contract-state dashboard-route-state">
          {restoring || loading ? "Loading your Split workspace…" : "Opening Create Split…"}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="home">
      <section className="desktop-dashboard-overview" aria-label="Split dashboard">
        <article className="desktop-balance-hero">
          <div className="desktop-balance-copy">
            <div className="desktop-balance-label">
              <span>Wallet balance</span>
              <button
                type="button"
                onClick={() => void refreshBalances()}
                disabled={balanceLoading}
                aria-label="Refresh XLM balance"
              >
                {balanceLoading ? "…" : "↻"}
              </button>
            </div>
            {accountFunded === false ? (
              <div className="desktop-funding-state">
                <strong>Fund your wallet to get started</strong>
                <button
                  type="button"
                  onClick={() => void fundWallet()}
                  disabled={currentFunding.kind === "funding"}
                >
                  {currentFunding.kind === "funding" ? "Funding…" : "Fund wallet"}
                </button>
                {currentFunding.kind === "error" && <small>{currentFunding.message}</small>}
              </div>
            ) : balances ? (
              <div className="desktop-balance-value">
                <BalanceAmount value={balances.XLM} />
                <span>XLM</span>
              </div>
            ) : (
              <p className="desktop-balance-error">
                {balanceLoading ? "Reading balance…" : (balanceError ?? "Balance unavailable.")}
              </p>
            )}
            <nav className="desktop-primary-actions" aria-label="Primary actions">
              <Link href="/split/create">
                <span aria-hidden="true">＋</span>
                Create split
              </Link>
              <Link href="/split/pending">
                <span aria-hidden="true">↘</span>
                Pay share
              </Link>
            </nav>
          </div>
        </article>
      </section>

      <section className="mobile-fintech-dashboard" aria-label="Split dashboard">
        <div className="mobile-balance-heading">
          <span>Wallet balance</span>
          <button
            type="button"
            onClick={() => void refreshBalances()}
            disabled={balanceLoading}
            aria-label="Refresh XLM balance"
          >
            {balanceLoading ? "…" : "↻"}
          </button>
        </div>

        {accountFunded === false ? (
          <div className="mobile-funding-panel">
            <strong>Fund your wallet</strong>
            <button
              type="button"
              onClick={() => void fundWallet()}
              disabled={currentFunding.kind === "funding"}
            >
              {currentFunding.kind === "funding" ? "Funding…" : "Fund wallet"}
            </button>
            {currentFunding.kind === "error" && <small>{currentFunding.message}</small>}
          </div>
        ) : balances ? (
          <div className="mobile-balance-value">
            <BalanceAmount value={balances.XLM} />
            <span>XLM</span>
          </div>
        ) : (
          <p className="mobile-balance-error">
            {balanceLoading ? "Reading balance…" : (balanceError ?? "Balance unavailable.")}
          </p>
        )}

        <nav className="mobile-money-actions" aria-label="Money actions">
          <Link href="/split/create">
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <strong>Create split</strong>
          </Link>
          <Link href="/split/pending">
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 4v16M6 14l6 6 6-6" />
              </svg>
            </span>
            <strong>Pay share</strong>
          </Link>
        </nav>
      </section>

      <section className="section-block" id="your-splits">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your splits</p>
            <h2>
              <span className="desktop-section-title">Recent activity</span>
              <span className="mobile-section-title">Recent splits</span>
            </h2>
          </div>
        </div>
        {error && (
          <div className="contract-state error-state">
            <p>{error}</p>
            <button type="button" onClick={() => void load()}>
              Try again
            </button>
          </div>
        )}
        <div className="split-list">
          {splits.map((split, index) => {
            const progress =
              split.totalAmount === 0n ? 0 : Number((split.totalPaid * 100n) / split.totalAmount);
            const symbol = tokenSymbol(split.token);
            return (
              <Link className="split-row" href={`/split/${split.id}`} key={split.id}>
                <div
                  className={`split-icon ${split.status === "Completed" ? "sand" : index % 2 ? "pink" : "lime"}`}
                  aria-hidden="true"
                >
                  {split.status === "Completed" ? "✓" : split.participantCount}
                </div>
                <div className="split-copy">
                  <strong>{split.title}</strong>
                  <span>
                    {split.status} · {split.participantCount} participants
                  </span>
                </div>
                <div className="split-progress-wrap" aria-label={`${progress}% collected`}>
                  <div className="mini-progress">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <span>{progress}%</span>
                </div>
                <div className="split-total">
                  <strong>{formatAmount(split.totalAmount)}</strong>
                  <span>{symbol}</span>
                </div>
                <span className="row-arrow">↗</span>
              </Link>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
