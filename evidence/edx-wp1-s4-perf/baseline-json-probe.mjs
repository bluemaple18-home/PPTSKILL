import { performance } from 'node:perf_hooks';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const sourceCommit='05295d3853364157a6da0ae30459eebc26bf11c5';
const source=execFileSync('git',['show',sourceCommit+':runtime/component-interaction.js']);
const fixture=JSON.parse(await readFile('fixtures/full-deck-spec.json','utf8'));
const runs=[];
for(const mib of [1,6,12]){
  const spec=structuredClone(fixture);
  spec.slides[0].content.components.push({id:'perf-payload',type:'image',alt:'diagnostic',dataUri:'data:image/png;base64,'+'A'.repeat(mib*1024*1024)});
  for(let i=0;i<10;i++)JSON.stringify(spec);
  const ms=[];let bytes;
  for(let i=0;i<80;i++){const start=performance.now();const text=JSON.stringify(spec);ms.push(performance.now()-start);bytes=Buffer.byteLength(text)}
  ms.sort((a,b)=>a-b);
  runs.push({payloadMiB:mib,serializedBytes:bytes,iterations:ms.length,p50Ms:ms[Math.floor(ms.length*.5)],p95Ms:ms[Math.floor(ms.length*.95)],meanMs:ms.reduce((a,b)=>a+b,0)/ms.length});
}
const result={scope:'whole-spec JSON.stringify診斷，不冒充browser frame benchmark；正式mounted hot-path gate由Worker另驗',sourceCommit,sourceSha256:createHash('sha256').update(source).digest('hex'),node:process.version,runs};
await writeFile('evidence/edx-wp1-s4-perf/baseline-json.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
