"use client";

import { useMemo, type ReactNode } from "react";
import { BluxProvider, networks, useBlux } from "@bluxcc/react";
import { WalletProvider } from "@/contexts/WalletContext";
import type { BluxBridge } from "@/lib/wallet/blux-adapter";

function BluxWalletProvider({ children }: { children: ReactNode }) {
  const blux = useBlux();
  const bridge = useMemo<BluxBridge>(
    () => ({
      isReady: blux.isReady,
      isAuthenticated: blux.isAuthenticated,
      user: blux.user,
      sendEmailCode: blux.loginEmail.sendCode,
      loginWithEmailCode: blux.loginEmail.loginWithCode,
      loginPasskey: blux.loginPasskey,
      logout: blux.logout,
      profile: blux.profile,
      signTransaction: blux.signTransaction,
    }),
    [
      blux.isReady,
      blux.isAuthenticated,
      blux.user,
      blux.loginEmail.sendCode,
      blux.loginEmail.loginWithCode,
      blux.loginPasskey,
      blux.logout,
      blux.profile,
      blux.signTransaction,
    ],
  );

  return <WalletProvider blux={bridge}>{children}</WalletProvider>;
}

export function BluxAppProvider({ children, appId }: { children: ReactNode; appId: string }) {
  return (
    <BluxProvider
      config={{
        appId,
        appName: "Split",
        networks: [networks.testnet],
        defaultNetwork: networks.testnet,
        loginMethods: ["passkey", "email"],
        explorer: "stellarexpert",
        isPersistent: false,
        showWalletUIs: false,
      }}
    >
      <BluxWalletProvider>{children}</BluxWalletProvider>
    </BluxProvider>
  );
}
