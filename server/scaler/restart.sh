#!/bin/bash -e

sudo docker build -t private/scaler .
sudo docker rm -f scaler || true

sudo docker run -dti \
    --name=scaler \
    --restart=unless-stopped \
    --log-opt max-size=1m \
    --log-opt max-file=5 \
    private/scaler

sudo docker image prune -f
