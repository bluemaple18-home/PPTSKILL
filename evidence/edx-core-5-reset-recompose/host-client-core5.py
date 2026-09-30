"""Core5 正式 host client：沿單一受管程序群組執行 browser 與四支 PGQ。"""

from __future__ import annotations

import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import time


HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
NODE = Path("/opt/homebrew/bin/node")
PGQ_FILES = [
    "tests/pgq-wp4-s3-content-integrity.test.mjs",
    "tests/pgq-wp4-s3-sample-approval.test.mjs",
    "tests/pgq-wp4-s4-full-deck-qa.test.mjs",
    "tests/pgq-wp4-s4-required-visibility.test.mjs",
]
CLOSE_JS = (
    "const ws=new WebSocket(process.argv[1]);"
    "const t=setTimeout(()=>process.exit(2),8000);"
    "ws.addEventListener('open',()=>ws.send(JSON.stringify({id:1,method:'Browser.close'})));"
    "ws.addEventListener('message',({data})=>{const m=JSON.parse(data);"
    "if(m.id===1){clearTimeout(t);process.exit(m.error?1:0)}});"
    "ws.addEventListener('error',()=>process.exit(3));"
)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def save(path: Path, payload: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(path)


def managed_context() -> tuple[Path, int, Path]:
    require(os.environ.get("AI_CORE_TMP_ARTIFACT_ACTIVE") == "1", "不是 AI Core 受管 client")
    root = Path(os.environ["TMP_ARTIFACT_ROOT"])
    require(root.is_absolute(), "受管 root 不是絕對路徑")
    for path in (root, root / "tmp", root / "profile", root / "evidence"):
        require(stat.S_ISDIR(path.lstat().st_mode), f"受管目錄不符：{path}")
    require(
        all(os.environ.get(name) == str(root / "tmp") for name in ("TMPDIR", "TMP", "TEMP")),
        "TMP 環境未指向受管 root",
    )
    require(os.environ.get("TMP_SESSION_EVIDENCE") == str(root / "evidence"), "受管 evidence 不符")
    require(os.environ.get("TMP_SESSION_WORKDIR") == str(REPO), "受管 workdir 不符")
    session = json.loads((root / "evidence/session.json").read_text())
    group = os.getpgrp()
    require(
        session.get("mode") == "browser"
        and session.get("root") == str(root)
        and session.get("pid") == group == os.getpgid(os.getppid()),
        "browser、client 與 outer PGID 不一致",
    )
    port_file = root / "profile/DevToolsActivePort"
    require(
        os.environ.get("TMP_SESSION_DEVTOOLS_ACTIVE_PORT") == str(port_file),
        "受管 DevToolsActivePort 映射不符",
    )
    return root, group, port_file


def readiness(port_file: Path) -> str:
    deadline = time.monotonic() + 25
    while time.monotonic() < deadline:
        try:
            lines = port_file.read_text().splitlines()
        except FileNotFoundError:
            lines = []
        if len(lines) >= 2 and lines[0].isdigit() and lines[1].startswith("/devtools/browser/"):
            port = int(lines[0])
            if 0 < port < 65536:
                return f"ws://127.0.0.1:{port}{lines[1]}"
        time.sleep(0.1)
    raise TimeoutError("25 秒內未取得完整 DevToolsActivePort")


def run_command(
    *,
    key: str,
    command: list[str],
    timeout: int,
    env: dict[str, str],
    group: int,
    log_path: Path,
    receipt: dict,
    receipt_path: Path,
) -> int:
    require(os.getpgrp() == group, "client PGID 漂移")
    started = time.monotonic()
    with log_path.open("x") as stream:
        process = subprocess.Popen(command, cwd=REPO, env=env, stdout=stream, stderr=subprocess.STDOUT)
        receipt.setdefault("commands", {})[key] = {
            "argv": command,
            "pid": process.pid,
            "timeoutSeconds": timeout,
            "log": str(log_path),
        }
        try:
            require(os.getpgid(process.pid) == group, f"{key} 子程序 PGID 不符")
        except Exception:
            receipt["outerStopRequired"] = True
            save(receipt_path, receipt)
            raise
        save(receipt_path, receipt)
        try:
            code = process.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            receipt["commands"][key]["timeout"] = True
            receipt["commands"][key]["durationSeconds"] = time.monotonic() - started
            receipt["outerStopRequired"] = True
            save(receipt_path, receipt)
            raise
    receipt["commands"][key]["exit"] = code
    receipt["commands"][key]["durationSeconds"] = time.monotonic() - started
    if code < 0:
        receipt["outerStopRequired"] = True
    save(receipt_path, receipt)
    return code


def verify_browser_receipt(path: Path) -> dict:
    data = json.loads(path.read_text())
    require(data.get("status") == "pass", "Core5 browser receipt 非 pass")
    runs = data.get("runs") or []
    require(
        [run.get("viewport") for run in runs]
        == [{"width": 1280, "height": 720}, {"width": 1600, "height": 900}],
        "雙 viewport receipt 不完整",
    )
    for run in runs:
        require(run.get("status") == "pass", "browser run 非 pass")
        require(run.get("targetClosed") is True, "owned target 未關閉")
        require(run.get("draftKeyRemoved") is True, "本輪 localStorage key 未清除")
        require(run.get("pageErrors") == [], "存在 pageerror")
        require(not [item for item in run.get("console", []) if item.get("type") == "error"], "存在 console error")
        require(not [item for item in run.get("networkFailures", []) if not item.get("canceled")], "存在 network failure")
        require(run.get("httpErrors") == [], "存在 HTTP error")
        require(run.get("remoteRequests") == [], "存在 remote request")
    return {
        "status": data["status"],
        "receipt": str(path),
        "runs": [
            {
                "viewport": run["viewport"],
                "checks": len(run.get("checks", [])),
                "targetClosed": run["targetClosed"],
                "draftKeyRemoved": run["draftKeyRemoved"],
                "artifacts": run.get("artifacts", []),
            }
            for run in runs
        ],
    }


def run_client(output_dir: Path) -> int:
    require(output_dir.is_absolute(), "輸出目錄須為絕對路徑")
    require(output_dir.parent == HERE, "輸出目錄須位於 Core5 evidence 目錄")
    receipt_path = output_dir / "client-receipt.json"
    receipt: dict = {
        "schemaVersion": 1,
        "status": "NOT_PASS",
        "exit": 2,
        "errors": [],
        "commands": {},
    }
    endpoint: str | None = None
    close_allowed = False
    group: int | None = None
    env: dict[str, str] | None = None
    stage = "managed-context"

    def record_error(error: BaseException) -> None:
        item = {"stage": stage, "type": type(error).__name__, "error": str(error)}
        receipt["errors"].append(item)
        receipt.setdefault("firstCause", item)

    try:
        root, group, port_file = managed_context()
        receipt.update(ownedRoot=str(root), pgid=group, pid=os.getpid())
        env = os.environ.copy()
        env["PPTSKILL_DEVTOOLS_ACTIVE_PORT"] = str(port_file)
        save(receipt_path, receipt)

        stage = "readiness"
        endpoint = readiness(port_file)
        receipt["readinessComplete"] = True
        close_allowed = True
        save(receipt_path, receipt)

        stage = "browser"
        browser_output = output_dir / "browser"
        code = run_command(
            key="browser",
            command=[str(NODE), "tools/edx-core-5-reset-recompose-browser-acceptance.mjs", str(browser_output)],
            timeout=1200,
            env=env,
            group=group,
            log_path=output_dir / "browser.log",
            receipt=receipt,
            receipt_path=receipt_path,
        )
        require(code == 0, f"Core5 browser harness 非零退出：{code}")
        receipt["browserAcceptance"] = verify_browser_receipt(browser_output / "acceptance.json")
        save(receipt_path, receipt)

        for index, test_file in enumerate(PGQ_FILES, start=1):
            stage = f"pgq-{index}"
            code = run_command(
                key=stage,
                command=[str(NODE), "--test", test_file],
                timeout=600,
                env=env,
                group=group,
                log_path=output_dir / f"{stage}.log",
                receipt=receipt,
                receipt_path=receipt_path,
            )
            require(code == 0, f"{test_file} 非零退出：{code}")
        receipt["exit"] = 0
    except subprocess.TimeoutExpired as error:
        close_allowed = False
        receipt["exit"] = 124
        record_error(error)
    except KeyboardInterrupt as error:
        close_allowed = False
        receipt["exit"] = 130
        receipt["outerStopRequired"] = True
        record_error(error)
    except BaseException as error:
        if receipt.get("outerStopRequired"):
            close_allowed = False
        record_error(error)
    finally:
        if close_allowed and endpoint and env is not None and group is not None:
            stage = "browser-close"
            try:
                close_code = run_command(
                    key="browser-close",
                    command=[str(NODE), "-e", CLOSE_JS, endpoint],
                    timeout=15,
                    env=env,
                    group=group,
                    log_path=output_dir / "browser-close.log",
                    receipt=receipt,
                    receipt_path=receipt_path,
                )
                require(close_code == 0, f"Browser.close 非零退出：{close_code}")
            except BaseException as error:
                record_error(error)
                if receipt["exit"] == 0:
                    receipt["exit"] = 2
        receipt["status"] = (
            "PASS"
            if receipt["exit"] == 0
            and not receipt["errors"]
            and receipt.get("commands", {}).get("browser-close", {}).get("exit") == 0
            else "NOT_PASS"
        )
        save(receipt_path, receipt)
    return int(receipt["exit"])


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("用法：host-client-core5.py <host acceptance output dir>")
    raise SystemExit(run_client(Path(sys.argv[1]).resolve()))
