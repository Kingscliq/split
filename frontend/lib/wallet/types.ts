export type WalletProviderId = "blux" | "freighter";
export type WalletAccountType = "classic" | "contract";

export type WalletSession = {
  provider: WalletProviderId;
  address: string;
  accountType: WalletAccountType;
  loginMethod: "email" | "google" | "passkey" | "wallet";
};

export type SignTransactionOptions = {
  address: string;
  networkPassphrase: string;
};

export type WalletTransportSigner = {
  signTransaction: (transactionXdr: string, options: SignTransactionOptions) => Promise<string>;
};

export type TransactionApprovalParticipant = {
  address: string;
  displayName: string;
  amount?: bigint;
};

export type TransactionApprovalRequest = {
  action: "create" | "pay" | "close";
  account: string;
  contractId: string;
  network: "Stellar Testnet";
  title: string;
  splitId?: number;
  asset?: string;
  amount?: bigint;
  requestedAmount?: bigint;
  recipient?: string;
  networkFee?: bigint;
  participants?: TransactionApprovalParticipant[];
};

export type TransactionStage =
  | "preparing"
  | "review"
  | "signing"
  | "submitting"
  | "confirming"
  | "success"
  | "failure";

export type TransactionApprovalState = {
  request: TransactionApprovalRequest;
  stage: TransactionStage;
  hash?: string;
  error?: string;
};

export type TransactionExecutionControls = {
  requestApproval: (details?: { networkFee?: bigint }) => Promise<void>;
  signTransaction: WalletTransportSigner["signTransaction"];
  setStage: (
    stage: Exclude<TransactionStage, "preparing" | "review" | "failure">,
    hash?: string,
  ) => void;
};

export type WalletSigner = {
  runTransaction: <T>(
    request: TransactionApprovalRequest,
    execute: (controls: TransactionExecutionControls) => Promise<T>,
  ) => Promise<T>;
};

export type WalletConnection = {
  session: WalletSession;
  signer: WalletTransportSigner;
};

export function accountType(address: string): WalletAccountType {
  return address.startsWith("C") ? "contract" : "classic";
}
