-- Run this only after the Edge Function is deployed and both Vault secrets exist.
-- Replace the two placeholder values locally before running; never commit real secrets.

select vault.create_secret(
  'https://YOUR_PROJECT_REF.supabase.co',
  'split_project_url',
  'Base URL of the Split Supabase project'
);

select vault.create_secret(
  'REPLACE_WITH_THE_SAME_RANDOM_VALUE_AS_INDEXER_SECRET',
  'split_indexer_secret',
  'Authenticates the scheduled Split event-indexing request'
);

select cron.schedule(
  'index-split-events-every-2-minutes',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'split_project_url')
      || '/functions/v1/index-split-events',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-indexer-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'split_indexer_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
