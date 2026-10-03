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
      loginOAuth: blux.loginOAuth,
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
      blux.loginOAuth,
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
        loginMethods: ["google", "passkey", "email"],
        explorer: "stellarexpert",
        isPersistent: false,
        showWalletUIs: false,
        appearance: {
          logo: "/icon.svg",
          fontFamily: "var(--font-geist-sans), Arial, sans-serif",
          textColor: "#f4f0e9",
          accentColor: "#d9ff4a",
          background: "#171817",
          fieldBackground: "#101110",
          borderRadius: "20px",
          borderColor: "rgba(255, 255, 255, 0.11)",
          borderWidth: "1px",
          outlineWidth: "1px",
          outlineColor: "rgba(255, 255, 255, 0.11)",
          outlineRadius: "24px",
          backdropBlur: "12px",
          backdropColor: "rgba(0, 0, 0, 0.82)",
          boxShadow: "0 28px 90px rgba(0, 0, 0, 0.55)",
        },
      }}
    >
      <BluxWalletProvider>{children}</BluxWalletProvider>
    </BluxProvider>
  );
}
