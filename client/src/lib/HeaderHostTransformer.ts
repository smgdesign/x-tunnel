import { Socket } from 'net';
import { Transform, TransformOptions } from 'stream';

export class HeaderHostTransformer extends Transform {
  host: string;
  replaced: boolean;
  constructor(opts: {host?: string} & TransformOptions = {}) {
    super(opts);
    this.host = opts.host || 'localhost';
    this.replaced = false;
  }

  _transform(data: any, _encoding: string, callback: (arg0: any, arg1: any) => void) {
    callback(
      null,
      this.replaced // after replacing the first instance of the Host header we just become a regular passthrough
        ? data
        : data.toString().replace(/(\r\n[Hh]ost: )\S+/, (_match: any, $1: string) => {
            this.replaced = true;
            return $1 + this.host;
          })
    );
  }
}
