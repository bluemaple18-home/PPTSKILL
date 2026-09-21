import importlib.util, unittest, tempfile, os, json, io, signal
from pathlib import Path
from unittest.mock import patch, MagicMock
from contextlib import contextmanager, ExitStack, redirect_stderr
ROOT=Path('/Users/matt/ai-core')
spec=importlib.util.spec_from_file_location('review_tests', ROOT/'tests/test_tmp_artifact_lifecycle.py')
t=importlib.util.module_from_spec(spec); spec.loader.exec_module(t)
m=t.MODULE
names=[n for n in dir(t.TmpArtifactLifecycleTests) if n.startswith(('test_scan_', 'test_owned_browser_scan_', 'test_large_profile_scan_', 'test_default_profile_scan_', 'test_runtime_budget_reason_', 'test_runtime_budget_both_', 'test_runtime_unknown_reasons_'))]
# 所選測試皆為獨立 scanner fixture；略過會建立 git commit 的共用 setup。
with patch.object(t.TmpArtifactLifecycleTests,'setUp',lambda self: None):
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(t.TmpArtifactLifecycleTests(n) for n in names))
assert result.wasSuccessful()
limits={'max_bytes':67108864,'max_file_count':10000,'ttl_seconds':100}
with tempfile.TemporaryDirectory(dir='/tmp') as d:
 root=Path(d); (root/'.tmp-artifact-manifest.json').write_text(json.dumps({'browser_layout':True,'purpose':'browser-session'}))
 with patch.object(m.time,'monotonic',side_effect=(0,.2)):
  reason=m.sample_resource_budget(root,limits)
 assert 'timeout_ms=100.000' in reason
 print('metadata_without_registration:',reason)
 with patch.dict(m.OWNED_ROOTS,{str(root):{'browser_layout':True}}):
  for operation in ('open','scandir','close'):
   with patch.object(m.os,operation,side_effect=OSError('probe')):
    # close failure 以真實 close 後再拋錯，避免 probe 自身留下 descriptor。
    if operation=='close': continue
    assert 'I/O failure' in m.sample_resource_budget(root,limits)
  with patch.object(m.time,'monotonic',side_effect=(0,5.0)):
   assert 'phase=before_stat' in m.sample_resource_budget(root,limits)
 print('registered_browser_io_and_exact_deadline: PASS')
with tempfile.TemporaryDirectory(dir='/tmp') as d:
 root=Path(d); (root/'a').write_bytes(b''); (root/'b').write_bytes(b'')
 clock=[0.]; scans=[0]; onset=[]; sends=[]; real_scandir=m.os.scandir
 @contextmanager
 def timed_scandir(fd):
  scans[0]+=1; current=scans[0]
  with real_scandir(fd) as it:
   entries=sorted(it,key=lambda e:e.name)
   def generate():
    for i,e in enumerate(entries):
     if current==1 and i==1:
      onset.append(clock[0]); (root/'a').write_bytes(b'xx'); clock[0]+=4.8
     elif current==2 and i==0: clock[0]+=4.8
     yield e
   yield generate()
 controller=m.SignalController(); controller.send=lambda sig:sends.append((sig,clock[0])); controller.attach=lambda pg:None; controller.detach=lambda:None
 process=MagicMock(); process.pid=123; process.wait.return_value=0
 anchor=MagicMock(); anchor.process_group=123
 with ExitStack() as stack:
  for obj,name,value in [(m.time,'monotonic',lambda:clock[0]),(m.time,'sleep',lambda n:clock.__setitem__(0,clock[0]+n)),(m.os,'scandir',timed_scandir),(m.subprocess,'Popen',lambda *a,**k:process),(m,'ChildExitObserver',lambda pid:MagicMock()),(m,'process_group_anchor',lambda *a:anchor),(m,'child_exited_without_reaping',lambda *a:False),(m,'wait_for_process_group',lambda *a:True)]: stack.enter_context(patch.object(obj,name,value))
  stack.enter_context(patch.dict(m.OWNED_ROOTS,{str(root):{'browser_layout':True}}))
  log=io.StringIO()
  with redirect_stderr(log): code=m.run_child(['fake'],{},controller,(root,{'max_bytes':1,'max_file_count':10,'ttl_seconds':100}))
 assert code==2 and scans[0]==2 and sends[0][1]-onset[0]>10
 print('two_scan_detection_delay:',json.dumps({'onset':onset[0],'term':sends[0][1],'delay':sends[0][1]-onset[0],'scans':scans[0],'reason':log.getvalue().strip()}))
print('ALL REVIEW PROBES PASSED')
for scenario in ('ttl','signal','child_exit'):
 clock=[0.]; sends=[]; exited=[False]; controller=m.SignalController()
 process=MagicMock(); process.pid=123; process.wait.return_value=7 if scenario=='child_exit' else 0
 anchor=MagicMock(); anchor.process_group=123; waits=[0]
 def sample(*args):
  if scenario=='signal': controller._handle_signal(signal.SIGTERM,None)
  clock[0]+=4.9
  if scenario=='child_exit': exited[0]=True
  return 'NO_GO: simulated scan stop' if scenario=='child_exit' else None
 def wait(*args):
  waits[0]+=1
  if scenario=='signal' and waits[0]==1: clock[0]+=args[-1]; return False
  return True
 with ExitStack() as stack:
  for obj,name,value in [(m.time,'monotonic',lambda:clock[0]),(m.time,'sleep',lambda n:clock.__setitem__(0,clock[0]+n)),(m.subprocess,'Popen',lambda *a,**k:process),(m,'ChildExitObserver',lambda pid:MagicMock()),(m,'process_group_anchor',lambda *a:anchor),(m,'child_exited_without_reaping',lambda *a:exited[0]),(m,'wait_for_process_group',wait),(m,'sample_resource_budget',sample),(m.os,'killpg',lambda pg,sig:sends.append((sig,clock[0])))]: stack.enter_context(patch.object(obj,name,value))
  with redirect_stderr(io.StringIO()): code=m.run_child(['fake'],{},controller,(Path('/tmp'),{'ttl_seconds':1 if scenario=='ttl' else 100}))
 if scenario=='ttl': assert code==2 and sends[0][1]==4.95
 if scenario=='signal': assert code==143 and sends==[(signal.SIGTERM,0.),(signal.SIGKILL,5.9)]
 if scenario=='child_exit': assert code==7 and not sends
 print('supervisor_'+scenario+':',json.dumps({'code':code,'signals':sends,'elapsed':clock[0]}))
with tempfile.TemporaryDirectory(dir='/tmp') as d:
 root=Path(d); (root/'a').write_bytes(b'a'); real_close=m.os.close
 def fail_close(fd): real_close(fd); raise OSError('close probe')
 with patch.dict(m.OWNED_ROOTS,{str(root):{'browser_layout':True}}), patch.object(m.os,'close',fail_close):
  assert 'I/O failure' in m.sample_resource_budget(root,limits)
 print('registered_browser_final_close_io: PASS')
with tempfile.TemporaryDirectory(dir='/tmp') as d:
 root=Path(d)
 for i in range(1025): (root/str(i)).mkdir()
 ticks=iter([0.]+[0.]*1024+[5.])
 with patch.dict(m.OWNED_ROOTS,{str(root):{'browser_layout':True}}), patch.object(m.time,'monotonic',side_effect=lambda:next(ticks)):
  reason=m.sample_resource_budget(root,{'max_bytes':1,'max_file_count':0})
 assert 'reasons=deadline,entries' in reason
 print('simultaneous_deadline_entry:',reason)
