# Supabase event indexer setup

Split keeps immediate transaction receipts in the browser and stores durable contract history in Supabase. The indexer reads public Stellar Testnet events; it never signs transactions and requires no wallet secret.

## Architecture

```text
Stellar Testnet RPC
        |
        v
Supabase Edge Function -- service-only writes --> split_events
        ^                                      --> split_indexer_state
        |
Supabase Cron (every two minutes)

Split frontend -- publishable-key reads only --> split_events
```

## 1. Link the repository

Install or run the Supabase CLI, authenticate, and link the project:

```bash
npx supabase login
npx supabase link --project-ref aanaquavtfmevwfiycnm
```

The login token, database password, secret key, and generated `.temp` files must not be committed.

## 2. Create the tables and access policies

```bash
npx supabase db push
```

The migration creates:

- `split_events`, publicly readable because the indexed blockchain activity is already public
- `split_indexer_state`, inaccessible to browser roles
- explicit read-only grants and Row Level Security for browser access

Only the Edge Function's server-side role can insert or update rows.

## 3. Configure and deploy the Edge Function

Generate a dedicated random value and keep it in your terminal/password manager:

```bash
INDEXER_SECRET_VALUE="$(openssl rand -hex 32)"
```

Set the function secrets:

```bash
npx supabase secrets set \
  INDEXER_SECRET="$INDEXER_SECRET_VALUE" \
  STELLAR_RPC_URL="https://soroban-testnet.stellar.org" \
  SPLIT_CONTRACT_ID="CAMQBDU43E2QJSOLKSMPRK4NIO73RRPPRVMSZGNNQEPOJVHJM674KECL" \
  BACKFILL_LEDGERS="20000"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied automatically inside hosted Supabase Edge Functions. Do not add the service-role key to the frontend or any `NEXT_PUBLIC_*` variable.

Deploy:

```bash
npx supabase functions deploy index-split-events --no-verify-jwt
```

The function disables Supabase JWT verification because Cron is not a user session. It still rejects every request that does not carry the private `x-indexer-secret` header.

## 4. Run the first backfill

```bash
curl -X POST \
  "https://aanaquavtfmevwfiycnm.supabase.co/functions/v1/index-split-events" \
  -H "Content-Type: application/json" \
  -H "x-indexer-secret: $INDEXER_SECRET_VALUE" \
  -d '{}'
```

A successful response contains `ok: true` and the number of indexed events. The default backfill covers roughly the latest 20,000 ledgers, including the current Level 5 testing activity. Subsequent calls continue from the saved RPC cursor.

## 5. Schedule ingestion

Open `supabase/cron/index-split-events.sql` locally, replace both placeholders, and run it once in the Supabase SQL Editor. Use the same `INDEXER_SECRET_VALUE` configured on the function. The SQL stores both values in Supabase Vault and schedules the function every two minutes.

Do not commit the filled-in SQL file. The checked-in file must retain placeholders.

## 6. Configure Vercel

Add these variables to the Vercel project for Production, Preview, and Development as appropriate:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://aanaquavtfmevwfiycnm.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<project-publishable-key>
```

Redeploy the frontend. Each `/split/:id` page will then show the permanent activity timeline and a Stellar Expert link for every indexed transaction.

## Verification

Confirm all of the following:

1. `split_events` contains `created`, `share_paid`, and `completed` rows from current Testnet usage.
2. The transaction `9647bbac311113fbecc61ad7bc8ad6a060352f4ff1c6e5aea7c099933340e02a` appears for Split `#1` after backfill.
3. An anonymous `SELECT` succeeds.
4. An anonymous `INSERT`, `UPDATE`, or `DELETE` fails.
5. Calling the Edge Function without `x-indexer-secret` returns `401`.
6. A Split page still loads contract state if Supabase history is temporarily unavailable.
