/* eslint-disable consistent-return, no-underscore-dangle */

import { URL } from 'node:url';
import { EventEmitter } from 'events';
import axios, { AxiosRequestConfig }  from 'axios';
import Debug from 'debug';

const debug = Debug('x-tunnel:client');

import { TunnelCluster } from './TunnelCluster';

export type XTunnelOpts = {
  port?: number;
  host?: string;
  subdomain?: string;
  local_host?: string;
  local_https?: boolean;
  local_cert?: string;
  local_key?: string;
  local_ca?: string;
  allow_invalid_cert?: boolean;
}

export type GetUrlResponse = {
  id?: string;
  ip: string;
  port: number;
  url: string;
  cached_url: string;
  max_conn_count?: number;
}

export type GetUrlError = {
  message: string;
}

export type TunnelInfo = XTunnelOpts & {
  name: string;
  url: string;
  cached_url: string;
  max_conn: number;
  remote_host: string;
  remote_ip: string;
  remote_port: number;
  local_port: number;
}

export class Tunnel extends EventEmitter {
  opts: XTunnelOpts;
  closed: boolean;
  tunnelCluster: TunnelCluster;
  clientId: any;
  url: any;
  cachedUrl: any;
  constructor(opts: XTunnelOpts = {}) {
    super();
    this.opts = opts;
    this.closed = false;
    if (!this.opts.host) {
      this.opts.host = 'https://x-tunnel.x-smg.com';
    }
  }

  _getInfo(body: GetUrlResponse): TunnelInfo {
    // returned info from x-tunnel server
    const { id, ip, port, url, cached_url, max_conn_count } = body;
    // allocate connection detail
    const { host, port: local_port, local_host } = this.opts;
    // allocate SSL stuff
    const { local_https, local_cert, local_key, local_ca, allow_invalid_cert } = this.opts;
    return {
      name: id,
      url,
      cached_url,
      max_conn: max_conn_count || 1,
      remote_host: new URL(host).hostname,
      remote_ip: ip,
      remote_port: port,
      local_port,
      local_host,
      local_https,
      local_cert,
      local_key,
      local_ca,
      allow_invalid_cert,
    };
    /* eslint-enable camelcase */
  }

  // initialize connection
  // callback with connection info
  _init(cb: (err: Error, tunnelInfo?: TunnelInfo) => void) {
    const opt = this.opts;
    const getInfo = this._getInfo.bind(this);

    const config: AxiosRequestConfig = {
      responseType: 'json',
    };

    const baseUri = `${opt.host}/`;
    // no subdomain at first, maybe use requested domain
    const assignedDomain = opt.subdomain;
    // where to query
    const uri = baseUri + (assignedDomain || '?new');

    (function getUrl() {
      console.log('getting info', uri);
      axios
        .get<GetUrlResponse | GetUrlError>(uri, config)
        .then(res => {
          console.log('got info', res.data);
          const body = res.data;
          debug('got tunnel information', res.data);
          if ('message' in body) {
            const err = new Error(body.message);
            return cb(err);
          } else if (res.status !== 200 ) {
            const err = new Error('x-tunnel server returned an error, please try again');
            return cb(err);
          }
          cb(null, getInfo(body));
        })
        .catch(err => {
          debug(`tunnel server offline: ${err.message}, retry 1s`);
          return setTimeout(getUrl, 1000);
        });
    })();
  }

  _establish(info: TunnelInfo): void {
    // increase max event listeners so that x-tunnel consumers don't get
    // warning messages as soon as they setup even one listener. See #71
    this.setMaxListeners(info.max_conn + (EventEmitter.defaultMaxListeners || 10));

    this.tunnelCluster = new TunnelCluster(info);

    // only emit the url the first time
    this.tunnelCluster.once('open', () => {
      this.emit('url', info.url);
    });

    // re-emit socket error
    this.tunnelCluster.on('error', err => {
      debug('got socket error', err.message);
      this.emit('error', err);
    });

    let tunnelCount = 0;

    // track open count
    this.tunnelCluster.on('open', tunnel => {
      tunnelCount++;
      debug('tunnel open [total: %d]', tunnelCount);

      const closeHandler = () => {
        tunnel.destroy();
      };

      if (this.closed) {
        return closeHandler();
      }

      this.once('close', closeHandler);
      tunnel.once('close', () => {
        this.removeListener('close', closeHandler);
      });
    });

    // when a tunnel dies, open a new one
    this.tunnelCluster.on('dead', () => {
      tunnelCount--;
      debug('tunnel dead [total: %d]', tunnelCount);
      if (this.closed) {
        return;
      }
      this.tunnelCluster.open();
    });

    this.tunnelCluster.on('request', req => {
      this.emit('request', req);
    });

    // establish as many tunnels as allowed
    for (let count = 0; count < info.max_conn; ++count) {
      this.tunnelCluster.open();
    }
  }

  open(cb: (err?: Error) => void): void {
    this._init((err, info) => {
      if (err) {
        return cb(err);
      }

      this.clientId = info.name;
      this.url = info.url;

      // `cached_url` is only returned by proxy servers that support resource caching.
      if (info.cached_url) {
        this.cachedUrl = info.cached_url;
      }

      this._establish(info);
      cb();
    });
  }

  close(): void {
    this.closed = true;
    this.emit('close');
  }
};
