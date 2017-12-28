#!/bin/sh

DB=/drone-data/drone.sqlite
SURROGATE='[{"pos":0,"out":"(log truncated)"}]'

while true; do
    echo "$(date)"

    echo "Total logs: $(sqlite3 $DB 'select count(*) from logs')"

    sqlite3 $DB "\
        update logs set log_data='$SURROGATE' where log_id < (select max(log_id) - 20 * 1000 FROM logs); \
        select 'Truncated logs: ' || changes(); \
    "

    echo "Free pages: $(sqlite3 $DB 'pragma freelist_count') of $(sqlite3 $DB 'pragma page_count')"
    echo ""

    sleep 500000
done
