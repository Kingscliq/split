create table if not exists public.split_events (
  event_id text primary key,
  contract_id text not null,
  event_type text not null check (event_type in ('created', 'share_paid', 'completed', 'closed')),
  split_id bigint not null check (split_id >= 0),
  tx_hash text not null check (tx_hash ~ '^[0-9a-f]{64}$'),
  ledger bigint not null check (ledger > 0),
  ledger_closed_at timestamptz not null,
  actor text,
  amount numeric(40, 0),
  amount_paid numeric(40, 0),
  amount_owed numeric(40, 0),
  total_paid numeric(40, 0),
  total_amount numeric(40, 0),
  participant_count integer,
  raw_event jsonb not null,
  indexed_at timestamptz not null default now()
);

create index if not exists split_events_split_ledger_idx
  on public.split_events (split_id, ledger desc, event_id desc);
create index if not exists split_events_actor_ledger_idx
  on public.split_events (actor, ledger desc)
  where actor is not null;
create index if not exists split_events_tx_hash_idx
  on public.split_events (tx_hash);

create table if not exists public.split_indexer_state (
  contract_id text primary key,
  cursor text,
  last_ledger bigint,
  updated_at timestamptz not null default now()
);

alter table public.split_events enable row level security;
alter table public.split_indexer_state enable row level security;

revoke all on table public.split_events from anon, authenticated;
revoke all on table public.split_indexer_state from anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant select on table public.split_events to anon, authenticated;
grant all on table public.split_events to service_role;
grant all on table public.split_indexer_state to service_role;

drop policy if exists "Public can read indexed on-chain events" on public.split_events;
create policy "Public can read indexed on-chain events"
  on public.split_events
  for select
  to anon, authenticated
  using (true);

comment on table public.split_events is
  'Durable, read-only index of public events emitted by the Split Soroban contract.';
comment on table public.split_indexer_state is
  'Private cursor state used only by the Supabase event-ingestion function.';
