#!/bin/bash

sudo docker stop drone-postgres || true
sudo docker rm   drone-postgres || true

sudo docker run -dti \
    --name=drone-postgres \
    -e POSTGRES_USER=drone \
    -e POSTGRES_PASSWORD=drone \
    -e POSTGRES_DB=drone \
    -v drone-postgres:/var/lib/postgresql/data \
    --net drone-server-net \
    --stop-signal=SIGINT \
    --restart=unless-stopped \
    --log-opt max-size=1m \
    --log-opt max-file=5 \
    postgres:12
