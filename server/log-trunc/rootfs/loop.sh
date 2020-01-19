#!/bin/sh

export PGHOST=drone-postgres.drone-server-net
export PGUSER=drone
export PGPASSWORD=drone
SURROGATE='[{"pos":0,"out":"(log truncated)"}]'

TRUNC_BATCH_SIZE=5000

while true; do
    TRUNC_END_ID=`psql -Atc 'select max(log_id) - 20 * 1000 from logs'`

    while [ "$TRUNC_END_ID" -gt 0 ]; do
        TRUNC_START_ID=$((TRUNC_END_ID-TRUNC_BATCH_SIZE+1))
        TRUNC_COMMAND="update logs set log_data='$SURROGATE' where log_id between $TRUNC_START_ID and $TRUNC_END_ID"

        echo ""
        echo "$(date)"
        echo "$TRUNC_COMMAND"
        psql -c "$TRUNC_COMMAND"

        TRUNC_END_ID=$TRUNC_START_ID
        sleep 3
    done

    sleep 500000
done
