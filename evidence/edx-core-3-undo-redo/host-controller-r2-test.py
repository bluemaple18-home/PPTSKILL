"""只用離線 mocks 驗證 Core3 controller；禁止真 browser／產品程序。"""
from contextlib import ExitStack
from collections import namedtuple
import copy
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import MagicMock, Mock, patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('core3_r2_offline', HERE / 'host-controller-r2.py')
controller = importlib.util.module_from_spec(spec)
with patch.object(subprocess, 'Popen', side_effect=AssertionError('import 不得啟動程序')):
    spec.loader.exec_module(controller)
C = controller


def manifest():
    return json.loads((HERE / 'host-controller-r2-manifest.json').read_text())


def scan(kind='runtime', outcome='COMPLETE', identity=1):
    return {'id': identity, 'kind': kind, 'root': '/owned', 'limits': dict(C.LIMITS) if kind == 'runtime' else None,
            'outcome': outcome, 'counts': [12, 2], 'events': [{'errno': 2, 'causes': [{'errno': 2, 'message': '原始原因'}]}] if outcome == 'RECOVERED_COMPLETE' else []}


def diagnostic(scans):
    sha = manifest()['canonicalFiles']['scripts/tmp_artifact_lifecycle.py']
    return {'scanner': str(C.CORE / 'scripts/tmp_artifact_lifecycle.py'), 'scannerSha256Before': sha, 'scannerSha256After': sha,
            'diagnosticErrors': [], 'unfinishedScans': [], 'lineAndOpcodeTracing': False, 'scans': scans}


def native_groups(code=0, exited=True, convergence=True):
    lifecycle = Mock()
    signals = MagicMock()
    signals.__enter__.return_value = signals
    signals.first_signal = None
    lifecycle.SignalController.return_value = signals
    lifecycle.child_exited_without_reaping.return_value = exited
    lifecycle.wait_for_process_group.return_value = convergence
    anchor = namedtuple('Anchor', 'pid process_group session start_time')(123, 123, None, None)
    lifecycle.process_group_anchor.return_value = anchor
    return lifecycle, signals


class ControllerTests(unittest.TestCase):
    def test_import_no_launch_and_fixed_contract(self):
        self.assertEqual(C.LIMITS, {'max_bytes': 67108864, 'max_file_count': 10000, 'ttl_seconds': 3600})
        tasks = C.tasks()
        self.assertEqual([t[0] for t in tasks], ['historyBrowser', 'pgq'])
        self.assertEqual([t[2] for t in tasks], [900, 1800])
        self.assertEqual(tasks[0][1][1:], ['tools/edx-wp1-s4-browser-acceptance.mjs', str(C.OUT / 'undo-redo'), '--undo-redo-regression'])
        self.assertEqual(tasks[1][1][1:3], ['--test', '--test-concurrency=1'])
        self.assertEqual(len(tasks[1][1][3:]), 4)
        self.assertEqual(C.OUT.name, 'host-acceptance-r2')

    def test_manifest_pending_rejected_without_launch(self):
        pending = manifest(); pending['state'] = 'PREPARED_PENDING_MAINLINE_FINAL'
        with patch.object(C, 'read_regular', return_value=json.dumps(pending).encode()), self.assertRaisesRegex(RuntimeError, 'final'):
            C.load_manifest()

    def test_integration_status_head_and_hash_rejected(self):
        approved = manifest(); approved['state'] = 'FINAL_FOR_CORE3_ACCEPTANCE'
        integration = json.loads(C.INTEGRATION.read_text())
        cases = [('status', 'PASS'), ('integratedHEAD', '0' * 40), ('canonicalRoot', '/foreign'), ('sourceSHA256', {})]
        for key, value in cases:
            bad = copy.deepcopy(integration); bad[key] = value
            with self.subTest(key=key), patch.object(C, 'read_regular', side_effect=[json.dumps(approved).encode(), json.dumps(bad).encode()]), patch.object(C, 'digest', return_value=approved['integrationReceiptSHA256']), self.assertRaises(RuntimeError):
                C.load_manifest()
        with patch.object(C, 'read_regular', return_value=json.dumps(approved).encode()), patch.object(C, 'digest', return_value='0' * 64), self.assertRaisesRegex(RuntimeError, 'hash'):
            C.load_manifest()

    def test_missing_integration_receipt_rejected(self):
        approved = manifest(); approved['state'] = 'FINAL_FOR_CORE3_ACCEPTANCE'
        with patch.object(C, 'read_regular', side_effect=[json.dumps(approved).encode(), FileNotFoundError('缺 receipt')]), self.assertRaises(FileNotFoundError):
            C.load_manifest()

    def test_live_readonly_identity_no_browser(self):
        approved = manifest(); approved['state'] = 'FINAL_FOR_CORE3_ACCEPTANCE'
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'manifest.json'; path.write_text(json.dumps(approved))
            with patch.object(C, 'MANIFEST', path):
                pinned = C.load_manifest()
                result = C.verify_identity(pinned)
        self.assertEqual(len(result['product']['source']), 75)
        self.assertEqual(len(result['product']['protected']), 4)
        self.assertEqual(result['integratedHEAD'], '28cad2d3beaaf32de2f62d0c08396aaba789ea01')

    def test_product_environment_owned_tmp_and_symlink_rejection(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); (root / 'tmp').mkdir()
            ownership = {'rootIdentity': [root.stat().st_dev, root.stat().st_ino]}
            with patch.dict(os.environ, {'TMPDIR': '/foreign', 'TMP': '/foreign', 'TEMP': '/foreign'}):
                env = C.product_environment(root, ownership)
            self.assertTrue(all(env[k] == str(root / 'tmp') for k in ('TMPDIR', 'TMP', 'TEMP')))
            self.assertEqual(env['PPTSKILL_DEVTOOLS_ACTIVE_PORT'], str(root / 'profile/DevToolsActivePort'))
            (root / 'tmp').rmdir(); (root / 'tmp').symlink_to('/private/tmp')
            with self.assertRaises(RuntimeError): C.product_environment(root, ownership)

    def test_bind_owned_formal_ttl_and_foreign_event_rejection(self):
        with tempfile.TemporaryDirectory() as tmp:
            parent = Path(tmp); root = parent / 'aic-b-fixture'; root.mkdir()
            profile = root / 'profile'
            event = {'profile': str(profile), 'devtools_active_port': str(profile / 'DevToolsActivePort')}
            identity = {'git_common_dir': '/mock/common'}
            lifecycle = Mock(); lifecycle.root_location.return_value = (parent, 'aic-b-'); lifecycle.repo_identity.return_value = identity
            owned = dict(root=str(root), purpose='browser-session', repo_identity=identity, owner_nonce='owned', created_at=0, expires_at=3600, max_bytes=67108864, max_file_count=10000)
            marker = parent / 'marker.json'
            marker.write_text(json.dumps(dict(root=str(root), purpose='browser-session', status='active', git_common_dir='/mock/common', run_nonce='run')))
            source = root / '.tmp-artifact-manifest.json'; source.write_text(json.dumps(owned))
            self.assertEqual(C.helpers.bind_owned(event, marker, lifecycle)[0], root)
            owned['expires_at'] = 120; source.write_text(json.dumps(owned))
            with self.assertRaises(RuntimeError): C.helpers.bind_owned(event, marker, lifecycle)
            event['devtools_active_port'] = '/foreign/DevToolsActivePort'
            with self.assertRaises(RuntimeError): C.helpers.bind_owned(event, marker, lifecycle)

    def test_readiness_25_seconds_finalizes_without_product(self):
        with tempfile.TemporaryDirectory() as tmp, ExitStack() as stack:
            out = Path(tmp) / 'out'
            stack.enter_context(patch.dict(os.environ, {}, clear=True))
            for target, name, value in [(C, 'OUT', out), (C, 'load_manifest', Mock(return_value=manifest())),
                (C, 'verify_identity', Mock(return_value={'pinned': True})), (C.helpers, 'load_lifecycle', Mock()),
                (C.helpers, 'capacity_evidence', Mock(return_value={'available': True})),
                (C.subprocess, 'check_output', Mock(return_value=tmp)), (C.subprocess, 'Popen', Mock(return_value=Mock(pid=123))),
                (C.time, 'monotonic', Mock(side_effect=[0, 26, 26]))]:
                stack.enter_context(patch.object(target, name, value))
            cleanup = stack.enter_context(patch.object(C.helpers, 'finish_supervisor'))
            products = stack.enter_context(patch.object(C, 'run_products'))
            self.assertEqual(C.run_acceptance(), 1)
            products.assert_not_called(); cleanup.assert_called_once()
            receipt = json.loads((out / 'controller-receipt.json').read_text())
            self.assertEqual(receipt['readinessDeadlineSeconds'], 25)
            self.assertIn('25 秒', receipt['firstCause']['error'])
            self.assertFalse(receipt['cleanupVerified'])

    def test_regular_read_rejects_symlink_and_oversize(self):
        with tempfile.TemporaryDirectory() as tmp:
            regular = Path(tmp) / 'data'; regular.write_text('12345')
            link = Path(tmp) / 'link'; link.symlink_to(regular)
            with self.assertRaises(OSError): C.read_regular(link)
            with self.assertRaises(RuntimeError): C.read_regular(regular, 2)

    def test_runtime_failure_stops_active_product_preserves_exit(self):
        for outcome in ('FAILED', 'BUDGET_REJECTED', 'UNKNOWN'):
            process = Mock(pid=123, returncode=-15)
            process.poll.return_value = None
            process.wait.return_value = -15
            lifecycle, signals = native_groups()
            supervisor = Mock(); supervisor.poll.return_value = None
            receipt = {}
            with self.subTest(outcome=outcome), tempfile.TemporaryDirectory() as tmp, patch.object(C, 'OUT', Path(tmp)), patch.object(C.subprocess, 'Popen', return_value=process), patch.object(C.helpers, 'runtime_scans', side_effect=[[], RuntimeError(outcome)]):
                with self.assertRaises(C.RuntimeObservationError): C.run_task('historyBrowser', [], 900, {}, supervisor, Path('/owned'), receipt, lifecycle)
            signals.send.assert_any_call(C.signal.SIGTERM)
            self.assertEqual(receipt['historyBrowserExit'], -15)
            self.assertTrue(receipt['historyBrowserTerminated'])

    def test_product_nonzero_stops_second_task(self):
        process = Mock(pid=123, returncode=7); process.wait.return_value = 7
        lifecycle, signals = native_groups()
        supervisor = Mock(); supervisor.poll.return_value = None
        receipt = {}
        with tempfile.TemporaryDirectory() as tmp, patch.object(C, 'OUT', Path(tmp)), patch.object(C.subprocess, 'Popen', return_value=process) as launch, patch.object(C.helpers, 'runtime_scans', return_value=[]):
            with self.assertRaises(C.ProductExitError): C.run_products({}, supervisor, Path('/owned'), receipt, lifecycle)
        self.assertEqual(launch.call_count, 1)
        self.assertEqual(receipt['historyBrowserExit'], 7)
        self.assertNotIn('pgqStarted', receipt)

    def test_simultaneous_runtime_failure_keeps_product_exit(self):
        process = Mock(pid=123, returncode=8); process.wait.return_value = 8
        lifecycle, signals = native_groups()
        supervisor = Mock(); supervisor.poll.return_value = None
        receipt = {}
        with tempfile.TemporaryDirectory() as tmp, patch.object(C, 'OUT', Path(tmp)), patch.object(C.subprocess, 'Popen', return_value=process), patch.object(C.helpers, 'runtime_scans', side_effect=[[], RuntimeError('FAILED 原因')]):
            with self.assertRaises(C.RuntimeObservationError): C.run_task('historyBrowser', [], 900, {}, supervisor, Path('/owned'), receipt, lifecycle)
        self.assertEqual(receipt['historyBrowserExit'], 8)

    def test_timeout_terminates_and_escalates_only_owned_product(self):
        process = Mock(pid=123, returncode=-9); process.poll.return_value = None
        process.wait.return_value = -9
        lifecycle, signals = native_groups(exited=False)
        lifecycle.wait_for_process_group.side_effect = [False, False, True]
        receipt = {}
        with tempfile.TemporaryDirectory() as tmp, patch.object(C, 'OUT', Path(tmp)), patch.object(C.subprocess, 'Popen', return_value=process), patch.object(C, 'runtime_guard', return_value=[]), patch.object(C.time, 'monotonic', side_effect=[0, 901]):
            with self.assertRaisesRegex(RuntimeError, 'timeout'): C.run_task('historyBrowser', [], 900, {}, Mock(), Path('/owned'), receipt, lifecycle)
        signals.send.assert_any_call(C.signal.SIGTERM); signals.send.assert_any_call(C.signal.SIGKILL)
        self.assertEqual(receipt['historyBrowserExit'], -9)

    def test_descendants_nonconvergence_is_no_go_without_reap(self):
        process = Mock(pid=123)
        lifecycle, signals = native_groups(convergence=False)
        receipt = {}
        with tempfile.TemporaryDirectory() as tmp, patch.object(C, 'OUT', Path(tmp)), patch.object(C.subprocess, 'Popen', return_value=process) as launch, patch.object(C, 'runtime_guard', return_value=[]):
            with self.assertRaisesRegex(RuntimeError, 'NO_GO'):
                C.run_products({}, Mock(), Path('/owned'), receipt, lifecycle)
        self.assertEqual(launch.call_count, 1)
        self.assertTrue(launch.call_args.kwargs['start_new_session'])
        signals.attach.assert_called_once_with(123)
        signals.send.assert_any_call(C.signal.SIGKILL)
        process.wait.assert_not_called()
        process.poll.assert_not_called()
        self.assertTrue(receipt['cleanupRaceRisk'])
        self.assertFalse(receipt['historyBrowserGroupConverged'])
        self.assertIn('historyBrowserGroupCleanupError', receipt)
        receipt.update(errors=[], ownedRootAbsent=True, isolationMarkerAbsent=True, pidsAbsent=True)
        C.finalize_status(receipt)
        self.assertEqual(receipt['status'], 'NOT_PASS')
        self.assertFalse(receipt['checks']['cleanup'])

    def test_residual_descendants_reaped_only_after_convergence(self):
        process = Mock(pid=123); process.wait.return_value = 0
        lifecycle, signals = native_groups()
        lifecycle.wait_for_process_group.side_effect = [False, True]
        receipt = {}
        with tempfile.TemporaryDirectory() as tmp, patch.object(C, 'OUT', Path(tmp)), patch.object(C.subprocess, 'Popen', return_value=process), patch.object(C, 'runtime_guard', return_value=[]):
            with self.assertRaisesRegex(RuntimeError, 'descendants'):
                C.run_task('historyBrowser', [], 900, {}, Mock(), Path('/owned'), receipt, lifecycle)
        self.assertTrue(receipt['historyBrowserGroupConverged'])
        self.assertEqual(receipt['historyBrowserExit'], 0)
        signals.detach.assert_called_once()
        process.poll.assert_not_called()

    def test_sequential_tasks_and_browser_evidence_gate(self):
        order = []
        with patch.object(C, 'run_task', side_effect=lambda key, *args: order.append(key)), patch.object(C, 'check_browser_receipt', return_value={'status': 'pass'}):
            C.run_products({}, Mock(), Path('/owned'), {}, Mock())
        self.assertEqual(order, ['historyBrowser', 'pgq'])
        with patch.object(C, 'run_task') as run, patch.object(C, 'check_browser_receipt', side_effect=RuntimeError('缺 viewport')):
            with self.assertRaises(RuntimeError): C.run_products({}, Mock(), Path('/owned'), {}, Mock())
        self.assertEqual(run.call_count, 1)

    def test_browser_both_viewports_and_errors_required(self):
        record = {'status': 'pass', 'runs': [dict(width=w, height=h, status='pass', targetClosed=True, traceback=False,
                  **{k: [] for k in ('console', 'pageErrors', 'networkFailures', 'httpErrors', 'remoteRequests')}) for w, h in ((1280, 720), (1600, 900))]}
        with patch.object(C, 'read_regular', return_value=json.dumps(record).encode()): C.check_browser_receipt()
        for key, value in [('targetClosed', False), ('remoteRequests', ['https://bad']), ('width', 900), ('pageErrors', ['error'])]:
            bad = copy.deepcopy(record); bad['runs'][1][key] = value
            with self.subTest(key=key), patch.object(C, 'read_regular', return_value=json.dumps(bad).encode()), self.assertRaises(RuntimeError): C.check_browser_receipt()

    def test_recovered_complete_keeps_original_events_causes(self):
        record = diagnostic([scan(outcome='RECOVERED_COMPLETE'), scan(identity=2), scan('cleanup', identity=3)])
        original = copy.deepcopy(record)
        journal = ''.join(json.dumps({'phase': 'end', **s}) + '\n' for s in record['scans'])
        with patch.object(C, 'read_regular', return_value=journal.encode()):
            self.assertIs(C.check_diagnostic(record, manifest(), Path('/owned')), record)
        self.assertEqual(record, original)
        self.assertEqual(record['scans'][0]['events'][0]['causes'][0]['errno'], 2)

    def test_diagnostic_rejects_incomplete_errors_budget_and_wrong_identity(self):
        record = diagnostic([scan(), scan(identity=2), scan('cleanup', identity=3)])
        cases = []
        for key, value in [('unfinishedScans', [1]), ('diagnosticErrors', ['error']), ('scannerSha256After', 'bad')]:
            bad = copy.deepcopy(record); bad[key] = value; cases.append(bad)
        for key, value in [('outcome', 'FAILED'), ('outcome', 'BUDGET_REJECTED'), ('outcome', 'UNKNOWN'), ('counts', None), ('limits', {'ttl_seconds': 120}), ('root', '/foreign')]:
            bad = copy.deepcopy(record); bad['scans'][0][key] = value; cases.append(bad)
        for bad in cases:
            with self.subTest(bad=bad), self.assertRaises(RuntimeError): C.check_diagnostic(bad, manifest(), Path('/owned'))
        for journal in ('{}', '{}\n'):
            with patch.object(C, 'read_regular', return_value=journal.encode()), self.assertRaises(RuntimeError): C.check_diagnostic(record, manifest(), Path('/owned'))

    def test_supervisor_cleanup_still_waits_if_close_fails(self):
        supervisor = Mock(); supervisor.poll.return_value = None; supervisor.wait.return_value = 0
        receipt = {}
        with tempfile.TemporaryDirectory() as tmp, patch.object(C.helpers.subprocess, 'run', side_effect=OSError('CDP 失敗')):
            C.helpers.finish_supervisor(supervisor, 'ws://mock', Path(tmp), receipt)
        supervisor.wait.assert_called_once_with(timeout=25)
        self.assertIn('browserCloseError', receipt)

    def test_full_flow_mock_success_and_runtime_failure_cleanup(self):
        for runtime_failure in (False, True):
            with self.subTest(runtime_failure=runtime_failure), tempfile.TemporaryDirectory() as tmp, ExitStack() as stack:
                root = Path(tmp); out = root / 'output'; owned = root / 'owned'; owned.mkdir(); (owned / 'tmp').mkdir()
                ownership = {'rootIdentity': [owned.stat().st_dev, owned.stat().st_ino]}
                supervisor = Mock(pid=321); supervisor.poll.return_value = None
                lifecycle = Mock(); lifecycle.recovery_process_observation.return_value = {'matches': []}
                approved = manifest()
                stack.enter_context(patch.dict(os.environ, {}, clear=True))
                for target, name, value in [(C, 'OUT', out), (C, 'load_manifest', Mock(return_value=approved)),
                    (C, 'verify_identity', Mock(return_value={'pinned': True})), (C.helpers, 'load_lifecycle', Mock(return_value=lifecycle)),
                    (C.helpers, 'capacity_evidence', Mock(return_value={'available': True})),
                    (C.subprocess, 'check_output', Mock(return_value=str(root))),
                    (C, 'runtime_guard', Mock(return_value=[])), (C.helpers, 'bind_owned', Mock(return_value=(owned, ownership))),
                    (C.helpers, 'endpoint_from', Mock(return_value='ws://mock'))]:
                    stack.enter_context(patch.object(target, name, value))
                def launch(*args, **kwargs):
                    (out / 'launcher.stdout').write_text(json.dumps({'event': 'browser-starting'}) + '\n')
                    return supervisor
                stack.enter_context(patch.object(C.subprocess, 'Popen', side_effect=launch))
                def products(env, sup, current, receipt, lifecycle):
                    self.assertEqual(env['TMPDIR'], str(owned / 'tmp'))
                    receipt['historyBrowserExit'] = -15 if runtime_failure else 0
                    if runtime_failure: raise C.RuntimeObservationError('FAILED 原始 runtime 原因')
                    receipt.update(pgqExit=0, browserAcceptance={'status': 'pass'}, historyBrowserGroupConverged=True, pgqGroupConverged=True)
                stack.enter_context(patch.object(C, 'run_products', side_effect=products))
                def finish(sup, endpoint, directory, receipt):
                    receipt.update(browserCloseExit=0, supervisorExit=0)
                    supervisor.poll.return_value = 0
                    scans = [scan(outcome='FAILED' if runtime_failure else 'RECOVERED_COMPLETE'), scan(identity=2), scan('cleanup', identity=3)]
                    for s in scans: s['root'] = str(owned)
                    (out / 'resource-observation.json').write_text(json.dumps(diagnostic(scans)))
                    (out / 'scan-events.jsonl').write_text(''.join(json.dumps({'phase': 'end', **s}) + '\n' for s in scans))
                    evidence = out / 'lifecycle/evidence'; evidence.mkdir(parents=True)
                    (evidence / 'session.json').write_text(json.dumps({'mode': 'browser', 'root': str(owned), 'pid': 987}))
                    shutil.rmtree(owned)
                cleanup = stack.enter_context(patch.object(C.helpers, 'finish_supervisor', side_effect=finish))
                self.assertEqual(C.run_acceptance(), 1 if runtime_failure else 0)
                cleanup.assert_called_once()
                receipt = json.loads((out / 'controller-receipt.json').read_text())
                self.assertTrue(receipt['pidsAbsent'])
                self.assertIn('diagnostic', receipt)
                if runtime_failure:
                    self.assertEqual(receipt['firstCause']['category'], 'RUNTIME_OBSERVATION')
                    self.assertEqual(receipt['failureClassification'], 'RUNTIME_OBSERVATION')
                    self.assertNotIn('pgqExit', receipt)
                else:
                    self.assertEqual(receipt['status'], 'PASS')
                    self.assertEqual(receipt['recovery'], 'RECOVERY_OBSERVED')


if __name__ == '__main__':
    unittest.main(verbosity=2)
