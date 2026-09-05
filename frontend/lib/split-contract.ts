import {
  Address,
  Account,
  BASE_FEE,
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import type { TransactionApprovalRequest, WalletSigner } from "@/lib/wallet/types";

export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const NETWORK_NAME = "TESTNET";
export const STELLAR_EXPERT_TESTNET_URL = "https://stellar.expert/explorer/testnet";

function requiredEnv(name: string, value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return normalized;
}

export const CONTRACT_ID = requiredEnv(
  "NEXT_PUBLIC_SPLIT_CONTRACT_ID",
  process.env.NEXT_PUBLIC_SPLIT_CONTRACT_ID,
);
export const RPC_URL = requiredEnv(
  "NEXT_PUBLIC_STELLAR_RPC_URL",
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL,
);
export const SIMULATION_SOURCE = requiredEnv(
  "NEXT_PUBLIC_SIMULATION_SOURCE",
  process.env.NEXT_PUBLIC_SIMULATION_SOURCE,
);

export const TOKEN_CONTRACTS = {
  XLM: requiredEnv("NEXT_PUBLIC_XLM_TOKEN_CONTRACT", process.env.NEXT_PUBLIC_XLM_TOKEN_CONTRACT),
  USDC: requiredEnv("NEXT_PUBLIC_USDC_TOKEN_CONTRACT", process.env.NEXT_PUBLIC_USDC_TOKEN_CONTRACT),
} as const;

export type TokenSymbol = keyof typeof TOKEN_CONTRACTS;
export type SplitStatus = "Active" | "Completed" | "Closed";
export type ParticipantStatus = "Pending" | "Partial" | "Paid";

export type SplitRecord = {
  id: number;
  creator: string;
  title: string;
  token: string;
  requestedAmount: bigint;
  totalAmount: bigint;
  waivedAmount: bigint;
  totalPaid: bigint;
  participantCount: number;
  status: SplitStatus;
  createdAt: bigint;
};

export type ParticipantShare = {
  splitId: number;
  participant: string;
  displayName: string;
  amountOwed: bigint;
  amountPaid: bigint;
  status: ParticipantStatus;
};

export type NewParticipant = { address: string; displayName: string };

export type SplitWithParticipants = SplitRecord & {
  participants: ParticipantShare[];
};

export type PendingShareRecord = {
  split: SplitRecord;
  share: ParticipantShare;
};

const server = new rpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith("http:") });
const contract = new Contract(CONTRACT_ID);

const transactionErrors: Record<string, string> = {
  txBadAuth: "The transaction signature did not authorize the connected Stellar account.",
  txBadSeq: "The account sequence changed before submission. Refresh and try again.",
  txInsufficientBalance:
    "This wallet does not have enough Testnet XLM for the payment, fee, and account reserve.",
  txInsufficientFee: "The transaction fee was below the amount required by Stellar.",
  txNoAccount: "This wallet has no Testnet XLM yet. Fund it with Friendbot, then try again.",
  txTooLate: "The transaction expired before it reached Stellar. Please try again.",
  txTooEarly: "The transaction was submitted before its valid time window.",
  txSorobanInvalid: "Stellar rejected the contract transaction as invalid.",
};

function enumName(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return String(value);
}

function contractError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (/user rejected|user denied|declined|signature.*cancelled/i.test(message)) {
    return new Error("The wallet signature was cancelled. Nothing was submitted to Stellar.");
  }
  if (/account[^\n]*(not found|does not exist)|not found[^\n]*account/i.test(message)) {
    return new Error("This wallet has no Testnet XLM yet. Fund it with Friendbot, then try again.");
  }
  const code = message.match(/Error\(Contract, #(\d+)\)/)?.[1];
  const names: Record<string, string> = {
    "1": "Add a title between 1 and 80 characters.",
    "2": "Add between 1 and 50 participants.",
    "3": "Participant names must be 40 characters or fewer.",
    "4": "Enter an amount greater than zero.",
    "5": "The final amount must divide equally between all participants.",
    "6": "Each participant wallet must be unique.",
    "7": "The creator cannot also be a participant.",
    "8": "This split does not exist.",
    "9": "This wallet is not a participant in the split.",
    "10": "Only the creator can do that.",
    "11": "This split is closed.",
    "12": "This split is already complete.",
    "13": "That payment is greater than the remaining share.",
    "14": "The participant page size is invalid.",
    "15": "The final amount cannot exceed the requested amount.",
  };
  return new Error(code && names[code] ? names[code] : message);
}

export function isTransactionApprovalCancelled(error: unknown) {
  return error instanceof Error && error.name === "TransactionApprovalCancelled";
}

function transactionResultCode(result: xdr.TransactionResult): string {
  try {
    return result.result.type;
  } catch {
    return "unknownTransactionError";
  }
}

function logTransactionFailure(
  stage: "submission" | "confirmation",
  context: Record<string, unknown>,
) {
  if (process.env.NODE_ENV === "production") return;

  // Do not log signed transaction XDR or wallet secrets.
  console.warn(`[split:${stage}]`, context);
}

async function buildInvocation(source: string, method: string, args: xdr.ScVal[]) {
  const account = await server.getAccount(source);
  return (
    new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      // Leave enough time for a person to inspect and approve the wallet prompt.
      .setTimeout(300)
      .build()
  );
}

async function readFrom(
  target: Contract,
  method: string,
  args: xdr.ScVal[] = [],
  mapError: (error: unknown) => Error = contractError,
) {
  try {
    // Read-only simulations do not consume sequence numbers, so the source only
    // needs to be a valid public key; it does not need to remain funded.
    const transaction = new TransactionBuilder(new Account(SIMULATION_SOURCE, "0"), {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(target.call(method, ...args))
      .setTimeout(30)
      .build();
    const simulation = await server.simulateTransaction(transaction);
    if (rpc.Api.isSimulationError(simulation)) throw new Error(simulation.error);
    if (!simulation.result) throw new Error("The contract returned no result.");
    return scValToNative(simulation.result.retval);
  } catch (error) {
    throw mapError(error);
  }
}

async function read(method: string, args: xdr.ScVal[] = []) {
  return readFrom(contract, method, args);
}

type WriteApproval = Omit<TransactionApprovalRequest, "account" | "contractId" | "network">;

async function write(
  source: string,
  method: string,
  args: xdr.ScVal[],
  signer: WalletSigner,
  approval: WriteApproval,
) {
  return signer.runTransaction(
    {
      ...approval,
      account: source,
      contractId: CONTRACT_ID,
      network: "Stellar Testnet",
    },
    async ({ requestApproval, signTransaction, setStage }) => {
      try {
        const transaction = await buildInvocation(source, method, args);
        const prepared = await server.prepareTransaction(transaction);
        await requestApproval({ networkFee: BigInt(prepared.fee) });
        setStage("signing");
        const signedTransactionXdr = await signTransaction(prepared.toXDR(), {
          address: source,
          networkPassphrase: NETWORK_PASSPHRASE,
        });
        const signedTransaction = TransactionBuilder.fromXDR(
          signedTransactionXdr,
          NETWORK_PASSPHRASE,
        );
        setStage("submitting");
        const submitted = await server.sendTransaction(signedTransaction);
        if (submitted.hash) setStage("submitting", submitted.hash);
        if (submitted.status === "ERROR") {
          const resultCode = submitted.errorResult
            ? transactionResultCode(submitted.errorResult)
            : "unknownTransactionError";
          logTransactionFailure("submission", {
            method,
            status: submitted.status,
            resultCode,
            hash: submitted.hash,
            latestLedger: submitted.latestLedger,
            errorResultXdr: submitted.errorResult?.toXDR("base64"),
            diagnosticEventsXdr: submitted.diagnosticEvents?.map((event) => event.toXDR("base64")),
          });
          throw new Error(
            transactionErrors[resultCode] ??
              `Stellar rejected the transaction (${resultCode}). Please try again.`,
          );
        }
        if (submitted.status === "TRY_AGAIN_LATER") {
          throw new Error(
            "Stellar is temporarily unable to accept the transaction. Please try again shortly.",
          );
        }

        setStage("confirming", submitted.hash);
        for (let attempt = 0; attempt < 20; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const result = await server.getTransaction(submitted.hash);
          if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
            return {
              hash: submitted.hash,
              value: result.returnValue ? scValToNative(result.returnValue) : null,
            };
          }
          if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
            const resultCode = transactionResultCode(result.resultXdr);
            logTransactionFailure("confirmation", {
              method,
              resultCode,
              hash: submitted.hash,
              ledger: result.ledger,
              diagnosticEventsXdr: result.diagnosticEventsXdr?.map((event) =>
                event.toXDR("base64"),
              ),
            });
            throw new Error(
              transactionErrors[resultCode] ?? `The transaction failed on-chain (${resultCode}).`,
            );
          }
        }
        throw new Error(
          "The transaction is still pending. Check Stellar Expert with the transaction hash.",
        );
      } catch (error) {
        if (error instanceof Error && error.name === "TransactionApprovalCancelled") throw error;
        throw contractError(error);
      }
    },
  );
}

export function tokenSymbol(address: string): TokenSymbol | "TOKEN" {
  if (address === TOKEN_CONTRACTS.XLM) return "XLM";
  if (address === TOKEN_CONTRACTS.USDC) return "USDC";
  return "TOKEN";
}

export function toBaseUnits(value: string): bigint {
  const normalized = value.trim();
  if (!/^\d+(\.\d{0,7})?$/.test(normalized))
    throw new Error("Use an amount with no more than 7 decimal places.");
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 10_000_000n + BigInt(fraction.padEnd(7, "0"));
}

export function formatAmount(value: bigint, maximumFractionDigits = 2): string {
  return (Number(value) / 10_000_000).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits,
  });
}

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 5)}…${address.slice(-4)}` : address;
}

export function transactionExplorerUrl(hash: string): string {
  return `${STELLAR_EXPERT_TESTNET_URL}/tx/${encodeURIComponent(hash)}`;
}

export async function getSplitCount(): Promise<number> {
  return Number(await read("get_split_count"));
}

export async function getSplit(splitId: number): Promise<SplitRecord | null> {
  const value = await read("get_split", [nativeToScVal(splitId, { type: "u32" })]);
  if (!value) return null;
  return {
    id: Number(value.id),
    creator: String(value.creator),
    title: String(value.title),
    token: String(value.token),
    requestedAmount: BigInt(value.requested_amount),
    totalAmount: BigInt(value.total_amount),
    waivedAmount: BigInt(value.waived_amount),
    totalPaid: BigInt(value.total_paid),
    participantCount: Number(value.participant_count),
    status: enumName(value.status) as SplitStatus,
    createdAt: BigInt(value.created_at),
  };
}

function participantShareFromNative(value: Record<string, unknown>): ParticipantShare {
  return {
    splitId: Number(value.split_id),
    participant: String(value.participant),
    displayName: String(value.display_name),
    amountOwed: BigInt(value.amount_owed as bigint),
    amountPaid: BigInt(value.amount_paid as bigint),
    status: enumName(value.status) as ParticipantStatus,
  };
}

export async function getParticipant(
  splitId: number,
  participant: string,
): Promise<ParticipantShare | null> {
  const value = await read("get_participant", [
    nativeToScVal(splitId, { type: "u32" }),
    new Address(participant).toScVal(),
  ]);
  if (!value) return null;
  return participantShareFromNative(value as Record<string, unknown>);
}

export async function getParticipants(
  splitId: number,
  start = 0,
  limit = 50,
): Promise<ParticipantShare[]> {
  const values = await read("get_participants", [
    nativeToScVal(splitId, { type: "u32" }),
    nativeToScVal(start, { type: "u32" }),
    nativeToScVal(limit, { type: "u32" }),
  ]);
  return (values as Record<string, unknown>[]).map(participantShareFromNative);
}

export async function getRecentSplits(limit = 12): Promise<SplitRecord[]> {
  const count = await getSplitCount();
  const first = Math.max(0, count - limit);
  const records = await Promise.all(
    Array.from({ length: count - first }, (_, offset) => getSplit(first + offset)),
  );
  return records.filter((record): record is SplitRecord => record !== null).reverse();
}

export async function getSplitsForWallet(wallet: string, limit = 50): Promise<SplitRecord[]> {
  const count = await getSplitCount();
  const first = Math.max(0, count - Math.max(1, Math.min(limit, 50)));
  const records = (
    await Promise.all(
      Array.from({ length: count - first }, (_, offset) => getSplit(first + offset)),
    )
  ).filter((record): record is SplitRecord => record !== null);

  const visible = await Promise.all(
    records.map(async (record) => {
      if (record.creator === wallet) return record;
      const shares = await getParticipants(record.id, 0, record.participantCount);
      return shares.some((share) => share.participant === wallet) ? record : null;
    }),
  );

  return visible.filter((record): record is SplitRecord => record !== null).reverse();
}

export async function getPendingSharesForWallet(
  wallet: string,
  limit = 50,
): Promise<PendingShareRecord[]> {
  const count = await getSplitCount();
  const first = Math.max(0, count - Math.max(1, Math.min(limit, 50)));
  const records = (
    await Promise.all(
      Array.from({ length: count - first }, (_, offset) => getSplit(first + offset)),
    )
  ).filter((record): record is SplitRecord => record !== null && record.status === "Active");

  const pending = await Promise.all(
    records.map(async (split) => {
      const shares = await getParticipants(split.id, 0, split.participantCount);
      const share = shares.find(
        (participant) => participant.participant === wallet && participant.status !== "Paid",
      );
      return share ? { split, share } : null;
    }),
  );

  return pending.filter((record): record is PendingShareRecord => record !== null).reverse();
}

export async function getAllSplitsWithParticipants(): Promise<SplitWithParticipants[]> {
  const count = await getSplitCount();
  const splits = (
    await Promise.all(Array.from({ length: count }, (_, splitId) => getSplit(splitId)))
  ).filter((record): record is SplitRecord => record !== null);

  const records = await Promise.all(
    splits.map(async (split) => ({
      ...split,
      participants: await getParticipants(split.id, 0, split.participantCount),
    })),
  );

  return records.reverse();
}

export async function getTokenBalance(token: string, wallet: string): Promise<bigint> {
  try {
    const value = await readFrom(
      new Contract(token),
      "balance",
      [new Address(wallet).toScVal()],
      (error) => (error instanceof Error ? error : new Error(String(error))),
    );
    return BigInt(value ?? 0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Classic-asset SAC contracts report a missing trustline as a contract
    // error. For a balance display, that is equivalent to holding zero.
    if (/trustline entry is missing/i.test(message)) return 0n;
    throw error;
  }
}

function participantScVal(participant: NewParticipant) {
  return nativeToScVal(
    { address: new Address(participant.address), display_name: participant.displayName },
    { type: { address: ["symbol", null], display_name: ["symbol", null] } },
  );
}

export async function createSplit(
  input: {
    creator: string;
    title: string;
    token: string;
    requestedAmount: bigint;
    totalAmount: bigint;
    participants: NewParticipant[];
  },
  signer: WalletSigner,
) {
  return write(
    input.creator,
    "create_split",
    [
      new Address(input.creator).toScVal(),
      nativeToScVal(input.title),
      new Address(input.token).toScVal(),
      nativeToScVal(input.requestedAmount, { type: "i128" }),
      nativeToScVal(input.totalAmount, { type: "i128" }),
      xdr.ScVal.scvVec(input.participants.map(participantScVal)),
    ],
    signer,
    {
      action: "create",
      title: input.title,
      asset: tokenSymbol(input.token),
      amount: input.totalAmount,
      requestedAmount: input.requestedAmount,
      participants: input.participants.map((participant) => ({
        ...participant,
        amount: input.totalAmount / BigInt(input.participants.length),
      })),
    },
  );
}

export async function payShare(
  splitId: number,
  payer: string,
  amount: bigint,
  signer: WalletSigner,
  details: { title: string; asset: string; recipient: string },
) {
  return write(
    payer,
    "pay_share",
    [
      nativeToScVal(splitId, { type: "u32" }),
      new Address(payer).toScVal(),
      nativeToScVal(amount, { type: "i128" }),
    ],
    signer,
    {
      action: "pay",
      title: details.title,
      splitId,
      asset: details.asset,
      amount,
      recipient: details.recipient,
    },
  );
}

export async function closeSplit(
  splitId: number,
  creator: string,
  signer: WalletSigner,
  title: string,
) {
  return write(creator, "close_split", [nativeToScVal(splitId, { type: "u32" })], signer, {
    action: "close",
    title,
    splitId,
  });
}
