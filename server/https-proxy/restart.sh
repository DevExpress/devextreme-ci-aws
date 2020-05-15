#!/bin/bash -e

sudo docker build -t private/https-proxy .

sudo docker run --rm \
    -e NGINX_TEST=true \
    -v letsencrypt-config:/etc/letsencrypt \
    --net drone-server-net \
    private/https-proxy

sudo docker rm -f https-proxy || true

sudo docker run -dti \
    --name=https-proxy \
    -v acme-webroot:/acme-webroot \
    -v letsencrypt-config:/etc/letsencrypt \
    --net drone-server-net \
    -p 80:80 \
    -p 443:443 \
    --restart=unless-stopped \
    --log-opt max-size=1m \
    --log-opt max-file=5 \
    private/https-proxy

sudo docker image prune -f
