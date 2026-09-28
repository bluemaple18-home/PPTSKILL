"""Browser command ownership 窄域 B probes；不啟任何 child。"""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import signal
import sys
import unittest
from unittest.mock import Mock, patch

HERE = Path(__file__).resolve().parent
CORE = HERE.parents[2] / '.work/ai-core-observer-r2-20260928'
sys.path.insert(0, str(CORE / 'tests'))
spec = importlib.util.spec_from_file_location('b_browser_unit', CORE / 'tests/test_tmp_session_browser_command.py')
T = importlib.util.module_from_spec(spec)
spec.loader.exec_module(T)
S = T.session
records = []
files = ['scripts/tmp_session.py', 'tests/test_tmp_session_browser_command.py',
         'docs/tmp-session-lifecycle.md', 'scripts/tmp_artifact_lifecycle.py']
before = {p: hashlib.sha256((CORE / p).read_bytes()).hexdigest() for p in files}

class NarrowProbes(unittest.TestCase):
    def test_client_exit_record_io_failure_returns_zero(self):
        written = []
        class Journal:
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def write(self, text):
                item = json.loads(text)
                if item['role'] == 'client' and item['event'] == 'exited':
                    raise OSError(5, 'B transient evidence write failure')
                written.append(item)
        browser = Mock(pid=101)
        client = Mock(pid=102)
        browser.wait.return_value = client.wait.return_value = 0
        with patch.object(S.subprocess, 'Popen', side_effect=[browser, client]), \
             patch.object(Path, 'open', return_value=Journal()):
            code = S.browser_client(['browser'], ['client'], Path('/offline/profile'), '/offline/repo', Path('/offline/evidence'))
        self.assertEqual(0, code)
        self.assertTrue(any(r['event'] == 'error' for r in written))
        self.assertFalse(any(r['role'] == 'client' and r['event'] == 'exited' for r in written))
        records.append({'case': self._testMethodName, 'returnedCode': code, 'journal': written})

    def test_outer_signal_is_not_overridden_by_child_zero(self):
        L = S.lifecycle
        for signum in (signal.SIGINT, signal.SIGTERM):
            controller = Mock(first_signal=None)
            process = Mock(pid=123)
            process.wait.return_value = 0
            def exited(*args):
                controller.first_signal = signum
                return True
            with patch.object(L.subprocess, 'Popen', return_value=process), \
                 patch.object(L, 'ChildExitObserver'), \
                 patch.object(L, 'process_group_anchor', return_value=L.ProcessGroupAnchor(123, 123, None, None)), \
                 patch.object(L, 'child_exited_without_reaping', side_effect=exited), \
                 patch.object(L, 'wait_for_process_group', return_value=True):
                code = L.run_child(['never-execute'], {}, controller)
            self.assertEqual(128 + signum, code)
            records.append({'case': self._testMethodName, 'signal': int(signum), 'childExit': 0, 'outerExit': code})

suite = unittest.defaultTestLoader.loadTestsFromTestCase(T.BrowserCommandUnitTests)
suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(NarrowProbes))
result = unittest.TextTestRunner(verbosity=2).run(suite)
after = {p: hashlib.sha256((CORE / p).read_bytes()).hexdigest() for p in files}
(HERE / 'browser-command-ownership-review-b-results.json').write_text(json.dumps({
    'before': before, 'after': after, 'unchanged': before == after, 'tests': result.testsRun,
    'failures': len(result.failures), 'errors': len(result.errors), 'records': records}, ensure_ascii=False, indent=2) + '\n')
raise SystemExit(0 if result.wasSuccessful() and before == after else 1)
