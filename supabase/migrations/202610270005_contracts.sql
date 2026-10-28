alter table business_settings add column task_templates text[] not null default array['Inspeccionar frenos','Revisar suspensión y dirección','Diagnosticar motor','Cambiar aceite y filtros','Verificar luces y niveles'];
alter table quotes add column sealed boolean not null default true;
alter table work_orders add constraint qa_before_ready check(status not in ('listo','entregado') or qa_passed);
alter table work_orders add constraint valid_eta_range check(eta_from is null or eta_to is null or eta_from<=eta_to);

create or replace function reject_quote_line_change() returns trigger language plpgsql as $$ begin
 if exists(select 1 from quotes where id in (old.quote_id,new.quote_id) and sealed) then raise exception 'Una versión enviada es inmutable; crea una nueva versión'; end if;
 return coalesce(new,old);
end $$;
create or replace function reject_approved_quote_change() returns trigger language plpgsql as $$ begin
 if tg_op='DELETE' then if old.sealed then raise exception 'Una versión enviada es inmutable'; end if;return old;end if;
 if old.status='aprobado' then raise exception 'Una cotización aprobada es inmutable';end if;
 if old.sealed and (new.sealed=false or (new.work_order_id,new.version,new.currency,new.expires_at,new.created_at) is distinct from (old.work_order_id,old.version,old.currency,old.expires_at,old.created_at)) then raise exception 'Una versión enviada es inmutable';end if;
 return new;
end $$;
