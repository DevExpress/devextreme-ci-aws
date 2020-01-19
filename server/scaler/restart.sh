#!/bin/bash -e

sudo docker build -t private/scaler .
sudo docker rm -f scaler || true

sudo docker run -dti \
    --name=scaler \
    --net drone-server-net \
    --restart=unless-stopped \
    --log-opt max-size=1m \
    --log-opt max-file=5 \
    private/scaler

sudo docker rmi mcr.microsoft.com/dotnet/core/sdk:2.1-alpine3.9
sudo docker image prune -f
