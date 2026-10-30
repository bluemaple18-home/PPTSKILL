import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const deck = resolve(root, 'evidence/p0-r11/recipient-ai-handoff/recipient-patched-deck.html');
const receiptPath = resolve(root, 'evidence/p0-r11/recipient-ai-handoff/browser-reopen.json');
const screenshotPath = resolve(root, 'evidence/p0-r11/recipient-ai-handoff/recipient-patched-deck.png');
const candidates = [process.env.PPTSKILL_CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].filter(Boolean);
let chromeBin;
for (const candidate of candidates) { try { await access(candidate); chromeBin = candidate; break; } catch {} }
if (!chromeBin) throw new Error('找不到 Chrome/Chromium。');

class Cdp {
  constructor(url) { this.ws = new WebSocket(url); this.id = 1; this.pending = new Map(); this.listeners = new Map(); }
  async open() { await new Promise((ok, fail) => { this.ws.addEventListener('open', ok, { once: true }); this.ws.addEventListener('error', fail, { once: true }); }); this.ws.addEventListener('message', ({ data }) => { const message = JSON.parse(data); if (message.method) { for (const listener of this.listeners.get(message.method) || []) listener(message.params || {}); return; } const pending = this.pending.get(message.id); if (!pending) return; this.pending.delete(message.id); message.error ? pending.fail(new Error(message.error.message)) : pending.ok(message.result); }); }
  send(method, params = {}) { const id = this.id++; return new Promise((ok, fail) => { this.pending.set(id, { ok, fail }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  on(name, listener) { this.listeners.set(name, [...(this.listeners.get(name) || []), listener]); }
  close() { this.ws.close(); }
}

const profile = await mkdtemp(`${tmpdir()}/pptskill-r11-recipient-browser-`);
const browser = spawn(chromeBin, ['--headless=new', '--hide-scrollbars', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1600,900', 'about:blank'], { stdio: 'ignore' });
try {
  let port;
  for (let attempt = 0; attempt < 50; attempt += 1) { try { port = Number((await readFile(`${profile}/DevToolsActivePort`, 'utf8')).split('\n')[0]); if (port) break; } catch {} await new Promise((done) => setTimeout(done, 100)); }
  if (!port) throw new Error('Chrome 未就緒。');
  let page;
  for (let attempt = 0; attempt < 50; attempt += 1) { try { page = (await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json())).find(({ type }) => type === 'page'); if (page) break; } catch {} await new Promise((done) => setTimeout(done, 100)); }
  if (!page) throw new Error('Page target 未就緒。');
  const cdp = new Cdp(page.webSocketDebuggerUrl);
  await cdp.open();
  const consoleMessages = [], pageErrors = [], networkFailures = [], httpErrors = [];
  cdp.on('Runtime.consoleAPICalled', ({ type, args = [] }) => consoleMessages.push({ type, text: args.map(({ value, description }) => value ?? description ?? '').join(' ') }));
  cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => pageErrors.push(exceptionDetails?.exception?.description || exceptionDetails?.text));
  cdp.on('Network.loadingFailed', ({ errorText, canceled }) => networkFailures.push({ errorText, canceled }));
  cdp.on('Network.responseReceived', ({ response }) => { if (response?.status >= 400) httpErrors.push({ url: response.url, status: response.status }); });
  await Promise.all([cdp.send('Page.enable'), cdp.send('Runtime.enable'), cdp.send('Network.enable')]);
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0, connectionType: 'none' });
  const loaded = new Promise((done) => cdp.on('Page.loadEventFired', done));
  await cdp.send('Page.navigate', { url: pathToFileURL(deck).href });
  await Promise.race([loaded, new Promise((_, fail) => setTimeout(() => fail(new Error('頁面載入逾時。')), 8000))]);
  const state = (await cdp.send('Runtime.evaluate', { expression: `(()=>{const spec=window.PPTSKILLEditor?.getDeckSpec();const target=spec?.slides.find(x=>x.id==='company-content-gradient');return{ready:Boolean(window.PPTSKILLEditor),slideCount:spec?.slides.length,subtitle:target?.content.subtitle,externalUrls:[...document.querySelectorAll('[src],[href]')].map(x=>x.src||x.href).filter(x=>/^https?:/.test(x))}})()`, returnByValue: true })).result.value;
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
  const diagnostics = { console: consoleMessages, pageErrors, networkFailures, httpErrors };
  const checks = {
    runtimeReady: state.ready,
    slideCountPreserved: state.slideCount === 9,
    boundedPatchVisible: state.subtitle === '將分散觀察整理成三項明確結論，並為每項指定下一步行動',
    offlineNoExternalAssets: state.externalUrls.length === 0,
    runtimeClean: pageErrors.length === 0 && httpErrors.length === 0 && networkFailures.filter(({ canceled }) => !canceled).length === 0,
  };
  const receipt = { schemaVersion: '1.0', status: Object.values(checks).every(Boolean) ? 'pass' : 'fail', checks, state, diagnostics, listenersRegisteredBeforeNavigation: true, screenshot: 'recipient-patched-deck.png' };
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
  if (receipt.status !== 'pass') process.exitCode = 1;
  cdp.close();
} finally {
  if (browser.exitCode === null) browser.kill('SIGTERM');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
