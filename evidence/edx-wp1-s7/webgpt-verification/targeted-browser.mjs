import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildMotionFixture } from '../../../tools/edx-wp1-s3-motion-browser-cases.mjs';
import { extractDeckSpec } from '../../../runtime/deck-spec.js';

const outputDir = resolve(process.argv[2]);
const viewportArg = process.argv[3] || '';
const viewports = viewportArg === ''
  ? [[1280, 720], [1600, 900]]
  : viewportArg === '--viewport=1600x900'
    ? [[1600, 900]]
    : (() => { throw new Error(`不支援的 viewport 參數：${viewportArg}`); })();
const portFile = process.env.PPTSKILL_DEVTOOLS_ACTIVE_PORT;
if (!portFile) throw new Error('需要受管 PPTSKILL_DEVTOOLS_ACTIVE_PORT。');
await mkdir(outputDir, { recursive: true });

class CdpClient {
  constructor(url) { this.socket = new WebSocket(url); this.nextId = 1; this.pending = new Map(); this.listeners = new Map(); }
  async open() {
    await new Promise((ok, fail) => { this.socket.addEventListener('open', ok, { once: true }); this.socket.addEventListener('error', fail, { once: true }); });
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.method) { for (const fn of this.listeners.get(message.method) || []) fn(message.params || {}); return; }
      const pending = this.pending.get(message.id); if (!pending) return;
      this.pending.delete(message.id); clearTimeout(pending.timer);
      if (message.error) pending.fail(new Error(message.error.message)); else pending.ok(message.result);
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((ok, fail) => {
      const timer = setTimeout(() => { this.pending.delete(id); fail(new Error('CDP timeout: ' + method)); }, 15000);
      this.pending.set(id, { ok, fail, timer }); this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, fn) { this.listeners.set(method, [...(this.listeners.get(method) || []), fn]); }
  close() { for (const value of this.pending.values()) clearTimeout(value.timer); this.socket.close(); }
}

const port = Number((await readFile(portFile, 'utf8')).trim().split('\n')[0]);
assert.ok(Number.isInteger(port) && port > 0 && port <= 65535);
const selector = '.slide[data-slide-id="portable"] [data-pptskill-element-id="component-portable-quote"]';
const subtitle = '.slide[data-slide-id="portable"] [data-edit-target="slides.portable.content.subtitle"]';
const base = { x: 803, y: 283, width: 637, height: 477 };
const dragged = { ...base, x: 816, y: 296 };
const resized = { ...dragged, width: 624, height: 464 };
const target = { slideId: 'portable', elementId: 'component-portable-quote' };
const fixture = await buildMotionFixture('brand-device-accent');
const sourcePath = resolve(outputDir, 'source.html');
await writeFile(sourcePath, fixture.html);
const receipt = { status: 'running', scope: 'S7 motion-reset targeted browser', authorization: 'Owner 明示授權一次 targeted browser；再次失敗即停。', runs: [] };
const identity = value => value === 'none' || value === 'matrix(1, 0, 0, 1, 0, 0)';

try {
  for (const [width, height] of viewports) {
    const run = { width, height, status: 'running', console: [], pageErrors: [], networkFailures: [], httpErrors: [], remoteRequests: [], checks: [], modes: [] };
    receipt.runs.push(run);
    let cdp, targetId;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }); assert.ok(response.ok);
      const page = await response.json(); targetId = page.id; cdp = new CdpClient(page.webSocketDebuggerUrl); await cdp.open();
      // 所有 listener 都在第一次 navigation 前註冊。
      cdp.on('Runtime.consoleAPICalled', ({ type, args = [] }) => run.console.push({ type, text: args.map(arg => arg.value ?? arg.description).join(' ') }));
      cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => run.pageErrors.push(exceptionDetails));
      cdp.on('Network.loadingFailed', event => run.networkFailures.push(event));
      cdp.on('Network.responseReceived', ({ response }) => { if (response.status >= 400) run.httpErrors.push({ url: response.url, status: response.status }); });
      cdp.on('Network.requestWillBeSent', ({ request }) => { if (/^https?:/u.test(request.url)) run.remoteRequests.push(request.url); });
      await Promise.all([cdp.send('Page.enable'), cdp.send('Runtime.enable'), cdp.send('Network.enable')]);
      await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      const evaluate = async expression => {
        const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        return result.result.value;
      };
      const settle = () => evaluate('new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(()=>ok(true))))');
      const pause = ms => evaluate(`new Promise(ok=>setTimeout(()=>ok(true),${ms}))`);
      const navigate = async path => {
        const result = await cdp.send('Page.navigate', { url: pathToFileURL(path).href });
        if (result.errorText) throw new Error(result.errorText);
        for (let i = 0; i < 100; i++) {
          if (await evaluate('document.readyState==="complete" && !!window.PPTSKILLEditor')) break;
          if (i === 99) throw new Error('頁面載入逾時。');
          await new Promise(ok => setTimeout(ok, 50));
        }
        await evaluate('(async()=>{await document.fonts.ready;await new Promise(ok=>setTimeout(ok,1400));return true})()');
      };
      const position = async (css, fx = 0.5, fy = 0.5) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(css)});if(!e)throw new Error('找不到 pointer target');const r=e.getBoundingClientRect();return{x:r.x+r.width*${fx},y:r.y+r.height*${fy}}})()`);
      const mouse = (type, point, held = false) => cdp.send('Input.dispatchMouseEvent', { type, x: point.x, y: point.y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: held ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 });
      const click = async css => { const p = await position(css); await mouse('mousePressed', p, true); await mouse('mouseReleased', p); await settle(); };
      const canonicalRect = css => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(css)}),s=e.closest('.slide').getBoundingClientRect(),r=e.getBoundingClientRect(),k=s.width/1600;return{x:(r.x-s.x)/k,y:(r.y-s.y)/k,width:r.width/k,height:r.height/k}})()`);
      const assertRect = async (css, expected) => { const actual = await canonicalRect(css); for (const key of Object.keys(expected)) assert.ok(Math.abs(actual[key] - expected[key]) < 1, `${css} ${key}: ${actual[key]} != ${expected[key]}`); };
      const getSpec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
      const box = spec => spec.slides[0].composition.geometryOverrides['portable-quote'];
      const operate = (operation, value) => evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify({ operation, target, value })})`);
      const startGesture = async (kind, dx, dy) => {
        const scale = width / 1600, p = await position(kind === 'resize' ? '.moveable-se' : selector, kind === 'resize' ? 0.5 : 0.04);
        await mouse('mouseMoved', p); await mouse('mousePressed', p, true);
        for (let step = 1; step <= 6; step++) await mouse('mouseMoved', { x: p.x + dx * scale * step / 6, y: p.y + dy * scale * step / 6 }, true);
        await settle(); return { x: p.x + dx * scale, y: p.y + dy * scale };
      };
      const endGesture = async point => { await mouse('mouseReleased', point); await settle(); };

      for (const mode of ['normal', 'reduced', 'static']) {
        let staticScript;
        const modeResult = { mode, checks: [] }; run.modes.push(modeResult);
        try {
          await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: mode === 'reduced' ? 'reduce' : 'no-preference' }] });
          if (mode === 'static') staticScript = (await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__PPTSKILL_FORCE_STATIC__=true;' })).identifier;
          await navigate(sourcePath);

          const motion = () => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),c=getComputedStyle(e),sub=document.querySelector(${JSON.stringify(subtitle)}),after=getComputedStyle(sub,'::after');return{transform:c.transform,opacity:c.opacity,inline:e.style.transform,subtitleAfter:after.transform,root:e.closest('.slide').className}})()`);
          if (mode === 'normal') {
            await evaluate(`document.querySelector(${JSON.stringify(selector)}).closest('.slide').classList.remove('is-visible')`); await pause(1500);
            const start = await motion(); assert.equal(identity(start.transform), false); assert.equal(start.opacity, '0');
            await evaluate('window.PPTSKILLMotion.replaySlide("portable")'); await pause(1500);
            const end = await motion(); assert.ok(identity(end.transform)); assert.equal(end.opacity, '1'); assert.equal(end.inline, '');
            modeResult.motion = { start, end }; modeResult.checks.push('normal motion 起點非 identity、終點回 resting state');
          } else {
            const state = await motion(); assert.ok(identity(state.transform)); assert.equal(state.opacity, '1'); assert.equal(state.inline, ''); assert.ok(identity(state.subtitleAfter));
            modeResult.motion = state; modeResult.checks.push(`${mode} presentation 與 subtitle ::after 保持 static resting state`);
          }

          await operate('resize-element', { width: base.width, height: base.height });
          await operate('move-element', { x: base.x, y: base.y });
          await click('[data-action=layout]');
          await click('[data-action=snap-layout]');
          await click(selector);
          assert.equal(await evaluate('document.querySelectorAll("[data-pptskill-editor-chrome=geometry-target]").length'), 1);
          const geometryTarget = '[data-pptskill-editor-chrome="geometry-target"]';
          await assertRect(selector, base); await assertRect(geometryTarget, base);
          const handle = await evaluate(`(()=>{const slide=document.querySelector('.slide[data-slide-id="portable"]').getBoundingClientRect(),proxy=document.querySelector(${JSON.stringify(geometryTarget)}).getBoundingClientRect(),e=document.querySelector('.moveable-se'),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),k=slide.width/1600,control=e.closest('.moveable-control-box');return{proxy:{x:(proxy.x-slide.x)/k,y:(proxy.y-slide.y)/k,width:proxy.width/k,height:proxy.height/k},center:{x:(r.x+r.width/2-slide.x)/k,y:(r.y+r.height/2-slide.y)/k},visibility:getComputedStyle(e).visibility,hitHandle:!!hit?.closest('.moveable-se'),controlTransform:getComputedStyle(control).transform}})()`);
          assert.equal(handle.visibility, 'visible'); assert.equal(handle.hitHandle, true); assert.equal(identity(handle.controlTransform), false);
          assert.ok(Math.abs(handle.center.x - (base.x + base.width)) < 2); assert.ok(Math.abs(handle.center.y - (base.y + base.height)) < 2);
          modeResult.handle = handle; modeResult.checks.push('canonical proxy、SE handle 與 editor transform 定位一致');

          let before = await getSpec(), pointer = await startGesture('drag', 10, 10);
          assert.deepEqual(await getSpec(), before); await assertRect(selector, dragged); await assertRect(geometryTarget, dragged);
          await endGesture(pointer); assert.deepEqual(box(await getSpec()), dragged); await assertRect(selector, dragged);
          modeResult.checks.push('真 drag preview 不寫 spec、release 後 canonical snap 提交');

          before = await getSpec(); pointer = await startGesture('resize', -10, -10);
          assert.deepEqual(await getSpec(), before); await assertRect(selector, resized); await assertRect(geometryTarget, resized);
          await endGesture(pointer); assert.deepEqual(box(await getSpec()), resized); await assertRect(selector, resized);
          modeResult.checks.push('真 SE resize preview 不寫 spec、release 固定左上角並提交 right/bottom snap');

          const finalMotion = await motion(); assert.ok(identity(finalMotion.transform)); assert.equal(finalMotion.opacity, '1'); assert.equal(finalMotion.inline, '');
          if (mode !== 'normal') assert.ok(identity(finalMotion.subtitleAfter));
          const exported = await evaluate('window.PPTSKILLEditor.exportHtml()'); assert.deepEqual(extractDeckSpec(exported), await getSpec());
          const leak = await evaluate(`(()=>{const d=new DOMParser().parseFromString(${JSON.stringify(exported)},'text/html');return d.querySelectorAll('[data-pptskill-editor-chrome],.moveable-control-box,[data-editor-selected]').length})()`); assert.equal(leak, 0);
          const reopened = resolve(outputDir, `${width}-${mode}-export.html`); await writeFile(reopened, exported);
          await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
          await navigate(reopened); assert.deepEqual(box(await getSpec()), resized); await assertRect(selector, resized);
          assert.equal(await evaluate('document.querySelectorAll("[data-pptskill-editor-chrome=geometry-target],.moveable-control-box").length'), 0);
          assert.equal(await evaluate('document.querySelector("[data-action=snap-layout]").getAttribute("aria-pressed")'), 'false');
          await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
          modeResult.checks.push('export/reopen 無 editor chrome/proxy，geometry 保持且 snap reset off');
        } finally {
          if (staticScript) await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: staticScript });
          await cdp.send('Emulation.setEmulatedMedia', { features: [] });
          await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }).catch(() => {});
        }
      }
      run.traceback = await evaluate('document.body.innerText.includes("Traceback")'); assert.equal(run.traceback, false);
      for (const key of ['console', 'pageErrors', 'networkFailures', 'httpErrors', 'remoteRequests']) assert.deepEqual(run[key], [], key);
      run.status = 'pass';
    } catch (error) { run.status = 'fail'; run.error = error.stack; throw error; }
    finally {
      cdp?.close();
      if (targetId) { const closed = await fetch(`http://127.0.0.1:${port}/json/close/${targetId}`); run.targetClosed = closed.ok; }
      await writeFile(resolve(outputDir, 'acceptance.json'), JSON.stringify(receipt, null, 2) + '\n');
    }
  }
  receipt.status = 'pass';
} catch (error) { receipt.status = 'fail'; receipt.error = error.stack; process.exitCode = 1; }
finally { await writeFile(resolve(outputDir, 'acceptance.json'), JSON.stringify(receipt, null, 2) + '\n'); }

console.log(JSON.stringify({ status: receipt.status, receipt: resolve(outputDir, 'acceptance.json') }));
