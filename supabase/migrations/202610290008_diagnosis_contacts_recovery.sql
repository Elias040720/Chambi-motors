-- Additive CM-006 / CM-009 pilot schema. Restore a DB backup to roll back.
-- Public recovery is served only by the backend; client roles never read OTP hashes.

create table if not exists work_order_contacts (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders on delete cascade,
  name text not null check (length(trim(name)) between 2 and 160),
  phone_e164 text not null check (phone_e164 ~ '^\+519[0-9]{8}$'),
  relation_type text not null check (relation_type in ('client','representative')),
  can_view_progress boolean not null default false,
  can_approve_quote boolean not null default false,
  verified_at timestamptz not null,
  verified_method text not null check (verified_method in ('in_person','otp')),
  verified_by text not null,
  verification_note text not null check (length(trim(verification_note)) between 3 and 500),
  delegation_verified_at timestamptz,
  delegation_note text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, work_order_id),
  check (can_view_progress or can_approve_quote),
  check (relation_type <> 'representative' or not can_approve_quote or
    (delegation_verified_at is not null and length(trim(coalesce(delegation_note,''))) >= 3))
);
create index if not exists work_order_contacts_recovery_idx
  on work_order_contacts (phone_e164, work_order_id)
  where revoked_at is null and can_view_progress and verified_at is not null;

alter table access_grants
  add column if not exists contact_id uuid,
  add column if not exists scope text not null default 'view_progress'
    check (scope in ('view_progress'));
do $$ begin
  if not exists (select 1 from pg_constraint where conname='access_grants_contact_order_fkey') then
    alter table access_grants add constraint access_grants_contact_order_fkey
      foreign key (contact_id, work_order_id)
      references work_order_contacts (id, work_order_id) on delete cascade;
  end if;
end $$;
create index if not exists access_grants_contact_idx
  on access_grants(contact_id) where contact_id is not null and revoked_at is null;

create table if not exists portal_recovery_challenges (
  id uuid primary key,
  work_order_id uuid not null references work_orders on delete cascade,
  contact_id uuid not null,
  code_hash bytea not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  consumed_at timestamptz,
  created_ip_hash bytea,
  created_at timestamptz not null default now(),
  foreign key (contact_id, work_order_id)
    references work_order_contacts (id, work_order_id) on delete cascade
);
create index if not exists portal_recovery_challenges_live_idx
  on portal_recovery_challenges(work_order_id, contact_id, expires_at)
  where consumed_at is null;
alter table portal_recovery_challenges enable row level security;

create table if not exists diagnosis_revisions (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders on delete cascade,
  revision integer not null check (revision > 0),
  kind text not null check (kind in ('preliminary','confirmed','correction')),
  effective_kind text not null check (effective_kind in ('preliminary','confirmed')),
  supersedes_id uuid,
  internal_notes text not null default '',
  public_summary text not null default '',
  evidence_ids uuid[] not null default '{}',
  author_id text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (work_order_id, revision),
  unique (id, work_order_id),
  foreign key (supersedes_id, work_order_id)
    references diagnosis_revisions(id, work_order_id),
  check ((kind='correction' and supersedes_id is not null) or
    (kind<>'correction' and supersedes_id is null)),
  check (effective_kind<>'confirmed' or cardinality(evidence_ids)>0),
  check (published_at is null or length(trim(public_summary))>0)
);
create index if not exists diagnosis_revisions_public_idx
  on diagnosis_revisions(work_order_id, revision desc)
  where published_at is not null;

do $$ declare t text; begin
  foreach t in array array['work_order_contacts','diagnosis_revisions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format('create policy admin_all on public.%I for all to authenticated using (is_workshop_admin()) with check (is_workshop_admin())', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

create or replace function reject_diagnosis_revision_mutation()
returns trigger language plpgsql as $$ begin
  raise exception 'Las revisiones de diagnóstico son append-only';
end $$;
drop trigger if exists diagnosis_revision_immutable on diagnosis_revisions;
create trigger diagnosis_revision_immutable before update or delete on diagnosis_revisions
  for each row execute function reject_diagnosis_revision_mutation();

-- Every application write stays behind API/domain guards. The new challenge table
-- deliberately has no authenticated policy or client grants.
revoke select, insert, update, delete, truncate, references, trigger on table
  public.work_order_contacts, public.diagnosis_revisions
  from authenticated, anon, public;
revoke all privileges on table public.portal_recovery_challenges from authenticated, anon, public;
grant select on table public.work_order_contacts, public.diagnosis_revisions to authenticated;
do $$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    grant select, insert, update, delete on table
      public.work_order_contacts, public.diagnosis_revisions, public.portal_recovery_challenges
      to service_role;
  end if;
end $$;
