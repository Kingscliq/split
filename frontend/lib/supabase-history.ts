import { CONTRACT_ID } from "@/lib/split-contract";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export type IndexedSplitEvent = {
  eventId: string;
  eventType: "created" | "share_paid" | "completed" | "closed";
  splitId: number;
  transactionHash: string;
  ledger: number;
  ledgerClosedAt: string;
  actor: string | null;
  amount: bigint | null;
  totalPaid: bigint | null;
  totalAmount: bigint | null;
};

type EventRow = {
  event_id: string;
  event_type: IndexedSplitEvent["eventType"];
  split_id: number;
  tx_hash: string;
  ledger: number;
  ledger_closed_at: string;
  actor: string | null;
  amount: string | number | null;
  total_paid: string | number | null;
  total_amount: string | number | null;
};

function optionalBigInt(value: string | number | null): bigint | null {
  return value === null ? null : BigInt(value);
}

export function isActivityHistoryConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

export async function getIndexedSplitEvents(splitId: number): Promise<IndexedSplitEvent[]> {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return [];
  const query = new URLSearchParams({
    select:
      "event_id,event_type,split_id,tx_hash,ledger,ledger_closed_at,actor,amount,total_paid,total_amount",
    contract_id: `eq.${CONTRACT_ID}`,
    split_id: `eq.${splitId}`,
    order: "ledger.desc,event_id.desc",
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/split_events?${query}`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Transaction history is temporarily unavailable.");
  const rows = (await response.json()) as EventRow[];
  return rows.map((row) => ({
    eventId: row.event_id,
    eventType: row.event_type,
    splitId: row.split_id,
    transactionHash: row.tx_hash,
    ledger: row.ledger,
    ledgerClosedAt: row.ledger_closed_at,
    actor: row.actor,
    amount: optionalBigInt(row.amount),
    totalPaid: optionalBigInt(row.total_paid),
    totalAmount: optionalBigInt(row.total_amount),
  }));
}
