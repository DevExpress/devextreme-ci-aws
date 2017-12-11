FROM debian:stretch

RUN apt-get update && apt-get install -y nginx-light certbot

RUN ln -sf /dev/null /var/log/nginx/access.log \
 && ln -sf /dev/null /var/log/nginx/error.log

#RUN ln -sf /dev/stdout /var/log/nginx/access.log \
# && ln -sf /dev/stderr /var/log/nginx/error.log

ADD rootfs /
RUN chmod +x /loop.sh

STOPSIGNAL SIGKILL
CMD [ "/loop.sh" ]
