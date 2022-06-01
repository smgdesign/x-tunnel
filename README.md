# x-tunnel-server

x-tunnel exposes a port of your choosing out to the public.

This repo contains server and client components. Deploy the server to a host of your choice and run the client from any machine you wish to expose a port from.

You can use the hosted x-tunnel solution here: <https://x-tunnel.x-smg.com>.

## overview ##

The default x-tunnel client connects to the `x-tunnel.x-smg.com` server. You can, however, easily set up and run your own server. In order to run your own x-tunnel server you must ensure that your server can meet the following requirements:

* You can set up DNS entries for your `domain.tld` and `*.domain.tld` (or `sub.domain.tld` and `*.sub.domain.tld`).
* The server can accept incoming TCP connections for any non-root TCP port (i.e. ports over 1000).

The above are important as the client will ask the server for a subdomain under a particular domain. The server will listen on any OS-assigned TCP port for client connections.

#### setup

```shell
# pick a place where the files will live
git clone git://github.com/smgdesign/x-tunnel.git
cd x-tunnel/server
yarn install
# compile typescript
yarn build

# server set to run on port 1234
yarn start --port 1234
```

The x-tunnel server is now running and waiting for client requests on port 1234. You will most likely want to set up a reverse proxy to listen on port 80 (or start x-tunnel on port 80 directly).

**NOTE** By default, x-tunnel will use subdomains for clients, if you plan to host your x-tunnel server itself on a subdomain you will need to use the _--domain_ option and specify the domain name behind which you are hosting x-tunnel. (i.e. my-x-tunnel-server.example.com)

#### use your server

You can now use your domain with the `--host` flag for the `lt` client.

```shell
xt --host http://sub.example.tld:1234 --port 9000
```

You will be assigned a URL similar to `heavy-puma-9.sub.example.com:1234`.

If your server is acting as a reverse proxy (i.e. nginx) and is able to listen on port 80, then you do not need the `:1234` part of the hostname for the `lt` client.

## REST API

### POST /api/tunnels

Create a new tunnel. A X-tunnel client posts to this enpoint to request a new tunnel with a specific name or a randomly assigned name.

### GET /api/status

General server information.
