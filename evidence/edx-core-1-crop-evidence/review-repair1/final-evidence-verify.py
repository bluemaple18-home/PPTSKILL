import pathlib,json,hashlib,subprocess,re,copy,struct
repo=pathlib.Path.cwd();b=repo/'evidence/edx-core-1-crop-evidence';out=pathlib.Path('/private/tmp/pptskill-core-crop-review-2db6185')
read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
fixed='2db6185d13a6713700d0186758b1261ff23b9d85';assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==fixed
frozen=read(b/'source-hashes.json');a=read(b/'host-acceptance-04/controller-receipt.json');r=read(b/'host-acceptance-05/controller-receipt.json');off=read(b/'host05-offline-verification.json')
exits=['readinessExit','pgqFailedExit','dialogVisualExit','browserCloseExit','supervisorExit'];flags=['ownedRootAbsent','isolationMarkerAbsent','diagnosticVerified'];errors=['error','browserCloseError','cleanupError','cleanupVerificationError','integrityError','diagnosticError','receiptWriteError'];zip_expected={k:frozen['distribution'][k] for k in ['bytes','sha256']}
def violations(x):
    result=[]
    for k in exits:
        if type(x.get(k)) is not int or x[k]!=0:result.append('exit:'+k)
    for k in flags:
        if x.get(k) is not True:result.append('flag:'+k)
    result.extend('error:'+k for k in errors if k in x)
    for phase in ['before','after']:
        p=x.get(phase,{})
        if p.get('zip')!=zip_expected:result.append('zip:'+phase)
        for group in ['sources','protected']:
            g=p.get(group,{})
            if set(g)!=set(frozen[group]) or not all(v is True for v in g.values()):result.append('hashes:'+phase+'/'+group)
    return result
fixtures=[]
def check(name,x,expected):
    actual=not violations(x);assert actual is expected,(name,violations(x));fixtures.append({'name':name,'expected':expected,'actual':actual})
check('host05 actual fields',r,True)
old_names=['readinessExit','cropBrowserExit','pgqExit','browserCloseExit','supervisorExit'];old_result=all(r.get(k)==0 for k in old_names);assert old_result is False and r['status']=='NOT_PASS';fixtures.append({'name':'old fields false negative','expected':False,'actual':old_result})
for k in exits:
    for v in ['MISSING',1,False]:
        x=copy.deepcopy(r)
        if v=='MISSING':x.pop(k)
        else:x[k]=v
        check(k+'/'+str(v),x,False)
for k in flags:
    x=copy.deepcopy(r);x[k]=False;check(k+'/false',x,False)
for k in errors:
    x=copy.deepcopy(r);x[k]='fault';check(k+'/present',x,False)
for phase in ['before','after']:
    for group in ['sources','protected']:
        x=copy.deepcopy(r);x[phase][group]={};check(phase+'/'+group+'/missing',x,False)
    x=copy.deepcopy(r);x[phase]['zip']['sha256']='bad';check(phase+'/zip/bad',x,False)
check('host04 remains rejected',a,False);assert len(fixtures)==34
controller=(b/'host-controller-05.py').read_text();assert "('readinessExit','cropBrowserExit','pgqExit','browserCloseExit','supervisorExit')" in controller;assert "receipt[key+'Exit']=run.returncode" in controller;assert "('pgqFailed',[node,'--test','--test-concurrency=1','tests/pgq-wp4-s4-required-visibility.test.mjs']" in controller;assert "('dialogVisual',[node,'evidence/edx-core-1-crop-evidence/dialog-visual-probe.mjs'" in controller;assert "raise SystemExit(0 if receipt['status']=='PASS' else 1)" in controller
assert sha(b/'host-controller-05.py')==off['rawControllerSha256'];assert sha(b/'host-acceptance-05/controller-receipt.json')==off['rawReceiptSha256'];assert off['textFixtureCount']==len(off['textFixtures'])==34
integrity={g:{p:sha(repo/p)==h for p,h in frozen[g].items()} for g in ['sources','protected']};assert all(all(g.values()) for g in integrity.values())
z=repo/frozen['distribution']['path'];assert {'bytes':z.stat().st_size,'sha256':sha(z)}==zip_expected
common=pathlib.Path(subprocess.check_output(['git','rev-parse','--path-format=absolute','--git-common-dir'],text=True).strip());marker=common/'.ai-core-tmp-artifact-isolation.json';assert not marker.exists();assert not pathlib.Path(r['ownedRoot']).exists();assert not pathlib.Path(a['ownedRoot']).exists()
d4=read(b/'host-acceptance-04/resource-observation.json');d5=read(b/'host-acceptance-05/resource-observation.json');assert d5['status']=='NO_IO_ERROR_OBSERVED' and d5['scanCallsObserved']==136 and d5['errors']==[];scanner=pathlib.Path(d5['scanner']);assert sha(scanner)==d5['scannerSha256Before']==d5['scannerSha256After'];assert d4['status']=='IO_ERROR_OBSERVED' and d4['scanCallsObserved']==608 and d4['errors'][0]['errno']==2;assert a['status']=='NOT_PASS' and a['supervisorExit']==2 and a['browserCloseExit']==3 and a['pgqExit']==1
corehead=subprocess.check_output(['git','-C','/Users/matt/ai-core','rev-parse','HEAD'],text=True).strip();assert corehead==a['aiCoreCommit']==r['aiCoreCommit']
pgq_files=['tests/pgq-wp4-s3-content-integrity.test.mjs','tests/pgq-wp4-s3-sample-approval.test.mjs','tests/pgq-wp4-s4-full-deck-qa.test.mjs','tests/pgq-wp4-s4-required-visibility.test.mjs'];expected=[]
for p in pgq_files:
    blob=subprocess.check_output(['git','show',fixed+':'+p]);assert (repo/p).read_bytes()==blob
    expected.extend(re.findall(r"\btest\(\s*['\"]([^'\"]+)['\"]",blob.decode()))
log4=(b/'host-acceptance-04/pgq.log').read_text();log5=(b/'host-acceptance-05/pgqFailed.log').read_text();names=lambda s,mark:re.findall(r'^'+mark+r' (.+) \([0-9.]+ms\)$',s,re.M);passed4=names(log4,'✔');passed5=names(log5,'✔');failed4=set(names(log4,'✖'))
assert len(expected)==16 and len(set(expected))==16;assert len(passed4)==15 and len(passed5)==1 and set(passed4).isdisjoint(passed5);assert set(passed4+passed5)==set(expected);assert failed4==set(passed5);assert 'ℹ pass 15' in log4 and 'ℹ fail 1' in log4 and 'ℹ pass 1' in log5 and 'ℹ fail 0' in log5
visual=read(b/'host-acceptance-05/dialog/acceptance.json');assert visual['status']=='pass' and visual['targetClosed'] is True and visual['errors']==[];assert {(v['width'],v['height']) for v in visual['runs']}=={(1280,720),(1600,900)};imgs=[]
for run in visual['runs']:
    c=run['check'];assert run['status']=='pass' and c['open'] is True and c['focusInside'] is True and c['confirmDisabled'] is True and c['horizontalOverflow'] is False and c['controls']==21
    rect=c['rect'];assert rect['x']>=0 and rect['y']>=0 and rect['x']+rect['width']<=run['width'] and rect['y']+rect['height']<=run['height'];assert len(run['artifacts'])==2
    for art in run['artifacts']:
        p=pathlib.Path(art['path']);raw=p.read_bytes();assert len(raw)==art['bytes'] and sha(p)==art['sha256'];assert raw[:8]==b'\x89PNG\r\n\x1a\n';dims=struct.unpack('>II',raw[16:24]);assert dims==(run['width'],run['height']);imgs.append({'path':str(p),'sha256':sha(p),'dimensions':dims})
probe_source=(b/'dialog-visual-probe.mjs').read_text();assert "host-acceptance-04/crop/source.html" in probe_source and "c.value='evidence'" in probe_source
prior=read(out/'host04-evidence-check.json');assert prior['receiptSha256']==sha(b/'host-acceptance-04/crop/acceptance.json')
paths=['host-controller-05.py','host05-offline-verification.py','host05-offline-verification.json','host-acceptance-04/controller-receipt.json','host-acceptance-05/controller-receipt.json','host-acceptance-04/pgq.log','host-acceptance-05/pgqFailed.log','host-acceptance-04/resource-observation.json','host-acceptance-05/resource-observation.json','host-acceptance-05/dialog/acceptance.json']
result={'product':fixed,'decision':'GO with residual','reconciliation':'PASS, raw host05 NOT_PASS/exit1 retained; stale summary fields verified','independentTextFixtures':fixtures,'rawHost04Status':a['status'],'rawHost05Status':r['status'],'rawHost05ExitByControllerPredicate':1,'correctActualStepExits':{k:r[k] for k in exits},'host04RejectedByIndependentPredicate':violations(a),'hashes':integrity,'zip':zip_expected,'ownedRootsAbsent':True,'isolationMarkerAbsent':True,'scanner':{'sha256':sha(scanner),'host05Scans':136,'host05Errors':0,'host04Scans':608,'host04Errors':d4['errors']},'aiCoreHead':corehead,'pgq':{'expectedNamedCases':expected,'host04PassNames':passed4,'host04FailedNames':sorted(failed4),'host05SolePassName':passed5,'uniquePassCount':16,'composition':'15+1; not single-run 16'},'visual':{'viewports':2,'artifacts':imgs,'reviewerViewedScreenshots':True},'evidenceHashes':{p:sha(b/p) for p in paths},'freshBrowserExecution':False,'priorProductProbes':{'pass':9,'fail':2,'residual':'F2 OPEN P2'},'attributionCorrection':'Mainline relayed standing Owner AGENTS + model-role-routing policy; no new Owner Repair2 cost approval this round'}
(out/'final-evidence-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['independentTextFixtures','hashes','pgq','visual','evidenceHashes','host04RejectedByIndependentPredicate']},ensure_ascii=False));print('independent fixtures',len(fixtures),'PGQ',len(set(passed4+passed5)),'source',len(integrity['sources']),'protected',len(integrity['protected']),'PNG',len(imgs))
