"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StrKey } from "@stellar/stellar-sdk";
import { AppShell } from "@/components/AppShell";
import { useWallet } from "@/contexts/WalletContext";
import {
  createSplit,
  isTransactionApprovalCancelled,
  TOKEN_CONTRACTS,
  toBaseUnits,
  type TokenSymbol,
} from "@/lib/split-contract";

type Participant = { name: string; address: string; color: string };
type ParticipantErrors = Record<number, { address?: string; name?: string }>;
type CreateStep = 1 | 2 | 3;
const colors = ["pink", "blue", "orange", "lime"];

export default function CreateSplitPage() {
  const router = useRouter();
  const { address, connect, signer } = useWallet();
  const [token, setToken] = useState<TokenSymbol>("XLM");
  const [requested, setRequested] = useState("");
  const [finalAmount, setFinalAmount] = useState("");
  const [title, setTitle] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([
    { name: "", address: "", color: "pink" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantErrors, setParticipantErrors] = useState<ParticipantErrors>({});
  const [step, setStep] = useState<CreateStep>(1);

  const math = useMemo(() => {
    try {
      const requestedUnits = toBaseUnits(requested);
      const finalUnits = toBaseUnits(finalAmount);
      const count = BigInt(participants.length);
      return {
        requestedUnits,
        finalUnits,
        each: count ? Number(finalUnits / count) / 10_000_000 : 0,
        waived: Number(requestedUnits > finalUnits ? requestedUnits - finalUnits : 0n) / 10_000_000,
        even:
          count > 0n &&
          finalUnits > 0n &&
          requestedUnits >= finalUnits &&
          finalUnits % count === 0n,
      };
    } catch {
      return { requestedUnits: 0n, finalUnits: 0n, each: 0, waived: 0, even: false };
    }
  }, [requested, finalAmount, participants.length]);

  function addParticipant() {
    setParticipantErrors({});
    setParticipants((current) => [
      ...current,
      { name: "", address: "", color: colors[current.length % colors.length] },
    ]);
  }

  function removeParticipant(index: number) {
    setParticipantErrors({});
    setParticipants((current) =>
      current.filter((_, participantIndex) => participantIndex !== index),
    );
  }

  function clearParticipantError(index: number, field: "address" | "name") {
    setParticipantErrors((current) => {
      if (!current[index]?.[field]) return current;
      const next = { ...current, [index]: { ...current[index], [field]: undefined } };
      if (!next[index].address && !next[index].name) delete next[index];
      return next;
    });
  }

  function validateParticipants() {
    const nextErrors: ParticipantErrors = {};
    const addresses = new Set<string>();

    participants.forEach((participant, index) => {
      const participantAddress = participant.address.trim();
      const displayName = participant.name.trim();
      const fields: ParticipantErrors[number] = {};

      if (!participantAddress) fields.address = "Enter this participant’s wallet address.";
      else if (!StrKey.isValidEd25519PublicKey(participantAddress))
        fields.address = "Use a valid Stellar public address beginning with G.";
      else if (addresses.has(participantAddress))
        fields.address = "This wallet has already been added.";
      else addresses.add(participantAddress);

      if (!displayName) fields.name = "Enter a display name for this participant.";
      if (fields.address || fields.name) nextErrors[index] = fields;
    });

    setParticipantErrors(nextErrors);
    const firstInvalidIndex = Number(Object.keys(nextErrors)[0]);
    if (Number.isInteger(firstInvalidIndex)) {
      const firstField = nextErrors[firstInvalidIndex].address ? "address" : "name";
      requestAnimationFrame(() => {
        const input = document.getElementById(`participant-${firstInvalidIndex}-${firstField}`);
        input?.scrollIntoView({ behavior: "smooth", block: "center" });
        input?.focus({ preventScroll: true });
      });
      return false;
    }
    return true;
  }

  function continueFromDetails() {
    setError(null);
    if (math.requestedUnits <= 0n) return setError("Enter an amount greater than zero.");
    if (!title.trim()) return setError("Add a short title for this split.");
    setStep(2);
  }

  function continueFromPeople() {
    setError(null);
    if (!validateParticipants()) return;
    setStep(3);
  }

  async function submit() {
    setError(null);
    if (!math.even)
      return setError("The final amount must split equally between every participant.");
    if (!title.trim()) return setError("Add a title for this split.");
    if (!validateParticipants()) return;
    const creator = address ?? (await connect());
    if (!creator) return;
    setSubmitting(true);
    try {
      const result = await createSplit(
        {
          creator,
          title: title.trim(),
          token: TOKEN_CONTRACTS[token],
          requestedAmount: math.requestedUnits,
          totalAmount: math.finalUnits,
          participants: participants.map((participant) => ({
            address: participant.address.trim(),
            displayName: participant.name.trim(),
          })),
        },
        signer,
      );
      const receipt = new URLSearchParams({ action: "create", tx: result.hash });
      router.push(`/split/${Number(result.value)}?${receipt.toString()}`);
    } catch (caught) {
      if (isTransactionApprovalCancelled(caught)) return;
      setError(caught instanceof Error ? caught.message : "Could not create the split.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell active="create">
      <div className="transfer-flow">
        <header className="transfer-header">
          <Link
            href={step === 1 ? "/" : "#"}
            className="back-button"
            aria-label="Go back"
            onClick={(event) => {
              if (step === 1) return;
              event.preventDefault();
              setError(null);
              setStep((step - 1) as CreateStep);
            }}
          >
            ←
          </Link>
          <div className="transfer-progress" aria-label={`Step ${step} of 3`}>
            {[1, 2, 3].map((item) => (
              <span className={item <= step ? "active" : ""} key={item} />
            ))}
          </div>
          <span className="step-pill">{step} of 3</span>
        </header>

        {step === 1 && (
          <section className="transfer-step amount-step">
            <p className="eyebrow">New split</p>
            <h1>How much are you collecting?</h1>
            <p className="transfer-intro">Enter only what the other participants will pay back.</p>
            <div className="transfer-amount-input">
              <span aria-hidden="true">{token === "USDC" ? "$" : "✦"}</span>
              <input
                id="requested"
                inputMode="decimal"
                value={requested}
                placeholder="0.00"
                autoFocus
                onChange={(event) => {
                  setRequested(event.target.value);
                  setFinalAmount(event.target.value);
                  setError(null);
                }}
                aria-label={`Collection amount in ${token}`}
              />
              <b>{token}</b>
            </div>
            <div className="transfer-fields">
              <div>
                <label className="field-label" htmlFor="split-title">
                  What is it for?
                </label>
                <input
                  id="split-title"
                  className="text-input"
                  placeholder="Dinner, rent, a group trip…"
                  maxLength={80}
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setError(null);
                  }}
                />
              </div>
              <div>
                <span className="field-label">Collect in</span>
                <div className="segment-control" aria-label="Settlement token">
                  {(["XLM", "USDC"] as const).map((option) => (
                    <button
                      className={token === option ? "selected" : ""}
                      onClick={() => setToken(option)}
                      type="button"
                      key={option}
                    >
                      <span className={`token-dot ${option.toLowerCase()}`}>
                        {option === "USDC" ? "$" : "✦"}
                      </span>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="transfer-step people-step">
            <p className="eyebrow">Participants</p>
            <h1>Who is paying?</h1>
            <p className="transfer-intro">Each person will be assigned an equal share.</p>
            <div className="people-step-summary">
              <span>
                {participants.length} {participants.length === 1 ? "person" : "people"}
              </span>
              <strong>
                {math.each.toFixed(2)} {token} each
              </strong>
            </div>
            <div className="participant-editor">
              {participants.map((participant, index) => (
                <div
                  className={`participant-edit-row${participantErrors[index] ? " has-error" : ""}`}
                  key={index}
                >
                  <span className={`avatar avatar-${participant.color}`}>
                    {participant.name.slice(0, 1).toUpperCase() || index + 1}
                  </span>
                  <div className="participant-fields">
                    <div
                      className={`participant-field participant-field-primary${participantErrors[index]?.address ? " field-has-error" : ""}`}
                    >
                      <label htmlFor={`participant-${index}-address`}>
                        Wallet address
                        <span className="required-mark" aria-hidden="true">
                          *
                        </span>
                        <span className="sr-only">required</span>
                      </label>
                      <input
                        id={`participant-${index}-address`}
                        className="address-input"
                        placeholder="Paste public G… address"
                        value={participant.address}
                        required
                        autoComplete="off"
                        spellCheck={false}
                        aria-invalid={Boolean(participantErrors[index]?.address)}
                        aria-describedby={
                          participantErrors[index]?.address
                            ? `participant-${index}-address-error`
                            : undefined
                        }
                        onChange={(event) => {
                          clearParticipantError(index, "address");
                          setParticipants((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, address: event.target.value } : item,
                            ),
                          );
                        }}
                      />
                      {participantErrors[index]?.address && (
                        <small
                          className="participant-field-error"
                          id={`participant-${index}-address-error`}
                          role="alert"
                        >
                          {participantErrors[index].address}
                        </small>
                      )}
                    </div>
                    <div
                      className={`participant-field participant-field-secondary${participantErrors[index]?.name ? " field-has-error" : ""}`}
                    >
                      <label htmlFor={`participant-${index}-name`}>
                        Display name
                        <span className="required-mark" aria-hidden="true">
                          *
                        </span>
                        <span className="sr-only">required</span>
                      </label>
                      <input
                        id={`participant-${index}-name`}
                        className="name-input"
                        placeholder="e.g. Favour"
                        maxLength={40}
                        value={participant.name}
                        required
                        aria-invalid={Boolean(participantErrors[index]?.name)}
                        aria-describedby={
                          participantErrors[index]?.name
                            ? `participant-${index}-name-error`
                            : undefined
                        }
                        onChange={(event) => {
                          clearParticipantError(index, "name");
                          setParticipants((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, name: event.target.value } : item,
                            ),
                          );
                        }}
                      />
                      {participantErrors[index]?.name && (
                        <small
                          className="participant-field-error"
                          id={`participant-${index}-name-error`}
                          role="alert"
                        >
                          {participantErrors[index].name}
                        </small>
                      )}
                    </div>
                  </div>
                  <button
                    className="remove-person"
                    type="button"
                    onClick={() => removeParticipant(index)}
                    disabled={participants.length === 1}
                    aria-label={`Remove participant ${index + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              className="add-person transfer-add-person"
              type="button"
              onClick={addParticipant}
              disabled={participants.length >= 50}
            >
              ＋ Add another person
            </button>
          </section>
        )}

        {step === 3 && (
          <section className="transfer-step review-step">
            <p className="eyebrow">Review</p>
            <h1>Ready to create?</h1>
            <p className="transfer-intro">Check the details before opening the approval screen.</p>
            <div className="review-amount">
              <span>Each person pays</span>
              <strong>
                {math.each.toFixed(2)} <small>{token}</small>
              </strong>
            </div>
            <dl className="transfer-review-list">
              <div>
                <dt>For</dt>
                <dd>{title}</dd>
              </div>
              <div>
                <dt>Participants</dt>
                <dd>{participants.length}</dd>
              </div>
              <div>
                <dt>Requested</dt>
                <dd>
                  {Number(requested || 0).toFixed(2)} {token}
                </dd>
              </div>
              <div>
                <dt>Final split amount</dt>
                <dd>
                  <label className="review-final-amount">
                    <input
                      id="final-amount"
                      inputMode="decimal"
                      value={finalAmount}
                      onChange={(event) => setFinalAmount(event.target.value)}
                      aria-label="Final split amount"
                    />
                    <span>{token}</span>
                  </label>
                </dd>
              </div>
              {math.waived > 0 && (
                <div>
                  <dt>Waived remainder</dt>
                  <dd>
                    {math.waived.toFixed(2)} {token}
                  </dd>
                </div>
              )}
            </dl>
            {!math.even && (
              <p className="validation-note">
                The final amount must be positive, no greater than requested, and divide equally
                between all participants.
              </p>
            )}
          </section>
        )}

        {error && (
          <p className="transfer-error" role="alert">
            {error}
          </p>
        )}
        <footer className="transfer-footer">
          <div>
            <strong>
              {step === 1
                ? "Amount and purpose"
                : step === 2
                  ? `${math.each.toFixed(2)} ${token} each`
                  : `${Number(finalAmount || 0).toFixed(2)} ${token} total`}
            </strong>
            <span>
              {step === 3 ? "You’ll approve before submission." : "Nothing is submitted yet."}
            </span>
          </div>
          <button
            className="button button-primary"
            type="button"
            disabled={submitting || (step === 3 && !math.even)}
            onClick={() => {
              if (step === 1) continueFromDetails();
              else if (step === 2) continueFromPeople();
              else void submit();
            }}
          >
            {submitting
              ? "Confirming…"
              : step === 3
                ? address
                  ? "Review & create"
                  : "Connect & review"
                : "Continue"}{" "}
            <span>→</span>
          </button>
        </footer>
      </div>
    </AppShell>
  );
}
