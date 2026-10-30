import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {buildMoveableVendorScript} from '../../../runtime/moveable-vendor.js';
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
const fixture = new URL('fixture.html', import.meta.url);
await writeFile(fixture, `<!doctype html><meta charset="utf-8"><style>body{margin:0;overflow:hidden}#slide{position:absolute;left:0;top:0;width:1600px;height:900px;transform-origin:0 0;background:#eee}#target{position:absolute;left:803px;top:283px;width:637px;height:477px;background:#357;color:white;box-sizing:border-box}</style><div id="slide"><div id="target">座標映射 probe</div></div>${buildMoveableVendorScript()}<script>
window.setup=(scale,grid,transform,kind,mode)=>{
 window.m?.destroy();document.querySelector('#geometry-target')?.remove();document.querySelectorAll('[data-probe-overlay]').forEach(e=>e.remove());
 const slide=document.querySelector('#slide'),target=document.querySelector('#target');slide.style.transform='scale('+scale+')';target.style.transform=transform;
 let geometryTarget=target; if(mode==='proxy'){geometryTarget=document.createElement('div');geometryTarget.id='geometry-target';geometryTarget.setAttribute('data-pptskill-editor-chrome','probe');geometryTarget.style.cssText='position:absolute;left:803px;top:283px;width:637px;height:477px;box-sizing:border-box;z-index:10;background:rgba(255,0,0,.02)';slide.append(geometryTarget);} window.probeTarget=geometryTarget;
 const directions=mode==='default'?{left:true,top:true,right:true,bottom:true,center:false,middle:false}:{left:kind==='drag',top:kind==='drag',right:kind==='resize',bottom:kind==='resize',center:false,middle:false};
 const overlay=document.createElement('div');overlay.dataset.probeOverlay='true';slide.append(overlay);window.events=[];
 window.m=new PPTSKILLMoveable.default(overlay,{target:geometryTarget,snapDirections:directions,container:slide,rootContainer:document.body,snapContainer:slide,draggable:true,resizable:true,renderDirections:['se'],origin:false,snappable:grid>0,snapGridWidth:grid,snapGridHeight:grid,throttleDrag:0,throttleResize:0});
 const pack=e=>({beforeTranslate:e.beforeTranslate,translate:e.translate,beforeDist:e.beforeDist,dist:e.dist,left:e.left,top:e.top,width:e.width,height:e.height,boundingWidth:e.boundingWidth,boundingHeight:e.boundingHeight,drag:e.drag&&{beforeTranslate:e.drag.beforeTranslate,translate:e.drag.translate,left:e.drag.left,top:e.drag.top},client:[e.inputEvent?.clientX,e.inputEvent?.clientY]});
 for(const kind of ['drag','resize']){m.on(kind+'Start',e=>{if(kind==='drag')e.set([0,0]);events.push({type:kind+'Start',client:[e.inputEvent?.clientX,e.inputEvent?.clientY]});});m.on(kind,e=>events.push({type:kind,...pack(e)}));m.on(kind+'End',()=>events.push({type:kind+'End'}));}
};</script>`);
const portFile=process.env.PPTSKILL_DEVTOOLS_ACTIVE_PORT;assert.ok(portFile);
const port=Number((await readFile(portFile,'utf8')).split('\n')[0]);
const receipt={status:'running',scope:'fixture-only；不投影或提交canonical，static transform不是motion lifecycle',runs:[]};
let cdp,targetId;
try{
 const page=await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();targetId=page.id;cdp=new CdpClient(page.webSocketDebuggerUrl);await cdp.open();
 receipt.console=[];receipt.pageErrors=[];receipt.networkFailures=[];receipt.httpErrors=[];receipt.remoteRequests=[];
 cdp.on('Runtime.consoleAPICalled',x=>receipt.console.push(x));cdp.on('Runtime.exceptionThrown',x=>receipt.pageErrors.push(x));cdp.on('Network.loadingFailed',x=>receipt.networkFailures.push(x));cdp.on('Network.responseReceived',x=>{if(x.response.status>=400)receipt.httpErrors.push(x)});cdp.on('Network.requestWillBeSent',x=>{if(/^https?:/.test(x.request.url))receipt.remoteRequests.push(x.request.url)});
 await Promise.all(['Page.enable','Runtime.enable','Network.enable'].map(method=>cdp.send(method)));
 const evaluate=async expression=>{const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description);return r.result.value;};
 await cdp.send('Page.navigate',{url:fixture.href});
 for(let i=0;i<100;i++){if(await evaluate('typeof window.setup === "function"'))break;if(i===99)throw new Error('fixture timeout');await new Promise(r=>setTimeout(r,50));}
 const settle=()=>evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true))))');
 for(const width of [1280,1600]){const scale=width/1600;await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:Math.round(900*scale),deviceScaleFactor:1,mobile:false});
 for(const transform of ['none','scale(0.8)','translateY(20px)'])for(const mode of ['default','directions','proxy'])for(const kind of ['drag','resize']){
 const grid=8;await evaluate(`setup(${scale},${grid},${JSON.stringify(transform)},${JSON.stringify(kind)},${JSON.stringify(mode)})`);await settle();await evaluate("m.updateRect()");await settle();
 const position=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(kind==='drag'?(mode==='proxy'?'#geometry-target':'#target'):'.moveable-control.moveable-se')}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
 const mouse=(type,x,y,held)=>cdp.send('Input.dispatchMouseEvent',{type,x,y,button:type==='mouseMoved'?'none':'left',buttons:held?1:0,clickCount:type==='mouseMoved'?0:1});
 await mouse('mouseMoved',position.x,position.y,false);await mouse('mousePressed',position.x,position.y,true);
 await mouse('mouseMoved',position.x+10*scale,position.y+10*scale,true);await mouse('mouseReleased',position.x+10*scale,position.y+10*scale,false);await settle();
 const events=await evaluate('events');receipt.pointerDiagnostic={width,transform,grid,kind,position,hit:await evaluate(`document.elementFromPoint(${position.x},${position.y})?.outerHTML`)};assert.ok(events.some(e=>e.type===kind),JSON.stringify({width,transform,grid,kind,events}));
 receipt.runs.push({width,scale,transform,grid,kind,mode,presentationStyle:await evaluate("document.querySelector('#target').getAttribute('style')"),requestedCanonicalDelta:10,observedCanonicalDelta:events.filter(e=>e.client).length>1?events.find(e=>e.type===kind).client.map((v,i)=>(v-events[0].client[i])/scale):null,events,cssBox:await evaluate('({left:target.offsetLeft,top:target.offsetTop,width:target.offsetWidth,height:target.offsetHeight})')});
 }}
 for(const key of ['console','pageErrors','networkFailures','httpErrors','remoteRequests'])assert.equal(receipt[key].length,0,key);
 assert.equal(receipt.runs.length,36);receipt.status='pass';
}catch(e){receipt.status='fail';receipt.error=e.stack;process.exitCode=1;}
finally{if(targetId){try{receipt.targetClosed=(await (await fetch(`http://127.0.0.1:${port}/json/close/${targetId}`)).text()).includes('closing');}catch(e){receipt.closeError=e.message;receipt.status='fail';process.exitCode=1;}}cdp?.close();await writeFile(new URL('receipt.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({status:receipt.status,runs:receipt.runs.length,error:receipt.error}));}
