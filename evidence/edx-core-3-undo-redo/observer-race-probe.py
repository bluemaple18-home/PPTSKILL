"""只重播原 scanner 的競態與停損；不啟動 browser 或修改判定。"""
from __future__ import annotations

import argparse
import errno
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from unittest.mock import patch

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--ai-core", required=True, type=Path)
parser.add_argument("--case", choices=("stable", "disappeared-file", "rename-commit", "symlink-replacement", "directory-before-stat", "directory-before-open", "read-error", "budget"))
parser.add_argument("--require-complete", action="store_true")
args = parser.parse_args()
sys.dont_write_bytecode = True
root = args.ai_core.resolve()
script = root / "scripts/tmp_artifact_lifecycle.py"
sha_before = hashlib.sha256(script.read_bytes()).hexdigest()
sys.path.insert(0, str(root / "scripts"))
spec = importlib.util.spec_from_file_location("observer_original", script)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
real_scandir = os.scandir
all_cases = ("stable", "disappeared-file", "rename-commit", "symlink-replacement", "directory-before-stat", "directory-before-open", "read-error", "budget")


def probe(case: str) -> dict:
    record = {"case": case, "events": []}
    with tempfile.TemporaryDirectory(prefix="pptskill-observer-fixture-") as temp:
        owned = Path(temp)
        parent = owned / "profile/Default"
        parent.mkdir(parents=True)
        target = parent / ".com.google.Chrome.Network Persistent State.fixture"
        is_directory = case.startswith("directory-")
        target.mkdir() if is_directory else target.write_bytes(b"12345678")
        # 僅設定fixture的既有browser掃描模式；不登記真browser root，不呼叫launcher。
        module.OWNED_ROOTS[str(owned)] = {"browser_layout": True}
        injected = False

        class Entry:
            def __init__(self, entry, fd):
                self.entry, self.fd, self.name = entry, fd, entry.name

            def stat(self, *, follow_symlinks=True):
                nonlocal injected
                if self.name != target.name or injected:
                    return self.entry.stat(follow_symlinks=follow_symlinks)
                assert follow_symlinks is False
                injected = True
                before = os.fstat(self.fd)
                event = {"phase": "entry.stat", "nofollow": True, "parentIdentity": [before.st_dev, before.st_ino]}
                record["events"].append(event)
                try:
                    if case in ("disappeared-file", "rename-commit", "symlink-replacement"):
                        if case == "rename-commit":
                            target.rename(parent / "Network Persistent State")
                        else:
                            target.unlink()
                        if case == "symlink-replacement":
                            target.symlink_to("missing-sentinel")
                    elif case == "directory-before-stat":
                        target.rmdir()
                    elif case == "read-error":
                        raise OSError(errno.EIO, "fixture unknown I/O")
                    info = self.entry.stat(follow_symlinks=follow_symlinks)
                    event["statMode"] = info.st_mode
                    if case == "directory-before-open":
                        target.rmdir()
                        event["phase"] = "directory removed after stat, before nofollow open"
                    return info
                except OSError as error:
                    event["errno"] = error.errno
                    raise
                finally:
                    after = os.fstat(self.fd)
                    event["parentIdentityUnchanged"] = (before.st_dev, before.st_ino) == (after.st_dev, after.st_ino)

        class Scan:
            def __init__(self, fd):
                self.fd = fd

            def __enter__(self):
                self.actual = real_scandir(self.fd)
                # 小fixture固定已列舉entry；不預先stat、不改entry.stat結果。
                return iter([Entry(entry, self.fd) for entry in self.actual])

            def __exit__(self, *exc):
                self.actual.close()

        limits = {"max_bytes": 4 if case == "budget" else 67108864, "max_file_count": 10000}
        try:
            with patch.object(module.os, "scandir", Scan):
                try:
                    record["counts"] = list(module.scan_resource_artifacts(owned, limits))
                    record["result"] = "COMPLETE"
                except module.LifecycleError as error:
                    record["result"] = "REJECTED"
                    record["reason"] = str(error)
                    record["cause"] = {"type": type(error.__cause__).__name__, "errno": getattr(error.__cause__, "errno", None)}
            record["finalEntries"] = sorted(p.name for p in parent.iterdir())
            assert injected, "未到達預定接點"
            assert all(e["parentIdentityUnchanged"] for e in record["events"])
            if case == "stable":
                assert record["result"] == "COMPLETE" and record["counts"] == [8, 1]
            else:
                assert record["result"] == "REJECTED", "原scanner不應把此未知情況當完整觀測"
                if case in ("disappeared-file", "rename-commit", "directory-before-stat", "directory-before-open"):
                    assert record["cause"]["errno"] == errno.ENOENT
                elif case == "read-error":
                    assert record["cause"]["errno"] == errno.EIO
                elif case == "symlink-replacement":
                    assert "symlink or special file" in record["reason"]
                elif case == "budget":
                    assert "budget exceeded" in record["reason"]
            record["contractCheck"] = "PASS"
        finally:
            module.OWNED_ROOTS.pop(str(owned), None)
    record["fixtureRemoved"] = not owned.exists()
    assert record["fixtureRemoved"]
    return record


results = [probe(case) for case in ([args.case] if args.case else all_cases)]
source_unchanged = hashlib.sha256(script.read_bytes()).hexdigest() == sha_before
report = {
    "aiCoreHEAD": subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip(),
    "scannerSHA256": sha_before,
    "scannerUnchanged": source_unchanged,
    "results": results,
    "browserLaunched": False,
    "scope": "受控fixture；不是Host04類型歸因或host修復驗收",
}
print(json.dumps(report, ensure_ascii=False, indent=2))
assert source_unchanged
if args.require_complete and any(r["result"] != "COMPLETE" for r in results):
    print("RED_REPRODUCED: 原scanner在此fixture不能完成觀測；不等於產品缺陷或已授權放行", file=sys.stderr)
    sys.exit(1)
