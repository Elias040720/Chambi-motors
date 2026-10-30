-- Additive migration; preserve order/event history. Restore a database backup to roll back.
alter table work_orders drop constraint if exists work_orders_status_check;
alter table work_orders add constraint work_orders_status_check check(status in ('recepcion','diagnostico','esperando_aprobacion','reparacion','esperando_repuesto','pausado','esperando_cliente','control_calidad','listo','entregado','cancelado'));
alter table work_orders alter column status set default 'recepcion';
alter table work_orders add column internal_notes text not null default '';
alter table work_orders add column public_notes text not null default '';
alter table work_orders add column intake jsonb not null default '{}';
alter table work_orders add column eta_confidence text not null default 'no_disponible' check(eta_confidence in ('no_disponible','tentativa','confirmada'));
alter table work_orders add column delivery_summary text;
alter table work_orders add column warranty text;
alter table work_orders add column delivered_at timestamptz;
alter table work_order_tasks add column requires_evidence boolean not null default false;
alter table work_order_tasks add column evidence text;
alter table work_order_tasks add column quote_id uuid references quotes;
alter table quote_decisions add column evidence text;
alter table media_assets add column mime_type text not null default 'image/jpeg';
alter table media_assets add column byte_size integer not null default 0;
alter table admin_sessions add column user_id uuid references auth.users;
create unique index one_workshop_administrator on admin_profiles ((true));

create table work_order_blockers (id uuid primary key default gen_random_uuid(),work_order_id uuid not null references work_orders,kind text not null check(kind in ('esperando_repuesto','pausado','esperando_cliente')),reason text not null,part_request_id uuid references part_requests,resolved_at timestamptz,resolution_reason text,created_at timestamptz not null default now());
create table inspections (id uuid primary key default gen_random_uuid(),work_order_id uuid not null references work_orders,items jsonb not null,passed boolean not null,note text not null,created_at timestamptz not null default now());
create table business_settings (id boolean primary key default true check(id),name text not null default 'CHAMBI MOTORS',phone text not null default '',hours text not null default '',privacy_notice text not null default 'Usamos tus datos únicamente para gestionar y comunicar el servicio de tu vehículo.',retention_days integer not null default 730 check(retention_days between 30 and 3650),link_days integer not null default 7 check(link_days between 1 and 30));
insert into business_settings(id) values(true);
create table request_limits (bucket text not null,key_hash text not null,window_start timestamptz not null default now(),count integer not null default 1,primary key(bucket,key_hash));
create table verification_challenges(id uuid primary key default gen_random_uuid(),grant_id uuid not null references access_grants,quote_id uuid not null references quotes,provider_id text,code_hash bytea,expires_at timestamptz not null default now()+interval '5 minutes',attempts integer not null default 0,used_at timestamptz);
do $$ declare t text; begin foreach t in array array['work_order_blockers','inspections','business_settings','request_limits','verification_challenges'] loop
 execute format('alter table %I enable row level security',t);
 if t not in ('request_limits','verification_challenges') then
 execute format('create policy admin_all on %I for all to authenticated using(is_workshop_admin()) with check(is_workshop_admin())',t);
 execute format('grant select,insert,update,delete on %I to authenticated',t);
 end if; end loop; end $$;
create index blockers_order_idx on work_order_blockers(work_order_id) where resolved_at is null;
create index inspections_order_idx on inspections(work_order_id,created_at desc);
create index tasks_order_idx on work_order_tasks(work_order_id);
create index grants_order_idx on access_grants(work_order_id);
create index events_order_idx on work_order_events(work_order_id,created_at desc);
create trigger decision_immutable before update or delete on quote_decisions for each row execute function reject_work_event_mutation();
create trigger eta_immutable before update or delete on eta_revisions for each row execute function reject_work_event_mutation();
create trigger inspection_immutable before update or delete on inspections for each row execute function reject_work_event_mutation();
create or replace function reject_quote_line_change() returns trigger language plpgsql as $$ begin
 if exists(select 1 from quotes where id in (old.quote_id,new.quote_id) and status='aprobado') then raise exception 'Una cotización aprobada es inmutable'; end if;
 return coalesce(new,old);
end $$;
