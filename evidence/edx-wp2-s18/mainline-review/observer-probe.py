from pathlib import Path
import sys,importlib.util,json,tempfile,time,errno
from unittest.mock import patch
root=Path('/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical');core=Path('/Users/matt/ai-core/scripts');sys.path.insert(0,str(core));sys.dont_write_bytecode=True
import tmp_artifact_lifecycle as lifecycle
s=importlib.util.spec_from_file_location('s18observer',root/'evidence/edx-wp2-s18/resource-observer.py');obs=importlib.util.module_from_spec(s);s.loader.exec_module(obs)
with tempfile.TemporaryDirectory(prefix='pptskill-s18-review-',dir='/private/tmp') as td:
 p=Path(td)
 for n in range(256):(p/str(n)).write_bytes(b'a'*16)
 observer=obs.ResourceObserver(core/'tmp_artifact_lifecycle.py');measure={}
 for enabled in [False,True]:
  if enabled:sys.settrace(observer.trace)
  begin=time.monotonic()
  try:
   for n in range(30):assert lifecycle.scan_resource_artifacts(p)==(4096,256)
  finally:sys.settrace(None)
  measure[str(enabled)]=(time.monotonic()-begin)/30*1000
 assert not observer.events
 original=OSError(errno.EIO,'synthetic-review','owned-entry')
 sys.settrace(observer.trace)
 try:
  with patch.object(lifecycle.os,'scandir',side_effect=original):
   try:lifecycle.scan_resource_artifacts(p)
   except lifecycle.LifecycleError as e:
    assert e.__cause__ is original;assert str(e)=='NO_GO: resource observation unknown (I/O failure)';message=str(e)
   else:raise AssertionError('must fail closed')
 finally:sys.settrace(None)
 assert len(observer.events)==1 and observer.events[0]['errno']==errno.EIO and observer.events[0]['filename']=='owned-entry'
 print(json.dumps({'status':'PASS','synthetic':True,'measuredFixtureFiles':256,'meanScanMs':measure,'exceptionCausePreserved':True,'errorMessage':message,'observed':observer.events,'scope':'不是browser workload、不證明production overhead或歷史I/O根因'},ensure_ascii=False,indent=2))
