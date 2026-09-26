"""固定兩份 scanner 的小型穩定 fixture 成本對照；非 browser 驗收。"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import statistics
import sys
import tempfile
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--baseline', required=True, type=Path)
parser.add_argument('--candidate', required=True, type=Path)
args = parser.parse_args()
sys.dont_write_bytecode = True
sys.path.insert(0, str(args.baseline.resolve() / 'scripts'))
modules, hashes = {}, {}
for key, root in [('baseline', args.baseline), ('candidate', args.candidate)]:
    path = root.resolve() / 'scripts/tmp_artifact_lifecycle.py'
    hashes[key] = hashlib.sha256(path.read_bytes()).hexdigest()
    spec = importlib.util.spec_from_file_location('cost_' + key, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    modules[key] = module
limits = {'max_bytes': 64 * 1024 * 1024, 'max_file_count': 10000}
report = {'sourceSHA256': hashes, 'browserLaunched': False, 'scope': '300個64-byte檔案、穩定無race；不代表Chrome profile或host效能', 'scenarios': []}
for nested in (False, True):
    with tempfile.TemporaryDirectory(prefix='pptskill-observer-cost-') as temp:
        root = Path(temp)
        parent = root / 'profile' / 'Default'
        parent.mkdir(parents=True)
        for index in range(300):
            (parent / ('file-%04d' % index)).write_bytes(b'x' * 64)
        if nested:
            child = parent / 'child'
            child.mkdir()
            for index in range(20):
                (child / ('file-%04d' % index)).write_bytes(b'x' * 64)
        expected = ((320 if nested else 300) * 64, 320 if nested else 300)
        samples = {key: [] for key in modules}
        try:
            for module in modules.values():
                module.OWNED_ROOTS[str(root)] = {'browser_layout': True}
                assert module.scan_resource_artifacts(root, limits) == expected
            for run in range(7):
                for key in (('baseline', 'candidate') if run % 2 == 0 else ('candidate', 'baseline')):
                    start = time.perf_counter()
                    actual = modules[key].scan_resource_artifacts(root, limits)
                    elapsed = (time.perf_counter() - start) * 1000
                    assert actual == expected
                    samples[key].append(elapsed)
            medians = {key: statistics.median(values) for key, values in samples.items()}
            report['scenarios'].append({'name': 'mixed-parent' if nested else 'flat-parent', 'counts': expected, 'runsPerSource': 7, 'milliseconds': samples, 'medianMilliseconds': medians, 'candidateOverBaseline': medians['candidate'] / medians['baseline']})
        finally:
            for module in modules.values():
                module.OWNED_ROOTS.pop(str(root), None)
    assert not root.exists()
report['allFixturesRemoved'] = True
print(json.dumps(report, ensure_ascii=False, indent=2))
