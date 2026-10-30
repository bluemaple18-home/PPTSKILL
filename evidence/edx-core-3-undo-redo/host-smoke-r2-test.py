"""host-smoke-r2 離線驗證；不呼叫 controller 正式路徑、不啟 Chrome。"""
from dataclasses import asdict
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

HERE = Path(__file__).resolve().parent


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


controller = load('smoker2_controller_test', HERE / 'host-smoke-r2-controller.py')
observer_module = load('smoker2_observer_test', HERE / 'host-smoke-r2-observer.py')
from contextlib import contextmanager
import errno
scanner = controller.load_lifecycle()

@contextmanager
def fixture(action, *, max_bytes=64, limits=True):
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        parent = root / 'profile/Default'
        parent.mkdir(parents=True)
        target = parent / 'pending'
        target.write_bytes(b'12345678')
        real_scan = os.scandir
        injected = False
        class Entry:
            def __init__(self, entry):
                self.entry, self.name = entry, entry.name
            def stat(self, *, follow_symlinks=True):
                nonlocal injected
                if self.name == 'pending' and not injected:
                    injected = True
                    action(target)
                return self.entry.stat(follow_symlinks=follow_symlinks)
        @contextmanager
        def scan(fd):
            with real_scan(fd) as entries:
                yield iter([Entry(e) for e in entries])
        budget = {'max_bytes': max_bytes, 'max_file_count': 10000} if limits else None
        with patch.dict(scanner.OWNED_ROOTS, {str(root): {'browser_layout': True}}), patch.object(scanner.os, 'scandir', side_effect=scan):
            yield root, parent, budget, [], []

def fail_io(path):
    raise OSError(errno.EIO, '離線未知 I/O')

FAKE_WEBSOCKET = r'''
globalThis.__requests=[];
globalThis.WebSocket=class {
  constructor() {this.listeners={};queueMicrotask(()=>this.emit('open',{}));}
  addEventListener(name, callback) {(this.listeners[name]??=[]).push(callback);}
  emit(name, event) {for(const cb of this.listeners[name]??[]) cb(event);}
  send(raw) {
    const m=JSON.parse(raw);globalThis.__requests.push(m);
    let result={};
    if(m.method==='Target.createTarget') result={targetId:'owned-test-target'};
    if(m.method==='Target.attachToTarget') result={sessionId:'owned-test-session'};
    if(m.method==='Runtime.evaluate') result={result:{value:true}};
    if(m.method==='Target.closeTarget') result={success:true};
    queueMicrotask(()=>{
      if(m.method==='Page.navigate' && globalThis.__injectError)
        this.emit('message',{data:JSON.stringify({sessionId:'owned-test-session',method:'Runtime.exceptionThrown',params:{exceptionDetails:{text:'offline injected error'}}})});
      this.emit('message',{data:JSON.stringify({id:m.id,result})});
    });
  }
  close() {process.stderr.write(JSON.stringify(globalThis.__requests)+'\n');}
};
'''


class ObserverTests(unittest.TestCase):
    def fixture(self, *args, **kwargs):
        return fixture(*args, **kwargs)

    def observe(self, action, *, max_bytes=64, limits=True):
        stream = io.StringIO()
        observer = observer_module.ResourceObserver(controller.CORE / 'scripts/tmp_artifact_lifecycle.py', stream)
        with self.fixture(action, max_bytes=max_bytes, limits=limits) as (root, parent, budget, events, scans):
            try:
                with observer.watching():
                    result = scanner.scan_resource_artifacts(root, budget)
                error = None
            except scanner.LifecycleError as exception:
                result, error = None, exception
        return observer, result, error, [json.loads(line) for line in stream.getvalue().splitlines()]

    def test_normal_return_and_cleanup_are_separate(self):
        for limits, kind in ((True, 'runtime'), (False, 'cleanup')):
            with self.subTest(kind=kind):
                observer, result, error, journal = self.observe(lambda p: None, limits=limits)
                self.assertEqual((8, 1), result)
                self.assertIsNone(error)
                record = observer.scans[0]
                self.assertEqual((kind, 'COMPLETE'), (record['kind'], record['outcome']))
                self.assertEqual([8, 1], record['counts'])
                self.assertGreaterEqual(record['entries'], 1)
                self.assertGreaterEqual(record['elapsedMs'], 0)
                self.assertFalse(observer.active)
                self.assertFalse(observer.diagnostic_errors)
                self.assertLessEqual(observer.trace_events, {'call', 'exception', 'return'})

    def test_recovery_keeps_enoent_and_original_return(self):
        def rename(p): p.rename(p.with_name('committed'))
        with self.fixture(rename) as (root, parent, budget, events, scans):
            expected = scanner.scan_resource_artifacts(root, budget)
        observer, result, error, journal = self.observe(rename)
        self.assertEqual(expected, result)
        self.assertIsNone(error)
        self.assertEqual('RECOVERED_COMPLETE', observer.scans[0]['outcome'])
        self.assertTrue(any(e['errno'] == 2 for e in observer.scans[0]['events']))
        self.assertTrue(any(e['phase'] == 'exception' and e['event']['errno'] == 2 for e in journal))
        self.assertEqual([8, 1], observer.scans[0]['counts'])
        self.assertEqual(2, observer.scans[0]['attempt'])
        event = next(e for e in observer.scans[0]['events'] if e['errno'] == 2)
        self.assertEqual(1, event['attempt'])
        self.assertIsNotNone(event['entries'])
        self.assertIsNotNone(event['scanPhase'])

    def test_unwind_and_budget_rejection_are_not_complete(self):
        for action, maximum, outcome in ((fail_io, 64, 'FAILED'), (lambda p: None, 4, 'BUDGET_REJECTED')):
            with self.subTest(outcome=outcome):
                with self.fixture(action, max_bytes=maximum) as (root, parent, budget, events, scans):
                    with self.assertRaises(scanner.LifecycleError) as expected:
                        scanner.scan_resource_artifacts(root, budget)
                observer, result, error, journal = self.observe(action, max_bytes=maximum)
                self.assertEqual(type(expected.exception), type(error))
                self.assertEqual(str(expected.exception), str(error))
                self.assertIsNone(result)
                self.assertEqual(outcome, observer.scans[0]['outcome'])
                self.assertIsNone(observer.scans[0]['counts'])

    def test_previous_trace_restored_on_return_and_exception(self):
        original = sys.gettrace()
        def previous(frame, event, arg): return previous
        try:
            sys.settrace(previous)
            self.observe(lambda p: None)
            self.assertIs(previous, sys.gettrace())
            self.observe(fail_io)
            self.assertIs(previous, sys.gettrace())
        finally:
            sys.settrace(original)

    def test_none_return_is_unknown_and_no_line_opcode(self):
        target = '/offline/host-smoke-r2-scanner.py'
        namespace = {'sys': sys}
        exec(compile('def scan_resource_artifacts(root, limits):\n assert not sys._getframe().f_trace_lines\n assert not sys._getframe().f_trace_opcodes\n return None\n', target, 'exec'), namespace)
        observer = observer_module.ResourceObserver(target)
        with observer.watching():
            self.assertIsNone(namespace['scan_resource_artifacts']('fixture', {}))
        self.assertEqual('UNKNOWN', observer.scans[0]['outcome'])
        self.assertLessEqual(observer.trace_events, {'call', 'exception', 'return'})

    def test_identity_io_cause_survives_sampling_string_boundary(self):
        for code in (errno.EIO, errno.EACCES, errno.EPERM):
            with self.subTest(errno=code), self.fixture(lambda p: None) as (root, parent, budget, events, scans):
                stream = io.StringIO()
                observer = observer_module.ResourceObserver(controller.CORE / 'scripts/tmp_artifact_lifecycle.py', stream)
                original = OSError(code, 'identity 原始 I/O')
                with patch.object(scanner.os, 'fstat', side_effect=original), observer.watching():
                    reason = scanner.sample_resource_budget(root, budget)
                self.assertIn('identity unavailable', reason)
                record = observer.scans[0]
                self.assertEqual('FAILED', record['outcome'])
                self.assertIsNone(record['counts'])
                self.assertFalse(observer.diagnostic_errors)
                self.assertTrue(any(c['errno'] == code for e in record['events'] for c in e['causes']))
                self.assertFalse(any(e['causeChainTruncated'] for e in record['events']))
                journal = [json.loads(line) for line in stream.getvalue().splitlines()]
                self.assertTrue(any(c['errno'] == code for e in journal if e['phase'] == 'exception' for c in e['event']['causes']))

    def test_diagnostic_write_failure_does_not_change_scan_return(self):
        stream = Mock(); stream.write.side_effect = OSError('offline journal failure')
        observer = observer_module.ResourceObserver(controller.CORE / 'scripts/tmp_artifact_lifecycle.py', stream)
        with self.fixture(lambda p: None) as (root, parent, budget, events, scans):
            with observer.watching():
                self.assertEqual((8, 1), scanner.scan_resource_artifacts(root, budget))
        self.assertTrue(observer.diagnostic_errors)


class ControllerOfflineTests(unittest.TestCase):
    def test_frozen_identity_read_only(self):
        record = controller.verify_identity()
        self.assertEqual(controller.HEAD, record['candidateHead'])
        self.assertEqual(75, len(record['product']['source']))
        self.assertEqual(4, len(record['product']['protected']))

    def test_capacity_uses_original_seam_and_asdict(self):
        capacity = scanner.HostCapacity(1000, 500, 600, 'offline-fixture')
        with patch.object(scanner, 'assert_projected_capacity', return_value=capacity) as seam:
            self.assertEqual(asdict(capacity), controller.capacity_evidence(scanner))
        seam.assert_called_once_with(controller.LIMITS)

    def test_cdp_fake_success_and_page_error_always_close_owned_target(self):
        for inject in (False, True):
            with self.subTest(inject=inject):
                # WebSocket 被離線 fake 替代，沒有網路連線、Chrome 或正式 controller 執行。
                source = FAKE_WEBSOCKET + '\nglobalThis.__injectError=' + json.dumps(inject) + ';\n' + controller.SMOKE_JS
                run = subprocess.run([controller.NODE, '-e', source, 'ws://offline.invalid'], capture_output=True, text=True, timeout=10)
                result = json.loads(run.stdout)
                requests = json.loads(run.stderr)
                self.assertEqual(1 if inject else 0, run.returncode)
                self.assertEqual('FAIL' if inject else 'PASS', result['status'])
                self.assertTrue(result['ownedTargetClosed'])
                methods = [r['method'] for r in requests]
                for method in ('Runtime.enable', 'Network.enable', 'Page.enable', 'Log.enable'):
                    self.assertLess(methods.index(method), methods.index('Page.navigate'))
                self.assertEqual('about:blank', requests[0]['params']['url'])
                nav = next(r for r in requests if r['method'] == 'Page.navigate')
                self.assertTrue(nav['params']['url'].startswith('data:text/html'))
                self.assertEqual({'targetId': 'owned-test-target'}, requests[-1]['params'])
                if inject:
                    self.assertEqual('Runtime.exceptionThrown', result['errors'][0]['method'])

    def test_close_failure_still_waits_and_terminates_original_supervisor(self):
        supervisor = Mock()
        supervisor.poll.return_value = None
        supervisor.wait.side_effect = [subprocess.TimeoutExpired('offline', 25), 0]
        with tempfile.TemporaryDirectory() as tmp, patch.object(controller.subprocess, 'run', side_effect=OSError('offline CDP failure')):
            receipt = {}
            controller.finish_supervisor(supervisor, 'ws://offline.invalid', Path(tmp), receipt)
        self.assertIn('browserCloseError', receipt)
        self.assertTrue(receipt['supervisorTerminated'])
        self.assertEqual(0, receipt['supervisorExit'])
        self.assertEqual([25, 30], [call.kwargs['timeout'] for call in supervisor.wait.call_args_list])
        supervisor.terminate.assert_called_once()

    def test_cleanup_observation_cannot_satisfy_runtime_wait(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'journal'
            path.write_text(json.dumps({'phase': 'end', 'kind': 'cleanup', 'outcome': 'COMPLETE', 'counts': [8, 1]}) + '\n')
            self.assertEqual([], controller.runtime_scans(path))
            record = {'phase': 'end', 'kind': 'runtime', 'outcome': 'RECOVERED_COMPLETE', 'counts': [8, 1],
                      'limits': controller.LIMITS, 'root': tmp, 'events': [{'errno': 2}]}
            path.write_text(json.dumps(record) + '\n')
            self.assertEqual([record], controller.runtime_scans(path, Path(tmp)))
            record['outcome'] = 'FAILED'; path.write_text(json.dumps(record) + '\n')
            with self.assertRaisesRegex(RuntimeError, 'runtime scan rejected'):
                controller.runtime_scans(path)

    def test_mixed_parent_still_requires_mainline_adoption(self):
        for flat in (False, True):
            with self.subTest(flat=flat):
                record = {'readinessComplete': True, 'cdp': {'status': 'PASS', 'domAsserted': True, 'ownedTargetClosed': True},
                          'runtimeScansBeforeClose': [{}, {}], 'browserCloseExit': 0, 'supervisorExit': 0,
                          'ownedRootAbsent': True, 'isolationMarkerAbsent': True, 'diagnosticVerified': True,
                          'before': {'fixed': 'fixture'}, 'after': {'fixed': 'fixture'},
                          'capacityBefore': {}, 'capacityAfter': {}, 'errors': [],
                          'profileApplicability': {'Default': {'flatRegularOnly': flat}}}
                controller.finalize_status(record)
                self.assertEqual('HOST_SMOKE_PASS', record['runtimeSmoke']['status'])
                self.assertEqual('HOLD_MAINLINE_EVALUATION', record['adoptionStatus'])
                record['browserCloseExit'] = 1
                controller.finalize_status(record)
                self.assertEqual('NOT_PASS', record['runtimeSmoke']['status'])
                self.assertFalse(record['runtimeSmoke']['checks']['browserClose'])

    def test_owned_metadata_nonflat_and_special_are_explicit(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            default = root / 'profile/Default'; default.mkdir(parents=True)
            (default / 'state').write_bytes(b'offline')
            identity = [root.stat().st_dev, root.stat().st_ino]
            self.assertTrue(controller.inspect_owned_profile(root, identity)['Default']['flatRegularOnly'])
            (default / 'Cache').mkdir(); (default / 'link').symlink_to('missing-outside')
            record = controller.inspect_owned_profile(root, identity)['Default']
            self.assertFalse(record['flatRegularOnly'])
            self.assertEqual(['Cache'], record['subdirectories'])
            self.assertEqual('link', record['specialEntries'][0]['name'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
