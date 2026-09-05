"use client";

import { useEffect } from "react";
import { formatAmount, shortAddress, transactionExplorerUrl } from "@/lib/split-contract";
import type { TransactionApprovalState } from "@/lib/wallet/types";

type Props = {
  state: TransactionApprovalState;
  onApprove: () => void;
  onCancel: () => void;
  onClose: () => void;
};

const stageCopy = {
  preparing: {
    eyebrow: "Preparing safely",
    title: "Checking this transaction",
    body: "Split is building and simulating the contract call on Stellar Testnet.",
  },
  signing: {
    eyebrow: "Approval received",
    title: "Securing your signature",
    body: "Your wallet is signing the transaction you just reviewed.",
  },
  submitting: {
    eyebrow: "Signature secured",
    title: "Submitting to Stellar",
    body: "Split is sending the signed transaction to Stellar Testnet.",
  },
  confirming: {
    eyebrow: "Submitted",
    title: "Waiting for confirmation",
    body: "Stellar is confirming the transaction. Keep this window open.",
  },
  success: {
    eyebrow: "Confirmed on Stellar",
    title: "Transaction complete",
    body: "The confirmed result is now being loaded in Split.",
  },
} as const;

function actionTitle(action: TransactionApprovalState["request"]["action"]) {
  if (action === "create") return "Create this split?";
  if (action === "pay") return "Pay this share?";
  return "Close this split?";
}

function approvalLabel(action: TransactionApprovalState["request"]["action"]) {
  if (action === "create") return "Approve & create";
  if (action === "pay") return "Approve payment";
  return "Approve closing";
}

function impactCopy(request: TransactionApprovalState["request"]) {
  if (request.action === "create") {
    return {
      label: "What happens",
      title: "Creates a payment request",
      body: "No funds leave your wallet. Participants pay their assigned shares separately.",
    };
  }
  if (request.action === "pay") {
    return {
      label: "What happens",
      title: "Transfers your assigned share",
      body: request.recipient
        ? `The payment goes to the Split organizer at ${shortAddress(request.recipient)}.`
        : "The payment goes to the Split organizer.",
    };
  }
  return {
    label: "This cannot be undone",
    title: "Stops all future payments",
    body: "Payments already completed remain recorded, but pending participants can no longer pay.",
  };
}

const progressStages = ["Signing", "Submitting", "Confirming"] as const;

export function TransactionApprovalDialog({ state, onApprove, onCancel, onClose }: Props) {
  const { request, stage } = state;
  const isReview = stage === "review";
  const isFailure = stage === "failure";
  const signatureCancelled = isFailure && /signature was cancelled/i.test(state.error ?? "");
  const copy = stage !== "review" && stage !== "failure" ? stageCopy[stage] : null;
  const impact = impactCopy(request);
  const requestedChanged =
    request.amount !== undefined &&
    request.requestedAmount !== undefined &&
    request.amount !== request.requestedAmount;
  const waivedAmount =
    requestedChanged && request.requestedAmount! > request.amount!
      ? request.requestedAmount! - request.amount!
      : 0n;
  const activeProgress =
    stage === "signing" ? 0 : stage === "submitting" ? 1 : stage === "confirming" ? 2 : 3;

  useEffect(() => {
    if (!isReview) return;
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", cancelOnEscape);
    return () => window.removeEventListener("keydown", cancelOnEscape);
  }, [isReview, onCancel]);

  return (
    <div className="transaction-approval-backdrop">
      <section
        className="transaction-approval-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-approval-title"
      >
        {isReview ? (
          <>
            <p className="eyebrow">Review on Stellar Testnet</p>
            <h2 id="transaction-approval-title">{actionTitle(request.action)}</h2>
            <p>Confirm that these details match what you intend to authorize.</p>

            <div className={`transaction-review-impact ${request.action}`}>
              <span>{impact.label}</span>
              <strong>{impact.title}</strong>
              <small>{impact.body}</small>
            </div>

            <div className="transaction-review-purpose">
              <span>{request.action === "close" ? "Split to close" : "Purpose"}</span>
              <strong>{request.title}</strong>
              {request.splitId !== undefined && <small>Split #{request.splitId}</small>}
            </div>

            {(request.amount !== undefined || request.networkFee !== undefined) && (
              <dl className="transaction-review-money">
                {request.amount !== undefined && (
                  <div>
                    <dt>{request.action === "pay" ? "You will pay" : "Total to collect"}</dt>
                    <dd>
                      {formatAmount(request.amount)} {request.asset}
                    </dd>
                  </div>
                )}
                {request.networkFee !== undefined && (
                  <div>
                    <dt>Network fee</dt>
                    <dd>{formatAmount(request.networkFee, 7)} XLM</dd>
                  </div>
                )}
              </dl>
            )}

            {requestedChanged && (
              <dl className="transaction-review-adjustment">
                <div>
                  <dt>Originally requested</dt>
                  <dd>
                    {formatAmount(request.requestedAmount!)} {request.asset}
                  </dd>
                </div>
                {waivedAmount > 0n && (
                  <div>
                    <dt>Waived remainder</dt>
                    <dd>
                      {formatAmount(waivedAmount)} {request.asset}
                    </dd>
                  </div>
                )}
              </dl>
            )}

            {request.participants && request.participants.length > 0 && (
              <div className="transaction-review-participants">
                <div>
                  <span>Participants</span>
                  <small>{request.participants.length}</small>
                </div>
                <ul>
                  {request.participants.map((participant) => (
                    <li key={participant.address}>
                      <span>
                        <strong>{participant.displayName}</strong>
                        <small>{shortAddress(participant.address)}</small>
                      </span>
                      {participant.amount !== undefined && (
                        <b>
                          {formatAmount(participant.amount)} {request.asset}
                        </b>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <details className="transaction-review-details">
              <summary>Transaction details</summary>
              <dl className="transaction-review-technical">
                <div>
                  <dt>Active account</dt>
                  <dd title={request.account}>{shortAddress(request.account)}</dd>
                </div>
                {request.recipient && (
                  <div>
                    <dt>Recipient</dt>
                    <dd title={request.recipient}>{shortAddress(request.recipient)}</dd>
                  </div>
                )}
                <div>
                  <dt>Network</dt>
                  <dd>{request.network}</dd>
                </div>
                <div>
                  <dt>Contract</dt>
                  <dd title={request.contractId}>{shortAddress(request.contractId)}</dd>
                </div>
              </dl>
            </details>

            <div className="transaction-approval-actions">
              <button
                type="button"
                className="transaction-approval-cancel"
                onClick={onCancel}
                autoFocus
              >
                Cancel
              </button>
              <button type="button" className="transaction-approval-confirm" onClick={onApprove}>
                {approvalLabel(request.action)} →
              </button>
            </div>
            <small className="transaction-approval-note">
              Split will sign only the transaction prepared for the details above.
            </small>
          </>
        ) : isFailure ? (
          <div
            className={`transaction-stage-view failure${signatureCancelled ? " cancelled" : ""}`}
          >
            <span className="transaction-stage-icon" aria-hidden="true">
              {signatureCancelled ? "×" : "!"}
            </span>
            <p className="eyebrow">
              {signatureCancelled ? "Nothing was submitted" : "Transaction stopped"}
            </p>
            <h2 id="transaction-approval-title">
              {signatureCancelled ? "Signature cancelled" : "This action needs attention"}
            </h2>
            <p role="alert">{state.error ?? "The transaction could not be completed."}</p>
            {state.hash && (
              <a
                className="transaction-stage-explorer"
                href={transactionExplorerUrl(state.hash)}
                target="_blank"
                rel="noreferrer"
              >
                View on Stellar Expert ↗
              </a>
            )}
            <button type="button" className="transaction-approval-confirm" onClick={onClose}>
              Return to Split
            </button>
          </div>
        ) : (
          <div className={`transaction-stage-view ${stage}`} aria-live="polite">
            <span className="transaction-stage-icon" aria-hidden="true">
              {stage === "success" ? "✓" : "↻"}
            </span>
            <p className="eyebrow">{copy?.eyebrow}</p>
            <h2 id="transaction-approval-title">{copy?.title}</h2>
            <p>{copy?.body}</p>
            {stage !== "preparing" && (
              <div className="transaction-stage-progress" aria-label="Transaction progress">
                {progressStages.map((label, index) => (
                  <span
                    key={label}
                    className={
                      index < activeProgress ? "done" : index === activeProgress ? "active" : ""
                    }
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
            {state.hash && <code title={state.hash}>{shortAddress(state.hash)}</code>}
          </div>
        )}
      </section>
    </div>
  );
}
