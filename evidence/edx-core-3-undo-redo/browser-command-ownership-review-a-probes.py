"""Reviewer A：只跑新單元測項與 journal 單點故障；不啟任何 child。"""
import errno
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

HERE = Path(__file__).resolve().parent
CORE = HERE.parents[2] / '.work/ai-core-observer-r2-20260928'
sys.path.insert(0, str(CORE / 'tests'))
spec = importlib.util.spec_from_file_location('review_a_browser_command_tests', CORE / 'tests/test_tmp_session_browser_command.py')
tests = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = tests
spec.loader.exec_module(tests)

def journal_failure_probe():
    session = tests.session
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        browser = Mock(pid=101); browser.wait.return_value = 0
        client = Mock(pid=102); client.wait.return_value = 0
        real_open = Path.open
        writes = []
        def fault(path, *args, **kwargs):
            if path == root / 'processes.jsonl' and args and args[0] == 'a':
                writes.append(len(writes) + 1)
                if len(writes) == 5:
                    raise OSError(errno.ENOSPC, '單次 client exited 留證失敗')
            return real_open(path, *args, **kwargs)
        with patch.object(session.subprocess, 'Popen', side_effect=[browser, client]), patch.object(Path, 'open', fault):
            code = session.browser_client(['mock-browser'], ['mock-client'], root, str(root), root)
        records = [json.loads(line) for line in (root / 'processes.jsonl').read_text().splitlines()]
        assert code == 0
        assert any(r['event'] == 'error' for r in records)
        assert not any(r['role'] == 'client' and r['event'] == 'exited' for r in records)
        return {'exit': code, 'records': records, 'injectedFailure': '第五次 journal append/open 單次 ENOSPC；其後恢復'}

paths = [CORE / name for name in ('scripts/tmp_session.py', 'tests/test_tmp_session_browser_command.py', 'docs/tmp-session-lifecycle.md', 'scripts/tmp_artifact_lifecycle.py')]
before = {str(p.relative_to(CORE)): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
stream = io.StringIO()
result = unittest.TextTestRunner(stream=stream, verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(tests.BrowserCommandUnitTests))
(HERE / 'browser-command-ownership-review-a-tests.log').write_text(stream.getvalue())
report = {'sha256': before, 'unitTests': {'run': result.testsRun, 'failures': len(result.failures), 'errors': len(result.errors), 'skipped': len(result.skipped)}, 'journalFailureProbe': journal_failure_probe()}
report['deliveryUnchanged'] = before == {str(p.relative_to(CORE)): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
(HERE / 'browser-command-ownership-review-a-probes.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'unitTests': report['unitTests'], 'journalFailureExit': report['journalFailureProbe']['exit'], 'deliveryUnchanged': report['deliveryUnchanged']}))
raise SystemExit(0 if result.wasSuccessful() and report['deliveryUnchanged'] else 1)
