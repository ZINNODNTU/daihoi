-- V36: Internal system observability, separate from immutable audit_logs.
-- Run on the correct Supabase project after database backup.
begin;
create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  level text not null check (level in ('critical','error','warning','info')),
  source text not null check (length(source) between 2 and 60),
  event text not null check (length(event) between 3 and 120),
  message text not null check (length(message) between 3 and 500),
  congress_id uuid references public.congresses(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  request_id uuid,
  status_code integer check (status_code between 100 and 599),
  duration_ms integer check (duration_ms between 0 and 3600000),
  context jsonb not null default '{}'::jsonb
    check (jsonb_typeof(context) = 'object'),
  resolution text not null default 'open'
    check (resolution in ('open','investigating','resolved')),
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz
);
create index if not exists system_logs_time_idx
  on public.system_logs(occurred_at desc, id desc);
create index if not exists system_logs_congress_time_idx
  on public.system_logs(congress_id, occurred_at desc);
create index if not exists system_logs_level_time_idx
  on public.system_logs(level, occurred_at desc);
create index if not exists system_logs_actor_time_idx
  on public.system_logs(actor_id, occurred_at desc)
  where actor_id is not null;
create index if not exists system_logs_unresolved_idx
  on public.system_logs(occurred_at desc)
  where resolution <> 'resolved' and level in ('critical','error');

-- No direct access for browser clients. The authenticated Next.js API
-- checks congress administration scope BEFORE using its server-only key.
alter table public.system_logs enable row level security;
revoke all on public.system_logs from public, anon, authenticated;
grant select, insert, update on public.system_logs to service_role;
comment on table public.system_logs is
 'Redacted technical events, managed server-side only. Retain 30 days unless policy requires otherwise.';
commit;
notify pgrst, 'reload schema';
