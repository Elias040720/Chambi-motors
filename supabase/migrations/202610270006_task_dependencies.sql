alter table work_order_tasks add column priority text not null default 'media' check(priority in ('alta','media','baja'));
alter table work_order_tasks add column depends_on uuid;
alter table work_order_tasks add constraint task_identity_order unique(id,work_order_id);
alter table work_order_tasks add constraint task_dependency_same_order foreign key(depends_on,work_order_id) references work_order_tasks(id,work_order_id);
alter table work_order_tasks add constraint task_no_self_dependency check(depends_on is null or depends_on<>id);
