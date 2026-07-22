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
import { signTransaction } from "@stellar/freighter-api";

export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const NETWORK_NAME = "TESTNET";

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
  XLM: requiredEnv(
    "NEXT_PUBLIC_XLM_TOKEN_CONTRACT",
    process.env.NEXT_PUBLIC_XLM_TOKEN_CONTRACT,
  ),
  USDC: requiredEnv(
    "NEXT_PUBLIC_USDC_TOKEN_CONTRACT",
    process.env.NEXT_PUBLIC_USDC_TOKEN_CONTRACT,
  ),
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

const server = new rpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith("http:") });
const contract = new Contract(CONTRACT_ID);

const transactionErrors: Record<string, string> = {
  txBadAuth: "The transaction signature did not authorize the connected Stellar account.",
  txBadSeq: "The account sequence changed before submission. Refresh and try again.",
  txInsufficientBalance: "The connected account does not have enough testnet XLM for the transaction fee and reserve.",
  txInsufficientFee: "The transaction fee was below the amount required by Stellar.",
  txNoAccount: "The connected wallet account is not funded on Stellar testnet.",
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

function transactionResultCode(result: xdr.TransactionResult): string {
  try {
    return String(result.result().switch().name);
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
  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    // Leave enough time for a person to inspect and approve the wallet prompt.
    .setTimeout(300)
    .build();
}

async function read(method: string, args: xdr.ScVal[] = []) {
  try {
    // Read-only simulations do not consume sequence numbers, so the source only
    // needs to be a valid public key; it does not need to remain funded.
    const transaction = new TransactionBuilder(new Account(SIMULATION_SOURCE, "0"), {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();
    const simulation = await server.simulateTransaction(transaction);
    if (rpc.Api.isSimulationError(simulation)) throw new Error(simulation.error);
    if (!simulation.result) throw new Error("The contract returned no result.");
    return scValToNative(simulation.result.retval);
  } catch (error) {
    throw contractError(error);
  }
}

async function write(source: string, method: string, args: xdr.ScVal[]) {
  try {
    const transaction = await buildInvocation(source, method, args);
    const prepared = await server.prepareTransaction(transaction);
    const signed = await signTransaction(prepared.toXDR(), {
      address: source,
      networkPassphrase: NETWORK_PASSPHRASE,
    });
    if (signed.error) throw new Error(signed.error.message);
    const signedTransaction = TransactionBuilder.fromXDR(signed.signedTxXdr, NETWORK_PASSPHRASE);
    const submitted = await server.sendTransaction(signedTransaction);
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
      throw new Error("Stellar is temporarily unable to accept the transaction. Please try again shortly.");
    }

    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const result = await server.getTransaction(submitted.hash);
      if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        return { hash: submitted.hash, value: result.returnValue ? scValToNative(result.returnValue) : null };
      }
      if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
        const resultCode = transactionResultCode(result.resultXdr);
        logTransactionFailure("confirmation", {
          method,
          resultCode,
          hash: submitted.hash,
          ledger: result.ledger,
          diagnosticEventsXdr: result.diagnosticEventsXdr?.map((event) => event.toXDR("base64")),
        });
        throw new Error(
          transactionErrors[resultCode] ??
            `The transaction failed on-chain (${resultCode}).`,
        );
      }
    }
    throw new Error("The transaction is still pending. Check Stellar Expert with the transaction hash.");
  } catch (error) {
    throw contractError(error);
  }
}

export function tokenSymbol(address: string): TokenSymbol | "TOKEN" {
  if (address === TOKEN_CONTRACTS.XLM) return "XLM";
  if (address === TOKEN_CONTRACTS.USDC) return "USDC";
  return "TOKEN";
}

export function toBaseUnits(value: string): bigint {
  const normalized = value.trim();
  if (!/^\d+(\.\d{0,7})?$/.test(normalized)) throw new Error("Use an amount with no more than 7 decimal places.");
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 10_000_000n + BigInt(fraction.padEnd(7, "0"));
}

export function formatAmount(value: bigint, maximumFractionDigits = 2): string {
  return (Number(value) / 10_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits,
  });
}

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 5)}…${address.slice(-4)}` : address;
}

export async function getSplitCount(): Promise<number> {
  return Number(await read("get_split_count"));
}

export async function getSplit(splitId: number): Promise<SplitRecord | null> {
  const value = await read("get_split", [nativeToScVal(splitId, { type: "u32" })]);
  if (!value) return null;
  return {
    id: Number(value.id), creator: String(value.creator), title: String(value.title), token: String(value.token),
    requestedAmount: BigInt(value.requested_amount), totalAmount: BigInt(value.total_amount),
    waivedAmount: BigInt(value.waived_amount), totalPaid: BigInt(value.total_paid),
    participantCount: Number(value.participant_count), status: enumName(value.status) as SplitStatus,
    createdAt: BigInt(value.created_at),
  };
}

export async function getParticipants(splitId: number, start = 0, limit = 50): Promise<ParticipantShare[]> {
  const values = await read("get_participants", [
    nativeToScVal(splitId, { type: "u32" }), nativeToScVal(start, { type: "u32" }), nativeToScVal(limit, { type: "u32" }),
  ]);
  return (values as Record<string, unknown>[]).map((value) => ({
    splitId: Number(value.split_id), participant: String(value.participant), displayName: String(value.display_name),
    amountOwed: BigInt(value.amount_owed as bigint), amountPaid: BigInt(value.amount_paid as bigint),
    status: enumName(value.status) as ParticipantStatus,
  }));
}

export async function getRecentSplits(limit = 12): Promise<SplitRecord[]> {
  const count = await getSplitCount();
  const first = Math.max(0, count - limit);
  const records = await Promise.all(Array.from({ length: count - first }, (_, offset) => getSplit(first + offset)));
  return records.filter((record): record is SplitRecord => record !== null).reverse();
}

function participantScVal(participant: NewParticipant) {
  return nativeToScVal(
    { address: new Address(participant.address), display_name: participant.displayName },
    { type: { address: ["symbol", null], display_name: ["symbol", null] } },
  );
}

export async function createSplit(input: {
  creator: string; title: string; token: string; requestedAmount: bigint; totalAmount: bigint; participants: NewParticipant[];
}) {
  return write(input.creator, "create_split", [
    new Address(input.creator).toScVal(), nativeToScVal(input.title), new Address(input.token).toScVal(),
    nativeToScVal(input.requestedAmount, { type: "i128" }), nativeToScVal(input.totalAmount, { type: "i128" }),
    xdr.ScVal.scvVec(input.participants.map(participantScVal)),
  ]);
}

export async function payShare(splitId: number, payer: string, amount: bigint) {
  return write(payer, "pay_share", [nativeToScVal(splitId, { type: "u32" }), new Address(payer).toScVal(), nativeToScVal(amount, { type: "i128" })]);
}

export async function closeSplit(splitId: number, creator: string) {
  return write(creator, "close_split", [nativeToScVal(splitId, { type: "u32" })]);
}
