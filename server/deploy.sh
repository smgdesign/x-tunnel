#!/bin/sh
VERSION=v1.3.1.0
TGT=/opt/x-tunnel
SSH=root@rack04.vpn.smg.systems
docker build -t smgdesign/x-tunnel:${VERSION} .
docker create -it --name x-tunnel smgdesign/x-tunnel:${VERSION} bash
docker cp x-tunnel:/x-tunnel.tar.gz ./app.tar.gz
docker rm -f x-tunnel
scp ./app.tar.gz ${SSH}:${TGT}
rm -rf ./app.tar.gz
ssh ${SSH} << EOF
mkdir ${TGT}/${VERSION}
tar -zxvf ${TGT}/app.tar.gz -C ${TGT}/${VERSION}
rm -rf ${TGT}/app.tar.gz
pm2 stop all
rm ${TGT}/app
ln -s ${TGT}/${VERSION}/app ${TGT}/app
cd ${TGT}/app
yarn start --domain x-tunnel.x-smg.com --port 80
EOF
