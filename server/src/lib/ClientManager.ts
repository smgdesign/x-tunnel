import { hri } from 'human-readable-ids';
import Debug from 'debug';

import { Client } from './Client';
import { TunnelAgent } from './TunnelAgent';
import { CreateServerOpt } from '../app';

export type ClientInfo = {
    id: string;
    port: number;
    max_conn_count: number;
    url?: string;
}

export const PORT_RANGE = [18080, 19080];

// Manage sets of clients
//
// A client is a "user session" established to service a remote x-tunnel client
class ClientManager {
    opt: CreateServerOpt;
    clients: Map<string, Client>;
    stats: { tunnels: number; };
    debug: Debug.Debugger;
    graceTimeout: any;
    availablePorts: number[];
    constructor(opt: CreateServerOpt) {
        this.opt = opt || {};
        this.availablePorts = [];
        for (let cP = PORT_RANGE[0]; cP < PORT_RANGE[1]; cP++) {
            this.availablePorts.push(cP);
        }

        // id -> client instance
        this.clients = new Map();

        // statistics
        this.stats = {
            tunnels: 0
        };

        this.debug = Debug('x-tunnel:ClientManager');

        // This is totally wrong :facepalm: this needs to be per-client...
        this.graceTimeout = null;
    }

    // create a new tunnel with `id`
    // if the id is already used, a random id is assigned
    // if the tunnel could not be created, throws an error
    async newClient(id: string): Promise<ClientInfo> {
        const clients = this.clients;
        const stats = this.stats;

        // can't ask for id already in use
        if (clients.get(id)) {
            id = `${id}-${hri.random()}`;
        }

        const maxSockets = this.opt.max_tcp_sockets;
        this.debug('Creating Tunnel Agent for %s', id);
        const requestingPort = this.availablePorts.shift();
        this.debug('Requesting port %d', requestingPort);
        const agent = new TunnelAgent({
            clientId: id,
            maxTcpSockets: 10,
            requestedPort: requestingPort,
        });
        this.debug('Created Tunnel Agent for %s', id);
        this.debug('Creating Client for %s', id);
        const client = new Client({
            id,
            agent,
        });
        this.debug('Created Client for %s', id);

        // add to clients map immediately
        // avoiding races with other clients requesting same id
        clients.set(id, client);

        client.once('close', () => {
            this.removeClient(id);
            this.availablePorts.push(requestingPort);
        });

        // try/catch used here to remove client id
        try {
            const info = await agent.listen();
            ++stats.tunnels;
            return {
                id: id,
                port: info.port,
                max_conn_count: maxSockets,
            };
        }
        catch (err) {
            this.removeClient(id);
            this.availablePorts.push(requestingPort);
            // rethrow error for upstream to handle
            throw err;
        }
    }

    removeClient(id: string) {
        this.debug('removing client: %s', id);
        const client = this.clients.get(id);
        if (!client) {
            return;
        }
        --this.stats.tunnels;
        this.clients.delete(id);
        client.close();
    }

    hasClient(id: string) {
        return !!this.clients.get(id);
    }

    getClient(id: string) {
        return this.clients.get(id);
    }
}

export default ClientManager;
