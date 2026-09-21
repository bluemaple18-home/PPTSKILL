# S11 Mainline checkpoint

後續更新（2026-09-22）：host acceptance 已 PASS，現為 REVIEW_CANDIDATE / INDEPENDENT_REVIEW_PENDING；見 `mainline-receipt.md`。以下保留當時 checkpoint 與 sandbox boundary。

狀態：**CHECKPOINT / HOST_BROWSER_PENDING**。

Product SHA：`5589217175c443f407785f3a3b2aac110896d5f2`。Branch：`codex/edx-wp1-s11-equal-gap`；base：`29c83fa415ad1424395f8d71612542c6a824f308`。本 checkpoint 不宣稱 browser / PGQ PASS，也不是 Independent Review candidate。

## 已完成

- 既有 `distribute-selection` 新增 `horizontal-gaps` / `vertical-gaps`，沒有新增 operation、state model、renderer 或 dependency。
- 3+ component 依 canonical primary start 排序；同起點以 stable element identity tie-break；頭尾 box 完全固定。
- 不同尺寸元件以實際 box size 計算 equal gap；fractional gap 使用 deterministic `Math.round`。可用空間為負時整筆 fail，避免以重疊冒充等間距。
- Missing/foreign/duplicate/<3/extra-field/safe-area failure 全部沿既有 operation seam atomic reject。
- Contextual toolbar 僅 3+ selection 顯示水平／垂直等間距；成功與失敗均保留 selection；export/reopen 不保存 editor chrome。
- Prior art：donor 只有 center distribution；pinned Moveable / Selecto public API 沒有 equal-gap mutation command，因此本卡是 existing seam 上的 bounded CUSTOM_DELTA，dependency delta 0。

## Fresh verification

- `targeted.log`：S11 + S10 + managed attach safety，**34/34 PASS**。
- `focused.log`：S3–S11 + S1 export cleanup，**211/211 PASS**。
- `nonbrowser.log`：排除四支 browser-backed PGQ，**416/416 PASS**。
- `distribution-lifecycle.json`：install / smoke / uninstall / profile preserve / single shared core PASS；Gemini CLI missing 只使 host capability partial。
- ZIP：`2,282,817 bytes`；SHA-256 `388e2bfefbcc9d483760f21a51f0b18458ef975ffb68ad58ce6e06d04530c959`；fresh rebuild deterministic，bundled runtime bytes 與 source MATCH。
- `source-hashes.json`：affected sources **8/8** freeze；protected untracked **4/4** 與 S10 baseline MATCH。
- `diff-check.txt`：PASS；RED evidence 保留於 `red.log`。

## Browser boundary

目前 task `CODEX_SANDBOX=seatbelt` 且沒有 `PPTSKILL_DEVTOOLS_ACTIVE_PORT`。既有 acceptance runner 只 attach managed browser，不 spawn；因此正式 browser / affected PGQ 保留 pending。沒有 unset sandbox、naked-launch Chrome 或繞 AI Core gate。

剩餘工作已縮成 `tasks/edx-wp1-s11-host-acceptance.md`：正式 host runtime 跑雙 viewport `--equal-gap-regression`，再串行四支 affected PGQ。完成後才可整理 Independent Review handoff。

未 merge／push／deploy，不開 S12。
