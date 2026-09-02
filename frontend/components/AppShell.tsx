import Link from "next/link";
import type { ReactNode } from "react";
import { AdminNavLink } from "@/components/AdminNavLink";
import { NotificationBell, NotificationProvider } from "@/components/NotificationCenter";
import { DisconnectWalletButton, WalletButton } from "@/components/WalletButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VersionSwitcher } from "@/components/VersionSwitcher";

type AppShellProps = {
  children: ReactNode;
  active?: "home" | "create" | "onboarding" | "admin";
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
    <NotificationProvider><main className="site-canvas">
      <div className="app-window">
        <aside className="sidebar">
          <Link className="brand" href="/" aria-label="Split home">
            <Logo />
            <span>split</span>
          </Link>
          <VersionSwitcher />

          <nav className="desktop-nav" aria-label="Primary navigation">
            <Link className={active === "home" ? "active" : ""} href="/">
              <span>⌂</span> Overview
            </Link>
            <Link className={active === "create" ? "active" : ""} href="/split/create">
              <span>＋</span> Create split
            </Link>
            <Link className={active === "onboarding" ? "active" : ""} href="/onboarding">
              <span>?</span> Testnet guide
            </Link>
            <Link href="/#your-splits"><span>◌</span> Your splits</Link>
            <AdminNavLink active={active === "admin"} />
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-note">
              <span className="status-dot" />
              <p>Stellar testnet</p>
              <small>Payments settle on-chain</small>
            </div>
            <DisconnectWalletButton className="sidebar-disconnect" />
          </div>
        </aside>

        <section className="app-main">
          <div className="mobile-header">
            <div className="mobile-brand-group"><Link className="brand" href="/" aria-label="Split home"><Logo /><span>split</span></Link><VersionSwitcher compact /></div>
            <div className="header-actions"><AdminNavLink compact /><NotificationBell /><Link className="mobile-guide-link" href="/onboarding" aria-label="Open Testnet setup guide">?</Link><ThemeToggle /><WalletButton /></div>
          </div>
          <div className="topbar">
            <p><span className="status-dot" /> Testnet</p>
            <NotificationBell />
            <ThemeToggle />
            <WalletButton />
          </div>
          <div className="page-content">{children}</div>
        </section>
      </div>
    </main></NotificationProvider>
  );
}
