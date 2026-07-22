import Link from "next/link";
import type { ReactNode } from "react";
import { WalletButton } from "@/components/WalletButton";
import { ThemeToggle } from "@/components/ThemeToggle";

type AppShellProps = {
  children: ReactNode;
  active?: "home" | "create";
};

function Logo() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i /><i />
    </span>
  );
}

export function AppShell({ children, active }: AppShellProps) {
  return (
    <main className="site-canvas">
      <div className="app-window">
        <aside className="sidebar">
          <Link className="brand" href="/" aria-label="Split home">
            <Logo />
            <span>split</span>
          </Link>

          <nav className="desktop-nav" aria-label="Primary navigation">
            <Link className={active === "home" ? "active" : ""} href="/">
              <span>⌂</span> Overview
            </Link>
            <Link className={active === "create" ? "active" : ""} href="/split/create">
              <span>＋</span> Create split
            </Link>
            <Link href="/split/12"><span>◌</span> Activity</Link>
          </nav>

          <div className="sidebar-note">
            <span className="status-dot" />
            <p>Stellar testnet</p>
            <small>Payments settle on-chain</small>
          </div>
        </aside>

        <section className="app-main">
          <div className="mobile-header">
            <Link className="brand" href="/" aria-label="Split home"><Logo /><span>split</span></Link>
            <div className="header-actions"><ThemeToggle /><WalletButton /></div>
          </div>
          <div className="topbar">
            <p><span className="status-dot" /> Testnet</p>
            <ThemeToggle />
            <WalletButton />
          </div>
          <div className="page-content">{children}</div>
        </section>
      </div>
    </main>
  );
}
