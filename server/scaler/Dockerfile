FROM microsoft/aspnetcore-build:2
WORKDIR /app
ADD . /app
RUN [ -f /app/Properties/launchSettings.json ] || exit 1
RUN dotnet build
CMD [ "dotnet", "run" ]
