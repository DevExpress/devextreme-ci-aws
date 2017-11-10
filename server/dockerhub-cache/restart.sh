#!/bin/bash

if [ ! -f secrets ]; then
    echo "Missing 'secrets' file"
    exit 1
fi

source secrets

sudo docker rm -f dockerhub-cache || true

sudo docker run -dti \
    --name=dockerhub-cache \
    -e REGISTRY_STORAGE=s3 \
    -e REGISTRY_STORAGE_S3_ACCESSKEY=$AWS_ACCESS_KEY \
    -e REGISTRY_STORAGE_S3_SECRETKEY=$AWS_SECRET_KEY \
    -e REGISTRY_STORAGE_S3_BUCKET=devextreme-ci-dockerhub-cache \
    -e REGISTRY_STORAGE_S3_REGION=$AWS_REGION \
    -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
    -e REGISTRY_STORAGE_S3_ROOTDIRECTORY=/ \
    -p 5000:5000 \
    --restart=unless-stopped \
    --log-opt max-size=1m \
    --log-opt max-file=5 \
    registry:2
