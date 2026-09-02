import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { FriendbotFunding } from "@/components/FriendbotFunding";

const steps = [
  {
    number: "01",
    title: "Install or open Freighter",
    body: "Freighter is the Stellar wallet Split uses to connect your account and request transaction signatures.",
  },
  {
    number: "02",
    title: "Create your wallet safely",
    body: "Create a wallet or use an account you already control. Store the recovery phrase offline and never paste it into Split, a form, or a chat.",
  },
  {
    number: "03",
    title: "Switch to Testnet",
    body: "Open Freighter, click the hamburger menu (or globe/network icon), open Networks, and select Testnet. Then return to Split. Split will reject a wallet that is connected to the public network.",
  },
  {
    number: "04",
    title: "Share only your public address",
    body: "Copy the public address beginning with G and send it to the Split creator. They need it to assign your share before creating the collection.",
  },
];

export default function OnboardingPage() {
  return (
    <AppShell active="onboarding">
      <header className="guide-heading">
        <div>
          <p className="eyebrow">Stellar Testnet setup</p>
          <h1>Get ready to use Split.</h1>
          <p className="guide-intro">Set up a test wallet in a few minutes. Testnet XLM has no real-world value, so you can learn the payment flow without spending real money.</p>
        </div>
        <span className="guide-time">About 3 minutes</span>
      </header>

      <section className="guide-safety" aria-labelledby="safety-title">
        <span aria-hidden="true">!</span>
        <div>
          <h2 id="safety-title">Your recovery phrase stays private</h2>
          <p>Split only needs your public wallet address. No Split page, organizer, feedback form, or support message should ever ask for your secret key or recovery phrase.</p>
        </div>
      </section>

      <section className="guide-steps" aria-label="Testnet setup steps">
        {steps.map((step) => (
          <article className="guide-step" key={step.number}>
            <span className="guide-step-number">{step.number}</span>
            <div>
              <h2>{step.title}</h2>
              <p>{step.body}</p>
            </div>
          </article>
        ))}
        <FriendbotFunding />
      </section>

      <section className="guide-ready">
        <div>
          <p className="eyebrow">Before you continue</p>
          <h2>Quick readiness check</h2>
        </div>
        <ul>
          <li><span aria-hidden="true">✓</span> Freighter is installed and unlocked</li>
          <li><span aria-hidden="true">✓</span> The selected network says Testnet</li>
          <li><span aria-hidden="true">✓</span> Freighter shows a Testnet XLM balance</li>
          <li><span aria-hidden="true">✓</span> You copied only your public G… address</li>
        </ul>
        <div className="guide-actions">
          <a className="button button-primary" href="https://developers.stellar.org/docs/build/guides/freighter/connect-testnet" target="_blank" rel="noreferrer">Open official setup guide <span>↗</span></a>
          <Link className="button guide-secondary" href="/split/create">Create a split</Link>
        </div>
        <p className="guide-next-note">Already received a Split link? Return to that link after completing this checklist and connect your wallet there.</p>
      </section>
    </AppShell>
  );
}
