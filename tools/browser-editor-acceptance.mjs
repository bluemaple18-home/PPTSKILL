import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

const output = resolve(process.argv[2] || 'evidence/p0-r7/browser-editor-acceptance.json');
const exportedDeck = resolve(process.argv[3] || 'evidence/p0-r7/portable-edited-deck.html');
const fixture = JSON.parse(await readFile(resolve('fixtures/full-deck-spec.json'), 'utf8'));
fixture.profile = { customer: '不得外洩' };
fixture.localPath = '/Users/private/source.pdf';
fixture.prompt = 'hidden working prompt';
fixture.claims = [{
  id: 'conversion-uplift', kind: 'derived', summary: '轉換率提升 15 個百分點', slideIds: ['proof'], value: 15,
  metric: 'conversion-rate', period: '2026-Q2', population: 'all-users', unit: 'percentage-point',
  derivation: { operation: 'percentage-point-change', baseline: 0.2, current: 0.35, scale: 'ratio', prompt: '不得外洩' },
  sourceRefs: [{ id: 'public-report', label: '公開報告', url: 'https://example.com/report', public: true, sourceAvailableToRecipient: false, localPath: '/Users/private/report.xlsx' }],
}];
fixture.slides[5].notes = 'private notes';
fixture.slides[5].content.components = [{ id: 'portable-image', type: 'image', alt: '原始測試圖', fit: 'contain', dataUri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL6WQAAAABJRU5ErkJggg==' }];
fixture.slides[5].composition.slots.component = 'content.components.portable-image';
const rendered = renderFullDeck(fixture);
if (rendered.status !== 'pass') throw new Error(rendered.errors.join('\n'));
await mkdir(dirname(output), { recursive: true });
const sourceDeck = resolve(dirname(output), 'editor-acceptance-source.html');
await writeFile(sourceDeck, rendered.html);

const managedPortFile = process.env.PPTSKILL_DEVTOOLS_ACTIVE_PORT;
let chromeBin;
if (!managedPortFile) {
  const chromeCandidates = [
    process.env.PPTSKILL_CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'google-chrome',
    'chromium',
  ].filter(Boolean);
  for (const candidate of chromeCandidates) {
    try { if (candidate.includes('/')) await access(candidate); chromeBin = candidate; break; } catch {}
  }
  if (!chromeBin) throw new Error('找不到 Chrome/Chromium。');
}

class CdpClient {
  constructor(url) { this.socket = new WebSocket(url); this.nextId = 1; this.pending = new Map(); this.listeners = new Map(); }
  async open() {
    await new Promise((ok, fail) => { this.socket.addEventListener('open', ok, { once: true }); this.socket.addEventListener('error', fail, { once: true }); });
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.method) { for (const listener of this.listeners.get(message.method) || []) listener(message.params || {}); return; }
      const pending = this.pending.get(message.id); if (!pending) return; this.pending.delete(message.id);
      if (message.error) pending.fail(new Error(message.error.message)); else pending.ok(message.result);
    });
  }
  send(method, params = {}) { const id = this.nextId++; return new Promise((ok, fail) => { this.pending.set(id, { ok, fail }); this.socket.send(JSON.stringify({ id, method, params })); }); }
  on(method, listener) { this.listeners.set(method, [...(this.listeners.get(method) || []), listener]); }
  close() { this.socket.close(); }
}

const profile = managedPortFile ? null : await mkdtemp(`${tmpdir()}/pptskill-editor-`);
const browser = managedPortFile ? null : spawn(chromeBin, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
try {
  let port;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { port = Number((await readFile(managedPortFile || `${profile}/DevToolsActivePort`, 'utf8')).split('\n')[0]); if (port) break; } catch {}
    await new Promise((done) => setTimeout(done, 100));
  }
  if (!port) throw new Error('Chrome DevTools port 未就緒。');
  let page;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { page = (await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json())).find(({ type }) => type === 'page'); if (page) break; } catch {}
    await new Promise((done) => setTimeout(done, 100));
  }
  if (!page) throw new Error('Chrome page target 未就緒。');
  const cdp = new CdpClient(page.webSocketDebuggerUrl);
  await cdp.open();
  const consoleMessages = [], pageErrors = [], networkFailures = [], httpErrors = [];
  cdp.on('Runtime.consoleAPICalled', ({ type, args = [] }) => consoleMessages.push({ type, text: args.map(({ value, description }) => value ?? description ?? '').join(' ') }));
  cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => pageErrors.push({ text: exceptionDetails?.text, description: exceptionDetails?.exception?.description }));
  cdp.on('Network.loadingFailed', ({ requestId, errorText, canceled }) => networkFailures.push({ requestId, errorText, canceled }));
  cdp.on('Network.responseReceived', ({ response }) => { if (response?.status >= 400) httpErrors.push({ url: response.url, status: response.status }); });
  await Promise.all([cdp.send('Page.enable'), cdp.send('Runtime.enable'), cdp.send('Network.enable')]);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  const navigate = async (path) => {
    const loaded = new Promise((done) => cdp.on('Page.loadEventFired', done));
    await cdp.send('Page.navigate', { url: pathToFileURL(path).href });
    await Promise.race([loaded, new Promise((_, fail) => setTimeout(() => fail(new Error('頁面載入逾時。')), 5000))]);
  };
  const evaluate = async (expression) => {
    const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  await navigate(sourceDeck);
  const interaction = await evaluate(String.raw`(async()=>{
    await document.fonts.ready;
    if(!window.PPTSKILLEditor)throw new Error('editor runtime 未啟動');
    const click=a=>document.querySelector('[data-action="'+a+'"]').click();
    click('edit');
    const title=document.querySelector('[data-edit-target="slides.opening.content.title"]');
    title.textContent='瀏覽器直接編輯成功';
    click('edit');
    document.querySelector('.slide[data-slide-id="opening"]').click();
    window.PPTSKILLEditor.applyLocalPatch({slideId:'opening',region:'content.subtitle',value:'本機 AI 單區 patch 成功'});
    document.querySelector('.slide[data-slide-id="proof"]').click();
    click('duplicate');const afterDuplicate=document.querySelectorAll('.slide').length;
    click('delete');const afterDelete=document.querySelectorAll('.slide').length;
    click('move-down');click('move-up');
    document.querySelector('.slide[data-slide-id="evidence"]').click();
    let unsupportedChartRejection='';try{window.PPTSKILLEditor.applyLocalPatch({slideId:'evidence',region:'content.components.quality-bars',value:{chartType:'line'}})}catch(error){unsupportedChartRejection=error.message}
    const chartTypeAfterRejection=window.PPTSKILLEditor.getDeckSpec().slides.find(s=>s.id==='evidence').content.components.find(c=>c.id==='quality-bars').chartType;
    document.querySelector('.slide[data-slide-id="portable"]').click();
    const canvas=document.createElement('canvas');canvas.width=8;canvas.height=8;const context=canvas.getContext('2d');context.fillStyle='#2563eb';context.fillRect(0,0,8,8);const blob=await new Promise((ok,fail)=>canvas.toBlob(value=>value?ok(value):fail(new Error('WebP fixture 建立失敗。')),'image/webp',.9));
    const file=new File([blob],'replacement.webp',{type:'image/webp'}),transfer=new DataTransfer();transfer.items.add(file);
    const input=document.querySelector('#pptskill-image-input');Object.defineProperty(input,'files',{value:transfer.files,configurable:true});input.dispatchEvent(new Event('change',{bubbles:true}));
    let imageReplaced=false;for(let attempt=0;attempt<40;attempt+=1){imageReplaced=document.querySelector('.slide[data-slide-id="portable"] img').src.startsWith('data:image/webp');if(imageReplaced)break;await new Promise(done=>setTimeout(done,50))}
    const specBeforeExport=window.PPTSKILLEditor.getDeckSpec();
    const presentationSnapshot=doc=>({slideIds:[...doc.querySelectorAll('.slide')].map(el=>el.dataset.slideId),targets:[...doc.querySelectorAll('[data-edit-target]')].map(el=>[el.dataset.editTarget,el.textContent]).sort(([a],[b])=>a.localeCompare(b))});
    const presentationBeforeExport=presentationSnapshot(document);
    const chrome=document.createElement('div');chrome.dataset.pptskillEditorChrome='true';chrome.className='edx-marker-only';document.body.append(chrome);
    const moveable=document.createElement('div');moveable.className='moveable-control-box';document.body.append(moveable);
    const selecto=document.createElement('div');selecto.className='selecto-selection';document.body.append(selecto);
    const toolbar=document.createElement('div');toolbar.dataset.pptskillContextToolbar='true';document.body.append(toolbar);
    const chromeSelectors=['[data-pptskill-editor-chrome]','.moveable-control-box','.selecto-selection','[data-pptskill-context-toolbar]'];
    const liveChromeBefore=chromeSelectors.map(selector=>document.querySelectorAll(selector).length);
    const guardedSlide=document.querySelector('.slide[data-slide-id="portable"]');
    guardedSlide.dataset.pptskillEditorChrome='true';let misMarkError='';try{window.PPTSKILLEditor.exportHtml()}catch(error){misMarkError=error.message}delete guardedSlide.dataset.pptskillEditorChrome;
    const prepared=window.PPTSKILLEditor.prepareExport();
    const html=window.PPTSKILLEditor.exportHtml();
    const repeatHtml=window.PPTSKILLEditor.exportHtml();
    const inspect=source=>{const doc=new DOMParser().parseFromString(source,'text/html'),exportedSpec=JSON.parse(doc.querySelector('#deck-spec').textContent);return{chromeCounts:chromeSelectors.map(selector=>doc.querySelectorAll(selector).length),presentation:presentationSnapshot(doc),spec:exportedSpec}};
    const preparedExport=inspect(prepared.html),directExport=inspect(html),repeatExport=inspect(repeatHtml);
    const liveChromeAfter=chromeSelectors.map(selector=>document.querySelectorAll(selector).length);
    return {afterDuplicate,afterDelete,unsupportedChartRejection,chartTypeAfterRejection,imageReplaced,html,title:title.textContent,spec:window.PPTSKILLEditor.getDeckSpec(),specBeforeExport,presentationBeforeExport,presentationAfterExport:presentationSnapshot(document),liveChromeBefore,liveChromeAfter,misMarkError,preparedExport,directExport,repeatExport};
  })()`);
  await writeFile(exportedDeck, interaction.html);
  await navigate(exportedDeck);
  const reopened = await evaluate(String.raw`(()=>{const spec=window.PPTSKILLEditor.getDeckSpec();return{editorReady:Boolean(window.PPTSKILLEditor),slideCount:document.querySelectorAll('.slide').length,title:document.querySelector('[data-edit-target="slides.opening.content.title"]')?.textContent,subtitle:spec.slides.find(s=>s.id==='opening')?.content.subtitle,imageType:spec.slides.find(s=>s.id==='portable')?.content.components.find(c=>c.id==='portable-image')?.dataUri.slice(0,16),claim:spec.claims?.find(c=>c.id==='conversion-uplift'),serialized:JSON.stringify(spec),presenterText:/Presenter|講者模式/.test(document.body.innerText)}})()`);
  if (managedPortFile) await cdp.send('Browser.close');
  cdp.close();
  const exportChromeCleanup = [interaction.preparedExport, interaction.directExport, interaction.repeatExport].every(({ chromeCounts }) => chromeCounts.every((count) => count === 0));
  const exportCanonicalStable = [interaction.preparedExport, interaction.directExport, interaction.repeatExport].every(({ spec }) => JSON.stringify(spec) === JSON.stringify(interaction.specBeforeExport));
  const exportPresentationStable = [interaction.preparedExport, interaction.directExport, interaction.repeatExport].every(({ presentation }) => JSON.stringify(presentation) === JSON.stringify(interaction.presentationBeforeExport));
  const liveCanonicalStable = JSON.stringify(interaction.spec) === JSON.stringify(interaction.specBeforeExport);
  const livePresentationStable = JSON.stringify(interaction.presentationAfterExport) === JSON.stringify(interaction.presentationBeforeExport);
  const liveEditorChromePreserved = JSON.stringify(interaction.liveChromeBefore) === JSON.stringify(interaction.liveChromeAfter) && interaction.liveChromeAfter.every((count) => count === 1);
  const misMarkFailsLoud = /editor chrome.*presentation truth/u.test(interaction.misMarkError);
  const receipt = {
    status: interaction.afterDuplicate === 11 && interaction.afterDelete === 10 && /line.*支援|支援.*line/.test(interaction.unsupportedChartRejection) && interaction.chartTypeAfterRejection === 'bar' && interaction.imageReplaced && exportChromeCleanup && exportCanonicalStable && exportPresentationStable && liveCanonicalStable && livePresentationStable && liveEditorChromePreserved && misMarkFailsLoud && reopened.editorReady && reopened.slideCount === interaction.specBeforeExport.slides.length && reopened.title === '瀏覽器直接編輯成功' && reopened.subtitle === '本機 AI 單區 patch 成功' && reopened.imageType === 'data:image/webp;' && reopened.claim?.derivation?.scale === 'ratio' && reopened.claim?.sourceRefs?.[0]?.sourceAvailableToRecipient === false && !reopened.presenterText && !/不得外洩|private\/source|hidden working prompt|private notes/.test(reopened.serialized) && !pageErrors.length && !networkFailures.length && !httpErrors.length ? 'pass' : 'fail',
    viewport: { width: 1280, height: 720 },
    directTextEdit: interaction.title,
    localPatch: reopened.subtitle,
    imageReplacement: interaction.imageReplaced,
    slideManagement: { afterDuplicate: interaction.afterDuplicate, afterDelete: interaction.afterDelete },
    chartCapability: { unsupportedChartRejection: interaction.unsupportedChartRejection, chartTypeAfterRejection: interaction.chartTypeAfterRejection },
    exportCleanup: { exportChromeCleanup, exportCanonicalStable, exportPresentationStable, liveCanonicalStable, livePresentationStable, liveEditorChromePreserved, misMarkFailsLoud, liveChromeBefore: interaction.liveChromeBefore, liveChromeAfter: interaction.liveChromeAfter },
    reopen: { editorReady: reopened.editorReady, slideCount: reopened.slideCount, title: reopened.title, imageType: reopened.imageType, claim: reopened.claim },
    sanitizerLeak: /不得外洩|private\/source|hidden working prompt|private notes/.test(reopened.serialized),
    presenterModePresent: reopened.presenterText,
    console: consoleMessages,
    pageErrors,
    networkFailures,
    httpErrors,
    artifacts: { sourceDeck, exportedDeck },
  };
  await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`);
  if (receipt.status !== 'pass') throw new Error(JSON.stringify(receipt, null, 2));
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
} finally {
  if (browser) browser.kill('SIGTERM');
  if (profile) await rm(profile, { recursive: true, force: true });
}
