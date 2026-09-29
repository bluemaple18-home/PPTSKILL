// 僅受管 CDP 因果診斷；不 spawn、不建群組、不 kill、不清 tmp，不修改來源 HTML。
import assert from 'node:assert/strict';
import { constants } from 'node:fs';
import { open, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const output = resolve(here, 'visual-title-diagnostic');
const receiptPath = resolve(output, 'diagnostic.json');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const pause = ms => new Promise(ok => setTimeout(ok, ms));

// 沿既有 harness 的 request id/pending seam，補有界 open 與 session 路由。
class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url); this.nextId = 1; this.pending = new Map(); this.listeners = new Map();
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.method) {
        for (const fn of this.listeners.get(message.method) || []) fn(message.params || {}, message.sessionId);
        return;
      }
      const pending = this.pending.get(message.id); if (!pending) return;
      this.pending.delete(message.id); clearTimeout(pending.timer);
      message.error ? pending.fail(new Error(message.error.message)) : pending.ok(message.result);
    });
    this.socket.addEventListener('close', () => this.rejectPending('CDP socket closed'));
    this.socket.addEventListener('error', () => this.rejectPending('CDP socket error'));
  }
  rejectPending(reason) {
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.fail(new Error(reason)); }
    this.pending.clear();
  }
  async ready(ms) {
    await new Promise((ok, fail) => {
      const timer = setTimeout(() => fail(new Error('CDP readiness deadline')), Math.max(1, ms));
      this.socket.addEventListener('open', () => { clearTimeout(timer); ok(); }, { once: true });
      this.socket.addEventListener('error', () => { clearTimeout(timer); fail(new Error('CDP open error')); }, { once: true });
    });
  }
  send(method, params = {}, sessionId) {
    return new Promise((ok, fail) => {
      const id = this.nextId++;
      const timer = setTimeout(() => { this.pending.delete(id); fail(new Error('CDP timeout: ' + method)); }, 8000);
      this.pending.set(id, { ok, fail, timer });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  on(method, fn) { this.listeners.set(method, [...(this.listeners.get(method) || []), fn]); }
  close() { this.rejectPending('client closing'); this.socket.close(); }
}

async function endpointUntil(deadline, portPath) {
  while (Date.now() < deadline) {
    let handle;
    try {
      handle = await open(portPath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      const info = await handle.stat(); assert.ok(info.isFile() && info.size <= 1024, 'managed port 非小型一般檔');
      const lines = (await handle.readFile('utf8')).trim().split('\n');
      if (/^\d+$/.test(lines[0]) && Number(lines[0]) > 0 && Number(lines[0]) < 65536
        && /^\/devtools\/browser\/[A-Za-z0-9-]+$/.test(lines[1] || '')) return `ws://127.0.0.1:${lines[0]}${lines[1]}`;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    finally { await handle?.close(); }
    await pause(100);
  }
  throw Error('25 秒 managed port readiness 未完成');
}

// 每個 case 都新建 target、重新載入同一原始 HTML；沒有累積修改或產品回寫。
function snapshot() {
  const selectors = { title: 'role-title', A: 'component-history-a', B: 'component-history-b', rightquote: 'component-portable-quote' };
  const elements = {};
  for (const [key, id] of Object.entries(selectors)) {
    const node = document.querySelector(`[data-pptskill-element-id="${id}"]`);
    if (!node) throw Error('missing diagnostic element: ' + id);
    const rect = node.getBoundingClientRect(), css = getComputedStyle(node);
    elements[key] = { textContent: node.textContent, inlineStyle: node.getAttribute('style'),
      font: css.font, fontFamily: css.fontFamily, fontSize: css.fontSize, fontWeight: css.fontWeight,
      letterSpacing: css.letterSpacing, position: css.position, top: css.top,
      bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom } };
  }
  const intersection = key => {
    const a = elements.title.bounds, b = elements[key].bounds;
    const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x));
    const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
    return { width, height, area: width * height, overlaps: width > 0 && height > 0 };
  };
  return { elements, titleIntersections: { A: intersection('A'), B: intersection('B') },
    note: 'DOM bounds intersection 是元素框相交，並非 glyph ink 因果結論；須配對 PNG 核對。' };
}

const receipt = { status: 'NOT_COMPLETE', purpose: 'READ_ONLY_CAUSAL_DIAGNOSTIC_NOT_PRODUCT_ACCEPTANCE',
  startedAt: new Date().toISOString(), pid: process.pid, node: process.version,
  client: { path: fileURLToPath(import.meta.url), sha256: hash(await readFile(fileURLToPath(import.meta.url))) },
  readinessDeadlineSeconds: 25, sources: {}, cases: [], errors: [], browserClose: { attempted: false } };
let browser, activeCase, activeSession;
const save = () => writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
assert.ok((await stat(output)).isDirectory(), 'Mainline 須先建立固定 output');
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
try {
  assert.equal(process.env.AI_CORE_TMP_ARTIFACT_ACTIVE, '1', '只允許 canonical managed client');
  const root = process.env.TMP_ARTIFACT_ROOT;
  assert.ok(root && resolve(root) === root);
  const portPath = process.env.TMP_SESSION_DEVTOOLS_ACTIVE_PORT;
  assert.equal(portPath, resolve(root, 'profile/DevToolsActivePort'));
  receipt.managed = { root, portPath, session: JSON.parse(await readFile(resolve(root, 'evidence/session.json'), 'utf8')) };
  assert.equal(receipt.managed.session.root, root); assert.equal(receipt.managed.session.mode, 'browser');
  for (const width of [1280, 1600]) {
    const path = resolve(here, `host-acceptance-owned-group/undo-redo/${width}-reopen-export.html`);
    const bytes = await readFile(path);
    receipt.sources[width] = { path, bytes: bytes.length, sha256Before: hash(bytes) };
  }
  const start = Date.now(), deadline = start + 25000;
  const endpoint = await endpointUntil(deadline, portPath);
  browser = new CdpClient(endpoint); await browser.ready(deadline - Date.now());
  assert.ok(Date.now() <= deadline, 'readiness 超過25秒');
  receipt.readinessElapsedMs = Date.now() - start;
  for (const method of ['Runtime.consoleAPICalled', 'Runtime.exceptionThrown', 'Network.loadingFailed', 'Network.responseReceived', 'Network.requestWillBeSent', 'Log.entryAdded']) {
    browser.on(method, (params, sessionId) => {
      if (!activeCase || sessionId !== activeSession) return;
      if (method === 'Runtime.consoleAPICalled') activeCase.console.push(params);
      if (method === 'Runtime.exceptionThrown') activeCase.pageErrors.push(params);
      if (method === 'Network.loadingFailed') activeCase.networkFailures.push(params);
      if (method === 'Network.responseReceived' && params.response.status >= 400) activeCase.httpErrors.push(params);
      if (method === 'Network.requestWillBeSent' && /^https?:/.test(params.request.url)) activeCase.remoteRequests.push(params);
      if (method === 'Log.entryAdded' && params.entry.level === 'error') activeCase.logErrors.push(params);
    });
  }
  for (const [width, height] of [[1280, 720], [1600, 900]]) {
    let baseline;
    for (const name of ['original', 'title-tracking-zero', 'fixtures-top-600']) {
      const record = { width, height, name, status: 'INCOMPLETE', console: [], pageErrors: [], networkFailures: [], httpErrors: [], remoteRequests: [], logErrors: [] };
      receipt.cases.push(record); activeCase = record;
      let targetId;
      try {
        ({ targetId } = await browser.send('Target.createTarget', { url: 'about:blank' }));
        ({ sessionId: activeSession } = await browser.send('Target.attachToTarget', { targetId, flatten: true }));
        const send = (method, params) => browser.send(method, params, activeSession);
        const evaluate = async expression => {
          const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
          if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
          return result.result.value;
        };
        for (const method of ['Page.enable', 'Runtime.enable', 'Network.enable', 'Log.enable']) await send(method);
        await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
        const url = pathToFileURL(receipt.sources[width].path).href;
        const navigation = await send('Page.navigate', { url }); assert.ok(!navigation.errorText, navigation.errorText);
        let loaded = false;
        for (let i = 0; i < 100; i++) {
          if (await evaluate(`location.href===${JSON.stringify(url)} && document.readyState==='complete' && !!window.PPTSKILLEditor`)) { loaded = true; break; }
          await pause(50);
        }
        assert.ok(loaded, '原HTML未完成載入');
        await evaluate('(async()=>{await document.fonts.ready;await new Promise(ok=>setTimeout(ok,1400));return true})()');
        record.before = await evaluate(`(${snapshot.toString()})()`);
        if (name === 'original') baseline = record.before;
        else assert.deepEqual(record.before, baseline, '每個case須由同一原樣開始');
        if (name === 'title-tracking-zero') await evaluate(`document.querySelector('[data-pptskill-element-id="role-title"]').style.letterSpacing='0px'`);
        if (name === 'fixtures-top-600') await evaluate(`(()=>{for(const id of ['component-history-a','component-history-b'])document.querySelector('[data-pptskill-element-id="'+id+'"]').style.top='600px';return true})()`);
        await evaluate('new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(()=>ok(true))))');
        record.after = await evaluate(`(${snapshot.toString()})()`);
        for (const key of ['title', 'A', 'B', 'rightquote']) {
          assert.equal(record.after.elements[key].textContent, record.before.elements[key].textContent, 'copy不得改動');
          if (name === 'title-tracking-zero' && key !== 'title') assert.equal(record.after.elements[key].inlineStyle, record.before.elements[key].inlineStyle, '非標題style不得改动');
          if (name === 'fixtures-top-600' && !['A', 'B'].includes(key)) assert.equal(record.after.elements[key].inlineStyle, record.before.elements[key].inlineStyle, '非fixture style不得改動');
        }
        if (name === 'original') assert.deepEqual(record.after, record.before);
        if (name === 'title-tracking-zero') assert.equal(record.after.elements.title.letterSpacing, '0px');
        if (name === 'fixtures-top-600') {
          assert.equal(record.after.elements.title.letterSpacing, baseline.elements.title.letterSpacing);
          for (const key of ['A', 'B']) assert.equal(record.after.elements[key].top, '600px');
        }
        const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        const bytes = Buffer.from(shot.data, 'base64'), path = resolve(output, `${width}-${name}.png`);
        assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(bytes.readUInt32BE(16), width); assert.equal(bytes.readUInt32BE(20), height);
        await writeFile(path, bytes, { flag: 'wx' });
        record.screenshot = { path, bytes: bytes.length, sha256: hash(bytes) };
        record.status = 'CAPTURED';
      } finally {
        if (targetId) record.targetClosed = (await browser.send('Target.closeTarget', { targetId })).success === true;
        await save(); activeSession = undefined; activeCase = undefined;
      }
      assert.equal(record.targetClosed, true, '本case target未關閉');
    }
  }
} catch (error) {
  const detail = { message: String(error), stack: error.stack };
  receipt.errors.push(detail); if (activeCase) activeCase.error = detail;
} finally {
  if (browser) {
    receipt.browserClose.attempted = true;
    try { receipt.browserClose.result = await browser.send('Browser.close'); receipt.browserClose.acknowledged = true; }
    catch (error) { receipt.browserClose.error = String(error); receipt.browserClose.acknowledged = false; }
    finally { browser.close(); }
  }
  for (const source of Object.values(receipt.sources)) {
    try { source.sha256After = hash(await readFile(source.path)); assert.equal(source.sha256After, source.sha256Before, '來源HTML有變'); }
    catch (error) { receipt.errors.push({ source: source.path, message: String(error) }); }
  }
  const pageErrors = receipt.cases.some(c => c.pageErrors.length || c.networkFailures.length || c.httpErrors.length || c.remoteRequests.length || c.logErrors.length || c.console.some(e => e.type === 'error'));
  receipt.status = receipt.cases.length === 6 && receipt.cases.every(c => c.status === 'CAPTURED' && c.targetClosed)
    && receipt.errors.length === 0 && !pageErrors && receipt.browserClose.acknowledged ? 'DIAGNOSTIC_CAPTURE_COMPLETE' : 'NOT_COMPLETE';
  receipt.finishedAt = new Date().toISOString(); await save();
  process.exitCode = receipt.status === 'DIAGNOSTIC_CAPTURE_COMPLETE' ? 0 : 1;
}
