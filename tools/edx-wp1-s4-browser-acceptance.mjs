import { runInsertTextUIBrowserCases } from './edx-wp2-s15-browser-cases.mjs';
import { runEditTextComponentBrowserCases } from './edx-wp2-s14-browser-cases.mjs';
import { runInsertTextBrowserCases } from './edx-wp2-s13-browser-cases.mjs';
import { runImagePasteBrowserCases } from './edx-wp2-s12-browser-cases.mjs';
import { runImageDropBrowserCases } from './edx-wp2-s11-browser-cases.mjs';
import { runInsertImageUIBrowserCases } from './edx-wp2-s10-browser-cases.mjs';
import { runInsertImageFileBrowserCases } from './edx-wp2-s9-browser-cases.mjs';
import { runInsertImageBrowserCases } from './edx-wp2-s8-browser-cases.mjs';
import { runImageFitBrowserCases } from './edx-wp2-s7-browser-cases.mjs';
import { runSelectedImageBrowserCases } from './edx-wp2-s6-browser-cases.mjs';
import { addAssetReplacementFixture, runAssetReplacementBrowserCases } from './edx-wp2-s4-browser-cases.mjs';
import { runTargetedImageFileBrowserCases } from './edx-wp2-s5-browser-cases.mjs';
import { runStyleCopyBrowserCases } from './edx-wp2-s3-browser-cases.mjs';
import { runTypographyBrowserCases } from './edx-wp2-s2-browser-cases.mjs';
import { runSnapBrowserCases } from './edx-wp1-s7-browser-cases.mjs';
import { runSelectionBrowserCases } from './edx-wp1-s8-browser-cases.mjs';
import { runAlignmentBrowserCases } from './edx-wp1-s9-browser-cases.mjs';
import { runDistributionBrowserCases } from './edx-wp1-s10-browser-cases.mjs';
import { runEqualGapBrowserCases } from './edx-wp1-s11-browser-cases.mjs';
import { runDirectTextBrowserCases } from './edx-wp2-s1-browser-cases.mjs';
import { runKeyboardBrowserCases } from './edx-wp1-s5-browser-cases.mjs';
import { runMotionBrowserCases } from './edx-wp1-s3-motion-browser-cases.mjs';
import assert from 'node:assert/strict';
import { runPerfBrowserCases } from './edx-wp1-s4-perf-browser-cases.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { extractDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

// 僅 attach Mainline owned browser；絕不 spawn，finally 只清自己的 target。
const outputDir = resolve(process.argv[2] || (process.argv.includes('--perf-regression') ? 'evidence/edx-wp1-s4-perf/worker-browser' : 'evidence/edx-wp1-s4/browser'));
const fixtureOnly = process.argv.includes('--fixture-only');
const perfRegression = process.argv.includes('--perf-regression');
const portFile = process.env.PPTSKILL_DEVTOOLS_ACTIVE_PORT;
if (!fixtureOnly && !portFile) throw new Error('必須提供 PPTSKILL_DEVTOOLS_ACTIVE_PORT；本工具不啟動 browser。');
await mkdir(outputDir, { recursive: true });
const input = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
input.slides = input.slides.filter(slide => slide.id === 'portable');
input.slides[0].content.components[0].text = '座標保持一致';
if (perfRegression) input.slides[0].content.components.push({ id: 'perf-image', type: 'image', alt: '成本回歸圖片', dataUri: 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>').toString('base64') });
if (process.argv.includes('--typography-regression') || process.argv.includes('--style-copy-regression')) {
  input.slides[0].composition.motion = { effect: 'underline-sweep', role: 'text', replay: 'slide-visible', staggerMs: 90, targets: [{ ref: 'content.title' }, { ref: 'content.subtitle' }] };
  const other = structuredClone(input.slides[0]); other.id = 'typography-other'; input.slides.push(other);
}
if (process.argv.includes('--insert-text-ui-regression') || process.argv.includes('--insert-image-ui-regression') || process.argv.includes('--image-drop-regression') || process.argv.includes('--image-paste-regression')) {
  const empty = structuredClone(input.slides[0]); empty.id = 'insert-empty';
  empty.content.components = [];
  empty.composition = { primitive: 'title-points', variant: 'default', slots: { title: 'content.title', subtitle: 'content.subtitle', points: 'content.keyPoints' } };
  input.slides.push(empty);
}
if (process.argv.includes('--insert-text-ui-regression') || process.argv.includes('--asset-replacement-regression') || process.argv.includes('--targeted-image-file-regression') || process.argv.includes('--selected-image-regression') || process.argv.includes('--image-fit-regression') || (process.argv.includes('--insert-image-regression') || (process.argv.includes('--insert-text-regression') || process.argv.includes('--edit-text-component-regression'))) || process.argv.includes('--insert-image-file-regression') || process.argv.includes('--insert-image-ui-regression') || process.argv.includes('--image-drop-regression') || process.argv.includes('--image-paste-regression')) addAssetReplacementFixture(input);
const rendered = renderFullDeck(input); assert.equal(rendered.status, 'pass');
const sourcePath = resolve(outputDir, 'source.html');
await writeFile(sourcePath, rendered.html);
if (fixtureOnly) { console.log(JSON.stringify({ sourcePath, sourceBytes: Buffer.byteLength(rendered.html) })); process.exit(0); }

class CdpClient {
  constructor(url) { this.socket = new WebSocket(url); this.nextId = 1; this.pending = new Map(); this.listeners = new Map(); }
  async open() {
    await new Promise((ok, fail) => { this.socket.addEventListener('open', ok, { once: true }); this.socket.addEventListener('error', fail, { once: true }); });
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.method) { for (const listener of this.listeners.get(message.method) || []) listener(message.params || {}); return; }
      const pending = this.pending.get(message.id); if (!pending) return;
      this.pending.delete(message.id); clearTimeout(pending.timer);
      if (message.error) pending.fail(new Error(message.error.message)); else pending.ok(message.result);
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((ok, fail) => {
      const timer = setTimeout(() => { this.pending.delete(id); fail(new Error('CDP 逾時：' + method)); }, 15000);
      this.pending.set(id, { ok, fail, timer }); this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, listener) { this.listeners.set(method, [...(this.listeners.get(method) || []), listener]); }
  close() { for (const p of this.pending.values()) clearTimeout(p.timer); this.socket.close(); }
}
const port = Number((await readFile(portFile, 'utf8')).trim().split('\n')[0]);
assert.ok(Number.isInteger(port) && port > 0 && port <= 65535);
const selector = '.slide[data-slide-id="portable"] [data-pptskill-element-id="component-portable-quote"]';
const specExpression = 'window.PPTSKILLEditor.getDeckSpec()';
const rectExpression = `${specExpression}.slides[0].composition.geometryOverrides?.['portable-quote']`;
const receipt = { status: 'running', sourcePath, sourceSha256: createHash('sha256').update(rendered.html).digest('hex'), runs: [] };
try {
  for (const [width, height] of [[1280, 720], [1600, 900]]) {
    const run = { width, height, status: 'running', console: [], pageErrors: [], networkFailures: [], httpErrors: [], remoteRequests: [], checks: [], artifacts: [] };
    receipt.runs.push(run);
    let cdp, targetId;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }); assert.ok(response.ok);
      const page = await response.json(); targetId = page.id; cdp = new CdpClient(page.webSocketDebuggerUrl); await cdp.open();
      // listeners 必須早於 navigation。
      cdp.on('Runtime.consoleAPICalled', ({ type, args = [] }) => run.console.push({ type, text: args.map(a => a.value ?? a.description).join(' ') }));
      cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => run.pageErrors.push(exceptionDetails));
      cdp.on('Network.loadingFailed', event => run.networkFailures.push(event));
      cdp.on('Network.responseReceived', ({ response }) => { if (response.status >= 400) run.httpErrors.push(response); });
      cdp.on('Network.requestWillBeSent', ({ request }) => { if (/^https?:/.test(request.url)) run.remoteRequests.push(request.url); });
      await Promise.all([cdp.send('Page.enable'), cdp.send('Runtime.enable'), cdp.send('Network.enable')]);
      await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      const evaluate = async expression => {
        const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        return result.result.value;
      };
      const settle = () => evaluate('new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(()=>ok(true))))');
      const navigate = async path => {
        const result = await cdp.send('Page.navigate', { url: pathToFileURL(path).href });
        if (result.errorText) throw new Error(result.errorText);
        for (let i = 0; i < 100; i++) {
          if (await evaluate('document.readyState==="complete" && !!window.PPTSKILLEditor')) break;
          if (i === 99) throw new Error('頁面載入逾時');
          await new Promise(ok => setTimeout(ok, 50));
        }
        await evaluate('(async()=>{await document.fonts.ready;await new Promise(ok=>setTimeout(ok,1400));return true})()');
      };
      const position = async (css, fx = 0.5, fy = 0.5) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(css)});if(!e)throw new Error('找不到 pointer target');const r=e.getBoundingClientRect();return{x:r.x+r.width*${fx},y:r.y+r.height*${fy},width:r.width,height:r.height}})()`);
      const mouse = (type, p, held = false) => cdp.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: held ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 });
      const click = async css => { const p = await position(css); await mouse('mousePressed', p, true); await mouse('mouseReleased', p); await settle(); };
      const startGesture = async (kind, dx, dy) => {
        const scale = width / 1600;
        const p = await position(kind === 'resize' ? '.moveable-se' : selector, kind === 'resize' ? 0.5 : 0.04);
        await mouse('mouseMoved', p); await mouse('mousePressed', p, true);
        for (let step = 1; step <= 6; step++) await mouse('mouseMoved', { x: p.x + dx * scale * step / 6, y: p.y + dy * scale * step / 6 }, true);
        await settle(); return { x: p.x + dx * scale, y: p.y + dy * scale };
      };
      const endGesture = async p => { await mouse('mouseReleased', p); await settle(); };
      const measure = () => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),s=e.closest('.slide').getBoundingClientRect(),r=e.getBoundingClientRect(),k=s.width/1600;return{x:(r.x-s.x)/k,y:(r.y-s.y)/k,width:r.width/k,height:r.height/k}})()`);
      const assertRect = async expected => { const actual = await measure(); for (const k of Object.keys(expected)) assert.ok(Math.abs(actual[k] - expected[k]) < 1, `${k}: ${actual[k]} != ${expected[k]}`); };
      const assertExport = async (label, expectedSpec) => {
        const html = await evaluate('window.PPTSKILLEditor.exportHtml()');
        assert.deepEqual(extractDeckSpec(html), expectedSpec, label + ' spec');
        // 直接檢查真正 export DOM；沿既有 authority 移除 transient，style 雙側使用 CSSOM 序列化；仍保留全部 declaration／priority／順序。
        const expectedHtml = renderFullDeck(expectedSpec).html;
        const check = await evaluate(`(()=>{
          const actual=new DOMParser().parseFromString(${JSON.stringify(html)},'text/html'),expected=new DOMParser().parseFromString(${JSON.stringify(expectedHtml)},'text/html');
          const ids=[...document.querySelectorAll('.moveable-control-box[data-styled-id],.selecto-selection[data-styled-id]')].map(n=>n.getAttribute('data-styled-id'));
          const normalize=slide=>{const clone=slide.cloneNode(true);clone.classList.remove('is-visible','motion-resetting');for(const node of [clone,...clone.querySelectorAll('*')]){if(node.hasAttribute('style'))node.setAttribute('style',node.style.cssText);for(const a of [...node.attributes])if(a.name==='contenteditable'||a.name==='data-editor-selected'||/^data-(motion-state|animation-starts|animation-finishes|replay-count)$/.test(a.name))node.removeAttribute(a.name);if(node.matches('[data-pptskill-background-layer]')){node.replaceChildren();node.removeAttribute('style');node.dataset.backgroundState='static'}if(node.matches('number-flow[data-pptskill-odometer]')){node.replaceChildren(document.createTextNode(node.dataset.finalDisplay||''));node.removeAttribute('aria-label')}}return clone.outerHTML};
          return{canonical:normalize(actual.querySelector('.slide'))===normalize(expected.querySelector('.slide')),chrome:actual.querySelectorAll('[data-pptskill-editor-chrome],.moveable-control-box,.selecto-selection,[data-editor-selected]').length,styles:[...actual.querySelectorAll('style[data-styled-id]')].filter(n=>ids.includes(n.getAttribute('data-styled-id'))).length,mode:actual.body.dataset.editorMode};
        })()`);
        assert.deepEqual(check, { canonical: true, chrome: 0, styles: 0, mode: 'play' }, label + ' DOM');
        const path = resolve(outputDir, `${width}-${label}.html`); await writeFile(path, html);
        run.artifacts.push({ label, path, bytes: Buffer.byteLength(html), sha256: createHash('sha256').update(html).digest('hex') });
        return path;
      };
      await navigate(sourcePath);
      const legacy = await evaluate(specExpression);
      await click('[data-action="layout"]'); await click(selector);
      assert.deepEqual(await evaluate(specExpression), legacy); assert.equal(await evaluate('document.querySelectorAll(".moveable-control-box").length'), 0);
      await assertExport('legacy-selected', legacy); run.checks.push('mode／single click 不寫 geometry');
      await click('[data-action="initialize-layout"]');
      let box = { x: 800, y: 280, width: 640, height: 480 };
      assert.deepEqual(await evaluate(rectExpression), box); await assertRect(box);
      assert.equal(await evaluate('document.querySelectorAll(".moveable-control-box").length'), 1);
      assert.ok(await evaluate('!!document.querySelector(".moveable-control-box[data-styled-id]")'));
      run.checks.push('legacy 明示預設初始化／真 vendor handle');
      const initialized = await evaluate(specExpression);
      let pointer = await startGesture('drag', 40, 20);
      assert.deepEqual(await evaluate(specExpression), initialized); await assertRect({ ...box, x: 840, y: 300 });
      await assertExport('preview-export', initialized);
      await endGesture(pointer); box = { ...box, x: 840, y: 300 };
      assert.deepEqual(await evaluate(rectExpression), box); await assertRect(box); run.checks.push('真 drag／preview export 只保留 committed DOM');
      pointer = await startGesture('resize', -40, -80); await endGesture(pointer); box = { ...box, width: 600, height: 400 };
      assert.deepEqual(await evaluate(rectExpression), box); await assertRect(box); run.checks.push('真 SE resize 不改 x/y');
      const committed = await evaluate(specExpression);
      pointer = await startGesture('drag', 20, 20);
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await endGesture(pointer); await assertRect(box); await assertExport('cancel', committed); run.checks.push('Escape 真 pointer cancel 原子復原');
      await click(selector); const noop = await position(selector); await mouse('mousePressed', noop, true); await mouse('mouseReleased', noop); await settle();
      await assertExport('noop', committed); await assertRect(box); run.checks.push('no-op');
      pointer = await startGesture('drag', -800, 0); await endGesture(pointer);
      await assertExport('invalid', committed); await assertRect(box);
      assert.match(await evaluate('document.querySelector("[data-editor-status]").textContent'), /未套用/);
      pointer = await startGesture('resize', -550, 0); await endGesture(pointer);
      await assertExport('invalid-resize', committed); await assertRect(box); run.checks.push('越界／minimum 拒絕，無 clamp');
      await click('[data-action="layout"]');
      assert.equal(await evaluate('document.querySelectorAll(".moveable-control-box,[data-pptskill-editor-chrome]").length'), 0);
      pointer = await startGesture('drag', 20, 20); await endGesture(pointer); await assertRect(box);
      await assertExport('play-mode', committed); run.checks.push('退出模式 teardown／play 不 drag');
      await click('[data-action="layout"]'); await click(selector);
      const exported = await assertExport('export', committed);
      await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
      await navigate(exported); await assertRect(box);
      assert.equal(await evaluate('document.querySelectorAll(".moveable-control-box,style[data-styled-id]").length'), 0);
      await click('[data-action="layout"]'); await click(selector);
      assert.equal(await evaluate('document.querySelectorAll(".moveable-control-box").length'), 1);
      pointer = await startGesture('drag', 10, 10); await endGesture(pointer); box = { ...box, x: 850, y: 310 };
      assert.deepEqual(await evaluate(rectExpression), box); await assertRect(box);
      await assertExport('reopen-export', await evaluate(specExpression)); run.checks.push('offline reopen 再 drag／單一 instance');
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }); await writeFile(resolve(outputDir, `${width}-selected.png`), Buffer.from(shot.data, 'base64'));
      if (perfRegression) await runPerfBrowserCases({ evaluate, navigate, sourcePath, click, selector, startGesture, endGesture, assertExport, run });
      await click('[data-action="edit"]');
      assert.equal(await evaluate('document.querySelectorAll(".moveable-control-box").length'), 0);
      assert.equal(await evaluate('document.querySelector("[data-edit-kind=text]").contentEditable'), 'true');
      run.checks.push('文字模式互斥');
      if (process.argv.includes('--keyboard-regression')) await runKeyboardBrowserCases({ cdp, evaluate, navigate, sourcePath, selector, run, click, startGesture, endGesture, assertExport, assertRect });
      if (process.argv.includes('--motion-regression')) await runMotionBrowserCases({ cdp, evaluate, navigate, outputDir, width, selector, run, click, startGesture, endGesture });
      if (process.argv.includes('--snap-regression')) await runSnapBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, selector, run, click, position, mouse, settle, startGesture, endGesture, assertExport, assertRect });
      if (process.argv.includes('--selection-regression')) await runSelectionBrowserCases({ cdp, evaluate, navigate, outputDir, width, run, click, position, settle, assertExport });
      if (process.argv.includes('--alignment-regression')) await runAlignmentBrowserCases({ cdp, evaluate, navigate, outputDir, width, run, click, position, settle, assertExport });
      if (process.argv.includes('--distribution-regression')) await runDistributionBrowserCases({ cdp, evaluate, navigate, outputDir, width, run, click, position, settle, assertExport });
      if (process.argv.includes('--equal-gap-regression')) await runEqualGapBrowserCases({ cdp, evaluate, navigate, outputDir, width, run, click, position, settle, assertExport });
      if (process.argv.includes('--direct-text-regression')) await runDirectTextBrowserCases({ cdp, evaluate, navigate, sourcePath, width, run, position, settle, assertExport });
      if (process.argv.includes('--style-copy-regression')) await runStyleCopyBrowserCases({ cdp, evaluate, navigate, sourcePath, width, run, click, position, settle, assertExport });
      if (process.argv.includes('--typography-regression')) await runTypographyBrowserCases({ cdp, evaluate, navigate, sourcePath, width, run, click, position, settle, assertExport });
      if (process.argv.includes('--asset-replacement-regression')) await runAssetReplacementBrowserCases({ cdp, evaluate, navigate, sourcePath, run, assertExport });
      if (process.argv.includes('--targeted-image-file-regression')) await runTargetedImageFileBrowserCases({ cdp, evaluate, navigate, sourcePath, run, assertExport });
      if ((process.argv.includes('--insert-image-regression') || (process.argv.includes('--insert-text-regression') || process.argv.includes('--edit-text-component-regression')))) await runInsertImageBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport });
      if ((process.argv.includes('--insert-text-regression') || process.argv.includes('--edit-text-component-regression'))) await runInsertTextBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport });
      if (process.argv.includes('--edit-text-component-regression')) await runEditTextComponentBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport });
      if (process.argv.includes('--insert-image-file-regression')) await runInsertImageFileBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport });
      if (process.argv.includes('--image-fit-regression')) await runImageFitBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport });
      if (process.argv.includes('--selected-image-regression')) await runSelectedImageBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport });
      if (process.argv.includes('--insert-image-ui-regression') || process.argv.includes('--image-drop-regression') || process.argv.includes('--image-paste-regression')) await runInsertImageUIBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport, startGesture });
      if (process.argv.includes('--image-drop-regression') || process.argv.includes('--image-paste-regression')) await runImageDropBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport, startGesture });
      if (process.argv.includes('--image-paste-regression')) await runImagePasteBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport, startGesture });
      if (process.argv.includes('--insert-text-ui-regression')) await runInsertTextUIBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport, startGesture });
      run.traceback = await evaluate('document.body.innerText.includes("Traceback")'); assert.equal(run.traceback, false);
      for (const key of ['console', 'pageErrors', 'networkFailures', 'httpErrors', 'remoteRequests']) assert.deepEqual(run[key], [], key);
      run.status = 'pass';
    } catch (error) { run.status = 'fail'; run.error = error.stack; throw error; }
    finally {
      cdp?.close();
      if (targetId) { const closed = await fetch(`http://127.0.0.1:${port}/json/close/${targetId}`); run.targetClosed = closed.ok; assert.ok(closed.ok, 'owned target 清理失敗'); }
      await writeFile(resolve(outputDir, 'acceptance.json'), JSON.stringify(receipt, null, 2) + '\n');
    }
  }
  receipt.status = 'pass';
} catch (error) { receipt.status = 'fail'; receipt.error = error.stack; process.exitCode = 1; }
finally { await writeFile(resolve(outputDir, 'acceptance.json'), JSON.stringify(receipt, null, 2) + '\n'); }
console.log(JSON.stringify({ status: receipt.status, receipt: resolve(outputDir, 'acceptance.json') }));
