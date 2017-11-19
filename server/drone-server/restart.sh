#!/bin/bash -e

if [ ! -f secrets ]; then
    echo "Missing 'secrets' file"
    exit 1
fi

source secrets

sudo docker rm -f drone-server || true

sudo docker run -d \
    --name=drone-server \
    -e DRONE_DEBUG=true \
    -e DRONE_SERVER_HOST=$DRONE_SERVER_HOST \
    -e DRONE_AGENT_SECRET=$DRONE_AGENT_SECRET \
    -e DRONE_OPEN=true \
    -e DRONE_GITHUB=true \
    -e DRONE_GITHUB_CLIENT=$DRONE_GITHUB_CLIENT \
    -e DRONE_GITHUB_SECRET=$DRONE_GITHUB_SECRET \
    -e DRONE_ORGS=DevExpress \
    -e DRONE_ADMIN=AlekseyMartynov \
    -v drone-data:/var/lib/drone \
    --net drone-server-net \
    -p 80:8000 \
    -p 9000:9000 \
    --restart=unless-stopped \
    --log-opt max-size=1m \
    --log-opt max-file=5 \
    drone/drone:0.8.1
