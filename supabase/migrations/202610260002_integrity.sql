create unique index if not exists vehicles_id_customer_uq on vehicles(id,customer_id);
do $$ begin
 if not exists(select 1 from pg_constraint where conname='work_orders_vehicle_customer_fkey') then
  alter table work_orders add constraint work_orders_vehicle_customer_fkey foreign key(vehicle_id,customer_id) references vehicles(id,customer_id) on delete restrict;
 end if;
end $$;

create or replace function reject_quote_line_change() returns trigger language plpgsql as $$ begin
 if exists(select 1 from quotes where id=coalesce(new.quote_id,old.quote_id) and status='aprobado') then raise exception 'Una cotización aprobada es inmutable'; end if;
 return coalesce(new,old);
end $$;
drop trigger if exists quote_line_immutable on quote_lines;
create trigger quote_line_immutable before insert or update or delete on quote_lines for each row execute function reject_quote_line_change();

create or replace function reject_approved_quote_change() returns trigger language plpgsql as $$ begin
 if old.status='aprobado' then raise exception 'Una cotización aprobada es inmutable'; end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
drop trigger if exists approved_quote_immutable on quotes;
create trigger approved_quote_immutable before update or delete on quotes for each row execute function reject_approved_quote_change();

create or replace function reject_work_event_mutation() returns trigger language plpgsql as $$ begin raise exception 'work_order_events es append-only'; end $$;
drop trigger if exists work_event_immutable on work_order_events;
create trigger work_event_immutable before update or delete on work_order_events for each row execute function reject_work_event_mutation();
