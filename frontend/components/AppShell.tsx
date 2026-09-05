"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AdminNavLink } from "@/components/AdminNavLink";
import { NotificationBell, NotificationProvider } from "@/components/NotificationCenter";
import { DisconnectWalletButton, WalletButton } from "@/components/WalletButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VersionSwitcher } from "@/components/VersionSwitcher";

type AppShellProps = {
  children: ReactNode;
  active?: "home" | "create" | "pay" | "onboarding" | "admin";
};

function Logo() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i />
      <i />
    </span>
  );
}

export function AppShell({ children, active }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen]);

  return (
    <NotificationProvider>
      <main className="site-canvas">
        <div className="app-window">
          <aside className="sidebar">
            <div className="mobile-brand-group desktop-brand-row">
              <Link className="brand" href="/" aria-label="Split home">
                <Logo />
                <span>split</span>
              </Link>
              <VersionSwitcher compact />
            </div>

            <nav className="desktop-nav" aria-label="Primary navigation">
              <Link className={active === "home" ? "active" : ""} href="/">
                <span>⌂</span> Overview
              </Link>
              <Link className={active === "create" ? "active" : ""} href="/split/create">
                <span>＋</span> Create split
              </Link>
              <Link className={active === "pay" ? "active" : ""} href="/split/pending">
                <span>↓</span> Pay share
              </Link>
              <Link className={active === "onboarding" ? "active" : ""} href="/onboarding">
                <span>?</span> Testnet guide
              </Link>
              <Link href="/#your-splits">
                <span>◌</span> Your splits
              </Link>
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
              <div className="mobile-brand-group">
                <button
                  className="mobile-menu-toggle"
                  type="button"
                  aria-label="Open navigation menu"
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-navigation"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <span />
                  <span />
                  <span />
                </button>
                <Link className="brand" href="/" aria-label="Split home">
                  <Logo />
                  <span>split</span>
                </Link>
                <VersionSwitcher compact />
              </div>
              <div className="header-actions">
                <NotificationBell />
                <ThemeToggle />
                <WalletButton />
              </div>
            </div>
            {mobileMenuOpen && (
              <div className="mobile-navigation-layer">
                <button
                  className="mobile-navigation-backdrop"
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={() => setMobileMenuOpen(false)}
                />
                <aside
                  className="mobile-navigation-drawer"
                  id="mobile-navigation"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Navigation menu"
                >
                  <div className="mobile-navigation-heading">
                    <Link className="brand" href="/" onClick={() => setMobileMenuOpen(false)}>
                      <Logo />
                      <span>split</span>
                    </Link>
                    <button
                      type="button"
                      aria-label="Close navigation menu"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      ×
                    </button>
                  </div>
                  <nav
                    className="mobile-navigation-links desktop-nav"
                    aria-label="Mobile navigation"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link className={active === "home" ? "active" : ""} href="/">
                      <span>⌂</span> Overview
                    </Link>
                    <Link className={active === "create" ? "active" : ""} href="/split/create">
                      <span>＋</span> Create split
                    </Link>
                    <Link className={active === "pay" ? "active" : ""} href="/split/pending">
                      <span>↓</span> Pay share
                    </Link>
                    <Link className={active === "onboarding" ? "active" : ""} href="/onboarding">
                      <span>?</span> Testnet guide
                    </Link>
                    <Link href="/#your-splits">
                      <span>◌</span> Your splits
                    </Link>
                    <AdminNavLink active={active === "admin"} />
                  </nav>
                  <div className="mobile-navigation-footer">
                    <div className="sidebar-note">
                      <span className="status-dot" />
                      <p>Stellar testnet</p>
                      <small>Payments settle on-chain</small>
                    </div>
                    <DisconnectWalletButton className="sidebar-disconnect" />
                  </div>
                </aside>
              </div>
            )}
            <div className="topbar">
              <p>
                <span className="status-dot" /> Testnet
              </p>
              <NotificationBell />
              <ThemeToggle />
              <WalletButton />
            </div>
            <div className="page-content">{children}</div>
            <nav className="mobile-tab-bar" aria-label="Primary tabs">
              <Link
                className={active === "home" ? "active" : ""}
                href="/"
                aria-current={active === "home" ? "page" : undefined}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m4 10 8-6 8 6v9H4v-9Z" />
                  <path d="M9 19v-6h6v6" />
                </svg>
                <span>Home</span>
              </Link>
              <Link href="/#your-splits">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 6h14M5 12h14M5 18h9" />
                </svg>
                <span>Splits</span>
              </Link>
              <Link
                className={`mobile-tab-create ${active === "create" ? "active" : ""}`}
                href="/split/create"
                aria-current={active === "create" ? "page" : undefined}
              >
                <i aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </i>
                <span>Create</span>
              </Link>
              <Link
                className={active === "pay" ? "active" : ""}
                href="/split/pending"
                aria-current={active === "pay" ? "page" : undefined}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 4v16M6 14l6 6 6-6" />
                </svg>
                <span>Pay</span>
              </Link>
              <Link
                className={active === "onboarding" ? "active" : ""}
                href="/onboarding"
                aria-current={active === "onboarding" ? "page" : undefined}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9.8 9a2.3 2.3 0 1 1 3.4 2c-.8.4-1.2.9-1.2 2M12 17h.01" />
                </svg>
                <span>Guide</span>
              </Link>
            </nav>
          </section>
        </div>
      </main>
    </NotificationProvider>
  );
}
