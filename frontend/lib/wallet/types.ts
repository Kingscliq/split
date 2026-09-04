export type WalletProviderId = "blux" | "freighter";
export type WalletAccountType = "classic" | "contract";

export type WalletSession = {
  provider: WalletProviderId;
  address: string;
  accountType: WalletAccountType;
  loginMethod: "email" | "wallet";
};

export type SignTransactionOptions = {
  address: string;
  networkPassphrase: string;
};

export type WalletSigner = {
  signTransaction: (transactionXdr: string, options: SignTransactionOptions) => Promise<string>;
};

export type WalletConnection = {
  session: WalletSession;
  signer: WalletSigner;
};

export function accountType(address: string): WalletAccountType {
  return address.startsWith("C") ? "contract" : "classic";
}
