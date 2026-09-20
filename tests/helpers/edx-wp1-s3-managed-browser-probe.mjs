// 無 browser 的 failure-path probe：任何 spawn 均失敗；只允許 owned target lifecycle。
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { appendFileSync } from 'node:fs';
const log = value => appendFileSync(process.env.S3_PROBE_LOG, JSON.stringify(value) + '\n');
childProcess.spawn = () => { log({ forbidden: 'spawn' }); throw new Error('不得 spawn browser'); };
syncBuiltinESMExports();
globalThis.fetch = async (url, options) => {
  log({ fetch: url, method: options?.method });
  if (url.includes('/json/new?')) return { ok: true, json: async () => ({ id: 's3-owned-target', webSocketDebuggerUrl: 'ws://127.0.0.1:12345/s3-owned-target' }) };
  if (url.endsWith('/json/close/s3-owned-target')) return { ok: true };
  throw new Error('不得讀取／操作 foreign target');
};
globalThis.WebSocket = class extends EventTarget {
  constructor(url) { super(); log({ socket: url }); setImmediate(() => this.dispatchEvent(new Event('open'))); }
  send(data) {
    const message = JSON.parse(data); log({ method: message.method });
    const response = { id: message.id, ...(message.method === 'Page.navigate' ? { error: { message: 'S3_PROBE_NAVIGATION_FAILURE' } } : { result: {} }) };
    setImmediate(() => this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(response) })));
  }
  close() { log({ closedSocket: true }); }
};
