#!/bin/bash -e

sudo docker build -t private/log-trunc .
sudo docker rm -f log-trunc || true

sudo docker run -dti \
    --name=log-trunc \
    -v drone-data:/drone-data \
    --restart=unless-stopped \
    --log-opt max-size=1m \
    --log-opt max-file=5 \
    private/log-trunc

sudo docker image prune -f
