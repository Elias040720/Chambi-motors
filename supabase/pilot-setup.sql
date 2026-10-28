-- MANUAL ONLY, in a dedicated synthetic Supabase pilot project, after migrations.
-- In the same SQL editor session, set app.pilot_admin_email to the provisioned Auth
-- account, app.pilot_bucket to a pilot-* bucket and app.pilot_confirm_synthetic=true.
begin;
do $$
declare owner_email text:=current_setting('app.pilot_admin_email',true);
 bucket text:=current_setting('app.pilot_bucket',true);
 owner_id uuid;
begin
 if current_setting('app.pilot_confirm_synthetic',true) is distinct from 'true' then raise exception 'Confirm the dedicated synthetic pilot first';end if;
 if owner_email is null or owner_email='' or bucket is null or bucket not like 'pilot-%' then raise exception 'Set the real provisioned admin email and a pilot-* bucket in this session';end if;
 select id into owner_id from auth.users where lower(email)=lower(owner_email);
 if owner_id is null then raise exception 'Provision the single Auth user first; public signup must be disabled';end if;
 if exists(select 1 from public.admin_profiles where id<>owner_id) then raise exception 'A different administrator is already provisioned';end if;
 insert into public.admin_profiles(id) values(owner_id) on conflict(id) do nothing;
 insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values(bucket,bucket,false,8388608,array['image/webp'])
 on conflict(id) do update set public=false,file_size_limit=8388608,allowed_mime_types=array['image/webp'];
end $$;
commit;
