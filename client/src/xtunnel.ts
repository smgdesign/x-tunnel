import { Tunnel, XTunnelOpts } from "./lib/Tunnel";



export const xTunnel = (opts: XTunnelOpts): Promise<Tunnel> => {
  const client = new Tunnel(opts);
  return new Promise((resolve, reject) =>
    client.open(err => (err ? reject(err) : resolve(client)))
  );
};
