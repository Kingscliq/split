"use client";

import { useCallback, useEffect, useState } from "react";
import { formatAmount, shortAddress, transactionExplorerUrl } from "@/lib/split-contract";
import {
  getIndexedSplitEvents,
  isActivityHistoryConfigured,
  type IndexedSplitEvent,
} from "@/lib/supabase-history";

const labels: Record<IndexedSplitEvent["eventType"], { icon: string; title: string }> = {
  created: { icon: "＋", title: "Split created" },
  share_paid: { icon: "✓", title: "Payment received" },
  completed: { icon: "★", title: "Collection completed" },
  closed: { icon: "×", title: "Split closed" },
};

function eventDescription(event: IndexedSplitEvent, symbol: string): string {
  if (event.eventType === "share_paid" && event.amount !== null) {
    return `${formatAmount(event.amount)} ${symbol} paid${event.actor ? ` by ${shortAddress(event.actor)}` : ""}`;
  }
  if (event.eventType === "created")
    return event.actor ? `Created by ${shortAddress(event.actor)}` : "Collection opened on-chain";
  if (event.eventType === "completed") return "Every assigned share has been paid";
  return event.actor ? `Closed by ${shortAddress(event.actor)}` : "Collection closed on-chain";
}

export function SplitActivityTimeline({ splitId, symbol }: { splitId: number; symbol: string }) {
  const [events, setEvents] = useState<IndexedSplitEvent[]>([]);
  const [loading, setLoading] = useState(isActivityHistoryConfigured());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isActivityHistoryConfigured()) return;
    setLoading(true);
    setError(null);
    try {
      setEvents(await getIndexedSplitEvents(splitId));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Transaction history is temporarily unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [splitId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  if (!isActivityHistoryConfigured()) return null;

  return (
    <section className="activity-card">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Permanent proof</p>
          <h2>On-chain activity</h2>
        </div>
        <button
          className="filter-button"
          type="button"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "Syncing…" : "Refresh ↻"}
        </button>
      </div>
      {error && <div className="activity-message error-state">{error}</div>}
      {!error && loading && events.length === 0 && (
        <div className="activity-message">Loading indexed transactions…</div>
      )}
      {!error && !loading && events.length === 0 && (
        <div className="activity-message">
          No indexed events yet. The first indexer run will backfill recent Testnet activity.
        </div>
      )}
      <div className="activity-list">
        {events.map((event) => {
          const label = labels[event.eventType];
          return (
            <article key={event.eventId}>
              <span className={`activity-icon ${event.eventType}`} aria-hidden="true">
                {label.icon}
              </span>
              <div>
                <strong>{label.title}</strong>
                <p>{eventDescription(event, symbol)}</p>
                <time dateTime={event.ledgerClosedAt}>
                  {new Date(event.ledgerClosedAt).toLocaleString()}
                </time>
              </div>
              <a
                href={transactionExplorerUrl(event.transactionHash)}
                target="_blank"
                rel="noreferrer"
              >
                View transaction ↗
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}
