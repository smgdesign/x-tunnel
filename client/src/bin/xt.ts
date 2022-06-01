#!/usr/bin/env node
/* eslint-disable no-console */

import 'localenv';
import openurl from 'openurl';
import yargs from 'yargs/yargs';

import { xTunnel } from '../xtunnel';
import { version } from '../../package.json';

const parser = yargs(process.argv.slice(2))
  .options({
    p: {
      type: 'number',
      demandOption: true,
      alias: 'port',
      describe: 'Client port to connect'
    },
    h: {
      type: 'string',
      alias: 'host',
      describe: 'Upstream server to connect to',
      default: 'https://x-tunnel.x-smg.com',
    },
    s: {
      type: 'string',
      alias: 'subdomain',
      describe: 'Request this subdomain',
    },
    l: {
      type: 'string',
      alias: 'local-host',
      describe: 'Tunnel traffic to this host instead of localhost, override Host header to this host',
    },
    'local-https': {
      type: 'boolean',
      describe: 'Tunnel traffic to a local HTTPS server',
    },
    'local-cert': {
      type: 'string',
      describe: 'Path to certificate PEM file for local HTTPS server',
    },
    'local-key': {
      type: 'string',
      describe: 'Path to certificate key file for local HTTPS server',
    },
    'local-ca': {
      type: 'string',
      describe: 'Path to certificate authority file for self-signed certificates',
    },
    'allow-invalid-cert': {
      type: 'boolean',
      describe: 'Disable certificate checks for your local HTTPS server (ignore cert/key/ca args)',
    },
    'print-requests': {
      type: 'boolean',
      describe: 'Print basic request info',
    },
  });
  yargs(process.argv.slice(2))
    .usage('Usage: xt --port [num] <options>')
    .env(true)
    .help('help', 'Show this help and exit')
    .version(version);

(async () => {
  const argv = await parser.argv;
  if (typeof argv.p !== 'number') {
    yargs(process.argv.slice(2)).showHelp();
    console.error('\nInvalid argument: `port` must be a number');
    process.exit(1);
  }

  const tunnel = await xTunnel({
    port: argv.p,
    host: argv.h,
    subdomain: argv.s,
    local_host: argv.l,
    local_https: argv.localHttps,
    local_cert: argv.localCert,
    local_key: argv.localKey,
    local_ca: argv.localCa,
    allow_invalid_cert: argv.allowInvalidCert,
  }).catch(err => {
    throw err;
  });

  tunnel.on('error', err => {
    throw err;
  });

  console.log('your url is: %s', tunnel.url);

  /**
   * `cachedUrl` is set when using a proxy server that support resource caching.
   * This URL generally remains available after the tunnel itself has closed.
   * @see https://github.com/localtunnel/localtunnel/pull/319#discussion_r319846289
   */
  if (tunnel.cachedUrl) {
    console.log('your cachedUrl is: %s', tunnel.cachedUrl);
  }

  if (argv.open) {
    openurl.open(tunnel.url);
  }

  if (argv['print-requests']) {
    tunnel.on('request', info => {
      console.log(new Date().toString(), info.method, info.path);
    });
  }
})();
