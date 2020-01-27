#!/bin/sh -e

LE_DOMAIN=devextreme-ci.devexpress.com
LE_EMAIL=js@devexpress.com

certbot_renew() {
    if certbot certonly -n --no-self-upgrade --keep --expand --webroot -w /acme-webroot -m $LE_EMAIL --agree-tos -d $LE_DOMAIN; then
        nginx -s reload
    else
        echo "Renewal failed :("
    fi
}

try_load_ssl_config() {
    if [ -f /etc/letsencrypt/live/$LE_DOMAIN/fullchain.pem ]; then
        mv /etc/nginx/conf.d.ssl/* /etc/nginx/conf.d
        pidof nginx && nginx -s reload
        echo "ssl config loaded"
    else
        echo "ssl config SKIPPED"
    fi
}

if [ -n "$TEST_NGINX_CONFIG" ]; then
    try_load_ssl_config
    nginx -t
    exit $?
fi

nginx -g 'daemon off;' &
certbot_renew

try_load_ssl_config

while true; do
    sleep 43200
    certbot_renew
done
