"""B-BC-01 同反例 closure；只測單點 journal 故障，不啟程序。"""
import errno
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch

HERE = Path(__file__).resolve().parent
CORE = HERE.parents[2] / '.work/ai-core-observer-r2-20260928'
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
old = [p for p in HERE.glob('browser-command-ownership-review-b*') if '-repair1.' not in p.name]
old_before = {p.name: sha(p) for p in old}
files = ['scripts/tmp_session.py', 'tests/test_tmp_session_browser_command.py', 'docs/tmp-session-lifecycle.md']
before = {p: sha(CORE / p) for p in files}
assert before['scripts/tmp_session.py'] == '6a3853ec0fec97ad5718d9a36acdea7fbfc0a4dbf94eff2bb2812b8992a5121d'
assert before['tests/test_tmp_session_browser_command.py'] == '2c67040631fce3359bc61bd0893ac9b07be4b2e35a8396c8ec1a5e0b58324176'
assert before['docs/tmp-session-lifecycle.md'] == '1852e379023ecf23589e31377b81cb8bec20e2650ae3591930795b2da5c79a89'
sys.path.insert(0, str(CORE / 'tests'))
spec = importlib.util.spec_from_file_location('b_repair1_unit', CORE / 'tests/test_tmp_session_browser_command.py')
T = importlib.util.module_from_spec(spec)
spec.loader.exec_module(T)
S = T.session
records = []

class SameCounterexample(unittest.TestCase):
    def test_original_write_failure_is_sticky_and_preserves_nonzero(self):
        for number in (errno.EIO, errno.ENOSPC):
            for cc, bc, expected in ((0, 0, 2), (7, 9, 7), (0, 9, 9), (-9, 0, 137)):
                with self.subTest(errno=number, client=cc, browser=bc):
                    written = []
                    class Journal:
                        def __enter__(self): return self
                        def __exit__(self, *args): return False
                        def write(self, text):
                            item = json.loads(text)
                            if item['role'] == 'client' and item['event'] == 'exited':
                                raise OSError(number, 'B 單點 journal write 故障')
                            written.append(item)
                    browser, client = Mock(pid=101), Mock(pid=102)
                    browser.wait.return_value, client.wait.return_value = bc, cc
                    with patch.object(S.subprocess, 'Popen', side_effect=[browser, client]), patch.object(Path, 'open', return_value=Journal()):
                        code = S.browser_client(['browser'], ['client'], Path('/offline/profile'), '/offline/repo', Path('/offline/evidence'))
                    self.assertEqual(expected, code)
                    self.assertTrue(any(r['event'] == 'error' for r in written))
                    self.assertFalse(any(r['role'] == 'client' and r['event'] == 'exited' for r in written))
                    self.assertEqual({'role': 'browser', 'event': 'exited', 'returncode': bc}, written[-1])
                    browser.kill.assert_not_called()
                    records.append({'errno': number, 'clientCode': cc, 'browserCode': bc, 'returnedCode': code, 'journal': written})

suite = unittest.TestSuite([T.BrowserCommandUnitTests('test_single_journal_failure_stays_nonzero_after_recovery')])
suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(SameCounterexample))
result = unittest.TextTestRunner(verbosity=2).run(suite)
after = {p: sha(CORE / p) for p in files}
old_after = {p.name: sha(p) for p in old}
report = {'tests': result.testsRun, 'failures': len(result.failures), 'errors': len(result.errors),
          'before': before, 'after': after, 'candidateUnchanged': before == after,
          'oldEvidenceBefore': old_before, 'oldEvidenceAfter': old_after, 'oldEvidenceUnchanged': old_before == old_after,
          'cases': records}
(HERE / 'browser-command-ownership-review-b-repair1.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
raise SystemExit(0 if result.wasSuccessful() and before == after and old_before == old_after else 1)
