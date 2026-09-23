"""診斷修復的隔離故障測試；不啟 browser／程序，也不修改 AI Core。"""
import ast, contextlib, errno, hashlib, importlib.util, io, json
from pathlib import Path
import subprocess, sys, tempfile
from unittest.mock import Mock, patch

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
CORE = Path('/Users/matt/ai-core')
spec = importlib.util.spec_from_file_location('s18_observer_repair', HERE/'resource-observer.py')
observer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(observer)
# 只執行實體 controller 的函式定義；不執行入口與 Popen。
tree = ast.parse((HERE/'host-controller-diagnostic.py').read_text())
namespace = {'subprocess': subprocess, 'node': '/opt/homebrew/bin/node', 'core': CORE, 'json': json, 'hashlib': hashlib}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in {'finish_supervisor','check_diagnostic'}], type_ignores=[]), str(HERE/'host-controller-diagnostic.py'), 'exec'), namespace)
results = []
with tempfile.TemporaryDirectory(prefix='s18-diagnostic-probe-') as temporary:
    out = Path(temporary)
    # 寫 log 失敗、close 命令失敗及 timeout 皆仍到 supervisor.wait。
    for fault in ('none','log_open','log_write','close_raise','close_nonzero','wait_timeout','terminate_error'):
        supervisor = Mock(); supervisor.poll.return_value = None
        supervisor.wait.side_effect = [subprocess.TimeoutExpired('owned',25),0] if fault in ('wait_timeout','terminate_error') else None
        supervisor.wait.return_value = 0
        if fault == 'terminate_error': supervisor.terminate.side_effect = OSError(errno.EACCES,'synthetic')
        receipt = {}; original_open = Path.open
        def fake_open(path, *args, **kwargs):
            if fault == 'log_open' and path.name == 'browser-close.log': raise OSError(errno.ENOSPC,'synthetic')
            return original_open(path,*args,**kwargs)
        def fake_run(*args,**kwargs):
            if fault in ('log_write','close_raise'): raise OSError(errno.EIO,'synthetic output/close failure')
            return Mock(returncode=3 if fault == 'close_nonzero' else 0)
        with patch.object(Path,'open',fake_open), patch.object(subprocess,'run',fake_run):
            namespace['finish_supervisor'](supervisor,'ws://owned',out,receipt)
        assert supervisor.wait.call_count == (2 if fault == 'wait_timeout' else 1), (fault,receipt)
        if fault in ('log_open','log_write','close_raise'): assert 'browserCloseError' in receipt
        if fault == 'close_nonzero': assert receipt['browserCloseExit']==3
        if fault == 'terminate_error': assert 'cleanupError' in receipt
        results.append({'case':'teardown:'+fault,'pass':True,'receipt':receipt})
    # observer 的真 main/finally：正常／open／write／final-hash 故障。
    for code in (0,2,143):
        for fault in ('none','open','write','hash'):
            diagnostic = out/f'diagnostic-{code}-{fault}.json'
            oldargv=sys.argv[:]; oldpath=sys.path[:]; oldtrace=sys.gettrace()
            original_open=Path.open; original_bytes=Path.read_bytes; hash_reads=[]
            def fake_open(path,*args,**kwargs):
                if path == diagnostic and fault=='open': raise OSError(errno.ENOSPC,'synthetic')
                if path == diagnostic and fault=='write':
                    sink=Mock();sink.__enter__=Mock(return_value=sink);sink.__exit__=Mock(return_value=False);sink.write.side_effect=OSError(errno.EIO,'synthetic');return sink
                return original_open(path,*args,**kwargs)
            def fake_bytes(path):
                if path.name=='tmp_artifact_lifecycle.py':
                    hash_reads.append(True)
                    if fault=='hash' and len(hash_reads)==2: raise OSError(errno.EIO,'synthetic final hash')
                return original_bytes(path)
            try:
                sys.argv=['observer','--diagnostic',str(diagnostic),str(CORE/'scripts/tmp_session.py')]
                with patch.object(observer.runpy,'run_path',side_effect=SystemExit(code)), patch.object(Path,'open',fake_open), patch.object(Path,'read_bytes',fake_bytes), contextlib.redirect_stderr(io.StringIO()):
                    try: observer.main()
                    except SystemExit as error: actual=error.code
                assert actual==(74 if code==0 and fault!='none' else code),(code,fault,actual)
                assert sys.gettrace() is oldtrace
                results.append({'case':f'wrapper:{code}:{fault}','pass':True,'exit':actual})
            finally: sys.argv=oldargv;sys.path[:]=oldpath
    # 真 scanner 單次遞迴传播只記一次；跨次錯誤不得永久 id 去重。
    sys.path.insert(0,str(CORE/'scripts'))
    import tmp_artifact_lifecycle as lc
    fixture=out/'fixture';(fixture/'nested').mkdir(parents=True);(fixture/'nested/x').write_text('x')
    lc.OWNED_ROOTS[str(fixture)]={'browser_layout':True}
    ob=observer.ResourceObserver(CORE/'scripts/tmp_artifact_lifecycle.py')
    def traced(fn):
        previous=sys.gettrace();sys.settrace(ob.trace)
        try: return fn()
        finally: sys.settrace(previous)
    limits={'max_bytes':67108864,'max_file_count':10000,'ttl_seconds':10}
    for index in range(12):
        def fault_scandir(*args,**kwargs): raise OSError(errno.EIO,'synthetic',f'failure-{index}')
        with patch.object(lc.os,'scandir',fault_scandir): reason=traced(lambda:lc.sample_resource_budget(fixture,limits))
        assert reason=='NO_GO: resource observation unknown (I/O failure)'
    assert ob.scans==12 and len(ob.events)==12 and len({x['filename'] for x in ob.events})==12
    assert not ob.seen
    lc.OWNED_ROOTS.pop(str(fixture))
    results.append({'case':'scanner:12-independent-errors','pass':True,'scans':ob.scans,'captured':len(ob.events)})
    # controller 不只看 supervisor exit0；缺少／不完整診斷必須拒絕。
    target=CORE/'scripts/tmp_artifact_lifecycle.py';digest=hashlib.sha256(target.read_bytes()).hexdigest()
    valid={'status':'NO_IO_ERROR_OBSERVED','scanner':str(target),'scannerSha256Before':digest,'scannerSha256After':digest,'scanCallsObserved':1,'errors':[],'lineAndOpcodeTracing':False}
    for fault in ('none','missing','invalid','zero_scan','hash','io_error'):
        path=out/f'verify-{fault}.json'; record=dict(valid)
        if fault=='zero_scan':record['scanCallsObserved']=0
        if fault=='hash':record['scannerSha256After']='mismatch'
        if fault=='io_error':record.update(status='IO_ERROR_OBSERVED',errors=[{'errno':5}])
        if fault!='missing':path.write_text('invalid' if fault=='invalid' else json.dumps(record))
        accepted=True
        try: namespace['check_diagnostic'](path)
        except (AssertionError,OSError,ValueError,KeyError): accepted=False
        assert accepted==(fault=='none')
        results.append({'case':'diagnostic:'+fault,'pass':True,'accepted':accepted})
print(json.dumps({'status':'PASS','cases':len(results),'browserLaunches':0,'results':results},ensure_ascii=False,indent=2))
