"""原 Reviewer 的 bounded repair probes；不執行 controller 或 tmp_session 真入口。"""
import ast, contextlib, errno, hashlib, importlib.util, io, json, pathlib, subprocess, sys
from unittest.mock import Mock, patch
sys.dont_write_bytecode=True
OUT=pathlib.Path(__file__).parent
REPO=pathlib.Path('/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical')
HERE=REPO/'evidence/edx-wp2-s18';CORE=pathlib.Path('/Users/matt/ai-core')
spec=importlib.util.spec_from_file_location('independent_s18_observer',HERE/'resource-observer.py')
obmod=importlib.util.module_from_spec(spec);spec.loader.exec_module(obmod)
tree=ast.parse((HERE/'host-controller-diagnostic.py').read_text())
ns={'subprocess':subprocess,'node':'never-launch','core':CORE,'json':json,'hashlib':hashlib}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ('finish_supervisor','check_diagnostic')],type_ignores=[]),str(HERE/'host-controller-diagnostic.py'),'exec'),ns)
results=[]
# F1 額外 fault：close 逾時、log close 失敗、第二次wait逾時、無endpoint。
for fault in ('close_timeout','sink_close','second_wait_timeout','no_endpoint'):
 supervisor=Mock();supervisor.poll.return_value=None;supervisor.wait.return_value=0
 if fault=='second_wait_timeout':supervisor.wait.side_effect=[subprocess.TimeoutExpired('mock',25),subprocess.TimeoutExpired('mock',30)]
 receipt={}
 class Sink:
  def __enter__(self):return self
  def __exit__(self,*args):
   if fault=='sink_close':raise OSError(errno.EIO,'synthetic close sink')
 def fake_run(*args,**kwargs):
  if fault=='close_timeout':raise subprocess.TimeoutExpired('mock',10)
  return Mock(returncode=0)
 with patch.object(pathlib.Path,'open',return_value=Sink()),patch.object(subprocess,'run',side_effect=fake_run),patch.object(subprocess,'Popen',side_effect=AssertionError('禁止 spawn')):
  ns['finish_supervisor'](supervisor,None if fault=='no_endpoint' else 'synthetic',OUT,receipt)
 assert supervisor.wait.call_args_list[0].kwargs=={'timeout':25}
 if fault=='second_wait_timeout':
  assert supervisor.wait.call_count==2 and supervisor.wait.call_args_list[1].kwargs=={'timeout':30} and supervisor.terminate.call_count==1 and 'cleanupError' in receipt
 if fault in ('close_timeout','sink_close'):assert 'browserCloseError' in receipt
 results.append({'case':'F1:'+fault,'pass':True,'waitCalls':supervisor.wait.call_count,'receipt':receipt})
# F2：原正常return、SystemExit(None)、普通例外與KeyboardInterrupt；也測stderr自身故障。
for outcome in ('return','exit_none','runtime_error','keyboard_interrupt'):
 for sink_failure in (False,True):
  d=OUT/f'independent-{outcome}-{sink_failure}.json';oldargv=sys.argv[:];oldpath=sys.path[:];oldtrace=sys.gettrace();original_open=pathlib.Path.open
  original=RuntimeError('original') if outcome=='runtime_error' else KeyboardInterrupt('original') if outcome=='keyboard_interrupt' else SystemExit(None) if outcome=='exit_none' else None
  def runner(*args,**kwargs):
   if original is not None:raise original
   return {}
  def fake_open(path,*args,**kwargs):
   if path==d and sink_failure:raise OSError(errno.ENOSPC,'synthetic')
   return original_open(path,*args,**kwargs)
  stderr=Mock();stderr.write.side_effect=OSError(errno.EIO,'stderr unavailable')
  try:
   sys.argv=['observer','--diagnostic',str(d),str(CORE/'scripts/tmp_session.py')]
   caught=None
   with patch.object(obmod.runpy,'run_path',side_effect=runner),patch.object(pathlib.Path,'open',fake_open),patch.object(sys,'stderr',stderr):
    try:obmod.main()
    except BaseException as e:caught=e
   assert sys.gettrace() is oldtrace
   if sink_failure and outcome in ('return','exit_none'):assert isinstance(caught,SystemExit) and caught.code==74
   elif original is None:assert caught is None
   else:assert caught is original
   results.append({'case':f'F2:{outcome}:sink_failure={sink_failure}','pass':True,'outcome':type(caught).__name__ if caught else 'return','code':getattr(caught,'code',None)})
  finally:sys.argv=oldargv;sys.path[:]=oldpath
# F3 真scanner遞迴：兩次獨立scan各在第二層scandir拋錯，各只記一個事件。
sys.path.insert(0,str(CORE/'scripts'));import tmp_artifact_lifecycle as lc
fixture=OUT/'recursive-fixture';(fixture/'nested').mkdir(parents=True)
lc.OWNED_ROOTS[str(fixture)]={'browser_layout':True};observer=obmod.ResourceObserver(CORE/'scripts/tmp_artifact_lifecycle.py');real_scandir=lc.os.scandir
for i in range(2):
 calls=[0]
 def scandir(fd):
  calls[0]+=1
  if calls[0]==2:raise OSError(errno.EIO,'synthetic nested',f'nested-{i}')
  return real_scandir(fd)
 oldtrace=sys.gettrace()
 with patch.object(lc.os,'scandir',scandir):
  sys.settrace(observer.trace)
  try:reason=lc.sample_resource_budget(fixture,{'max_bytes':67108864,'max_file_count':10000})
  finally:sys.settrace(oldtrace)
 assert reason=='NO_GO: resource observation unknown (I/O failure)' and not observer.seen
assert observer.scans==2 and len(observer.events)==2 and [e['filename'] for e in observer.events]==['nested-0','nested-1']
assert all(e['relativeDirectory']==['nested'] for e in observer.events)
results.append({'case':'F3:nested-propagation-and-independent-scans','pass':True,'scans':observer.scans,'events':observer.events})
(fixture/'nested').rmdir();fixture.rmdir();lc.OWNED_ROOTS.pop(str(fixture))
# 診斷record欄位fail closed。
scanner=CORE/'scripts/tmp_artifact_lifecycle.py';digest=hashlib.sha256(scanner.read_bytes()).hexdigest()
valid={'status':'NO_IO_ERROR_OBSERVED','scanner':str(scanner),'scannerSha256Before':digest,'scannerSha256After':digest,'scanCallsObserved':1,'errors':[],'lineAndOpcodeTracing':False}
for field,value in [('scanner','wrong'),('scanCallsObserved',True),('lineAndOpcodeTracing',True),('scannerSha256Before','wrong'),('errors',[{'errno':5}])]:
 record={**valid,field:value};path=OUT/f'invalid-{field}.json';path.write_text(json.dumps(record));rejected=False
 try:ns['check_diagnostic'](path)
 except (AssertionError,KeyError,ValueError,OSError):rejected=True
 assert rejected;results.append({'case':'diagnostic-reject:'+field,'pass':True})
# 只擷取controller的status運算式；不執行其入口／finally其他副作用。
status_node=next(n for n in ast.walk(tree) if isinstance(n,ast.Assign) and len(n.targets)==1 and ast.unparse(n.targets[0])=="receipt['status']")
status_code=compile(ast.Expression(status_node.value),'<controller-status-expression>','eval')
good={k:0 for k in ('readinessExit','deleteElementExit','pgqExit','browserCloseExit','supervisorExit')};good.update(ownedRootAbsent=True,isolationMarkerAbsent=True,diagnosticVerified=True,after={})
for fault in ('none','missing_diagnostic','false_diagnostic','diagnosticError','cleanupError','browserCloseError','integrityError','cleanupVerificationError'):
 receipt=dict(good)
 if fault=='missing_diagnostic':receipt.pop('diagnosticVerified')
 elif fault=='false_diagnostic':receipt['diagnosticVerified']=False
 elif fault!='none':receipt[fault]='synthetic'
 status=eval(status_code,{'receipt':receipt})
 assert status==('PASS' if fault=='none' else 'NOT_PASS')
 results.append({'case':'controller-status:'+fault,'pass':True,'status':status})
summary={'status':'PASS','cases':len(results),'controllerEntryExecuted':False,'tmpSessionEntryExecuted':False,'browserLaunches':0,'results':results}
(OUT/'independent-results.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps(summary,ensure_ascii=False,indent=2))
