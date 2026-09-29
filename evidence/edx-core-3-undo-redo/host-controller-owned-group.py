"""Core3 單一 owned group 外層；只啟 canonical，不持有產品或清理權限。"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import hashlib

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
CORE = Path('/Users/matt/ai-core')
OUT = HERE / 'host-acceptance-owned-group'
MANIFEST = HERE / 'host-controller-owned-group-manifest.json'
INTEGRATION = HERE / 'browser-command-ownership-integration-verification.json'
AUDIT = HERE / 'browser-command-ownership-client-audit.json'
LIMITS = {'max_bytes': 67108864, 'max_file_count': 10000, 'ttl_seconds': 3600}
# 僅復用純驗證與固定命令；舊 runtime／收尾函式完全不呼叫。
legacy_path = HERE / 'host-controller-r2.py'
if hashlib.sha256(legacy_path.read_bytes()).hexdigest() != '0c2c6ad7fb102cf54fb2cad3dbfba8af71c9373c7349ce5c1fbb2f3735d47ee0':
    raise RuntimeError('歷史純驗證來源漂移')
spec = importlib.util.spec_from_file_location('owned_group_pure_checks', legacy_path)
legacy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(legacy)
helpers = legacy.helpers
require, read_regular, digest = legacy.require, legacy.read_regular, legacy.digest
legacy.OUT, legacy.MANIFEST, legacy.INTEGRATION = OUT, MANIFEST, INTEGRATION


def load_manifest():
    manifest = json.loads(read_regular(MANIFEST))
    require(manifest['state'] == 'FINAL_FOR_CORE3_ACCEPTANCE', 'manifest 尚待 Mainline FINAL')
    require(manifest['canonicalRoot'] == str(CORE) and manifest['limits'] == LIMITS, 'root/limits 不符')
    require(digest(INTEGRATION) == manifest['integrationReceiptSHA256'], 'integration receipt 漂移')
    record = json.loads(read_regular(INTEGRATION))
    require(record['status'] == 'CANONICAL_INTEGRATED_VERIFIED', 'integration 未驗證')
    require(record['integratedHEAD'] == manifest['integratedHEAD'], 'integratedHEAD 不符')
    require({**record['sourceSHA256'], **record['unchangedSHA256']} == manifest['canonicalFiles'], 'canonical hashes 不符')
    return manifest


legacy.load_manifest = load_manifest


def verify_identity(manifest):
    record = legacy.verify_identity(manifest)
    require(digest(AUDIT) == manifest['clientAuditSHA256'], 'callchain audit 漂移')
    files = json.loads(read_regular(AUDIT))['files']
    require(all(digest(REPO / p) == sha for p, sha in files.items()), 'callchain bytes 漂移')
    record['clientAuditSHA256'] = manifest['clientAuditSHA256']
    return record


def command():
    return [helpers.PYTHON, '-B', str(HERE / 'host-smoke-r2-observer.py'),
            '--diagnostic', str(OUT / 'resource-observation.json'), '--journal', str(OUT / 'scan-events.jsonl'),
            str(CORE / 'scripts/tmp_session.py'), 'browser', '--repo-root', str(REPO),
            '--evidence-dir', str(OUT / 'lifecycle'), '--browser-executable',
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '--url', 'about:blank',
            '--max-bytes', '67108864', '--max-file-count', '10000', '--ttl-seconds', '3600',
            '--', helpers.PYTHON, '-B', str(HERE / 'host-client-owned-group.py')]


def verify_cleanup(lifecycle, marker, receipt):
    session = json.loads(read_regular(OUT / 'lifecycle/evidence/session.json'))
    owned = Path(session['root'])
    parent, prefix = lifecycle.root_location('browser-session', True)
    require(owned.is_absolute() and owned.parent == parent and owned.name.startswith(prefix)
            and session['mode'] == 'browser' and type(session['pid']) is int and session['pid'] > 1, '匯出 session 身分不符')
    receipt['ownedRoot'] = str(owned)
    receipt['session'] = session
    records = [json.loads(line) for line in read_regular(OUT / 'lifecycle/evidence/processes.jsonl').decode().splitlines()]
    receipt['processes'] = records
    started = [r for r in records if r.get('event') == 'started']
    require({r['role'] for r in started} == {'browser', 'client'}
            and len(started) == 2 and all(r['pgid'] == session['pid'] for r in started), 'browser/client 非唯一 outer group')
    receipt['ownedRootAbsent'] = not os.path.lexists(owned)
    receipt['isolationMarkerAbsent'] = not os.path.lexists(marker)
    receipt['pidObservation'] = lifecycle.recovery_process_observation(owned, session['pid'])
    receipt['pidsAbsent'] = receipt['pidObservation']['matches'] == []
    require(all(receipt[k] for k in ('ownedRootAbsent', 'isolationMarkerAbsent', 'pidsAbsent')), 'root/marker/group cleanup 未證實')
    return owned


def finalize(receipt):
    client = receipt.get('client', {})
    checks = {
        'supervisor': receipt.get('supervisorExit') == 0,
        'client': client.get('status') == 'PASS' and client.get('exit') == 0
                  and client.get('browserCloseExit') == 0 and client.get('readinessComplete') is True
                  and all(client.get(k + 'Exit') == 0 for k in ('historyBrowser', 'pgq')),
        'browser': receipt.get('browserVerified') is True,
        'diagnostic': receipt.get('diagnosticVerified') is True,
        'cleanup': receipt.get('cleanupVerified') is True,
        'identity': bool(receipt.get('before')) and receipt.get('after') == receipt.get('before'),
        'capacity': all(k in receipt for k in ('capacityBefore', 'capacityAfter')),
    }
    receipt['checks'] = checks
    receipt['status'] = 'PASS' if all(checks.values()) and not receipt['errors'] else 'NOT_PASS'


def run_acceptance():
    manifest = load_manifest()
    require(not os.environ.get('CODEX_SANDBOX'), '須 Mainline 正式 host 入口；不得清除 sandbox flag')
    OUT.mkdir(exist_ok=False)
    receipt = {'status': 'NOT_PASS', 'errors': [], 'limits': dict(LIMITS), 'recovery': 'RECOVERY_NOT_OBSERVED'}
    lifecycle = marker = supervisor = None
    stage = 'identity-before'
    def fail(label, error):
        item = {'stage': label, 'error': str(error)}
        receipt['errors'].append(item)
        receipt.setdefault('firstCause', item)
    try:
        receipt['before'] = verify_identity(manifest)
        lifecycle = helpers.load_lifecycle()
        stage = 'capacity-before'
        receipt['capacityBefore'] = helpers.capacity_evidence(lifecycle)
        common = Path(subprocess.check_output(['git', '-C', str(REPO), 'rev-parse', '--path-format=absolute', '--git-common-dir'], text=True).strip())
        marker = common / '.ai-core-tmp-artifact-isolation.json'
        require(not os.path.lexists(marker), '既有 isolation marker')
        stage = 'canonical-supervisor'
        receipt['command'] = command()
        with (OUT / 'launcher.stdout').open('x') as stdout, (OUT / 'launcher.stderr').open('x') as stderr:
            supervisor = subprocess.Popen(receipt['command'], cwd=REPO, stdout=stdout, stderr=stderr)
        receipt['supervisorPid'] = supervisor.pid
        # 只等既有 TTL/收斂；此期限僅停止等待，不擴 runtime TTL，不發任何訊號。
        receipt['supervisorExit'] = supervisor.wait(timeout=3675)
    except BaseException as error:
        fail(stage, error)
    finally:
        # 不 close、不 terminate；canonical 是唯一群組及 cleanup owner。
        if supervisor is not None and 'supervisorExit' not in receipt:
            receipt['supervisorState'] = 'UNKNOWN_NO_EXTERNAL_INTERVENTION'
        try:
            receipt['client'] = json.loads(read_regular(OUT / 'client-receipt.json'))
        except Exception as error: fail('client-evidence', error)
        try:
            require('supervisorExit' in receipt and lifecycle is not None and marker is not None, '未確認 supervisor 返回')
            owned = verify_cleanup(lifecycle, marker, receipt)
            receipt['cleanupVerified'] = True
        except Exception as error: fail('cleanup', error)
        try:
            receipt['diagnostic'] = json.loads(read_regular(OUT / 'resource-observation.json', 16 * 1024**2))
            scans = receipt['diagnostic']['scans']
            receipt['runtimeFailures'] = [s for s in scans if s['kind'] == 'runtime' and s['outcome'] not in ('COMPLETE', 'RECOVERED_COMPLETE')]
            receipt['failureClassification'] = 'RUNTIME_OBSERVATION' if receipt['runtimeFailures'] or receipt['diagnostic']['diagnosticErrors'] or receipt['diagnostic']['unfinishedScans'] else 'SEE_ORIGINAL_CLIENT_AND_SUPERVISOR'
            legacy.check_diagnostic(receipt['diagnostic'], manifest, Path(receipt['ownedRoot']))
            receipt['diagnosticVerified'] = True
            if any(s['kind'] == 'runtime' and s['outcome'] == 'RECOVERED_COMPLETE' for s in scans):
                receipt['recovery'] = 'RECOVERY_OBSERVED'
        except Exception as error: fail('diagnostic', error)
        try:
            receipt['browserAcceptance'] = legacy.check_browser_receipt()
            receipt['browserVerified'] = True
        except Exception as error: fail('browser-evidence', error)
        try:
            receipt['after'] = verify_identity(manifest)
            if lifecycle is not None: receipt['capacityAfter'] = helpers.capacity_evidence(lifecycle)
        except Exception as error: fail('identity-capacity-after', error)
        finalize(receipt)
        with (OUT / 'controller-receipt.json').open('x') as stream:
            json.dump(receipt, stream, ensure_ascii=False, indent=2)
            stream.write('\n')
    return 0 if receipt['status'] == 'PASS' else 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-core3-acceptance', required=True, action='store_true')
    parser.parse_args()
    raise SystemExit(run_acceptance())
