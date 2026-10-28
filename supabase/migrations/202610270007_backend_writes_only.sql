-- All application writes go through the backend's transactional domain guards.
-- Keep authenticated SELECT grants and existing RLS; never touch unrelated tables.
-- The migration ledger is application-owned metadata and must not accept client DML.
revoke insert, update, delete, truncate, references, trigger on table
  public.admin_profiles,
  public.customers,
  public.vehicles,
  public.work_orders,
  public.work_order_tasks,
  public.quotes,
  public.quote_lines,
  public.quote_decisions,
  public.part_requests,
  public.part_receipts,
  public.media_assets,
  public.work_order_events,
  public.access_grants,
  public.notification_outbox,
  public.audit_events,
  public.eta_revisions,
  public.admin_sessions,
  public.api_idempotency,
  public.work_order_blockers,
  public.inspections,
  public.business_settings,
  public.request_limits,
  public.verification_challenges,
  public.schema_migrations
from authenticated, anon, public;

-- Supabase's server role remains privileged. The lightweight local Auth stub
-- intentionally has no service_role; the local backend connects as table owner.
do $$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    grant select, insert, update, delete on table
      public.admin_profiles,
      public.customers,
      public.vehicles,
      public.work_orders,
      public.work_order_tasks,
      public.quotes,
      public.quote_lines,
      public.quote_decisions,
      public.part_requests,
      public.part_receipts,
      public.media_assets,
      public.work_order_events,
      public.access_grants,
      public.notification_outbox,
      public.audit_events,
      public.eta_revisions,
      public.admin_sessions,
      public.api_idempotency,
      public.work_order_blockers,
      public.inspections,
      public.business_settings,
      public.request_limits,
      public.verification_challenges,
      public.schema_migrations
    to service_role;
  end if;
end $$;
