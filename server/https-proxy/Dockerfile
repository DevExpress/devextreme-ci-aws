FROM alpine:3.7

RUN apk add --no-cache nginx certbot

RUN ln -sf /dev/null /var/log/nginx/access.log \
 && ln -sf /dev/null /var/log/nginx/error.log

#RUN ln -sf /dev/stdout /var/log/nginx/access.log \
# && ln -sf /dev/stderr /var/log/nginx/error.log

ADD rootfs /

RUN mkdir -p /run/nginx
RUN chmod +x /loop.sh

STOPSIGNAL SIGKILL
CMD [ "/loop.sh" ]
