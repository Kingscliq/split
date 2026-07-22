"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useWallet } from "@/contexts/WalletContext";
import { closeSplit, formatAmount, getParticipants, getSplit, payShare, shortAddress, tokenSymbol, type ParticipantShare, type SplitRecord } from "@/lib/split-contract";

const colors = ["pink", "blue", "orange", "lime"];

export default function SplitDetailPage() {
  const params = useParams<{ id: string }>();
  const splitId = Number(params.id);
  const { address, connect } = useWallet();
  const [split, setSplit] = useState<SplitRecord | null>(null);
  const [participants, setParticipants] = useState<ParticipantShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<"pay" | "close" | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  const load = useCallback(async () => {
    if (!Number.isInteger(splitId) || splitId < 0) { setError("That split ID is invalid."); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const record = await getSplit(splitId);
      if (!record) throw new Error("This split was not found on the deployed contract.");
      const shares = await getParticipants(splitId, 0, record.participantCount);
      setSplit(record); setParticipants(shares);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load this split."); }
    finally { setLoading(false); }
  }, [splitId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const ownShare = useMemo(() => participants.find((participant) => participant.participant === address) ?? null, [participants, address]);
  const symbol = split ? tokenSymbol(split.token) : "TOKEN";
  const progress = split && split.totalAmount > 0n ? Number((split.totalPaid * 100n) / split.totalAmount) : 0;
  const paidCount = participants.filter((participant) => participant.status === "Paid").length;

  async function pay() {
    const payer = address ?? await connect();
    if (!payer) return;
    const share = participants.find((participant) => participant.participant === payer);
    if (!share) return setError("The connected wallet is not a participant in this split.");
    const remaining = share.amountOwed - share.amountPaid;
    if (remaining <= 0n) return;
    setTransaction("pay"); setError(null);
    try { await payShare(splitId, payer, remaining); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Payment failed."); }
    finally { setTransaction(null); }
  }

  async function close() {
    const creator = address ?? await connect();
    if (!creator) return;
    if (creator !== split?.creator) return setError("Only the creator can close this split.");
    setTransaction("close"); setError(null);
    try { await closeSplit(splitId, creator); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not close the split."); }
    finally { setTransaction(null); }
  }

  async function copyLink() {
    const url = `${window.location.origin}/split/${splitId}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const temporaryInput = document.createElement("textarea");
        temporaryInput.value = url;
        temporaryInput.style.position = "fixed";
        temporaryInput.style.opacity = "0";
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        const copied = document.execCommand("copy");
        temporaryInput.remove();
        if (!copied) throw new Error("Clipboard copy failed.");
      }
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
    window.setTimeout(() => setCopyStatus("idle"), 2200);
  }

  function shareOnWhatsApp() {
    const url = `${window.location.origin}/split/${splitId}`;
    const message = encodeURIComponent(`Pay your share for ${split?.title ?? "this split"}: ${url}`);
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
  }

  if (loading) return <AppShell><div className="contract-state detail-state">Reading split #{splitId} from Stellar testnet…</div></AppShell>;
  if (error && !split) return <AppShell><div className="contract-state detail-state error-state"><p>{error}</p><Link href="/">Back to dashboard</Link></div></AppShell>;
  if (!split) return null;
  const remainingShare = ownShare ? ownShare.amountOwed - ownShare.amountPaid : 0n;

  return (
    <AppShell>
      <div className="detail-heading"><Link href="/" className="back-button" aria-label="Back to dashboard">←</Link><div className="detail-actions"><button type="button" aria-label={copyStatus === "copied" ? "Link copied" : "Copy link"} onClick={() => void copyLink()}>{copyStatus === "copied" ? "✓" : "↗"}</button>{address === split.creator && split.status === "Active" && <button type="button" onClick={() => void close()} disabled={transaction !== null} aria-label="Close split">{transaction === "close" ? "…" : "×"}</button>}</div></div>
      {error && <div className="inline-contract-error" role="alert">{error}</div>}

      <section className="detail-hero lime-card">
        <span className="pill pill-dark">{split.status} split</span>
        <div className="detail-title"><p>Split #{split.id}</p><h1>{split.title}</h1></div>
        <div className="detail-amount"><span>Collected</span><strong><i>{symbol === "USDC" ? "$" : "✦"}</i>{formatAmount(split.totalPaid)} <small>{symbol}</small></strong><p>of {formatAmount(split.totalAmount)} {symbol}</p></div>
        <div className="detail-progress"><span style={{ width: `${progress}%` }} /></div>
        <div className="detail-metrics"><div><span>Remaining</span><strong>{formatAmount(split.totalAmount - split.totalPaid)} {symbol}</strong></div><div><span>{ownShare ? "Your share" : "Participants"}</span><strong>{ownShare ? `${formatAmount(ownShare.amountOwed)} ${symbol}` : split.participantCount}</strong></div></div>
      </section>

      <div className="detail-grid">
        <section className="people-card">
          <div className="section-heading compact"><div><p className="eyebrow">The group</p><h2>Who has paid?</h2></div><span className="pill pill-muted">{paidCount} of {participants.length} paid</span></div>
          <div className="status-list">{participants.map((person, index) => <div className="status-row" key={person.participant}>
            <span className={`avatar avatar-${colors[index % colors.length]}`}>{person.displayName.slice(0, 1).toUpperCase() || "?"}</span>
            <div><strong>{person.displayName || "Unnamed"}</strong><span title={person.participant}>{shortAddress(person.participant)}</span></div>
            <div className="status-amount"><strong>{formatAmount(person.amountPaid)} / {formatAmount(person.amountOwed)}</strong><span>{symbol}</span></div>
            <span className={`status-badge ${person.status.toLowerCase()}`}>{person.status === "Paid" ? "✓ " : ""}{person.status}</span>
          </div>)}</div>
        </section>

        <aside className="pay-card">
          <div><span className="mini-kicker">{ownShare ? "Your turn" : "Direct payment"}</span><h2>{ownShare ? `Send ${ownShare.displayName || "your"} share` : address ? "You’re not in this split" : "Connect your wallet"}</h2><p>{symbol} goes directly to the Split creator. The contract never holds the funds.</p></div>
          <div className="pay-amount"><span>{symbol === "USDC" ? "$" : "✦"}</span><strong>{formatAmount(remainingShare)}</strong><small>{symbol}</small></div>
          <button className="button button-dark button-wide" type="button" disabled={transaction !== null || split.status !== "Active" || (!!ownShare && remainingShare <= 0n)} onClick={() => void pay()}>{transaction === "pay" ? "Confirming…" : !address ? "Connect to pay" : ownShare ? remainingShare > 0n ? "Pay remaining share" : "Share paid" : "Not a participant"} <span>→</span></button>
          <small className="network-note dark-note"><span className="status-dot" /> {address ? `Connected · ${shortAddress(address)}` : "Freighter · Stellar testnet"}</small>
        </aside>
      </div>

      <section className="share-strip"><div><span className="share-icon">↗</span><div><strong>Bring everyone in</strong><p>Share this split with the group.</p></div></div><div className="share-buttons"><button type="button" className={copyStatus === "copied" ? "copy-success" : copyStatus === "failed" ? "copy-failed" : ""} onClick={() => void copyLink()}>{copyStatus === "copied" ? "✓ Copied" : copyStatus === "failed" ? "Copy failed" : "Copy link"}</button><button className="whatsapp" type="button" aria-label="Share this split on WhatsApp" onClick={shareOnWhatsApp}><svg aria-hidden="true" viewBox="0 0 32 32"><path fill="currentColor" d="M16.04 3A12.9 12.9 0 0 0 5.1 22.73L3.4 29l6.42-1.68A12.98 12.98 0 1 0 16.04 3Zm0 23.77c-2.12 0-4.2-.58-6-1.68l-.43-.25-3.81 1 1.02-3.71-.28-.45a10.74 10.74 0 1 1 9.5 5.09Zm5.9-8.05c-.32-.16-1.92-.95-2.22-1.06-.3-.1-.51-.16-.73.16-.21.32-.83 1.06-1.02 1.28-.19.21-.38.24-.7.08-.33-.16-1.37-.5-2.6-1.6a9.73 9.73 0 0 1-1.8-2.23c-.2-.32-.02-.5.14-.66.15-.14.33-.37.49-.56.16-.19.21-.32.32-.54.1-.21.05-.4-.03-.56-.08-.16-.73-1.75-1-2.4-.26-.63-.53-.54-.73-.55h-.62c-.22 0-.57.08-.87.4-.3.33-1.13 1.11-1.13 2.7 0 1.6 1.16 3.14 1.32 3.36.16.21 2.28 3.48 5.53 4.89.77.33 1.37.53 1.84.68.78.24 1.48.21 2.04.13.62-.09 1.92-.79 2.2-1.54.26-.76.26-1.41.18-1.54-.08-.14-.3-.22-.62-.38Z"/></svg><span>Share on WhatsApp</span></button></div></section>
    </AppShell>
  );
}
