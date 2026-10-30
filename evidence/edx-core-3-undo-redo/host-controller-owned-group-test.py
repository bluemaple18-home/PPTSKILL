"""Core3 單群組薄接線離線驗證；不啟任何真 browser／產品／supervisor。"""
import ast
from contextlib import ExitStack
import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import Mock, patch

HERE = Path(__file__).resolve().parent


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, HERE / filename)
    module = importlib.util.module_from_spec(spec)
    with patch.object(subprocess, 'Popen', side_effect=AssertionError('import 禁止 launch')):
        spec.loader.exec_module(module)
    return module


C = load('owned_group_test', 'host-controller-owned-group.py')
U = load('owned_client_test', 'host-client-owned-group.py')


class ClientTests(unittest.TestCase):
    def context(self, root):
        for part in ('profile', 'tmp', 'evidence'): (root / part).mkdir()
        (root / 'evidence/session.json').write_text(json.dumps({'root': str(root), 'mode': 'browser', 'pid': 500}))
        (root / '.tmp-artifact-manifest.json').write_text(json.dumps({'root': str(root), 'purpose': 'browser-session',
            'max_bytes': 67108864, 'max_file_count': 10000, 'created_at': 0, 'expires_at': 3600}))
        return dict(AI_CORE_TMP_ARTIFACT_ACTIVE='1', TMP_ARTIFACT_ROOT=str(root), TMPDIR=str(root / 'tmp'),
                    TMP=str(root / 'tmp'), TEMP=str(root / 'tmp'), TMP_SESSION_EVIDENCE=str(root / 'evidence'),
                    TMP_SESSION_WORKDIR=str(U.REPO), TMP_SESSION_DEVTOOLS_ACTIVE_PORT=str(root / 'profile/DevToolsActivePort'))

    def test_managed_context_and_wrong_environment(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); env = self.context(root)
            with patch.dict(os.environ, env, clear=True), patch.object(U.os, 'getpgrp', return_value=500), patch.object(U.os, 'getpgid', return_value=500):
                self.assertEqual(U.managed_context(), (root, 500, root / 'profile/DevToolsActivePort'))
                for key, bad in [('AI_CORE_TMP_ARTIFACT_ACTIVE', '0'), ('TMPDIR', '/foreign'), ('TMP_SESSION_DEVTOOLS_ACTIVE_PORT', '/foreign'), ('TMP_SESSION_WORKDIR', '/foreign')]:
                    with self.subTest(key=key), patch.dict(os.environ, {key: bad}), self.assertRaises(RuntimeError): U.managed_context()
                with patch.object(U.os, 'getpgid', return_value=999), self.assertRaises(RuntimeError): U.managed_context()
                (root / 'tmp').rmdir(); (root / 'tmp').symlink_to('/private/tmp')
                with self.assertRaises(RuntimeError): U.managed_context()

    def test_invalid_readiness_is_bounded(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'port'; path.write_text('99999\n/devtools/browser/id\n')
            with patch.object(U.time, 'monotonic', side_effect=[0, 0, 25]), patch.object(U.time, 'sleep'):
                with self.assertRaises(TimeoutError): U.readiness(path)
            path.write_text('9222\n/devtools/browser/abc-123\n')
            self.assertEqual(U.readiness(path), 'ws://127.0.0.1:9222/devtools/browser/abc-123')

    def flow(self, failure=None):
        with tempfile.TemporaryDirectory() as tmp, ExitStack() as stack:
            out = Path(tmp)
            stack.enter_context(patch.object(U, 'OUT', out))
            stack.enter_context(patch.object(U, 'managed_context', return_value=(Path('/owned'), 500, Path('/owned/profile/DevToolsActivePort'))))
            stack.enter_context(patch.object(U, 'readiness', return_value='ws://mock'))
            stack.enter_context(patch.object(U.os, 'getpgrp', return_value=500))
            stack.enter_context(patch.object(U.os, 'getpgid', return_value=500))
            stack.enter_context(patch.dict(os.environ, {'TMPDIR': '/owned/tmp', 'TMP': '/owned/tmp', 'TEMP': '/owned/tmp'}))
            stack.enter_context(patch.object(U.checks.legacy, 'check_browser_receipt', return_value={'status': 'pass'}))
            launched = []
            def launch(command, **kwargs):
                process = Mock(pid=600 + len(launched))
                process.wait.return_value = 0
                if not launched and failure is not None:
                    if isinstance(failure, BaseException): process.wait.side_effect = failure
                    else: process.wait.return_value = failure
                launched.append((command, kwargs, process))
                return process
            stack.enter_context(patch.object(U.subprocess, 'Popen', side_effect=launch))
            code = U.run_client()
            receipt = json.loads((out / 'client-receipt.json').read_text())
            return code, receipt, launched

    def test_success_mapping_serial_limits_and_close(self):
        code, receipt, launched = self.flow()
        self.assertEqual(code, 0); self.assertEqual(receipt['status'], 'PASS')
        self.assertEqual(len(launched), 3)
        self.assertIn('--undo-redo-regression', launched[0][0])
        self.assertEqual(launched[1][0][1:3], ['--test', '--test-concurrency=1'])
        self.assertEqual(len(launched[1][0][3:]), 4)
        for (_, kwargs, process), timeout in zip(launched, (900, 1800, 10)):
            self.assertEqual(kwargs['env']['PPTSKILL_DEVTOOLS_ACTIVE_PORT'], '/owned/profile/DevToolsActivePort')
            self.assertEqual(kwargs['env']['TMPDIR'], '/owned/tmp')
            self.assertNotIn('start_new_session', kwargs); self.assertNotIn('process_group', kwargs)
            process.wait.assert_called_once_with(timeout=timeout)

    def test_nonzero_preserved_prevents_pgq_closes_browser(self):
        code, receipt, launched = self.flow(7)
        self.assertEqual(code, 7); self.assertEqual(receipt['historyBrowserExit'], 7)
        self.assertNotIn('pgqStarted', receipt)
        self.assertEqual(len(launched), 2)
        self.assertEqual(receipt['browserCloseExit'], 0)
        self.assertEqual(receipt['firstCause']['stage'], 'historyBrowser')

    def test_timeout_and_signals_delegate_without_continuation_or_kill(self):
        for failure, expected in [(subprocess.TimeoutExpired('node', 900), 124), (KeyboardInterrupt(), 130), (-15, 143)]:
            with self.subTest(failure=failure):
                code, receipt, launched = self.flow(failure)
                self.assertEqual(code, expected)
                self.assertTrue(receipt['outerStopRequired'])
                self.assertEqual(len(launched), 1)
                self.assertNotIn('pgqStarted', receipt)
                self.assertNotIn('browserCloseExit', receipt)
                launched[0][2].terminate.assert_not_called(); launched[0][2].kill.assert_not_called()

    def test_child_group_mismatch_delegates(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(U.os, 'getpgrp', return_value=500), patch.object(U.os, 'getpgid', return_value=999), patch.object(U.subprocess, 'Popen', return_value=Mock(pid=600)) as launch:
            receipt = {}
            with self.assertRaises(RuntimeError): U.ordinary([], 900, {}, 500, Path(tmp) / 'log', receipt, 'historyBrowser')
            self.assertTrue(receipt['outerStopRequired']); launch.return_value.wait.assert_not_called()

    def test_readiness_failure_never_spawns_products(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(U, 'OUT', Path(tmp)), patch.object(U, 'managed_context', return_value=(Path('/owned'), 500, Path('/port'))), patch.dict(os.environ, {'TMPDIR': '/owned/tmp', 'TMP': '/owned/tmp', 'TEMP': '/owned/tmp'}), patch.object(U, 'readiness', side_effect=TimeoutError('25 秒')), patch.object(U.subprocess, 'Popen') as launch:
            self.assertEqual(U.run_client(), 2); launch.assert_not_called()


class OuterTests(unittest.TestCase):
    def test_no_new_authority_and_single_outer_launch(self):
        for filename in ('host-controller-owned-group.py', 'host-client-owned-group.py'):
            tree = ast.parse((HERE / filename).read_text())
            calls = [n for n in ast.walk(tree) if isinstance(n, ast.Call)]
            forbidden = {'run_task', 'finish_supervisor', 'SignalController', 'killpg', 'setsid', 'setpgid', 'terminate', 'kill', 'cleanup', 'rmtree'}
            self.assertFalse([n for n in calls if isinstance(n.func, ast.Attribute) and n.func.attr in forbidden])
            self.assertFalse([kw for n in calls for kw in n.keywords if kw.arg in ('start_new_session', 'process_group', 'preexec_fn')])
        tree = ast.parse((HERE / 'host-controller-owned-group.py').read_text())
        self.assertEqual(sum(isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == 'Popen' for n in ast.walk(tree)), 1)
        command = C.command()
        self.assertEqual(command[command.index('--ttl-seconds') + 1], '3600')
        self.assertEqual(command[-3:], [C.helpers.PYTHON, '-B', str(HERE / 'host-client-owned-group.py')])
        self.assertEqual(C.OUT.name, 'host-acceptance-owned-group')

    def test_actual_identity_with_temporary_final_manifest(self):
        manifest = json.loads(C.MANIFEST.read_text()); manifest['state'] = 'FINAL_FOR_CORE3_ACCEPTANCE'
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'manifest.json'; path.write_text(json.dumps(manifest))
            with patch.object(C, 'MANIFEST', path), patch.object(C.legacy, 'MANIFEST', path):
                record = C.verify_identity(C.load_manifest())
        self.assertEqual(record['integratedHEAD'], '71b774d31b8e7aa9e05786c8dc431c7528dabdc1')
        self.assertEqual(len(record['product']['source']), 75)
        self.assertEqual(len(record['product']['protected']), 4)

    def test_pending_and_integration_schema_mismatch_rejected(self):
        pending = json.loads(C.MANIFEST.read_text()); pending['state'] = 'PREPARED_PENDING_MAINLINE_FINAL'
        with patch.object(C, 'read_regular', return_value=json.dumps(pending).encode()), self.assertRaisesRegex(RuntimeError, 'FINAL'):
            C.load_manifest()
        manifest = json.loads(C.MANIFEST.read_text()); manifest['state'] = 'FINAL_FOR_CORE3_ACCEPTANCE'
        record = json.loads(C.INTEGRATION.read_text())
        self.assertNotIn('canonicalRoot', record)
        for key, value in [('status', 'PASS'), ('integratedHEAD', 'bad'), ('unchangedSHA256', {})]:
            bad = copy.deepcopy(record); bad[key] = value
            with self.subTest(key=key), patch.object(C, 'read_regular', side_effect=[json.dumps(manifest).encode(), json.dumps(bad).encode()]), patch.object(C, 'digest', return_value=manifest['integrationReceiptSHA256']), self.assertRaises(RuntimeError): C.load_manifest()

    def passing(self):
        return {'errors': [], 'supervisorExit': 0, 'client': dict(status='PASS', exit=0, browserCloseExit=0, readinessComplete=True, historyBrowserExit=0, pgqExit=0),
                'browserVerified': True, 'diagnosticVerified': True, 'cleanupVerified': True,
                'before': {'hash': 'same'}, 'after': {'hash': 'same'}, 'capacityBefore': {}, 'capacityAfter': {}}

    def test_observer_cleanup_identity_and_exit_fail_cannot_pass(self):
        good = self.passing(); C.finalize(good); self.assertEqual(good['status'], 'PASS')
        for key, value in [('diagnosticVerified', False), ('cleanupVerified', False), ('after', {'hash': 'drift'}), ('supervisorExit', 2), ('errors', [{'error': 'signal'}]), ('client', {'status': 'NOT_PASS'})]:
            receipt = self.passing(); receipt[key] = value
            with self.subTest(key=key):
                C.finalize(receipt); self.assertEqual(receipt['status'], 'NOT_PASS')

    def test_diagnostic_recovery_preserved_and_incomplete_rejected(self):
        manifest = json.loads(C.MANIFEST.read_text()); sha = manifest['canonicalFiles']['scripts/tmp_artifact_lifecycle.py']
        scans = [dict(id=i, root='/owned', kind=kind, outcome='RECOVERED_COMPLETE' if i == 1 else 'COMPLETE',
                 counts=[12, 2], limits=C.LIMITS if kind == 'runtime' else None, events=[{'errno': 2, 'causes': [{'errno': 2}]}] if i == 1 else [])
                 for i, kind in ((1, 'runtime'), (2, 'runtime'), (3, 'cleanup'))]
        record = dict(scanner=str(C.CORE / 'scripts/tmp_artifact_lifecycle.py'), scannerSha256Before=sha, scannerSha256After=sha,
                      diagnosticErrors=[], unfinishedScans=[], lineAndOpcodeTracing=False, scans=scans)
        before = copy.deepcopy(record)
        journal = ''.join(json.dumps({'phase': 'end', **s}) + '\n' for s in scans).encode()
        with patch.object(C.legacy, 'read_regular', return_value=journal): C.legacy.check_diagnostic(record, manifest, Path('/owned'))
        self.assertEqual(record, before)
        for field, value in [('unfinishedScans', [1]), ('diagnosticErrors', ['error'])]:
            bad = copy.deepcopy(record); bad[field] = value
            with self.assertRaises(RuntimeError): C.legacy.check_diagnostic(bad, manifest, Path('/owned'))
        for outcome in ('FAILED', 'UNKNOWN', 'BUDGET_REJECTED'):
            bad = copy.deepcopy(record); bad['scans'][0]['outcome'] = outcome
            with self.assertRaises(RuntimeError): C.legacy.check_diagnostic(bad, manifest, Path('/owned'))

    def test_outer_wait_failure_no_close_no_kill_and_preserves_diagnostic(self):
        with tempfile.TemporaryDirectory() as tmp, ExitStack() as stack:
            out = Path(tmp) / 'out'
            stack.enter_context(patch.dict(os.environ, {}, clear=True))
            for target, name, value in [(C, 'OUT', out), (C, 'load_manifest', Mock(return_value={})),
                (C, 'verify_identity', Mock(return_value={'fixed': True})), (C.helpers, 'load_lifecycle', Mock()),
                (C.helpers, 'capacity_evidence', Mock(return_value={})), (C.subprocess, 'check_output', Mock(return_value=tmp))]:
                stack.enter_context(patch.object(target, name, value))
            supervisor = Mock(pid=100); supervisor.wait.side_effect = subprocess.TimeoutExpired('canonical', 3675)
            launch = stack.enter_context(patch.object(C.subprocess, 'Popen', return_value=supervisor))
            self.assertEqual(C.run_acceptance(), 1)
            self.assertEqual(launch.call_count, 1)
            supervisor.terminate.assert_not_called(); supervisor.kill.assert_not_called()
            receipt = json.loads((out / 'controller-receipt.json').read_text())
            self.assertEqual(receipt['supervisorState'], 'UNKNOWN_NO_EXTERNAL_INTERVENTION')
            self.assertEqual(receipt['status'], 'NOT_PASS')
            self.assertFalse(receipt['checks']['cleanup'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
