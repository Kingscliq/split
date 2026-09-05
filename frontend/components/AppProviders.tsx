"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { WalletProvider } from "@/contexts/WalletContext";

const bluxAppId = process.env.NEXT_PUBLIC_BLUX_APP_ID?.trim();
const BluxAppProvider = dynamic(
  () => import("@/components/BluxAppProvider").then((module) => module.BluxAppProvider),
  { ssr: false },
);

export function AppProviders({ children }: { children: ReactNode }) {
  if (!bluxAppId) return <WalletProvider>{children}</WalletProvider>;

  return <BluxAppProvider appId={bluxAppId}>{children}</BluxAppProvider>;
}
