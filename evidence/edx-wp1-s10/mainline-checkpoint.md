# S10 Mainline checkpoint

狀態：**CHECKPOINT / HOST_BROWSER_PENDING**。

Product SHA：`902671238980941b321179a4df37e4d867733f14`。Branch：`codex/edx-wp1-s10-distribute-selection`；base：`cbe12a62a749d1c7cca67e3acb8de1b832995924`。本 checkpoint 不宣稱 browser / PGQ PASS，也不是 Independent Review candidate。

## 已完成

- `distribute-selection`：同頁 3+ components，`horizontal-centers` / `vertical-centers`，頭尾固定，中間中心等距。
- Canonical authority 僅 `composition.geometryOverrides`；不讀 DOM rect、不 auto-initialize missing geometry。
- 同中心排序使用 stable element identity；長 ID collision / truncation 情境有 regression test，輸入順序不影響結果。
- invalid / missing geometry / foreign / duplicate / `<3` / extra-field / safe-area failure 都是 atomic fail；selection 成功與失敗後都保留。
- Contextual toolbar 只在 3+ selection 顯示 distribute controls；2-selection 仍只提供 align。
- Export / offline reopen 不持久化 contextual toolbar、selection 或 editor chrome。

## Fresh verification

- `focused.log`：S3–S10 + S1 export cleanup，**198/198 PASS**。
- `nonbrowser.log`：排除四支 browser-backed PGQ，**403/403 PASS**。
- `distribution-lifecycle.json`：install / smoke / uninstall / profile preserve / single shared core PASS；Gemini CLI missing 只使 host capability partial。
- ZIP：`2,282,450 bytes`；SHA-256 `664bc72f696e21d1d5ca891506411c737ff7f114c891658d7d5670e8b06ebd64`。
- `source-hashes.json`：affected sources **11/11** freeze；protected untracked **4/4** 與 S9 baseline MATCH。
- `diff-check.txt`：PASS。
- RED evidence：`red.log` 保留 pre-implementation rejection。

## Browser boundary

`browser-preflight.txt` 實測目前 task 為 `CODEX_SANDBOX=seatbelt`。既有 browser acceptance runner 只 attach `PPTSKILL_DEVTOOLS_ACTIVE_PORT`，不 spawn browser；目前沒有合法 managed `DevToolsActivePort` 可 attach。AI Core `scripts/tmp_session.py::require_browser_runtime` 對 sandbox standalone launch fail-closed。

本輪沒有 unset `CODEX_SANDBOX`、沒有 naked-launch Chrome、沒有把 Codex 原生 UI automation 當成既有 CDP acceptance。

正式 host runtime 可用時，剩餘驗收只有：

```sh
node tools/edx-wp1-s4-browser-acceptance.mjs <evidence-dir> --distribution-regression
node --test --test-concurrency=1 \
  tests/pgq-wp4-s3-content-integrity.test.mjs \
  tests/pgq-wp4-s3-sample-approval.test.mjs \
  tests/pgq-wp4-s4-full-deck-qa.test.mjs \
  tests/pgq-wp4-s4-required-visibility.test.mjs
```

Browser 必須涵蓋 1280×720、1600×900：真 multi-select 3 items → horizontal → vertical → selection retained → export/offline reopen，console/page/network/HTTP/remote errors 0，managed cleanup PASS。PGQ 必須串行並保留任何 supervisor failure evidence。

完成上述 acceptance 後才建立 Independent Review handoff。未 merge／push／deploy，不開 S11。
