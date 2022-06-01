FROM node:16-alpine as build
WORKDIR /app

COPY package.json /app/
COPY yarn.lock /app/

RUN yarn install && yarn cache clean
COPY . /app
RUN yarn build

FROM node:16-alpine
WORKDIR /app

COPY --from=build /app/package.json /app/
COPY --from=build /app/yarn.lock /app/
COPY --from=build /app/.env /app/

RUN yarn install --production && yarn cache clean
COPY --from=build /app/dist /app/dist
RUN tar -zcvf /app x-tunnel.tar.gz
