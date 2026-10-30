alter table media_assets add column upload_key uuid;
alter table media_assets add column content_hash text;
create unique index media_upload_key_idx on media_assets(work_order_id,upload_key) where upload_key is not null;
