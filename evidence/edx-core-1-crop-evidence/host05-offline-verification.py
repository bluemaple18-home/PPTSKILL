# 唯讀重算已完成的host05；保留原controller錯誤摘要，不啟動browser、不重寫舊receipt。
import copy, hashlib, json, pathlib, re, subprocess
base=pathlib.Path(__file__).resolve().parent
repo=base.parents[1]
read=lambda p:json.loads(p.read_text())
hash_bytes=lambda b:hashlib.sha256(b).hexdigest()
frozen=read(base/'source-hashes.json')
raw=read(base/'host-acceptance-05/controller-receipt.json')
exit_keys=('readinessExit','pgqFailedExit','dialogVisualExit','browserCloseExit','supervisorExit')
error_keys=('error','browserCloseError','cleanupError','cleanupVerificationError','integrityError','diagnosticError','receiptWriteError')
zip_expected={k:frozen['distribution'][k] for k in ('bytes','sha256')}
def evidence_predicate(r):
    if any(type(r.get(k)) is not int or r[k]!=0 for k in exit_keys):return False
    if any(r.get(k) is not True for k in ('ownedRootAbsent','isolationMarkerAbsent','diagnosticVerified')):return False
    if any(k in r for k in error_keys):return False
    for phase in ('before','after'):
        if r.get(phase,{}).get('zip')!=zip_expected:return False
        for group in ('sources','protected'):
            values=r.get(phase,{}).get(group,{})
            if set(values)!=set(frozen[group]) or any(v is not True for v in values.values()):return False
    return True
fixtures=[]
def check(name,r,expected):
    assert evidence_predicate(r) is expected,name
    fixtures.append(name)
check('實際host05新step names',raw,True)
old=all(raw.get(k)==0 for k in ('readinessExit','cropBrowserExit','pgqExit','browserCloseExit','supervisorExit'))
assert old is False and raw['status']=='NOT_PASS'
fixtures.append('原總結舊step names可重現false negative')
for k in exit_keys:
    for value in (None,1,False):
        r=copy.deepcopy(raw)
        if value is None:r.pop(k)
        else:r[k]=value
        check(k+'='+str(value),r,False)
for k in ('ownedRootAbsent','isolationMarkerAbsent','diagnosticVerified'):
    r=copy.deepcopy(raw);r[k]=False;check(k+' false',r,False)
for k in error_keys:
    r=copy.deepcopy(raw);r[k]='injected';check(k+' present',r,False)
for phase in ('before','after'):
    for group in ('sources','protected'):
        r=copy.deepcopy(raw);r[phase][group]={};check(phase+'/'+group+' missing',r,False)
    r=copy.deepcopy(raw);r[phase]['zip']['sha256']='invalid';check(phase+'/zip mismatch',r,False)
check('歷史host04不可被補驗器洗成PASS',read(base/'host-acceptance-04/controller-receipt.json'),False)
# 重核實體；不是只相信status或receipt布林值。
for group in ('sources','protected'):
    for p,h in frozen[group].items():assert hash_bytes((repo/p).read_bytes())==h,p
z=(repo/frozen['distribution']['path']).read_bytes()
assert {'bytes':len(z),'sha256':hash_bytes(z)}==zip_expected
assert not pathlib.Path(raw['ownedRoot']).exists()
common=pathlib.Path(subprocess.check_output(['git','rev-parse','--path-format=absolute','--git-common-dir'],cwd=repo,text=True).strip())
assert not (common/'.ai-core-tmp-artifact-isolation.json').exists()
diag=read(base/'host-acceptance-05/resource-observation.json')
assert diag['status']=='NO_IO_ERROR_OBSERVED' and diag['errors']==[] and diag['scanCallsObserved']>0
assert diag['scannerSha256Before']==diag['scannerSha256After']==hash_bytes(pathlib.Path(diag['scanner']).read_bytes())
log=(base/'host-acceptance-05/pgqFailed.log').read_text()
assert len(re.findall(r'^✔ ',log,re.M))==1 and re.search(r'ℹ pass 1\b',log) and re.search(r'ℹ fail 0\b',log)
visual=read(base/'host-acceptance-05/dialog/acceptance.json')
assert visual['status']=='pass' and visual['errors']==[] and visual['targetClosed']
assert {(r['width'],r['height']) for r in visual['runs']}=={(1280,720),(1600,900)}
for run in visual['runs']:
    assert run['status']=='pass' and run['check']['open'] and run['check']['focusInside'] and not run['check']['horizontalOverflow']
    for artifact in run['artifacts']:
        b=pathlib.Path(artifact['path']).read_bytes();assert len(b)==artifact['bytes'] and hash_bytes(b)==artifact['sha256']
result={'verifiedDecision':'PASS','rawControllerStatus':raw['status'],'rawControllerExit':1,'reason':'controller總結使用舊cropBrowserExit/pgqExit，實際步驟為pgqFailedExit/dialogVisualExit；原紀錄未改','realExitCodes':{k:raw[k] for k in exit_keys},'sourceCount':len(frozen['sources']),'protectedCount':len(frozen['protected']),'zip':zip_expected,'textFixtureCount':len(fixtures),'textFixtures':fixtures,'freshBrowserLaunch':False,'scanCalls':diag['scanCallsObserved'],'pgqFailedCasePass':1,'evidenceVisualViewports':2,'ownedCleanupRechecked':True,'rawControllerSha256':hash_bytes((base/'host-controller-05.py').read_bytes()),'rawReceiptSha256':hash_bytes((base/'host-acceptance-05/controller-receipt.json').read_bytes())}
(base/'host05-offline-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='textFixtures'},ensure_ascii=False))
