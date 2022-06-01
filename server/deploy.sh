#!/bin/sh
VERSION=v1.3.1.0
docker build -t x-tunnel:${VERSION} /opt/x-tunnel/source

docker cp smgdesign/x-tunnel:${VERSION}:/app.tar.gz /opt/x-tunnel/assets
tar -zxvf /opt/x-tunnel/assets/app.tar.gz -O /opt/x-tunnel
yarn start --host x-tunnel.x-smg.com --port 80
