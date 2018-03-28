FROM alpine:3.7
RUN apk add --no-cache sqlite
ADD rootfs /
RUN chmod +x /loop.sh
CMD [ "/loop.sh" ]
