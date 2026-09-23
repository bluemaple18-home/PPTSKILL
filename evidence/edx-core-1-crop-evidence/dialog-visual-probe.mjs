import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
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

const out=resolve(process.argv[2]);await mkdir(out,{recursive:true});
const source=resolve('evidence/edx-core-1-crop-evidence/host-acceptance-04/crop/source.html');
const port=Number((await readFile(process.env.PPTSKILL_DEVTOOLS_ACTIVE_PORT,'utf8')).split('\n')[0]);
const receipt={scope:'Crop Evidence-classification dialog visual supplement only; no PGQ rerun',status:'running',runs:[],errors:[]};
let cdp,id;
try{
 const response=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'});assert.ok(response.ok);const page=await response.json();id=page.id;cdp=new CdpClient(page.webSocketDebuggerUrl);await cdp.open();
 cdp.on('Runtime.exceptionThrown',e=>receipt.errors.push(e));cdp.on('Runtime.consoleAPICalled',e=>receipt.errors.push(e));cdp.on('Network.loadingFailed',e=>receipt.errors.push(e));cdp.on('Network.responseReceived',e=>{if(e.response.status>=400)receipt.errors.push(e)});cdp.on('Network.requestWillBeSent',e=>{if(/^https?:/.test(e.request.url))receipt.errors.push(e)});
 await Promise.all([cdp.send('Page.enable'),cdp.send('Runtime.enable'),cdp.send('Network.enable')]);
 const evaluate=async expression=>{const r=await cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
 const settle=()=>evaluate('new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)))');
 const click=async css=>{const p=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(css)}),r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',buttons:1,clickCount:1});await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',buttons:0,clickCount:1});await settle();};
 for(const width of [1280,1600]){
  const height=width*9/16;await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await cdp.send('Page.navigate',{url:pathToFileURL(source).href});
  for(let i=0;i<100;i++){if(await evaluate('document.readyState==="complete"&&!!window.PPTSKILLEditor'))break;if(i===99)throw Error('load timeout');await new Promise(r=>setTimeout(r,50));}
  await evaluate('(async()=>{await document.fonts.ready;await new Promise(r=>setTimeout(r,1400));})()');
  await click('[data-action="layout"]');await click('[data-pptskill-element-id="component-crop-landscape"]');await click('[data-action="crop-selected-image"]');
  await evaluate(`(async()=>{await Promise.all([...document.querySelectorAll('[data-crop-dialog] img')].map(i=>i.decode()));const c=document.querySelector('[data-crop-classification]');c.value='evidence';c.dispatchEvent(new Event('input',{bubbles:true}));})()`);await settle();
  const check=await evaluate(`(()=>{const d=document.querySelector('[data-crop-dialog]'),r=d.getBoundingClientRect(),controls=[...d.querySelectorAll('input,select,button')].filter(e=>e.getBoundingClientRect().width);return{open:d.open,rect:{x:r.x,y:r.y,width:r.width,height:r.height},horizontalOverflow:d.scrollWidth>d.clientWidth,controls:controls.length,focusInside:d.contains(document.activeElement),confirmDisabled:d.querySelector('[data-action="confirm-crop"]').disabled}})()`);
  assert.ok(check.open&&check.focusInside&&check.confirmDisabled);assert.equal(check.horizontalOverflow,false);assert.ok(check.rect.x>=0&&check.rect.y>=0&&check.rect.x+check.rect.width<=width&&check.rect.y+check.rect.height<=height);
  const artifacts=[];
  for(const section of ['top','actions']){
   if(section==='actions')await evaluate(`document.querySelector('[data-action="confirm-crop"]').scrollIntoView({block:'nearest'})`);await settle();
   const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}),b=Buffer.from(shot.data,'base64'),path=resolve(out,`${width}-dialog-${section}.png`);await writeFile(path,b);artifacts.push({path,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});
  }
  await click('[data-action="cancel-crop"]');assert.equal(await evaluate('document.querySelector("[data-crop-dialog]").open'),false);receipt.runs.push({width,height,check,artifacts,status:'pass'});
 }
 assert.equal(receipt.errors.length,0);receipt.status='pass';
}catch(e){receipt.status='fail';receipt.error=e.stack;process.exitCode=1}
finally{if(id){const r=await fetch(`http://127.0.0.1:${port}/json/close/${id}`);receipt.targetClosed=r.ok;}cdp?.close();await writeFile(resolve(out,'acceptance.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({status:receipt.status,runs:receipt.runs.length,error:receipt.error}));}
