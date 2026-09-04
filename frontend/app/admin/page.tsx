"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CopyAddressButton } from "@/components/CopyAddressButton";
import { useWallet } from "@/contexts/WalletContext";
import { isAdminWallet } from "@/lib/admin";
import {
  formatAmount,
  getAllSplitsWithParticipants,
  shortAddress,
  tokenSymbol,
  type SplitWithParticipants,
} from "@/lib/split-contract";

type WalletSummary = {
  address: string;
  created: number;
  assigned: number;
  paid: number;
};

function formatDate(timestamp: bigint): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(Number(timestamp) * 1000));
}

export default function AdminPage() {
  const { address, restoring, connecting, connect } = useWallet();
  const allowed = isAdminWallet(address);
  const [splits, setSplits] = useState<SplitWithParticipants[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!allowed) {
      setSplits([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setSplits(await getAllSplitsWithParticipants());
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not read admin activity from Stellar.",
      );
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const summary = useMemo(() => {
    const wallets = new Map<string, WalletSummary>();
    let paidShares = 0;
    let pendingShares = 0;

    const ensureWallet = (wallet: string) => {
      const existing = wallets.get(wallet);
      if (existing) return existing;
      const created = { address: wallet, created: 0, assigned: 0, paid: 0 };
      wallets.set(wallet, created);
      return created;
    };

    splits.forEach((split) => {
      ensureWallet(split.creator).created += 1;
      split.participants.forEach((participant) => {
        const wallet = ensureWallet(participant.participant);
        wallet.assigned += 1;
        if (participant.status === "Paid") {
          wallet.paid += 1;
          paidShares += 1;
        } else {
          pendingShares += 1;
        }
      });
    });

    return {
      wallets: Array.from(wallets.values()).sort(
        (a, b) => b.created + b.assigned - (a.created + a.assigned),
      ),
      paidShares,
      pendingShares,
      activeSplits: splits.filter((split) => split.status === "Active").length,
    };
  }, [splits]);

  if (restoring) {
    return (
      <AppShell>
        <section className="admin-gate">
          <p>Restoring your account…</p>
        </section>
      </AppShell>
    );
  }

  if (!address) {
    return (
      <AppShell>
        <section className="admin-gate">
          <p className="eyebrow">Restricted operations</p>
          <h1>Admin account required.</h1>
          <p>Continue with the approved Testnet account to open the activity dashboard.</p>
          <button
            className="button button-primary"
            type="button"
            onClick={() => void connect()}
            disabled={connecting}
          >
            {connecting ? "Continuing…" : "Continue as admin"}
          </button>
        </section>
      </AppShell>
    );
  }

  if (!allowed) {
    return (
      <AppShell>
        <section className="admin-gate denied">
          <p className="eyebrow">Restricted operations</p>
          <h1>This account is not an admin.</h1>
          <p>
            Connected as {shortAddress(address)}. Log out or disconnect, then continue with the
            approved admin account.
          </p>
          <Link className="button button-primary" href="/">
            Return to your dashboard
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell active="admin">
      <header className="admin-heading">
        <div>
          <p className="eyebrow">Admin · current on-chain state</p>
          <h1>Testnet activity</h1>
          <p>Every Split and unique wallet currently recorded by the deployed contract.</p>
        </div>
        <button
          className="button admin-refresh"
          type="button"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh activity ↻"}
        </button>
      </header>

      {error && (
        <div className="contract-state error-state">
          <p>{error}</p>
          <button type="button" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}
      {loading && splits.length === 0 && (
        <div className="contract-state">Reading all Split activity from Stellar Testnet…</div>
      )}

      {!error && (!loading || splits.length > 0) && (
        <>
          <section className="admin-metrics" aria-label="Contract summary">
            <article>
              <span>Total Splits</span>
              <strong>{splits.length}</strong>
              <small>{summary.activeSplits} active</small>
            </article>
            <article>
              <span>Unique wallets</span>
              <strong>{summary.wallets.length}</strong>
              <small>creators + participants</small>
            </article>
            <article>
              <span>Paid shares</span>
              <strong>{summary.paidShares}</strong>
              <small>confirmed in contract state</small>
            </article>
            <article>
              <span>Pending shares</span>
              <strong>{summary.pendingShares}</strong>
              <small>including partial payments</small>
            </article>
          </section>

          <section className="section-block">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Contract activity</p>
                <h2>All Splits</h2>
              </div>
              <span className="pill pill-muted">Newest first</span>
            </div>
            {splits.length === 0 ? (
              <div className="contract-state">
                No Splits have been created on this contract yet.
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Split</th>
                      <th>Creator</th>
                      <th>Status</th>
                      <th>Participants</th>
                      <th>Collected</th>
                      <th>Created</th>
                      <th>
                        <span className="sr-only">Open</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {splits.map((split) => (
                      <tr key={split.id}>
                        <td>
                          <strong>
                            #{split.id} · {split.title}
                          </strong>
                          <span>{tokenSymbol(split.token)}</span>
                        </td>
                        <td>
                          <CopyAddressButton
                            address={split.creator}
                            label={shortAddress(split.creator)}
                          />
                        </td>
                        <td>
                          <span className={`admin-status ${split.status.toLowerCase()}`}>
                            {split.status}
                          </span>
                        </td>
                        <td>
                          {
                            split.participants.filter(
                              (participant) => participant.status === "Paid",
                            ).length
                          }
                          /{split.participantCount} paid
                        </td>
                        <td>
                          <strong>{formatAmount(split.totalPaid)}</strong>
                          <span>
                            {" "}
                            of {formatAmount(split.totalAmount)} {tokenSymbol(split.token)}
                          </span>
                        </td>
                        <td>{formatDate(split.createdAt)}</td>
                        <td>
                          <Link href={`/split/${split.id}`} aria-label={`Open ${split.title}`}>
                            ↗
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="section-block">
            <div className="section-heading">
              <div>
                <p className="eyebrow">User evidence</p>
                <h2>Unique wallet directory</h2>
              </div>
              <span className="pill pill-muted">{summary.wallets.length} wallets</span>
            </div>
            <p className="admin-section-note">
              Split has no account signup system yet. For Testnet evidence, a user is represented by
              a unique creator or participant public wallet address.
            </p>
            <div className="wallet-directory">
              {summary.wallets.map((wallet) => (
                <article key={wallet.address}>
                  <CopyAddressButton
                    address={wallet.address}
                    label={shortAddress(wallet.address)}
                  />
                  <div>
                    <span>{wallet.created} created</span>
                    <span>{wallet.assigned} assigned</span>
                    <span>{wallet.paid} paid</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
