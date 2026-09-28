"""盲 Reviewer A：兩個 controller 控制流反例；所有程序與 signal API 都是 mock。"""
from contextlib import ExitStack
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
from unittest.mock import Mock, patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('review_a_frozen_controller_tests', HERE / 'host-controller-r2-test.py')
tests = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tests)
C = tests.C

def signal_exit_race():
    lifecycle, signals = tests.native_groups()
    process = Mock(pid=123); process.wait.return_value = 0
    launches = []
    def exited(*args):
        signals.first_signal = C.signal.SIGTERM
        return True
    lifecycle.child_exited_without_reaping.side_effect = exited
    def launch(command, **kwargs):
        launches.append(command)
        return process
    receipt = {}
    with tempfile.TemporaryDirectory() as tmp, patch.object(C, 'OUT', Path(tmp)), patch.object(C.subprocess, 'Popen', side_effect=launch), patch.object(C, 'runtime_guard', return_value=[]), patch.object(C, 'check_browser_receipt', return_value={'status': 'pass'}):
        C.run_products({}, Mock(), Path('/owned-fixture'), receipt, lifecycle)
    assert len(launches) == 2 and receipt['pgqStarted'] is True
    assert receipt['historyBrowserExit'] == 0 and 'historyBrowserStopCause' not in receipt
    return {'signal': 'SIGTERM at non-reaping exit observation', 'productLaunches': len(launches), 'receipt': receipt}

def cleanup_after_nonconvergence():
    observed = {}
    with tempfile.TemporaryDirectory() as tmp, ExitStack() as stack:
        root = Path(tmp); out = root / 'output'; owned = root / 'owned'; owned.mkdir(); (owned / 'tmp').mkdir()
        ownership = {'rootIdentity': [owned.stat().st_dev, owned.stat().st_ino]}
        supervisor = Mock(pid=321); supervisor.poll.return_value = None
        product = Mock(pid=123)
        lifecycle, signals = tests.native_groups(convergence=False)
        stack.enter_context(patch.dict(os.environ, {}, clear=True))
        replacements = [(C, 'OUT', out), (C, 'load_manifest', Mock(return_value=tests.manifest())),
            (C, 'verify_identity', Mock(return_value={'pinned': True})),
            (C.helpers, 'load_lifecycle', Mock(return_value=lifecycle)),
            (C.helpers, 'capacity_evidence', Mock(return_value={'available': True})),
            (C.subprocess, 'check_output', Mock(return_value=str(root))),
            (C, 'runtime_guard', Mock(return_value=[])),
            (C.helpers, 'bind_owned', Mock(return_value=(owned, ownership))),
            (C.helpers, 'endpoint_from', Mock(return_value='ws://offline.invalid'))]
        for target, name, value in replacements:
            stack.enter_context(patch.object(target, name, value))
        launches = []
        def launch(command, **kwargs):
            launches.append(command)
            if len(launches) == 1:
                (out / 'launcher.stdout').write_text(json.dumps({'event': 'browser-starting'}) + '\n')
                return supervisor
            return product
        stack.enter_context(patch.object(C.subprocess, 'Popen', side_effect=launch))
        def finish(sup, endpoint, directory, receipt):
            observed.update(finishSupervisorCalled=True,
                cleanupRaceRiskAtFinish=receipt.get('cleanupRaceRisk'),
                productGroupConvergedAtFinish=receipt.get('historyBrowserGroupConverged'),
                productWaitCalls=product.wait.call_count,
                ownedRootStillExists=owned.exists())
        stack.enter_context(patch.object(C.helpers, 'finish_supervisor', side_effect=finish))
        code = C.run_acceptance()
        observed['exit'] = code
        observed['firstCause'] = json.loads((out / 'controller-receipt.json').read_text())['firstCause']
        assert code == 1 and len(launches) == 2
        assert observed['finishSupervisorCalled'] and observed['cleanupRaceRiskAtFinish'] is True
        assert observed['productGroupConvergedAtFinish'] is False and observed['productWaitCalls'] == 0
    return observed

paths = [HERE / ('host-controller-r2' + suffix) for suffix in ('.py', '-test.py', '-manifest.json')]
before = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
report = {'frozenSHA256': before, 'signalExitRace': signal_exit_race(), 'nonconvergedCleanup': cleanup_after_nonconvergence()}
report['deliveryUnchanged'] = before == {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
assert report['deliveryUnchanged']
(HERE / 'host-controller-r2-review-a-probes.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'signalExitRaceLaunches': report['signalExitRace']['productLaunches'], 'nonconvergedCleanup': report['nonconvergedCleanup'], 'deliveryUnchanged': report['deliveryUnchanged']}, ensure_ascii=False))
