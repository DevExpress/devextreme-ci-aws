#!/bin/bash

# WARNING!
# - Replace DRONE_SECRET, DRONE_SERVER, DRONE_MAX_PROCS
# - Match DRONE_MAX_PROCS to instance CPUs and SCALER_JOBS_PER_AGENT

docker run -d \
    --name=drone-agent \
    -e DRONE_DEBUG=true \
    -e DRONE_SECRET=.... \
    -e DRONE_SERVER=ec2-....compute.amazonaws.com:9000 \
    -e DRONE_MAX_PROCS=.... \
    -v /var/run/docker.sock:/var/run/docker.sock \
    --restart=on-failure \
    drone/agent:0.8.4
