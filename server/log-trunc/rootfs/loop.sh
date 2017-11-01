#!/bin/sh

while true; do
    echo "$(date)"

    sqlite3 /drone-data/drone.sqlite "\
        update logs set log_data='(log truncated)' where log_id < (select max(log_id) - 20 * 1000 FROM logs); \
        select 'Affected rows: ' || changes(); \
    "

    sleep 500000
done
