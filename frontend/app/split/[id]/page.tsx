"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CopyAddressButton } from "@/components/CopyAddressButton";
import { SplitActivityTimeline } from "@/components/SplitActivityTimeline";
import { type ReceiptAction, type ReceiptData } from "@/components/TransactionReceipt";
import { useWallet, type WalletIssue } from "@/contexts/WalletContext";
import {
  closeSplit,
  formatAmount,
  getParticipants,
  getSplit,
  isTransactionApprovalCancelled,
  tokenSymbol,
  type ParticipantShare,
  type SplitRecord,
} from "@/lib/split-contract";
import styles from "./page.module.css";

const colors = ["pink", "blue", "orange", "lime"];
export default function SplitDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const splitId = Number(params.id);
  const { address, restoring, connect, signer } = useWallet();
  const [split, setSplit] = useState<SplitRecord | null>(null);
  const [participants, setParticipants] = useState<ParticipantShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<"close" | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [transactionReceipt, setTransactionReceipt] = useState<ReceiptData | null>(null);

  const queryReceipt = useMemo<ReceiptData | null>(() => {
    const hash = searchParams.get("tx");
    const action = searchParams.get("action");
    if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) return null;
    if (action !== "create" && action !== "pay" && action !== "close") return null;
    return { action, hash };
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!Number.isInteger(splitId) || splitId < 0) {
      setLoadError("That split ID is invalid.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const record = await getSplit(splitId);
      if (!record) throw new Error("This split was not found on the deployed contract.");
      const shares = await getParticipants(splitId, 0, record.participantCount);
      setSplit(record);
      setParticipants(shares);
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Could not load this split.");
    } finally {
      setLoading(false);
    }
  }, [splitId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const ownShare = useMemo(
    () => participants.find((participant) => participant.participant === address) ?? null,
    [participants, address],
  );
  const visibleParticipants = useMemo(
    () =>
      ownShare
        ? [ownShare, ...participants.filter((participant) => participant.participant !== address)]
        : participants,
    [address, ownShare, participants],
  );
  const symbol = split ? tokenSymbol(split.token) : "TOKEN";
  const progress =
    split && split.totalAmount > 0n ? Number((split.totalPaid * 100n) / split.totalAmount) : 0;
  const paidCount = participants.filter((participant) => participant.status === "Paid").length;

  function recordReceipt(action: ReceiptAction, hash: string) {
    setTransactionReceipt({ action, hash });
    const url = new URL(window.location.href);
    url.searchParams.set("action", action);
    url.searchParams.set("tx", hash);
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }

  async function close() {
    if (!split) return;
    setCloseError(null);
    const connectionIssues: WalletIssue[] = [];
    const creator =
      address ??
      (await connect((issue) => {
        connectionIssues.push(issue);
      }));
    const connectionIssue = connectionIssues[0];
    if (!creator) {
      if (connectionIssue) setCloseError(connectionIssue.message);
      return;
    }
    if (creator !== split.creator) return setCloseError("Only the creator can close this split.");
    setTransaction("close");
    try {
      const result = await closeSplit(splitId, creator, signer, split.title);
      recordReceipt("close", result.hash);
      await load();
    } catch (caught) {
      if (isTransactionApprovalCancelled(caught)) return;
      setCloseError(caught instanceof Error ? caught.message : "Could not close the split.");
    } finally {
      setTransaction(null);
    }
  }

  function getShareUrl() {
    return `${window.location.origin}/split/${splitId}`;
  }

  async function copyLink() {
    const url = getShareUrl();
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
    const message = encodeURIComponent(
      `Pay your share for ${split?.title ?? "this split"}: ${getShareUrl()}`,
    );
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
  }

  if (loading)
    return (
      <AppShell>
        <div className="contract-state detail-state">
          Reading split #{splitId} from Stellar testnet…
        </div>
      </AppShell>
    );
  if (loadError && !split)
    return (
      <AppShell>
        <div className="contract-state detail-state error-state">
          <p>{loadError}</p>
          <Link href="/">Back to dashboard</Link>
        </div>
      </AppShell>
    );
  if (!split) return null;
  if (restoring)
    return (
      <AppShell>
        <div className="contract-state detail-state">Restoring your account…</div>
      </AppShell>
    );
  const canPay = Boolean(
    ownShare &&
      ownShare.status !== "Paid" &&
      ownShare.amountOwed - ownShare.amountPaid > 0n &&
      split.status === "Active",
  );
  const isCreator = address === split.creator;
  const confirmedTransaction = transactionReceipt ?? queryReceipt;
  const confirmationLabel =
    confirmedTransaction?.action === "create"
      ? "Split created"
      : confirmedTransaction?.action === "pay"
        ? "Payment confirmed"
        : confirmedTransaction?.action === "close"
          ? "Split closed"
          : null;

  return (
    <AppShell>
      <main className={styles.receiptPage}>
        <div className={styles.pageHeading}>
          <Link href="/" className="back-button" aria-label="Back to dashboard">
            ←
          </Link>
          {isCreator && split.status === "Active" && (
            <div className={styles.headingActions}>
              <button
                type="button"
                onClick={() => void close()}
                disabled={transaction !== null}
                aria-label="Close this split"
              >
                {transaction === "close" ? "Closing…" : "Close split"}
              </button>
              {closeError && (
                <span className={styles.headingError} role="alert">
                  {closeError}
                </span>
              )}
            </div>
          )}
        </div>

        <section className={styles.receipt}>
          {confirmationLabel && (
            <div className={styles.confirmation}>
              <span aria-hidden="true">✓</span>
              <strong>{confirmationLabel}</strong>
              <small>Confirmed on Stellar Testnet</small>
            </div>
          )}

          <div className={styles.receiptSummary}>
            <div className={styles.summaryMeta}>
              <span className={`${styles.status} ${styles[split.status.toLowerCase()]}`}>
                {split.status}
              </span>
              <small>#{split.id}</small>
            </div>
            <h1>{split.title}</h1>
            <p>Total amount</p>
            <strong className={styles.total}>
              {symbol === "USDC" ? "$" : "✦"}
              {formatAmount(split.totalAmount)} <small>{symbol}</small>
            </strong>
          </div>

          <div className={styles.progress} aria-label={`${progress}% collected`}>
            <span style={{ width: `${progress}%` }} />
          </div>

          <dl className={styles.receiptTotals}>
            <div>
              <dt>Collected</dt>
              <dd>
                {formatAmount(split.totalPaid)} {symbol}
              </dd>
            </div>
            <div>
              <dt>Remaining</dt>
              <dd>
                {formatAmount(split.totalAmount - split.totalPaid)} {symbol}
              </dd>
            </div>
            <div>
              <dt>Payment status</dt>
              <dd>
                {paidCount} of {participants.length} paid
              </dd>
            </div>
          </dl>

          <section className={styles.sharePanel} aria-label="Share this split">
            <div className={styles.shareCopy}>
              <strong>Share with the group</strong>
              <span>Send everyone their payment link.</span>
            </div>
            <div className={styles.shareButtons}>
              <button
                type="button"
                className={copyStatus === "failed" ? styles.copyFailed : ""}
                onClick={() => void copyLink()}
                aria-live="polite"
              >
                {copyStatus === "copied"
                  ? "✓ Copied"
                  : copyStatus === "failed"
                    ? "Copy failed"
                    : "Copy link"}
              </button>
              <button type="button" className={styles.whatsappButton} onClick={shareOnWhatsApp}>
                <svg aria-hidden="true" viewBox="0 0 32 32">
                  <path
                    fill="currentColor"
                    d="M16.04 3A12.9 12.9 0 0 0 5.1 22.73L3.4 29l6.42-1.68A12.98 12.98 0 1 0 16.04 3Zm0 23.77c-2.12 0-4.2-.58-6-1.68l-.43-.25-3.81 1 1.02-3.71-.28-.45a10.74 10.74 0 1 1 9.5 5.09Zm5.9-8.05c-.32-.16-1.92-.95-2.22-1.06-.3-.1-.51-.16-.73.16-.21.32-.83 1.06-1.02 1.28-.19.21-.38.24-.7.08-.33-.16-1.37-.5-2.6-1.6a9.73 9.73 0 0 1-1.8-2.23c-.2-.32-.02-.5.14-.66.15-.14.33-.37.49-.56.16-.19.21-.32.32-.54.1-.21.05-.4-.03-.56-.08-.16-.73-1.75-1-2.4-.26-.63-.53-.54-.73-.55h-.62c-.22 0-.57.08-.87.4-.3.33-1.13 1.11-1.13 2.7 0 1.6 1.16 3.14 1.32 3.36.16.21 2.28 3.48 5.53 4.89.77.33 1.37.53 1.84.68.78.24 1.48.21 2.04.13.62-.09 1.92-.79 2.2-1.54.26-.76.26-1.41.18-1.54-.08-.14-.3-.22-.62-.38Z"
                  />
                </svg>
                <span>Share on WhatsApp</span>
              </button>
            </div>
          </section>

          <div className={styles.participantHeading}>
            <strong>Participants</strong>
            <span>
              {paidCount}/{participants.length} paid
            </span>
          </div>

          <div className={styles.participantList}>
            {visibleParticipants.map((person, index) => (
              <div className={styles.participant} key={person.participant}>
                <span className={`avatar avatar-${colors[index % colors.length]}`}>
                  {person.displayName.slice(0, 1).toUpperCase() || "?"}
                </span>
                <div className={styles.participantIdentity}>
                  <strong>
                    {person.displayName || "Unnamed"}
                    {person.participant === address ? " · You" : ""}
                  </strong>
                  <details>
                    <summary>Wallet details</summary>
                    <CopyAddressButton address={person.participant} />
                  </details>
                </div>
                <div className={styles.participantAmount}>
                  <strong>
                    {formatAmount(person.amountOwed)} {symbol}
                  </strong>
                  <span>{person.status === "Paid" ? "Paid" : person.status}</span>
                </div>
              </div>
            ))}
          </div>

          {canPay && (
            <div className={styles.receiptAction}>
              <Link href={`/split/${splitId}/pay`}>Pay your share</Link>
            </div>
          )}

          <footer className={styles.receiptFooter}>
            <div>
              <span>Stellar Testnet</span>
              <small>Payments go directly to the split creator.</small>
            </div>
            <details className={styles.receiptDetails}>
              <summary>Transaction details</summary>
              <SplitActivityTimeline splitId={split.id} symbol={symbol} />
            </details>
          </footer>
        </section>
      </main>
    </AppShell>
  );
}
