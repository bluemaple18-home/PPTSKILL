# P1-R8-B ZIP Distribution Lifecycle Receipt

- 日期：2026-09-10
- 狀態：`SUPERSEDED BY P1-R8-B-R1 / REQUEST CHANGES`
- 版本：`0.1.0`
- Artifact：`dist/PPTSKILL-0.1.0.zip`
- SHA-256：`7da76f5bedb4061d012e239ce9849a715fe8c43b41c6d1084651fee21dcd12da`
- 大小：約 76 KB。

## Package shape

```text
PPTSKILL/
├── core/                  # 唯一一份 shared core
├── adapters/
│   ├── codex/
│   ├── claude-code/
│   └── gemini/
├── lib/
├── install.mjs
├── update.mjs
├── uninstall.mjs
└── smoke.mjs
```

- adapter 只保存 command/version probe 與 `../../core` 相對路徑，沒有各自複製 runtime。
- package manifest 明示 `requiresGit=false`。
- ZIP 不含 `.git`，安裝／更新不呼叫 Git、不需要 GitHub token。
- distribution 不攜帶 Golden Cover 原始證據圖片；只保留 renderer 需要的 grammar、motion baseline 與 visual route contract。

## Lifecycle evidence

- Fresh install：從新暫存 user root 解 ZIP，執行實際 `install.mjs`，狀態 `installed`。
- Capability smoke：以隔離 PATH 的 Codex／Claude Code／Gemini fixtures 執行實際 `smoke.mjs`，三者皆 `recognized`。
- Shared core：`coreReady=true`、`oneSharedCore=true`；archive 內 `core/runtime/deck-spec.js` 只有一份。
- Update：staging → backup → activate；成功更新會移除舊 runtime sentinel。
- Rollback：在 backup 後注入 synthetic failure，舊 runtime 自動復原。
- Profile preservation：update 前後 profile SHA-256 相同。
- Uninstall：預設只移除帶有效 marker 的 runtime，profile 保留。
- Explicit purge：只有 `--purge-profile`／`purgeProfile=true` 才移除 profile。
- Human errors：缺少 Claude Code 回報「找不到 Claude Code；請確認 CLI 已安裝並位於 PATH」；Gemini 無法解析版本時回報「版本格式無法辨識」，不輸出 stack trace。
- Archive integrity：`unzip -t` 無錯誤。
- Regression：`pnpm test` 81 / 81 pass；`git diff --check` pass。

## Host capability observation

`evidence/p1-r8/b/host-capability-probe.json` 證明目前主機可以 fresh install／smoke／uninstall，且 shared core 正常。主機 PATH 實際辨識 Codex `0.148.0-alpha.9`、Claude Code `2.1.266`；Gemini CLI 未安裝，因此 host capability 為 `partial`。這是本機工具可用性，不是 ZIP lifecycle failure；三 adapter recognition 已由隔離 acceptance fixture 證明。

## External-tool gate

- operation level：local install lifecycle + read-only `--version` probe。
- allowed writes：明示 install root；正式驗收只使用 temporary root。真實 harness dotdir 未修改。
- network／OAuth／token：皆未使用。
- rollback：update 失敗恢復 backup；uninstall 僅接受含 marker 的精確 runtime target。
- profile：位於 runtime 外；預設永不刪除。

## Decision

本 ZIP 已達到 R8-B 的實作、自動測試與 lifecycle acceptance，並可作為 distribution candidate。依 repo 對 activation／rollback／teardown 的治理要求，正式結案仍須兩名 blind reviewers 各自以可重現證據裁決。

2026-09-10 曾啟動 lifecycle 與 distribution 兩條獨立 review，但兩個 reviewer runtime 都在讀取變更前因用量限制中止，未產生 verdict。這不是產品測試失敗，但也不能冒充獨立審查通過。

Owner technical review 已對此 artifact 找到 deterministic distribution contract 缺口，詳見 `r1-distribution-contract-closure-receipt.md`。因此 `41bfc39` 與本 receipt 不得再送最終 blind review；修復後必須以新 ZIP SHA 與新 receipt 重新驗收。
