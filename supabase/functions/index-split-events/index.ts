import { createClient } from "npm:@supabase/supabase-js@2";
import { rpc, scValToNative } from "npm:@stellar/stellar-sdk@16.0.1";

const EVENT_TYPES = new Set(["created", "share_paid", "completed", "closed"]);
const PAGE_SIZE = 500;
const MAX_PAGES_PER_RUN = 10;

function requiredSecret(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

function asIntegerString(value: unknown): string | null {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number" && Number.isInteger(value)) return String(value);
  if (typeof value === "string" && /^-?\d+$/.test(value)) return value;
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "bigint" && value <= BigInt(Number.MAX_SAFE_INTEGER)) return Number(value);
  return null;
}

function asAddress(value: unknown): string | null {
  return typeof value === "string" && /^G[A-Z2-7]{55}$/.test(value) ? value : null;
}

function jsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSafe(item)]));
  }
  return value;
}

function ledgerFromCursor(cursor: string | null): number | null {
  if (!cursor) return null;
  const pagingToken = cursor.split("-", 1)[0];
  if (!/^\d+$/.test(pagingToken)) return null;

  const ledger = BigInt(pagingToken) >> 32n;
  return ledger <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(ledger) : null;
}

function eventRow(event: rpc.Api.EventResponse, contractId: string) {
  const topics = event.topic.map((topic) => scValToNative(topic));
  if (topics[0] !== "split" || typeof topics[1] !== "string" || !EVENT_TYPES.has(topics[1])) return null;
  const splitId = asNumber(topics[2]);
  if (splitId === null) return null;

  const value = scValToNative(event.value) as Record<string, unknown>;
  const eventType = topics[1];
  const actor = asAddress(eventType === "share_paid" ? value.payer : value.creator);

  return {
    event_id: event.id,
    contract_id: contractId,
    event_type: eventType,
    split_id: splitId,
    tx_hash: event.txHash.toLowerCase(),
    ledger: event.ledger,
    ledger_closed_at: event.ledgerClosedAt,
    actor,
    amount: asIntegerString(value.amount),
    amount_paid: asIntegerString(value.amount_paid),
    amount_owed: asIntegerString(value.amount_owed),
    total_paid: asIntegerString(value.total_paid),
    total_amount: asIntegerString(value.total_amount),
    participant_count: asNumber(value.participant_count),
    raw_event: jsonSafe({ topics, value }),
  };
}

Deno.serve(async (request) => {
  try {
    const expectedSecret = requiredSecret("INDEXER_SECRET");
    if (request.headers.get("x-indexer-secret") !== expectedSecret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = requiredSecret("SUPABASE_URL");
    const serviceRoleKey = requiredSecret("SUPABASE_SERVICE_ROLE_KEY");
    const rpcUrl = requiredSecret("STELLAR_RPC_URL");
    const contractId = requiredSecret("SPLIT_CONTRACT_ID");
    const backfillLedgers = Math.max(100, Number(Deno.env.get("BACKFILL_LEDGERS") ?? "20000"));
    const database = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const server = new rpc.Server(rpcUrl);

    const { data: state, error: stateError } = await database
      .from("split_indexer_state")
      .select("cursor,last_ledger")
      .eq("contract_id", contractId)
      .maybeSingle();
    if (stateError) throw stateError;

    const health = await server.getHealth();
    let cursor = typeof state?.cursor === "string" ? state.cursor : null;
    const savedLedger = typeof state?.last_ledger === "number" ? state.last_ledger : null;
    let indexedThroughLedger = savedLedger ?? Math.max(0, health.latestLedger - backfillLedgers);
    let indexed = 0;
    let pages = 0;

    while (pages < MAX_PAGES_PER_RUN) {
      const requestParams: rpc.Api.GetEventsRequest = cursor
        ? {
            cursor,
            filters: [{ type: "contract", contractIds: [contractId] }],
            limit: PAGE_SIZE,
          }
        : {
            startLedger: Math.max(
              health.oldestLedger + 1,
              savedLedger !== null ? savedLedger + 1 : health.latestLedger - backfillLedgers,
            ),
            filters: [{ type: "contract", contractIds: [contractId] }],
            limit: PAGE_SIZE,
          };

      const previousCursor = cursor;
      const response = await server.getEvents(requestParams);
      const rows = response.events
        .filter((event) => event.inSuccessfulContractCall !== false)
        .map((event) => eventRow(event, contractId))
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (rows.length > 0) {
        const { error: insertError } = await database
          .from("split_events")
          .upsert(rows, { onConflict: "event_id", ignoreDuplicates: true });
        if (insertError) throw insertError;
        indexed += rows.length;
      }

      cursor = response.cursor;
      indexedThroughLedger = ledgerFromCursor(cursor) ?? indexedThroughLedger;
      pages += 1;

      // Stellar RPC scans a bounded ledger window even when fewer than PAGE_SIZE
      // events are returned. Keep following its cursor until the scanned ledger
      // reaches the network tip; otherwise a quiet window can skip later events.
      if (cursor === previousCursor || indexedThroughLedger >= response.latestLedger) break;
    }

    const { error: cursorError } = await database.from("split_indexer_state").upsert({
      contract_id: contractId,
      cursor,
      last_ledger: indexedThroughLedger,
      updated_at: new Date().toISOString(),
    });
    if (cursorError) throw cursorError;

    return Response.json({
      ok: true,
      indexed,
      pages,
      cursor,
      indexedThroughLedger,
      networkLatestLedger: health.latestLedger,
      caughtUp: indexedThroughLedger >= health.latestLedger,
    });
  } catch (error) {
    console.error("Split event indexing failed", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Indexer failed" },
      { status: 500 },
    );
  }
});
