import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

const args = process.argv.slice(2), outputIndex = args.indexOf('--output');
const output = resolve(outputIndex >= 0 ? args[outputIndex + 1] : 'evidence/pgq-wp3-s3/browser-acceptance.json');
const effects = ['waves', 'birds', 'net', 'globe', 'dots', 'fog', 'clouds', 'cells', 'ripple', 'rings', 'halo'];
const speedEffects = new Set(['waves', 'birds', 'fog', 'clouds', 'cells', 'ripple', 'halo']);
const style = { id: 'browser-dark', name: 'Browser dark', layout: { primaryMove: 'editorial-rail', compositionLanguage: 'editorial' }, density: 'medium', typography: { display: 'Arial', body: 'Arial', mono: 'Menlo' }, palette: { canvas: '#121827', text: '#f6f7fb', muted: '#b7c0d6', accent: '#93c5fd', surface: '#1f2937' }, spacing: { unit: 8, slidePadding: 64 }, geometry: { radius: 8, borderWidth: 1 }, motion: { personality: 'corporate', durationMs: 320, easing: 'ease-out', reducedMotion: true }, assetTreatment: 'content-led' };
const makeDeck = effect => ({ schemaVersion: '1.0', deckId: `browser-${effect}`, title: effect, language: 'zh-Hant', style, slides: [{ id: 'opening', content: { title: `${effect} runtime`, subtitle: 'Offline browser acceptance', keyPoints: ['Lifecycle', 'Fallback', 'Export'], components: [] }, composition: { primitive: 'cover', variant: 'default', slots: { title: 'content.title', subtitle: 'content.subtitle' }, backgroundEffect: { effect, intensity: 'medium', ...(speedEffects.has(effect) ? { speed: 'normal' } : {}), palette: 'style' } } }] });
const temporary = await mkdtemp(`${tmpdir()}/pptskill-background-acceptance-`);
for (const effect of effects) {
  const rendered = renderFullDeck(makeDeck(effect));
  if (rendered.status !== 'pass') throw new Error(rendered.errors.join(' '));
  await writeFile(resolve(temporary, `${effect}.html`), rendered.html);
}
const lightDeck = makeDeck('waves');
lightDeck.style = { ...style, id: 'browser-light', palette: { canvas: '#f8f1e6', text: '#211b16', muted: '#655b51', accent: '#a13d2d', surface: '#eadfce' } };
await writeFile(resolve(temporary, 'light-waves.html'), renderFullDeck(lightDeck).html);

class CdpClient {
  constructor(url) { this.socket = new WebSocket(url); this.nextId = 1; this.pending = new Map(); this.listeners = new Map(); }
  async open() { await new Promise((ok, fail) => { this.socket.addEventListener('open', ok, { once: true }); this.socket.addEventListener('error', fail, { once: true }); }); this.socket.addEventListener('message', ({ data }) => { const m = JSON.parse(data); if (m.method) { for (const fn of this.listeners.get(m.method) || []) fn(m.params || {}); return; } const p = this.pending.get(m.id); if (!p) return; this.pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }); }
  send(method, params = {}) { const id = this.nextId++; return new Promise((resolveSend, reject) => { this.pending.set(id, { resolve: resolveSend, reject }); this.socket.send(JSON.stringify({ id, method, params })); }); }
  on(method, fn) { if (!this.listeners.has(method)) this.listeners.set(method, []); this.listeners.get(method).push(fn); }
  close() { this.socket.close(); }
}
const delay = ms => new Promise(done => setTimeout(done, ms));
const candidates = [process.env.PPTSKILL_CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].filter(Boolean);
let chrome; for (const path of candidates) { try { await access(path); chrome = path; break; } catch {} }
if (!chrome) throw new Error('找不到 Chrome/Chromium。');
const profile = resolve(temporary, 'profile');
const browser = spawn(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--enable-webgl', '--use-angle=swiftshader', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1600,900', 'about:blank'], { stdio: 'ignore' });
try {
  let port; for (let i = 0; i < 60; i += 1) { try { port = Number((await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); if (port) break; } catch {} await delay(100); }
  if (!port) throw new Error('Chrome DevTools port 未就緒。');
  const page = (await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json())).find(({ type }) => type === 'page');
  const cdp = new CdpClient(page.webSocketDebuggerUrl); await cdp.open();
  const consoleMessages = [], pageErrors = [], network = [], networkFailures = [];
  cdp.on('Runtime.consoleAPICalled', ({ type, args: values = [] }) => consoleMessages.push({ type, text: values.map(v => v.value ?? v.description ?? '').join(' ') }));
  cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => pageErrors.push(exceptionDetails?.exception?.description || exceptionDetails?.text));
  cdp.on('Network.requestWillBeSent', ({ request }) => network.push(request.url));
  cdp.on('Network.loadingFailed', ({ errorText, canceled, type }) => networkFailures.push({ errorText, canceled: Boolean(canceled), type }));
  await Promise.all([cdp.send('Page.enable'), cdp.send('Runtime.enable'), cdp.send('Network.enable')]);
  const navigateFile = async file => { const loaded = new Promise(ok => cdp.on('Page.loadEventFired', ok)); await cdp.send('Page.navigate', { url: pathToFileURL(resolve(temporary, file)).href }); await loaded; await delay(650); };
  const navigate = effect => navigateFile(`${effect}.html`);
  const evaluate = async expression => (await cdp.send('Runtime.evaluate', { expression, returnByValue: true })).result.value;
  const results = [];
  for (const effect of effects) {
    await cdp.send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await navigate(effect);
    const first = await cdp.send('Page.captureScreenshot', { format: 'png' }); await delay(350); const second = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const firstHash = createHash('sha256').update(first.data, 'base64').digest('hex'), secondHash = createHash('sha256').update(second.data, 'base64').digest('hex');
    const before = await evaluate(`({state:document.querySelector('[data-pptskill-background-layer]').dataset.backgroundState,canvas:document.querySelectorAll('[data-pptskill-background-layer] canvas').length})`);
    const replay = await evaluate(`window.PPTSKILLBackground.replaySlide('opening')`); await delay(250);
    const afterReplay = await evaluate(`({state:document.querySelector('[data-pptskill-background-layer]').dataset.backgroundState,canvas:document.querySelectorAll('[data-pptskill-background-layer] canvas').length})`);
    const forced = await evaluate(`window.PPTSKILLBackground.forceStatic();({state:document.querySelector('[data-pptskill-background-layer]').dataset.backgroundState,canvas:document.querySelectorAll('[data-pptskill-background-layer] canvas').length})`);
    results.push({ effect, before, animatedPixels: firstHash !== secondHash, replay, afterReplay, forced });
  }
  await cdp.send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] }); await navigate('waves');
  await cdp.send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await delay(150);
  const reducedAfterRunning = await evaluate(`({state:document.querySelector('[data-pptskill-background-layer]').dataset.backgroundState,canvas:document.querySelectorAll('[data-pptskill-background-layer] canvas').length,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches})`);
  await cdp.send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await navigate('waves');
  const reduced = await evaluate(`({state:document.querySelector('[data-pptskill-background-layer]').dataset.backgroundState,canvas:document.querySelectorAll('[data-pptskill-background-layer] canvas').length})`);
  await cdp.send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] }); await navigate('waves');
  await evaluate(`document.querySelector('[data-action="duplicate"]').click()`); await delay(250);
  const duplicated = await evaluate(`({layers:document.querySelectorAll('[data-pptskill-background-layer]').length,canvases:document.querySelectorAll('[data-pptskill-background-layer] canvas').length,states:[...document.querySelectorAll('[data-pptskill-background-layer]')].map(x=>x.dataset.backgroundState)})`);
  await evaluate(`document.querySelector('[data-action="delete"]').click()`); await delay(650);
  const deleted = await evaluate(`({layers:document.querySelectorAll('[data-pptskill-background-layer]').length,canvases:document.querySelectorAll('[data-pptskill-background-layer] canvas').length})`);
  const exportCheck = await evaluate(`(()=>{const html=window.PPTSKILLEditor.exportHtml(),doc=new DOMParser().parseFromString(html,'text/html'),spec=JSON.parse(doc.querySelector('#deck-spec').textContent);return{canvas:doc.querySelectorAll('[data-pptskill-background-layer] canvas').length,state:doc.querySelector('[data-pptskill-background-layer]').dataset.backgroundState,effect:spec.slides[0].composition.backgroundEffect.effect,bytes:new Blob([html]).size}})()`);
  const exportedHtml = await evaluate(`window.PPTSKILLEditor.exportHtml()`);
  await writeFile(resolve(temporary, 'exported.html'), exportedHtml);
  await navigateFile('exported.html');
  const recipientReopen = await evaluate(`(()=>{const spec=JSON.parse(document.querySelector('#deck-spec').textContent),slides=[...document.querySelectorAll('.slide')],layers=[...document.querySelectorAll('[data-pptskill-background-layer]')];return{slideCount:slides.length,uniqueSlideIds:new Set(slides.map(slide=>slide.dataset.slideId)).size,layers:layers.length,canvases:layers.reduce((sum,layer)=>sum+layer.querySelectorAll('canvas').length,0),states:layers.map(layer=>layer.dataset.backgroundState),effect:spec.slides[0].composition.backgroundEffect.effect}})()`);
  const lightLoaded = new Promise(ok => cdp.on('Page.loadEventFired', ok)); await cdp.send('Page.navigate', { url: pathToFileURL(resolve(temporary, 'light-waves.html')).href }); await lightLoaded; await delay(650);
  const light = await evaluate(`(()=>{const slide=document.querySelector('.slide'),title=document.querySelector('h1'),layer=document.querySelector('[data-pptskill-background-layer]');return{state:layer.dataset.backgroundState,canvas:layer.querySelectorAll('canvas').length,titleColor:getComputedStyle(title).color,slideBackground:getComputedStyle(slide).backgroundColor}})()`);
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(String(type).startsWith('webgl'))return null;return original.call(this,type,...args)}})()` });
  await navigate('waves');
  const noWebgl = await evaluate(`({state:document.querySelector('[data-pptskill-background-layer]').dataset.backgroundState,canvas:document.querySelectorAll('[data-pptskill-background-layer] canvas').length})`);
  cdp.close();
  const externalNetwork = network.filter(url => !url.startsWith('file:'));
  const pass = results.every(r => r.before.state === 'running' && r.before.canvas === 1 && r.animatedPixels && r.replay === true && r.afterReplay.state === 'running' && r.afterReplay.canvas === 1 && r.forced.state === 'forced-static' && r.forced.canvas === 0) && reducedAfterRunning.reduced && reducedAfterRunning.state === 'reduced' && reducedAfterRunning.canvas === 0 && reduced.state === 'reduced' && reduced.canvas === 0 && duplicated.layers === 2 && duplicated.canvases === 2 && duplicated.states.every(state => state === 'running') && deleted.layers === 1 && deleted.canvases === 1 && recipientReopen.slideCount === 1 && recipientReopen.uniqueSlideIds === 1 && recipientReopen.layers === 1 && recipientReopen.canvases === 1 && recipientReopen.states.every(state => state === 'running') && recipientReopen.effect === 'waves' && light.state === 'running' && light.canvas === 1 && light.titleColor === 'rgb(33, 27, 22)' && noWebgl.state === 'webgl-unavailable' && noWebgl.canvas === 0 && exportCheck.canvas === 0 && exportCheck.state === 'static' && exportCheck.effect === 'waves' && consoleMessages.length === 0 && pageErrors.length === 0 && networkFailures.length === 0 && externalNetwork.length === 0;
  const receipt = { schemaVersion: '1.0', status: pass ? 'pass' : 'fail', results, reducedAfterRunning, reduced, duplicated, deleted, exportCheck, recipientReopen, light, noWebgl, console: consoleMessages, pageErrors, network, networkFailures, externalNetwork };
  await mkdir(dirname(output), { recursive: true }); await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`); console.log(JSON.stringify(receipt, null, 2)); if (!pass) process.exitCode = 1;
} finally { browser.kill('SIGTERM'); await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
