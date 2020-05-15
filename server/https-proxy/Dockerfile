# https://github.com/AlekseyMartynov/nginx-base
FROM private/nginx-base

ENV LE_EMAIL=js@devexpress.com
ENV LE_DOMAINS=devextreme-ci.devexpress.com
ENV NGINX_LOGS=false

ADD rootfs /

RUN sed -i 's/client_max_body_size 1m/client_max_body_size 0/g' /etc/nginx/nginx.conf
