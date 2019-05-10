FROM mcr.microsoft.com/dotnet/framework/sdk:4.8 AS build
ARG app
WORKDIR /app

# copy csproj and restore as distinct layers
COPY *.sln .
COPY $app/*.csproj ./$app/
COPY $app/*.config ./$app/
RUN nuget restore

# copy everything else and build app
COPY $app/. ./$app/
WORKDIR /app/$app
RUN msbuild /p:Configuration=Release

FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8 AS runtime
ARG app
WORKDIR /inetpub/wwwroot
COPY --from=build /app/$app/. ./