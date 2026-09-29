"""Reviewer A：凍結 mapping 離線測試；fixtures 僅放自身 evidence 前綴。"""
import errno
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
paths = [HERE / name for name in ('host-client-owned-group.py', 'host-controller-owned-group.py', 'host-controller-owned-group-test.py', 'host-controller-owned-group-manifest.json')]
def hashes():
    return {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
before = hashes()
worker = json.loads((HERE / 'host-controller-owned-group-worker-receipt.json').read_text())
assert all(before[name] == record['sha256'] for name, record in worker['files'].items())
spec = importlib.util.spec_from_file_location('review_a_owned_group_tests', paths[2])
tests = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tests)
U = tests.U
original_temporary = tempfile.TemporaryDirectory
def evidence_fixture(*args, **kwargs):
    return original_temporary(dir=HERE, prefix='host-owned-group-review-a-fixture-')

def extra_probes():
    helper = tests.ClientTests()
    results = {}
    with patch.object(U.checks.legacy, 'check_browser_receipt'):
        pass
    # 復用已讀的純 mock flow，在 ordinary 返回邊界注入錯誤。
    real_ordinary = U.ordinary
    def bad_receipt(key_error):
        def ordinary(command, timeout, env, group, log, receipt, key):
            code = real_ordinary(command, timeout, env, group, log, receipt, key)
            if key == 'historyBrowser':
                raise key_error
            return code
        return ordinary
    with patch.object(U, 'ordinary', side_effect=bad_receipt(RuntimeError('模擬產品驗收 evidence 拒絕'))):
        code, receipt, launched = helper.flow()
    assert code != 0 and len(launched) == 2 and 'pgqStarted' not in receipt
    results['productEvidenceReject'] = {'exit': code, 'launches': len(launched), 'pgqStarted': receipt.get('pgqStarted', False), 'browserCloseExit': receipt.get('browserCloseExit')}

    real_save = U.save
    injected = []
    def fail_once(receipt):
        if receipt.get('historyBrowserExit') == 7 and not injected:
            injected.append(True)
            raise OSError(errno.ENOSPC, '單次 product exit 留證失敗')
        return real_save(receipt)
    with patch.object(U, 'save', side_effect=fail_once):
        code, receipt, launched = helper.flow(7)
    assert code == 2 and receipt['historyBrowserExit'] == 7 and len(launched) == 2
    results['exitEvidenceFailure'] = {'exit': code, 'originalProductExit': receipt['historyBrowserExit'], 'browserCloseExit': receipt.get('browserCloseExit'), 'pgqStarted': receipt.get('pgqStarted', False), 'firstCause': receipt['firstCause']}

    for original in (0, 7):
        def close_failure(command, timeout, env, group, log, receipt, key):
            if key == 'browserClose':
                receipt['browserCloseExit'] = 9
                return 9
            return real_ordinary(command, timeout, env, group, log, receipt, key)
        with patch.object(U, 'ordinary', side_effect=close_failure):
            code, receipt, launched = helper.flow(original)
        assert code == (7 if original == 7 else 2)
        results['browserCloseFailureAfter' + str(original)] = {'exit': code, 'originalProductExit': receipt['historyBrowserExit'], 'browserCloseExit': receipt['browserCloseExit']}
    return results

stream = io.StringIO()
with patch.object(tempfile, 'TemporaryDirectory', side_effect=evidence_fixture):
    result = unittest.TextTestRunner(stream=stream, verbosity=2).run(unittest.defaultTestLoader.loadTestsFromModule(tests))
    probes = extra_probes()
(HERE / 'host-owned-group-review-a-tests.log').write_text(stream.getvalue())
after = hashes()
report = {'sha256': before, 'matchesWorkerHashes': True, 'tests': {'run': result.testsRun, 'errors': len(result.errors), 'failures': len(result.failures), 'skipped': len(result.skipped)}, 'probes': probes, 'deliveryUnchanged': before == after}
(HERE / 'host-owned-group-review-a-probes.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False))
raise SystemExit(0 if result.wasSuccessful() and before == after else 1)
