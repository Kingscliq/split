import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { FriendbotFunding } from "@/components/FriendbotFunding";

const steps = [
  {
    number: "01",
    title: "Choose how to continue",
    body: "Continue with email for the simplest setup, or use an existing Stellar wallet if you already have Freighter.",
  },
  {
    number: "02",
    title: "Use email—no extension required",
    body: "Enter your email and the one-time code sent to you. Split restores the same embedded Testnet account when you return with that email.",
  },
  {
    number: "03",
    title: "Or connect Freighter on Testnet",
    body: "Open Freighter, click the hamburger menu (or globe/network icon), open Networks, and select Testnet. Then return to Split and choose Use an existing Stellar wallet.",
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
          <p className="guide-intro">
            Continue with email or an existing Stellar wallet in a few minutes. Testnet XLM has no
            real-world value, so you can learn the payment flow without spending real money.
          </p>
        </div>
        <span className="guide-time">About 3 minutes</span>
      </header>

      <section className="guide-safety" aria-labelledby="safety-title">
        <span aria-hidden="true">!</span>
        <div>
          <h2 id="safety-title">Your wallet credentials stay private</h2>
          <p>
            Email login only asks for a one-time code. If you use an external wallet, never share
            its password, secret key, or recovery phrase. Split only uses your public G… address.
          </p>
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
          <li>
            <span aria-hidden="true">✓</span> You chose email or an existing Stellar wallet
          </li>
          <li>
            <span aria-hidden="true">✓</span> The selected network says Testnet
          </li>
          <li>
            <span aria-hidden="true">✓</span> Your account shows a Testnet XLM balance
          </li>
          <li>
            <span aria-hidden="true">✓</span> You copied only your public G… address
          </li>
        </ul>
        <div className="guide-actions">
          <a
            className="button button-primary"
            href="https://developers.stellar.org/docs/build/guides/freighter/connect-testnet"
            target="_blank"
            rel="noreferrer"
          >
            Open Freighter setup guide <span>↗</span>
          </a>
          <Link className="button guide-secondary" href="/split/create">
            Create a split
          </Link>
        </div>
        <p className="guide-next-note">
          Already received a Split link? Return to it and continue with the same email or wallet
          account that was assigned to the Split.
        </p>
      </section>
    </AppShell>
  );
}
