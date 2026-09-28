"""窄域 B 離線反例；全部程序、訊號與 host seams 使用 mock。"""
from contextlib import ExitStack
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('b_host_tests', HERE / 'host-controller-r2-test.py')
T = importlib.util.module_from_spec(spec)
spec.loader.exec_module(T)
C = T.C
records = []
paths = [HERE / ('host-controller-r2' + suffix) for suffix in ('.py', '-test.py', '-manifest.json')]
before = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}

class FailureProbes(unittest.TestCase):
    def test_signal_at_child_exit_allows_next_product(self):
        lifecycle, signals = T.native_groups()
        def exited(*args):
            signals.first_signal = C.signal.SIGTERM
            return True
        lifecycle.child_exited_without_reaping.side_effect = exited
        process = Mock(pid=123)
        process.wait.return_value = 0
        receipt = {}
        with tempfile.TemporaryDirectory(prefix='host-controller-r2-review-b-') as tmp, \
             patch.object(C, 'OUT', Path(tmp)), patch.object(C, 'runtime_guard', return_value=[]), \
             patch.object(C.subprocess, 'Popen', return_value=process) as launch, \
             patch.object(C, 'check_browser_receipt', return_value={'status': 'pass'}):
            C.run_products({}, Mock(), Path('/owned'), receipt, lifecycle)
        self.assertEqual(launch.call_count, 2)
        self.assertEqual(receipt['historyBrowserExit'], 0)
        self.assertEqual(receipt['pgqExit'], 0)
        self.assertTrue(receipt['historyBrowserTerminated'])
        self.assertNotIn('historyBrowserStopCause', receipt)
        records.append({'case': self._testMethodName, 'launchCount': launch.call_count, 'receipt': receipt})

    def test_unconverged_or_unanchored_group_reaches_browser_cleanup(self):
        for scenario in ('nonconverged', 'anchor-failure'):
            with self.subTest(scenario=scenario), tempfile.TemporaryDirectory(prefix='host-controller-r2-review-b-') as tmp, ExitStack() as stack:
                root = Path(tmp)
                out = root / 'out'
                owned = root / 'owned'
                owned.mkdir()
                (owned / 'tmp').mkdir()
                ownership = {'rootIdentity': [owned.stat().st_dev, owned.stat().st_ino]}
                lifecycle, signals = T.native_groups(convergence=False)
                if scenario == 'anchor-failure':
                    lifecycle.process_group_anchor.side_effect = RuntimeError('B anchor unavailable')
                supervisor = Mock(pid=321)
                supervisor.poll.return_value = None
                product = Mock(pid=123)
                stack.enter_context(patch.dict(os.environ, {}, clear=True))
                replacements = [(C, 'OUT', out), (C, 'load_manifest', Mock(return_value=T.manifest())),
                    (C, 'verify_identity', Mock(return_value={'pinned': True})),
                    (C.helpers, 'load_lifecycle', Mock(return_value=lifecycle)),
                    (C.helpers, 'capacity_evidence', Mock(return_value={'available': True})),
                    (C.subprocess, 'check_output', Mock(return_value=str(root))),
                    (C, 'runtime_guard', Mock(return_value=[])),
                    (C.helpers, 'bind_owned', Mock(return_value=(owned, ownership))),
                    (C.helpers, 'endpoint_from', Mock(return_value='ws://offline'))]
                for module, name, value in replacements:
                    stack.enter_context(patch.object(module, name, value))
                calls = []
                def launch(command, **kwargs):
                    calls.append(command)
                    if len(calls) == 1:
                        (out / 'launcher.stdout').write_text(json.dumps({'event': 'browser-starting'}) + '\n')
                        return supervisor
                    return product
                stack.enter_context(patch.object(C.subprocess, 'Popen', side_effect=launch))
                seen = []
                def finish(sup, endpoint, directory, receipt):
                    seen.append({'cleanupRaceRisk': receipt.get('cleanupRaceRisk'),
                                 'groupConverged': receipt.get('historyBrowserGroupConverged'),
                                 'endpoint': endpoint, 'supervisorIsOriginal': sup is supervisor})
                stack.enter_context(patch.object(C.helpers, 'finish_supervisor', side_effect=finish))
                self.assertEqual(C.run_acceptance(), 1)
                self.assertEqual(len(calls), 2)
                self.assertEqual(len(seen), 1)
                self.assertTrue(seen[0]['cleanupRaceRisk'])
                self.assertFalse(seen[0]['groupConverged'])
                product.wait.assert_not_called()
                receipt = json.loads((out / 'controller-receipt.json').read_text())
                records.append({'case': self._testMethodName, 'scenario': scenario, 'finishInvocation': seen[0],
                                'status': receipt['status'], 'firstCause': receipt['firstCause']})

result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(FailureProbes))
after = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
(HERE / 'host-controller-r2-review-b-results.json').write_text(json.dumps({'before': before, 'after': after,
    'unchanged': before == after, 'tests': result.testsRun, 'failures': len(result.failures), 'errors': len(result.errors),
    'records': records}, ensure_ascii=False, indent=2) + '\n')
raise SystemExit(0 if result.wasSuccessful() and before == after else 1)
