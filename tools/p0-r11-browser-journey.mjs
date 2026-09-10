import { createHash } from 'node:crypto';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceDeck = resolve(root, 'evidence/p0-r11/editor-export/editor-functional-source.html');
const exportedDeck = resolve(root, 'evidence/p0-r11/editor-export/final-exported-deck.html');
const output = resolve(root, 'evidence/p0-r11/editor-export/browser-journey.json');
const screenshotPath = resolve(root, 'evidence/p0-r11/editor-export/final-exported-deck.png');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const contentHashes = (spec) => Object.fromEntries(spec.slides.map((slide) => [slide.id, sha256(JSON.stringify(slide.content))]));

const candidates = [process.env.PPTSKILL_CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', 'google-chrome', 'chromium'].filter(Boolean);
let chromeBin;
for (const candidate of candidates) { try { if (candidate.includes('/')) await access(candidate); chromeBin = candidate; break; } catch {} }
if (!chromeBin) throw new Error('找不到 Chrome/Chromium。');

class Cdp {
  constructor(url) { this.ws = new WebSocket(url); this.id = 1; this.pending = new Map(); this.listeners = new Map(); }
  async open() { await new Promise((ok, fail) => { this.ws.addEventListener('open', ok, { once: true }); this.ws.addEventListener('error', fail, { once: true }); }); this.ws.addEventListener('message', ({ data }) => { const message = JSON.parse(data); if (message.method) { for (const listener of this.listeners.get(message.method) || []) listener(message.params || {}); return; } const pending = this.pending.get(message.id); if (!pending) return; this.pending.delete(message.id); message.error ? pending.fail(new Error(message.error.message)) : pending.ok(message.result); }); }
  send(method, params = {}) { const id = this.id++; return new Promise((ok, fail) => { this.pending.set(id, { ok, fail }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  on(name, listener) { this.listeners.set(name, [...(this.listeners.get(name) || []), listener]); }
  close() { this.ws.close(); }
}

const profile = await mkdtemp(`${tmpdir()}/pptskill-r11-browser-`);
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
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  const navigate = async (path) => { const loaded = new Promise((done) => cdp.on('Page.loadEventFired', done)); await cdp.send('Page.navigate', { url: pathToFileURL(path).href }); await Promise.race([loaded, new Promise((_, fail) => setTimeout(() => fail(new Error('頁面載入逾時。')), 8000))]); };
  const evaluate = async (expression) => { const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; };

  await navigate(sourceDeck);
  const browserResult = await evaluate(String.raw`(async()=>{
    await document.fonts.ready;
    if(!window.PPTSKILLEditor||!window.PPTSKILLAssets||!window.PPTSKILLSizeGuard)throw new Error('editor/export runtime 未啟動');
    const before=window.PPTSKILLEditor.getDeckSpec(),beforeIds=before.slides.map(x=>x.id),originalCount=before.slides.length;
    const click=s=>{const node=document.querySelector(s);if(!node)throw new Error('找不到 '+s);node.click();return node};
    click('.slide[data-slide-id="company-cover"]');click('[data-action="edit"]');const title=document.querySelector('[data-edit-target="slides.company-cover.content.title"]');title.textContent='讓策略更快轉成行動';title.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'動'}));click('[data-action="edit"]');
    click('.slide[data-slide-id="editor-text"]');click('[data-action="edit-component"]');const area=document.querySelector('[data-component-json]');const component=JSON.parse(area.value);component.text='已由直接元件編輯更新';area.value=JSON.stringify(component);click('[data-action="apply-component"]');
    click('.slide[data-slide-id="editor-image"]');const canvas=document.createElement('canvas');canvas.width=3000;canvas.height=1688;const context=canvas.getContext('2d');for(let y=0;y<1688;y+=80)for(let x=0;x<3000;x+=80){context.fillStyle='rgb('+((x+y)%255)+','+((x*3+y)%255)+','+((x+y*5)%255)+')';context.fillRect(x,y,80,80)}const blob=await new Promise((ok,fail)=>canvas.toBlob(value=>value?ok(value):fail(new Error('toBlob failed')),'image/jpeg',.95));const replacement=await window.PPTSKILLEditor.replaceImageFile(new File([blob],'replacement.jpg',{type:'image/jpeg'}));
    click('.slide[data-slide-id="company-agenda"]');click('[data-action="move-up"]');const orderAfterMove=window.PPTSKILLEditor.getDeckSpec().slides.map(x=>x.id);click('[data-action="duplicate"]');const duplicateId=window.PPTSKILLEditor.getDeckSpec().slides.find(x=>x.id.startsWith('company-agenda-copy-'))?.id;click('[data-action="delete"]');
    const after=window.PPTSKILLEditor.getDeckSpec();const prepared=window.PPTSKILLEditor.prepareExport();const hardLimitBefore=window.PPTSKILLSizeGuard.policy.deckHardLimitBytes;let downloadClicks=0;const originalClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){downloadClicks+=1};window.PPTSKILLSizeGuard.policy.deckHardLimitBytes=100;const hardLimitDownload=window.PPTSKILLEditor.download();window.PPTSKILLSizeGuard.policy.deckHardLimitBytes=hardLimitBefore;HTMLAnchorElement.prototype.click=originalClick;
    return {before,beforeIds,originalCount,after,orderAfterMove,duplicateId,replacement:{optimized:replacement.optimized,originalBytes:replacement.originalBytes,outputBytes:replacement.outputBytes,width:replacement.width,height:replacement.height,mime:replacement.mime},prepared:{status:prepared.status,report:prepared.report,html:prepared.html},hardLimit:{downloadResult:hardLimitDownload,downloadClicks}};
  })()`);
  await writeFile(exportedDeck, browserResult.prepared.html);
  delete browserResult.prepared.html;
  const beforeHashes = contentHashes(browserResult.before), afterHashes = contentHashes(browserResult.after);
  const changedContentSlides = Object.keys(beforeHashes).filter((id) => beforeHashes[id] !== afterHashes[id]);

  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0, connectionType: 'none' });
  await navigate(exportedDeck);
  const reopened = await evaluate(`(()=>{const spec=window.PPTSKILLEditor?.getDeckSpec();return{ready:Boolean(window.PPTSKILLEditor),slideCount:spec?.slides.length,title:spec?.slides.find(x=>x.id==='company-cover')?.content.title,componentText:spec?.slides.find(x=>x.id==='editor-text')?.content.components[0]?.text,imagePrefix:spec?.slides.find(x=>x.id==='editor-image')?.content.components[0]?.dataUri.slice(0,23),firstSlide:spec?.slides[0]?.id,size:window.PPTSKILLEditor?.getSizeReport(),externalUrls:[...document.querySelectorAll('[src],[href]')].map(x=>x.src||x.href).filter(x=>/^https?:/.test(x))}})()`);
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
  cdp.close();

  const exportedBytes = await readFile(exportedDeck);
  const forbidden = /不得外洩|hidden prompt|hidden transcript|\/Users\/private\/source\.pptx|private source body|private note|rejected draft/;
  const checks = {
    textEdit: reopened.title === '讓策略更快轉成行動',
    componentEdit: reopened.componentText === '已由直接元件編輯更新',
    imageReplacement: browserResult.replacement.optimized && reopened.imagePrefix.startsWith('data:image/jpeg;base64'),
    reorder: browserResult.orderAfterMove[0] === 'company-agenda' && reopened.firstSlide === 'company-agenda',
    duplicateDelete: Boolean(browserResult.duplicateId) && browserResult.after.slides.length === browserResult.originalCount,
    uniqueIds: new Set(browserResult.after.slides.map(({ id }) => id)).size === browserResult.after.slides.length,
    portableSize: ['pass','warn'].includes(browserResult.prepared.status) && browserResult.prepared.report.totalHtmlBytes === exportedBytes.byteLength,
    hardLimitNoArtifact: browserResult.hardLimit.downloadResult === false && browserResult.hardLimit.downloadClicks === 0,
    sanitizer: !forbidden.test(exportedBytes.toString('utf8')),
    offlineReopen: reopened.ready && reopened.slideCount === browserResult.originalCount && reopened.externalUrls.length === 0,
    targetedContentChanges: changedContentSlides.sort().join(',') === ['company-cover','editor-image','editor-text'].sort().join(','),
    runtimeClean: pageErrors.length === 0 && httpErrors.length === 0 && networkFailures.filter(({ canceled }) => !canceled).length === 0,
  };
  const receipt = { schemaVersion: '1.0', status: Object.values(checks).every(Boolean) ? 'pass' : 'fail', checks, interaction: { initialOrder: browserResult.beforeIds, orderAfterMove: browserResult.orderAfterMove, duplicateId: browserResult.duplicateId, finalOrder: browserResult.after.slides.map(({ id }) => id), changedContentSlides }, replacement: browserResult.replacement, exportReport: browserResult.prepared.report, reopened, diagnostics: { visibleTraceback: null, console: consoleMessages, pageErrors, networkFailures, httpErrors }, artifacts: { sourceDeck: 'editor-functional-source.html', exportedDeck: 'final-exported-deck.html', screenshot: 'final-exported-deck.png' } };
  await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
  if (receipt.status !== 'pass') process.exitCode = 1;
} finally {
  if (browser.exitCode === null) browser.kill('SIGTERM');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
