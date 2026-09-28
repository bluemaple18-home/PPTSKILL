"""Core3 正式驗收準備；import 不啟動，Mainline 定值 manifest 後才可執行。"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import stat
import signal
import subprocess
import time

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
CORE = Path('/Users/matt/ai-core')
OUT = HERE / 'host-acceptance-r2'
MANIFEST = HERE / 'host-controller-r2-manifest.json'
INTEGRATION = HERE / 'observer-r2-integration-verification.json'
LIMITS = {'max_bytes': 67108864, 'max_file_count': 10000, 'ttl_seconds': 3600}
HELPER_SHA = 'f8462b9e50f08a5f54f9adbbae54508119590ee935216546d9119aebf7e86c8c'
helper_path = HERE / 'host-smoke-r2-controller.py'
if hashlib.sha256(helper_path.read_bytes()).hexdigest() != HELPER_SHA:
    raise RuntimeError('已審 helper 身分漂移')
spec = importlib.util.spec_from_file_location('core3_r2_reused_helpers', helper_path)
helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)
# 私有 module instance；不修改歷史檔或其他 controller 的 module globals。
helpers.CORE, helpers.REPO, helpers.LIMITS = CORE, REPO, dict(LIMITS)
require, read_regular = helpers.require, helpers.read_regular


def digest(path):
    return hashlib.sha256(read_regular(path, 128 * 1024**2)).hexdigest()


def load_manifest():
    manifest = json.loads(read_regular(MANIFEST))
    require(manifest['state'] == 'FINAL_FOR_CORE3_ACCEPTANCE', 'manifest 尚待 Mainline final 定值')
    require(manifest['canonicalRoot'] == str(CORE) and manifest['limits'] == LIMITS, 'root/limits 漂移')
    require(re.fullmatch('[0-9a-f]{40}', manifest.get('integratedHEAD') or '') is not None, '缺固定 integratedHEAD')
    require(re.fullmatch('[0-9a-f]{64}', manifest.get('integrationReceiptSHA256') or '') is not None, '缺 integration receipt hash')
    require(digest(INTEGRATION) == manifest['integrationReceiptSHA256'], 'integration receipt hash 不符')
    integration = json.loads(read_regular(INTEGRATION))
    require(integration['status'] == 'CANONICAL_INTEGRATED_VERIFIED'
            and integration['canonicalRoot'] == str(CORE), 'canonical integration 未完整驗證')
    require(integration['integratedHEAD'] == manifest['integratedHEAD'], 'integration receipt HEAD 不符')
    require({**integration['sourceSHA256'], **integration['unchangedRuntimeSHA256']} == manifest['canonicalFiles'], 'integration receipt hashes 不符')
    return manifest


def verify_identity(manifest):
    require(load_manifest() == manifest, '執行期間 manifest 改變')
    head = subprocess.check_output(['git', '-C', str(CORE), 'rev-parse', 'HEAD'], text=True).strip()
    require(head == manifest['integratedHEAD'], 'canonical HEAD 不符')
    files = {}
    for name, expected in manifest['canonicalFiles'].items():
        files[name] = digest(CORE / name)
        committed = hashlib.sha256(subprocess.check_output(['git', '-C', str(CORE), 'show', head + ':' + name])).hexdigest()
        require(files[name] == expected == committed, 'canonical bytes 不符：' + name)
    policy = json.loads(read_regular(CORE / 'config/tmp_artifact_policy.json'))
    require(policy['defaults'] == LIMITS, '原 policy defaults 已改變')
    require(all(LIMITS[k] <= policy['hard_limits'][k] for k in LIMITS), '超過原 ceiling')
    frozen_path = HERE / 'transaction-boundary-r07-mainline-hashes.json'
    require(digest(frozen_path) == manifest['productManifestSHA256'], 'product manifest 漂移')
    frozen = json.loads(read_regular(frozen_path))
    product = {}
    for group, count in (('source', 75), ('protected', 4)):
        require(len(frozen[group]) == count, 'product count 不符')
        product[group] = {p: digest(REPO / p) for p in frozen[group]}
        require(product[group] == frozen[group], 'product bytes 不符：' + group)
    archive = frozen['archive']
    require((REPO / archive['path']).stat().st_size == archive['bytes'] and digest(REPO / archive['path']) == archive['sha256'], 'ZIP 不符')
    harness = {p: digest(HERE / p) for p in manifest['harnessFiles']}
    require(harness == manifest['harnessFiles'], 'controller／歷史接點身分漂移')
    return {'integratedHEAD': head, 'canonicalFiles': files, 'product': product, 'archive': archive,
            'manifestSHA256': digest(MANIFEST), 'integrationReceiptSHA256': digest(INTEGRATION), 'harnessFiles': harness}


def tasks():
    return [
        ('historyBrowser', [helpers.NODE, 'tools/edx-wp1-s4-browser-acceptance.mjs', str(OUT / 'undo-redo'), '--undo-redo-regression'], 900),
        ('pgq', [helpers.NODE, '--test', '--test-concurrency=1', 'tests/pgq-wp4-s3-content-integrity.test.mjs',
                 'tests/pgq-wp4-s3-sample-approval.test.mjs', 'tests/pgq-wp4-s4-full-deck-qa.test.mjs',
                 'tests/pgq-wp4-s4-required-visibility.test.mjs'], 1800),
    ]


class RuntimeObservationError(RuntimeError):
    """Runtime／observer 故障不算產品 assertion。"""


class ProductExitError(RuntimeError):
    """保留產品原始非零退出，不猜 assertion 首因。"""


def runtime_guard(supervisor, owned):
    # 已恢復 ENOENT 的 events 不刪除、不當成終態失敗。
    try:
        scans = helpers.runtime_scans(OUT / 'scan-events.jsonl', owned)
        require(supervisor.poll() is None, '產品執行時 supervisor 已退出')
    except Exception as error:
        raise RuntimeObservationError(str(error)) from error
    return scans


def run_task(key, command, limit, env, supervisor, owned, receipt, lifecycle):
    runtime_guard(supervisor, owned)
    lifecycle.ensure_process_group_observation()
    process = observer = anchor = None
    failure = None
    receipt[key + 'Started'] = True
    receipt[key + 'GroupConverged'] = False
    with lifecycle.SignalController() as signals:
        try:
            with (OUT / (key + '.log')).open('x') as log:
                process = subprocess.Popen(command, cwd=REPO, env=env, stdout=log,
                                           stderr=subprocess.STDOUT, start_new_session=True)
                receipt[key + 'Pid'] = process.pid
                observer = lifecycle.ChildExitObserver(process.pid)
                anchor = lifecycle.process_group_anchor(process, observer)
                receipt[key + 'GroupAnchor'] = anchor._asdict()
                signals.attach(anchor.process_group)
                deadline = time.monotonic() + limit
                while not lifecycle.child_exited_without_reaping(process, observer):
                    runtime_guard(supervisor, owned)
                    require(signals.first_signal is None, '產品收到中斷訊號')
                    require(time.monotonic() < deadline, key + ' 超過原 host04 timeout')
                    time.sleep(.1)
                runtime_guard(supervisor, owned)
        except BaseException as error:
            failure = error
            receipt[key + 'StopCause'] = {'type': type(error).__name__, 'message': str(error)}
        finally:
            try:
                if process is not None:
                    require(anchor is not None and observer is not None, 'NO_GO: 無法建立 product group anchor')
                    if failure is not None or signals.first_signal is not None:
                        signals.send(signal.SIGTERM)
                        receipt[key + 'Terminated'] = True
                    converged = lifecycle.wait_for_process_group(signals, process, observer, anchor, 1.0 if failure else .25)
                    if not converged:
                        # parent 正常退出但 descendants 尚活著，也不能通過或開始第二個 task。
                        if failure is None:
                            failure = RuntimeError('NO_GO: 產品 parent 退出但 descendants 未收斂')
                        signals.send(signal.SIGTERM)
                        receipt[key + 'Terminated'] = True
                        converged = lifecycle.wait_for_process_group(signals, process, observer, anchor, 1.0)
                    if not converged:
                        signals.send(signal.SIGKILL)
                        converged = lifecycle.wait_for_process_group(signals, process, observer, anchor, 1.0)
                    require(converged, 'NO_GO: product process group 未收斂')
                    receipt[key + 'GroupConverged'] = True
                    signals.detach()
                    # 直到整個群組已收斂才 reap，避免 PID reuse 或殺到 foreign group。
                    receipt[key + 'Exit'] = process.wait(timeout=1)
            except BaseException as error:
                receipt[key + 'GroupCleanupError'] = str(error)
                receipt['cleanupRaceRisk'] = True
                if failure is None: failure = error
            finally:
                if observer is not None: observer.close()
    if failure is not None:
        raise failure
    if receipt[key + 'Exit'] != 0:
        raise ProductExitError(key + ' 產品退出非零；停止後續')


def check_browser_receipt():
    record = json.loads(read_regular(OUT / 'undo-redo/acceptance.json', 16 * 1024**2))
    require(record['status'] == 'pass' and len(record['runs']) == 2, '雙 viewport receipt 未通過')
    for run, size in zip(record['runs'], ((1280, 720), (1600, 900))):
        require((run['width'], run['height']) == size and run['status'] == 'pass'
                and run['targetClosed'] is True and run['traceback'] is False, 'viewport/target/traceback 不符')
        require(all(run[k] == [] for k in ('console', 'pageErrors', 'networkFailures', 'httpErrors', 'remoteRequests')), '產品 error evidence 非空')
    return record


def run_products(env, supervisor, owned, receipt, lifecycle):
    for key, command, limit in tasks():
        run_task(key, command, limit, env, supervisor, owned, receipt, lifecycle)
        if key == 'historyBrowser':
            receipt['browserAcceptance'] = check_browser_receipt()


def product_environment(owned, ownership):
    require([owned.lstat().st_dev, owned.lstat().st_ino] == ownership['rootIdentity'], 'owned root 已替換')
    temporary = owned / 'tmp'
    require(stat.S_ISDIR(temporary.lstat().st_mode), 'owned tmp 不是實體目錄')
    env = os.environ.copy()
    env.update({k: str(temporary) for k in ('TMPDIR', 'TMP', 'TEMP')})
    env['PPTSKILL_DEVTOOLS_ACTIVE_PORT'] = str(owned / 'profile/DevToolsActivePort')
    return env


def check_diagnostic(record, manifest, owned):
    require(record['scanner'] == str(CORE / 'scripts/tmp_artifact_lifecycle.py')
            and record['scannerSha256Before'] == record['scannerSha256After'] == manifest['canonicalFiles']['scripts/tmp_artifact_lifecycle.py'], 'diagnostic scanner 不符')
    require(record['diagnosticErrors'] == [] and record['unfinishedScans'] == []
            and record['lineAndOpcodeTracing'] is False, 'diagnostic 不完整')
    scans = record['scans']
    for scan in scans:
        require(scan['root'] == str(owned) and scan['outcome'] in ('COMPLETE', 'RECOVERED_COMPLETE'), 'scan FAILED/BUDGET/UNKNOWN 或 root 不符')
        require(type(scan['counts']) is list and len(scan['counts']) == 2
                and all(type(n) is int and n >= 0 for n in scan['counts']), 'scan 缺完整 counts')
        require(scan['kind'] in ('runtime', 'cleanup') and scan['limits'] == (LIMITS if scan['kind'] == 'runtime' else None), 'scan limits 不符')
    require(sum(s['kind'] == 'runtime' for s in scans) >= 2 and any(s['kind'] == 'cleanup' for s in scans), '缺 runtime/cleanup scan')
    journal = read_regular(OUT / 'scan-events.jsonl', 16 * 1024**2).decode()
    require(journal.endswith('\n'), 'journal 尾端未完成')
    events = [json.loads(line) for line in journal.splitlines()]
    ends = [{k: v for k, v in e.items() if k != 'phase'} for e in events if e.get('phase') == 'end']
    require(ends == scans, 'journal／diagnostic 完整 scan 不一致')
    return record


def finalize_status(receipt):
    checks = {
        'readiness': receipt.get('readinessComplete') is True,
        'products': all(receipt.get(k + 'Exit') == 0 for k in ('historyBrowser', 'pgq')) and 'browserAcceptance' in receipt,
        'supervisor': receipt.get('browserCloseExit') == receipt.get('supervisorExit') == 0,
        'cleanup': all(receipt.get(k) is True for k in ('ownedRootAbsent', 'isolationMarkerAbsent', 'pidsAbsent')) and not receipt.get('cleanupRaceRisk', False),
        'productGroups': all(receipt.get(k + 'GroupConverged') is True for k in ('historyBrowser', 'pgq')),
        'identity': bool(receipt.get('before')) and receipt.get('before') == receipt.get('after'),
        'capacity': all(k in receipt for k in ('capacityBefore', 'capacityAfter')),
        'diagnostic': receipt.get('diagnosticVerified') is True,
    }
    receipt['checks'] = checks
    receipt['status'] = 'PASS' if all(checks.values()) and not receipt['errors'] else 'NOT_PASS'


def run_acceptance():
    manifest = load_manifest()
    require(not os.environ.get('CODEX_SANDBOX'), '只允許 Mainline 正式 host 入口，不得清除 sandbox flag')
    OUT.mkdir(exist_ok=False)
    receipt = {'status': 'NOT_PASS', 'scope': 'Core3 正式雙 viewport／串行 PGQ', 'errors': [],
               'limits': dict(LIMITS), 'readinessDeadlineSeconds': 25, 'recovery': 'RECOVERY_NOT_OBSERVED'}
    supervisor = endpoint = owned = marker = lifecycle = None
    stage = 'identity-before'
    def fail(label, error):
        category = ('RUNTIME_OBSERVATION' if isinstance(error, RuntimeObservationError)
                    else 'PRODUCT_EXIT' if isinstance(error, ProductExitError) else 'CONTROLLER_OR_EVIDENCE')
        item = {'stage': label, 'category': category, 'error': str(error)}
        receipt['errors'].append(item)
        receipt.setdefault('firstCause', item)
    try:
        receipt['before'] = verify_identity(manifest)
        lifecycle = helpers.load_lifecycle()
        stage = 'capacity-before'
        receipt['capacityBefore'] = helpers.capacity_evidence(lifecycle)
        common = Path(subprocess.check_output(['git', '-C', str(REPO), 'rev-parse', '--path-format=absolute', '--git-common-dir'], text=True).strip())
        marker = common / '.ai-core-tmp-artifact-isolation.json'
        require(not os.path.lexists(marker), 'pre-existing isolation marker')
        command = [helpers.PYTHON, '-B', str(HERE / 'host-smoke-r2-observer.py'), '--diagnostic', str(OUT / 'resource-observation.json'),
                   '--journal', str(OUT / 'scan-events.jsonl'), str(CORE / 'scripts/tmp_session.py'), 'browser', '--repo-root', str(REPO),
                   '--evidence-dir', str(OUT / 'lifecycle'), '--browser-executable', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                   '--url', 'about:blank', '--max-bytes', '67108864', '--max-file-count', '10000', '--ttl-seconds', '3600']
        receipt['command'] = command
        stage = 'readiness'
        with (OUT / 'launcher.stdout').open('x') as stdout, (OUT / 'launcher.stderr').open('x') as stderr:
            supervisor = subprocess.Popen(command, stdout=stdout, stderr=stderr, cwd=REPO)
        receipt['supervisorPid'] = supervisor.pid
        started = time.monotonic()
        while time.monotonic() < started + 25:
            runtime_guard(supervisor, owned)
            for line in read_regular(OUT / 'launcher.stdout').decode().splitlines():
                try: event = json.loads(line)
                except ValueError: continue
                if event.get('event') == 'browser-starting':
                    if owned is None:
                        owned, receipt['ownership'] = helpers.bind_owned(event, marker, lifecycle)
                        receipt['ownedRoot'] = str(owned)
                    try: endpoint = helpers.endpoint_from(owned / 'profile/DevToolsActivePort')
                    except FileNotFoundError: pass
            if endpoint: break
            time.sleep(.1)
        receipt['readinessElapsedSeconds'] = time.monotonic() - started
        require(endpoint is not None, '25 秒 readiness 未完成')
        receipt['readinessComplete'] = True
        env = product_environment(owned, receipt['ownership'])
        receipt['productTemporaryEnvironment'] = {k: env[k] for k in ('TMPDIR', 'TMP', 'TEMP')}
        stage = 'products'
        run_products(env, supervisor, owned, receipt, lifecycle)
    except BaseException as error:
        fail(stage, error)
    finally:
        helpers.finish_supervisor(supervisor, endpoint, OUT, receipt)
        for key in ('browserCloseError', 'cleanupError'):
            if key in receipt: fail('cleanup', receipt[key])
        try:
            receipt['ownedRootAbsent'] = owned is not None and not os.path.lexists(owned)
            receipt['isolationMarkerAbsent'] = marker is not None and not os.path.lexists(marker)
            require(receipt['ownedRootAbsent'] and receipt['isolationMarkerAbsent'], 'root/marker cleanup 未證實')
            session = json.loads(read_regular(OUT / 'lifecycle/evidence/session.json'))
            require(session['root'] == str(owned) and session['mode'] == 'browser'
                    and type(session['pid']) is int and session['pid'] > 1, 'cleanup session 不符')
            receipt['pidObservation'] = lifecycle.recovery_process_observation(owned, session['pid'])
            receipt['pidsAbsent'] = receipt['pidObservation']['matches'] == [] and supervisor.poll() is not None
            require(receipt['pidsAbsent'], '相關 PID 未清除')
        except Exception as error: fail('cleanup-verification', error)
        try:
            receipt['after'] = verify_identity(manifest)
            if lifecycle is not None: receipt['capacityAfter'] = helpers.capacity_evidence(lifecycle)
        except Exception as error: fail('identity-or-capacity-after', error)
        try:
            receipt['diagnostic'] = json.loads(read_regular(OUT / 'resource-observation.json', 16 * 1024**2))
            receipt['runtimeFailures'] = [s for s in receipt['diagnostic']['scans']
                                          if s['kind'] == 'runtime' and s['outcome'] not in ('COMPLETE', 'RECOVERED_COMPLETE')]
            receipt['failureClassification'] = ('RUNTIME_OBSERVATION' if receipt['runtimeFailures'] or receipt['diagnostic']['diagnosticErrors'] or receipt['diagnostic']['unfinishedScans']
                else 'PRODUCT_EXIT' if any(receipt.get(k + 'Exit', 0) != 0 and not receipt.get(k + 'Terminated')
                                          for k in ('historyBrowser', 'pgq')) else 'NONE_OR_CONTROLLER')
            check_diagnostic(receipt['diagnostic'], manifest, owned)
            receipt['diagnosticVerified'] = True
            if any(s['outcome'] == 'RECOVERED_COMPLETE' and s['kind'] == 'runtime' for s in receipt['diagnostic']['scans']):
                receipt['recovery'] = 'RECOVERY_OBSERVED'
        except Exception as error: fail('diagnostic', error)
        finalize_status(receipt)
        receipt['cleanupVerified'] = receipt['checks']['cleanup'] and receipt['checks']['productGroups']
        with (OUT / 'controller-receipt.json').open('x') as stream:
            json.dump(receipt, stream, ensure_ascii=False, indent=2)
            stream.write('\n')
    return 0 if receipt['status'] == 'PASS' else 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-core3-acceptance', required=True, action='store_true')
    parser.parse_args()
    raise SystemExit(run_acceptance())
