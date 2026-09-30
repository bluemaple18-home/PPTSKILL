# Core4 正式 host admission

- 日期：2026-09-29
- 狀態：**BLOCKED BEFORE LAUNCH**
- 正式入口：`/Users/matt/ai-core/.venv/bin/python /Users/matt/ai-core/scripts/tmp_session.py browser`
- 限制：64 MiB、10,000 files、3600 seconds；Google Chrome；`about:blank`。
- 退出碼：`2`
- 原始理由：`NO_GO: browser_launch_blocked_in_codex_sandbox; Codex sandbox 請使用既有 Chrome extension / Codex Browser，standalone browser 請改到允許 browser process 的 host/runtime`

## 收斂證據

- `CODEX_SANDBOX='seatbelt'`，未清除旗標，未裸啟 Chrome，未改用其他 connector 繞過。
- lifecycle evidence 目錄未建立。
- Git common dir 的 `.ai-core-tmp-artifact-isolation.json` 未建立。
- 因 admission 在 launch 前拒絕，沒有 owned root、Chrome/client process、profile 或需 recovery 的殘留物。
- 正式雙 viewport browser harness、四支 affected PGQ 串行及獨立 host／實圖 review 均未執行；不得宣稱 Core4 GO 或 4/6。
