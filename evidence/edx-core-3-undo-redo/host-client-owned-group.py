"""受管 Core3 client：普通子程序、薄環境映射；無群組或 tmp 清理權限。"""
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import time

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('owned_group_client_checks', HERE / 'host-controller-owned-group.py')
checks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checks)
require, read_regular = checks.require, checks.read_regular
OUT, REPO = checks.OUT, checks.REPO


def managed_context():
    require(os.environ.get('AI_CORE_TMP_ARTIFACT_ACTIVE') == '1', '不是 managed client')
    root = Path(os.environ['TMP_ARTIFACT_ROOT'])
    require(root.is_absolute(), 'root 非絕對路徑')
    for path in (root, root / 'tmp', root / 'profile', root / 'evidence'):
        require(stat.S_ISDIR(path.lstat().st_mode), 'managed 目錄非實體目錄')
    require(all(os.environ.get(k) == str(root / 'tmp') for k in ('TMPDIR', 'TMP', 'TEMP')), 'TMP 未歸 owned root')
    require(os.environ.get('TMP_SESSION_EVIDENCE') == str(root / 'evidence')
            and os.environ.get('TMP_SESSION_WORKDIR') == str(REPO), 'managed evidence/workdir 不符')
    session = json.loads(read_regular(root / 'evidence/session.json'))
    group = os.getpgrp()
    require(session['root'] == str(root) and session['mode'] == 'browser'
            and type(session['pid']) is int and session['pid'] > 1
            and session['pid'] == group == os.getpgid(os.getppid()), 'outer PGID 不符')
    manifest = json.loads(read_regular(root / '.tmp-artifact-manifest.json'))
    require(manifest['root'] == str(root) and manifest['purpose'] == 'browser-session'
            and manifest['max_bytes'] == 67108864 and manifest['max_file_count'] == 10000
            and manifest['expires_at'] - manifest['created_at'] == 3600, 'owned manifest 不符')
    port = root / 'profile/DevToolsActivePort'
    require(os.environ.get('TMP_SESSION_DEVTOOLS_ACTIVE_PORT') == str(port), 'generic managed port 不符')
    return root, group, port


def readiness(port):
    start = time.monotonic()
    while time.monotonic() - start < 25:
        try: endpoint = checks.helpers.endpoint_from(port)
        except FileNotFoundError: endpoint = None
        if endpoint: return endpoint
        time.sleep(.1)
    raise TimeoutError('25 秒 readiness 未完成')


def save(receipt):
    # 覆寫本 client 的進度，signal/outer stop 後仍保有最後一次已知原因。
    (OUT / 'client-receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')


def ordinary(command, timeout, env, group, log, receipt, key):
    require(os.getpgrp() == group, 'client PGID 漂移')
    with log.open('x') as stream:
        process = subprocess.Popen(command, cwd=REPO, env=env, stdout=stream, stderr=subprocess.STDOUT)
        receipt[key + 'Pid'] = process.pid
        # 子程序可能已瞬間退出，但尚未 wait/reap，PID 仍是本輪 child。
        try:
            require(os.getpgid(process.pid) == group, 'ordinary child PGID 不符')
        except Exception:
            receipt['outerStopRequired'] = True
            raise
        save(receipt)
        try:
            code = process.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            receipt[key + 'Timeout'] = timeout
            receipt['outerStopRequired'] = True
            save(receipt)
            raise
        receipt[key + 'Exit'] = code
        save(receipt)
        return code


def run_client():
    receipt = {'status': 'NOT_PASS', 'exit': 2, 'errors': [], 'readinessDeadlineSeconds': 25}
    endpoint = None
    env = None
    group = None
    close_allowed = False
    stage = 'managed-context'
    def fail(error):
        item = {'stage': stage, 'type': type(error).__name__, 'error': str(error)}
        receipt['errors'].append(item)
        receipt.setdefault('firstCause', item)
    try:
        root, group, port = managed_context()
        receipt.update(ownedRoot=str(root), pgid=group, pid=os.getpid())
        env = os.environ.copy()
        env['PPTSKILL_DEVTOOLS_ACTIVE_PORT'] = str(port)
        receipt['temporaryEnvironment'] = {k: env[k] for k in ('TMPDIR', 'TMP', 'TEMP')}
        save(receipt)
        stage = 'readiness'
        endpoint = readiness(port)
        receipt['readinessComplete'] = True
        close_allowed = True
        for key, command, limit in checks.legacy.tasks():
            stage = key
            receipt[key + 'Started'] = True
            save(receipt)
            code = ordinary(command, limit, env, group, OUT / (key + '.log'), receipt, key)
            if code != 0:
                receipt['exit'] = code if code > 0 else 128 - code
                if code < 0:
                    close_allowed = False
                    receipt['outerStopRequired'] = True
                raise RuntimeError(key + ' 非零退出；停止後續')
            if key == 'historyBrowser': checks.legacy.check_browser_receipt()
        receipt['exit'] = 0
    except subprocess.TimeoutExpired as error:
        close_allowed = False
        receipt['exit'] = 124
        fail(error)
    except KeyboardInterrupt as error:
        close_allowed = False
        receipt['exit'] = 130
        receipt['outerStopRequired'] = True
        fail(error)
    except Exception as error:
        if receipt.get('outerStopRequired'): close_allowed = False
        fail(error)
    finally:
        if close_allowed:
            stage = 'browser-close'
            try:
                code = ordinary([checks.helpers.NODE, '-e', checks.helpers.CLOSE_JS, endpoint], 10,
                                env, group, OUT / 'browser-close.log', receipt, 'browserClose')
                require(code == 0, 'Browser.close 非零')
            except (Exception, KeyboardInterrupt) as error:
                fail(error)
                if receipt['exit'] == 0: receipt['exit'] = 2
        receipt['status'] = 'PASS' if receipt['exit'] == 0 and not receipt['errors'] and receipt.get('browserCloseExit') == 0 else 'NOT_PASS'
        save(receipt)
    return receipt['exit']


if __name__ == '__main__':
    raise SystemExit(run_client())
