import {readFileSync,writeFileSync,openSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root='/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical';
const prefix='/private/tmp/pptskill-s13-independent-';
const files=readFileSync(root+'/evidence/edx-wp2-s13/nonbrowser-files.txt','utf8').trim().split(/\r?\n/);
const excluded=files.filter(f=>/buildDistribution|build-distribution/.test(readFileSync(root+'/'+f,'utf8')));
const safe=files.filter(f=>!excluded.includes(f));
writeFileSync(prefix+'test-plan.json',JSON.stringify({explicit:files.length,unique:new Set(files).size,excluded,safe},null,2));
mkdirSync(prefix+'scratch',{recursive:true});
const suites={scoped:['tests/edx-wp2-s13-insert-text.test.mjs','tests/edx-wp2-s8-insert-image.test.mjs','tests/edx-wp2-s9-insert-image-file.test.mjs','tests/edx-wp2-s1-direct-text-edit.test.mjs'],nonbuild:safe};
for(const [name,list] of Object.entries(suites)){
 const log=prefix+name+'.log';const fd=openSync(log,'w');
 const result=spawnSync(process.execPath,['--test',...list],{cwd:root,stdio:['ignore',fd,fd],env:{...process.env,TMPDIR:prefix+'scratch',PATH:'/opt/homebrew/bin:'+process.env.PATH}});
 const output=readFileSync(log,'utf8');
 const summary={files:list.length,status:result.status,signal:result.signal,summary:output.split('\n').filter(l=>/^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)/.test(l)),namedPasses:(output.match(/^ok \d+ - /gm)||[]).length,log};
 writeFileSync(prefix+name+'-summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
}
