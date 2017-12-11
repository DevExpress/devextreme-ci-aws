#!/bin/bash -e

LE_DOMAIN=devextreme-ci.devexpress.com
LE_EMAIL=js@devexpress.com

function certbot_renew {
    if certbot certonly -n --no-self-upgrade --keep --expand --webroot -w /acme-webroot -m $LE_EMAIL --agree-tos -d $LE_DOMAIN; then
        nginx -s reload
    else
        echo "Renewal failed :("
    fi
}

nginx -g 'daemon off;' &
certbot_renew

if [ -f /etc/letsencrypt/live/$LE_DOMAIN/fullchain.pem ]; then
    ln -sf /etc/nginx/sites-available/default-ssl /etc/nginx/sites-enabled/default-ssl
    nginx -s reload
fi

while true; do
    sleep 43200
    certbot_renew
done
