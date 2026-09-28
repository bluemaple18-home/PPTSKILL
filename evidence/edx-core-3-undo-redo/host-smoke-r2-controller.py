"""僅 host-smoke-r2：Mainline 正式 host 入口執行；import／unit test 不 launch。"""
import argparse
from dataclasses import asdict
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import time

REPO = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
CANDIDATE = json.loads((HERE / 'host-smoke-r2-candidate.json').read_text())
CORE = Path(CANDIDATE['root'])
PYTHON = '/Users/matt/ai-core/.venv/bin/python'
NODE = '/opt/homebrew/bin/node'
HEAD = CANDIDATE['head']
SCANNER_SHA = CANDIDATE['scannerSHA256']
POLICY_SHA = '41d312e2be42ec3a66bba54cf9e2cb6b3507d1c366778b9f3805fe8f679b4567'
MANIFEST_SHA = 'b65aa37699ab3dd10ad7268201400003700f843d2a9c80c966693a33570a3789'
LIMITS = {'max_bytes': 67108864, 'max_file_count': 10000, 'ttl_seconds': 120}
OUT = HERE / 'host-smoke-r2'
CLOSE_JS = "const ws=new WebSocket(process.argv[1]); const t=setTimeout(()=>process.exit(2),8000); ws.addEventListener('open',()=>ws.send(JSON.stringify({id:1,method:'Browser.close'}))); ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id===1){clearTimeout(t);process.exit(m.error?1:0)}}); ws.addEventListener('error',()=>process.exit(3));"
SMOKE_JS = r'''
const result = {errors:[], pageEvents:[], ownedTargetClosed:false};
const ws = new WebSocket(process.argv[1]);
const pending = new Map(); let sequence = 0, session, target;
const deadline = Date.now()+15000;
ws.addEventListener('message', ({data}) => {
  const m=JSON.parse(data);
  if(m.id && pending.has(m.id)) {
    const p=pending.get(m.id); pending.delete(m.id); clearTimeout(p.timer);
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
  }
  if(m.sessionId!==session || !m.method) return;
  if(m.method.startsWith('Page.')) result.pageEvents.push(m.method);
  if(m.method==='Runtime.exceptionThrown' ||
     (m.method==='Runtime.consoleAPICalled' && m.params.type==='error') ||
     m.method==='Network.loadingFailed' ||
     (m.method==='Network.responseReceived' && m.params.response.status>=400) ||
     (m.method==='Log.entryAdded' && m.params.entry.level==='error') ||
     m.method==='Page.javascriptDialogOpening' || m.method==='Page.interstitialShown')
    result.errors.push({method:m.method, params:m.params});
});
function call(method, params={}, sessionId) {
  return new Promise((resolve,reject)=>{
    const id=++sequence;
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method))},Math.max(1,Math.min(5000,deadline-Date.now())));
    pending.set(id,{resolve,reject,timer});
    ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
  });
}
(async()=>{
  try {
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('WebSocket open timeout')),5000);
      ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});
      ws.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('WebSocket error'))},{once:true});
    });
    target=(await call('Target.createTarget',{url:'about:blank'})).targetId;
    result.ownedTarget=target;
    session=(await call('Target.attachToTarget',{targetId:target,flatten:true})).sessionId;
    for(const method of ['Runtime.enable','Network.enable','Page.enable','Log.enable']) await call(method,{},session);
    result.listenersBeforeNavigation=true;
    const html='<!doctype html><meta charset="utf-8"><title>host-smoke-r2</title><main id="smoke">SMOKE_OK</main>';
    const nav=await call('Page.navigate',{url:'data:text/html;charset=utf-8,'+encodeURIComponent(html)},session);
    if(nav.errorText) throw new Error('Page.navigate: '+nav.errorText);
    while(Date.now()<deadline) {
      const response=await call('Runtime.evaluate',{expression:'location.href.startsWith("data:text/html") && document.title === "host-smoke-r2" && document.querySelector("#smoke")?.textContent === "SMOKE_OK"',returnByValue:true},session);
      if(response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
      if(response.result?.value===true) {result.domAsserted=true;break;}
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    if(!result.domAsserted || result.errors.length) throw new Error('DOM assertion or page errors');
  } catch(error) {result.firstCause=String(error);}
  finally {
    if(target) {
      try {result.ownedTargetClosed=(await call('Target.closeTarget',{targetId:target})).success===true;}
      catch(error) {result.targetCloseError=String(error);}
    }
    ws.close();
    result.status=result.domAsserted && result.ownedTargetClosed && !result.firstCause && !result.targetCloseError && !result.errors.length ? 'PASS':'FAIL';
    console.log(JSON.stringify(result));
    setTimeout(()=>process.exit(result.status==='PASS'?0:1),50);
  }
})();
'''


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_identity():
    current = subprocess.check_output(['git', '-C', str(CORE), 'rev-parse', 'HEAD'], text=True).strip()
    require(current == HEAD, 'candidate HEAD mismatch')
    files = {}
    for name in ('scripts/tmp_artifact_lifecycle.py', 'scripts/tmp_session.py', 'scripts/host_capacity_sensor.py', 'config/tmp_artifact_policy.json'):
        expected = hashlib.sha256(subprocess.check_output(['git', '-C', str(CORE), 'show', HEAD + ':' + name])).hexdigest()
        files[name] = sha(CORE / name)
        require(files[name] == expected, 'candidate file mismatch: ' + name)
    require(files['scripts/tmp_artifact_lifecycle.py'] == SCANNER_SHA, 'scanner SHA mismatch')
    require(files['config/tmp_artifact_policy.json'] == POLICY_SHA, 'policy SHA mismatch')
    manifest_path = HERE / 'transaction-boundary-r07-mainline-hashes.json'
    require(sha(manifest_path) == MANIFEST_SHA, 'frozen manifest mismatch')
    frozen = json.loads(manifest_path.read_text())
    product = {}
    for group, count in (('source', 75), ('protected', 4)):
        require(len(frozen[group]) == count, 'frozen manifest count mismatch')
        product[group] = {name: sha(REPO / name) for name in frozen[group]}
        require(product[group] == frozen[group], 'frozen ' + group + ' mismatch')
    archive = frozen['archive']
    require((REPO / archive['path']).stat().st_size == archive['bytes'] and sha(REPO / archive['path']) == archive['sha256'], 'archive mismatch')
    return {'candidateHead': current, 'candidateFiles': files, 'manifestSha256': MANIFEST_SHA,
            'product': product, 'archive': archive, 'limits': dict(LIMITS)}


def load_lifecycle():
    name = 'host_smoke_01_lifecycle'
    spec = importlib.util.spec_from_file_location(name, CORE / 'scripts/tmp_artifact_lifecycle.py')
    module = importlib.util.module_from_spec(spec)
    previous = sys.path[:]
    try:
        sys.path.insert(0, str(CORE / 'scripts'))
        sys.modules[name] = module
        spec.loader.exec_module(module)
    finally:
        sys.path[:] = previous
    return module


def capacity_evidence(lifecycle):
    return asdict(lifecycle.assert_projected_capacity(dict(LIMITS)))


def read_regular(path, limit=1048576):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        require(stat.S_ISREG(os.fstat(fd).st_mode), 'not regular: ' + str(path))
        with os.fdopen(fd, 'rb', closefd=False) as stream:
            content = stream.read(limit + 1)
        require(len(content) <= limit, 'evidence read limit: ' + str(path))
        return content
    finally:
        os.close(fd)


def bind_owned(event, marker_path, lifecycle):
    profile = Path(event['profile'])
    root = profile.parent
    parent, prefix = lifecycle.root_location('browser-session', True)
    require(root.is_absolute() and root.parent == parent and root.name.startswith(prefix)
            and profile == root / 'profile' and event['devtools_active_port'] == str(profile / 'DevToolsActivePort'), 'unowned browser event')
    require(stat.S_ISDIR(root.lstat().st_mode), 'owned root is not directory')
    manifest = json.loads(read_regular(root / '.tmp-artifact-manifest.json', 65536))
    marker = json.loads(read_regular(marker_path, 65536))
    require(manifest['root'] == marker['root'] == str(root) and manifest['purpose'] == marker['purpose'] == 'browser-session'
            and marker['status'] == 'active' and manifest['repo_identity'] == lifecycle.repo_identity(REPO)
            and marker['git_common_dir'] == manifest['repo_identity']['git_common_dir']
            and bool(marker['run_nonce']) and bool(manifest['owner_nonce'])
            and manifest['max_bytes'] == LIMITS['max_bytes'] and manifest['max_file_count'] == LIMITS['max_file_count']
            and manifest['expires_at'] - manifest['created_at'] == LIMITS['ttl_seconds'], 'owned marker/manifest mismatch')
    return root, {'manifest': manifest, 'marker': marker, 'rootIdentity': [root.stat().st_dev, root.stat().st_ino]}


def endpoint_from(portfile):
    lines = read_regular(portfile, 1024).decode().splitlines()
    if len(lines) >= 2 and lines[0].isdigit() and 0 < int(lines[0]) < 65536 and re.fullmatch(r'/devtools/browser/[A-Za-z0-9-]+', lines[1]):
        return 'ws://127.0.0.1:' + lines[0] + lines[1]
    return None


def runtime_scans(path, root=None):
    if not path.exists():
        return []
    lines = read_regular(path, 16 * 1024**2).decode().splitlines(keepends=True)
    records = [json.loads(line) for line in lines if line.endswith('\n')]
    scans = [r for r in records if r.get('phase') == 'end' and r['kind'] == 'runtime']
    for r in scans:
        require(r['outcome'] in ('COMPLETE', 'RECOVERED_COMPLETE'), 'runtime scan rejected: ' + json.dumps(r))
        require(r['limits'] == LIMITS and (root is None or r['root'] == str(root)), 'runtime scan identity mismatch')
        require(type(r['counts']) is list and len(r['counts']) == 2 and all(type(v) is int and v >= 0 for v in r['counts']), 'runtime tuple counts missing')
    return scans


def inspect_owned_profile(root, identity):
    # 只列本輪 profile 與 Default 的一層 metadata；不讀內容、不跟隨連結。
    result = {}
    deadline = time.monotonic() + 2
    fds = []
    try:
        fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW); fds.append(fd)
        info = os.fstat(fd)
        require([info.st_dev, info.st_ino] == identity, 'owned root replaced')
        for part in ('profile', 'Default'):
            expected = os.stat(part, dir_fd=fd, follow_symlinks=False)
            child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd); fds.append(child)
            actual = os.fstat(child)
            require((expected.st_dev, expected.st_ino) == (actual.st_dev, actual.st_ino), 'profile descriptor mismatch')
            record = {'regularCount': 0, 'subdirectories': [], 'specialEntries': []}
            with os.scandir(child) as entries:
                for count, entry in enumerate(entries, 1):
                    require(count <= 10000 and time.monotonic() < deadline, 'profile metadata observation limit')
                    mode = entry.stat(follow_symlinks=False).st_mode
                    if stat.S_ISREG(mode): record['regularCount'] += 1
                    elif stat.S_ISDIR(mode): record['subdirectories'].append(entry.name)
                    else: record['specialEntries'].append({'name': entry.name, 'type': stat.S_IFMT(mode)})
            current = os.stat(part, dir_fd=fd, follow_symlinks=False)
            require((current.st_dev, current.st_ino) == (actual.st_dev, actual.st_ino), 'profile path replaced')
            record['flatRegularOnly'] = not record['subdirectories'] and not record['specialEntries']
            result[part] = record
            fd = child
        require(time.monotonic() < deadline, 'profile metadata observation deadline')
        require([root.lstat().st_dev, root.lstat().st_ino] == identity, 'owned root path replaced')
        return result
    finally:
        for fd in reversed(fds): os.close(fd)


def finish_supervisor(supervisor, endpoint, out, receipt):
    # 沿 host-controller-04：CDP/log 失敗仍等待／terminate 同一 supervisor。
    try:
        if endpoint and supervisor and supervisor.poll() is None:
            with (out / 'browser-close.log').open('x') as log:
                receipt['browserCloseExit'] = subprocess.run([NODE, '-e', CLOSE_JS, endpoint], stdout=log, stderr=subprocess.STDOUT, timeout=10).returncode
    except Exception as error:
        receipt['browserCloseError'] = repr(error)
    finally:
        if supervisor:
            try:
                try: receipt['supervisorExit'] = supervisor.wait(timeout=25)
                except subprocess.TimeoutExpired:
                    supervisor.terminate()
                    receipt['supervisorTerminated'] = True
                    receipt['supervisorExit'] = supervisor.wait(timeout=30)
            except Exception as error:
                receipt['cleanupError'] = repr(error)


def finalize_status(receipt):
    # Runtime 證據與候選採用分開；nonflat 不等於產品或 smoke 失敗。
    cdp = receipt.get('cdp', {})
    checks = {
        'readiness': receipt.get('readinessComplete') is True,
        'DOMAndOwnedTarget': cdp.get('status') == 'PASS' and cdp.get('domAsserted') is True and cdp.get('ownedTargetClosed') is True,
        'twoRuntimeScans': len(receipt.get('runtimeScansBeforeClose', [])) >= 2,
        'browserClose': receipt.get('browserCloseExit') == 0,
        'supervisor': receipt.get('supervisorExit') == 0,
        'ownedRootCleanup': receipt.get('ownedRootAbsent') is True,
        'markerCleanup': receipt.get('isolationMarkerAbsent') is True,
        'observer': receipt.get('diagnosticVerified') is True,
        'identity': bool(receipt.get('before')) and receipt.get('after') == receipt.get('before'),
        'capacity': 'capacityBefore' in receipt and 'capacityAfter' in receipt,
    }
    receipt['status'] = 'HOST_SMOKE_PASS' if all(checks.values()) and not receipt['errors'] else 'NOT_PASS'
    receipt['runtimeSmoke'] = {'status': receipt['status'], 'checks': checks}
    flat = receipt.get('profileApplicability', {}).get('Default', {}).get('flatRegularOnly')
    receipt['adoptionStatus'] = ('HOLD_MAINLINE_EVALUATION' if flat is not None else 'HOLD_APPLICABILITY_UNKNOWN')


def run_host_smoke():
    require(CANDIDATE.get('state') == 'REVIEWED_FOR_SINGLE_HOST_SMOKE', 'candidate 尚未完成 review，禁止啟動')
    require(not os.environ.get('CODEX_SANDBOX'), 'host 入口須由 Mainline 正式提權，不得清除 CODEX_SANDBOX')
    OUT.mkdir(exist_ok=False)
    receipt = {'status': 'NOT_PASS', 'hostSandbox': os.environ.get('CODEX_SANDBOX'), 'errors': [], 'recovery': 'RECOVERY_NOT_OBSERVED', 'scope': 'HOST_RUNTIME_SMOKE_ONLY', 'productAcceptance': 'NOT_RUN'}
    supervisor = endpoint = owned = marker = lifecycle = None
    stage = 'identity-before'
    def fail(label, error):
        item = {'stage': label, 'error': str(error)}
        receipt['errors'].append(item)
        receipt.setdefault('firstCause', item)
    try:
        receipt['before'] = verify_identity()
        lifecycle = load_lifecycle()
        stage = 'capacity-before'
        receipt['capacityBefore'] = capacity_evidence(lifecycle)
        common = Path(subprocess.check_output(['git', '-C', str(REPO), 'rev-parse', '--path-format=absolute', '--git-common-dir'], text=True).strip())
        marker = common / '.ai-core-tmp-artifact-isolation.json'
        require(not os.path.lexists(marker), 'pre-existing isolation marker')
        command = [PYTHON, '-B', str(HERE / 'host-smoke-r2-observer.py'), '--diagnostic', str(OUT / 'resource-observation.json'), '--journal', str(OUT / 'scan-events.jsonl'), str(CORE / 'scripts/tmp_session.py'), 'browser', '--repo-root', str(REPO), '--evidence-dir', str(OUT / 'lifecycle'), '--browser-executable', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '--url', 'about:blank', '--max-bytes', str(LIMITS['max_bytes']), '--max-file-count', str(LIMITS['max_file_count']), '--ttl-seconds', '120']
        receipt['command'] = command
        stage = 'readiness'
        with (OUT / 'launcher.stdout').open('x') as stdout, (OUT / 'launcher.stderr').open('x') as stderr:
            supervisor = subprocess.Popen(command, stdout=stdout, stderr=stderr, cwd=REPO)
        receipt['supervisorPid'] = supervisor.pid
        started = time.monotonic(); deadline = started + 25
        receipt['readinessDeadlineSeconds'] = 25
        while time.monotonic() < deadline:
            runtime_scans(OUT / 'scan-events.jsonl', owned)
            require(supervisor.poll() is None, 'supervisor exited before readiness')
            for line in read_regular(OUT / 'launcher.stdout').decode().splitlines():
                try: event = json.loads(line)
                except ValueError: continue
                if event.get('event') == 'browser-starting':
                    if owned is None:
                        owned, receipt['ownership'] = bind_owned(event, marker, lifecycle)
                        receipt['ownedRoot'] = str(owned)
                    try: endpoint = endpoint_from(owned / 'profile/DevToolsActivePort')
                    except FileNotFoundError: pass
            if endpoint: break
            time.sleep(.1)
        receipt['readinessElapsedSeconds'] = time.monotonic() - started
        require(endpoint is not None, '25 秒 readiness 未完成')
        receipt['readinessComplete'] = True
        receipt['endpoint'] = endpoint
        stage = 'cdp-local-page'
        result = subprocess.run([NODE, '-e', SMOKE_JS, endpoint], capture_output=True, text=True, timeout=25)
        (OUT / 'cdp.stdout').write_text(result.stdout); (OUT / 'cdp.stderr').write_text(result.stderr)
        receipt['cdpExit'] = result.returncode
        require(bool(result.stdout.strip()), 'CDP 未返回證據；exit=' + str(result.returncode) + '; stderr=' + result.stderr.strip())
        receipt['cdp'] = json.loads(result.stdout.strip().splitlines()[-1])
        require(result.returncode == 0 and receipt['cdp']['status'] == 'PASS', 'CDP smoke failed: ' + str(receipt['cdp']))
        stage = 'runtime-scans'
        deadline = time.monotonic() + 15
        scans = []
        while time.monotonic() < deadline:
            scans = runtime_scans(OUT / 'scan-events.jsonl', owned)
            require(supervisor.poll() is None, 'supervisor exited while awaiting scans')
            if len(scans) >= 2: break
            time.sleep(.1)
        require(len(scans) >= 2, '未取得兩次完整 runtime scans')
        receipt['runtimeScansBeforeClose'] = scans
        receipt['recovery'] = 'RECOVERY_OBSERVED' if any(s['outcome'] == 'RECOVERED_COMPLETE' for s in scans) else 'RECOVERY_NOT_OBSERVED'
        stage = 'profile-applicability'
        receipt['profileApplicability'] = inspect_owned_profile(owned, receipt['ownership']['rootIdentity'])
        # R2 接受 mixed parent；到此即收尾，採用另由 Mainline 裁決。
    except BaseException as error:
        fail(stage, error)
    finally:
        finish_supervisor(supervisor, endpoint, OUT, receipt)
        for key in ('browserCloseError', 'cleanupError'):
            if key in receipt: fail('cleanup', receipt[key])
        try:
            receipt['ownedRootAbsent'] = owned is not None and not os.path.lexists(owned)
            receipt['isolationMarkerAbsent'] = marker is not None and not os.path.lexists(marker)
            require(receipt['ownedRootAbsent'] and receipt['isolationMarkerAbsent'], 'owned root/marker cleanup 未證實')
            require(receipt.get('browserCloseExit') == 0 and receipt.get('supervisorExit') == 0, 'Browser.close/supervisor 未正常完成')
        except Exception as error: fail('cleanup-verification', error)
        try:
            receipt['after'] = verify_identity()
            require(receipt['after'] == receipt.get('before'), 'before/after identity changed')
            if lifecycle is not None: receipt['capacityAfter'] = capacity_evidence(lifecycle)
        except Exception as error: fail('identity-or-capacity-after', error)
        try:
            diagnostic = json.loads(read_regular(OUT / 'resource-observation.json', 16 * 1024**2))
            receipt['diagnostic'] = diagnostic
            receipt['recovery'] = 'RECOVERY_OBSERVED' if any(s['kind'] == 'runtime' and s['outcome'] == 'RECOVERED_COMPLETE' for s in diagnostic['scans']) else 'RECOVERY_NOT_OBSERVED'
            require(diagnostic['scanner'] == str(CORE / 'scripts/tmp_artifact_lifecycle.py') and diagnostic['scannerSha256Before'] == diagnostic['scannerSha256After'] == SCANNER_SHA, 'diagnostic scanner mismatch')
            require(not diagnostic['diagnosticErrors'] and not diagnostic['unfinishedScans'] and diagnostic['lineAndOpcodeTracing'] is False, 'observer incomplete')
            require(all(s['outcome'] in ('COMPLETE', 'RECOVERED_COMPLETE') for s in diagnostic['scans']), 'scan failed/unknown')
            require(any(s['kind'] == 'cleanup' and s['counts'] is not None for s in diagnostic['scans']), 'cleanup scan missing')
            require(len(runtime_scans(OUT / 'scan-events.jsonl', owned)) >= 2, 'runtime scan evidence missing')
            receipt['diagnosticVerified'] = True
        except Exception as error: fail('diagnostic', error)
        finalize_status(receipt)
        with (OUT / 'controller-receipt.json').open('x') as stream:
            json.dump(receipt, stream, ensure_ascii=False, indent=2); stream.write('\n')
        print(json.dumps({k: v for k, v in receipt.items() if k in ('status', 'adoptionStatus', 'runtimeSmoke', 'firstCause', 'recovery', 'ownedRootAbsent', 'isolationMarkerAbsent')}, ensure_ascii=False))
    return 0 if receipt['status'] == 'HOST_SMOKE_PASS' else 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-host-smoke', action='store_true', required=True)
    parser.parse_args()
    raise SystemExit(run_host_smoke())
