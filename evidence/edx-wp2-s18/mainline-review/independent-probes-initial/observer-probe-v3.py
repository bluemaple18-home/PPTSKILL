"""S18 獨立 synthetic probes；不執行 tmp_session/controller 或真子程序。"""
import sys, pathlib, importlib.util, json, time, statistics, errno, signal, contextlib, io
from unittest.mock import patch, Mock
from types import SimpleNamespace
sys.dont_write_bytecode=True
REPO=pathlib.Path('/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical')
CORE=pathlib.Path('/Users/matt/ai-core/scripts')
OUT=pathlib.Path(__file__).parent
sys.path.insert(0,str(CORE))
import tmp_artifact_lifecycle as lc
spec=importlib.util.spec_from_file_location('s18_observer',REPO/'evidence/edx-wp2-s18/resource-observer.py')
obs=importlib.util.module_from_spec(spec);spec.loader.exec_module(obs)
results={}
root=OUT/'fixture';root.mkdir()
for i in range(512):(root/str(i)).write_bytes(b'xx')
limits={'max_bytes':67108864,'max_file_count':10000,'ttl_seconds':10}
lc.OWNED_ROOTS[str(root)]={'browser_layout':True}
def traced(observer,fn):
 old=sys.gettrace();sys.settrace(observer.trace)
 try:return fn()
 finally:sys.settrace(old)
o=obs.ResourceObserver(CORE/'tmp_artifact_lifecycle.py')
normal=traced(o,lambda:lc.scan_resource_artifacts(root,limits))
assert normal==(1024,512) and not o.events
results['normal']={'counts':normal,'events':list(o.events),'scans':o.scans}
# 不寫 AI Core；只在本程序替換 scanner 的 OS 依賴以注入 fixture。
with patch.object(lc.os,'scandir',side_effect=FileNotFoundError(errno.ENOENT,'synthetic','fixture-gone')):
 reason=traced(o,lambda:lc.sample_resource_budget(root,limits))
assert reason=='NO_GO: resource observation unknown (I/O failure)' and o.events[-1]['errno']==errno.ENOENT
results['scandir_failure']={'reason':reason,'events':o.events}
class Entry:
 name='vanished'
 def stat(self,**kwargs):raise PermissionError(errno.EACCES,'synthetic','vanished')
class Scan:
 def __enter__(self):return iter([Entry()])
 def __exit__(self,*args):return False
o2=obs.ResourceObserver(CORE/'tmp_artifact_lifecycle.py')
with patch.object(lc.os,'scandir',return_value=Scan()):
 reason=traced(o2,lambda:lc.sample_resource_budget(root,limits))
assert o2.events[0]['line']==1097 and o2.events[0]['entryName']=='vanished'
results['stat_failure']={'reason':reason,'events':o2.events}
# 真 scanner + 真 run_child，process/group 完全 mock，不產生程序、不送 signal。
controller=SimpleNamespace(first_signal=None,attach=Mock(),detach=Mock(),send=Mock())
process=Mock(pid=12345);process.wait.return_value=-signal.SIGKILL
stopobs=obs.ResourceObserver(CORE/'tmp_artifact_lifecycle.py')
with patch.object(lc.subprocess,'Popen',return_value=process),patch.object(lc,'ChildExitObserver'),patch.object(lc,'process_group_anchor',return_value=Mock()),patch.object(lc,'child_exited_without_reaping',return_value=False),patch.object(lc,'wait_for_process_group',side_effect=[False,True]),patch.object(lc.os,'scandir',side_effect=OSError(errno.EIO,'synthetic','bad-entry')),contextlib.redirect_stderr(io.StringIO()) as err:
 code=traced(stopobs,lambda:lc.run_child(['synthetic-never-spawned'],{},controller,(root,limits)))
assert code==2 and [int(c.args[0]) for c in controller.send.call_args_list]==[15,9]
results['resource_stop']={'code':code,'signals':[int(c.args[0]) for c in controller.send.call_args_list],'detach':controller.detach.call_count,'stderr':err.getvalue(),'errors':stopobs.events}
# 不呼叫 tmp_session：runpy stub 代表已完成原有 teardown 後的退出。
wrapper=[]
for exit_code in (0,2,143):
 for failure in (False,True):
  path=OUT/f'diagnostic-v3-{exit_code}-{failure}.json'
  oldargv=sys.argv[:];oldpath=sys.path[:];original_open=pathlib.Path.open;cleaned=[]
  def fake_run(*args,**kwargs):cleaned.append(True);raise SystemExit(exit_code)
  def fake_open(self,*args,**kwargs):
   if self==path and failure:raise OSError(errno.ENOSPC,'synthetic diagnostic disk full',str(self))
   return original_open(self,*args,**kwargs)
  sys.argv=['observer','--diagnostic',str(path),str(CORE/'tmp_session.py')]
  try:
   with patch.object(obs.runpy,'run_path',side_effect=fake_run),patch.object(pathlib.Path,'open',fake_open):obs.main()
  except BaseException as e:
   wrapper.append({'originalExit':exit_code,'injectedWriteFailure':failure,'outcome':type(e).__name__,'exit':e.code if isinstance(e,SystemExit) else 1,'context':type(e.__context__).__name__ if e.__context__ else None,'teardownStubCompleted':bool(cleaned),'errno':getattr(e,'errno',None),'traceRestored':sys.gettrace() is None})
  finally:sys.argv=oldargv;sys.path[:]=oldpath
assert all(w['teardownStubCompleted'] and w['traceRestored'] and w['outcome']==('OSError' if w['injectedWriteFailure'] else 'SystemExit') and w['exit']==(1 if w['injectedWriteFailure'] else w['originalExit']) for w in wrapper)
results['wrapper_finally']=wrapper
# 只觀測成本，不改 scanner 門檻。
bench={}
for mode in ('baseline','traced'):
 samples=[]
 for i in range(7):
  ob=obs.ResourceObserver(CORE/'tmp_artifact_lifecycle.py');t=time.perf_counter()
  value=lc.scan_resource_artifacts(root,limits) if mode=='baseline' else traced(ob,lambda:lc.scan_resource_artifacts(root,limits))
  samples.append((time.perf_counter()-t)*1000)
 bench[mode]={'samples_ms':samples,'median_ms':statistics.median(samples),'counts':value}
bench['ratio']=bench['traced']['median_ms']/bench['baseline']['median_ms'];results['performance']=bench
# 跨多輪失敗的錯誤物件地址不可當永久 identity。
o3=obs.ResourceObserver(CORE/'tmp_artifact_lifecycle.py');reasons=[]
def new_error(*args,**kwargs):raise OSError(errno.EIO,'synthetic',f'repeat-{i}')
with patch.object(lc.os,'scandir',new_error):
 for i in range(12):reasons.append(traced(o3,lambda:lc.sample_resource_budget(root,limits)))
results['repeated_errors']={'attempts':12,'scanCalls':o3.scans,'captured':len(o3.events),'allFailClosed':all(x==reason for x in reasons),'events':o3.events}
for p in root.iterdir():p.unlink()
root.rmdir();lc.OWNED_ROOTS.pop(str(root))
(OUT/'observer-results-v3.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(results,ensure_ascii=False,indent=2))
