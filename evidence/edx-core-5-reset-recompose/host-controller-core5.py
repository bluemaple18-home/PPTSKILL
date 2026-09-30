"""Core5 正式 host controller：啟動 canonical lifecycle 並驗證完整收斂。"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time


HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
CORE = Path("/Users/matt/ai-core")
OUTPUT_NAME = os.environ.get("CORE5_HOST_OUTPUT", "host-acceptance-01")
if re.fullmatch(r"host-acceptance-[0-9]{2}", OUTPUT_NAME) is None:
    raise RuntimeError("CORE5_HOST_OUTPUT 格式無效")
OUT = HERE / OUTPUT_NAME
PYTHON = CORE / ".venv/bin/python"
TMP_SESSION = CORE / "scripts/tmp_session.py"
CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
LIMITS = {"max_bytes": 67108864, "max_file_count": 10000, "ttl_seconds": 3600}
IDENTITY_FILES = [
    "runtime/deck-editor.js",
    "tests/edx-core-5-reset-recompose.test.mjs",
    "tools/edx-core-5-reset-recompose-browser-acceptance.mjs",
    "dist/PPTSKILL-0.1.0.zip",
    "dist/PPTSKILL-0.1.0.zip.sha256",
    "fixtures/full-deck.html",
    ".DS_Store",
    "CLAUDE.md",
    "HANDOFF-20260914-P0-R11-R1-S3.md",
    "HANDOFF-20260914-PGQ-WP1.md",
]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def snapshot() -> dict[str, str]:
    return {name: digest(REPO / name) for name in IDENTITY_FILES}


def common_marker() -> Path:
    common = Path(
        subprocess.check_output(
            ["git", "-C", str(REPO), "rev-parse", "--path-format=absolute", "--git-common-dir"],
            text=True,
        ).strip()
    )
    return common / ".ai-core-tmp-artifact-isolation.json"


def command() -> list[str]:
    return [
        str(PYTHON),
        str(TMP_SESSION),
        "browser",
        "--repo-root",
        str(REPO),
        "--evidence-dir",
        str(OUT / "lifecycle"),
        "--browser-executable",
        str(CHROME),
        "--url",
        "about:blank",
        "--max-bytes",
        str(LIMITS["max_bytes"]),
        "--max-file-count",
        str(LIMITS["max_file_count"]),
        "--ttl-seconds",
        str(LIMITS["ttl_seconds"]),
        "--",
        str(PYTHON),
        "-B",
        str(HERE / "host-client-core5.py"),
        str(OUT),
    ]


def process_observation(root: Path, pgid: int) -> dict:
    output = subprocess.check_output(["ps", "-axo", "pid=,ppid=,pgid=,command="], text=True)
    matches = []
    for line in output.splitlines():
        parts = line.strip().split(None, 3)
        if len(parts) < 4:
            continue
        pid_text, ppid_text, pgid_text, command_text = parts
        try:
            pid, ppid, current_pgid = int(pid_text), int(ppid_text), int(pgid_text)
        except ValueError:
            continue
        if current_pgid == pgid or str(root) in command_text:
            matches.append({"pid": pid, "ppid": ppid, "pgid": current_pgid, "command": command_text})
    return {"pgid": pgid, "root": str(root), "matches": matches}


def verify_lifecycle(receipt: dict, marker: Path) -> None:
    lifecycle = OUT / "lifecycle/evidence"
    for name in ("session.json", "stdout.log", "stderr.log", "processes.jsonl"):
        require((lifecycle / name).is_file(), f"缺 lifecycle evidence：{name}")
    session = json.loads((lifecycle / "session.json").read_text())
    root = Path(session["root"])
    require(session.get("mode") == "browser", "session mode 非 browser")
    require(type(session.get("pid")) is int and session["pid"] > 1, "session PGID 無效")
    records = [json.loads(line) for line in (lifecycle / "processes.jsonl").read_text().splitlines() if line]
    started = [item for item in records if item.get("event") == "started"]
    require({item.get("role") for item in started} == {"browser", "client"}, "browser/client 啟動紀錄不完整")
    require(all(item.get("pgid") == session["pid"] for item in started), "browser/client 非同一 outer PGID")
    observation = process_observation(root, session["pid"])
    receipt["lifecycle"] = {
        "session": session,
        "processes": records,
        "ownedRootAbsent": not os.path.lexists(root),
        "isolationMarkerAbsent": not os.path.lexists(marker),
        "processObservation": observation,
    }
    require(receipt["lifecycle"]["ownedRootAbsent"], "owned root 尚未回收")
    require(receipt["lifecycle"]["isolationMarkerAbsent"], "isolation marker 尚未清除")
    require(observation["matches"] == [], "受管 PGID 或 root 仍有程序參照")


def verify_client(receipt: dict) -> None:
    client_path = OUT / "client-receipt.json"
    require(client_path.is_file(), "缺 client receipt")
    client = json.loads(client_path.read_text())
    receipt["client"] = client
    require(client.get("status") == "PASS" and client.get("exit") == 0, "client 非 PASS")
    require(client.get("readinessComplete") is True, "Chrome readiness 未完成")
    commands = client.get("commands") or {}
    required = ["browser", "pgq-1", "pgq-2", "pgq-3", "pgq-4", "browser-close"]
    require(all(commands.get(name, {}).get("exit") == 0 for name in required), "browser／PGQ／close 存在非零退出")
    browser = client.get("browserAcceptance") or {}
    require(browser.get("status") == "pass" and len(browser.get("runs") or []) == 2, "雙 viewport receipt 未通過")


def write_receipt(receipt: dict) -> None:
    (OUT / "controller-receipt.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n")


def run() -> int:
    require(not os.environ.get("CODEX_SANDBOX"), "正式 host 必須由 require_escalated 執行")
    require(PYTHON.is_file() and TMP_SESSION.is_file() and CHROME.is_file(), "正式 host 依賴缺失")
    require(not OUT.exists(), f"本輪輸出目錄已存在：{OUT}")
    marker = common_marker()
    require(not os.path.lexists(marker), "執行前已有 isolation marker")
    OUT.mkdir()
    receipt: dict = {
        "schemaVersion": 1,
        "status": "NOT_PASS",
        "date": "2026-09-30",
        "limits": LIMITS,
        "command": command(),
        "errors": [],
        "before": snapshot(),
    }
    stage = "launch"
    started = time.monotonic()
    try:
        with (OUT / "launcher.stdout").open("x") as stdout, (OUT / "launcher.stderr").open("x") as stderr:
            process = subprocess.Popen(receipt["command"], cwd=REPO, stdout=stdout, stderr=stderr)
            receipt["supervisorPid"] = process.pid
            receipt["supervisorExit"] = process.wait(timeout=3900)
        receipt["durationSeconds"] = time.monotonic() - started
        stage = "client"
        verify_client(receipt)
        stage = "lifecycle"
        verify_lifecycle(receipt, marker)
        stage = "identity-after"
        receipt["after"] = snapshot()
        require(receipt["after"] == receipt["before"], "產品、ZIP 或 protected bytes 在 host 驗收中漂移")
        stage = "diff-check"
        subprocess.run(["git", "diff", "--check"], cwd=REPO, check=True, capture_output=True, text=True)
        require(receipt["supervisorExit"] == 0, f"tmp_session 非零退出：{receipt['supervisorExit']}")
        receipt["status"] = "PASS"
    except BaseException as error:
        receipt["errors"].append({"stage": stage, "type": type(error).__name__, "error": str(error)})
        receipt.setdefault("firstCause", receipt["errors"][0])
        try:
            receipt.setdefault("after", snapshot())
        except BaseException as after_error:
            receipt["errors"].append(
                {"stage": "identity-after-fallback", "type": type(after_error).__name__, "error": str(after_error)}
            )
        try:
            if (OUT / "lifecycle/evidence/session.json").is_file():
                verify_lifecycle(receipt, marker)
        except BaseException as cleanup_error:
            receipt["errors"].append(
                {"stage": "cleanup-fallback", "type": type(cleanup_error).__name__, "error": str(cleanup_error)}
            )
    finally:
        write_receipt(receipt)
    print(
        json.dumps(
            {
                "status": receipt["status"],
                "supervisorExit": receipt.get("supervisorExit"),
                "durationSeconds": receipt.get("durationSeconds"),
                "firstCause": receipt.get("firstCause"),
                "receipt": str(OUT / "controller-receipt.json"),
            },
            ensure_ascii=False,
        )
    )
    return 0 if receipt["status"] == "PASS" else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-core5-acceptance", action="store_true", required=True)
    parser.parse_args()
    raise SystemExit(run())
