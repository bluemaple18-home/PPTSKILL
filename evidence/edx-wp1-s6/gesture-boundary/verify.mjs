import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';
const d=JSON.parse(await readFile(new URL('receipt.json',import.meta.url),'utf8'));assert.equal(d.status,'pass');assert.equal(d.runs.length,48);assert.equal(d.targetClosed,true);
for(const key of ['console','pageErrors','networkFailures','httpErrors','remoteRequests'])assert.equal(d[key].length,0);
const base={x:803,y:283,width:637,height:477};
for(const r of d.runs){
 const unchanged=['zero','cancel'].includes(r.scenario);assert.equal(r.calls.length,unchanged?0:1);
 assert.deepEqual(r.canonical,unchanged?base:r.kind==='drag'?{...base,x:792,y:272}:{...base,width:629,height:469});
 assert.equal(r.snapshots.length,r.scenario==='zero'?0:r.scenario==='negative'?1:3);
 for(const s of r.snapshots){assert.equal(s.commits,0);assert.deepEqual(s.canonical,base);}
 assert.deepEqual(r.cleanup,{proxyCount:0,controlCount:0,overlayCount:0});assert.equal(r.presentationStyle,`transform: ${r.transform};`);
 const peer=d.runs.find(x=>x.width!==r.width&&x.transform===r.transform&&x.kind===r.kind&&x.scenario===r.scenario);assert.deepEqual(peer.canonical,r.canonical);
}
await writeFile(new URL('verification.json',import.meta.url),JSON.stringify({status:'pass',cases:48,viewportPairs:24,previewNoCommit:true,negativeAndMultiSingleCommit:true,zeroAndCancelNoCommit:true,teardownNoResidue:true,presentationUnchanged:true,limits:'fixture canonical替身；非full-deck整合／sanitizer／export／完整motion lifecycle'},null,2)+'\n');console.log('PASS: 48 gesture cases / 24 viewport pairs');
