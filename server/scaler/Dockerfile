FROM mcr.microsoft.com/dotnet/core/sdk:2.1
WORKDIR /app
ADD . /app
RUN [ -f /app/Properties/launchSettings.json ] || exit 1
RUN dotnet build -v normal
CMD [ "dotnet", "run" ]
