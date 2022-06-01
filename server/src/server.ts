#!/usr/bin/env node -r esm

import 'localenv';
import optimist from 'optimist';

import log from 'book';
import Debug from 'debug';

import { CreateServers } from './app';

const debug = Debug('x-tunnel');

const argv = optimist
    .usage('Usage: $0 --port [num]')
    .options('secure', {
        default: false,
        describe: 'use this flag to indicate proxy over https'
    })
    .options('port', {
        default: '80',
        describe: 'listen on this port for outside requests'
    })
    .options('s-port', {
        default: '443',
        describe: 'listen on this port for outside requests securely'
    })
    .options('address', {
        default: '0.0.0.0',
        describe: 'IP address to bind to'
    })
    .options('domain', {
        describe: 'Specify the base domain name. This is optional if hosting x-tunnel from a regular example.com domain. This is required if hosting a x-tunnel server from a subdomain (i.e. lt.example.dom where clients will be client-app.lt.example.come)',
    })
    .options('max-sockets', {
        default: 10,
        describe: 'maximum number of tcp sockets each client is allowed to establish at one time (the tunnels)'
    })
    .options('cert', {
        describe: 'Certificate file location'
    })
    .options('key', {
        describe: 'Certificate key file location'
    })
    .argv;

if (argv.help) {
    optimist.showHelp();
    process.exit();
}

const servers = CreateServers({
    max_tcp_sockets: argv['max-sockets'],
    secure: argv.secure,
    domain: argv.domain,
    ports: {
        http: argv.port,
        https: argv['s-port'],
    },
    cert: {
        cert: argv.cert,
        key: argv.key,
    },
});

if (argv.secure) {
    servers[0].listen(argv['s-port'], argv.address, () => {
        debug('secure server listening on port: %d', argv['s-port']);
    });
    servers[0].listen(argv.port, argv.address, () => {
        debug('server listening on port: %d', argv.port);
    });
} else {
    servers[0].listen(argv.port, argv.address, () => {
        debug('server listening on port: %d', argv.port);
    });
}



process.on('SIGINT', () => {
    process.exit();
});

process.on('SIGTERM', () => {
    process.exit();
});

process.on('uncaughtException', (err) => {
    log.error(err);
});

process.on('unhandledRejection', (reason, promise) => {
    log.error(reason);
});

// vim: ft=javascript

