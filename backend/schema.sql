-- =====================================================================
--  La Mesa del Reino — campaign console schema
--
--  Run once in the Supabase SQL editor. Safe to re-run.
--
--  The console is a static export, so there is no server between the
--  browser and this database. The anon key is public by design and
--  Row Level Security is the ONLY thing deciding what it can touch —
--  every policy below is load-bearing, none is decorative.
--
--  Practical consequence: never put a value in a readable table that the
--  reader is not allowed to see. Tokens live in a table nothing can read
--  (see `oauth_tokens`), reachable only by an Edge Function holding the
--  service role.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Who can use the console
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text,
  role       text not null default 'editor' check (role in ('owner', 'editor')),
  active     boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Read your own row. Owners can see the team.
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner')
  );

-- Nobody updates profiles directly: granting update on the row would also
-- hand over `role` and `active`, because RLS gates rows and not columns.
-- Name changes go through complete_first_login(), same as the restaurant
-- console.

-- ---------------------------------------------------------------------
-- The show
-- ---------------------------------------------------------------------
create table if not exists episodes (
  id            uuid primary key default gen_random_uuid(),
  number        integer not null,
  title         text not null,
  guest         text,
  recorded_at   timestamptz,
  publish_at    timestamptz not null,
  youtube_url   text,
  thumbnail_url text,
  notes         text,
  created_at    timestamptz not null default now()
);

create unique index if not exists episodes_number_key on episodes (number);
create index if not exists episodes_publish_idx on episodes (publish_at desc);

-- ---------------------------------------------------------------------
-- Campaigns and their placements
-- ---------------------------------------------------------------------
create table if not exists campaigns (
  id           uuid primary key default gen_random_uuid(),
  episode_id   uuid not null references episodes on delete cascade,
  name         text not null,
  goal         text not null default 'views'
                 check (goal in ('views','subscribers','attendance','awareness')),
  status       text not null default 'draft'
                 check (status in ('draft','scheduled','active','paused','done')),
  budget_total numeric(10,2) not null default 0,
  starts_at    date not null,
  ends_at      date not null,
  created_by   uuid references auth.users,
  approved_by_name text,
  created_at   timestamptz not null default now(),
  check (ends_at >= starts_at)
);

create index if not exists campaigns_starts_idx on campaigns (starts_at desc);

create table if not exists placements (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns on delete cascade,
  platform     text not null
                 check (platform in ('youtube','instagram','facebook','tiktok','x')),
  kind         text not null check (kind in ('organic','paid')),
  status       text not null default 'draft'
                 check (status in ('draft','queued','posted','live','finished','failed')),
  budget       numeric(10,2),
  run_at       timestamptz,
  copy         text not null default '',
  creative_url text,
  external_id  text,
  -- Filled in by whatever reports back. Null means "not reported yet",
  -- which is not the same as zero and must stay distinguishable.
  reach        integer,
  clicks       integer,
  spend        numeric(10,2),
  created_at   timestamptz not null default now()
);

create index if not exists placements_campaign_idx on placements (campaign_id);
create index if not exists placements_run_idx on placements (run_at);

-- ---------------------------------------------------------------------
-- Ideas backlog
-- ---------------------------------------------------------------------
create table if not exists ideas (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  theme      text,
  format     text,
  questions  text,
  guest      text,
  used       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Connections and settings
-- ---------------------------------------------------------------------
create table if not exists connections (
  id             text primary key,
  platform       text not null,
  kind           text not null check (kind in ('organic','paid')),
  account_name   text,
  connected      boolean not null default false,
  blocked_reason text,
  last_checked   timestamptz
);

create table if not exists settings (
  key   text primary key,
  value text not null default ''
);

-- ---------------------------------------------------------------------
-- Anything signed in can read and write the working tables.
--
-- The console has two roles and neither is untrusted: the owner and the
-- person who cuts clips. Splitting write access further would mean the
-- editor cannot draft a post, which is the job. Money never appears in
-- these tables' UI anyway — see the console.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['episodes','campaigns','placements','ideas','connections','settings']
  loop
    execute format('alter table %I enable row level security', t);

    execute format('drop policy if exists %I on %I', t || '_read', t);
    execute format(
      'create policy %I on %I for select to authenticated using (
         exists (select 1 from profiles p where p.id = auth.uid() and p.active)
       )', t || '_read', t);

    execute format('drop policy if exists %I on %I', t || '_write', t);
    execute format(
      'create policy %I on %I for all to authenticated using (
         exists (select 1 from profiles p where p.id = auth.uid() and p.active)
       ) with check (
         exists (select 1 from profiles p where p.id = auth.uid() and p.active)
       )', t || '_write', t);

    -- The anon role gets nothing. A signed-out visitor with the public key
    -- must not be able to read the show's plans.
    execute format('revoke all on %I from anon', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- OAuth tokens.
--
-- This table has RLS enabled and NO policy, on purpose. That combination
-- denies every request that arrives with the anon or authenticated key,
-- including the owner's. The only thing that can read it is an Edge
-- Function using the service role, which bypasses RLS and never runs in
-- a browser.
--
-- If a policy is ever added here, the access token for the ministry's
-- Instagram becomes readable by anyone who opens devtools.
-- ---------------------------------------------------------------------
create table if not exists oauth_tokens (
  platform      text primary key,
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz,
  scope         text,
  account_id    text,
  account_name  text,
  updated_at    timestamptz not null default now()
);

alter table oauth_tokens enable row level security;
revoke all on oauth_tokens from anon, authenticated;

-- ---------------------------------------------------------------------
-- First sign-in, same shape as the restaurant console.
-- ---------------------------------------------------------------------
create or replace function complete_first_login(p_full_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare clean text;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;

  clean := btrim(coalesce(p_full_name, ''));
  if length(clean) < 2  then raise exception 'name too short'; end if;
  if length(clean) > 60 then raise exception 'name too long';  end if;

  update profiles
     set full_name = clean, must_change_password = false
   where id = auth.uid();
end;
$$;

revoke all on function complete_first_login(text) from public;
grant execute on function complete_first_login(text) to authenticated;

-- ---------------------------------------------------------------------
-- Check what landed.
-- ---------------------------------------------------------------------
select tablename,
       rowsecurity as rls,
       (select count(*) from pg_policies p where p.tablename = t.tablename) as policies
  from pg_tables t
 where schemaname = 'public'
   and tablename in ('profiles','episodes','campaigns','placements','ideas',
                     'connections','settings','oauth_tokens')
 order by tablename;
