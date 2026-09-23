from pathlib import Path
import json,hashlib,subprocess,re,gzip,struct,zipfile,collections
r=Path('/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical');e=r/'evidence/edx-wp2-s15';h=e/'host-pointer-repair';sha=lambda b:hashlib.sha256(b).hexdigest()
m=json.loads((e/'source-hashes.json').read_text());c=json.loads((h/'controller-receipt.json').read_text());assert c['status']=='PASS'
for k in ['readinessExit','insertTextUiExit','pgqExit','browserCloseExit','supervisorExit']:assert c[k]==0,k
assert not Path(c['ownedRoot']).exists();common=Path(subprocess.check_output(['git','rev-parse','--path-format=absolute','--git-common-dir'],cwd=r,text=True).strip());assert not(common/'.ai-core-tmp-artifact-isolation.json').exists()
for group in ['sources','protected']:
 for p,d in m[group].items():assert sha((r/p).read_bytes())==d,p
z=m['distribution'];b=(r/z['path']).read_bytes();assert len(b)==z['bytes'] and sha(b)==z['sha256']
with zipfile.ZipFile(r/z['path']) as archive:
 for p in [p for p in m['sources'] if p.startswith('runtime/')]:
  names=[n for n in archive.namelist() if n==p or n.endswith('/'+p)];assert len(names)==1 and archive.read(names[0])==(r/p).read_bytes()
a=json.loads((h/'insert-text-ui/acceptance.json').read_text());assert a['status']=='pass';assert sha(Path(a['sourcePath']).read_bytes())==a['sourceSha256'];assert {(v['width'],v['height']) for v in a['runs']}=={(1280,720),(1600,900)}
viewports=[];artifacts=0;screens=[]
for v in a['runs']:
 assert v['status']=='pass' and v['targetClosed']
 for k in ['console','pageErrors','networkFailures','httpErrors','remoteRequests']:assert v[k]==[]
 checks=[x for x in v['checks'] if isinstance(x,dict)];groups=dict(collections.Counter('wp2s15' if isinstance(x,dict) and 'wp2s15' in x else 'base' for x in v['checks']))
 assert groups['base']==10 and groups.get('wp2s15',0)==38 and len(v['checks'])==48
 records=[x for x in checks if 'wp2s15' in x]
 resize=[x for x in records if x['wp2s15']=='offline 新文字真 pointer resize'];assert len(resize)==1
 p=resize[0]['pointerEvidence'];assert len(p)==2 and all(x['trusted'] for x in p) and p[1]['x']-p[0]['x']==p[1]['y']-p[0]['y']==resize[0]['delta']
 viewports.append({'width':v['width'],'height':v['height'],'records':len(v['checks']),'groups':groups,'errorsZero':True,'targetClosed':True,'s15Records':records})
 for f in v['artifacts']:
  if isinstance(f,dict):
   b=Path(f['path']).read_bytes();assert len(b)==f['bytes'] and sha(b)==f['sha256'];artifacts+=1
 for p in sorted((h/'insert-text-ui').glob(str(v['width'])+'-*.png')):
  b=p.read_bytes();assert b[:8]==b'\x89PNG\r\n\x1a\n';dim=struct.unpack('>II',b[16:24])
  if dim==(v['width'],v['height']):screens.append({'path':str(p.relative_to(r)),'sha256':sha(b),'bytes':len(b),'dimensions':dim})
pgq=(h/'pgq.log').read_text();names=re.findall(r'^✔ (.+) \([0-9.]+ms\)$',pgq,re.M);assert len(names)==len(set(names))==16
for k,n in [('tests',16),('pass',16),('fail',0),('cancelled',0),('skipped',0)]:assert re.search(r'ℹ '+k+r' '+str(n)+r'\b',pgq),k
nb=json.loads((e/'nonbrowser-summary.json').read_text());assert nb['summary']['tests']==nb['summary']['pass'] and nb['summary']['fail']==0 and nb['files']==72
logs=[]
for p in sorted(e.rglob('*')):
 if p.suffix not in ['.log','.stdout','.stderr']:continue
 b=p.read_bytes();g=Path(str(p)+'.gz')
 if not g.exists():g.write_bytes(gzip.compress(b,mtime=0))
 raw=gzip.decompress(g.read_bytes());logs.append({'path':str(p.relative_to(e)),'rawSha256':sha(raw),'gzipSha256':sha(g.read_bytes())});p.write_text('\n'.join(line.rstrip() for line in b.decode().splitlines()).rstrip()+ ('\n' if b.strip() else ''))
(e/'raw-log-hashes.json').write_text(json.dumps(logs,ensure_ascii=False,indent=2)+'\n')
v={'status':'PASS','productSha':m['productSha'],'sources':len(m['sources']),'protected':len(m['protected']),'distribution':z,'zipRuntimeByteMatch':True,'fullNonbrowserPass':nb['summary']['pass'],'viewports':viewports,'artifactHashesMatched':artifacts,'screenshots':screens,'pgqUniqueNamedCases':names,'pgqSingleRunPass':16,'cleanup':'PASS','limitations':['Native dialog文字插入UI；component仍非direct contenteditable；IME為synthetic lifecycle，不宣稱OS輸入實測','固定插入geometry非自動避障；S8歷史I/O根因未知','Independent Review pending，未merge/push/deploy S15']}
(e/'host-final-verification.json').write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v[k] for k in ['status','productSha','sources','protected','fullNonbrowserPass','artifactHashesMatched','pgqSingleRunPass','cleanup']},ensure_ascii=False));print(json.dumps([{k:x[k] for k in ['width','height','records','groups']} for x in viewports]))
