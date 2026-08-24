"use client";

import { useState } from "react";
import { transactionExplorerUrl } from "@/lib/split-contract";

export type ReceiptAction = "create" | "pay" | "close";
export type ReceiptData = { action: ReceiptAction; hash: string };

const receiptCopy: Record<ReceiptAction, { eyebrow: string; title: string; body: string }> = {
  create: {
    eyebrow: "Split created",
    title: "Confirmed on Stellar Testnet",
    body: "The collection is on-chain and ready to share with participants.",
  },
  pay: {
    eyebrow: "Payment confirmed",
    title: "Your share is recorded",
    body: "The payment reached the creator and the Split status was refreshed from the contract.",
  },
  close: {
    eyebrow: "Split closed",
    title: "Closure confirmed on Testnet",
    body: "This Split no longer accepts participant payments.",
  },
};

export function TransactionReceipt({ action, hash }: ReceiptData) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const copy = receiptCopy[action];

  async function copyHash() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(hash);
      } else {
        const input = document.createElement("textarea");
        input.value = hash;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("Copy failed.");
      }
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
    window.setTimeout(() => setCopyStatus("idle"), 2200);
  }

  return (
    <section className="transaction-receipt" aria-labelledby="transaction-receipt-title">
      <span className="receipt-check" aria-hidden="true">✓</span>
      <div className="receipt-copy">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="transaction-receipt-title">{copy.title}</h2>
        <p>{copy.body}</p>
        <code title={hash}>{hash}</code>
      </div>
      <div className="receipt-actions">
        <a href={transactionExplorerUrl(hash)} target="_blank" rel="noreferrer">View on Stellar Expert <span>↗</span></a>
        <button type="button" onClick={() => void copyHash()} className={copyStatus === "copied" ? "copied" : copyStatus === "failed" ? "failed" : ""}>
          {copyStatus === "copied" ? "Hash copied ✓" : copyStatus === "failed" ? "Copy failed" : "Copy transaction hash"}
        </button>
      </div>
    </section>
  );
}
