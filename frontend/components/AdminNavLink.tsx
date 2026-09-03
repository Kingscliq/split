"use client";

import Link from "next/link";
import { useWallet } from "@/contexts/WalletContext";
import { isAdminWallet } from "@/lib/admin";

export function AdminNavLink({
  active = false,
  compact = false,
}: {
  active?: boolean;
  compact?: boolean;
}) {
  const { address } = useWallet();

  if (!isAdminWallet(address)) return null;

  if (compact) {
    return (
      <Link className="mobile-admin-link" href="/admin" aria-label="Open admin dashboard">
        ⌁
      </Link>
    );
  }

  return (
    <Link className={active ? "active" : ""} href="/admin">
      <span>⌁</span> Admin
    </Link>
  );
}
