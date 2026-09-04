import { NETWORK_PASSPHRASE } from "@/lib/split-contract";
import { accountType, type WalletConnection, type WalletSigner } from "@/lib/wallet/types";

export type BluxUser = {
  address: string;
  authMethod?: string;
  authValue?: string;
};

export type BluxBridge = {
  isReady: boolean;
  isAuthenticated: boolean;
  user?: BluxUser;
  login: () => Promise<BluxUser>;
  logout: () => void;
  profile: () => void;
  signTransaction: (transactionXdr: string, options?: { network: string }) => Promise<unknown>;
};

export function connectionFromBlux(blux: BluxBridge): WalletConnection | null {
  const address = blux.user?.address;
  if (!blux.isAuthenticated || !address) return null;
  if (!address.startsWith("G")) {
    throw new Error(
      "This embedded account type is not supported by Split yet. Use a classic Stellar G… account.",
    );
  }

  const signer: WalletSigner = {
    async signTransaction(transactionXdr) {
      const signed = await blux.signTransaction(transactionXdr, {
        network: NETWORK_PASSPHRASE,
      });
      if (typeof signed !== "string" || !signed) {
        throw new Error("Blux returned an invalid signed transaction.");
      }
      return signed;
    },
  };

  return {
    session: {
      provider: "blux",
      address,
      accountType: accountType(address),
      loginMethod: "email",
    },
    signer,
  };
}

export async function connectBlux(blux: BluxBridge): Promise<WalletConnection> {
  if (!blux.isReady) throw new Error("Secure email login is still initializing.");
  const user = blux.isAuthenticated && blux.user ? blux.user : await blux.login();
  const connection = connectionFromBlux({ ...blux, isAuthenticated: true, user });
  if (!connection) throw new Error("Email login did not return a Stellar account.");
  return connection;
}
