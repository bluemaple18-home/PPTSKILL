"""B-01 定向重審；只測 instrumentation，不啟 host，不改原 B evidence。"""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import unittest

HERE = Path(__file__).resolve().parent
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

original = [p for p in HERE.glob('observer-r2-review-b*') if 'recheck' not in p.name]
before = {p.name: digest(p) for p in original}
old = json.loads((HERE / 'observer-r2-review-b-results-independent.json').read_text())['after']
current = {p: digest(Path(p)) for p in old}
unchanged = {p: value == current[p] for p, value in old.items() if not p.endswith(('host-smoke-r2-observer.py', 'host-smoke-r2-test.py'))}
assert all(unchanged.values()), unchanged
spec = importlib.util.spec_from_file_location('b_recheck_tests', HERE / 'host-smoke-r2-test.py')
tests = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = tests
spec.loader.exec_module(tests)
records = []

class CauseBounds(unittest.TestCase):
    def exercise(self, count, cycle=False):
        target = '/offline/b-recheck-scanner.py'
        namespace = {}
        exec(compile('def scan_resource_artifacts(root, limits):\n total_bytes, total_files = 7, 1\n raise root\n', target, 'exec'), namespace)
        outer = RuntimeError('B 外層')
        cursor = outer
        for number in range(count):
            cause = OSError(5, 'B cause ' + str(number))
            cursor.__cause__ = cause
            cursor = cause
        if cycle:
            cursor.__cause__ = outer
        journal = io.StringIO()
        observer = tests.observer_module.ResourceObserver(target, journal)
        previous = sys.gettrace()
        with self.assertRaises(RuntimeError) as caught:
            with observer.watching():
                namespace['scan_resource_artifacts'](outer, {})
        self.assertIs(caught.exception, outer)
        self.assertIs(previous, sys.gettrace())
        record = observer.scans[0]
        event = record['events'][0]
        self.assertIsNone(event['errno'])
        self.assertEqual(min(count, 8), len(event['causes']))
        self.assertEqual(cycle or count > 8, event['causeChainTruncated'])
        self.assertTrue(all(c['errno'] == 5 for c in event['causes']))
        self.assertEqual('FAILED', record['outcome'])
        self.assertIsNone(record['counts'])
        self.assertEqual([7, 1], record['partialCounts'])
        self.assertFalse(observer.diagnostic_errors)
        self.assertFalse(observer.active)
        emitted = [json.loads(line) for line in journal.getvalue().splitlines()]
        self.assertEqual(event, next(r['event'] for r in emitted if r['phase'] == 'exception'))
        records.append({'length': count, 'cycle': cycle, 'event': event})
    def test_empty_and_exact_bound(self):
        for count in (0, 8):
            self.exercise(count)
    def test_over_bound(self):
        self.exercise(9)
    def test_cycle(self):
        self.exercise(2, True)

suite = unittest.defaultTestLoader.loadTestsFromTestCase(tests.ObserverTests)
suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(CauseBounds))
result = unittest.TextTestRunner(verbosity=2).run(suite)
after = {p.name: digest(p) for p in original}
delivery_after = {p: digest(Path(p)) for p in old}
report = {'tests': result.testsRun, 'failures': len(result.failures), 'errors': len(result.errors),
          'originalEvidenceBefore': before, 'originalEvidenceAfter': after,
          'originalEvidenceUnchanged': before == after, 'frozenBaselineMatches': unchanged,
          'deliveryBefore': current, 'deliveryAfter': delivery_after,
          'deliveryUnchangedDuringRecheck': current == delivery_after, 'causeProbes': records}
(HERE / 'observer-r2-review-b-recheck-results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
sys.exit(0 if result.wasSuccessful() and before == after and current == delivery_after else 1)
