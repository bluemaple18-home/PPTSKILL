"""Reviewer A：離線重現；只寫自身 log、小型暫存 fixture，不啟 host。"""
import errno
import hashlib
import importlib.util
import json
import os
import signal
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from contextlib import contextmanager
from unittest.mock import Mock, patch

HERE = Path(__file__).resolve().parent
CORE = HERE.parents[2] / '.work/ai-core-observer-r2-20260928'
sys.path.insert(0, str(CORE / 'scripts'))

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module

tests = load('review_a_scanner_tests', CORE / 'tests/test_tmp_artifact_lifecycle.py')
controller = load('review_a_controller', HERE / 'host-smoke-r2-controller.py')
scanner = tests.MODULE

class ExtraProbes(unittest.TestCase):
    def test_enumeration_retry_only_descendant(self):
        for nested in (False, True):
            with self.subTest(nested=nested), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                child = root / 'child'; child.mkdir()
                (child / 'a').write_bytes(b'abc')
                identity = (child if nested else root).stat().st_ino
                original = os.scandir
                hits = []
                @contextmanager
                def scan(fd):
                    if os.fstat(fd).st_ino == identity and not hits:
                        hits.append(True)
                        raise FileNotFoundError(errno.ENOENT, '獨立 enumeration fixture')
                    with original(fd) as entries:
                        yield entries
                with patch.dict(scanner.OWNED_ROOTS, {str(root): {'browser_layout': True}}), patch.object(scanner.os, 'scandir', side_effect=scan):
                    if nested:
                        self.assertEqual((3, 1), scanner.scan_resource_artifacts(root, {'max_bytes': 10, 'max_file_count': 10}))
                    else:
                        with self.assertRaisesRegex(scanner.LifecycleError, 'I/O failure'):
                            scanner.scan_resource_artifacts(root, {'max_bytes': 10, 'max_file_count': 10})

    def test_parent_identity_checked_after_successful_visit(self):
        case = tests.ObserverR2Tests()
        case.setUp()
        try:
            parent = case.root / 'parent'; parent.mkdir()
            (parent / 'a').write_bytes(b'a')
            def change(fd, name):
                if name == 'a':
                    parent.rename(case.root / 'moved')
                    parent.mkdir()
            with self.assertRaisesRegex(scanner.LifecycleError, 'identity mismatch'):
                case.scan(change)
            self.assertEqual([1], case.attempts())
        finally:
            case.doCleanups()

    def test_teardown_failure_states(self):
        for failure in ('close_timeout', 'close_log', 'wait_twice', 'terminate'):
            with self.subTest(failure=failure), tempfile.TemporaryDirectory() as tmp:
                out = Path(tmp)
                supervisor = Mock(); supervisor.poll.return_value = None
                timeout = subprocess.TimeoutExpired('離線', 1)
                supervisor.wait.side_effect = [timeout, timeout if failure == 'wait_twice' else 0]
                if failure == 'terminate':
                    supervisor.terminate.side_effect = OSError('離線 terminate error')
                if failure == 'close_log':
                    (out / 'browser-close.log').write_text('既有 fixture')
                receipt = {}
                with patch.object(controller.subprocess, 'run', side_effect=timeout):
                    controller.finish_supervisor(supervisor, 'ws://offline.invalid', out, receipt)
                self.assertIn('browserCloseError', receipt)
                supervisor.terminate.assert_called_once()
                if failure in ('wait_twice', 'terminate'):
                    self.assertIn('cleanupError', receipt)
                    self.assertNotIn('supervisorExit', receipt)
                else:
                    self.assertEqual(0, receipt['supervisorExit'])

    def test_pending_manifest_prevents_all_launch_side_effects(self):
        with patch.dict(controller.CANDIDATE, {'state': 'FROZEN_REVIEW_PENDING'}), patch.object(controller.subprocess, 'Popen') as launch, patch.object(Path, 'mkdir') as mkdir:
            with self.assertRaisesRegex(RuntimeError, '尚未完成 review'):
                controller.run_host_smoke()
            launch.assert_not_called(); mkdir.assert_not_called()

    def test_signal_handler_keeps_first_signal_and_control_error(self):
        handler = scanner.SignalController()
        with patch.object(scanner.os, 'killpg') as send:
            handler._handle_signal(signal.SIGTERM, None)
            send.assert_not_called()
            handler.attach(123456)
            send.assert_called_once_with(123456, signal.SIGTERM)
            send.side_effect = PermissionError('離線群組權限失敗')
            handler._handle_signal(signal.SIGINT, None)
            self.assertEqual(signal.SIGTERM, handler.first_signal)
            self.assertIsInstance(handler.control_error, PermissionError)
            handler.detach()
            count = send.call_count
            handler._handle_signal(signal.SIGTERM, None)
            self.assertEqual(count, send.call_count)

    def test_cleanup_count_failure_removes_only_bound_fixture_and_raises(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / 'owned'; root.mkdir()
            foreign = Path(tmp) / 'foreign'; foreign.write_bytes(b'preserve')
            manifest = {'max_bytes': 10, 'max_file_count': 10, 'expires_at': 9999999999}
            with patch.object(scanner, 'read_owned_root', return_value=(root, manifest)), patch.object(scanner, 'count_artifacts', side_effect=scanner.LifecycleError('離線 ENOENT')), patch.dict(scanner.OWNED_ROOTS, {str(root): {}}):
                with self.assertRaisesRegex(scanner.LifecycleError, '離線 ENOENT'):
                    scanner.cleanup(str(root), Path(tmp))
                self.assertFalse(root.exists())
                self.assertNotIn(str(root), scanner.OWNED_ROOTS)
                self.assertEqual(b'preserve', foreign.read_bytes())

def main():
    paths = [CORE / p for p in ('scripts/tmp_artifact_lifecycle.py', 'tests/test_tmp_artifact_lifecycle.py', 'docs/tmp-session-lifecycle.md')]
    paths += [HERE / ('host-smoke-r2-' + name) for name in ('controller.py', 'observer.py', 'test.py', 'candidate.json')]
    before = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
    suite = unittest.TestSuite()
    suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(tests.ObserverR2Tests))
    # 這些方法自帶小 fixture，略過不相干的 git init/add/commit setUp。
    selected = [name for name, value in vars(tests.TmpArtifactLifecycleTests).items()
                if name.startswith('test_') and 117 <= value.__code__.co_firstlineno <= 346]
    class Regression(tests.TmpArtifactLifecycleTests):
        def setUp(self):
            pass
    suite.addTests(Regression(name) for name in selected)
    suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(ExtraProbes))
    with (HERE / 'observer-r2-review-a-scanner-tests.log').open('w') as log:
        result = unittest.TextTestRunner(stream=log, verbosity=2).run(suite)
    after = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
    summary = {'tests': result.testsRun, 'failures': len(result.failures), 'errors': len(result.errors), 'skips': len(result.skipped), 'deliveryUnchangedDuringProbes': before == after, 'sha256': after}
    (HERE / 'observer-r2-review-a-validation.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k:v for k,v in summary.items() if k != 'sha256'}))
    return 0 if result.wasSuccessful() and before == after else 1

if __name__ == '__main__':
    raise SystemExit(main())
