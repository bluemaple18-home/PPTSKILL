import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

const output = resolve(process.argv[2] || 'evidence/p1-r10/portable-size-acceptance.json');
const exportedDeck = resolve(dirname(output), 'optimized-portable-deck.html');
const fixture = JSON.parse(await readFile(resolve('fixtures/full-deck-spec.json'), 'utf8'));
fixture.profile = { customer: '不得外洩' }; fixture.localPath = '/Users/private/source.pdf'; fixture.prompt = 'hidden prompt';
fixture.slides[5].content.components = [{ id: 'portable-image', type: 'image', alt: '原圖', fit: 'contain', dataUri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL6WQAAAABJRU5ErkJggg==' }];
fixture.slides[5].composition.slots.component = 'content.components.portable-image';
const rendered = renderFullDeck(fixture); if (rendered.status !== 'pass') throw new Error(rendered.errors.join('\n'));
await mkdir(dirname(output), { recursive: true }); const sourceDeck = resolve(dirname(output), 'asset-acceptance-source.html'); await writeFile(sourceDeck, rendered.html);

const candidates = [process.env.PPTSKILL_CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', 'google-chrome', 'chromium'].filter(Boolean);
let chromeBin; for (const candidate of candidates) { try { if (candidate.includes('/')) await access(candidate); chromeBin = candidate; break; } catch {} } if (!chromeBin) throw new Error('找不到 Chrome/Chromium。');
class Cdp { constructor(url) { this.ws = new WebSocket(url); this.id = 1; this.pending = new Map(); this.listeners = new Map(); } async open() { await new Promise((ok, fail) => { this.ws.addEventListener('open', ok, { once: true }); this.ws.addEventListener('error', fail, { once: true }); }); this.ws.addEventListener('message', ({ data }) => { const m = JSON.parse(data); if (m.method) { for (const fn of this.listeners.get(m.method) || []) fn(m.params || {}); return; } const p = this.pending.get(m.id); if (!p) return; this.pending.delete(m.id); m.error ? p.fail(new Error(m.error.message)) : p.ok(m.result); }); } send(method, params = {}) { const id = this.id++; return new Promise((ok, fail) => { this.pending.set(id, { ok, fail }); this.ws.send(JSON.stringify({ id, method, params })); }); } on(name, fn) { this.listeners.set(name, [...(this.listeners.get(name) || []), fn]); } close() { this.ws.close(); } }
const profile = await mkdtemp(`${tmpdir()}/pptskill-r10-`); const browser = spawn(chromeBin, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1600,900', 'about:blank'], { stdio: 'ignore' });
try {
  let port; for (let i = 0; i < 50; i++) { try { port = Number((await readFile(`${profile}/DevToolsActivePort`, 'utf8')).split('\n')[0]); if (port) break; } catch {} await new Promise((done) => setTimeout(done, 100)); } if (!port) throw new Error('Chrome 未就緒。');
  let page; for (let i = 0; i < 50; i++) { try { page = (await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json())).find((x) => x.type === 'page'); if (page) break; } catch {} await new Promise((done) => setTimeout(done, 100)); } if (!page) throw new Error('Page target 未就緒。');
  const cdp = new Cdp(page.webSocketDebuggerUrl); await cdp.open(); const pageErrors = [], networkFailures = [], httpErrors = [];
  cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => pageErrors.push(exceptionDetails?.exception?.description || exceptionDetails?.text)); cdp.on('Network.loadingFailed', (x) => networkFailures.push(x.errorText)); cdp.on('Network.responseReceived', ({ response }) => { if (response?.status >= 400) httpErrors.push({ url: response.url, status: response.status }); });
  await Promise.all([cdp.send('Page.enable'), cdp.send('Runtime.enable'), cdp.send('Network.enable')]);
  const navigate = async (path) => { const loaded = new Promise((done) => cdp.on('Page.loadEventFired', done)); await cdp.send('Page.navigate', { url: pathToFileURL(path).href }); await Promise.race([loaded, new Promise((_, fail) => setTimeout(() => fail(new Error('頁面載入逾時。')), 8000))]); };
  const evaluate = async (expression) => { const out = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (out.exceptionDetails) throw new Error(out.exceptionDetails.exception?.description || out.exceptionDetails.text); return out.result.value; };
  const viewport = async (width, height) => { await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }); return evaluate(`([...document.querySelectorAll('.slide')].map(x=>{const r=x.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}}))`); };
  await navigate(sourceDeck); const geometryBefore = { '1600x900': await viewport(1600, 900), '1280x720': await viewport(1280, 720) };
  const result = await evaluate(String.raw`(async()=>{
    await document.fonts.ready; const assets=window.PPTSKILLAssets; if(!assets||!window.PPTSKILLEditor)throw new Error('R10 runtime 未啟動');
    const blobFromCanvas=(canvas,type,quality)=>new Promise((ok,fail)=>canvas.toBlob(b=>b?ok(b):fail(new Error('toBlob failed')),type,quality));
    const patterned=async(type,w,h,alpha=false)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');for(let y=0;y<h;y+=40)for(let z=0;z<w;z+=40){x.fillStyle='rgba('+((z*13+y)%255)+','+((z+y*7)%255)+','+((z*3+y*5)%255)+','+(alpha&&((z+y)/40)%3===0?'.35':'1')+')';x.fillRect(z,y,40,40)}return new File([await blobFromCanvas(c,type,.96)],'asset.'+type.split('/')[1],{type})};
    const jpegFile=await patterned('image/jpeg',3200,1800),jpeg=await assets.optimizeFile(jpegFile);
    const pngFile=await patterned('image/png',3000,1600,true),png=await assets.optimizeFile(pngFile);const pngImage=await createImageBitmap(await (await fetch(png.dataUri)).blob());const pc=document.createElement('canvas');pc.width=pngImage.width;pc.height=pngImage.height;const px=pc.getContext('2d');px.drawImage(pngImage,0,0);const alphaPreserved=px.getImageData(0,0,1,1).data[3]<255;pngImage.close();
    const webpFile=await patterned('image/webp',3100,1700),webp=await assets.optimizeFile(webpFile);
    const small=await patterned('image/jpeg',80,60),smallResult=await assets.optimizeFile(small);
    const svgText='<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="red"/></svg>',svgFile=new File([svgText],'v.svg',{type:'image/svg+xml'}),svg=await assets.optimizeFile(svgFile);
    const gifBytes=Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='),c=>c.charCodeAt(0)),gifFile=new File([gifBytes,new Uint8Array(4*1024*1024)],'a.gif',{type:'image/gif'}),gif=await assets.optimizeFile(gifFile);
    document.querySelector('.slide[data-slide-id="portable"]').click();const replacement=await window.PPTSKILLEditor.replaceImageFile(jpegFile);const prepared=window.PPTSKILLEditor.prepareExport();
    const originalHardLimit=window.PPTSKILLSizeGuard.policy.deckHardLimitBytes;let downloadClicks=0;const originalClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){downloadClicks+=1};window.PPTSKILLSizeGuard.policy.deckHardLimitBytes=100;const hardLimitDownloadResult=window.PPTSKILLEditor.download();window.PPTSKILLSizeGuard.policy.deckHardLimitBytes=originalHardLimit;HTMLAnchorElement.prototype.click=originalClick;
    const svgDecoded=atob(svg.dataUri.split(',')[1]);
    return {jpeg:{...jpeg,dataUri:undefined},png:{...png,dataUri:undefined,alphaPreserved},webp:{...webp,dataUri:undefined},small:{...smallResult,dataUriEqual:smallResult.dataUri===await new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(small)}),dataUri:undefined},svg:{...svg,dataUri:undefined,decodedEqual:svgDecoded===svgText},gif:{...gif,dataUri:undefined,preservedPrefix:gif.dataUri.startsWith('data:image/gif;base64,')},replacement:{...replacement,dataUri:undefined},hardLimit:{downloadResult:hardLimitDownloadResult,downloadClicks},prepared:{status:prepared.status,report:prepared.report},html:prepared.html,spec:window.PPTSKILLEditor.getDeckSpec()};
  })()`);
  await writeFile(exportedDeck, result.html); delete result.html; const geometryAfter = { '1600x900': await viewport(1600, 900), '1280x720': await viewport(1280, 720) };
  await navigate(exportedDeck); const reopened = await evaluate(`(()=>{const s=window.PPTSKILLEditor.getDeckSpec();return{ready:Boolean(window.PPTSKILLEditor),image:s.slides.find(x=>x.id==='portable').content.components.find(x=>x.id==='portable-image').dataUri.slice(0,23),leak:/不得外洩|private\\/source|hidden prompt/.test(JSON.stringify(s)),size:window.PPTSKILLEditor.getSizeReport()}})()`);
  const sameGeometry = JSON.stringify(geometryBefore) === JSON.stringify(geometryAfter);
  const checks = {
    largeJpegReduced: result.jpeg.optimized && Math.max(result.jpeg.width,result.jpeg.height) <= 2560 && result.jpeg.outputBytes < result.jpeg.originalBytes,
    pngTransparency: result.png.alphaPreserved && Math.max(result.png.width,result.png.height) <= 2560,
    webpOptimized: result.webp.optimized && result.webp.mime === 'image/webp', svgPreserved: result.svg.policyAction === 'preserve_vector' && result.svg.decodedEqual,
    gifPreservedWithWarning: result.gif.policyAction === 'preserve_animation' && result.gif.preservedPrefix && result.gif.warnings.includes('oversized_gif_preserved'),
    smallImageUnchanged: result.small.policyAction === 'preserve_small' && result.small.dataUriEqual, noUpscale: result.small.width === 80 && result.small.height === 60,
    replacementExportReopen: result.replacement.optimized && reopened.ready && reopened.image.startsWith('data:image/jpeg;base64'), recipientDeckSpec: result.spec.slides.length === 10,
    sanitizer: !reopened.leak, geometry1600And1280: sameGeometry, actualUtf8Bytes: result.prepared.report.totalHtmlBytes === new TextEncoder().encode(await readFile(exportedDeck,'utf8')).byteLength,
    largestAttribution: Boolean(result.prepared.report.largestAsset?.slideId && result.prepared.report.largestAsset?.componentId), hardLimitNoArtifact: result.hardLimit.downloadResult === false && result.hardLimit.downloadClicks === 0, runtimeClean: !pageErrors.length && !networkFailures.length && !httpErrors.length,
  };
  const receipt = { status: Object.values(checks).every(Boolean) ? 'pass' : 'fail', checks, policy: result.prepared.report.limits, optimization: { jpeg: result.jpeg, png: result.png, webp: result.webp, small: result.small, svg: result.svg, gif: result.gif }, exportReport: result.prepared.report, reopened, geometry: { sameAtBothViewports: sameGeometry }, diagnostics: { pageErrors, networkFailures, httpErrors }, artifacts: { sourceDeck, exportedDeck } };
  await writeFile(output, `${JSON.stringify(receipt,null,2)}\n`); if (receipt.status !== 'pass') throw new Error(JSON.stringify(receipt,null,2)); process.stdout.write(`${JSON.stringify(receipt,null,2)}\n`); cdp.close();
} finally {
  await new Promise((done) => { if (browser.exitCode !== null) return done(); browser.once('exit', done); browser.kill('SIGTERM'); });
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
