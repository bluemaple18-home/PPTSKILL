"""盲審 B：離線選集與窄失敗反例，無真 child／managed root。"""
from contextlib import ExitStack
import copy
import errno
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

HERE = Path(__file__).resolve().parent
names = ['host-client-owned-group.py', 'host-controller-owned-group.py',
         'host-controller-owned-group-test.py', 'host-controller-owned-group-manifest.json']
def hashes(): return {p: hashlib.sha256((HERE / p).read_bytes()).hexdigest() for p in names}
before = hashes()
spec = importlib.util.spec_from_file_location('b_owned_tests', HERE / 'host-controller-owned-group-test.py')
T = importlib.util.module_from_spec(spec)
spec.loader.exec_module(T)
U, C = T.U, T.C
records = []

class Sink(io.StringIO):
    def __exit__(self, *args): return False

class NarrowProbes(unittest.TestCase):
    def flow(self, product_code, close_code, fail_save=False):
        receipts, launched = [], []
        failed = False
        def save(receipt):
            nonlocal failed
            if fail_save and 'historyBrowserExit' in receipt and not failed:
                failed = True
                raise OSError(errno.EIO, 'B post-wait receipt failure')
            receipts.append(copy.deepcopy(receipt))
        def launch(command, **kwargs):
            process = Mock(pid=600 + len(launched))
            process.wait.return_value = product_code if not launched else close_code
            launched.append(command)
            return process
        with ExitStack() as stack:
            for module, key, value in [(U, 'managed_context', Mock(return_value=(Path('/owned'), 500, Path('/owned/profile/DevToolsActivePort')))),
                (U, 'readiness', Mock(return_value='ws://offline')), (U, 'save', save),
                (U.os, 'getpgrp', Mock(return_value=500)), (U.os, 'getpgid', Mock(return_value=500)),
                (U.subprocess, 'Popen', Mock(side_effect=launch)), (Path, 'open', Mock(side_effect=lambda *a, **k: Sink()))]:
                stack.enter_context(patch.object(module, key, value))
            stack.enter_context(patch.dict(os.environ, {'TMPDIR': '/owned/tmp', 'TMP': '/owned/tmp', 'TEMP': '/owned/tmp'}))
            code = U.run_client()
        return code, receipts[-1], launched

    def test_product_nonzero_survives_close_failure(self):
        code, receipt, launched = self.flow(7, 9)
        self.assertEqual(code, 7)
        self.assertEqual(receipt['historyBrowserExit'], 7)
        self.assertEqual(receipt['browserCloseExit'], 9)
        self.assertNotIn('pgqStarted', receipt)
        self.assertEqual(len(launched), 2)
        records.append({'case': self._testMethodName, 'exit': code, 'receipt': receipt})

    def test_post_wait_save_failure_replaces_product_exit(self):
        code, receipt, launched = self.flow(7, 0, True)
        self.assertEqual(code, 2)
        self.assertEqual(receipt['historyBrowserExit'], 7)
        self.assertEqual(receipt['status'], 'NOT_PASS')
        self.assertNotIn('pgqStarted', receipt)
        self.assertEqual(len(launched), 2)
        records.append({'case': self._testMethodName, 'exit': code, 'receipt': receipt})

    def test_exact_cleanup_identity_and_remaining_root_rejected(self):
        session = {'root': '/offline/aic-b-owned', 'mode': 'browser', 'pid': 500}
        events = [{'role': role, 'event': 'started', 'pid': pid, 'pgid': 500} for role, pid in [('browser', 501), ('client', 502)]]
        lifecycle = Mock()
        lifecycle.root_location.return_value = (Path('/offline'), 'aic-b-')
        lifecycle.recovery_process_observation.return_value = {'matches': []}
        for case in ('valid', 'foreign', 'remaining'):
            chosen = dict(session, root='/foreign/root') if case == 'foreign' else session
            with patch.object(C, 'read_regular', side_effect=[json.dumps(chosen).encode(), '\n'.join(map(json.dumps, events)).encode()]), \
                 patch.object(C.os.path, 'lexists', return_value=case == 'remaining'):
                receipt = {}
                if case == 'valid':
                    self.assertEqual(C.verify_cleanup(lifecycle, Path('/offline/marker'), receipt), Path(session['root']))
                else:
                    with self.assertRaises(RuntimeError): C.verify_cleanup(lifecycle, Path('/offline/marker'), receipt)
            records.append({'case': self._testMethodName, 'scenario': case, 'receipt': receipt})

suite = unittest.defaultTestLoader.loadTestsFromModule(T)
suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(NarrowProbes))
real_temporary = tempfile.TemporaryDirectory
def evidence_fixture(*args, **kwargs):
    return real_temporary(prefix='host-owned-group-review-b-fixture-', dir=HERE)
with patch.object(tempfile, 'TemporaryDirectory', side_effect=evidence_fixture):
    result = unittest.TextTestRunner(verbosity=2).run(suite)
after = hashes()
(HERE / 'host-owned-group-review-b-results.json').write_text(json.dumps({'before': before, 'after': after,
    'unchanged': before == after, 'tests': result.testsRun, 'failures': len(result.failures), 'errors': len(result.errors),
    'records': records}, ensure_ascii=False, indent=2) + '\n')
raise SystemExit(0 if result.wasSuccessful() and before == after else 1)
