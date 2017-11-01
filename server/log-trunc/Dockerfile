FROM alpine
RUN apk update && apk add sqlite
ADD rootfs /
RUN chmod +x /loop.sh
CMD [ "/loop.sh" ]
