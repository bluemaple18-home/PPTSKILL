"""Reviewer A：只驗 cause-chain delta；不呼叫 host/main，不改原 receipt。"""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('review_a_recheck_tests', HERE / 'host-smoke-r2-test.py')
tests = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = tests
spec.loader.exec_module(tests)

class CauseBoundaryTests(unittest.TestCase):
    def test_length_and_cycles_preserve_original_exception(self):
        target = '/offline/review-a-cause-chain.py'
        namespace = {}
        exec(compile('def scan_resource_artifacts(root, limits):\n raise root\n', target, 'exec'), namespace)
        for count, cycle in ((0, False), (8, False), (9, False), (0, True), (3, True)):
            with self.subTest(count=count, cycle=cycle):
                root = RuntimeError('外層原因')
                tail = root
                for index in range(count):
                    cause = OSError(5, str(index))
                    tail.__cause__ = cause
                    tail = cause
                if cycle:
                    tail.__cause__ = root
                stream = io.StringIO()
                observer = tests.observer_module.ResourceObserver(target, stream)
                with self.assertRaises(RuntimeError) as caught:
                    with observer.watching():
                        namespace['scan_resource_artifacts'](root, {})
                self.assertIs(root, caught.exception)
                event = observer.scans[0]['events'][0]
                self.assertEqual(min(count, 8), len(event['causes']))
                self.assertEqual(cycle or count > 8, event['causeChainTruncated'])
                self.assertTrue(all(c['errno'] == 5 and c['type'] == 'OSError' for c in event['causes']))
                self.assertEqual('FAILED', observer.scans[0]['outcome'])
                self.assertFalse(observer.diagnostic_errors)
                journal = [json.loads(line) for line in stream.getvalue().splitlines()]
                self.assertEqual(event['causes'], next(e for e in journal if e['phase'] == 'exception')['event']['causes'])

    def test_sampling_string_identical_with_and_without_observer(self):
        for code in (5, 13, 1):
            with self.subTest(errno=code), tests.fixture(lambda p: None) as (root, parent, budget, events, scans):
                original = OSError(code, '原始 identity I/O')
                observer = tests.observer_module.ResourceObserver(tests.controller.CORE / 'scripts/tmp_artifact_lifecycle.py')
                with patch.object(tests.scanner.os, 'fstat', side_effect=original):
                    plain = tests.scanner.sample_resource_budget(root, budget)
                    with observer.watching():
                        observed = tests.scanner.sample_resource_budget(root, budget)
                self.assertEqual(plain, observed)
                self.assertFalse(observer.diagnostic_errors)

def main():
    tracked = [HERE / ('host-smoke-r2-' + name) for name in ('observer.py', 'test.py', 'controller.py')]
    tracked += [HERE / 'observer-r2-review-a.md', tests.controller.CORE / 'scripts/tmp_artifact_lifecycle.py']
    before = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in tracked}
    suite = unittest.TestSuite()
    suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(tests.ObserverTests))
    suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(CauseBoundaryTests))
    with (HERE / 'observer-r2-review-a-recheck-tests.log').open('w') as stream:
        result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
    after = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in tracked}
    report = {'tests': result.testsRun, 'failures': len(result.failures), 'errors': len(result.errors), 'skips': len(result.skipped), 'allTrackedBytesUnchanged': before == after, 'sha256': after}
    (HERE / 'observer-r2-review-a-recheck-validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k:v for k,v in report.items() if k != 'sha256'}))
    return 0 if result.wasSuccessful() and before == after else 1

if __name__ == '__main__':
    raise SystemExit(main())
