from pathlib import Path
import json,hashlib,subprocess,re,gzip,struct,zipfile,collections,shutil
r=Path('/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical');e=r/'evidence/edx-wp2-s16';h=e/'host-snap-repair';sha=lambda b:hashlib.sha256(b).hexdigest()
m=json.loads((e/'source-hashes.json').read_text());c=json.loads((h/'controller-receipt.json').read_text());assert c['status']=='PASS'
for k in ['readinessExit','editTextUiExit','pgqExit','browserCloseExit','supervisorExit']:assert c[k]==0,k
assert not Path(c['ownedRoot']).exists();common=Path(subprocess.check_output(['git','rev-parse','--path-format=absolute','--git-common-dir'],cwd=r,text=True).strip());assert not(common/'.ai-core-tmp-artifact-isolation.json').exists()
for group in ['sources','protected']:
 for p,d in m[group].items():assert sha((r/p).read_bytes())==d,p
z=m['distribution'];b=(r/z['path']).read_bytes();assert len(b)==z['bytes'] and sha(b)==z['sha256']
with zipfile.ZipFile(r/z['path']) as archive:
 for p in [p for p in m['sources'] if p.startswith('runtime/')]:
  names=[n for n in archive.namelist() if n==p or n.endswith('/'+p)];assert len(names)==1 and archive.read(names[0])==(r/p).read_bytes()
a=json.loads((h/'edit-text-ui/acceptance.json').read_text());assert a['status']=='pass';assert sha(Path(a['sourcePath']).read_bytes())==a['sourceSha256'];assert {(v['width'],v['height']) for v in a['runs']}=={(1280,720),(1600,900)}
viewports=[];artifacts=0;screens=[]
for v in a['runs']:
 assert v['status']=='pass' and v['targetClosed']
 for k in ['console','pageErrors','networkFailures','httpErrors','remoteRequests']:assert v[k]==[]
 groups=dict(collections.Counter('wp2s16' if isinstance(x,dict) and 'wp2s16' in x else 'base' for x in v['checks']))
 assert groups=={'base':10,'wp2s16':32} and len(v['checks'])==42,groups
 records=[x for x in v['checks'] if isinstance(x,dict) and 'wp2s16' in x]
 for snap in ['false','true']:
  gs=[x for x in records if x['wp2s16']=='snap='+snap+' gesture preview取消、release不commit'];assert len(gs)==1
  assert any(x['type']=='pointerdown' and x['trusted'] and x['action']=='edit-selected-text' for x in gs[0]['pointerEvidence'])
  assert any(x['wp2s16']=='snap='+snap+' dialog正常儲存' for x in records)
 viewports.append({'width':v['width'],'height':v['height'],'records':len(v['checks']),'groups':groups,'errorsZero':True,'targetClosed':True,'s16Records':records})
 for f in v['artifacts']:
  if isinstance(f,dict):
   b=Path(f['path']).read_bytes();assert len(b)==f['bytes'] and sha(b)==f['sha256'];artifacts+=1
 for label in ['toolbar','dialog']:
  p=h/'edit-text-ui'/f"{v['width']}-s16-{label}.png";b=p.read_bytes();assert b[:8]==b'\x89PNG\r\n\x1a\n';dim=struct.unpack('>II',b[16:24]);assert dim==(v['width'],v['height']);screens.append({'path':str(p.relative_to(r)),'sha256':sha(b),'bytes':len(b),'dimensions':dim})
pgq=(h/'pgq.log').read_text();names=re.findall(r'^✔ (.+) \([0-9.]+ms\)$',pgq,re.M);assert len(names)==len(set(names))==16
for k,n in [('tests',16),('pass',16),('fail',0),('cancelled',0),('skipped',0)]:assert re.search(r'ℹ '+k+r' '+str(n)+r'\b',pgq),k
nb=json.loads((e/'nonbrowser-summary.json').read_text());assert nb['summary']['tests']==nb['summary']['pass']==821 and nb['summary']['fail']==0 and nb['files']==73
sc=(e/'scoped-snap-repair.log').read_text();assert re.search(r'ℹ tests 260\b',sc) and re.search(r'ℹ pass 260\b',sc) and re.search(r'ℹ fail 0\b',sc)
logs=[]
for p in sorted(e.rglob('*')):
 if p.suffix not in ['.log','.stdout','.stderr']:continue
 b=p.read_bytes();g=Path(str(p)+'.gz');assert not g.exists();g.write_bytes(gzip.compress(b,mtime=0));logs.append({'path':str(p.relative_to(e)),'rawSha256':sha(b),'gzipSha256':sha(g.read_bytes())});p.write_text('\n'.join(line.rstrip() for line in b.decode().splitlines()).rstrip()+ ('\n' if b.strip() else ''))
(e/'raw-log-hashes.json').write_text(json.dumps(logs,ensure_ascii=False,indent=2)+'\n')
v={'status':'PASS','productSha':m['productSha'],'sources':len(m['sources']),'protected':len(m['protected']),'distribution':z,'zipRuntimeByteMatch':True,'scopedPass':260,'fullNonbrowserPass':821,'viewports':viewports,'artifactHashesMatched':artifacts,'screenshots':screens,'pgqUniqueNamedCases':names,'pgqSingleRunPass':16,'cleanup':'PASS','limitations':['context dialog編輯，不是direct inline/contenteditable；IME僅synthetic CompositionEvent lifecycle，非OS IME','固定geometry不提供自動縮字／避障','Independent Review pending，未merge/push/deploy S16'],'history':['Worker usage limit中止，主線接續；原RED與中間FAIL保留','首輪1280在35records後gesture synthetic click FAIL；harness真pointer retry雙viewport39 PASS，但主線發現snap-on產品缺口後主動中止PGQ，cleanup PASS','snap regression RED及VM Array fixture scoped256/260、full817/821 FAIL保留；新產品修復後fresh260/821及final browser/PGQ驗收']}
(e/'host-final-verification.json').write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
for src,name in [('/private/tmp/pptskill-s16-host-controller.py','host-controller-initial.py'),('/private/tmp/pptskill-s16-host-pointer-retry.py','host-controller-pointer-retry.py'),('/private/tmp/pptskill-s16-host-snap-repair.py','host-controller-snap-repair.py'),('/private/tmp/pptskill-s16-verify-build.py','verify-build.py'),('/private/tmp/pptskill-s16-finalize.py','finalize-evidence.py')]:shutil.copyfile(src,e/name)
print(json.dumps({k:v[k] for k in ['status','productSha','sources','protected','scopedPass','fullNonbrowserPass','artifactHashesMatched','pgqSingleRunPass','cleanup']},ensure_ascii=False));print(json.dumps([{k:x[k] for k in ['width','height','records','groups']} for x in viewports]))
