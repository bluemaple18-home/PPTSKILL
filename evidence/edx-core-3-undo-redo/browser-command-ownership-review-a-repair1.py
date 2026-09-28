"""Repair1：只重播原 journal 反例及新增單元測項，不啟 child。"""
import ast
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import unittest

HERE = Path(__file__).resolve().parent
CORE = HERE.parents[2] / '.work/ai-core-observer-r2-20260928'
sys.path.insert(0, str(CORE / 'tests'))
spec = importlib.util.spec_from_file_location('review_a_repair1_tests', CORE / 'tests/test_tmp_session_browser_command.py')
tests = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = tests
spec.loader.exec_module(tests)
old_files = [p for p in HERE.glob('browser-command-ownership-review-a*') if '-repair1.' not in p.name]
delivery = [CORE / p for p in ('scripts/tmp_session.py', 'tests/test_tmp_session_browser_command.py', 'docs/tmp-session-lifecycle.md')]
def hashes(paths):
    return {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
before = hashes(old_files + delivery)
assert before[str(delivery[0])] == '6a3853ec0fec97ad5718d9a36acdea7fbfc0a4dbf94eff2bb2812b8992a5121d'
assert before[str(delivery[1])] == '2c67040631fce3359bc61bd0893ac9b07be4b2e35a8396c8ec1a5e0b58324176'
assert before[str(delivery[2])] == '1852e379023ecf23589e31377b81cb8bec20e2650ae3591930795b2da5c79a89'
stream = io.StringIO()
suite = unittest.TestSuite([tests.BrowserCommandUnitTests('test_single_journal_failure_stays_nonzero_after_recovery')])
result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
(HERE / 'browser-command-ownership-review-a-repair1.log').write_text(stream.getvalue())
# 只擷取原 probe 函式與 imports；不執行其 suite／寫檔頂層程式。
source = (HERE / 'browser-command-ownership-review-a-probes.py').read_text()
tree = ast.parse(source)
nodes = [n for n in tree.body if isinstance(n, (ast.Import, ast.ImportFrom)) or isinstance(n, ast.FunctionDef) and n.name == 'journal_failure_probe']
namespace = {'tests': tests}
replay = ast.unparse(ast.Module(body=nodes, type_ignores=[])).replace('assert code == 0', 'assert code == 2')
exec(compile(replay, '<repair1-original-probe-replay>', 'exec'), namespace)
probe = namespace['journal_failure_probe']()
after = hashes(old_files + delivery)
report = {'candidate': '996492481144e92775780ce932661e38779cdddc', 'unitTests': {'run': result.testsRun, 'failures': len(result.failures), 'errors': len(result.errors), 'skipped': len(result.skipped), 'subcases': 6}, 'originalProbeReplay': probe, 'originalEvidenceAndDeliveryUnchanged': before == after, 'sha256': after}
(HERE / 'browser-command-ownership-review-a-repair1.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'unitTests': report['unitTests'], 'originalProbeExit': probe['exit'], 'originalEvidenceAndDeliveryUnchanged': before == after}))
raise SystemExit(0 if result.wasSuccessful() and before == after else 1)
