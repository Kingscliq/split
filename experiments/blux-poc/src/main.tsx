import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BluxProvider, networks } from "@bluxcc/react";
import { App } from "./App";
import "./styles.css";

const appId = import.meta.env.VITE_BLUX_APP_ID;

if (!appId) {
  throw new Error(
    "VITE_BLUX_APP_ID is required. Copy .env.example to .env.local.",
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BluxProvider
      config={{
        appId,
        appName: "Split V2 Testnet Proof",
        networks: [networks.testnet],
        defaultNetwork: networks.testnet,
        loginMethods: ["email"],
        explorer: "stellarexpert",
        isPersistent: false,
        showWalletUIs: true,
      }}
    >
      <App />
    </BluxProvider>
  </StrictMode>,
);
