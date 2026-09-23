import {readFileSync,writeFileSync,openSync} from 'node:fs';import {spawnSync} from 'node:child_process';
const p='/private/tmp/pptskill-s13-independent-', root='/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical';
const files=JSON.parse(readFileSync(p+'test-plan.json')).excluded;
const fd=openSync(p+'batch2.log','w');const r=spawnSync(process.execPath,['--test',...files],{cwd:root,stdio:['ignore',fd,fd],env:{...process.env,TMPDIR:p+'scratch',PATH:'/opt/homebrew/bin:'+process.env.PATH}});
const log=readFileSync(p+'batch2.log','utf8');const result={files:files.length,status:r.status,signal:r.signal,summary:log.split('\n').filter(x=>/^[ℹ#] (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)/.test(x)),namedPasses:(log.match(/^✔ /gm)||[]).length,log:p+'batch2.log'};
writeFileSync(p+'batch2-summary.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
