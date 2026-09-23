from pathlib import Path
import json,hashlib,subprocess,re,gzip,struct,zipfile,collections
r=Path('/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical');e=r/'evidence/edx-wp2-s14';h=e/'host-harness-repair';sha=lambda b:hashlib.sha256(b).hexdigest()
m=json.loads((e/'source-hashes.json').read_text());c=json.loads((h/'controller-receipt.json').read_text());assert c['status']=='PASS'
for k in ['readinessExit','editTextComponentExit','pgqExit','browserCloseExit','supervisorExit']:assert c[k]==0,k
assert not Path(c['ownedRoot']).exists();common=Path(subprocess.check_output(['git','rev-parse','--path-format=absolute','--git-common-dir'],cwd=r,text=True).strip());assert not(common/'.ai-core-tmp-artifact-isolation.json').exists()
for group in ['sources','protected']:
 for p,d in m[group].items():assert sha((r/p).read_bytes())==d,p
z=m['distribution'];b=(r/z['path']).read_bytes();assert len(b)==z['bytes'] and sha(b)==z['sha256']
with zipfile.ZipFile(r/z['path']) as archive:
 for p in [p for p in m['sources'] if p.startswith('runtime/')]:
  names=[n for n in archive.namelist() if n==p or n.endswith('/'+p)];assert len(names)==1 and archive.read(names[0])==(r/p).read_bytes()
a=json.loads((h/'edit-text-component/acceptance.json').read_text());assert a['status']=='pass';assert sha(Path(a['sourcePath']).read_bytes())==a['sourceSha256'];assert {(v['width'],v['height']) for v in a['runs']}=={(1280,720),(1600,900)}
viewports=[];artifacts=0;screens=[]
for v in a['runs']:
 assert v['status']=='pass' and v['targetClosed']
 for k in ['console','pageErrors','networkFailures','httpErrors','remoteRequests']:assert v[k]==[]
 checks=[x for x in v['checks'] if isinstance(x,dict)];groups=dict(collections.Counter(next((s for s in ['wp2s14','wp2s13','wp2s8'] if s in x),'base') if isinstance(x,dict) else 'base' for x in v['checks']))
 assert groups['base']==10 and groups['wp2s8']==40 and groups['wp2s13']==13 and groups['wp2s14']==6
 s14=[x for x in checks if 'wp2s14' in x];assert len(s14)==6
 gestures=[x for x in s14 if x['wp2s14']=='real-pointer-preview-cancel'];assert {(x['snap'],x['kind']) for x in gestures}=={(a,b) for a in [False,True] for b in ['drag','resize']}
 assert all(x['noOpPreserved'] and x['invalidPreserved'] for x in gestures)
 final=[x for x in s14 if x['wp2s14']=='API-fixture-existing-new-crossslide-escape-setter-IME-offline'];assert len(final)==1 and final[0]['directEditable'] is False
 viewports.append({'width':v['width'],'height':v['height'],'records':len(v['checks']),'groups':groups,'errorsZero':True,'targetClosed':True,'s14Records':s14})
 for f in v['artifacts']:
  if isinstance(f,dict):
   b=Path(f['path']).read_bytes();assert len(b)==f['bytes'] and sha(b)==f['sha256'];artifacts+=1
 for p in sorted((h/'edit-text-component').glob(str(v['width'])+'-*.png')):
  b=p.read_bytes();assert b[:8]==b'\x89PNG\r\n\x1a\n';dim=struct.unpack('>II',b[16:24])
  if dim==(v['width'],v['height']):screens.append({'path':str(p.relative_to(r)),'sha256':sha(b),'bytes':len(b),'dimensions':dim})
pgq=(h/'pgq.log').read_text();names=re.findall(r'^✔ (.+) \([0-9.]+ms\)$',pgq,re.M);assert len(names)==len(set(names))==16
for k,n in [('tests',16),('pass',16),('fail',0),('cancelled',0),('skipped',0)]:assert re.search(r'ℹ '+k+r' '+str(n)+r'\b',pgq),k
nb=json.loads((e/'nonbrowser-summary.json').read_text());assert nb['summary']['tests']==nb['summary']['pass'] and nb['summary']['fail']==0 and nb['files']==71
logs=[]
for p in sorted(e.rglob('*')):
 if p.suffix not in ['.log','.stdout','.stderr']:continue
 b=p.read_bytes();g=Path(str(p)+'.gz')
 if not g.exists():g.write_bytes(gzip.compress(b,mtime=0))
 raw=gzip.decompress(g.read_bytes());logs.append({'path':str(p.relative_to(e)),'rawSha256':sha(raw),'gzipSha256':sha(g.read_bytes())});p.write_text('\n'.join(line.rstrip() for line in b.decode().splitlines()).rstrip()+ ('\n' if b.strip() else ''))
(e/'raw-log-hashes.json').write_text(json.dumps(logs,ensure_ascii=False,indent=2)+'\n')
v={'status':'PASS','productSha':m['productSha'],'sources':len(m['sources']),'protected':len(m['protected']),'distribution':z,'zipRuntimeByteMatch':True,'fullNonbrowserPass':nb['summary']['pass'],'viewports':viewports,'artifactHashesMatched':artifacts,'screenshots':screens,'pgqUniqueNamedCases':names,'pgqSingleRunPass':16,'cleanup':'PASS','limitations':['API-driven text-component edit-text；非新增contenteditable、文字toolbar、OSclipboard或原生IME驗收','固定插入geometry非自動避障；S8歷史I/O根因未知','Independent Review pending，未merge/push/deploy S14']}
(e/'host-final-verification.json').write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v[k] for k in ['status','productSha','sources','protected','fullNonbrowserPass','artifactHashesMatched','pgqSingleRunPass','cleanup']},ensure_ascii=False));print(json.dumps([{k:x[k] for k in ['width','height','records','groups']} for x in viewports]))
