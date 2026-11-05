-- ĐẠI HỘI SỐ • Supabase/PostgreSQL • MVP 01
-- Chạy một lần trong Supabase SQL Editor; KHÔNG chứa dữ liệu minh họa.
create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  platform_role text not null default 'user' check (platform_role in ('user','super_admin')),
  created_at timestamptz not null default now()
);
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists public.congresses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  slug text not null unique,
  name text not null,
  kind text not null check (kind in ('doan','hoi_sinh_vien')),
  term text not null default '',
  venue text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'preparing' check (status in ('preparing','live','completed')),
  drive_folder_id text,
  created_at timestamptz not null default now()
);
create table if not exists public.congress_members (
  congress_id uuid not null references public.congresses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','checkin','secretary')),
  primary key (congress_id,user_id)
);
create index if not exists congress_members_user_idx on public.congress_members(user_id);
create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  congress_id uuid not null references public.congresses(id) on delete cascade,
  name text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'open' check (status in ('open','closed')),
  qr_policy text not null default 'both' check (qr_policy in ('fixed','session','both')),
  constraint attendance_sessions_checkin_window_check check (
    (starts_at is null and ends_at is null) or
    (starts_at is not null and ends_at is not null and ends_at>starts_at)
  ),
  created_at timestamptz not null default now(),
  unique (id,congress_id)
);
create index if not exists attendance_sessions_congress_idx on public.attendance_sessions(congress_id);
create table if not exists public.delegates (
  id uuid primary key default gen_random_uuid(),
  congress_id uuid not null references public.congresses(id) on delete cascade,
  code text not null,
  full_name text not null,
  unit text not null default '',
  delegate_type text not null default 'official' check (delegate_type in ('official','alternate','guest')),
  qr_version integer not null default 1 check (qr_version > 0),
  barcode_code text not null unique default ('DB' || upper(substr(md5(gen_random_uuid()::text),1,20)))
    check (barcode_code ~ '^DB[0-9A-F]{20}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id,congress_id),
  unique (congress_id,code)
);
create index if not exists delegates_congress_idx on public.delegates(congress_id);
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  congress_id uuid not null references public.congresses(id) on delete cascade,
  session_id uuid not null,
  delegate_id uuid not null,
  method text not null check (method in ('qr','manual','barcode')),
  qr_scope text check (
    (method='qr' and qr_scope in ('fixed','session'))
    or (method in ('manual','barcode') and qr_scope is null)
  ),
  checked_in_by uuid not null references auth.users(id),
  note text,
  checked_in_at timestamptz not null default now(),
  foreign key (session_id,congress_id) references public.attendance_sessions(id,congress_id),
  foreign key (delegate_id,congress_id) references public.delegates(id,congress_id),
  unique (session_id,delegate_id)
);
create index if not exists checkins_congress_session_idx on public.checkins(congress_id,session_id);
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  congress_id uuid not null references public.congresses(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  action text not null,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_congress_idx on public.audit_logs(congress_id,created_at desc);
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  congress_id uuid not null references public.congresses(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  drive_file_id text not null,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists documents_congress_idx on public.documents(congress_id);

-- Dự phòng cho mô-đun biểu quyết công khai; chưa mở giao diện bầu cử kín.
create table if not exists public.voting_sessions (
  id uuid primary key default gen_random_uuid(),
  congress_id uuid not null references public.congresses(id) on delete cascade,
  title text not null,
  status text not null default 'draft' check (status in ('draft','open','closed')),
  created_at timestamptz not null default now(),
  unique (id,congress_id)
);
create table if not exists public.voting_options (
  id uuid primary key default gen_random_uuid(),
  voting_session_id uuid not null references public.voting_sessions(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  unique (id,voting_session_id)
);
create table if not exists public.voting_eligibilities (
  voting_session_id uuid not null references public.voting_sessions(id) on delete cascade,
  delegate_id uuid not null references public.delegates(id) on delete cascade,
  primary key (voting_session_id,delegate_id)
);
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  voting_session_id uuid not null references public.voting_sessions(id) on delete cascade,
  delegate_id uuid not null references public.delegates(id),
  option_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (option_id,voting_session_id) references public.voting_options(id,voting_session_id),
  foreign key (voting_session_id,delegate_id) references public.voting_eligibilities(voting_session_id,delegate_id),
  unique (voting_session_id,delegate_id)
);

-- Bảng phiên và phiếu chỉ phục vụ biên soạn schema ở MVP; KHÔNG cấp quyền gửi phiếu cho client.
create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.platform_role = 'super_admin'
  );
$$;
create or replace function private.has_congress_role(p_congress uuid, p_required text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and
    (private.is_super_admin() or exists (
      select 1 from public.congress_members cm
      where cm.congress_id = p_congress and cm.user_id = (select auth.uid())
        and ( (p_required = 'admin' and cm.role = 'admin')
           or (p_required = 'checkin' and cm.role in ('admin','checkin'))
           or (p_required = 'viewer' and cm.role in ('admin','checkin','secretary')))
    ));
$$;
revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on function private.is_super_admin() from public;
revoke all on function private.has_congress_role(uuid,text) from public;
grant execute on function private.is_super_admin() to authenticated;
grant execute on function private.has_congress_role(uuid,text) to authenticated;

create or replace function private.initialize_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id,full_name)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_daihoi on auth.users;
create trigger on_auth_user_created_daihoi
after insert on auth.users for each row execute function private.initialize_profile();
revoke all on function private.initialize_profile() from public;

-- Mặc định RLS đóng hoàn toàn nếu không có chính sách cho từng thao tác.
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.congresses enable row level security;
alter table public.congress_members enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.delegates enable row level security;
alter table public.checkins enable row level security;
alter table public.audit_logs enable row level security;
alter table public.documents enable row level security;
alter table public.voting_sessions enable row level security;
alter table public.voting_options enable row level security;
alter table public.voting_eligibilities enable row level security;
alter table public.votes enable row level security;

-- Tránh grant tùy tiện cho các bảng chứa dữ liệu nhạy cảm.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles,public.organizations,public.congresses,
 public.congress_members,public.attendance_sessions,public.delegates,public.checkins,
 public.audit_logs,public.documents to authenticated;
grant insert on public.organizations,public.congresses,public.congress_members,
 public.attendance_sessions,public.delegates,
 public.documents to authenticated;
grant update on public.congresses,public.attendance_sessions,public.delegates to authenticated;

create policy profiles_self_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or private.is_super_admin());
create policy organizations_member_read on public.organizations for select to authenticated
using (private.is_super_admin() or exists (
  select 1 from public.congresses c where c.organization_id = id and private.has_congress_role(c.id,'viewer')));
create policy organizations_admin_insert on public.organizations for insert to authenticated
with check (private.is_super_admin());
create policy congresses_member_read on public.congresses for select to authenticated
using (private.has_congress_role(id,'viewer'));
create policy congresses_super_insert on public.congresses for insert to authenticated
with check (private.is_super_admin());
create policy congresses_admin_update on public.congresses for update to authenticated
using (private.has_congress_role(id,'admin'))
with check (private.has_congress_role(id,'admin'));
create policy members_read on public.congress_members for select to authenticated
using (user_id = (select auth.uid()) or private.has_congress_role(congress_id,'admin'));
create policy members_admin_insert on public.congress_members for insert to authenticated
with check (private.has_congress_role(congress_id,'admin'));
create policy sessions_member_read on public.attendance_sessions for select to authenticated
using (private.has_congress_role(congress_id,'viewer'));
create policy sessions_admin_insert on public.attendance_sessions for insert to authenticated
with check (private.has_congress_role(congress_id,'admin'));
create policy sessions_admin_update on public.attendance_sessions for update to authenticated
using (private.has_congress_role(congress_id,'admin'))
with check (private.has_congress_role(congress_id,'admin'));
create policy delegates_member_read on public.delegates for select to authenticated
using (private.has_congress_role(congress_id,'viewer'));
create policy delegates_admin_insert on public.delegates for insert to authenticated
with check (private.has_congress_role(congress_id,'admin'));
create policy delegates_admin_update on public.delegates for update to authenticated
using (private.has_congress_role(congress_id,'admin'))
with check (private.has_congress_role(congress_id,'admin'));
create policy checkins_member_read on public.checkins for select to authenticated
using (private.has_congress_role(congress_id,'viewer'));
-- Không cấp INSERT trực tiếp trên checkins cho authenticated.
-- Chỉ API server có Supabase Secret Key đã xác thực BTC mới ghi được.
create policy audit_admin_read on public.audit_logs for select to authenticated
using (private.has_congress_role(congress_id,'admin'));
-- Audit được ghi tự động bằng trigger nguyên tử; không cho client tùy ý tạo sự kiện.
create or replace function private.log_checkin_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 if coalesce(auth.jwt()->>'role','') <> 'service_role'
    and ((select auth.uid()) is null or new.checked_in_by <> (select auth.uid())) then
   raise exception 'Invalid checkin actor';
 end if;
 insert into public.audit_logs(congress_id,actor_id,action,target_id,details)
 values (new.congress_id,new.checked_in_by,'checkin.created',new.delegate_id,
         jsonb_build_object('sessionId',new.session_id,'method',new.method,'qrScope',new.qr_scope));
 return new;
end;
$$;
revoke all on function private.log_checkin_insert() from public;
drop trigger if exists audit_on_checkin_insert on public.checkins;
create trigger audit_on_checkin_insert after insert on public.checkins
for each row execute function private.log_checkin_insert();
-- Kiểm tra điều kiện cửa sổ điểm danh ngay trong DB: tránh ghi lúc phiên đóng
-- hoặc ngoài giờ kể cả khi API bị gọi đồng thời với thao tác đóng phiên.
create or replace function private.validate_checkin_window()
returns trigger language plpgsql security definer set search_path=''
as $$
declare s record;
begin
 select id,status,qr_policy,starts_at,ends_at into s
 from public.attendance_sessions
 where id=new.session_id and congress_id=new.congress_id
 for share;
 if not found then raise exception 'CHECKIN_SESSION_MISSING'; end if;
 if s.status <> 'open' then raise exception 'CHECKIN_SESSION_CLOSED'; end if;
 if s.starts_at is null or s.ends_at is null
   then raise exception 'CHECKIN_WINDOW_NOT_CONFIGURED'; end if;
 if clock_timestamp() < s.starts_at or clock_timestamp() >= s.ends_at
   then raise exception 'CHECKIN_OUTSIDE_WINDOW'; end if;
 if not exists (select 1 from public.delegates where id=new.delegate_id
   and congress_id=new.congress_id and is_active) then
   raise exception 'CHECKIN_DELEGATE_INACTIVE';
 end if;
 if new.method='qr' and not (s.qr_policy='both' or s.qr_policy=new.qr_scope)
   then raise exception 'CHECKIN_QR_SCOPE_DENIED'; end if;
 if new.method in ('barcode','manual') and length(trim(coalesce(new.note,'')))<3
   then raise exception 'CHECKIN_NOTE_REQUIRED'; end if;
 return new;
end;
$$;
revoke all on function private.validate_checkin_window() from public;
drop trigger if exists validate_checkin_window_trigger on public.checkins;
create trigger validate_checkin_window_trigger
before insert on public.checkins
for each row execute function private.validate_checkin_window();

create policy documents_member_read on public.documents for select to authenticated
using (private.has_congress_role(congress_id,'viewer'));
create policy documents_admin_insert on public.documents for insert to authenticated
with check (uploaded_by = (select auth.uid()) and private.has_congress_role(congress_id,'admin'));

-- Các bảng biểu quyết được RLS bảo vệ và chưa mở quyền trong bản này.
-- Gán quyền Super Admin sau khi tạo user trong Authentication:
-- update public.profiles set platform_role='super_admin' where id='<auth-user-uuid>';
