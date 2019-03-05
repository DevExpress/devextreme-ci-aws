#!/bin/sh

DB=/drone-data/drone.sqlite
SURROGATE='[{"pos":0,"out":"(log truncated)"}]'

TRUNC_BATCH_SIZE=5000

while true; do
    TRUNC_END_ID=`sqlite3 $DB 'select max(log_id) - 20 * 1000 from logs'`

    while [ "$TRUNC_END_ID" -gt 0 ]; do
        TRUNC_START_ID=$((TRUNC_END_ID-TRUNC_BATCH_SIZE+1))
        TRUNC_COMMAND="update logs set log_data='$SURROGATE' where log_id between $TRUNC_START_ID and $TRUNC_END_ID"

        echo ""
        echo "$(date)"
        echo "$TRUNC_COMMAND"
        sqlite3 $DB "begin; $TRUNC_COMMAND; commit; select 'Affected: ' || changes();"

        TRUNC_END_ID=$TRUNC_START_ID
        sleep 3
    done

    echo ""
    echo "Free pages: $(sqlite3 $DB 'pragma freelist_count') of $(sqlite3 $DB 'pragma page_count')"

    sleep 500000
done
