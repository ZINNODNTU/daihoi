-- V37: Issue grouping inspired by Sentry/HyperDX, without extra servers.
-- Prerequisite: V36 system_logs. Apply ONLY after backing up the intended project.
-- Trigger functions live in a non-exposed schema. All writes use service_role.
begin;
do $$ begin
 if to_regclass('public.system_logs') is null then
  raise exception 'Apply upgrade-system-observability-v36.sql before V37';
 end if;
end $$;

create schema if not exists daihoi_private;
revoke all on schema daihoi_private from public, anon, authenticated;
grant usage on schema daihoi_private to service_role;

alter table public.system_logs add column if not exists fingerprint text;
alter table public.system_logs add column if not exists release text;
alter table public.system_logs add column if not exists environment text;

create table if not exists public.system_incidents (
 id uuid primary key default gen_random_uuid(),
 fingerprint text not null unique check (fingerprint ~ '^[0-9a-f]{32}$'),
 congress_id uuid references public.congresses(id) on delete set null,
 source text not null,
 event text not null,
 title text not null,
 level text not null check (level in ('critical','error','warning','info')),
 first_seen_at timestamptz not null,
 last_seen_at timestamptz not null,
 occurrence_count bigint not null default 1 check (occurrence_count >= 1),
 window_started_at timestamptz not null,
 window_count bigint not null default 1 check (window_count >= 1),
 latest_log_id uuid references public.system_logs(id) on delete set null,
 latest_request_id uuid,
 first_release text,
 latest_release text,
 resolution text not null default 'open'
  check (resolution in ('open','investigating','resolved')),
 reopened_count integer not null default 0 check (reopened_count >= 0),
 handled_by uuid references auth.users(id) on delete set null,
 handled_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists system_incidents_scope_status_idx
 on public.system_incidents(congress_id,resolution,last_seen_at desc);
create index if not exists system_incidents_recent_idx
 on public.system_incidents(last_seen_at desc);
create index if not exists system_incidents_level_status_idx
 on public.system_incidents(level,resolution,last_seen_at desc);
create index if not exists system_logs_fingerprint_time_idx
 on public.system_logs(fingerprint,occurred_at desc);

alter table public.system_incidents enable row level security;
revoke all on public.system_incidents from public, anon, authenticated;
grant select,insert,update on public.system_incidents to service_role;
-- No SELECT / INSERT / UPDATE / DELETE through the browser; authenticated
-- users must go through Next.js APIs that check per-congress role.

create or replace function daihoi_private.system_log_assign_fingerprint()
returns trigger language plpgsql set search_path = '' as $$
begin
 new.fingerprint := pg_catalog.md5(pg_catalog.concat_ws('|',
  coalesce(new.congress_id::text,'global'),
  new.source,new.event,
  coalesce(new.context->>'endpoint',''),
  coalesce(new.context->>'dbCode',''),
  coalesce(new.context->>'errorName',''),
  coalesce(new.status_code::text,'')
 ));
 return new;
end;
$$;
revoke all on function daihoi_private.system_log_assign_fingerprint() from public, anon, authenticated;
grant execute on function daihoi_private.system_log_assign_fingerprint() to service_role;
drop trigger if exists system_logs_fingerprint_before_insert on public.system_logs;
create trigger system_logs_fingerprint_before_insert before insert on public.system_logs
for each row execute function daihoi_private.system_log_assign_fingerprint();

create or replace function daihoi_private.system_log_aggregate_incident()
returns trigger language plpgsql set search_path = '' as $$
begin
 if new.level = 'info' then return new; end if;
 insert into public.system_incidents (
  fingerprint,congress_id,source,event,title,level,first_seen_at,last_seen_at,
  occurrence_count,window_started_at,window_count,
  latest_log_id,latest_request_id,first_release,latest_release
 ) values (
  new.fingerprint,new.congress_id,new.source,new.event,new.message,new.level,
  new.occurred_at,new.occurred_at,1,new.occurred_at,1,new.id,
  new.request_id,new.release,new.release
 )
 on conflict (fingerprint) do update set
  title=excluded.title,
  level=case
   when public.system_incidents.level='critical' or excluded.level='critical' then 'critical'
   when public.system_incidents.level='error' or excluded.level='error' then 'error'
   when public.system_incidents.level='warning' or excluded.level='warning' then 'warning'
   else 'info' end,
  occurrence_count=public.system_incidents.occurrence_count+1,
  last_seen_at=greatest(public.system_incidents.last_seen_at,excluded.last_seen_at),
  window_count=case
   when public.system_incidents.window_started_at <= excluded.last_seen_at - interval '5 minutes'
    then 1 else public.system_incidents.window_count+1 end,
  window_started_at=case
   when public.system_incidents.window_started_at <= excluded.last_seen_at - interval '5 minutes'
    then excluded.last_seen_at else public.system_incidents.window_started_at end,
  latest_log_id=excluded.latest_log_id,
  latest_request_id=excluded.latest_request_id,
  latest_release=excluded.latest_release,
  reopened_count=public.system_incidents.reopened_count+
   case when public.system_incidents.resolution='resolved'
    and excluded.level in ('critical','error') then 1 else 0 end,
  resolution=case when public.system_incidents.resolution='resolved'
    and excluded.level in ('critical','error') then 'open'
    else public.system_incidents.resolution end,
  handled_by=case when public.system_incidents.resolution='resolved'
    and excluded.level in ('critical','error') then null
    else public.system_incidents.handled_by end,
  handled_at=case when public.system_incidents.resolution='resolved'
    and excluded.level in ('critical','error') then null
    else public.system_incidents.handled_at end,
  updated_at=now();
 return new;
end;
$$;
revoke all on function daihoi_private.system_log_aggregate_incident() from public, anon, authenticated;
grant execute on function daihoi_private.system_log_aggregate_incident() to service_role;
drop trigger if exists system_logs_aggregate_after_insert on public.system_logs;
create trigger system_logs_aggregate_after_insert after insert on public.system_logs
for each row execute function daihoi_private.system_log_aggregate_incident();

-- Existing V36 logs are not reprocessed automatically. The first new
-- matching log after applying V37 creates an incident. The underlying raw
-- event history remains available for analysis.
commit;
notify pgrst, 'reload schema';
