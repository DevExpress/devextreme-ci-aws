FROM buildpack-deps:stretch-curl

RUN apt-get update && apt-get install -y nginx-light certbot

ADD rootfs /
RUN chmod +x /loop.sh

RUN sed -i -r 's|/var/log/nginx/\w+\.log|/dev/null|g' /etc/nginx/nginx.conf

STOPSIGNAL SIGKILL
CMD [ "/loop.sh" ]
