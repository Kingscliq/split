"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FREIGHTER_INSTALL_URL, useWallet } from "@/contexts/WalletContext";
import {
  formatAmount,
  getParticipant,
  getSplit,
  getTokenBalance,
  isTransactionApprovalCancelled,
  payShare,
  shortAddress,
  TOKEN_CONTRACTS,
  tokenSymbol,
  type SplitRecord,
} from "@/lib/split-contract";
import styles from "./page.module.css";

type PayIssue = {
  kind: "wallet_missing" | "wrong_network" | "funding" | "not_participant" | "transaction";
  message: string;
};

export default function PaySharePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const splitId = Number(params.id);
  const { address, restoring, connecting, connect, signer } = useWallet();
  const [split, setSplit] = useState<SplitRecord | null>(null);
  const [ownShare, setOwnShare] = useState<Awaited<ReturnType<typeof getParticipant>>>(null);
  const [loading, setLoading] = useState(true);
  const [shareLoading, setShareLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payIssue, setPayIssue] = useState<PayIssue | null>(null);
  const [paying, setPaying] = useState(false);

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
      setSplit(record);
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Could not load this payment.");
    } finally {
      setLoading(false);
    }
  }, [splitId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    if (!address) return;

    let active = true;
    async function loadOwnShare() {
      setShareLoading(true);
      try {
        const share = await getParticipant(splitId, address as string);
        if (active) setOwnShare(share);
      } catch (caught) {
        if (!active) return;
        setOwnShare(null);
        setLoadError(caught instanceof Error ? caught.message : "Could not find your share.");
      } finally {
        if (active) setShareLoading(false);
      }
    }
    void loadOwnShare();

    return () => {
      active = false;
    };
  }, [address, splitId]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const currentShare = ownShare?.participant === address ? ownShare : null;
  const remaining = currentShare ? currentShare.amountOwed - currentShare.amountPaid : 0n;
  const symbol = split ? tokenSymbol(split.token) : "TOKEN";
  const canPay = Boolean(
    split &&
      currentShare &&
      split.status === "Active" &&
      currentShare.status !== "Paid" &&
      remaining > 0n,
  );

  function cancel() {
    if (paying) return;
    router.push(`/split/${splitId}`);
  }

  async function signIn() {
    setPayIssue(null);
    await connect((issue) => {
      setPayIssue({
        kind:
          issue.code === "missing"
            ? "wallet_missing"
            : issue.code === "wrong_network"
              ? "wrong_network"
              : "transaction",
        message: issue.message,
      });
    });
  }

  async function pay() {
    if (!split || !address || !currentShare || !canPay) return;
    setPayIssue(null);
    setPaying(true);
    try {
      const assetBalance = await getTokenBalance(split.token, address);
      const xlmBalance =
        split.token === TOKEN_CONTRACTS.XLM
          ? assetBalance
          : await getTokenBalance(TOKEN_CONTRACTS.XLM, address);

      if (xlmBalance <= 0n) {
        setPayIssue({
          kind: "funding",
          message: "This wallet needs Testnet XLM before it can make this payment.",
        });
        return;
      }
      if (assetBalance < remaining) {
        setPayIssue({
          kind: "funding",
          message: `You have ${formatAmount(assetBalance)} ${symbol} and need ${formatAmount(remaining)} ${symbol}.`,
        });
        return;
      }

      const result = await payShare(splitId, address, remaining, signer, {
        title: split.title,
        asset: symbol,
        recipient: split.creator,
      });
      router.replace(`/split/${splitId}?action=pay&tx=${result.hash}`);
    } catch (caught) {
      if (isTransactionApprovalCancelled(caught)) return;
      const message = caught instanceof Error ? caught.message : "Payment failed.";
      setPayIssue({
        kind: /no Testnet XLM|not enough|insufficient|fund/i.test(message)
          ? "funding"
          : "transaction",
        message,
      });
    } finally {
      setPaying(false);
    }
  }

  const isBusy = restoring || loading || Boolean(address && shareLoading);

  return (
    <main className={styles.screen}>
      <section
        className={styles.paymentModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-share-title"
      >
        {isBusy ? (
          <div className={styles.state}>Finding your share…</div>
        ) : loadError || !split ? (
          <div className={styles.state}>
            <p className="eyebrow">Payment unavailable</p>
            <h1 id="pay-share-title">We couldn’t open this split.</h1>
            <p>{loadError}</p>
            <Link href="/">Back home</Link>
          </div>
        ) : !address ? (
          <div className={styles.state}>
            <p className="eyebrow">Pay your share</p>
            <h1 id="pay-share-title">Sign in to continue</h1>
            <p>Use the account this payment was assigned to.</p>
            {payIssue && <PaymentIssue issue={payIssue} />}
            <div className={styles.actions}>
              <button type="button" className={styles.cancelButton} onClick={cancel}>
                Cancel
              </button>
              <button type="button" onClick={() => void signIn()} disabled={connecting}>
                {connecting ? "Signing in…" : "Sign in"}
              </button>
            </div>
          </div>
        ) : !currentShare ? (
          <div className={styles.state}>
            <p className="eyebrow">Wrong account</p>
            <h1 id="pay-share-title">This payment isn’t assigned to you.</h1>
            <p>Sign in with the account the organizer added to this split.</p>
            <button type="button" className={styles.singleButton} onClick={cancel}>
              Cancel
            </button>
          </div>
        ) : currentShare.status === "Paid" || remaining <= 0n ? (
          <div className={styles.state}>
            <span className={styles.paidMark}>✓</span>
            <p className="eyebrow">Payment complete</p>
            <h1 id="pay-share-title">Hello {currentShare.displayName || "there"},</h1>
            <p>Your share for {split.title} has already been paid.</p>
            <button type="button" className={styles.singleButton} onClick={cancel}>
              Done
            </button>
          </div>
        ) : (
          <>
            <header className={styles.header}>
              <p className="eyebrow">Pay your share</p>
              <h1 id="pay-share-title">Hello {currentShare.displayName || "there"},</h1>
              <p>{split.title}</p>
            </header>

            <div className={styles.share}>
              <span>Your share</span>
              <strong>
                {formatAmount(remaining)} <small>{symbol}</small>
              </strong>
            </div>

            {split.status !== "Active" && (
              <div className={styles.notice}>This split is {split.status.toLowerCase()}.</div>
            )}
            {payIssue && <PaymentIssue issue={payIssue} />}

            <div className={`${styles.actions} ${styles.payActions}`}>
              <button
                type="button"
                className={styles.payButton}
                onClick={() => void pay()}
                disabled={paying || !canPay}
              >
                {paying ? "Checking…" : `Pay ${formatAmount(remaining)} ${symbol}`}
              </button>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={cancel}
                disabled={paying}
              >
                Cancel
              </button>
            </div>
            <small className={styles.account}>Connected as {shortAddress(address)}</small>
          </>
        )}
      </section>
    </main>
  );
}

function PaymentIssue({ issue }: { issue: PayIssue }) {
  return (
    <div className={styles.error} role="alert">
      <strong>{issue.kind === "funding" ? "Wallet needs funds" : "Payment needs attention"}</strong>
      <span>{issue.message}</span>
      {issue.kind === "wallet_missing" && (
        <a href={FREIGHTER_INSTALL_URL} target="_blank" rel="noreferrer">
          Install Freighter
        </a>
      )}
      {issue.kind === "funding" && <Link href="/onboarding#fund-testnet-wallet">Fund wallet</Link>}
    </div>
  );
}
