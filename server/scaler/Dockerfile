FROM mcr.microsoft.com/dotnet/core/sdk:2.1-alpine3.9 as builder
WORKDIR /app
ADD . /app
RUN [ -f /app/config.json ] || exit 1
RUN dotnet publish -c release -v normal -o /app-dist

FROM mcr.microsoft.com/dotnet/core/runtime:2.1-alpine3.9
WORKDIR /app-dist
COPY --from=builder /app-dist .
CMD [ "dotnet", "Scaler.dll" ]
