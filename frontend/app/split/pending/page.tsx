"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useWallet } from "@/contexts/WalletContext";
import {
  formatAmount,
  getPendingSharesForWallet,
  tokenSymbol,
  type PendingShareRecord,
} from "@/lib/split-contract";
import styles from "./page.module.css";

export default function PendingSharesPage() {
  const { address, restoring, connecting, connect } = useWallet();
  const [records, setRecords] = useState<PendingShareRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) {
      setRecords([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRecords(await getPendingSharesForWallet(address));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your pending shares.");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  return (
    <AppShell active="pay">
      <header className={styles.heading}>
        <p className="eyebrow">Payments</p>
        <h1>Pay your share</h1>
        <p>Splits waiting for you.</p>
      </header>

      {restoring || loading ? (
        <div className={`contract-state ${styles.state}`}>Loading pending shares…</div>
      ) : !address ? (
        <div className={styles.empty}>
          <strong>Connect to find your shares</strong>
          <button type="button" onClick={() => void connect()} disabled={connecting}>
            {connecting ? "Connecting…" : "Connect wallet"}
          </button>
        </div>
      ) : error ? (
        <div className={`contract-state error-state ${styles.state}`}>
          <p>{error}</p>
          <button type="button" onClick={() => void load()}>
            Try again
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className={styles.empty}>
          <span aria-hidden="true">✓</span>
          <strong>You&apos;re all caught up</strong>
          <p>No shares are waiting for payment.</p>
          <Link href="/">Back home</Link>
        </div>
      ) : (
        <section className={styles.list} aria-label="Pending shares">
          {records.map(({ split, share }) => {
            const remaining = share.amountOwed - share.amountPaid;
            return (
              <Link href={`/split/${split.id}/pay`} key={split.id} className={styles.row}>
                <span className={styles.icon} aria-hidden="true">
                  ↓
                </span>
                <span className={styles.copy}>
                  <strong>{split.title}</strong>
                  <small>{share.status === "Partial" ? "Partially paid" : "Payment pending"}</small>
                </span>
                <span className={styles.amount}>
                  <strong>{formatAmount(remaining)}</strong>
                  <small>{tokenSymbol(split.token)}</small>
                </span>
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
              </Link>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}
