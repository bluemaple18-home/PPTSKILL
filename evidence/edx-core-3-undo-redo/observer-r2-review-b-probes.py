"""Reviewer B 自製離線反例；不啟程序、不操作 host lifecycle。"""
from contextlib import contextmanager, ExitStack
import errno
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

HERE = Path(__file__).resolve().parent
CORE = HERE.parents[2] / '.work/ai-core-observer-r2-20260928'

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module

C = load('review_b_controller', HERE / 'host-smoke-r2-controller.py')
S = C.load_lifecycle()
O = load('review_b_observer', HERE / 'host-smoke-r2-observer.py')
RESULTS = []

@contextmanager
def tree():
    with tempfile.TemporaryDirectory(prefix='observer-r2-review-b-', dir=HERE) as directory:
        root = Path(directory)
        (root / 'a').mkdir()
        (root / 'z').mkdir()
        (root / 'a/seed').write_bytes(b'123')
        (root / 'z/pending').write_bytes(b'1234567')
        yield root

def observe(root, hook, journal=None, **options):
    real_scan = S.os.scandir
    calls = []
    class Entry:
        def __init__(self, entry):
            self.entry, self.name = entry, entry.name
        def stat(self, **kwargs):
            calls.append(self.name)
            hook(self.name)
            return self.entry.stat(**kwargs)
    @contextmanager
    def ordered(fd):
        with real_scan(fd) as entries:
            yield iter([Entry(e) for e in sorted(entries, key=lambda e: e.name)])
    observer = O.ResourceObserver(C.CORE / 'scripts/tmp_artifact_lifecycle.py', journal)
    result = error = None
    with patch.dict(S.OWNED_ROOTS, {str(root): {'browser_layout': True}}), patch.object(S.os, 'scandir', side_effect=ordered):
        try:
            with observer.watching():
                result = S.scan_resource_artifacts(root, options.get('limits', {'max_bytes': 100, 'max_file_count': 100}))
        except S.LifecycleError as caught:
            error = caught
    return result, error, observer, calls

class IndependentProbes(unittest.TestCase):
    def test_rename_to_already_visited_parent(self):
        with tree() as root:
            def hook(name):
                if name == 'pending':
                    (root / 'z/pending').rename(root / 'a/renamed')
            result, error, observer, calls = observe(root, hook)
        self.assertIsNone(error)
        self.assertEqual((10, 2), result)
        scan = observer.scans[0]
        self.assertEqual('RECOVERED_COMPLETE', scan['outcome'])
        self.assertEqual(2, scan['attempt'])
        self.assertEqual(2, calls.count('seed'))
        self.assertEqual(3, scan['attemptsDiagnostic'][0]['partial_bytes'])
        self.assertEqual(('z',), scan['attemptsDiagnostic'][0]['relative_parent'])
        RESULTS.append({'case': self._testMethodName, 'record': scan})

    def test_second_enoent_other_parent_no_third_try(self):
        fired = []
        with tree() as root:
            def hook(name):
                if (not fired and name == 'pending') or (fired and name == 'seed'):
                    fired.append(name)
                    raise FileNotFoundError(errno.ENOENT, 'B 第二次反例')
            result, error, observer, calls = observe(root, hook)
        self.assertIsNone(result)
        self.assertIsInstance(error, S.LifecycleError)
        self.assertEqual(['pending', 'seed'], fired)
        self.assertEqual(2, observer.scans[0]['attempt'])
        self.assertEqual([1, 2], [d['attempt'] for d in observer.scans[0]['attemptsDiagnostic']])
        self.assertEqual('FAILED', observer.scans[0]['outcome'])
        RESULTS.append({'case': self._testMethodName, 'record': observer.scans[0]})

    def test_journal_failure_preserves_error_object_and_partial(self):
        for code in (errno.EIO, errno.EACCES, errno.EPERM):
            with self.subTest(errno=code), tree() as root:
                original = OSError(code, 'B 原始 I/O')
                journal = Mock()
                journal.write.side_effect = OSError(errno.ENOSPC, 'B journal 滿')
                def hook(name):
                    if name == 'pending':
                        raise original
                result, error, observer, calls = observe(root, hook, journal)
                self.assertIs(error.__cause__, original)
                self.assertIsNone(result)
                self.assertEqual([3, 1], observer.scans[0]['partialCounts'])
                self.assertEqual('FAILED', observer.scans[0]['outcome'])
                self.assertTrue(observer.diagnostic_errors)
                self.assertTrue(any(e['errno'] == code for e in observer.scans[0]['events']))
                self.assertEqual(1, observer.scans[0]['attempt'])
                RESULTS.append({'case': self._testMethodName, 'errno': code, 'record': observer.scans[0]})

    def test_identity_io_cause_is_not_in_observer_events(self):
        with tree() as root:
            observer = O.ResourceObserver(C.CORE / 'scripts/tmp_artifact_lifecycle.py')
            original = OSError(errno.EIO, 'B identity fstat I/O')
            with patch.dict(S.OWNED_ROOTS, {str(root): {'browser_layout': True}}), patch.object(S.os, 'fstat', side_effect=original):
                with self.assertRaises(S.LifecycleError) as caught:
                    with observer.watching():
                        S.scan_resource_artifacts(root, {'max_bytes': 100, 'max_file_count': 100})
            self.assertIs(original, caught.exception.__cause__)
            self.assertEqual('FAILED', observer.scans[0]['outcome'])
            self.assertFalse(any(e['errno'] == errno.EIO for e in observer.scans[0]['events']))
            RESULTS.append({'case': self._testMethodName, 'originalCauseErrno': original.errno, 'record': observer.scans[0]})

    def test_identity_errno_lost_at_runtime_sampling_seam(self):
        messages = []
        for code in (errno.EIO, errno.EACCES, errno.EPERM):
            with tree() as root:
                observer = O.ResourceObserver(C.CORE / 'scripts/tmp_artifact_lifecycle.py')
                with patch.dict(S.OWNED_ROOTS, {str(root): {'browser_layout': True}}), patch.object(S.os, 'fstat', side_effect=OSError(code, 'B identity 原始原因')):
                    with observer.watching():
                        message = S.sample_resource_budget(root, {'max_bytes': 100, 'max_file_count': 100})
                messages.append(message)
                self.assertEqual('FAILED', observer.scans[0]['outcome'])
                self.assertTrue(all(e['errno'] is None for e in observer.scans[0]['events']))
                RESULTS.append({'case': self._testMethodName, 'injectedErrno': code, 'supervisorMessage': message, 'record': observer.scans[0]})
        self.assertEqual(1, len(set(messages)))

    def test_activation_and_teardown_mocked_failure_states(self):
        names = ['load_policy', 'bounded_limits', 'acquire_repo_lock', 'assert_repo_not_isolated',
                 'ensure_process_group_observation', 'acquire_host_tmp_admission_lock',
                 'assert_managed_tmp_admission', 'create_isolation_marker', 'plan_root',
                 'update_isolation_marker', 'create_root', 'verify_browser_ipc_path',
                 'release_host_tmp_admission_lock', 'run_child', 'preserve_unknown_isolation',
                 'cleanup', 'clear_isolation_marker', 'release_repo_lock']
        failures = ['assert_managed_tmp_admission', 'create_isolation_marker', 'plan_root',
                    'create_root', 'verify_browser_ipc_path', 'run_child', 'cleanup',
                    'clear_isolation_marker', 'release_repo_lock']
        for failure in failures:
            with self.subTest(failure=failure), ExitStack() as stack:
                root = Mock()
                root.__str__ = Mock(return_value='/offline/owned')
                root.exists.return_value = False
                root.is_symlink.return_value = False
                controller = Mock(first_signal=None)
                context = Mock()
                context.__enter__ = Mock(return_value=controller)
                context.__exit__ = Mock(return_value=False)
                stack.enter_context(patch.object(S, 'SignalController', return_value=context))
                mocks = {name: stack.enter_context(patch.object(S, name)) for name in names}
                mocks['bounded_limits'].return_value = {'max_bytes': 100, 'max_file_count': 100}
                mocks['plan_root'].return_value = root
                mocks['create_root'].return_value = root
                mocks['run_child'].return_value = 0
                for name in ('cleanup', 'clear_isolation_marker', 'release_repo_lock'):
                    mocks[name].return_value = True
                if failure in ('clear_isolation_marker', 'release_repo_lock'):
                    mocks[failure].return_value = False
                else:
                    mocks[failure].side_effect = S.LifecycleError('B ' + failure)
                args = Mock(policy='/offline/policy', repo_root='/offline/repo', purpose='browser-session', mode='browser', pycache=False, command=['NEVER_EXECUTE'], evidence_dir='/offline/evidence', preserve=[])
                caught = None
                try:
                    code = S.command_run(args)
                except S.LifecycleError as error:
                    code, caught = None, str(error)
                self.assertNotEqual(0, code)
                self.assertTrue(mocks['release_repo_lock'].called)
                self.assertTrue(mocks['release_host_tmp_admission_lock'].called)
                if failure in ('plan_root', 'create_root', 'run_child'):
                    self.assertTrue(mocks['preserve_unknown_isolation'].called)
                    mocks['cleanup'].assert_not_called()
                if failure == 'clear_isolation_marker':
                    self.assertTrue(mocks['preserve_unknown_isolation'].called)
                RESULTS.append({'case': self._testMethodName, 'failure': failure, 'code': code, 'error': caught,
                                'calls': {name: mock.call_count for name, mock in mocks.items()}})

    def test_finish_side_effect_failures(self):
        for case in ('close-log', 'cdp', 'wait', 'terminate', 'second-wait', 'no-endpoint'):
            with self.subTest(case=case), tempfile.TemporaryDirectory(prefix='observer-r2-review-b-', dir=HERE) as tmp:
                out = Path(tmp)
                supervisor = Mock()
                supervisor.poll.return_value = None
                supervisor.wait.return_value = 0
                if case == 'close-log':
                    (out / 'browser-close.log').write_text('既有證據')
                if case in ('terminate', 'second-wait'):
                    supervisor.wait.side_effect = [subprocess.TimeoutExpired('mock', 25), subprocess.TimeoutExpired('mock', 30)]
                if case == 'terminate':
                    supervisor.terminate.side_effect = OSError(errno.EPERM, 'B 禁止 signal')
                if case == 'wait':
                    supervisor.wait.side_effect = OSError(errno.EIO, 'B wait')
                receipt = {}
                with patch.object(C.subprocess, 'run', side_effect=OSError(errno.EIO, 'B CDP')) as run:
                    C.finish_supervisor(supervisor, None if case == 'no-endpoint' else 'ws://offline', out, receipt)
                self.assertTrue(supervisor.wait.called)
                if case in ('wait', 'terminate', 'second-wait'):
                    self.assertIn('cleanupError', receipt)
                if case in ('close-log', 'no-endpoint'):
                    run.assert_not_called()
                RESULTS.append({'case': self._testMethodName, 'failure': case, 'receipt': receipt})

if __name__ == '__main__':
    paths = [C.CORE / p for p in ('scripts/tmp_artifact_lifecycle.py', 'tests/test_tmp_artifact_lifecycle.py', 'docs/tmp-session-lifecycle.md')]
    paths += [HERE / ('host-smoke-r2-' + p) for p in ('controller.py', 'observer.py', 'test.py', 'candidate.json')]
    before = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(IndependentProbes)
    core_tests = load('review_b_core_tests', C.CORE / 'tests/test_tmp_artifact_lifecycle.py')
    independent = '--independent-only' in sys.argv
    if not independent:
        suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(core_tests.ObserverR2Tests))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    after = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
    suffix = '-independent' if independent else ''
    (HERE / ('observer-r2-review-b-results' + suffix + '.json')).write_text(json.dumps({'before': before, 'after': after, 'unchanged': before == after, 'tests': result.testsRun, 'failures': len(result.failures), 'errors': len(result.errors), 'probes': RESULTS}, ensure_ascii=False, indent=2) + '\n')
    sys.exit(0 if result.wasSuccessful() and before == after else 1)
