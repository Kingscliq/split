"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useWallet } from "@/contexts/WalletContext";
import { createSplit, TOKEN_CONTRACTS, toBaseUnits, type TokenSymbol } from "@/lib/split-contract";

type Participant = { name: string; address: string; color: string };
const colors = ["pink", "blue", "orange", "lime"];

export default function CreateSplitPage() {
  const router = useRouter();
  const { address, connect } = useWallet();
  const [token, setToken] = useState<TokenSymbol>("XLM");
  const [requested, setRequested] = useState("");
  const [finalAmount, setFinalAmount] = useState("");
  const [title, setTitle] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([{ name: "", address: "", color: "pink" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const math = useMemo(() => {
    try {
      const requestedUnits = toBaseUnits(requested);
      const finalUnits = toBaseUnits(finalAmount);
      const count = BigInt(participants.length);
      return {
        requestedUnits, finalUnits,
        each: count ? Number(finalUnits / count) / 10_000_000 : 0,
        waived: Number(requestedUnits > finalUnits ? requestedUnits - finalUnits : 0n) / 10_000_000,
        even: count > 0n && finalUnits > 0n && requestedUnits >= finalUnits && finalUnits % count === 0n,
      };
    } catch {
      return { requestedUnits: 0n, finalUnits: 0n, each: 0, waived: 0, even: false };
    }
  }, [requested, finalAmount, participants.length]);

  function addParticipant() {
    setParticipants((current) => [...current, { name: "", address: "", color: colors[current.length % colors.length] }]);
  }

  function removeParticipant(index: number) {
    setParticipants((current) => current.filter((_, participantIndex) => participantIndex !== index));
  }

  async function submit() {
    setError(null);
    if (!math.even) return setError("The final amount must split equally between every participant.");
    if (!title.trim()) return setError("Add a title for this split.");
    if (participants.some((participant) => !participant.address.trim() || !participant.name.trim())) return setError("Add a wallet address and display name for every participant.");
    const creator = address ?? await connect();
    if (!creator) return;
    setSubmitting(true);
    try {
      const result = await createSplit({
        creator,
        title: title.trim(),
        token: TOKEN_CONTRACTS[token],
        requestedAmount: math.requestedUnits,
        totalAmount: math.finalUnits,
        participants: participants.map((participant) => ({ address: participant.address.trim(), displayName: participant.name.trim() })),
      });
      const receipt = new URLSearchParams({ action: "create", tx: result.hash });
      router.push(`/split/${Number(result.value)}?${receipt.toString()}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the split.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell active="create">
      <div className="create-heading">
        <Link href="/" className="back-button" aria-label="Back to dashboard">←</Link>
        <div><p className="eyebrow">New collection</p><h1>Create a split</h1></div>
        <span className="step-pill">1 of 1</span>
      </div>

      <div className="onboarding-callout">
        <div><strong>New to Stellar Testnet?</strong><span>Set up Freighter and find your public wallet address before creating a Split.</span></div>
        <Link href="/onboarding">Open the 3-minute guide <span>→</span></Link>
      </div>

      <div className="create-layout">
        <section className="form-card">
          <div className="amount-stage">
            <label htmlFor="requested"><strong>Collection amount</strong><span>How much do you want to collect from others?</span></label>
            <div className="amount-input-wrap"><span aria-hidden="true">{token === "USDC" ? "$" : "✦"}</span><input id="requested" inputMode="decimal" value={requested} placeholder="0.00" autoFocus onChange={(event) => { setRequested(event.target.value); setFinalAmount(event.target.value); }} aria-label={`Collection amount in ${token}`} aria-describedby="amount-help" /><b>{token}</b></div>
            <p id="amount-help">Enter the total others are paying back. Do not include your own share.</p>
          </div>

          <div className="form-section">
            <label className="field-label" htmlFor="split-title">What is it for?</label>
            <input id="split-title" className="text-input" placeholder="Dinner, rent, a group trip…" maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>

          <div className="form-section two-column-fields">
            <div><span className="field-label">Get paid in</span><div className="segment-control" aria-label="Settlement token">
              {(["XLM", "USDC"] as const).map((option) => <button className={token === option ? "selected" : ""} onClick={() => setToken(option)} type="button" key={option}><span className={`token-dot ${option.toLowerCase()}`}>{option === "USDC" ? "$" : "✦"}</span>{option}</button>)}
            </div></div>
            <div><label className="field-label" htmlFor="final-amount">Final split amount</label><div className="compact-input"><input id="final-amount" inputMode="decimal" value={finalAmount} placeholder="0.00" onChange={(event) => setFinalAmount(event.target.value)} /><span>{token}</span></div></div>
          </div>

          <div className="form-section participants-section">
            <div className="section-heading compact"><div><span className="field-label">Who is paying?</span><small>{participants.length} participant{participants.length === 1 ? "" : "s"}</small></div><button className="add-person" type="button" onClick={addParticipant} disabled={participants.length >= 50}>＋ Add person</button></div>
            <div className="participant-editor">
              {participants.map((participant, index) => <div className="participant-edit-row" key={index}>
                <span className={`avatar avatar-${participant.color}`}>{participant.name.slice(0, 1).toUpperCase() || index + 1}</span>
                <div className="participant-fields">
                  <div className="participant-field participant-field-primary">
                    <label htmlFor={`participant-${index}-address`}>Wallet address <span>Required</span></label>
                    <input id={`participant-${index}-address`} className="address-input" placeholder="Paste public G… address" value={participant.address} autoComplete="off" spellCheck={false} onChange={(event) => setParticipants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, address: event.target.value } : item))} />
                  </div>
                  <div className="participant-field participant-field-secondary">
                    <label htmlFor={`participant-${index}-name`}>Display name</label>
                    <input id={`participant-${index}-name`} className="name-input" placeholder="e.g. Favour" maxLength={40} value={participant.name} onChange={(event) => setParticipants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} />
                  </div>
                </div>
                <strong>{math.each.toFixed(2)} <span>{token}</span></strong>
                <button className="remove-person" type="button" onClick={() => removeParticipant(index)} disabled={participants.length === 1} aria-label={`Remove participant ${index + 1}`}>×</button>
              </div>)}
            </div>
          </div>
        </section>

        <aside className="summary-card">
          <p className="eyebrow">Equal split preview</p><h2>{math.each.toFixed(2)} <span>{token}</span></h2><p className="summary-subtitle">per participant</p>
          <div className="summary-people" aria-hidden="true">{participants.slice(0, 4).map((person, index) => <span className={`avatar avatar-${person.color}`} key={index}>{person.name.slice(0, 1).toUpperCase() || index + 1}</span>)}</div>
          <dl><div><dt>Requested</dt><dd>{Number(requested || 0).toFixed(2)} {token}</dd></div><div><dt>Final amount</dt><dd>{Number(finalAmount || 0).toFixed(2)} {token}</dd></div><div className={math.waived > 0 ? "waived-row" : ""}><dt>Waived remainder</dt><dd>{math.waived.toFixed(2)} {token}</dd></div></dl>
          {!math.even && <p className="validation-note">The final amount must be positive, no greater than requested, and divide evenly in 7-decimal Stellar units.</p>}
          {error && <p className="validation-note transaction-error" role="alert">{error}</p>}
          <button className="button button-primary button-wide" disabled={!math.even || submitting} onClick={() => void submit()} type="button">{submitting ? "Confirming…" : address ? "Create split" : "Connect & create"} <span>→</span></button>
          <small className="network-note"><span className="status-dot" /> {submitting ? "Keep Freighter open while testnet confirms." : "You’ll confirm this transaction in Freighter."}</small>
        </aside>
      </div>
    </AppShell>
  );
}
