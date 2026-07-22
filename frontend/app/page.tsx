"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { formatAmount, getRecentSplits, tokenSymbol, type SplitRecord } from "@/lib/split-contract";

export default function Home() {
  const [splits, setSplits] = useState<SplitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setSplits(await getRecentSplits()); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not read the Split contract."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);
  const active = useMemo(() => splits.filter((split) => split.status === "Active"), [splits]);
  const completed = splits.filter((split) => split.status === "Completed").length;

  return (
    <AppShell active="home">
      <header className="page-heading"><div><p className="eyebrow">Testnet splits</p><h1>Money plans,<br />minus the chasing.</h1></div><Link className="button button-primary desktop-action" href="/split/create"><span>＋</span> New split</Link></header>

      <section className="overview-grid" aria-label="Split overview">
        <article className="hero-card lime-card"><div className="hero-card-top"><span className="pill pill-dark">On-chain</span><span className="round-icon">↗</span></div><div><p className="card-label">Splits created</p><p className="display-amount">{splits.length}</p></div><div className="hero-card-foot"><div><strong>{active.length}</strong><span>active</span></div><div><strong>{completed}</strong><span>completed</span></div></div></article>
        <article className="hero-card dark-card next-payment-card"><div className="hero-card-top"><span className="pill pill-muted">Live data</span><span className="tiny-avatar avatar-coral">S</span></div><div><p className="card-label">Connected to</p><p className="display-amount small">Stellar</p><p className="muted-copy">Testnet · direct-to-creator payments</p></div><button type="button" className="text-link" onClick={() => void load()}>Refresh <span>↻</span></button></article>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">Recent</p><h2>Latest contract activity</h2></div><span className="pill pill-muted">Latest 12</span></div>
        {loading && <div className="contract-state">Reading splits from Stellar testnet…</div>}
        {error && <div className="contract-state error-state"><p>{error}</p><button type="button" onClick={() => void load()}>Try again</button></div>}
        {!loading && !error && splits.length === 0 && <div className="contract-state"><p>No splits have been created on this contract yet.</p><Link href="/split/create">Create the first split →</Link></div>}
        <div className="split-list">
          {splits.map((split, index) => {
            const progress = split.totalAmount === 0n ? 0 : Number((split.totalPaid * 100n) / split.totalAmount);
            const symbol = tokenSymbol(split.token);
            return <Link className="split-row" href={`/split/${split.id}`} key={split.id}>
              <div className={`split-icon ${split.status === "Completed" ? "sand" : index % 2 ? "pink" : "lime"}`} aria-hidden="true">{split.status === "Completed" ? "✓" : split.participantCount}</div>
              <div className="split-copy"><strong>{split.title}</strong><span>{split.status} · {split.participantCount} participants</span></div>
              <div className="split-progress-wrap" aria-label={`${progress}% collected`}><div className="mini-progress"><span style={{ width: `${progress}%` }} /></div><span>{progress}%</span></div>
              <div className="split-total"><strong>{formatAmount(split.totalAmount)}</strong><span>{symbol}</span></div><span className="row-arrow">↗</span>
            </Link>;
          })}
        </div>
      </section>
      <Link className="button button-primary mobile-fab" href="/split/create"><span>＋</span> New split</Link>
    </AppShell>
  );
}
