import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
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
// 僅測非破壞CSS投影；不是production adapter、pointer UI或完整卡片驗收。
const out=resolve(process.argv[2]);await mkdir(out,{recursive:true});
assert.ok(process.env.PPTSKILL_DEVTOOLS_ACTIVE_PORT);
const port=Number((await readFile(process.env.PPTSKILL_DEVTOOLS_ACTIVE_PORT,'utf8')).split('\n')[0]);
const receipt={status:'running',scope:'CSS projection prototype only',runs:[]};
let targetId,cdp;
try {
 const target=await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();targetId=target.id;cdp=new CdpClient(target.webSocketDebuggerUrl);await cdp.open();
 const errors=[];receipt.errors=errors;
 cdp.on('Runtime.exceptionThrown',e=>errors.push(e));cdp.on('Runtime.consoleAPICalled',e=>errors.push(e));cdp.on('Network.loadingFailed',e=>errors.push(e));
 cdp.on('Network.requestWillBeSent',e=>{if(/^https?:/.test(e.request.url))errors.push(e)});cdp.on('Network.responseReceived',e=>{if(e.response.status>=400)errors.push(e)});
 await Promise.all([cdp.send('Page.enable'),cdp.send('Runtime.enable'),cdp.send('Network.enable')]);
 const evaluate=async expression=>{const r=await cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
 for(const width of [1280,1600]) {
  await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:width*9/16,deviceScaleFactor:1,mobile:false});
  for(const [name,W,H,fit,crop] of [['landscape-contain',240,160,'contain',{x:.2,y:.15,width:.5,height:.6}],['landscape-cover',240,160,'cover',{x:.2,y:.15,width:.5,height:.6}],['portrait-contain',120,240,'contain',{x:.1,y:.1,width:.8,height:.75}],['reset',240,160,'contain',{x:0,y:0,width:1,height:1}]]) {
   const setup=await evaluate(`(async()=>{
    document.body.innerHTML='';document.body.style.cssText='margin:0;background:white';
    const original=document.createElement('canvas');original.width=${W};original.height=${H};const ctx=original.getContext('2d');
    for(let row=0;row<2;row++)for(let col=0;col<3;col++){ctx.fillStyle=['#e53935','#43a047','#1e88e5','#fdd835','#8e24aa','#00acc1'][row*3+col];ctx.fillRect(col*original.width/3,row*original.height/2,original.width/3,original.height/2)}
    ctx.fillStyle='#000';ctx.fillRect(0,0,5,original.height);ctx.fillRect(0,original.height-5,original.width,5);ctx.font='12px sans-serif';ctx.fillText('SOURCE AXIS',12,original.height-10);
    const src=original.toDataURL('image/png');const frame=document.createElement('figure');frame.style.cssText='margin:0;position:absolute;left:40px;top:40px;width:500px;height:200px;background:rgb(240,240,240);overflow:hidden;transform-origin:0 0;transform:scale(${width/1600})';
    const img=new Image();img.src=src;frame.append(img);document.body.append(frame);await img.decode();
    const crop=${JSON.stringify(crop)},fit=${JSON.stringify(fit)};const scale=Math[fit==='contain'?'min':'max'](500/(img.naturalWidth*crop.width),200/(img.naturalHeight*crop.height));
    const left=(500-img.naturalWidth*crop.width*scale)/2-crop.x*img.naturalWidth*scale,top=(200-img.naturalHeight*crop.height*scale)/2-crop.y*img.naturalHeight*scale;
    img.style.cssText='position:absolute;display:block;max-width:none;max-height:none;object-fit:fill;width:'+img.naturalWidth*scale+'px;height:'+img.naturalHeight*scale+'px;left:'+left+'px;top:'+top+'px;clip-path:inset('+[crop.y,1-crop.x-crop.width,1-crop.y-crop.height,crop.x].map(v=>v*100+'%').join(' ')+')';
    window.fixture={original,src,img,frame,crop,scale,left,top,viewScale:${width/1600}};
    await new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)));
    return {srcUnchanged:img.getAttribute('src')===src,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,scale,left,top};
   })()`);
   assert.ok(setup.srcUnchanged);assert.equal(setup.naturalWidth,W);assert.equal(setup.naturalHeight,H);
   const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(out,`${width}-${name}.png`),Buffer.from(shot.data,'base64'));
   const pixels=await evaluate(`(async()=>{const f=window.fixture;const raster=new Image();raster.src='data:image/png;base64,${shot.data}';await raster.decode();const c=document.createElement('canvas');c.width=raster.naturalWidth;c.height=raster.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(raster,0,0);const source=f.original.getContext('2d'),r=f.frame.getBoundingClientRect(),checks=[];let excluded=0;
    for(const fx of [.03,.21,.37,.62,.87,.97])for(const fy of [.07,.23,.43,.67,.91]){
     const px=Math.floor(r.left+r.width*fx),py=Math.floor(r.top+r.height*fy),sx=((px+.5-r.left)/f.viewScale-f.left)/f.scale,sy=((py+.5-r.top)/f.viewScale-f.top)/f.scale;
     const inside=sx>=f.crop.x*f.original.width&&sx<(f.crop.x+f.crop.width)*f.original.width&&sy>=f.crop.y*f.original.height&&sy<(f.crop.y+f.crop.height)*f.original.height;
     let expected=[240,240,240,255];if(inside){expected=Array.from(source.getImageData(Math.floor(sx),Math.floor(sy),1,1).data);let uniform=true;for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){const q=source.getImageData(Math.floor(sx)+dx,Math.floor(sy)+dy,1,1).data;if(q.some((v,i)=>v!==expected[i]))uniform=false}if(!uniform){excluded++;continue}}
     const actual=Array.from(ctx.getImageData(px,py,1,1).data);checks.push({px,py,inside,expected,actual,pass:actual.every((v,i)=>Math.abs(v-expected[i])<=3)});
    }return {checks,excluded,sourceUnchanged:f.img.getAttribute('src')===f.src};})()`);
   assert.ok(pixels.checks.length>=12);assert.ok(pixels.sourceUnchanged);assert.ok(pixels.checks.every(c=>c.pass),JSON.stringify({width,name,pixels}));
   receipt.runs.push({width,height:width*9/16,name,status:'PASS',setup,...pixels});
  }
 }
 assert.equal(errors.length,0);receipt.status='PASS';
} catch(error){receipt.status='FAIL';receipt.error=String(error.stack);throw error}
finally {
 if(cdp)cdp.close();if(targetId){const response=await fetch(`http://127.0.0.1:${port}/json/close/${targetId}`);receipt.targetClosed=response.ok}
 await writeFile(resolve(out,'projection.json'),JSON.stringify(receipt,null,2)+'\n');
}
console.log(JSON.stringify({status:receipt.status,cases:receipt.runs.length,pixelChecks:receipt.runs.reduce((n,r)=>n+r.checks.length,0),errors:receipt.errors.length,targetClosed:receipt.targetClosed}));
