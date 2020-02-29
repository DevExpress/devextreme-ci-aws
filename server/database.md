## Backup

```
sudo docker exec drone-postgres pg_dump -U drone -d drone | bzip2 > drone-dump.bz2
```

## Delete old builds

```sql
delete from builds where build_created < MIN_TIMESTAMP;

delete from config
where not exists (select * from builds where build_config_id = config_id);

delete from procs
where not exists (select * from builds where build_id = proc_build_id);

delete from logs
where not exists (select * from procs where proc_id = log_job_id);
```

## Empty queue

```sql
delete from tasks;
```

## Find builds w/o procs

```sql
select
    build_id,
    (select repo_full_name from repos where repo_id = build_repo_id),
    '#' || build_number 
from builds
where not exists (select * from procs where proc_build_id = build_id);
```
