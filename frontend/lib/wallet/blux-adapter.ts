import { NETWORK_PASSPHRASE } from "@/lib/split-contract";
import { accountType, type WalletConnection, type WalletTransportSigner } from "@/lib/wallet/types";

export type BluxUser = {
  address: string;
  authMethod?: string;
  authValue?: string;
};

export type BluxBridge = {
  isReady: boolean;
  isAuthenticated: boolean;
  user?: BluxUser;
  sendEmailCode: (email: string) => Promise<void>;
  loginWithEmailCode: (email: string, code: string) => Promise<BluxUser>;
  loginPasskey: () => Promise<BluxUser>;
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

  const signer: WalletTransportSigner = {
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
      loginMethod: blux.user?.authMethod?.toLowerCase().includes("passkey") ? "passkey" : "email",
    },
    signer,
  };
}

export async function connectBluxWithPasskey(blux: BluxBridge): Promise<WalletConnection> {
  if (!blux.isReady) throw new Error("Secure passkey login is still initializing.");
  const user = await blux.loginPasskey();
  const connection = connectionFromBlux({ ...blux, isAuthenticated: true, user });
  if (!connection) throw new Error("Passkey login did not return a Stellar account.");
  return connection;
}

export async function connectBluxWithEmailCode(
  blux: BluxBridge,
  email: string,
  code: string,
): Promise<WalletConnection> {
  if (!blux.isReady) throw new Error("Secure email login is still initializing.");
  const user = await blux.loginWithEmailCode(email, code);
  const connection = connectionFromBlux({ ...blux, isAuthenticated: true, user });
  if (!connection) throw new Error("Email login did not return a Stellar account.");
  return connection;
}
