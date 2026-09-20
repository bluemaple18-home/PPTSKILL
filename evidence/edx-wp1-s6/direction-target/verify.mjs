import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const d=JSON.parse(await readFile(new URL('receipt.json',import.meta.url),'utf8'));
assert.equal(d.status,'pass');assert.equal(d.runs.length,36);assert.equal(d.targetClosed,true);
for(const key of ['console','pageErrors','networkFailures','httpErrors','remoteRequests'])assert.equal(d[key].length,0);
const geometry=r=>{const e=r.events.find(e=>e.type===r.kind);return r.kind==='drag'?{x:e.left,y:e.top,width:e.width,height:e.height}:{x:e.drag.left,y:e.drag.top,width:e.width,height:e.height};};
for(const r of d.runs){
 assert.deepEqual(r.observedCanonicalDelta,[10,10]);
 assert.deepEqual(r.cssBox,{left:803,top:283,width:637,height:477});
 assert.equal(r.presentationStyle,`transform: ${r.transform};`);
 const other=d.runs.find(x=>x.width!==r.width&&x.mode===r.mode&&x.transform===r.transform&&x.kind===r.kind);assert.deepEqual(geometry(r),geometry(other));
 if(r.mode==='proxy'){
  const g=geometry(r);assert.deepEqual(g,r.kind==='drag'?{x:816,y:296,width:637,height:477}:{x:803,y:283,width:645,height:485});
  if(r.kind==='drag'){assert.equal(g.x%8,0);assert.equal(g.y%8,0);}else{assert.equal((g.x+g.width)%8,0);assert.equal((g.y+g.height)%8,0);}
 }
}
for(const kind of ['drag','resize']){
 const r=transform=>d.runs.find(x=>x.width===1600&&x.mode==='directions'&&x.kind===kind&&x.transform===transform);
 assert.notDeepEqual(geometry(r('none')),geometry(r('scale(0.8)')));
}
await writeFile(new URL('verification.json',import.meta.url),JSON.stringify({status:'pass',observations:36,proxyCases:12,actualDelta:[10,10],viewportPairsMatch:18,presentationUnchanged:true,proxyTransformInvariant:true,directionOnlyTransformInvariant:false,resizeSemantics:'固定左上角，right/bottom落格；不是width/height為8倍數',limits:'單一off-grid box、正向單次事件、static transform；非production整合'},null,2)+'\n');
console.log('PASS: 36 observations / 18 viewport pairs / 12 proxy invariants；direction-only反例確認。');
