import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "About Split — Group payments on Stellar",
  description:
    "Learn how Split helps groups collect equal contributions and track payments on Stellar.",
};

const steps = [
  {
    number: "01",
    title: "Create the collection",
    body: "Add a purpose, choose XLM or Testnet USDC, enter the amount, and assign an equal share to each participant.",
  },
  {
    number: "02",
    title: "Share one link",
    body: "Copy the Split link or send it to the group on WhatsApp. Everyone returns to the same payment page.",
  },
  {
    number: "03",
    title: "Participants pay",
    body: "Each person continues with the account that was assigned to them, reviews the amount, and approves the transaction.",
  },
  {
    number: "04",
    title: "The group sees the result",
    body: "Split reads the contract state and shows what has been collected, what remains, and who is paid or pending.",
  },
];

const facts = [
  {
    title: "Money goes directly to the creator",
    body: "The Split contract records the collection and payment status. It does not hold participant funds in a shared balance.",
  },
  {
    title: "Payment records are verifiable",
    body: "Confirmed activity is recorded on Stellar and can be checked independently with the transaction link.",
  },
  {
    title: "Your credentials stay private",
    body: "Split never asks for a Google password, wallet secret key, or recovery phrase. Only public Stellar addresses are used by the app.",
  },
];

const faqs = [
  {
    question: "Is Split using real money?",
    answer:
      "Not yet. Split currently runs on Stellar Testnet, where XLM and USDC are practice assets with no real-world value. Do not send real funds while testing.",
  },
  {
    question: "Does Split hold the group’s money?",
    answer:
      "No. A participant’s payment goes directly to the Split creator. The contract records the expected amount, payment progress, and participant status without holding a shared balance.",
  },
  {
    question: "Do I need a wallet extension?",
    answer:
      "No. You can continue with Google, email, or a passkey to use an embedded Stellar account. If you already use Stellar, you can connect a Freighter wallet instead.",
  },
  {
    question: "Why does the creator need my wallet address first?",
    answer:
      "Your public Stellar address identifies the share assigned to you. The current MVP does not support self-joining, so the creator must add that address before creating the Split.",
  },
  {
    question: "Can I pay from a different account?",
    answer:
      "No. You must continue with the exact account the creator assigned to your share. This prevents another account from being marked as you by mistake.",
  },
  {
    question: "Which assets can the group use?",
    answer:
      "A creator can currently choose Testnet XLM or the configured Testnet USDC asset. Every participant in that Split pays with the selected asset.",
  },
  {
    question: "What happens when a creator closes a Split?",
    answer:
      "Payments already completed remain recorded, but participants with pending shares can no longer pay through that Split.",
  },
  {
    question: "Is my Split information private?",
    answer:
      "Split limits participant details in the interface, but wallet addresses, contract records, and transactions on Stellar Testnet are publicly inspectable on-chain.",
  },
  {
    question: "What should I do if a payment is not showing?",
    answer:
      "Wait for Stellar confirmation, then reopen or refresh the Split page. Use Transaction details to check the recorded activity and its Stellar Expert link.",
  },
];

export default function AboutPage() {
  return (
    <AppShell active="about">
      <main className={styles.aboutPage}>
        <header className={styles.hero}>
          <div className={styles.heroMark} aria-hidden="true">
            <i />
            <i />
          </div>
          <p className="eyebrow">About Split</p>
          <h1>Group payments without the chasing.</h1>
          <p className={styles.heroIntro}>
            Split helps friends, roommates, classmates, communities, and event organizers collect
            equal contributions through one shared payment page.
          </p>
          <div className={styles.heroActions}>
            <Link className="button button-primary" href="/split/create">
              Create a split <span>→</span>
            </Link>
            <Link className={styles.secondaryAction} href="/onboarding">
              Read the Testnet guide
            </Link>
          </div>
        </header>

        <section className={styles.section} aria-labelledby="why-split">
          <div className={styles.sectionHeading}>
            <p className="eyebrow">Why it exists</p>
            <h2 id="why-split">Replace screenshots and payment reminders with one clear status.</h2>
          </div>
          <p className={styles.sectionLead}>
            Group collections often live in chat threads: someone posts account details, people send
            receipts, and the organizer manually checks who has paid. Split gives that group a
            single source of truth backed by Stellar transaction data.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="how-it-works">
          <div className={styles.sectionHeading}>
            <p className="eyebrow">How it works</p>
            <h2 id="how-it-works">From collection to confirmation.</h2>
          </div>
          <div className={styles.steps}>
            {steps.map((step) => (
              <article className={styles.step} key={step.number}>
                <span>{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="money-safety">
          <div className={styles.sectionHeading}>
            <p className="eyebrow">Money and safety</p>
            <h2 id="money-safety">What Split does—and what it never does.</h2>
          </div>
          <div className={styles.factGrid}>
            {facts.map((fact) => (
              <article className={styles.fact} key={fact.title}>
                <span aria-hidden="true">✓</span>
                <h3>{fact.title}</h3>
                <p>{fact.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className={`${styles.section} ${styles.accountSection}`}
          aria-labelledby="accounts"
        >
          <div>
            <p className="eyebrow">Accounts and wallets</p>
            <h2 id="accounts">Use a simple sign-in or an existing Stellar wallet.</h2>
          </div>
          <div className={styles.accountList}>
            <div>
              <strong>Google, email, or passkey</strong>
              <p>
                Blux provides an embedded Stellar account so a browser extension is not required.
                Return with the same sign-in method to access the same account.
              </p>
            </div>
            <div>
              <strong>Existing wallet</strong>
              <p>
                Freighter users can connect their current Stellar wallet and approve transactions
                inside the extension.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.testnet} aria-labelledby="testnet-title">
          <span className={styles.testnetIcon} aria-hidden="true">
            T
          </span>
          <div>
            <p className="eyebrow">Current network</p>
            <h2 id="testnet-title">Split is currently a Testnet MVP.</h2>
            <p>
              Testnet XLM and USDC are practice assets with no real-world value. Split is not yet a
              Mainnet payment service, and no one should send real funds while testing it.
            </p>
            <Link href="/onboarding">Set up a Testnet account →</Link>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="limits">
          <div className={styles.sectionHeading}>
            <p className="eyebrow">Good to know</p>
            <h2 id="limits">The current product boundaries.</h2>
          </div>
          <ul className={styles.limitList}>
            <li>Every participant needs a public Stellar address before the Split is created.</li>
            <li>
              Contributions are equal; Split is not a full expense-accounting or debt-ledger app.
            </li>
            <li>A participant must pay with the exact account assigned by the creator.</li>
            <li>Split records are publicly inspectable on Stellar Testnet.</li>
            <li>Closing a Split prevents pending participants from making further payments.</li>
          </ul>
        </section>

        <section className={`${styles.section} ${styles.faqSection}`} aria-labelledby="faq-title">
          <div className={styles.sectionHeading}>
            <p className="eyebrow">Frequently asked questions</p>
            <h2 id="faq-title">The things people usually want to know.</h2>
          </div>
          <div className={styles.faqList}>
            {faqs.map((faq) => (
              <details className={styles.faqItem} key={faq.question}>
                <summary>
                  <span>{faq.question}</span>
                  <i aria-hidden="true" />
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.contact} aria-labelledby="contact-title">
          <div className={styles.contactIcon} aria-hidden="true">
            𝕏
          </div>
          <div>
            <p className="eyebrow">Questions or feedback?</p>
            <h2 id="contact-title">Talk to the person building Split.</h2>
            <p>
              Share a problem, report something confusing, or tell us how your group uses Split.
            </p>
          </div>
          <a href="https://x.com/ajaezo" target="_blank" rel="noreferrer">
            Contact @ajaezo <span aria-hidden="true">↗</span>
          </a>
        </section>

        <footer className={styles.finalCta}>
          <div>
            <p className="eyebrow">Ready to try it?</p>
            <h2>Create, share, and track your first group payment.</h2>
          </div>
          <Link className="button button-primary" href="/split/create">
            Create a split <span>→</span>
          </Link>
        </footer>
      </main>
    </AppShell>
  );
}
