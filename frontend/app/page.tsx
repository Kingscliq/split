"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const {
    address,
    restoring,
    connecting,
    balances,
    accountFunded,
    balanceLoading,
    balanceError,
    connect,
    refreshBalances,
  } = useWallet();
  const [splits, setSplits] = useState<SplitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [funding, setFunding] = useState<FundingState>({ kind: "idle" });
  const currentFunding =
    funding.kind !== "idle" && funding.address === address ? funding : ({ kind: "idle" } as const);

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
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);
  const active = useMemo(() => splits.filter((split) => split.status === "Active"), [splits]);
  const completed = splits.filter((split) => split.status === "Completed").length;

  return (
    <AppShell active="home">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Your Testnet splits</p>
          <h1>
            Money plans,
            <br />
            minus the chasing.
          </h1>
        </div>
        <Link className="button button-primary desktop-action" href="/split/create">
          <span>＋</span> New split
        </Link>
      </header>

      <section className="overview-grid" aria-label="Split overview">
        <article className="hero-card lime-card">
          <div className="hero-card-top">
            <span className="pill pill-dark">On-chain</span>
            <span className="round-icon">↗</span>
          </div>
          <div>
            <p className="card-label">Your splits</p>
            <p className="display-amount">{splits.length}</p>
          </div>
          <div className="hero-card-foot">
            <div>
              <strong>{active.length}</strong>
              <span>active</span>
            </div>
            <div>
              <strong>{completed}</strong>
              <span>completed</span>
            </div>
          </div>
        </article>
        <article className="hero-card dark-card wallet-overview-card">
          <div className="hero-card-top">
            <span className="pill pill-muted">Testnet wallet</span>
            <span className="tiny-avatar avatar-coral">S</span>
          </div>
          {restoring ? (
            <div>
              <p className="card-label">Restoring your account</p>
              <p className="wallet-connect-copy">Checking your saved Split session…</p>
            </div>
          ) : address ? (
            <>
              <div>
                {accountFunded !== false && <p className="card-label">Available balance</p>}
                {accountFunded === false ? (
                  <div className="dashboard-funding">
                    <strong>Fund your Testnet wallet</strong>
                    <p>Add test XLM to start using Split.</p>
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => void fundWallet()}
                      disabled={currentFunding.kind === "funding"}
                    >
                      {currentFunding.kind === "funding" ? "Funding wallet…" : "Fund wallet"}
                    </button>
                    {currentFunding.kind === "error" && (
                      <p className="dashboard-funding-error" role="alert">
                        {currentFunding.message}
                      </p>
                    )}
                  </div>
                ) : balances ? (
                  <div className="dashboard-balances">
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
                  <p className="wallet-balance-placeholder">
                    {balanceLoading
                      ? "Reading balances…"
                      : (balanceError ?? "Balance unavailable.")}
                  </p>
                )}
              </div>
              {accountFunded === false ? null : currentFunding.kind === "success" ? (
                <p className="dashboard-funding-success" role="status">
                  Wallet funded with Testnet XLM. You’re ready to create a Split.
                </p>
              ) : (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => void refreshBalances()}
                  disabled={balanceLoading}
                >
                  Refresh balances <span>{balanceLoading ? "…" : "↻"}</span>
                </button>
              )}
            </>
          ) : (
            <>
              <div>
                <p className="card-label">Your balance at a glance</p>
                <p className="wallet-connect-copy">
                  Continue to see your XLM and USDC balance before creating or paying a Split.
                </p>
              </div>
              <button
                type="button"
                className="text-link"
                onClick={() => void connect()}
                disabled={connecting}
              >
                {connecting ? "Continuing…" : "Continue"} <span>→</span>
              </button>
            </>
          )}
        </article>
      </section>

      <section className="section-block" id="your-splits">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Private dashboard</p>
            <h2>Splits you created or joined</h2>
          </div>
          <span className="pill pill-muted">Latest 50</span>
        </div>
        {restoring && <div className="contract-state">Restoring your account…</div>}
        {!restoring && !address && (
          <div className="contract-state">
            <p>Continue to see only the Splits you created or joined.</p>
            <button type="button" onClick={() => void connect()} disabled={connecting}>
              {connecting ? "Continuing…" : "Continue"}
            </button>
          </div>
        )}
        {address && loading && (
          <div className="contract-state">Finding your splits on Stellar testnet…</div>
        )}
        {error && (
          <div className="contract-state error-state">
            <p>{error}</p>
            <button type="button" onClick={() => void load()}>
              Try again
            </button>
          </div>
        )}
        {address && !loading && !error && splits.length === 0 && (
          <div className="contract-state">
            <p>No Splits are assigned to this wallet yet.</p>
            <Link href="/split/create">Create a split →</Link>
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
      <Link className="button button-primary mobile-fab" href="/split/create">
        <span>＋</span> New split
      </Link>
    </AppShell>
  );
}
