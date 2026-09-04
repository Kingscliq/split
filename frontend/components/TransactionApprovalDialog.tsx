"use client";

import { formatAmount, shortAddress } from "@/lib/split-contract";
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
    body: "Your embedded wallet is signing the transaction you just reviewed.",
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

export function TransactionApprovalDialog({ state, onApprove, onCancel, onClose }: Props) {
  const { request, stage } = state;
  const isReview = stage === "review";
  const isFailure = stage === "failure";
  const copy = stage !== "review" && stage !== "failure" ? stageCopy[stage] : null;

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

            <div className="transaction-review-purpose">
              <span>{request.action === "close" ? "Split to close" : "Purpose"}</span>
              <strong>{request.title}</strong>
              {request.splitId !== undefined && <small>Split #{request.splitId}</small>}
            </div>

            {(request.amount !== undefined || request.requestedAmount !== undefined) && (
              <dl className="transaction-review-money">
                {request.amount !== undefined && (
                  <div>
                    <dt>{request.action === "pay" ? "You will pay" : "Final amount"}</dt>
                    <dd>
                      {formatAmount(request.amount)} {request.asset}
                    </dd>
                  </div>
                )}
                {request.requestedAmount !== undefined && (
                  <div>
                    <dt>Requested</dt>
                    <dd>
                      {formatAmount(request.requestedAmount)} {request.asset}
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

            <dl className="transaction-review-technical">
              <div>
                <dt>Account</dt>
                <dd title={request.account}>{shortAddress(request.account)}</dd>
              </div>
              <div>
                <dt>Network</dt>
                <dd>{request.network}</dd>
              </div>
              <div>
                <dt>Contract</dt>
                <dd title={request.contractId}>{shortAddress(request.contractId)}</dd>
              </div>
            </dl>

            <div className="transaction-approval-actions">
              <button type="button" className="transaction-approval-cancel" onClick={onCancel}>
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
          <div className="transaction-stage-view failure">
            <span className="transaction-stage-icon" aria-hidden="true">
              !
            </span>
            <p className="eyebrow">Transaction stopped</p>
            <h2 id="transaction-approval-title">This action needs attention</h2>
            <p role="alert">{state.error ?? "The transaction could not be completed."}</p>
            <button type="button" className="transaction-approval-confirm" onClick={onClose}>
              Back to Split
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
            {state.hash && <code title={state.hash}>{shortAddress(state.hash)}</code>}
          </div>
        )}
      </section>
    </div>
  );
}
