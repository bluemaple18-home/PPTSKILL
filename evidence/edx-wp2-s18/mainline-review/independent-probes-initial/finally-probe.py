"""只重現 finally 的先後順序；不載入、不呼叫任一 host controller。"""
import json, pathlib, errno
from unittest.mock import Mock, patch
out=pathlib.Path(__file__).parent
supervisor=Mock();supervisor.poll.return_value=None
receipt={}
try:
    # 對應 diagnostic controller 65–77：log open 在 wait/terminate 前，且位於其 try 外。
    if supervisor and supervisor.poll() is None:
        with patch.object(pathlib.Path,'open',side_effect=OSError(errno.ENOSPC,'synthetic log sink full')):
            with (out/'synthetic-never-created.log').open('w') as log:
                receipt['browserCloseExit']=0
    if supervisor:
        supervisor.wait(timeout=25)
except OSError as error:
    result={'synthetic':True,'controllerInvoked':False,'error':str(error),'waitCalls':supervisor.wait.call_count,'terminateCalls':supervisor.terminate.call_count,'receiptAfterBlock':receipt}
assert result['waitCalls']==0 and result['terminateCalls']==0
(out/'finally-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
