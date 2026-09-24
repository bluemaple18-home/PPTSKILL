import hashlib, json, os, pathlib, re, subprocess, time, traceback

repo = pathlib.Path(__file__).resolve().parents[2]
core = pathlib.Path('/Users/matt/ai-core')
out = repo / 'evidence/edx-core-2-group-lock/host-acceptance-06'
node = '/opt/homebrew/bin/node'
frozen = json.loads((repo / 'evidence/edx-core-2-group-lock/source-hashes.json').read_text())
def verify():
    result = {}
    for group in ('sources', 'protected'):
        result[group] = {p: hashlib.sha256((repo / p).read_bytes()).hexdigest() == h for p,h in frozen[group].items()}
        assert all(result[group].values()), group
    z = frozen['distribution']; b = (repo / z['path']).read_bytes()
    result['zip'] = {'bytes':len(b), 'sha256':hashlib.sha256(b).hexdigest()}
    assert result['zip'] == {'bytes':z['bytes'], 'sha256':z['sha256']}
    return result

def finish_supervisor(supervisor, endpoint, out, receipt):
    # log／CDP 任一失敗都不得跳過 owned supervisor 的有界收尾。
    try:
        if endpoint and supervisor and supervisor.poll() is None:
            close_js="const ws=new WebSocket(process.argv[1]); const t=setTimeout(()=>process.exit(2),8000); ws.addEventListener('open',()=>ws.send(JSON.stringify({id:1,method:'Browser.close'}))); ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id===1){clearTimeout(t);process.exit(m.error?1:0)}}); ws.addEventListener('error',()=>process.exit(3));"
            with (out/'browser-close.log').open('w') as log:
                receipt['browserCloseExit']=subprocess.run([node,'-e',close_js,endpoint],stdout=log,stderr=subprocess.STDOUT,timeout=10).returncode
    except Exception as error:
        receipt['browserCloseError']=repr(error)
    finally:
        if supervisor:
            try:
                try:
                    receipt['supervisorExit']=supervisor.wait(timeout=25)
                except subprocess.TimeoutExpired:
                    supervisor.terminate()
                    receipt['supervisorTerminated']=True
                    receipt['supervisorExit']=supervisor.wait(timeout=30)
            except Exception as error:
                receipt['cleanupError']=repr(error)


def check_diagnostic(path):
    record=json.loads(path.read_text())
    scanner=core/'scripts/tmp_artifact_lifecycle.py'
    expected=hashlib.sha256(scanner.read_bytes()).hexdigest()
    assert record['scanner']==str(scanner)
    assert record['scannerSha256Before']==record['scannerSha256After']==expected
    assert type(record['scanCallsObserved']) is int and record['scanCallsObserved']>0
    assert record['lineAndOpcodeTracing'] is False
    assert record['status']=='NO_IO_ERROR_OBSERVED' and record['errors']==[]
    return record


assert not os.environ.get('CODEX_SANDBOX'), 'host runtime 必須通過原生權限流程，不得改環境旗標'
before = verify()
out.mkdir(exist_ok=False)
receipt = {'hostSandbox':os.environ.get('CODEX_SANDBOX'), 'before':before, 'aiCoreCommit':subprocess.check_output(['git','-C',str(core),'rev-parse','HEAD'],text=True).strip()}
receipt['diagnosticPath'] = str(out/'resource-observation.json')
receipt['scope'] = 'Core 2 Group/Lock product acceptance'
supervisor = None; endpoint = None; owned = None
try:
    with (out/'launcher.stdout').open('w') as stdout, (out/'launcher.stderr').open('w') as stderr:
        supervisor = subprocess.Popen([str(core/'.venv/bin/python'),str(repo/'evidence/edx-wp2-s18/resource-observer.py'),'--diagnostic',str(out/'resource-observation.json'),str(core/'scripts/tmp_session.py'),'browser','--repo-root',str(repo),'--evidence-dir',str(out/'lifecycle'),'--browser-executable','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--url','about:blank'],stdout=stdout,stderr=stderr,cwd=repo)
    receipt['supervisorPid'] = supervisor.pid
    deadline = time.monotonic()+12
    portfile = None
    while time.monotonic()<deadline:
        if supervisor.poll() is not None:
            receipt['readinessExit']=27
            raise RuntimeError('readiness 前 supervisor 退出')
        for line in (out/'launcher.stdout').read_text().splitlines():
            try: event=json.loads(line)
            except ValueError: continue
            if event.get('event')=='browser-starting':
                portfile=pathlib.Path(event['devtools_active_port']); owned=portfile.parent.parent
        if portfile:
            try: lines=portfile.read_text().splitlines()
            except FileNotFoundError: lines=[]
            if len(lines)>=2 and lines[0].isdigit() and 0<int(lines[0])<65536 and re.fullmatch(r'/devtools/browser/[A-Za-z0-9-]+',lines[1]):
                endpoint='ws://127.0.0.1:'+lines[0]+lines[1]
                break
        time.sleep(.1)
    if not endpoint:
        receipt['readinessExit']=28
        raise RuntimeError('12 秒 readiness deadline 未完成')
    receipt['readinessExit']=0
    receipt['ownedRoot']=str(owned)
    env=os.environ.copy();env['PPTSKILL_DEVTOOLS_ACTIVE_PORT']=str(portfile)
    for key,args,limit in [
        ('groupBrowser',[node,'tools/edx-wp1-s4-browser-acceptance.mjs',str(out/'group-lock'),'--group-lock-regression'],900),
        ('pgq',[node,'--test','--test-concurrency=1','tests/pgq-wp4-s3-content-integrity.test.mjs','tests/pgq-wp4-s3-sample-approval.test.mjs','tests/pgq-wp4-s4-full-deck-qa.test.mjs','tests/pgq-wp4-s4-required-visibility.test.mjs'],1800)]:
        receipt[key+'Started']=True
        print(key+' started',flush=True)
        with (out/(key+'.log')).open('w') as log:
            run=subprocess.run(args,cwd=repo,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=limit)
        receipt[key+'Exit']=run.returncode
        print(key+' exit='+str(run.returncode),flush=True)
        if run.returncode: raise RuntimeError(key+' 驗收失敗；停止後續步驟')
except BaseException:
    receipt['error']=traceback.format_exc()
finally:
    finish_supervisor(supervisor, endpoint, out, receipt)
    try:
        receipt['ownedRootAbsent']=bool(owned) and not owned.exists()
        common=pathlib.Path(subprocess.check_output(['git','rev-parse','--path-format=absolute','--git-common-dir'],cwd=repo,text=True).strip())
        receipt['isolationMarkerAbsent']=not (common/'.ai-core-tmp-artifact-isolation.json').exists()
    except Exception:
        receipt['cleanupVerificationError']=traceback.format_exc()
    try: receipt['after']=verify()
    except Exception: receipt['integrityError']=traceback.format_exc()
    try:
        diagnostic=check_diagnostic(out/'resource-observation.json')
        receipt['diagnosticVerified']=True
        receipt['scanCallsObserved']=diagnostic['scanCallsObserved']
    except Exception:
        receipt['diagnosticError']=traceback.format_exc()
    receipt['status']='PASS' if all(receipt.get(k)==0 for k in ('readinessExit','groupBrowserExit','pgqExit','browserCloseExit','supervisorExit')) and receipt.get('ownedRootAbsent') and receipt.get('isolationMarkerAbsent') and receipt.get('diagnosticVerified') and 'after' in receipt and not any(k in receipt for k in ('error','browserCloseError','cleanupError','cleanupVerificationError','integrityError','diagnosticError')) else 'NOT_PASS'
    try:
        (out/'controller-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    except Exception as error:
        receipt['status']='NOT_PASS'
        receipt['receiptWriteError']=repr(error)
    print(json.dumps({k:v for k,v in receipt.items() if k not in ('before','after')},ensure_ascii=False),flush=True)
raise SystemExit(0 if receipt['status']=='PASS' else 1)
