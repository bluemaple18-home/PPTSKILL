import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const output = resolve(outputIndex >= 0 ? args[outputIndex + 1] : 'evidence/pgq-wp3-s3/vanta-capability-spike.json');
const effects = ['waves', 'birds', 'net', 'globe', 'dots', 'fog', 'clouds', 'cells', 'ripple', 'rings', 'halo'];
const bundle = await readFile(new URL('../runtime/vendor/vanta-three-0.5.24-r134.iife.js', import.meta.url), 'utf8');
const temporary = await mkdtemp(`${tmpdir()}/pptskill-vanta-spike-`);
const htmlPath = resolve(temporary, 'spike.html');
const html = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none';script-src 'unsafe-inline';style-src 'unsafe-inline';img-src data: blob:;connect-src 'none'"><style>html,body{margin:0;background:#121827}#stage{position:relative;width:800px;height:450px;overflow:hidden;background:#121827}</style></head><body><div id="stage"></div><script>${bundle}</script><script>
const stage=document.querySelector('#stage');let current=null;
const common={el:stage,THREE:window.THREE,mouseControls:false,touchControls:false,gyroControls:false,minHeight:450,minWidth:800,scale:1,scaleMobile:1};
const options={
 waves:{color:0x10203a,shininess:22,waveHeight:12,waveSpeed:1,zoom:1},birds:{backgroundColor:0x121827,color1:0x93c5fd,color2:0xf6f7fb,birdSize:.8,wingSpan:24,speedLimit:3,separation:28,alignment:24,cohesion:22,quantity:3},
 net:{backgroundColor:0x121827,color:0x93c5fd,points:8,maxDistance:22,spacing:17,showDots:true},globe:{backgroundColor:0x121827,color:0x93c5fd,color2:0xf6f7fb,size:.9,points:8,maxDistance:22,spacing:17,showDots:true},
 dots:{backgroundColor:0x121827,color:0x93c5fd,color2:0xb7c0d6,size:2.5,spacing:38,showLines:true},fog:{baseColor:0x121827,highlightColor:0x93c5fd,midtoneColor:0x1f2937,lowlightColor:0x0a1020,blurFactor:.55,speed:1,zoom:1},
 clouds:{backgroundColor:0x121827,skyColor:0x121827,cloudColor:0x334155,cloudShadowColor:0x0f172a,sunColor:0x93c5fd,sunGlareColor:0xb7c0d6,sunlightColor:0xf6f7fb,speed:1},
 cells:{backgroundColor:0x121827,color1:0x121827,color2:0x0e1422,size:1.5,speed:1},ripple:{backgroundColor:0x121827,color1:0x121827,color2:0x93c5fd,amplitudeFactor:1,ringFactor:4,rotationFactor:.1,speed:1},
 rings:{backgroundColor:0x121827,color:0x93c5fd},halo:{backgroundColor:0x121827,baseColor:0x93c5fd,amplitudeFactor:1,size:1,xOffset:0,yOffset:0}
};
window.runEffect=(effect)=>{try{current?.destroy?.();current=null;stage.replaceChildren();stage.style.background='#121827';const factory=window.VANTA?.[effect.toUpperCase()];if(typeof factory!=='function')return{status:'unavailable',reason:'factory_missing'};current=factory({...common,...options[effect]});return{status:current?.renderer?.domElement||stage.querySelector('canvas')?'started':'failed',canvasCount:stage.querySelectorAll('canvas').length}}catch(error){return{status:'failed',reason:error.message}}};
window.destroyEffect=()=>{try{current?.destroy?.()}finally{current=null}return{canvasCount:stage.querySelectorAll('canvas').length}};
</script></body></html>`;
await writeFile(htmlPath, html);

class CdpClient {
  constructor(url) { this.socket = new WebSocket(url); this.nextId = 1; this.pending = new Map(); this.listeners = new Map(); }
  async open() {
    await new Promise((resolveOpen, reject) => { this.socket.addEventListener('open', resolveOpen, { once: true }); this.socket.addEventListener('error', reject, { once: true }); });
    this.socket.addEventListener('message', ({ data }) => { const message = JSON.parse(data); if (message.method) { for (const listener of this.listeners.get(message.method) || []) listener(message.params || {}); return; } const pending = this.pending.get(message.id); if (!pending) return; this.pending.delete(message.id); message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result); });
  }
  send(method, params = {}) { const id = this.nextId++; return new Promise((resolveSend, reject) => { this.pending.set(id, { resolve: resolveSend, reject }); this.socket.send(JSON.stringify({ id, method, params })); }); }
  on(method, listener) { if (!this.listeners.has(method)) this.listeners.set(method, []); this.listeners.get(method).push(listener); }
  close() { this.socket.close(); }
}

const chromeCandidates = [process.env.PPTSKILL_CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].filter(Boolean);
let chromeBin;
for (const candidate of chromeCandidates) { try { await access(candidate); chromeBin = candidate; break; } catch {} }
if (!chromeBin) throw new Error('找不到 Chrome/Chromium。');
const profile = resolve(temporary, 'profile');
const browser = spawn(chromeBin, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--enable-webgl', '--use-angle=swiftshader', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=800,450', 'about:blank'], { stdio: 'ignore' });
try {
  let port;
  for (let attempt = 0; attempt < 50; attempt += 1) { try { port = Number((await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); if (port) break; } catch {} await new Promise((resolveWait) => setTimeout(resolveWait, 100)); }
  if (!port) throw new Error('Chrome DevTools port 未就緒。');
  const pages = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
  const page = pages.find(({ type }) => type === 'page');
  const cdp = new CdpClient(page.webSocketDebuggerUrl); await cdp.open();
  const consoleMessages = [], pageErrors = [], network = [];
  cdp.on('Runtime.consoleAPICalled', ({ type, args: values = [] }) => consoleMessages.push({ type, text: values.map(({ value, description }) => value ?? description ?? '').join(' ') }));
  cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => pageErrors.push(exceptionDetails?.exception?.description || exceptionDetails?.text));
  cdp.on('Network.requestWillBeSent', ({ request }) => network.push(request.url));
  await Promise.all([cdp.send('Page.enable'), cdp.send('Runtime.enable'), cdp.send('Network.enable')]);
  const loaded = new Promise((resolveLoad) => cdp.on('Page.loadEventFired', resolveLoad));
  await cdp.send('Page.navigate', { url: pathToFileURL(htmlPath).href }); await loaded;
  const results = [];
  for (const effect of effects) {
    const start = await cdp.send('Runtime.evaluate', { expression: `window.runEffect(${JSON.stringify(effect)})`, returnByValue: true });
    await new Promise((resolveWait) => setTimeout(resolveWait, 450));
    const first = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 800, height: 450, scale: 1 } });
    await new Promise((resolveWait) => setTimeout(resolveWait, 350));
    const second = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 800, height: 450, scale: 1 } });
    const beforeDestroy = await cdp.send('Runtime.evaluate', { expression: `({canvasCount:document.querySelectorAll('#stage canvas').length,width:document.querySelector('#stage canvas')?.width||0,height:document.querySelector('#stage canvas')?.height||0})`, returnByValue: true });
    const destroyed = await cdp.send('Runtime.evaluate', { expression: 'window.destroyEffect()', returnByValue: true });
    const firstHash = createHash('sha256').update(first.data, 'base64').digest('hex');
    const secondHash = createHash('sha256').update(second.data, 'base64').digest('hex');
    results.push({ effect, start: start.result.value, canvas: beforeDestroy.result.value, animatedPixels: firstHash !== secondHash, destroyed: destroyed.result.value.canvasCount === 0, frameSha256: [firstHash, secondHash] });
  }
  cdp.close();
  const externalNetwork = network.filter((url) => !url.startsWith('file:'));
  const receipt = { schemaVersion: '1.0', status: results.every(({ start, canvas, animatedPixels, destroyed }) => start.status === 'started' && canvas.canvasCount === 1 && canvas.width > 0 && canvas.height > 0 && animatedPixels && destroyed) && pageErrors.length === 0 && externalNetwork.length === 0 ? 'pass' : 'fail', results, console: consoleMessages, pageErrors, network, externalNetwork };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
  if (receipt.status !== 'pass') process.exitCode = 1;
} finally {
  browser.kill('SIGTERM');
  await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
